# RESEARCH.md — fujifenix WhatsApp Automation Platform

Deep research for every technology in the stack. Read before writing any code.

---

## 1. whatsapp-web.js

### Overview
- Node.js library for WhatsApp Web automation via Puppeteer
- Uses official WhatsApp Web under the hood (reduces ban risk)
- Version: 1.34.7 (latest as of 2026)
- Requires Node.js 18.0.0+

### Authentication Strategies

| Strategy | Persistence | Use Case |
|----------|-------------|----------|
| `NoAuth` | None | Testing only |
| `LocalAuth` | File system | **Our choice** — simplest, persistent |
| `RemoteAuth` | Database (MongoDB/S3) | Cloud deployments with ephemeral FS |

**LocalAuth Configuration:**
```typescript
import { Client, LocalAuth } from 'whatsapp-web.js';

const client = new Client({
  authStrategy: new LocalAuth({
    clientId: 'fujifenix',        // unique identifier
    dataPath: './whatsapp-session' // custom session path
  }),
  puppeteer: {
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: true
  }
});
```

**Critical:** LocalAuth requires persistent filesystem. NOT compatible with Heroku/Vercel ephemeral FS.

### Session Persistence Issues

**Problem:** Sessions disconnect after 2-3 days, requiring QR re-scan.

**Root Causes:**
1. WhatsApp servers invalidate stale sessions
2. Phone must be online as primary device
3. Multi-Device beta behavior differences
4. Puppeteer page crashes

**Solutions:**
1. Use `LocalAuth` with persistent volume
2. Implement reconnection logic with exponential backoff
3. Monitor `disconnected` event and auto-reinitialize
4. Keep session files in Docker volume or persistent disk

### Events to Handle

```typescript
client.on('qr', (qr) => { /* QR code for auth */ });
client.on('ready', () => { /* Client connected */ });
client.on('authenticated', () => { /* Auth success */ });
client.on('auth_failure', (msg) => { /* Auth failed */ });
client.on('disconnected', (reason) => { /* Connection lost */ });
client.on('message', (msg) => { /* Incoming message */ });
client.on('message_create', (msg) => { /* Message created */ });
client.on('message_ack', (msg) => { /* Message acknowledged */ });
```

### Common Pitfalls

1. **Puppeteer disconnects** — Page crashes during large file sends
2. **ExecutionContext destroyed** — WhatsApp Web update breaks injected scripts
3. **Browser launch fails** — Missing system libraries on Linux
4. **Session timeout** — WhatsApp invalidates after inactivity

**Linux Dependencies (Docker):**
```bash
apt-get install -y libgbm-dev libatk1.0-0 libc6 libcairo2 libcups2 \
  libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgdk-pixbuf2.0-0 \
  libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 \
  libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 \
  libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 \
  libxtst6 ca-certificates fonts-liberation libnss3 lsb-release xdg-utils wget
```

### Message API

```typescript
// Send text
await client.sendMessage(chatId, 'Hello!');

// Send with options
await client.sendMessage(chatId, 'Hello!', {
  mentions: [contact],
  quotedMessageId: msg.id
});

// Mark as seen
await msg.markSeen();

// Send typing indicator
const chat = await msg.getChat();
await chat.sendStateTyping();
```

---

## 2. OpenRouter Agent SDK

### Overview
- `@openrouter/agent` — Multi-turn AI agent framework
- Handles tool execution, conversation state, streaming
- ESM-only package
- Works with 400+ models via OpenRouter

### Installation

```bash
npm install @openrouter/agent
```

### Core Concepts

#### `callModel` — Main Entry Point
Runs inference loop: send message → execute tools → repeat until done.

```typescript
import { OpenRouter, tool } from '@openrouter/agent';
import { z } from 'zod';

const openrouter = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

const result = await openrouter.callModel({
  model: process.env.OPENROUTER_MODEL || 'anthropic/claude-sonnet-4',
  messages: [
    { role: 'system', content: 'You are a support agent...' },
    { role: 'user', content: 'My elevator is stuck!' },
  ],
  tools: [getCustomerTool, createTicketTool],
});

const text = await result.getText();
```

