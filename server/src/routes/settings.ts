import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate } from '../middleware/firebase-admin.js';
import { createChildLogger } from '../utils/logger.js';

const logger = createChildLogger('settings-routes');

// Default settings
let systemSettings = {
  businessHoursStart: 9,
  businessHoursEnd: 18,
  followupIntervalDays: 15,
  aiModel: 'meta-llama/llama-3.1-8b-instruct:free',
  enableNotifications: true,
};

export async function settingsRoutes(fastify: FastifyInstance) {
  // GET /api/settings - Get settings
  fastify.get('/api/settings', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.send(systemSettings);
  });

  // PUT /api/settings - Update settings
  fastify.put('/api/settings', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const updates = request.body as Partial<typeof systemSettings>;
    systemSettings = { ...systemSettings, ...updates };
    logger.info('Settings updated', { updates });
    return reply.send(systemSettings);
  });
}
