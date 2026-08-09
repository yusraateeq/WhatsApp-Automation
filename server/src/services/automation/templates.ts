import { eq, and, desc } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { customers, conversations, messages, maintenanceTickets } from '../../db/schema.js';
import { createChildLogger } from '../../utils/logger.js';

const logger = createChildLogger('followup-templates');

/**
 * Generate a context-aware follow-up message
 */
export async function generateFollowupMessage(
  customer: typeof customers.$inferSelect
): Promise<string> {
  const language = customer.preferredLanguage || 'en';

  try {
    // Build context
    const context = await buildFollowupContext(customer.id);

    // Generate message based on context
    const message = selectTemplate(context, language);

    return message;
  } catch (error) {
    logger.error('Error generating followup message', { customerId: customer.id, error });
    return getDefaultFollowup(language);
  }
}

interface FollowupContext {
  customerName: string;
  hasElevators: boolean;
  elevatorModels: string[];
  hasOpenTickets: boolean;
  openTicketCount: number;
  lastConversationTopic: string | null;
  daysSinceLastContact: number;
}

async function buildFollowupContext(customerId: string): Promise<FollowupContext> {
  // Get customer
  const customer = await db.query.customers.findFirst({
    where: eq(customers.id, customerId),
  });

  // Get elevators
  const { elevators } = await import('../../db/schema.js');
  const customerElevators = await db.query.elevators.findMany({
    where: eq(elevators.customerId, customerId),
  });

  // Get open tickets
  const openTickets = await db.query.maintenanceTickets.findMany({
    where: and(
      eq(maintenanceTickets.customerId, customerId),
      eq(maintenanceTickets.status, 'OPEN')
    ),
  });

  // Get last conversation
  const conversation = await db.query.conversations.findFirst({
    where: eq(conversations.customerId, customerId),
  });

  let lastConversationTopic = null;
  let daysSinceLastContact = 30; // Default

  if (conversation) {
    const lastMessage = await db.query.messages.findFirst({
      where: eq(messages.conversationId, conversation.id),
      orderBy: [desc(messages.sentAt)],
    });

    if (lastMessage) {
      lastConversationTopic = lastMessage.content.substring(0, 100);
      daysSinceLastContact = Math.floor(
        (Date.now() - lastMessage.sentAt.getTime()) / (1000 * 60 * 60 * 24)
      );
    }
  }

  return {
    customerName: customer?.name || 'Valued Customer',
    hasElevators: customerElevators.length > 0,
    elevatorModels: customerElevators.map((e) => e.model || 'Unknown Model'),
    hasOpenTickets: openTickets.length > 0,
    openTicketCount: openTickets.length,
    lastConversationTopic,
    daysSinceLastContact,
  };
}

function selectTemplate(context: FollowupContext, language: string): string {
  const templates = getTemplates(language);

  // Select template based on context
  if (context.hasOpenTickets) {
    return templates.openTickets(context);
  }

  if (context.daysSinceLastContact > 20) {
    return templates.longTimeNoSee(context);
  }

  if (context.hasElevators) {
    return templates.elevatorCheck(context);
  }

  return templates.general(context);
}

