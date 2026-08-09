import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { customers, elevators, conversations, maintenanceTickets } from '../db/schema.js';
import { normalizePhone, isValidPhone } from '../utils/phone.js';
import { createChildLogger } from '../utils/logger.js';
import { authenticate } from '../middleware/firebase-admin.js';

const logger = createChildLogger('customers-routes');

// Validation schemas
const createCustomerSchema = z.object({
  name: z.string().min(1).max(255),
  company: z.string().max(255).optional(),
  phone: z.string().min(1),
  email: z.string().email().optional(),
  location: z.string().optional(),
  preferredLanguage: z.string().length(2).default('en'),
  notes: z.string().optional(),
  automationEnabled: z.boolean().default(true),
});

const updateCustomerSchema = createCustomerSchema.partial();

const querySchema = z.object({
  status: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(20),
});

export async function customerRoutes(fastify: FastifyInstance) {
  // GET /api/customers - List all customers
  fastify.get('/api/customers', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const query = querySchema.parse(request.query);

    const conditions = [];
    if (query.status) {
      conditions.push(eq(customers.status, query.status));
    }
    if (query.search) {
      conditions.push(
        sql`(${customers.name} ILIKE ${'%' + query.search + '%'} OR ${customers.company} ILIKE ${'%' + query.search + '%'} OR ${customers.phone} ILIKE ${'%' + query.search + '%'})`
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const customerList = await db.query.customers.findMany({
      where: whereClause,
      orderBy: [desc(customers.createdAt)],
      limit: query.limit,
      offset: (query.page - 1) * query.limit,
    });

    const total = await db.select({ count: sql<number>`count(*)` })
      .from(customers)
      .where(whereClause);

    return reply.send({
      customers: customerList,
      pagination: {
        page: query.page,
        limit: query.limit,
        total: Number(total[0]?.count || 0),
      },
    });
  });

  // GET /api/customers/:id - Get customer by ID
  fastify.get('/api/customers/:id', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const customer = await db.query.customers.findFirst({
      where: eq(customers.id, id),
      with: {
        elevators: true,
      },
    });

    if (!customer) {
      return reply.code(404).send({ error: 'Customer not found' });
    }

    return reply.send(customer);
  });

  // POST /api/customers - Create new customer
  fastify.post('/api/customers', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = createCustomerSchema.parse(request.body);

    // Normalize and validate phone
    const normalizedPhone = normalizePhone(body.phone);
    if (!isValidPhone(normalizedPhone)) {
      return reply.code(400).send({ error: 'Invalid phone number' });
    }

    // Check for duplicate phone
    const existing = await db.query.customers.findFirst({
      where: eq(customers.phone, normalizedPhone),
    });

    if (existing) {
      return reply.code(409).send({ error: 'Customer with this phone number already exists' });
    }

    const [newCustomer] = await db.insert(customers).values({
      ...body,
      phone: normalizedPhone,
    }).returning();

    logger.info('Customer created', { customerId: newCustomer.id, phone: normalizedPhone });

    return reply.code(201).send(newCustomer);
  });

  // PUT /api/customers/:id - Update customer
  fastify.put('/api/customers/:id', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = updateCustomerSchema.parse(request.body);

    const existing = await db.query.customers.findFirst({
      where: eq(customers.id, id),
    });

    if (!existing) {
      return reply.code(404).send({ error: 'Customer not found' });
    }

    // Normalize phone if provided
    let updateData = { ...body };
    if (body.phone) {
      updateData.phone = normalizePhone(body.phone);
    }

    const [updated] = await db.update(customers)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(customers.id, id))
      .returning();

    logger.info('Customer updated', { customerId: id });

    return reply.send(updated);
  });

  // DELETE /api/customers/:id - Archive customer (soft delete)
  fastify.delete('/api/customers/:id', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const existing = await db.query.customers.findFirst({
      where: eq(customers.id, id),
    });

    if (!existing) {
      return reply.code(404).send({ error: 'Customer not found' });
    }

    // Archive instead of delete
    await db.update(customers)
      .set({ status: 'ARCHIVED', updatedAt: new Date() })
      .where(eq(customers.id, id));

    logger.info('Customer archived', { customerId: id });

    return reply.send({ message: 'Customer archived' });
  });

  // PATCH /api/customers/:id/block - Block customer
  fastify.patch('/api/customers/:id/block', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const existing = await db.query.customers.findFirst({
      where: eq(customers.id, id),
    });

    if (!existing) {
      return reply.code(404).send({ error: 'Customer not found' });
    }

    await db.update(customers)
      .set({ status: 'BLOCKED', updatedAt: new Date() })
      .where(eq(customers.id, id));

    logger.info('Customer blocked', { customerId: id });

    return reply.send({ message: 'Customer blocked' });
  });

  // PATCH /api/customers/:id/unblock - Unblock customer
  fastify.patch('/api/customers/:id/unblock', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const existing = await db.query.customers.findFirst({
      where: eq(customers.id, id),
    });

    if (!existing) {
      return reply.code(404).send({ error: 'Customer not found' });
    }

    await db.update(customers)
      .set({ status: 'ACTIVE', updatedAt: new Date() })
      .where(eq(customers.id, id));

    logger.info('Customer unblocked', { customerId: id });

    return reply.send({ message: 'Customer unblocked' });
  });

  // GET /api/customers/:id/conversations - Get customer conversations
  fastify.get('/api/customers/:id/conversations', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const customerConversations = await db.query.conversations.findMany({
      where: eq(conversations.customerId, id),
      orderBy: [desc(conversations.lastMessageAt)],
    });

    return reply.send(customerConversations);
  });

  // GET /api/customers/:id/tickets - Get customer tickets
  fastify.get('/api/customers/:id/tickets', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const customerTickets = await db.query.maintenanceTickets.findMany({
      where: eq(maintenanceTickets.customerId, id),
      orderBy: [desc(maintenanceTickets.createdAt)],
    });

    return reply.send(customerTickets);
  });
}
