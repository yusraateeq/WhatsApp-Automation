import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { maintenanceTickets, customers } from '../db/schema.js';
import { createChildLogger } from '../utils/logger.js';
import { authenticate } from '../middleware/firebase-admin.js';

const logger = createChildLogger('tickets-routes');

const createTicketSchema = z.object({
  customerId: z.string().uuid(),
  elevatorId: z.string().uuid().optional(),
  conversationId: z.string().uuid().optional(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  category: z.enum(['MAINTENANCE', 'REPAIR', 'BREAKDOWN', 'EMERGENCY']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
});

const updateTicketSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  category: z.enum(['MAINTENANCE', 'REPAIR', 'BREAKDOWN', 'EMERGENCY']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED']).optional(),
});

const querySchema = z.object({
  status: z.string().optional(),
  priority: z.string().optional(),
  customerId: z.string().uuid().optional(),
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(20),
});

export async function ticketRoutes(fastify: FastifyInstance) {
  // GET /api/tickets - List all tickets
  fastify.get('/api/tickets', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const query = querySchema.parse(request.query);

    const conditions = [];
    if (query.status) conditions.push(eq(maintenanceTickets.status, query.status));
    if (query.priority) conditions.push(eq(maintenanceTickets.priority, query.priority));
    if (query.customerId) conditions.push(eq(maintenanceTickets.customerId, query.customerId));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const ticketList = await db.query.maintenanceTickets.findMany({
      where: whereClause,
      orderBy: [desc(maintenanceTickets.createdAt)],
      limit: query.limit,
      offset: (query.page - 1) * query.limit,
    });

    const total = await db.select({ count: sql<number>`count(*)` })
      .from(maintenanceTickets)
      .where(whereClause);

    return reply.send({
      tickets: ticketList,
      pagination: {
        page: query.page,
        limit: query.limit,
        total: Number(total[0]?.count || 0),
      },
    });
  });

  // GET /api/tickets/:id - Get ticket by ID
  fastify.get('/api/tickets/:id', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const ticket = await db.query.maintenanceTickets.findFirst({
      where: eq(maintenanceTickets.id, id),
    });

    if (!ticket) {
      return reply.code(404).send({ error: 'Ticket not found' });
    }

    return reply.send(ticket);
  });

  // POST /api/tickets - Create new ticket
  fastify.post('/api/tickets', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = createTicketSchema.parse(request.body);

    // Verify customer exists
    const customer = await db.query.customers.findFirst({
      where: eq(customers.id, body.customerId),
    });

    if (!customer) {
      return reply.code(404).send({ error: 'Customer not found' });
    }

    const [newTicket] = await db.insert(maintenanceTickets).values(body).returning();

    logger.info('Ticket created', { ticketId: newTicket.id, category: body.category });

    return reply.code(201).send(newTicket);
  });

  // PUT /api/tickets/:id - Update ticket
  fastify.put('/api/tickets/:id', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = updateTicketSchema.parse(request.body);

    const existing = await db.query.maintenanceTickets.findFirst({
      where: eq(maintenanceTickets.id, id),
    });

    if (!existing) {
      return reply.code(404).send({ error: 'Ticket not found' });
    }

    const [updated] = await db.update(maintenanceTickets)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(maintenanceTickets.id, id))
      .returning();

    logger.info('Ticket updated', { ticketId: id });

    return reply.send(updated);
  });

  // PATCH /api/tickets/:id/status - Change ticket status
  fastify.patch('/api/tickets/:id/status', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { status } = z.object({
      status: z.enum(['OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED']),
    }).parse(request.body);

    const existing = await db.query.maintenanceTickets.findFirst({
      where: eq(maintenanceTickets.id, id),
    });

    if (!existing) {
      return reply.code(404).send({ error: 'Ticket not found' });
    }

    const updateData: Record<string, any> = {
      status,
      updatedAt: new Date(),
    };

    if (status === 'RESOLVED' || status === 'CLOSED') {
      updateData.resolvedAt = new Date();
    }

    const [updated] = await db.update(maintenanceTickets)
      .set(updateData)
      .where(eq(maintenanceTickets.id, id))
      .returning();

    logger.info('Ticket status changed', { ticketId: id, status });

    return reply.send(updated);
  });
}
