import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { env } from './config/env.js';
import { createChildLogger } from './utils/logger.js';
import { firebaseAuthPlugin } from './middleware/firebase-admin.js';
import { authRoutes } from './routes/auth.js';
import { customerRoutes } from './routes/customers.js';
import { elevatorRoutes } from './routes/elevators.js';
import { ticketRoutes } from './routes/tickets.js';
import { conversationRoutes } from './routes/conversations.js';
import { followupRoutes } from './routes/followups.js';
import { automationRoutes } from './routes/automation.js';
import { settingsRoutes } from './routes/settings.js';
import { whatsappRoutes, setWhatsAppService } from './routes/whatsapp.js';
import { analyticsRoutes } from './routes/analytics.js';
import { AIService } from './services/ai/index.js';
import { TranslationService } from './services/translation/index.js';
import { EmergencyDetector } from './services/emergency/detector.js';
import { MessageHandler } from './services/whatsapp/message-handler.js';
import { WhatsAppService } from './services/whatsapp/index.js';

const appLogger = createChildLogger('app');

// Initialize services
const aiService = new AIService();
const translationService = new TranslationService();
const emergencyDetector = new EmergencyDetector();
const messageHandler = new MessageHandler(aiService, translationService, emergencyDetector);
const whatsappService = new WhatsAppService(messageHandler);

// Connect WhatsApp service to message handler
messageHandler.setWhatsAppService(whatsappService);

async function buildApp() {
  appLogger.info('Creating Fastify instance...');
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      transport: env.NODE_ENV === 'development' ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      } : undefined,
    },
  });

  appLogger.info('Registering CORS...');
  await app.register(cors, {
    origin: env.NODE_ENV === 'development' ? true : env.APP_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  appLogger.info('Registering Rate Limiting...');
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    errorResponseBuilder: () => ({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
    }),
  });

  appLogger.info('Registering Firebase Auth plugin...');
  await app.register(firebaseAuthPlugin);

  appLogger.info('Registering routes...');
  await app.register(authRoutes);
  appLogger.info('  - authRoutes done');
  await app.register(customerRoutes);
  appLogger.info('  - customerRoutes done');
  await app.register(elevatorRoutes);
  appLogger.info('  - elevatorRoutes done');
  await app.register(ticketRoutes);
  appLogger.info('  - ticketRoutes done');
  await app.register(conversationRoutes);
  appLogger.info('  - conversationRoutes done');
  await app.register(followupRoutes);
  appLogger.info('  - followupRoutes done');
  await app.register(automationRoutes);
  appLogger.info('  - automationRoutes done');
  await app.register(settingsRoutes);
  appLogger.info('  - settingsRoutes done');
  await app.register(whatsappRoutes);
  appLogger.info('  - whatsappRoutes done');
  await app.register(analyticsRoutes);
  appLogger.info('  - analyticsRoutes done');

  // Connect WhatsApp service to routes
  setWhatsAppService(whatsappService);

  // Health check
  app.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    whatsapp: whatsappService.getStatus().state,
  }));

  // Root route
  app.get('/', async () => ({
    name: 'fujifenix WhatsApp Automation API',
    version: '1.0.0',
    docs: '/api/docs',
  }));

  return app;
}

async function start() {
  try {
    appLogger.info('Building app...');
    const app = await buildApp();

    appLogger.info('Listening on port ' + env.PORT);
    await app.listen({ port: env.PORT, host: '0.0.0.0' });

    appLogger.info('Initializing WhatsApp client...');
    await whatsappService.initialize();

    appLogger.info('Server running!');
  } catch (error) {
    console.error('FULL ERROR:', error);
    process.exit(1);
  }
}

start();
