import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { eq, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { elevators, customers } from '../db/schema.js';
import { createChildLogger } from '../utils/logger.js';
import { authenticate } from '../middleware/firebase-admin.js';

const logger = createChildLogger('elevators-routes');

const createElevatorSchema = z.object({
  model: z.string().max(255).optional(),
  serialNumber: z.string().max(255).optional(),
  type: z.enum(['PASSENGER', 'FREIGHT', 'HOME', 'ESCALATOR']).optional(),
  installationDate: z.string().datetime().optional(),
  lastMaintenanceDate: z.string().datetime().optional(),
  nextMaintenanceDate: z.string().datetime().optional(),
  notes: z.string().optional(),
});

const updateElevatorSchema = createElevatorSchema.partial();

export async function elevatorRoutes(fastify: FastifyInstance) {
  // GET /api/customers/:customerId/elevators - List elevators
  fastify.get('/api/customers/:customerId/elevators', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { customerId } = request.params as { customerId: string };

    // Verify customer exists
    const customer = await db.query.customers.findFirst({
      where: eq(customers.id, customerId),
    });

    if (!customer) {
      return reply.code(404).send({ error: 'Customer not found' });
    }

    const customerElevators = await db.query.elevators.findMany({
      where: eq(elevators.customerId, customerId),
      orderBy: [desc(elevators.createdAt)],
    });

    return reply.send(customerElevators);
  });

  // POST /api/customers/:customerId/elevators - Add elevator
  fastify.post('/api/customers/:customerId/elevators', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { customerId } = request.params as { customerId: string };
    const body = createElevatorSchema.parse(request.body);

    // Verify customer exists
    const customer = await db.query.customers.findFirst({
      where: eq(customers.id, customerId),
    });

    if (!customer) {
      return reply.code(404).send({ error: 'Customer not found' });
    }

    const [newElevator] = await db.insert(elevators).values({
      customerId,
      ...body,
      installationDate: body.installationDate ? new Date(body.installationDate) : undefined,
      lastMaintenanceDate: body.lastMaintenanceDate ? new Date(body.lastMaintenanceDate) : undefined,
      nextMaintenanceDate: body.nextMaintenanceDate ? new Date(body.nextMaintenanceDate) : undefined,
    }).returning();

    logger.info('Elevator added', { customerId, elevatorId: newElevator.id });

    return reply.code(201).send(newElevator);
  });

  // PUT /api/elevators/:id - Update elevator
  fastify.put('/api/elevators/:id', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = updateElevatorSchema.parse(request.body);

    const existing = await db.query.elevators.findFirst({
      where: eq(elevators.id, id),
    });

    if (!existing) {
      return reply.code(404).send({ error: 'Elevator not found' });
    }

    const updateData: Record<string, any> = { ...body, updatedAt: new Date() };
    if (body.installationDate) updateData.installationDate = new Date(body.installationDate);
    if (body.lastMaintenanceDate) updateData.lastMaintenanceDate = new Date(body.lastMaintenanceDate);
    if (body.nextMaintenanceDate) updateData.nextMaintenanceDate = new Date(body.nextMaintenanceDate);

    const [updated] = await db.update(elevators)
      .set(updateData)
      .where(eq(elevators.id, id))
      .returning();

    logger.info('Elevator updated', { elevatorId: id });

    return reply.send(updated);
  });

  // DELETE /api/elevators/:id - Remove elevator
  fastify.delete('/api/elevators/:id', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const existing = await db.query.elevators.findFirst({
      where: eq(elevators.id, id),
    });

    if (!existing) {
      return reply.code(404).send({ error: 'Elevator not found' });
    }

    await db.delete(elevators).where(eq(elevators.id, id));

    logger.info('Elevator removed', { elevatorId: id });

    return reply.send({ message: 'Elevator removed' });
  });
}
