import { OpenRouter } from '@openrouter/agent';
import { env } from '../../config/env.js';
import { createChildLogger } from '../../utils/logger.js';
import { SYSTEM_PROMPT } from './prompts.js';
import { allTools } from './tools.js';

const logger = createChildLogger('ai-service');

interface AIRequest {
  message: string;
  language: string;
  customer: {
    id: string;
    name: string;
    company: string | null;
    phone: string;
  };
  conversation: {
    id: string;
    mode: string;
  };
  context: {
    recentMessages: { role: string; content: string; timestamp: string }[];
    elevators: { model: string | null; type: string | null; status: string; lastMaintenance: string | null; nextMaintenance: string | null }[];
    openTickets: { title: string; category: string; priority: string; createdAt: string }[];
  };
}

interface AIResponse {
  content: string;
  intent: string;
  priority: string;
  shouldCreateTicket?: boolean;
  ticketCategory?: string;
  ticketPriority?: string;
}

export class AIService {
  private openrouter: OpenRouter;
  private model: string;
  private fallbackModel: string;

  constructor() {
    this.openrouter = new OpenRouter({
      apiKey: env.OPENROUTER_API_KEY,
    });
    this.model = env.OPENROUTER_MODEL;
    this.fallbackModel = env.OPENROUTER_FALLBACK_MODEL;
  }

  async getResponse(request: AIRequest): Promise<AIResponse> {
    const { message, language, customer, conversation, context } = request;

    // Build messages for the AI
    const messages = [
      {
        role: 'system' as const,
        content: this.buildSystemPrompt(language, customer, context),
      },
      ...context.recentMessages.map((msg) => ({
        role: msg.role === 'customer' ? 'user' as const : 'assistant' as const,
        content: msg.content,
      })),
      {
        role: 'user' as const,
        content: message,
      },
    ];

    try {
      // Try primary model
      const result = await this.openrouter.callModel({
        model: this.model,
        messages,
        tools: allTools,
        maxIterations: 5,
      });

      const responseText = await result.getText();
      return this.parseResponse(responseText);

    } catch (error) {
      logger.error('Primary model failed, trying fallback', { error });

      try {
        // Try fallback model
        const result = await this.openrouter.callModel({
          model: this.fallbackModel,
          messages,
          tools: allTools,
          maxIterations: 5,
        });

        const responseText = await result.getText();
        return this.parseResponse(responseText);

      } catch (fallbackError) {
        logger.error('Fallback model also failed', { error: fallbackError });

        // Return default response
        return {
          content: this.getDefaultResponse(language),
          intent: 'GENERAL',
          priority: 'LOW',
        };
      }
    }
  }

  private buildSystemPrompt(
    language: string,
    customer: { name: string; company: string | null },
    context: any
  ): string {
    let prompt = SYSTEM_PROMPT;

    // Add customer context
    prompt += `\n\n## CUSTOMER INFORMATION\n`;
    prompt += `- Name: ${customer.name}\n`;
    if (customer.company) prompt += `- Company: ${customer.company}\n`;

    // Add elevator context
    if (context.elevators.length > 0) {
      prompt += `\n## ELEVATOR INFORMATION\n`;
      context.elevators.forEach((elev, i) => {
        prompt += `Elevator ${i + 1}:\n`;
        if (elev.model) prompt += `  - Model: ${elev.model}\n`;
        if (elev.type) prompt += `  - Type: ${elev.type}\n`;
        prompt += `  - Status: ${elev.status}\n`;
        if (elev.lastMaintenance) prompt += `  - Last Maintenance: ${elev.lastMaintenance}\n`;
        if (elev.nextMaintenance) prompt += `  - Next Maintenance: ${elev.nextMaintenance}\n`;
      });
    }

    // Add open tickets
    if (context.openTickets.length > 0) {
      prompt += `\n## OPEN TICKETS\n`;
      context.openTickets.forEach((ticket) => {
        prompt += `- ${ticket.title} (${ticket.category}, ${ticket.priority})\n`;
      });
    }

    // Add language instruction
    prompt += `\n\n## LANGUAGE\n`;
    prompt += `The customer's preferred language is: ${language}\n`;
    prompt += `Respond in the same language as the customer's message.\n`;

    return prompt;
  }

  private parseResponse(responseText: string): AIResponse {
    try {
      // Try to parse as JSON
      const parsed = JSON.parse(responseText);

      return {
        content: parsed.content || responseText,
        intent: parsed.intent || 'GENERAL',
        priority: parsed.priority || 'LOW',
        shouldCreateTicket: parsed.should_create_ticket,
        ticketCategory: parsed.ticket_category,
        ticketPriority: parsed.ticket_priority,
      };
    } catch {
      // If not valid JSON, treat as plain text response
      return {
        content: responseText,
        intent: 'GENERAL',
        priority: 'LOW',
      };
    }
  }

  private getDefaultResponse(language: string): string {
    const defaults: Record<string, string> = {
      en: "I apologize, but I'm experiencing technical difficulties. A human agent will assist you shortly. If this is an emergency, please call our emergency line.",
      ur: "مجھے معاف کیجیے، میں تکنیکی مشکلات کا سامنا کر رہا ہوں۔ ایک انسانی ایجنت جلد آپ کی مدد کرے گا۔ اگر یہ ہنگامی صورتحال ہے تو براہ کرم ہماری ہنگامی لائن پر کال کریں۔",
      hi: "क्षमा करें, मैं तकनीकी कठिनाइयों का सामना कर रहा हूं। एक मानव एजेंट जल्द ही आपकी सहायता करेगा। यदि यह आपातकालीन स्थिति है, तो कृपया हमारी आपातकालीन लाइन पर कॉल करें।",
    };

    return defaults[language] || defaults.en;
  }
}
