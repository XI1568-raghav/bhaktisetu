import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock prisma so the /verify find-or-create path doesn't touch a DB.
vi.mock('../lib/prisma.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(async () => null),
      create: vi.fn(async (args: { data: { phone: string } }) => ({
        id: 'new-user-id',
        phone: args.data.phone,
        email: null,
        fullName: 'Devotee',
      })),
    },
    // createEmailSession() persists the session row (A-005). Stub the raw INSERT.
    $executeRawUnsafe: vi.fn(async () => 1),
  },
}));

// Mock whatsapp: default to disabled (the prod-fail-closed path).
const sendWhatsappTemplate = vi.fn(async (_args: unknown) => ({
  ok: false,
  skipped: true,
  error: 'no creds',
}));
vi.mock('../lib/whatsapp.js', () => ({
  whatsapp: { enabled: false },
  sendWhatsappTemplate: (to: unknown, template: unknown, lang: unknown, vars: unknown) =>
    sendWhatsappTemplate({ to, template, lang, vars }),
}));

import Fastify from 'fastify';
import { whatsappOtpRoutes } from './whatsapp-otp.js';

async function buildApp() {
  const app = Fastify({ logger: false });
  // Register the rate-limit plugin so the route's rateLimit config resolves.
  await app.register((await import('@fastify/rate-limit')).default, {
    global: true,
    max: 100,
    timeWindow: '1 minute',
  });
  await app.register(
    async (instance) => {
      await whatsappOtpRoutes(instance);
    },
    { prefix: '/api/v1/auth/whatsapp-otp' },
  );
  return app;
}

const PHONE = '+919999999999';

describe('whatsapp-otp /request — devCode leak (P0-4) + rate limit (P1-1)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    sendWhatsappTemplate.mockResolvedValue({ ok: false, skipped: true, error: 'no creds' });
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('does NOT leak devCode when NODE_ENV=production (even if WhatsApp is disabled)', async () => {
    process.env.NODE_ENV = 'production';
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/whatsapp-otp/request',
      payload: { phone: PHONE },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.devCode).toBeUndefined();
    expect(body.sent).toBe(false);
    await app.close();
  });

  it('leaks devCode in dev mode (expected — local QA without WhatsApp)', async () => {
    process.env.NODE_ENV = 'test';
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/whatsapp-otp/request',
      payload: { phone: PHONE },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.devCode).toMatch(/^\d{6}$/);
    await app.close();
  });

  it('returns 429 after exceeding the 10/min sensitive-auth rate limit', async () => {
    process.env.NODE_ENV = 'test';
    const app = await buildApp();
    let lastStatus = 0;
    // Fire 12 requests; the first 10 succeed, the 11th/12th should 429.
    for (let i = 0; i < 12; i++) {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/whatsapp-otp/request',
        payload: { phone: PHONE },
      });
      lastStatus = res.statusCode;
    }
    expect(lastStatus).toBe(429);
    await app.close();
  });

  it('rejects a phone with fewer than 10 digits', async () => {
    process.env.NODE_ENV = 'test';
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/whatsapp-otp/request',
      payload: { phone: '123' },
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });
});

describe('whatsapp-otp /verify — rate limit + happy path', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('issues a session after a correct code (request → verify round-trip)', async () => {
    process.env.NODE_ENV = 'test';
    const app = await buildApp();
    const req = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/whatsapp-otp/request',
      payload: { phone: PHONE },
    });
    const devCode = req.json().devCode as string;
    expect(devCode).toMatch(/^\d{6}$/);

    const verify = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/whatsapp-otp/verify',
      payload: { phone: PHONE, code: devCode },
    });
    expect(verify.statusCode).toBe(200);
    const body = verify.json();
    expect(body.ok).toBe(true);
    expect(body.session.accessToken).toMatch(/^email-new-user-id-[0-9a-f]{32}$/);
    await app.close();
  });

  it('rejects an incorrect code with attemptsLeft', async () => {
    process.env.NODE_ENV = 'test';
    const app = await buildApp();
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/whatsapp-otp/request',
      payload: { phone: PHONE },
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/whatsapp-otp/verify',
      payload: { phone: PHONE, code: '000000' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().attemptsLeft).toBe(2);
    await app.close();
  });
});