#### Tool Definition with Zod

```typescript
import { tool } from '@openrouter/agent';
import { z } from 'zod';

const getCustomerTool = tool({
  name: 'get_customer',
  description: 'Get customer details by phone or ID',
  inputSchema: z.object({
    customerId: z.string().optional().describe('Customer UUID'),
    phone: z.string().optional().describe('Phone number'),
  }),
  outputSchema: z.object({
    id: z.string(),
    name: z.string(),
    company: z.string().nullable(),
    status: z.string(),
  }),
  execute: async (params) => {
    // Fetch from database
    const customer = await db.query.customers.findFirst({
      where: or(
        params.customerId ? eq(customers.id, params.customerId) : undefined,
        params.phone ? eq(customers.phone, params.phone) : undefined
      )
    });
    return customer;
  },
});
```

#### Tool Types

| Type | Use Case |
|------|----------|
| Regular | Standard tool with execute function |
| Generator | Streaming progress updates |
| HITL | Human-in-the-loop approval |
| MCP | External MCP server tools |

#### Multi-Turn Execution

```typescript
// SDK handles the loop automatically
const result = await openrouter.callModel({
  model: 'anthropic/claude-sonnet-4',
  messages,
  tools: [tool1, tool2, tool3],
  // Max iterations to prevent infinite loops
  maxIterations: 10,
});

// Stream events
for await (const event of result.getFullResponsesStream()) {
  if (event.type === 'tool.result') {
    console.log('Tool executed:', event.source, event.result);
  }
}
```

### Model Configuration

```typescript
// Environment-based model selection
const model = process.env.OPENROUTER_MODEL || 'anthropic/claude-sonnet-4';
const fallbackModel = process.env.OPENROUTER_FALLBACK_MODEL || 'openai/gpt-4o';

// Fallback handling
try {
  result = await openrouter.callModel({ model, ... });
} catch (error) {
  result = await openrouter.callModel({ model: fallbackModel, ... });
}
```

---

## 3. Fastify 5

### Overview
- High-performance Node.js web framework
- 78,500+ req/sec benchmark (vs Express 32,400)
- Plugin-based architecture
- Built-in JSON Schema validation
- Native TypeScript support

### Project Setup

```typescript
import Fastify from 'fastify';
import cors from '@fastify/cors';

const app = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: { colorize: true }
    }
  },
  trustProxy: true, // Behind reverse proxy
});

// Register plugins
await app.register(cors, {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
});
```

### Plugin Architecture (NOT Middleware)

Fastify uses **plugins** instead of middleware. Each plugin is encapsulated.

```typescript
// Plugin definition
async function authPlugin(fastify: FastifyInstance) {
  fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    const token = request.headers.authorization?.replace('Bearer ', '');
    if (!token) return reply.code(401).send({ error: 'Unauthorized' });
    // Verify token...
  });
}

// Register with prefix
await app.register(authPlugin, { prefix: '/api' });
```

### Route Definition with Validation

```typescript
import { Type } from '@sinclair/typebox';

app.post('/api/customers', {
  schema: {
    body: Type.Object({
      name: Type.String({ minLength: 1, maxLength: 255 }),
      phone: Type.String({ pattern: '^[0-9+\\-\\s]+$' }),
      email: Type.Optional(Type.String({ format: 'email' })),
    }),
    response: {
      201: Type.Object({
        id: Type.String(),
        name: Type.String(),
      }),
    },
  },
}, async (request, reply) => {
  const customer = await createCustomer(request.body);
  return reply.code(201).send(customer);
});
```

### Hooks (Fastify's Middleware Equivalent)

```typescript
// onRequest — before parsing
fastify.addHook('onRequest', async (request, reply) => {
  request.startTime = Date.now();
});

// preHandler — after parsing, before handler
fastify.addHook('preHandler', async (request, reply) => {
  if (request.url.startsWith('/api/')) {
    await verifyAuth(request, reply);
  }
});

// preSerialization — before response serialization
fastify.addHook('preSerialization', async (request, reply, payload) => {
  // Transform response
});

// onError — error handling
fastify.addHook('onError', async (request, reply, error) => {
  logger.error(error);
});
```

