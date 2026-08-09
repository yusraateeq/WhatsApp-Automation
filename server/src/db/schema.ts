import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================================
// CUSTOMERS
// ============================================================
export const customers = pgTable('customers', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  company: varchar('company', { length: 255 }),
  phone: varchar('phone', { length: 20 }).notNull(),
  email: varchar('email', { length: 255 }),
  location: text('location'),
  status: varchar('status', { length: 20 }).default('ACTIVE').notNull(),
  automationEnabled: boolean('automation_enabled').default(true).notNull(),
  preferredLanguage: varchar('preferred_language', { length: 10 }).default('en').notNull(),
  notes: text('notes'),
  lastContactAt: timestamp('last_contact_at'),
  nextFollowupAt: timestamp('next_followup_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('customers_phone_idx').on(table.phone),
  index('customers_status_idx').on(table.status),
]);

// ============================================================
// ELEVATORS
// ============================================================
export const elevators = pgTable('elevators', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'cascade' }).notNull(),
  model: varchar('model', { length: 255 }),
  serialNumber: varchar('serial_number', { length: 255 }),
  type: varchar('type', { length: 50 }),
  installationDate: timestamp('installation_date'),
  lastMaintenanceDate: timestamp('last_maintenance_date'),
  nextMaintenanceDate: timestamp('next_maintenance_date'),
  status: varchar('status', { length: 30 }).default('ACTIVE').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('elevators_customer_idx').on(table.customerId),
]);

// ============================================================
// CONVERSATIONS
// ============================================================
export const conversations = pgTable('conversations', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'cascade' }).notNull(),
  mode: varchar('mode', { length: 10 }).default('AI').notNull(),
  priority: varchar('priority', { length: 10 }).default('LOW').notNull(),
  intent: varchar('intent', { length: 20 }),
  lastMessageAt: timestamp('last_message_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('conversations_customer_idx').on(table.customerId),
  index('conversations_mode_idx').on(table.mode),
]);

// ============================================================
// MESSAGES
// ============================================================
export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  conversationId: uuid('conversation_id').references(() => conversations.id, { onDelete: 'cascade' }).notNull(),
  direction: varchar('direction', { length: 10 }).notNull(),
  content: text('content').notNull(),
  detectedLanguage: varchar('detected_language', { length: 10 }),
  englishTranslation: text('english_translation'),
  urduTranslation: text('urdu_translation'),
  messageType: varchar('message_type', { length: 20 }).default('TEXT').notNull(),
  status: varchar('status', { length: 20 }).default('SENT').notNull(),
  aiGenerated: boolean('ai_generated').default(false).notNull(),
  whatsappMessageId: varchar('whatsapp_message_id', { length: 255 }),
  sentAt: timestamp('sent_at').defaultNow().notNull(),
}, (table) => [
  index('messages_conversation_idx').on(table.conversationId),
  index('messages_sent_at_idx').on(table.sentAt),
]);

// ============================================================
// MAINTENANCE TICKETS
// ============================================================
export const maintenanceTickets = pgTable('maintenance_tickets', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'cascade' }).notNull(),
  elevatorId: uuid('elevator_id').references(() => elevators.id),
  conversationId: uuid('conversation_id').references(() => conversations.id),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 20 }).notNull(),
  priority: varchar('priority', { length: 10 }).default('MEDIUM').notNull(),
  status: varchar('status', { length: 20 }).default('OPEN').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  resolvedAt: timestamp('resolved_at'),
}, (table) => [
  index('tickets_customer_idx').on(table.customerId),
  index('tickets_status_idx').on(table.status),
  index('tickets_priority_idx').on(table.priority),
]);

// ============================================================
// FOLLOWUPS
// ============================================================
export const followups = pgTable('followups', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'cascade' }).notNull(),
  scheduledAt: timestamp('scheduled_at').notNull(),
  sentAt: timestamp('sent_at'),
  status: varchar('status', { length: 20 }).default('PENDING').notNull(),
  message: text('message'),
  retryCount: integer('retry_count').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('followups_customer_idx').on(table.customerId),
  index('followups_scheduled_idx').on(table.scheduledAt),
  index('followups_status_idx').on(table.status),
]);

// ============================================================
// TRANSLATIONS
// ============================================================
export const translations = pgTable('translations', {
  id: uuid('id').defaultRandom().primaryKey(),
  messageId: uuid('message_id').references(() => messages.id, { onDelete: 'cascade' }).notNull(),
  originalText: text('original_text').notNull(),
  detectedLanguage: varchar('detected_language', { length: 10 }),
  englishTranslation: text('english_translation'),
  urduTranslation: text('urdu_translation'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================
// AUDIT LOGS
// ============================================================
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  entityType: varchar('entity_type', { length: 50 }).notNull(),
  entityId: uuid('entity_id').notNull(),
  action: varchar('action', { length: 50 }).notNull(),
  details: jsonb('details'),
  performedBy: varchar('performed_by', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('audit_entity_idx').on(table.entityType, table.entityId),
]);

// ============================================================
// NOTIFICATIONS
// ============================================================
export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  type: varchar('type', { length: 50 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  priority: varchar('priority', { length: 10 }).default('LOW').notNull(),
  read: boolean('read').default(false).notNull(),
  entityId: uuid('entity_id'),
  entityType: varchar('entity_type', { length: 50 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================
// SYSTEM SETTINGS
// ============================================================
export const systemSettings = pgTable('system_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  key: varchar('key', { length: 100 }).notNull(),
  value: text('value'),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('settings_key_idx').on(table.key),
]);

// ============================================================
// RELATIONS
// ============================================================
export const customersRelations = relations(customers, ({ many }) => ({
  elevators: many(elevators),
  conversations: many(conversations),
  tickets: many(maintenanceTickets),
  followups: many(followups),
}));

export const elevatorsRelations = relations(elevators, ({ one }) => ({
  customer: one(customers, {
    fields: [elevators.customerId],
    references: [customers.id],
  }),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  customer: one(customers, {
    fields: [conversations.customerId],
    references: [customers.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));

export const maintenanceTicketsRelations = relations(maintenanceTickets, ({ one }) => ({
  customer: one(customers, {
    fields: [maintenanceTickets.customerId],
    references: [customers.id],
  }),
  elevator: one(elevators, {
    fields: [maintenanceTickets.elevatorId],
    references: [elevators.id],
  }),
  conversation: one(conversations, {
    fields: [maintenanceTickets.conversationId],
    references: [conversations.id],
  }),
}));

export const followupsRelations = relations(followups, ({ one }) => ({
  customer: one(customers, {
    fields: [followups.customerId],
    references: [customers.id],
  }),
}));

export const translationsRelations = relations(translations, ({ one }) => ({
  message: one(messages, {
    fields: [translations.messageId],
    references: [messages.id],
  }),
}));

// ============================================================
// TYPES
// ============================================================
export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
export type Elevator = typeof elevators.$inferSelect;
export type NewElevator = typeof elevators.$inferInsert;
export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type MaintenanceTicket = typeof maintenanceTickets.$inferSelect;
export type NewMaintenanceTicket = typeof maintenanceTickets.$inferInsert;
export type Followup = typeof followups.$inferSelect;
export type NewFollowup = typeof followups.$inferInsert;
