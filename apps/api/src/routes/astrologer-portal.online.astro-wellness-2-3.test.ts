import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { astrologerPortalRoutes } from './astrologer-portal.js';

/**
 * Customer-test findings astro-wellness-2 (missing role gate) and
 * astro-wellness-3 (validation surfaces as 500), both reproduced on
 * api.darshya.online 2026-09-09.
 *
 * astro-wellness-2: GET /astrologer-portal/online answered 200 for the
 * wellness-instructor token AND the devotee token, byte-identical body
 * `{"online":false,"mode":{"chat":true,"call":true}}`. It was the only handler
 * in this file without a role check — /dashboard, /profile, /availability,
 * POST /online and /earnings all 403'd the same two tokens. No cross-tenant
 * data crossed (the body is the caller's own always-default presence, keyed on
 * currentUser.id) and the WRITE path was already closed, which is why the
 * finding is P2 and not P0. It is still a guard that this file otherwise
 * applies six times out of six.
 *
 * astro-wellness-3: POST with `{"online":"yes"}` and with `{}` both answered
 * 500 `{"error":"InternalServerError","code":"INTERNAL_ERROR"}` — a bare
 * `.parse()` throws a ZodError nothing catches. The caller is told the server
 * broke when their own body was malformed, and every malformed toggle lands in
 * the 5xx rate for the endpoint an astrologer touches most often.
 *
 * The last two cases pin behaviour that was VERIFIED WORKING on prod and must
 * survive the fix: the toggle persists, and a double-submit is idempotent.
 */

const ASTRO_ID = '3f2a8c14-9b6d-4e07-8a51-2c7d9e4b1a63';
const WELLNESS_ID = '8d41b7e2-5c93-4a16-b0f8-6e3a2d905c74';
const DEVOTEE_ID = 'c5e09a38-71b4-4d2f-9e63-8b1740fac256';

/** Presence lives in a module-level Map keyed by user id (astrologer.service).
 *  Tests that write presence use their own id so no test can observe another's. */
const WRITER_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
const IDEMPOTENT_ID = 'f9e8d7c6-b5a4-4938-a271-605f4e3d2c1b';

const USERS: Record<string, { id: string; email: string }> = {
  'astro@demo.com': { id: ASTRO_ID, email: 'astro@demo.com' },
  'wellness@demo.com': { id: WELLNESS_ID, email: 'wellness@demo.com' },
  'devotee@demo.com': { id: DEVOTEE_ID, email: 'devotee@demo.com' },
};

/** Overrides the id the astro@demo.com token resolves to, so presence-writing
 *  tests get a private key in the module-level presence Map. */
let astroIdOverride: string | null = null;

async function buildApp() {
  const app = Fastify({ logger: false });
  await app.register(astrologerPortalRoutes, { prefix: '/api/v1/astrologer-portal' });
  return app;
}

async function call(
  method: 'GET' | 'POST',
  token: string,
  payload?: unknown,
): Promise<{ statusCode: number; body: string; json: () => any }> {
  const app = await buildApp();
  const res = await app.inject({
    method,
    url: '/api/v1/astrologer-portal/online',
    headers: { authorization: `Bearer ${token}` },
    ...(payload === undefined ? {} : { payload: payload as object }),
  });
  await app.close();
  return { statusCode: res.statusCode, body: res.body, json: () => res.json() };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NODE_ENV = 'test';
  astroIdOverride = null;
  prismaMock.user.findUnique.mockImplementation(async (args: { where: { email?: string } }) => {
    const row = args.where.email ? USERS[args.where.email] : undefined;
    if (!row) return null;
    const id = row.email === 'astro@demo.com' && astroIdOverride ? astroIdOverride : row.id;
    return {
      ...row,
      id,
      phone: null,
      fullName: 'Customer Test',
      subscriptionTier: 'free',
      blocked: false,
    };
  });
});

describe('astro-wellness-2 — GET /online is gated on the ASTROLOGER role', () => {
  it('refuses a wellness-instructor token', async () => {
    const res = await call('GET', 'demo-wellness');
    expect(res.statusCode).toBe(403);
    expect(res.json().error).toBe('ASTROLOGER role required');
  });

  it('refuses a devotee token', async () => {
    const res = await call('GET', 'demo-devotee');
    expect(res.statusCode).toBe(403);
    expect(res.json().error).toBe('ASTROLOGER role required');
  });

  it('discloses no presence field at all to a refused caller', async () => {
    const body = (await call('GET', 'demo-wellness')).json();
    expect(body).not.toHaveProperty('online');
    expect(body).not.toHaveProperty('mode');
  });

  it('still answers the astrologer, defaulting to offline on both modes', async () => {
    const res = await call('GET', 'demo-astro');
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ online: false, mode: { chat: true, call: true } });
  });
});

describe('astro-wellness-3 — a malformed POST /online body is the caller’s error', () => {
  it('answers 400, not 500, for a wrong-typed field', async () => {
    const res = await call('POST', 'demo-astro', { online: 'yes' });
    expect(res.statusCode).toBe(400);
  });

  it('answers 400, not 500, when the required field is missing', async () => {
    const res = await call('POST', 'demo-astro', {});
    expect(res.statusCode).toBe(400);
  });

  it('names the offending field so the caller can fix the request', async () => {
    const body = (await call('POST', 'demo-astro', { online: 'yes' })).json();
    expect(body.error).toBe('Invalid input');
    expect(body.details.fieldErrors.online).toBeDefined();
    expect(body.details.fieldErrors.online.length).toBeGreaterThan(0);
  });

  it('rejects a wrong-typed optional field too', async () => {
    const res = await call('POST', 'demo-astro', { online: true, chat: 'sometimes' });
    expect(res.statusCode).toBe(400);
    expect(res.json().details.fieldErrors.chat).toBeDefined();
  });

  it('leaks no stack frame, server path or ORM text on the 400', async () => {
    const raw = (await call('POST', 'demo-astro', { online: 'yes' })).body;
    expect(raw).not.toContain('NewClaude');
    expect(raw).not.toContain('astrologer-portal.ts:');
    expect(raw).not.toContain('ZodError');
  });

  it('refuses the write for a non-astrologer before it validates the body', async () => {
    // Ordering matters: a 403 must not be reachable as a 400, or the role gate
    // becomes a probe for whether a body is well-formed.
    const res = await call('POST', 'demo-wellness', { online: 'yes' });
    expect(res.statusCode).toBe(403);
  });
});

describe('the go-online toggle keeps working (verified on prod 2026-09-09)', () => {
  it('persists across an independent read-back, modes included', async () => {
    astroIdOverride = WRITER_ID;
    const write = await call('POST', 'demo-astro', { online: true, chat: true, call: false });
    expect(write.statusCode).toBe(200);
    expect(write.json()).toMatchObject({ ok: true, online: true, mode: { chat: true, call: false } });

    const read = await call('GET', 'demo-astro');
    expect(read.statusCode).toBe(200);
    expect(read.json()).toEqual({ online: true, mode: { chat: true, call: false } });
  });

  it('is idempotent on a double-submit of the same payload', async () => {
    astroIdOverride = IDEMPOTENT_ID;
    await call('POST', 'demo-astro', { online: true, chat: true, call: false });
    const second = await call('POST', 'demo-astro', { online: true, chat: true, call: false });
    expect(second.statusCode).toBe(200);
    expect((await call('GET', 'demo-astro')).json()).toEqual({
      online: true,
      mode: { chat: true, call: false },
    });
  });
});