### Production Patterns

```typescript
// Graceful shutdown
const signals = ['SIGINT', 'SIGTERM'];
for (const signal of signals) {
  process.on(signal, async () => {
    await app.close();
    process.exit(0);
  });
}

// Health check
app.get('/health', async () => ({ status: 'ok', uptime: process.uptime() }));

// Listen
await app.listen({ port: 3001, host: '0.0.0.0' });
```

---

## 4. Drizzle ORM + Neon PostgreSQL

### Overview
- TypeScript-first ORM
- SQL-like API with full type safety
- ~20KB bundle (vs Prisma 500KB+)
- Edge-compatible
- Zero overhead

### Database Connection

```typescript
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
```

### Schema Definition

```typescript
import { pgTable, uuid, varchar, text, timestamp, boolean, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Customers table
export const customers = pgTable('customers', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  company: varchar('company', { length: 255 }),
  phone: varchar('phone', { length: 20 }).notNull().unique(),
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
});

// Relations
export const customersRelations = relations(customers, ({ many }) => ({
  elevators: many(elevators),
  conversations: many(conversations),
  tickets: many(maintenanceTickets),
}));

export const elevators = pgTable('elevators', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerId: uuid('customer_id').references(() => customers.id).notNull(),
  model: varchar('model', { length: 255 }),
  serialNumber: varchar('serial_number', { length: 255 }),
  type: varchar('type', { length: 50 }),
  installationDate: timestamp('installation_date'),
  lastMaintenanceDate: timestamp('last_maintenance_date'),
  nextMaintenanceDate: timestamp('next_maintenance_date'),
  status: varchar('status', { length: 30 }).default('ACTIVE').notNull(),
  notes: text('notes'),
});

export const elevatorsRelations = relations(elevators, ({ one }) => ({
  customer: one(customers, {
    fields: [elevators.customerId],
    references: [customers.id],
  }),
}));
```

### Query Examples

```typescript
// Find customer by phone
const customer = await db.query.customers.findFirst({
  where: eq(customers.phone, normalizedPhone),
  with: {
    elevators: true,
  },
});

// Insert
const [newCustomer] = await db.insert(customers).values({
  name: 'John Doe',
  phone: '923001234567',
}).returning();

// Update
await db.update(customers)
  .set({ status: 'BLOCKED', updatedAt: new Date() })
  .where(eq(customers.id, customerId));

// Complex query with relations
const conversations = await db.query.conversations.findMany({
  where: eq(conversations.customerId, customerId),
  with: {
    messages: {
      orderBy: [desc(messages.sentAt)],
      limit: 50,
    },
  },
  orderBy: [desc(conversations.lastMessageAt)],
});
```

### Migration Strategy

```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

```bash
# Generate migration
npx drizzle-kit generate

# Apply migration
npx drizzle-kit migrate

# Push schema directly (dev only)
npx drizzle-kit push

# Open Drizzle Studio
npx drizzle-kit studio
```

### Best Practices

1. Use `uuid` for primary keys (better for distributed systems)
2. Always add indexes on foreign keys
3. Use `timestamp` with `defaultNow()` for audit fields
4. Prefer `drizzle-kit generate` over `push` for production
5. Use Neon's connection pooling for serverless

---

## 5. Firebase Authentication

### Overview
- Email/password authentication only
- No public signup
- Backend verifies Firebase ID tokens
- No business data in Firebase

### Client-Side Setup

```typescript
// lib/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
```

### Backend Token Verification

```typescript
// server/src/middleware/auth.ts
import { initializeApp, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FastifyRequest, FastifyReply } from 'fastify';

// Initialize Firebase Admin
const firebaseApp = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
});

// Fastify plugin
async function authPlugin(fastify: FastifyInstance) {
  fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return reply.code(401).send({ error: 'Missing authorization header' });
    }

    const idToken = authHeader.split('Bearer ')[1];

    try {
      const decodedToken = await getAuth(firebaseApp).verifyIdToken(idToken);
      request.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
      };
    } catch (error: any) {
      switch (error.code) {
        case 'auth/id-token-expired':
          return reply.code(401).send({ error: 'Token expired' });
        case 'auth/id-token-revoked':
          return reply.code(401).send({ error: 'Token revoked' });
        default:
          return reply.code(401).send({ error: 'Invalid token' });
      }
    }
  });
}
```

### Token Caching (Performance)

```typescript
import crypto from 'crypto';

