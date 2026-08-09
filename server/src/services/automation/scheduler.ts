import { eq, and, lte, or, isNull } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { customers, followups, conversations } from '../../db/schema.js';
import { createChildLogger } from '../../utils/logger.js';
import { isWithinBusinessHours, getNextBusinessHour } from './business-hours.js';
import { generateFollowupMessage } from './templates.js';
import { WhatsAppService } from '../whatsapp/index.js';

const logger = createChildLogger('automation-scheduler');

export class AutomationScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private whatsappService: WhatsAppService | null = null;
  private checkIntervalMs = 60 * 60 * 1000; // Check every hour

  setWhatsAppService(whatsappService: WhatsAppService) {
    this.whatsappService = whatsappService;
  }

  /**
   * Start the scheduler
   */
  start() {
    logger.info('Starting automation scheduler');

    // Run immediately on start
    this.checkFollowups().catch((error) => {
      logger.error('Initial followup check failed', { error });
    });

    // Schedule recurring checks
    this.intervalId = setInterval(() => {
      this.checkFollowups().catch((error) => {
        logger.error('Followup check failed', { error });
      });
    }, this.checkIntervalMs);

    logger.info(`Scheduler started, checking every ${this.checkIntervalMs / 1000 / 60} minutes`);
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('Scheduler stopped');
    }
  }

  /**
   * Check and send followups
   */
  async checkFollowups() {
    logger.info('Checking for due followups...');

    try {
      // 1. Get all ACTIVE customers with automation enabled
      const activeCustomers = await db.query.customers.findMany({
        where: and(
          eq(customers.status, 'ACTIVE'),
          eq(customers.automationEnabled, true)
        ),
      });

      logger.debug(`Found ${activeCustomers.length} active customers with automation`);

      // 2. Check each customer
      for (const customer of activeCustomers) {
        await this.processCustomer(customer);
      }

      // 3. Process pending followups
      await this.processPendingFollowups();

      logger.info('Followup check complete');
    } catch (error) {
      logger.error('Error checking followups', { error });
    }
  }

  /**
   * Process a single customer for follow-up
   */
  private async processCustomer(customer: typeof customers.$inferSelect) {
    try {
      // Check if customer is due for follow-up
      if (!customer.nextFollowupAt) {
        // First time — schedule initial follow-up
        const nextFollowup = new Date();
        nextFollowup.setDate(nextFollowup.getDate() + 15);

        await db.update(customers)
          .set({ nextFollowupAt: nextFollowup, updatedAt: new Date() })
          .where(eq(customers.id, customer.id));

        logger.debug('Scheduled initial followup', {
          customerId: customer.id,
          nextFollowup: nextFollowup.toISOString(),
        });
        return;
      }

      const now = new Date();
      const nextFollowup = new Date(customer.nextFollowupAt);

      // Not due yet
      if (nextFollowup > now) {
        return;
      }

      // Check business hours
      if (!isWithinBusinessHours()) {
        // Queue for next business hour
        const nextBusinessHour = getNextBusinessHour();
        await db.update(customers)
          .set({ nextFollowupAt: nextBusinessHour, updatedAt: new Date() })
          .where(eq(customers.id, customer.id));

        logger.debug('Outside business hours, rescheduled', {
          customerId: customer.id,
          nextBusinessHour: nextBusinessHour.toISOString(),
        });
        return;
      }

      // Check if in HUMAN mode
      const conversation = await db.query.conversations.findFirst({
        where: eq(conversations.customerId, customer.id),
      });

      if (conversation?.mode === 'HUMAN') {
        logger.debug('Customer in HUMAN mode, skipping', { customerId: customer.id });
        return;
      }

      // Check for recent follow-up (avoid duplicates)
      const recentFollowup = await db.query.followups.findFirst({
        where: and(
          eq(followups.customerId, customer.id),
          eq(followups.status, 'SENT'),
          lte(followups.sentAt, new Date(Date.now() - 24 * 60 * 60 * 1000)) // Within last 24 hours
        ),
      });

      if (recentFollowup) {
        logger.debug('Recent followup exists, skipping', { customerId: customer.id });
        return;
      }

      // Generate and send follow-up
      await this.sendFollowup(customer);

    } catch (error) {
      logger.error('Error processing customer', { customerId: customer.id, error });
    }
  }

  /**
   * Send a follow-up message to a customer
   */
  private async sendFollowup(customer: typeof customers.$inferSelect) {
    try {
      // Generate context-aware message
      const message = await generateFollowupMessage(customer);

      // Create followup record
      const [followup] = await db.insert(followups).values({
        customerId: customer.id,
        scheduledAt: new Date(),
        message,
        status: 'PENDING',
      }).returning();

      // Send via WhatsApp
      if (this.whatsappService) {
        const sent = await this.whatsappService.sendMessage(customer.phone, message);

        if (sent) {
          // Update followup status
          await db.update(followups)
            .set({ status: 'SENT', sentAt: new Date() })
            .where(eq(followups.id, followup.id));

          // Schedule next follow-up (15 days)
          const nextFollowup = new Date();
          nextFollowup.setDate(nextFollowup.getDate() + 15);

          await db.update(customers)
            .set({ nextFollowupAt: nextFollowup, updatedAt: new Date() })
            .where(eq(customers.id, customer.id));

          logger.info('Followup sent', {
            customerId: customer.id,
            followupId: followup.id,
            nextFollowup: nextFollowup.toISOString(),
          });
        } else {
          // Mark as failed
          await db.update(followups)
            .set({ status: 'FAILED', retryCount: followup.retryCount + 1 })
            .where(eq(followups.id, followup.id));

          logger.warn('Followup failed to send', { customerId: customer.id });
        }
      }
    } catch (error) {
      logger.error('Error sending followup', { customerId: customer.id, error });
    }
  }

  /**
   * Process pending followups (retry failed ones)
   */
  private async processPendingFollowups() {
    try {
      // Get pending followups that are overdue
      const pendingFollowups = await db.query.followups.findMany({
        where: and(
          eq(followups.status, 'PENDING'),
          lte(followups.scheduledAt, new Date())
        ),
        limit: 10, // Process 10 at a time
      });

      for (const followup of pendingFollowups) {
        // Check retry count
        if (followup.retryCount >= 3) {
          await db.update(followups)
            .set({ status: 'FAILED' })
            .where(eq(followups.id, followup.id));
          continue;
        }

        // Get customer
        const customer = await db.query.customers.findFirst({
          where: eq(customers.id, followup.customerId),
        });

        if (!customer || customer.status !== 'ACTIVE') {
          await db.update(followups)
            .set({ status: 'CANCELLED' })
            .where(eq(followups.id, followup.id));
          continue;
        }

        // Retry sending
        if (this.whatsappService && followup.message) {
          const sent = await this.whatsappService.sendMessage(customer.phone, followup.message);

          if (sent) {
            await db.update(followups)
              .set({ status: 'SENT', sentAt: new Date() })
              .where(eq(followups.id, followup.id));
          } else {
            await db.update(followups)
              .set({ retryCount: followup.retryCount + 1 })
              .where(eq(followups.id, followup.id));
          }
        }
      }
    } catch (error) {
      logger.error('Error processing pending followups', { error });
    }
  }
}
