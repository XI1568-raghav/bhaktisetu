import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

const { supabaseGetUser } = vi.hoisted(() => ({ supabaseGetUser: vi.fn() }));
vi.mock('../lib/supabase.js', () => ({
  supabaseAdmin: { auth: { getUser: supabaseGetUser } },
  isDemoMode: false,
}));

import { authenticateUser } from './auth.js';

/**
 * AW-08 (2026-08-12, P1) — the astrologer demo account was completely dead and
 * leaked internal server detail on every call.
 *
 * DEMO_ROLE_MAP maps the handle 'astro' to astro@demo.com. That User row does
 * not exist in this database (prisma/seed.ts seeds astrologer@demo.com;
 * scripts/seed-demo-users.ts seeds astro@demo.com and had never been run), so
 * the lookup missed and the middleware fell through to a synthetic-id branch
 * that set `currentUser.id = 'demo-astro'` — not a UUID. Every DB-backed route
 * then 500'd with a raw Prisma error:
 *
 *   {"statusCode":500,"code":"P2023","message":"Invalid `prisma.astrologerProfile
 *    .findUnique()` invocation in E:\\NewClaude\\bhaktisetu\\apps\\api\\src\\routes\\
 *    astrologer-portal.ts:53:52 … Error creating UUID, invalid character …"}
 *
 * — the absolute source path, the invocation site and the SQL text handed to
 * any caller. In the browser /astrologer-portal rendered confident zeros.
 *
 * Fail CLOSED: a demo handle whose User row is absent is not authenticated.
 * 401 with a plain sentence beats a fake identity that detonates one layer down.
 */

function makeReq(authHeader?: string) {
  return {
    headers: authHeader ? { authorization: authHeader } : {},
    log: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
    currentUser: undefined as any,
  } as any;
}

function makeReply() {
  const reply: any = {
    statusCode: 200,
    body: undefined,
    code(c: number) {
      reply.statusCode = c;
      return reply;
    },
    send(b: any) {
      reply.body = b;
      return reply;
    },
  };
  return reply;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NODE_ENV = 'test';
  process.env.ALLOW_DEMO_TOKENS = 'true';
});

describe('AW-08 — a demo handle with no seeded User row must not authenticate', () => {
  it('401s instead of minting the non-UUID id "demo-astro"', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    const req = makeReq('Bearer demo-astro-token');
    const reply = makeReply();
    await authenticateUser(req, reply);

    expect(reply.statusCode).toBe(401);
    expect(req.currentUser).toBeUndefined();
  });

  it('says which demo account is missing without leaking internals', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    const req = makeReq('Bearer demo-astro-token');
    const reply = makeReply();
    await authenticateUser(req, reply);

    const message = String(reply.body?.message ?? '');
    expect(message).toMatch(/astro@demo\.com/);
    expect(message).toMatch(/seed/i);
    // Never a Prisma invocation, a file path, or SQL.
    expect(message).not.toMatch(/prisma\.|\.ts:\d|SELECT |uuid/i);
  });

  it('never produces a currentUser.id that is not a UUID', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    for (const handle of ['astro', 'wellness', 'devotee', 'admin']) {
      const req = makeReq(`Bearer demo-${handle}-token`);
      const reply = makeReply();
      await authenticateUser(req, reply);
      expect(req.currentUser).toBeUndefined();
      expect(reply.statusCode).toBe(401);
    }
  });

  it('still authenticates a demo handle whose User row IS seeded', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: '9e15c3a2-0dc7-4677-ac45-f7dfaec619a6',
      email: 'wellness@demo.com',
      phone: null,
      fullName: 'Demo Wellness',
      subscriptionTier: 'free',
      blocked: false,
    });

    const req = makeReq('Bearer demo-wellness-token');
    const reply = makeReply();
    await authenticateUser(req, reply);

    expect(reply.statusCode).toBe(200);
    expect(req.currentUser?.id).toBe('9e15c3a2-0dc7-4677-ac45-f7dfaec619a6');
    expect(req.currentUser?.roles).toContain('WELLNESS_INSTRUCTOR');
  });
});