const tokenCache = new Map<string, { decoded: any; timestamp: number }>();
const CACHE_TTL = 60 * 1000; // 1 minute

async function verifyTokenWithCache(idToken: string) {
  const cacheKey = crypto.createHash('sha256').update(idToken).digest('hex');
  const cached = tokenCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.decoded;
  }

  const decoded = await getAuth(firebaseApp).verifyIdToken(idToken);
  tokenCache.set(cacheKey, { decoded, timestamp: Date.now() });
  return decoded;
}
```

---

## 6. Next.js 16 App Router

### Breaking Changes in Next.js 16

1. **Async Request APIs** — `params`, `searchParams`, `cookies()`, `headers()` are now Promises
2. **Node.js 20.9+** required (Node 18 dropped)
3. **Turbopack GA** — Default build tool
4. **`middleware.ts` deprecated** → Use `proxy.ts` (but middleware still works)
5. **`revalidateTag()` requires second argument**

### Server Components (Default)

```typescript
// app/dashboard/page.tsx — Server Component (no 'use client')
import { db } from '@/lib/db';

export default async function DashboardPage() {
  // Direct database access — no API layer needed
  const stats = await getDashboardStats();

  return (
    <div>
      <h1>Dashboard</h1>
      <StatsCards stats={stats} />
    </div>
  );
}
```

### Client Components (Opt-in)

```typescript
// app/components/conversation-chat.tsx
'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';

export function ConversationChat({ conversationId }: { conversationId: string }) {
  const [message, setMessage] = useState('');

  const { data: messages } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => fetch(`/api/conversations/${conversationId}/messages`).then(r => r.json()),
  });

  const sendMessage = useMutation({
    mutationFn: (content: string) =>
      fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      }),
  });

  return (
    <div>
      {messages?.map(msg => (
        <div key={msg.id}>{msg.content}</div>
      ))}
      <input value={message} onChange={e => setMessage(e.target.value)} />
      <button onClick={() => sendMessage.mutate(message)}>Send</button>
    </div>
  );
}
```

### Layouts

```typescript
// app/(dashboard)/layout.tsx
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

### Dynamic Routes (Async Params)

```typescript
// app/(dashboard)/customers/[id]/page.tsx
export default async function CustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = await getCustomer(id);

  return <CustomerDetail customer={customer} />;
}
```

### API Routes (Route Handlers)

```typescript
// app/api/customers/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get('status');

  const customers = await getCustomers({ status });
  return NextResponse.json(customers);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const customer = await createCustomer(body);
  return NextResponse.json(customer, { status: 201 });
}
```

---

## 7. Language Detection

### Library: `franc`

- Supports 300+ languages
- Statistical trigram-based detection
- ~330KB bundle
- TypeScript support

```typescript
import { franc } from 'franc';

function detectLanguage(text: string): string {
  const langCode = franc(text, { minLength: 5 });

  // Map ISO 639-3 to our supported languages
  const languageMap: Record<string, string> = {
    'eng': 'en',  // English
    'urd': 'ur',  // Urdu
    'ara': 'ar',  // Arabic
    'hin': 'hi',  // Hindi
    'pan': 'pa',  // Punjabi
    'snd': 'sd',  // Sindhi
  };

  return languageMap[langCode] || 'en'; // Default to English
}
```

### Roman Urdu Detection

Roman Urdu (Urdu written in Latin script) is tricky. Options:
1. Use keyword matching for common Roman Urdu words
2. Use AI model for detection
3. Default to English if `franc` returns unknown

```typescript
const romanUrduKeywords = ['kya', 'hai', 'mein', 'tum', 'aap', 'kaise', 'acha', 'theek'];

function detectRomanUrdu(text: string): boolean {
  const words = text.toLowerCase().split(/\s+/);
  const matches = words.filter(w => romanUrduKeywords.includes(w));
  return matches.length >= 2; // At least 2 matches
}
```