function getTemplates(language: string) {
  const templates: Record<string, any> = {
    en: {
      openTickets: (ctx: FollowupContext) =>
        `Hello ${ctx.customerName}! 👋\n\nThis is a friendly reminder about your open support ticket${ctx.openTicketCount > 1 ? 's' : ''}. Our team is ready to assist you.\n\nWould you like to schedule a maintenance visit or need any other assistance?\n\nBest regards,\nfujifenix Support Team`,

      longTimeNoSee: (ctx: FollowupContext) =>
        `Hello ${ctx.customerName}! 👋\n\nIt's been a while since we last connected. We hope your elevators are running smoothly!\n\nIs there anything we can help you with? Whether it's routine maintenance, a quick check-up, or any concerns — we're here for you.\n\nBest regards,\nfujifenix Support Team`,

      elevatorCheck: (ctx: FollowupContext) =>
        `Hello ${ctx.customerName}! 👋\n\nWe hope your elevator${ctx.elevatorModels.length > 1 ? 's are' : ' is'} performing well!\n\nJust a quick check-in — is everything working properly? If you'd like to schedule a routine maintenance visit or have any questions, don't hesitate to reach out.\n\nBest regards,\nfujifenix Support Team`,

      general: (ctx: FollowupContext) =>
        `Hello ${ctx.customerName}! 👋\n\nWe hope this message finds you well. As part of our commitment to your satisfaction, we wanted to check in and see if there's anything we can assist you with.\n\nFeel free to reach out anytime!\n\nBest regards,\nfujifenix Support Team`,
    },

    ur: {
      openTickets: (ctx: FollowupContext) =>
        `سلام ${ctx.customerName}! 👋\n\nیہ آپ کی کھلی سپورٹ ٹکٹ${ctx.openTicketCount > 1 ? 'وں' : ''} کے بارے میں ایک یاد دہانی ہے۔ ہماری ٹیم آپ کی مدد کے لیے تیار ہے۔\n\nکیا آپ مینٹیننس ویزٹ شیڈول کرنا چاہیں گے یا کسی اور مدد کی ضرورت ہے؟\n\nشکریہ،\nفوجی فینکس سپورٹ ٹیم`,

      longTimeNoSee: (ctx: FollowupContext) =>
        `سلام ${ctx.customerName}! 👋\n\nہم سے آخری بار رابطہ کرنے میں کافی وقت ہو گیا ہے۔ ہم امید کرتے ہیں کہ آپ کی لفٹ ٹھیک چل رہی ہوں گی!\n\nکیا ہم آپ کی کسی مدد کر سکتے ہیں؟ چاہے وہ معمولی مینٹیننس ہو، چیک اپ ہو، یا کوئی بھی صورتحال — ہم آپ کے لیے یہاں ہیں۔\n\nشکریہ،\nفوجی فینکس سپورٹ ٹیم`,

      elevatorCheck: (ctx: FollowupContext) =>
        `سلام ${ctx.customerName}! 👋\n\nہم امید کرتے ہیں کہ آپ کی لفٹ اچھی طرح کام کر رہی ہے!\n\nصرف ایک چھوٹی سی جانکاری — کیا سب کچھ ٹھیک کام کر رہا ہے؟ اگر آپ معمولی مینٹیننس ویزٹ شیڈول کرنا چاہتے ہیں یا کوئی سوالات ہیں، تو بلا جھجک رابطہ کریں۔\n\nشکریہ،\nفوجی فینکس سپورٹ ٹیم`,

      general: (ctx: FollowupContext) =>
        `سلام ${ctx.customerName}! 👋\n\nہم امید کرتے ہیں کہ آپ خیریت سے ہوں گے۔ آپ کی اطمینان کے لیے ہماری پابندی کے حصے کے طور پر، ہم جاننا چاہتے ہیں کہ کیا ہم آپ کی کسی مدد کر سکتے ہیں۔\n\nکسی بھی وقت رابطہ کریں!\n\nشکریہ،\nفوجی فینکس سپورٹ ٹیم`,
    },

    hi: {
      openTickets: (ctx: FollowupContext) =>
        `नमस्ते ${ctx.customerName}! 👋\n\nयह आपकी खुली सपोर्ट टिकट${ctx.openTicketCount > 1 ? 'ों' : ''} के बारे में एक अनुस्मारक है। हमारी टीम आपकी सहायता के लिए तैयार है।\n\nक्या आप एक मेंटेनेंस विज़िट शेड्यूल करना चाहेंगे या किसी अन्य सहायता की आवश्यकता है?\n\nसादर,\nफुजीफिनेक्स सपोर्ट टीम`,

      longTimeNoSee: (ctx: FollowupContext) =>
        `नमस्ते ${ctx.customerName}! 👋\n\nहमसे आखिरी बार जुड़ने में काफी समय हो गया है। हम उम्मीद करते हैं कि आपकी लिफ्ट अच्छी तरह चल रही होंगी!\n\nक्या हम आपकी किसी मदद कर सकते हैं? चाहे वह नियमित मेंटेनेंस हो, चेक-अप हो, या कोई भी चिंता — हम आपके लिए यहां हैं।\n\nसादर,\nफुजीफिनेक्स सपोर्ट टीम`,

      elevatorCheck: (ctx: FollowupContext) =>
        `नमस्ते ${ctx.customerName}! 👋\n\nहम उम्मीद करते हैं कि आपकी लिफ्ट अच्छी तरह काम कर रही है!\n\nबस एक छोटी सी जानकारी — क्या सब कुछ ठीक काम कर रहा है? यदि आप नियमित मेंटेनेंस विज़िट शेड्यूल करना चाहते हैं या कोई सवाल हैं, तो बेझिझक संपर्क करें।\n\nसादर,\nफुजीफिनेक्स सपोर्ट टीम`,

      general: (ctx: FollowupContext) =>
        `नमस्ते ${ctx.customerName}! 👋\n\nहम उम्मीद करते हैं कि आप अच्छे होंगे। आपकी संतुष्टि के लिए हमारी प्रतिबद्धता के हिस्से के रूप में, हम जानना चाहेंगे कि क्या हम आपकी किसी मदद कर सकते हैं।\n\nकिसी भी समय संपर्क करें!\n\nसादर,\nफुजीफिनेक्स सपोर्ट टीम`,
    },
  };

  return templates[language] || templates.en;
}

function getDefaultFollowup(language: string): string {
  const defaults: Record<string, string> = {
    en: "Hello! 👋 This is fujifenix Support. We hope you're doing well. Is there anything we can help you with today?",
    ur: "سلام! 👋 یہ فوجی فینکس سپورٹ ہے۔ ہم امید کرتے ہیں کہ آپ خیریت سے ہوں گے۔ کیا آج ہم آپ کی کسی مدد کر سکتے ہیں؟",
    hi: "नमस्ते! 👋 यह फुजीफिनेक्स सपोर्ट है। हम उम्मीद करते हैं कि आप अच्छे होंगे। क्या आज हम आपकी किसी मदद कर सकते हैं?",
  };

  return defaults[language] || defaults.en;
}
