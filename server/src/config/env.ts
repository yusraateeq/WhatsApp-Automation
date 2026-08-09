import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1),

  // OpenRouter AI
  OPENROUTER_API_KEY: z.string().min(1),
  OPENROUTER_MODEL: z.string().default('meta-llama/llama-3.1-8b-instruct:free'),
  OPENROUTER_FALLBACK_MODEL: z.string().default('microsoft/phi-3-mini-128k-instruct:free'),

  // Firebase Admin
  FIREBASE_PROJECT_ID: z.string().min(1),
  FIREBASE_CLIENT_EMAIL: z.string().min(1),
  FIREBASE_PRIVATE_KEY: z.string().min(1),

  // WhatsApp
  WHATSAPP_SESSION_PATH: z.string().default('./whatsapp-session'),

  // App
  APP_URL: z.string().default('http://localhost:3000'),
  API_URL: z.string().default('http://localhost:3001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  PORT: z.coerce.number().default(3001),
});

function validateEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('❌ Invalid environment variables:');
    console.error(parsed.error.flatten().fieldErrors);
    process.exit(1);
  }

  return parsed.data;
}

export const env = validateEnv();
export type Env = z.infer<typeof envSchema>;