---

## 8. Translation Service

### Options Comparison

| Service | Cost | Languages | Quality | Self-Hosted |
|---------|------|-----------|---------|-------------|
| Google Translate API | $20/M chars | 130+ | Excellent | No |
| DeepL API | Free tier + paid | 30+ | Best | No |
| LibreTranslate | Free | 30+ | Good | **Yes** |
| AI Model (OpenRouter) | Per token | All | Good | No |

### Recommended: Hybrid Approach

1. **Primary:** Use AI model (OpenRouter) for translation — already paying for it
2. **Fallback:** LibreTranslate (self-hosted, free)
3. **Cache:** Store translations in DB, never re-translate

```typescript
// server/src/services/translation/index.ts
export class TranslationService {
  async translate(text: string, targetLang: string): Promise<string> {
    // 1. Check cache in DB
    const cached = await this.getCachedTranslation(text, targetLang);
    if (cached) return cached;

    // 2. Use AI model for translation
    const translated = await this.aiTranslate(text, targetLang);

    // 3. Store in cache
    await this.cacheTranslation(text, targetLang, translated);

    return translated;
  }
}
```

### AI Translation via OpenRouter

```typescript
const translationTool = tool({
  name: 'translate_message',
  description: 'Translate text to target language',
  inputSchema: z.object({
    text: z.string().describe('Text to translate'),
    targetLanguage: z.string().describe('Target language code (en, ur, ar, etc.)'),
  }),
  outputSchema: z.object({
    translatedText: z.string(),
    detectedLanguage: z.string(),
  }),
  execute: async ({ text, targetLanguage }) => {
    const result = await openrouter.callModel({
      model: process.env.OPENROUTER_MODEL,
      messages: [
        {
          role: 'system',
          content: `Translate the following text to ${targetLanguage}. Return JSON with translatedText and detectedLanguage fields.`
        },
        { role: 'user', content: text }
      ],
    });
    return JSON.parse(await result.getText());
  },
});
```

---

## 9. Tailwind CSS 4

### Key Changes in v4

- New `@theme` directive for design tokens
- CSS-first configuration (no more `tailwind.config.js`)
- Automatic content detection
- Improved performance

```css
/* globals.css */
@import "tailwindcss";

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}
```

### shadcn/ui Integration

```bash
npx shadcn@latest init
npx shadcn@latest add button card table dialog input select badge
```

---

## 10. TanStack Query v5

### Setup

```typescript
// providers/query-provider.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 seconds
      retry: 2,
    },
  },
});

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

### Usage

```typescript
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Fetch customers
export function useCustomers(status?: string) {
  return useQuery({
    queryKey: ['customers', status],
    queryFn: () => fetch(`/api/customers?status=${status}`).then(r => r.json()),
  });
}

// Create customer
export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCustomerInput) =>
      fetch('/api/customers', {
        method: 'POST',
        body: JSON.stringify(data),
      }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}
