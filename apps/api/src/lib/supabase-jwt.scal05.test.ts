import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import crypto from 'node:crypto';

/**
 * SCAL-05 — every authenticated request made a live call to Supabase Auth.
 *
 * `authenticateUser` had no local verification path at all: production tokens
 * fell through to `supabaseAdmin.auth.getUser(token)`, an outbound HTTPS request
 * to GoTrue in ap-northeast-1, on EVERY request — before the 2–4 Prisma lookups
 * that follow it. So the throughput ceiling was Supabase Auth's rate limit
 * rather than this API's capacity, and a slow minute at Supabase locked out
 * every logged-in devotee, pandit and temple manager simultaneously.
 *
 * Supabase signs access tokens HS256 with the project JWT secret, so signature
 * + exp + aud can be checked offline with `node:crypto` and zero network. This
 * file pins that verifier. The middleware keeps the remote call as a FALLBACK
 * for anything this refuses, so a wrong secret degrades to today's behaviour
 * rather than locking everyone out.
 */

const SECRET = 'super-secret-supabase-jwt-signing-key-for-tests';

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function makeToken(
  payload: Record<string, unknown>,
  opts: { secret?: string; alg?: string } = {},
): string {
  const header = b64url(JSON.stringify({ alg: opts.alg ?? 'HS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify(payload));
  const sig = crypto
    .createHmac('sha256', opts.secret ?? SECRET)
    .update(`${header}.${body}`)
    .digest();
  return `${header}.${body}.${b64url(sig)}`;
}

const nowSec = () => Math.floor(Date.now() / 1000);

function validPayload(over: Record<string, unknown> = {}) {
  return {
    sub: '11111111-1111-1111-1111-111111111111',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'devotee@demo.com',
    exp: nowSec() + 3600,
    iat: nowSec() - 10,
    ...over,
  };
}

const ORIG = process.env.SUPABASE_JWT_SECRET;

beforeEach(() => {
  process.env.SUPABASE_JWT_SECRET = SECRET;
});
afterEach(() => {
  if (ORIG === undefined) delete process.env.SUPABASE_JWT_SECRET;
  else process.env.SUPABASE_JWT_SECRET = ORIG;
});

async function load() {
  const mod = await import('./supabase-jwt.js');
  return mod;
}

describe('SCAL-05 — offline Supabase JWT verification', () => {
  it('accepts a correctly signed, unexpired token and returns its subject', async () => {
    const { verifySupabaseJwt } = await load();
    const out = verifySupabaseJwt(makeToken(validPayload()), SECRET);
    expect(out).toEqual({
      id: '11111111-1111-1111-1111-111111111111',
      email: 'devotee@demo.com',
      phone: null,
      expSeconds: expect.any(Number),
    });
  });

  it('rejects a token signed with the wrong secret', async () => {
    const { verifySupabaseJwt } = await load();
    const forged = makeToken(validPayload(), { secret: 'not-the-secret' });
    expect(verifySupabaseJwt(forged, SECRET)).toBeNull();
  });

  it('rejects a token whose payload was edited after signing', async () => {
    const { verifySupabaseJwt } = await load();
    const good = makeToken(validPayload());
    const [h, , s] = good.split('.');
    const tampered = `${h}.${b64url(
      JSON.stringify(validPayload({ sub: '22222222-2222-2222-2222-222222222222' })),
    )}.${s}`;
    expect(verifySupabaseJwt(tampered, SECRET)).toBeNull();
  });

  it('rejects an expired token', async () => {
    const { verifySupabaseJwt } = await load();
    expect(verifySupabaseJwt(makeToken(validPayload({ exp: nowSec() - 1 })), SECRET)).toBeNull();
  });

  it('rejects alg:none — the classic JWT bypass', async () => {
    const { verifySupabaseJwt } = await load();
    const header = b64url(JSON.stringify({ alg: 'none', typ: 'JWT' }));
    const body = b64url(JSON.stringify(validPayload()));
    expect(verifySupabaseJwt(`${header}.${body}.`, SECRET)).toBeNull();
  });

  it('rejects a token whose audience is not "authenticated"', async () => {
    const { verifySupabaseJwt } = await load();
    expect(verifySupabaseJwt(makeToken(validPayload({ aud: 'anon' })), SECRET)).toBeNull();
  });

  it('rejects a token with no subject — there is nobody to be', async () => {
    const { verifySupabaseJwt } = await load();
    const p = validPayload();
    delete (p as Record<string, unknown>).sub;
    expect(verifySupabaseJwt(makeToken(p), SECRET)).toBeNull();
  });

  it('rejects structurally broken input instead of throwing', async () => {
    const { verifySupabaseJwt } = await load();
    for (const bad of ['', 'a.b', 'a.b.c.d', 'not-a-jwt', '...']) {
      expect(verifySupabaseJwt(bad, SECRET)).toBeNull();
    }
  });

  it('is disabled — and says so — when the owner has not supplied the secret', async () => {
    delete process.env.SUPABASE_JWT_SECRET;
    const { supabaseJwtConfig, verifySupabaseJwt } = await load();
    expect(supabaseJwtConfig().enabled).toBe(false);
    // With no secret there is nothing to verify against, so the caller must
    // fall through to the remote check rather than trusting the token.
    expect(verifySupabaseJwt(makeToken(validPayload()), undefined)).toBeNull();
  });
});
