import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { eq, desc, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { followups, customers } from '../db/schema.js';
import { authenticate } from '../middleware/firebase-admin.js';
import { createChildLogger } from '../utils/logger.js';

const logger = createChildLogger('followups-routes');

const createFollowupSchema = z.object({
  customerId: z.string().uuid(),
  scheduledAt: z.string().datetime(),
  message: z.string().min(1),
});

const querySchema = z.object({
  customerId: z.string().uuid().optional(),
  status: z.enum(['PENDING', 'SENT', 'FAILED', 'CANCELLED']).optional(),
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(20),
});

export async function followupRoutes(fastify: FastifyInstance) {
  // GET /api/followups - List follow-ups
  fastify.get('/api/followups', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const query = querySchema.parse(request.query);

    const conditions = [];
    if (query.customerId) {
      conditions.push(eq(followups.customerId, query.customerId));
    }
    if (query.status) {
      conditions.push(eq(followups.status, query.status));
    }

    const whereClause = conditions.length > 0 ? sql`${conditions[0]}` : undefined;

    const followupList = await db.query.followups.findMany({
      where: whereClause,
      orderBy: [desc(followups.scheduledAt)],
      limit: query.limit,
      offset: (query.page - 1) * query.limit,
      with: {
        customer: true,
      },
    });

    const total = await db.select({ count: sql<number>`count(*)` })
      .from(followups)
      .where(whereClause);

    return reply.send({
      followups: followupList,
      pagination: {
        page: query.page,
        limit: query.limit,
        total: Number(total[0]?.count || 0),
      },
    });
  });

  // POST /api/followups - Create follow-up
  fastify.post('/api/followups', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = createFollowupSchema.parse(request.body);

    const [newFollowup] = await db.insert(followups).values({
      customerId: body.customerId,
      scheduledAt: new Date(body.scheduledAt),
      message: body.message,
      status: 'PENDING',
    }).returning();

    logger.info('Follow-up created', { followupId: newFollowup.id });
    return reply.code(201).send(newFollowup);
  });

  // DELETE /api/followups/:id - Cancel follow-up
  fastify.delete('/api/followups/:id', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    await db.update(followups)
      .set({ status: 'CANCELLED' })
      .where(eq(followups.id, id));

    logger.info('Follow-up cancelled', { followupId: id });
    return reply.send({ message: 'Follow-up cancelled' });
  });

  // PATCH /api/followups/:id/retry - Retry follow-up
  fastify.patch('/api/followups/:id/retry', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    await db.update(followups)
      .set({ status: 'PENDING', scheduledAt: new Date() })
      .where(eq(followups.id, id));

    logger.info('Follow-up retry scheduled', { followupId: id });
    return reply.send({ message: 'Follow-up retry scheduled' });
  });
}
