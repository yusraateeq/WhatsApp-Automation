import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { customers, conversations, followups } from '../db/schema.js';
import { authenticate } from '../middleware/firebase-admin.js';
import { createChildLogger } from '../utils/logger.js';

const logger = createChildLogger('automation-routes');

export async function automationRoutes(fastify: FastifyInstance) {
  // GET /api/automation/status - Get automation status
  fastify.get('/api/automation/status', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const totalCustomers = await db.select({ count: sql<number>`count(*)` })
      .from(customers)
      .where(sql`${customers.status} = 'ACTIVE' AND ${customers.automationEnabled} = true`);

    const activeConversations = await db.select({ count: sql<number>`count(*)` })
      .from(conversations)
      .where(sql`${conversations.mode} = 'AI'`);

    const pendingFollowups = await db.select({ count: sql<number>`count(*)` })
      .from(followups)
      .where(sql`${followups.status} = 'PENDING'`);

    const failedMessages = await db.select({ count: sql<number>`count(*)` })
      .from(followups)
      .where(sql`${followups.status} = 'FAILED'`);

    return reply.send({
      enabled: true,
      businessHoursOnly: true,
      totalCustomers: Number(totalCustomers[0]?.count || 0),
      activeConversations: Number(activeConversations[0]?.count || 0),
      pendingFollowups: Number(pendingFollowups[0]?.count || 0),
      failedMessages: Number(failedMessages[0]?.count || 0),
    });
  });

  // PATCH /api/automation/toggle - Toggle automation
  fastify.patch('/api/automation/toggle', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { enabled } = request.body as { enabled: boolean };
    logger.info('Automation toggled', { enabled });
    return reply.send({ enabled });
  });

  // GET /api/automation/logs - Get automation logs
  fastify.get('/api/automation/logs', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    // Placeholder - would need audit_logs table
    return reply.send({ logs: [] });
  });
}
