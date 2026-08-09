import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createChildLogger } from '../utils/logger.js';
import { authenticate } from '../middleware/firebase-admin.js';
import { WhatsAppService } from '../services/whatsapp/index.js';

const logger = createChildLogger('whatsapp-routes');

let whatsappService: WhatsAppService | null = null;

export function setWhatsAppService(service: WhatsAppService) {
  whatsappService = service;
}

export async function whatsappRoutes(fastify: FastifyInstance) {
  // GET /api/whatsapp/status - Get WhatsApp connection status
  fastify.get('/api/whatsapp/status', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    if (!whatsappService) {
      return reply.status(503).send({ error: 'WhatsApp service not initialized' });
    }

    const status = whatsappService.getStatus();
    return reply.send({
      status: status.state,
      phoneNumber: status.phoneNumber,
      lastMessageAt: status.lastMessageAt,
      messagesToday: status.messagesToday,
      uptime: status.uptime,
    });
  });

  // GET /api/whatsapp/qr - Get current QR code
  fastify.get('/api/whatsapp/qr', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    if (!whatsappService) {
      return reply.status(503).send({ error: 'WhatsApp service not initialized' });
    }

    const qr = whatsappService.getQR();
    const state = whatsappService.getState();

    return reply.send({
      qr,
      state,
      message: qr ? 'QR code ready' : state === 'CONNECTED' ? 'Already connected' : 'No QR code available',
    });
  });

  // POST /api/whatsapp/reconnect - Reconnect WhatsApp
  fastify.post('/api/whatsapp/reconnect', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    if (!whatsappService) {
      return reply.status(503).send({ error: 'WhatsApp service not initialized' });
    }

    logger.info('WhatsApp reconnect requested');

    try {
      // Don't await - let it run in background
      whatsappService.reconnect();
      return reply.send({ message: 'Reconnection initiated' });
    } catch (error) {
      logger.error('Failed to initiate reconnect', { error });
      return reply.status(500).send({ error: 'Failed to reconnect' });
    }
  });

  // POST /api/whatsapp/logout - Logout WhatsApp
  fastify.post('/api/whatsapp/logout', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    if (!whatsappService) {
      return reply.status(503).send({ error: 'WhatsApp service not initialized' });
    }

    logger.info('WhatsApp logout requested');

    try {
      await whatsappService.logout();
      return reply.send({ message: 'Logged out successfully' });
    } catch (error) {
      logger.error('Failed to logout', { error });
      return reply.status(500).send({ error: 'Failed to logout' });
    }
  });
}