```

---

## 11. Puppeteer Session Management

### Best Practices for WhatsApp

1. **Persistent user data directory** — Don't use temp dirs
2. **Handle page crashes** — Listen for `disconnected` event
3. **Restart on failure** — Exponential backoff
4. **Resource limits** — Set viewport, disable images if not needed

```typescript
const client = new Client({
  authStrategy: new LocalAuth({
    clientId: 'fujifenix',
    dataPath: './whatsapp-session',
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
```

### Reconnection Logic

```typescript
class WhatsAppService {
  private retryCount = 0;
  private maxRetries = 5;

  async initialize() {
    this.client.on('disconnected', async (reason) => {
      logger.warn('WhatsApp disconnected', { reason });

      if (this.retryCount < this.maxRetries) {
        const delay = Math.pow(2, this.retryCount) * 1000; // Exponential backoff
        this.retryCount++;

        logger.info(`Reconnecting in ${delay}ms (attempt ${this.retryCount})`);
        await new Promise(resolve => setTimeout(resolve, delay));

        await this.client.initialize();
      } else {
        logger.error('Max retries reached. Manual intervention required.');
        await this.notifyAdmin('WhatsApp disconnected permanently');
      }
    });

    this.client.on('ready', () => {
      this.retryCount = 0; // Reset on successful connection
      logger.info('WhatsApp connected');
    });
  }
}
```

---

## 12. Docker Configuration

### Dockerfile (Server)

```dockerfile
FROM node:20-slim AS base
WORKDIR /app

# Install Puppeteer dependencies
RUN apt-get update && apt-get install -y \
    libgbm-dev libatk1.0-0 libc6 libcairo2 libcups2 \
    libdbus-1-3 libexpat1 libfontconfig1 libgcc1 \
    libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 \
    libnspr4 libpango-1.0-0 libpangocairo-1.0-0 \
    libstdc++6 libx11-6 libx11-xcb1 libxcb1 \
    libxcomposite1 libxcursor1 libxdamage1 libxext6 \
    libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 \
    libxtst6 ca-certificates fonts-liberation libnss3 \
    lsb-release xdg-utils wget chromium \
    && rm -rf /var/lib/apt/lists/*

FROM base AS builder
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM base AS production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist

# WhatsApp session volume
VOLUME /app/whatsapp-session

EXPOSE 3001
CMD ["node", "dist/index.js"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  server:
    build: ./server
    ports:
      - "3001:3001"
    volumes:
      - whatsapp-session:/app/whatsapp-session
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - OPENROUTER_API_KEY=${OPENROUTER_API_KEY}
      - OPENROUTER_MODEL=${OPENROUTER_MODEL}
      - FIREBASE_PROJECT_ID=${FIREBASE_PROJECT_ID}
      - FIREBASE_CLIENT_EMAIL=${FIREBASE_CLIENT_EMAIL}
      - FIREBASE_PRIVATE_KEY=${FIREBASE_PRIVATE_KEY}
    restart: unless-stopped

  client:
    build: ./client
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_FIREBASE_API_KEY=${NEXT_PUBLIC_FIREBASE_API_KEY}
      - NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}
      - NEXT_PUBLIC_API_URL=http://localhost:3001
    depends_on:
      - server

volumes:
  whatsapp-session:
    driver: local
```

---

## 13. Environment Variables Reference

### Server (.env)

```env
# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require

# OpenRouter AI
OPENROUTER_API_KEY=sk-or-v1-xxx
OPENROUTER_MODEL=anthropic/claude-sonnet-4
OPENROUTER_FALLBACK_MODEL=openai/gpt-4o

# Firebase Admin
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nxxx\n-----END PRIVATE KEY-----\n"

# WhatsApp
WHATSAPP_SESSION_PATH=./whatsapp-session

# App
APP_URL=http://localhost:3000
API_URL=http://localhost:3001
NODE_ENV=development
LOG_LEVEL=info
```

### Client (.env.local)

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyxxx
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## 14. Critical Implementation Notes

### Phone Number Normalization

```typescript
function normalizePhone(phone: string): string {
  // Remove all non-numeric characters
  let normalized = phone.replace(/[^0-9]/g, '');

  // Remove leading zeros
  if (normalized.startsWith('0')) {
    normalized = normalized.substring(1);
  }

  // Ensure country code
  if (normalized.length === 10) {
    normalized = '92' + normalized; // Pakistan default
  }

  return normalized;
}
```

### Duplicate Message Prevention

```typescript
// Use idempotency key: hash of (sender + content + timestamp window)
function getMessageIdempotencyKey(sender: string, content: string): string {
  const timestamp = Math.floor(Date.now() / 5000); // 5-second window
  return crypto.createHash('sha256')
    .update(`${sender}:${content}:${timestamp}`)
    .digest('hex');
}
```

### Emergency Detection Keywords

```typescript
const EMERGENCY_KEYWORDS = [
  'trapped', 'stuck', 'fire', 'injury', 'accident',
  'door open', 'dangerous', 'help', 'emergency',
  'fell', 'shaking', 'smoke', 'burning', 'urgent',
  'phas gaye', 'atka hua', 'aag', 'chot', 'madad',
];
```

---

*Last updated: 2026-08-09*
*Status: Research Complete — Ready for Implementation*
