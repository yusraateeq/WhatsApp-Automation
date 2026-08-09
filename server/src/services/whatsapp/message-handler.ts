import { Message } from 'whatsapp-web.js';
import { eq, and } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { customers, conversations, messages as messagesTable } from '../../db/schema.js';
import { normalizePhone } from '../../utils/phone.js';
import { createChildLogger } from '../../utils/logger.js';
import { AIService } from '../ai/index.js';
import { TranslationService } from '../translation/index.js';
import { EmergencyDetector } from '../emergency/detector.js';
import { WhatsAppService } from './index.js';

const logger = createChildLogger('message-handler');

export class MessageHandler {
  private aiService: AIService;
  private translationService: TranslationService;
  private emergencyDetector: EmergencyDetector;
  private whatsappService: WhatsAppService | null = null;
  private processedMessages = new Set<string>(); // Duplicate prevention

  constructor(
    aiService: AIService,
    translationService: TranslationService,
    emergencyDetector: EmergencyDetector
  ) {
    this.aiService = aiService;
    this.translationService = translationService;
    this.emergencyDetector = emergencyDetector;
  }

  setWhatsAppService(whatsappService: WhatsAppService) {
    this.whatsappService = whatsappService;
  }

  async handleIncoming(msg: Message) {
    const messageId = msg.id.id;

    // Duplicate prevention
    if (this.processedMessages.has(messageId)) {
      logger.debug('Duplicate message, skipping', { messageId });
      return;
    }
    this.processedMessages.add(messageId);

    // Clean up old processed messages (keep last 1000)
    if (this.processedMessages.size > 1000) {
      const firstEntries = Array.from(this.processedMessages).slice(0, 500);
      firstEntries.forEach((id) => this.processedMessages.delete(id));
    }

    try {
      // 1. Extract sender phone
      const senderPhone = msg.from.replace('@c.us', '');
      const normalizedPhone = normalizePhone(senderPhone);

      logger.info('Incoming message', {
        from: normalizedPhone,
        body: msg.body?.substring(0, 50),
      });

      // 2. Allowlist check — find customer by phone
      const customer = await db.query.customers.findFirst({
        where: eq(customers.phone, normalizedPhone),
      });

      if (!customer) {
        logger.debug('Unknown number, ignoring', { phone: normalizedPhone });
        return;
      }

      // 3. Status check
      if (customer.status === 'BLOCKED' || customer.status === 'DO_NOT_CONTACT') {
        logger.debug('Blocked/DoNotContact customer, ignoring', {
          customerId: customer.id,
          status: customer.status,
        });
        return;
      }

      if (!customer.automationEnabled) {
        logger.debug('Automation disabled for customer, ignoring', {
          customerId: customer.id,
        });
        return;
      }

      // 4. Find or create conversation
      let conversation = await db.query.conversations.findFirst({
        where: eq(conversations.customerId, customer.id),
      });

      if (!conversation) {
        const [newConversation] = await db.insert(conversations).values({
          customerId: customer.id,
          mode: 'AI',
          priority: 'LOW',
        }).returning();
        conversation = newConversation;
        logger.info('New conversation created', { conversationId: conversation.id });
      }

      // 5. Check if in HUMAN mode — don't respond with AI
      if (conversation.mode === 'HUMAN') {
        logger.debug('Conversation in HUMAN mode, AI not responding', {
          conversationId: conversation.id,
        });

        // Still store the message for history
        await this.storeMessage(conversation.id, msg, 'INCOMING');
        return;
      }

      // 6. Check if PAUSED
      if (conversation.mode === 'PAUSED') {
        logger.debug('Conversation PAUSED, not responding', {
          conversationId: conversation.id,
        });

        await this.storeMessage(conversation.id, msg, 'INCOMING');
        return;
      }

      // 7. Store incoming message
      await this.storeMessage(conversation.id, msg, 'INCOMING');

      // 8. Send typing indicator
      if (this.whatsappService) {
        await this.whatsappService.sendTypingIndicator(senderPhone);
      }

      // 9. Detect language
      const messageText = msg.body || '';
      const detectedLanguage = await this.translationService.detectLanguage(messageText);

      // 10. Check for emergency
      const isEmergency = await this.emergencyDetector.detect(messageText, detectedLanguage);

      if (isEmergency) {
        logger.warn('EMERGENCY DETECTED', {
          customerId: customer.id,
          conversationId: conversation.id,
          message: messageText,
        });

        await this.emergencyDetector.handleEmergency(customer.id, conversation.id, messageText);

        // Send emergency acknowledgment
        const emergencyResponse = this.emergencyDetector.getEmergencyResponse(detectedLanguage);
        if (this.whatsappService) {
          await this.whatsappService.sendMessage(senderPhone, emergencyResponse);
          await this.storeOutgoingMessage(conversation.id, emergencyResponse, detectedLanguage, true);
        }

        return;
      }

      // 11. Build context for AI
      const context = await this.buildContext(customer.id, conversation.id);

      // 12. Get AI response
      const aiResponse = await this.aiService.getResponse({
        message: messageText,
        language: detectedLanguage,
        customer: {
          id: customer.id,
          name: customer.name,
          company: customer.company,
          phone: customer.phone,
        },
        conversation: {
          id: conversation.id,
          mode: conversation.mode,
        },
        context,
      });

      // 13. Translate response if needed
      let responseText = aiResponse.content;

      if (detectedLanguage !== 'en') {
        const translated = await this.translationService.translate(
          aiResponse.content,
          detectedLanguage
        );
        responseText = translated;
      }

      // 14. Send response
      if (this.whatsappService) {
        await this.whatsappService.sendMessage(senderPhone, responseText);
        await this.storeOutgoingMessage(
          conversation.id,
          responseText,
          detectedLanguage,
          true
        );
      }

      // 15. Update conversation
      await db.update(conversations)
        .set({
          lastMessageAt: new Date(),
          intent: aiResponse.intent,
          priority: aiResponse.priority,
          updatedAt: new Date(),
        })
        .where(eq(conversations.id, conversation.id));

      // 16. Update customer last contact
      await db.update(customers)
        .set({
          lastContactAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(customers.id, customer.id));

      logger.info('AI response sent', {
        customerId: customer.id,
        intent: aiResponse.intent,
        language: detectedLanguage,
      });

    } catch (error) {
      logger.error('Error handling incoming message', { error, messageId });
    }
  }

  private async storeMessage(
    conversationId: string,
    msg: Message,
    direction: 'INCOMING' | 'OUTGOING'
  ) {
    try {
      const messageText = msg.body || '';
      const detectedLanguage = await this.translationService.detectLanguage(messageText);

      // Translate if not English
      let englishTranslation = null;
      let urduTranslation = null;

      if (detectedLanguage !== 'en') {
        englishTranslation = await this.translationService.translate(messageText, 'en');
        urduTranslation = await this.translationService.translate(messageText, 'ur');
      }

      await db.insert(messagesTable).values({
        conversationId,
        direction,
        content: messageText,
        detectedLanguage,
        englishTranslation,
        urduTranslation,
        messageType: 'TEXT',
        status: 'SENT',
        aiGenerated: false,
        whatsappMessageId: msg.id.id,
        sentAt: new Date(),
      });
    } catch (error) {
      logger.error('Failed to store message', { error });
    }
  }

  private async storeOutgoingMessage(
    conversationId: string,
    content: string,
    language: string,
    aiGenerated: boolean
  ) {
    try {
      await db.insert(messagesTable).values({
        conversationId,
        direction: 'OUTGOING',
        content,
        detectedLanguage: language,
        messageType: 'TEXT',
        status: 'SENT',
        aiGenerated,
        sentAt: new Date(),
      });
    } catch (error) {
      logger.error('Failed to store outgoing message', { error });
    }
  }

  private async buildContext(customerId: string, conversationId: string) {
    // Get recent messages
    const recentMessages = await db.query.messages.findMany({
      where: eq(messagesTable.conversationId, conversationId),
      orderBy: (messages, { desc }) => [desc(messages.sentAt)],
      limit: 20,
    });

    // Get customer elevators
    const customerElevators = await db.query.elevators.findMany({
      where: (elevators, { eq }) => eq(elevators.customerId, customerId),
    });

    // Get open tickets
    const { maintenanceTickets } = await import('../../db/schema.js');
    const openTickets = await db.query.maintenanceTickets.findMany({
      where: (tickets, { and, eq }) =>
        and(
          eq(tickets.customerId, customerId),
          eq(tickets.status, 'OPEN')
        ),
    });

    return {
      recentMessages: recentMessages.reverse().map((m) => ({
        role: m.direction === 'INCOMING' ? 'customer' : 'agent',
        content: m.content,
        timestamp: m.sentAt.toISOString(),
      })),
      elevators: customerElevators.map((e) => ({
        model: e.model,
        serialNumber: e.serialNumber,
        type: e.type,
        status: e.status,
        lastMaintenance: e.lastMaintenanceDate?.toISOString(),
        nextMaintenance: e.nextMaintenanceDate?.toISOString(),
      })),
      openTickets: openTickets.map((t) => ({
        title: t.title,
        category: t.category,
        priority: t.priority,
        createdAt: t.createdAt.toISOString(),
      })),
    };
  }
}
