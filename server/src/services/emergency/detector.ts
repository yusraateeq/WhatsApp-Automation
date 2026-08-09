import { eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { customers, conversations, maintenanceTickets, notifications } from '../../db/schema.js';
import { createChildLogger } from '../../utils/logger.js';
import { EMERGENCY_KEYWORDS, EMERGENCY_RESPONSES } from '../ai/prompts.js';

const logger = createChildLogger('emergency-detector');

export class EmergencyDetector {
  /**
   * Detect if a message contains emergency keywords
   */
  async detect(message: string, language: string): Promise<boolean> {
    const lowerMessage = message.toLowerCase();

    // Check against emergency keywords
    const isEmergency = EMERGENCY_KEYWORDS.some((keyword) =>
      lowerMessage.includes(keyword.toLowerCase())
    );

    if (isEmergency) {
      logger.warn('Emergency keywords detected', {
        message: message.substring(0, 100),
        language,
      });
    }

    return isEmergency;
  }

  /**
   * Handle an emergency situation
   */
  async handleEmergency(
    customerId: string,
    conversationId: string,
    message: string
  ): Promise<void> {
    logger.error('HANDLING EMERGENCY', { customerId, conversationId });

    // 1. Create CRITICAL maintenance ticket
    const [ticket] = await db.insert(maintenanceTickets).values({
      customerId,
      conversationId,
      title: 'EMERGENCY - Customer reported emergency',
      description: `Emergency message received: ${message}`,
      category: 'EMERGENCY',
      priority: 'CRITICAL',
      status: 'OPEN',
    }).returning();

    logger.info('Emergency ticket created', { ticketId: ticket.id });

    // 2. Force conversation to HUMAN mode
    await db.update(conversations)
      .set({
        mode: 'HUMAN',
        priority: 'CRITICAL',
        updatedAt: new Date(),
      })
      .where(eq(conversations.id, conversationId));

    // 3. Create notification for admin
    await db.insert(notifications).values({
      type: 'EMERGENCY',
      title: '🚨 EMERGENCY ALERT',
      message: `Customer emergency detected. Ticket #${ticket.id} created. Immediate response required.`,
      priority: 'CRITICAL',
      entityId: ticket.id,
      entityType: 'TICKET',
    });

    // 4. Update customer status
    await db.update(customers)
      .set({ updatedAt: new Date() })
      .where(eq(customers.id, customerId));

    logger.info('Emergency handling complete', {
      customerId,
      conversationId,
      ticketId: ticket.id,
    });
  }

  /**
   * Get emergency response message in the appropriate language
   */
  getEmergencyResponse(language: string): string {
    // Map language codes to response keys
    const languageMap: Record<string, string> = {
      en: 'en',
      ur: 'ur',
      'ur-roman': 'ur',
      hi: 'hi',
      ar: 'ur', // Default Arabic to Urdu response
      pa: 'hi', // Default Punjabi to Hindi response
      sd: 'ur', // Default Sindhi to Urdu response
    };

    const responseKey = languageMap[language] || 'en';
    return EMERGENCY_RESPONSES[responseKey] || EMERGENCY_RESPONSES.en;
  }
}
