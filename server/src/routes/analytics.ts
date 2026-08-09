import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { sql, eq, and, gte } from 'drizzle-orm';
import { db } from '../db/index.js';
import { customers, conversations, messages, maintenanceTickets, followups } from '../db/schema.js';
import { createChildLogger } from '../utils/logger.js';
import { authenticate } from '../middleware/firebase-admin.js';

const logger = createChildLogger('analytics-routes');

export async function analyticsRoutes(fastify: FastifyInstance) {
  // GET /api/analytics/overview - Dashboard overview stats
  fastify.get('/api/analytics/overview', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Total customers
    const [totalCustomers] = await db.select({ count: sql<number>`count(*)` }).from(customers);

    // Active customers
    const [activeCustomers] = await db.select({ count: sql<number>`count(*)` })
      .from(customers)
      .where(eq(customers.status, 'ACTIVE'));

    // Customers with automation enabled
    const [automatedCustomers] = await db.select({ count: sql<number>`count(*)` })
      .from(customers)
      .where(and(eq(customers.status, 'ACTIVE'), eq(customers.automationEnabled, true)));

    // Messages today
    const [messagesToday] = await db.select({ count: sql<number>`count(*)` })
      .from(messages)
      .where(gte(messages.sentAt, today));

    // Open tickets
    const [openTickets] = await db.select({ count: sql<number>`count(*)` })
      .from(maintenanceTickets)
      .where(eq(maintenanceTickets.status, 'OPEN'));

    // High priority tickets
    const [highPriority] = await db.select({ count: sql<number>`count(*)` })
      .from(maintenanceTickets)
      .where(and(
        sql`${maintenanceTickets.priority} IN ('HIGH', 'CRITICAL')`,
        sql`${maintenanceTickets.status} IN ('OPEN', 'IN_PROGRESS')`
      ));

    // AI conversations
    const [aiConversations] = await db.select({ count: sql<number>`count(*)` })
      .from(conversations)
      .where(eq(conversations.mode, 'AI'));

    // Human handoffs
    const [humanConversations] = await db.select({ count: sql<number>`count(*)` })
      .from(conversations)
      .where(eq(conversations.mode, 'HUMAN'));

    // Pending followups
    const [pendingFollowups] = await db.select({ count: sql<number>`count(*)` })
      .from(followups)
      .where(and(
        eq(followups.status, 'PENDING'),
        sql`${followups.scheduledAt} <= NOW()`
      ));

    return reply.send({
      totalCustomers: Number(totalCustomers.count),
      activeCustomers: Number(activeCustomers.count),
      automatedCustomers: Number(automatedCustomers.count),
      messagesToday: Number(messagesToday.count),
      openTickets: Number(openTickets.count),
      highPriorityIssues: Number(highPriority.count),
      aiConversations: Number(aiConversations.count),
      humanHandoffs: Number(humanConversations.count),
      pendingFollowups: Number(pendingFollowups.count),
    });
  });

  // GET /api/analytics/messages - Message statistics
  fastify.get('/api/analytics/messages', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    // Messages by direction
    const [incoming] = await db.select({ count: sql<number>`count(*)` })
      .from(messages)
      .where(eq(messages.direction, 'INCOMING'));

    const [outgoing] = await db.select({ count: sql<number>`count(*)` })
      .from(messages)
      .where(eq(messages.direction, 'OUTGOING'));

    // AI generated messages
    const [aiMessages] = await db.select({ count: sql<number>`count(*)` })
      .from(messages)
      .where(eq(messages.aiGenerated, true));

    // Human messages
    const [humanMessages] = await db.select({ count: sql<number>`count(*)` })
      .from(messages)
      .where(eq(messages.aiGenerated, false));

    return reply.send({
      incoming: Number(incoming.count),
      outgoing: Number(outgoing.count),
      aiGenerated: Number(aiMessages.count),
      humanGenerated: Number(humanMessages.count),
    });
  });

  // GET /api/analytics/tickets - Ticket statistics
  fastify.get('/api/analytics/tickets', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    // Tickets by status
    const statusStats = await db.select({
      status: maintenanceTickets.status,
      count: sql<number>`count(*)`,
    })
      .from(maintenanceTickets)
      .groupBy(maintenanceTickets.status);

    // Tickets by priority
    const priorityStats = await db.select({
      priority: maintenanceTickets.priority,
      count: sql<number>`count(*)`,
    })
      .from(maintenanceTickets)
      .groupBy(maintenanceTickets.priority);

    // Tickets by category
    const categoryStats = await db.select({
      category: maintenanceTickets.category,
      count: sql<number>`count(*)`,
    })
      .from(maintenanceTickets)
      .groupBy(maintenanceTickets.category);

    return reply.send({
      byStatus: statusStats.map(s => ({ status: s.status, count: Number(s.count) })),
      byPriority: priorityStats.map(p => ({ priority: p.priority, count: Number(p.count) })),
      byCategory: categoryStats.map(c => ({ category: c.category, count: Number(c.count) })),
    });
  });

  // GET /api/analytics/languages - Language distribution
  fastify.get('/api/analytics/languages', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const languageStats = await db.select({
      language: customers.preferredLanguage,
      count: sql<number>`count(*)`,
    })
      .from(customers)
      .groupBy(customers.preferredLanguage);

    return reply.send({
      languages: languageStats.map(l => ({
        language: l.language,
        count: Number(l.count),
      })),
    });
  });
}
