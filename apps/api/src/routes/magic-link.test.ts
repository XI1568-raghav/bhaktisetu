import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock prisma: default to "user not found" so the /verify create-path runs.
vi.mock('../lib/prisma.js', () => ({
  prisma: {
    user: {
      findFirst: vi.fn(async () => null),
      create: vi.fn(async (args: { data: { email: string } }) => ({
        id: '11111111-2222-3333-4444-555555555555',
        email: args.data.email,
        fullName: 'Devotee',
        phone: 'email-x',
      })),
    },
    userRoleAssignment: {
      create: vi.fn(async () => ({})),
    },
    // createEmailSession() persists the session row (A-005). Stub the raw INSERT.
    $executeRawUnsafe: vi.fn(async () => 1),
  },
}));

// Mock email: default to skipped (no Resend key) so /request returns devLink.
vi.mock('../lib/email.js', () => ({
  sendEmail: vi.fn(async () => ({ ok: false, skipped: true })),
  magicLinkEmail: (link: string) => ({ subject: 'Sign in', html: link, text: link }),
}));

import Fastify from 'fastify';
import { magicLinkRoutes } from './magic-link.js';

async function buildApp() {
  const app = Fastify({ logger: false });
  await app.register((await import('@fastify/rate-limit')).default, {
    global: true,
    max: 100,
    timeWindow: '1 minute',
  });
  await app.register(
    async (instance) => {
      await magicLinkRoutes(instance);
    },
    { prefix: '/api/v1/auth/magic-link' },
  );
  return app;
}

describe('magic-link /request — validation + rate limit (P1-1)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    // P0-3: the module reads JWT_SECRET at import time (before vi hoists mocks).
    // The module falls back to 'darshya-dev-secret' when unset; to make sign +
    // verify agree we must use that same default — unsetting lets the fallback
    // apply on both sides. Do NOT set 'test-secret-for-hmac' here (the module
    // already captured a different value at import and would mis-verify).
    delete process.env.JWT_SECRET;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('rejects an invalid email', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/magic-link/request',
      payload: { email: 'not-an-email' },
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it('returns a devLink when email is skipped (dev mode)', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/magic-link/request',
      payload: { email: 'dev@example.com' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.devLink).toContain('/auth/verify?token=');
    await app.close();
  });

  it('never returns the sign-in link in production when email is skipped', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.ALLOW_DEMO_TOKENS;
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/magic-link/request',
      payload: { email: 'victim@example.com' },
    });
    expect(res.statusCode).toBe(503);
    expect(res.body).not.toContain('devLink');
    expect(res.body).not.toContain('/auth/verify');
    await app.close();
  });

  it('returns 429 after exceeding the 10/min sensitive-auth rate limit', async () => {
    const app = await buildApp();
    let lastStatus = 0;
    for (let i = 0; i < 12; i++) {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/magic-link/request',
        payload: { email: `u${i}@example.com` },
      });
      lastStatus = res.statusCode;
    }
    expect(lastStatus).toBe(429);
    await app.close();
  });
});

describe('magic-link /verify — token signature + session issue', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    // P0-3: the module reads JWT_SECRET at import time (before vi hoists mocks).
    // The module falls back to 'darshya-dev-secret' when unset; to make sign +
    // verify agree we must use that same default — unsetting lets the fallback
    // apply on both sides. Do NOT set 'test-secret-for-hmac' here (the module
    // already captured a different value at import and would mis-verify).
    delete process.env.JWT_SECRET;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('rejects a tampered token (signature mismatch)', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/magic-link/verify',
      payload: { token: 'totally-bogus.token' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/Invalid or expired/);
    await app.close();
  });

  it('round-trips a valid token (simple email) → issues an email-<uuid>-<hex> session', async () => {
    const app = await buildApp();
    // Request to mint a real token (devLink path).
    const req = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/magic-link/request',
      payload: { email: 'newuser@example.com' },
    });
    const devLink = req.json().devLink as string;
    const token = new URL(devLink).searchParams.get('token');
    expect(token).toBeTruthy();

    const verify = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/magic-link/verify',
      payload: { token },
    });
    expect(verify.statusCode).toBe(200);
    const body = verify.json();
    expect(body.ok).toBe(true);
    expect(body.session.accessToken).toMatch(
      /^email-11111111-2222-3333-4444-555555555555-[0-9a-f]{32}$/,
    );
    await app.close();
  });

  // P0-3 (2026-07-17): regression test for the dotted-email bug. A magic link
  // for first.last@example.com MUST verify — the old split('.') logic ate the
  // dot and parsed the nonce as the expiry, so every dotted-email link expired
  // instantly. This is the exact failure the fix addresses.
  it('round-trips a valid token for a DOTTED email (first.last@example.com)', async () => {
    const app = await buildApp();
    const req = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/magic-link/request',
      payload: { email: 'first.last@example.com' },
    });
    const devLink = req.json().devLink as string;
    const token = new URL(devLink).searchParams.get('token');
    expect(token).toBeTruthy();

    const verify = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/magic-link/verify',
      payload: { token },
    });
    expect(verify.statusCode).toBe(200);
    expect(verify.json().ok).toBe(true);
    await app.close();
  });
});
