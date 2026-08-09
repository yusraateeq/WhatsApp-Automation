import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getAuth } from 'firebase-admin/auth';
import { firebaseApp } from '../middleware/firebase-admin.js';
import { createChildLogger } from '../utils/logger.js';

const logger = createChildLogger('auth-routes');

export async function authRoutes(fastify: FastifyInstance) {
  // POST /api/auth/verify - Verify Firebase token
  fastify.post('/api/auth/verify', async (request: FastifyRequest, reply: FastifyReply) => {
    const { idToken } = request.body as { idToken: string };

    if (!idToken) {
      return reply.code(400).send({ error: 'idToken required' });
    }

    try {
      const decodedToken = await getAuth().verifyIdToken(idToken);
      return reply.send({
        uid: decodedToken.uid,
        email: decodedToken.email,
        displayName: decodedToken.name,
      });
    } catch (error: any) {
      logger.error('Token verification failed', { error: error.message });
      return reply.code(401).send({ error: 'Invalid token' });
    }
  });
}
