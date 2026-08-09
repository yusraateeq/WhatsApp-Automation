import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { conversations, messages, customers } from '../db/schema.js';
import { createChildLogger } from '../utils/logger.js';
import { authenticate } from '../middleware/firebase-admin.js';

const logger = createChildLogger('conversations-routes');

const querySchema = z.object({
  customerId: z.string().uuid().optional(),
  mode: z.enum(['AI', 'HUMAN', 'PAUSED']).optional(),
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(20),
});

const sendMessageSchema = z.object({
  content: z.string().min(1),
});

const updateModeSchema = z.object({
  mode: z.enum(['AI', 'HUMAN', 'PAUSED']),
});

export async function conversationRoutes(fastify: FastifyInstance) {
  // GET /api/conversations - List conversations
  fastify.get('/api/conversations', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const query = querySchema.parse(request.query);

    const conditions = [];
    if (query.customerId) conditions.push(eq(conversations.customerId, query.customerId));
    if (query.mode) conditions.push(eq(conversations.mode, query.mode));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const conversationList = await db.query.conversations.findMany({
      where: whereClause,
      orderBy: [desc(conversations.lastMessageAt)],
      limit: query.limit,
      offset: (query.page - 1) * query.limit,
      with: {
        customer: {
          columns: {
            id: true,
            name: true,
            company: true,
            phone: true,
          },
        },
      },
    });

    const total = await db.select({ count: sql<number>`count(*)` })
      .from(conversations)
      .where(whereClause);

    return reply.send({
      conversations: conversationList,
      pagination: {
        page: query.page,
        limit: query.limit,
        total: Number(total[0]?.count || 0),
      },
    });
  });

  // GET /api/conversations/:id - Get conversation with messages
  fastify.get('/api/conversations/:id', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const conversation = await db.query.conversations.findFirst({
      where: eq(conversations.id, id),
      with: {
        customer: true,
        messages: {
          orderBy: [desc(messages.sentAt)],
          limit: 100,
        },
      },
    });

    if (!conversation) {
      return reply.code(404).send({ error: 'Conversation not found' });
    }

    return reply.send(conversation);
  });

  // POST /api/conversations/:id/messages - Send message (human takeover)
  fastify.post('/api/conversations/:id/messages', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { content } = sendMessageSchema.parse(request.body);

    const conversation = await db.query.conversations.findFirst({
      where: eq(conversations.id, id),
      with: { customer: true },
    });

    if (!conversation) {
      return reply.code(404).send({ error: 'Conversation not found' });
    }

    // Check if in HUMAN mode
    if (conversation.mode !== 'HUMAN') {
      return reply.code(400).send({ error: 'Conversation must be in HUMAN mode to send manual messages' });
    }

    // Store message
    const [newMessage] = await db.insert(messages).values({
      conversationId: id,
      direction: 'OUTGOING',
      content,
      aiGenerated: false,
      sentAt: new Date(),
    }).returning();

    // Update conversation
    await db.update(conversations)
      .set({ lastMessageAt: new Date(), updatedAt: new Date() })
      .where(eq(conversations.id, id));

    // TODO: Send via WhatsApp
    // await whatsappService.sendMessage(conversation.customer.phone, content);

    logger.info('Message sent (human)', { conversationId: id });

    return reply.code(201).send(newMessage);
  });

  // PATCH /api/conversations/:id/mode - Change conversation mode
  fastify.patch('/api/conversations/:id/mode', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { mode } = updateModeSchema.parse(request.body);

    const conversation = await db.query.conversations.findFirst({
      where: eq(conversations.id, id),
    });

    if (!conversation) {
      return reply.code(404).send({ error: 'Conversation not found' });
    }

    await db.update(conversations)
      .set({ mode, updatedAt: new Date() })
      .where(eq(conversations.id, id));

    logger.info('Conversation mode changed', { conversationId: id, mode });

    return reply.send({ message: `Conversation mode changed to ${mode}` });
  });
}
