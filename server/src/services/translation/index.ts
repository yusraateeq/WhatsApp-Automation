import { OpenRouter } from '@openrouter/agent';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { env } from '../../config/env.js';
import { db } from '../../db/index.js';
import { translations } from '../../db/schema.js';
import { createChildLogger } from '../../utils/logger.js';

const logger = createChildLogger('translation');

// Language detection using franc
const LANGUAGES: Record<string, string> = {
  eng: 'en',  // English
  urd: 'ur',  // Urdu
  ara: 'ar',  // Arabic
  hin: 'hi',  // Hindi
  pan: 'pa',  // Punjabi
  snd: 'sd',  // Sindhi
};

// Roman Urdu keywords for detection
const ROMAN_URDU_KEYWORDS = [
  'kya', 'hai', 'mein', 'tum', 'aap', 'kaise', 'acha', 'theek',
  'nahi', 'haan', 'ji', 'shukriya', 'mujhe', 'hamare', 'aapka',
  'karo', 'ho', 'giya', 'tha', 'thi', 'hoga', 'hogi',
];

export class TranslationService {
  private openrouter: OpenRouter;

  constructor() {
    this.openrouter = new OpenRouter({
      apiKey: env.OPENROUTER_API_KEY,
    });
  }

  async detectLanguage(text: string): Promise<string> {
    // First check for Roman Urdu
    if (this.isRomanUrdu(text)) {
      return 'ur-roman';
    }

    try {
      // Use franc for language detection
      const francModule = await import('franc');
      const franc = francModule.default || francModule;
      const langCode = franc(text, { minLength: 5 });

      if (langCode === 'und') {
        // Undetermined — default to English
        return 'en';
      }

      return LANGUAGES[langCode] || 'en';
    } catch (error) {
      logger.error('Language detection failed', { error });
      return 'en';
    }
  }

  private isRomanUrdu(text: string): boolean {
    const words = text.toLowerCase().split(/\s+/);
    const matches = words.filter((w) => ROMAN_URDU_KEYWORDS.includes(w));
    return matches.length >= 2; // At least 2 matches
  }

  async translate(text: string, targetLanguage: string): Promise<string> {
    // Don't translate if already in target language
    const detectedLang = await this.detectLanguage(text);
    if (detectedLang === targetLanguage) {
      return text;
    }

    // Check cache first
    const cached = await this.getCachedTranslation(text, targetLanguage);
    if (cached) {
      return cached;
    }

    // Translate using AI
    const translated = await this.aiTranslate(text, targetLanguage);

    // Cache the translation
    await this.cacheTranslation(text, targetLanguage, translated);

    return translated;
  }

  private async aiTranslate(text: string, targetLanguage: string): Promise<string> {
    const languageNames: Record<string, string> = {
      en: 'English',
      ur: 'Urdu',
      'ur-roman': 'Roman Urdu',
      ar: 'Arabic',
      hi: 'Hindi',
      pa: 'Punjabi',
      sd: 'Sindhi',
    };

    const targetName = languageNames[targetLanguage] || targetLanguage;

    try {
      const result = await this.openrouter.callModel({
        model: env.OPENROUTER_MODEL,
        messages: [
          {
            role: 'system',
            content: `You are a professional translator. Translate the following text to ${targetName}. Return ONLY the translated text, nothing else. Maintain the same tone and meaning.`,
          },
          {
            role: 'user',
            content: text,
          },
        ],
      });

      return await result.getText();
    } catch (error) {
      logger.error('Translation failed', { error, targetLanguage });
      return text; // Return original on failure
    }
  }

  private async getCachedTranslation(text: string, targetLanguage: string): Promise<string | null> {
    try {
      const cached = await db.query.translations.findFirst({
        where: and(
          eq(translations.originalText, text),
          eq(translations.detectedLanguage, targetLanguage)
        ),
      });

      if (cached) {
        // Return appropriate translation
        if (targetLanguage === 'en') return cached.englishTranslation;
        if (targetLanguage === 'ur') return cached.urduTranslation;
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  private async cacheTranslation(text: string, targetLanguage: string, translated: string) {
    try {
      // Check if translation already exists
      const existing = await db.query.translations.findFirst({
        where: and(
          eq(translations.originalText, text),
          eq(translations.detectedLanguage, targetLanguage)
        ),
      });

      if (existing) {
        // Update existing
        const updateData: Record<string, any> = {};
        if (targetLanguage === 'en') updateData.englishTranslation = translated;
        if (targetLanguage === 'ur') updateData.urduTranslation = translated;

        await db.update(translations)
          .set(updateData)
          .where(eq(translations.id, existing.id));
      } else {
        // Create new
        await db.insert(translations).values({
          originalText: text,
          detectedLanguage: targetLanguage,
          englishTranslation: targetLanguage === 'en' ? translated : null,
          urduTranslation: targetLanguage === 'ur' ? translated : null,
        });
      }
    } catch (error) {
      logger.error('Failed to cache translation', { error });
    }
  }
}
