import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import { env } from '../../config/env.js';
import { createChildLogger } from '../../utils/logger.js';
import { MessageHandler } from './message-handler.js';

const logger = createChildLogger('whatsapp');

export type WhatsAppConnectionState =
  | 'INITIALIZING'
  | 'QR_READY'
  | 'AUTHENTICATING'
  | 'CONNECTED'
  | 'DISCONNECTED'
  | 'AUTH_FAILURE'
  | 'ERROR';

export interface WhatsAppStatus {
  state: WhatsAppConnectionState;
  phoneNumber: string | null;
  lastMessageAt: Date | null;
  messagesToday: number;
  qr: string | null;
  uptime: number;
}

export class WhatsAppService {
  private client: Client;
  private messageHandler: MessageHandler;
  private state: WhatsAppConnectionState = 'DISCONNECTED';
  private phoneNumber: string | null = null;
  private lastMessageAt: Date | null = null;
  private messagesToday: number = 0;
  private currentQR: string | null = null;
  private retryCount: number = 0;
  private maxRetries: number = 5;
  private messageCountResetTimer: NodeJS.Timeout | null = null;
  private startedAt: Date = new Date();

  constructor(messageHandler: MessageHandler) {
    this.messageHandler = messageHandler;

    this.client = new Client({
      authStrategy: new LocalAuth({
        clientId: 'fujifenix',
        dataPath: env.WHATSAPP_SESSION_PATH,
      }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu',
        ],
      },
    });

    this.setupEventHandlers();
    this.setupMessageCountReset();
  }

  private setupEventHandlers() {
    // QR Code received - WhatsApp needs authentication
    this.client.on('qr', (qr) => {
      logger.info('QR Code received from WhatsApp');
      this.state = 'QR_READY';
      this.currentQR = qr;

      // Also print to terminal for debugging
      qrcode.generate(qr, { small: true });
    });

    // Authentication in progress (after QR scan)
    this.client.on('authenticated', () => {
      logger.info('WhatsApp authenticated - clearing QR');
      this.state = 'AUTHENTICATING';
      this.currentQR = null; // Clear QR after successful scan
    });

    // Authentication failed
    this.client.on('auth_failure', (msg) => {
      logger.error('WhatsApp auth failure', { msg });
      this.state = 'AUTH_FAILURE';
      this.currentQR = null;
    });

    // Client ready and connected
    this.client.on('ready', () => {
      logger.info('WhatsApp client ready');
      this.state = 'CONNECTED';
      this.retryCount = 0;
      this.currentQR = null; // Clear QR on successful connection

      // Get phone number from client info
      const info = this.client.info;
      if (info?.wid?.user) {
        this.phoneNumber = info.wid.user;
        logger.info('WhatsApp connected', { phoneNumber: info.wid.user });
      } else {
        logger.warn('WhatsApp ready but no phone number found');
      }
    });

    // Disconnected
    this.client.on('disconnected', (reason) => {
      logger.warn('WhatsApp disconnected', { reason });
      this.state = 'DISCONNECTED';
      this.phoneNumber = null;
      this.currentQR = null;
      this.handleReconnect();
    });

    // Message received
    this.client.on('message', async (msg) => {
      try {
        this.lastMessageAt = new Date();
        this.messagesToday++;
        await this.messageHandler.handleIncoming(msg);
      } catch (error) {
        logger.error('Error handling message', { error, messageId: msg.id });
      }
    });

    // Message created (outgoing)
    this.client.on('message_create', async (msg) => {
      if (msg.fromMe) {
        logger.debug('Outgoing message', { to: msg.to, body: msg.body });
      }
    });

    // Message acknowledgment
    this.client.on('message_ack', (msg, ack) => {
      logger.debug('Message ack', { messageId: msg.id, ack });
    });
  }

  private setupMessageCountReset() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const msUntilMidnight = tomorrow.getTime() - now.getTime();

    this.messageCountResetTimer = setTimeout(() => {
      this.messagesToday = 0;
      this.setupMessageCountReset();
    }, msUntilMidnight);
  }

  private async handleReconnect() {
    if (this.retryCount >= this.maxRetries) {
      logger.error('Max reconnect retries reached. Manual intervention required.');
      this.state = 'ERROR';
      return;
    }

    const delay = Math.pow(2, this.retryCount) * 1000;
    this.retryCount++;

    logger.info(`Reconnecting in ${delay}ms (attempt ${this.retryCount})`);
    this.state = 'INITIALIZING';

    await new Promise((resolve) => setTimeout(resolve, delay));

    try {
      await this.client.initialize();
    } catch (error) {
      logger.error('Reconnect failed', { error });
      this.state = 'ERROR';
      this.handleReconnect();
    }
  }

  async initialize() {
    logger.info('Initializing WhatsApp client...');
    this.state = 'INITIALIZING';

    try {
      await this.client.initialize();
    } catch (error) {
      logger.error('Failed to initialize WhatsApp', { error });
      this.state = 'ERROR';
      this.handleReconnect();
    }
  }

  async sendMessage(phoneNumber: string, content: string): Promise<string | null> {
    try {
      const chatId = phoneNumber.includes('@c.us')
        ? phoneNumber
        : `${phoneNumber}@c.us`;

      const msg = await this.client.sendMessage(chatId, content);
      logger.info('Message sent', { to: phoneNumber, messageId: msg.id });
      return msg.id.id;
    } catch (error) {
      logger.error('Failed to send message', { error, phoneNumber });
      return null;
    }
  }

  async sendTypingIndicator(phoneNumber: string) {
    try {
      const chatId = `${phoneNumber}@c.us`;
      const chat = await this.client.getChatById(chatId);
      await chat.sendStateTyping();
    } catch (error) {
      logger.debug('Failed to send typing indicator', { error });
    }
  }

  async markAsSeen(phoneNumber: string) {
    try {
      const chatId = `${phoneNumber}@c.us`;
      const chat = await this.client.getChatById(chatId);
      await chat.sendSeen();
    } catch (error) {
      logger.debug('Failed to mark as seen', { error });
    }
  }

  getStatus(): WhatsAppStatus {
    return {
      state: this.state,
      phoneNumber: this.phoneNumber,
      lastMessageAt: this.lastMessageAt,
      messagesToday: this.messagesToday,
      qr: this.currentQR,
      uptime: Math.floor((Date.now() - this.startedAt.getTime()) / 1000),
    };
  }

  getQR(): string | null {
    return this.currentQR;
  }

  getState(): WhatsAppConnectionState {
    return this.state;
  }

  async reconnect() {
    logger.info('Manual reconnect requested');
    this.currentQR = null;

    if (this.state === 'CONNECTED') {
      try {
        await this.client.logout();
      } catch (error) {
        logger.warn('Logout before reconnect failed', { error });
      }
    }

    this.state = 'INITIALIZING';
    this.retryCount = 0;

    try {
      await this.client.initialize();
    } catch (error) {
      logger.error('Reconnect failed', { error });
      this.state = 'ERROR';
      this.handleReconnect();
    }
  }

  async logout() {
    logger.info('Logout requested');
    this.currentQR = null;

    try {
      await this.client.logout();
      this.state = 'DISCONNECTED';
      this.phoneNumber = null;
      logger.info('WhatsApp logged out successfully');
    } catch (error) {
      logger.error('Logout failed', { error });
      this.state = 'ERROR';
    }
  }

  async destroy() {
    if (this.messageCountResetTimer) {
      clearTimeout(this.messageCountResetTimer);
    }
    await this.client.destroy();
    logger.info('WhatsApp client destroyed');
  }
}
