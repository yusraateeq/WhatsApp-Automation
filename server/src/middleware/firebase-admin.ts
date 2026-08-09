import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { env } from '../config/env.js';
import { createChildLogger } from '../utils/logger.js';

const logger = createChildLogger('firebase-admin');

// Initialize Firebase Admin (singleton)
export let firebaseApp;

if (getApps().length === 0) {
  firebaseApp = initializeApp({
    credential: cert({
      projectId: env.FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
  logger.info('Firebase Admin initialized');
} else {
  firebaseApp = getApps()[0];
}

// Token cache
const tokenCache = new Map<string, { decoded: any; timestamp: number }>();
const CACHE_TTL = 60 * 1000; // 1 minute

async function verifyTokenWithCache(idToken: string) {
  const crypto = await import('crypto');
  const cacheKey = crypto.createHash('sha256').update(idToken).digest('hex');

  const cached = tokenCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.decoded;
  }

  const decoded = await getAuth(firebaseApp).verifyIdToken(idToken);
  tokenCache.set(cacheKey, { decoded, timestamp: Date.now() });
  return decoded;
}

// Export authenticate function directly
export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return reply.code(401).send({
      error: 'Unauthorized',
      message: 'Missing or invalid authorization header',
    });
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await verifyTokenWithCache(idToken);
    request.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
    };
  } catch (error: any) {
    logger.error('Token verification failed', { error: error.message });

    switch (error.code) {
      case 'auth/id-token-expired':
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Token expired',
        });
      case 'auth/id-token-revoked':
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Token revoked',
        });
      case 'auth/argument-error':
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Invalid token format',
        });
      default:
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Authentication failed',
        });
    }
  }
}

// Auth plugin (simplified)
export async function firebaseAuthPlugin(fastify: FastifyInstance) {
  // Plugin just needs to be registered, authenticate is exported directly
}

// Type declarations
declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      uid: string;
      email?: string;
    };
  }
}
