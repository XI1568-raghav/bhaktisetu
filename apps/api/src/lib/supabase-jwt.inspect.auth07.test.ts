/**
 * AUTH-07 (F454, 2026-09-08) — the expiry signal, and the oracle rule that
 * still holds around it.
 *
 * `verifySupabaseJwt` returns a bare `null` for every refusal, and its docblock
 * gives the reason: "a verifier that leaks its reasoning is an oracle." That is
 * correct for the refusals an attacker can drive — telling someone which of
 * structure, `alg` or signature rejected their forgery is exactly the feedback
 * loop that shapes the next attempt.
 *
 * The blanket version of that rule had a cost. It meant the API could not tell
 * an EXPIRED session from an unverifiable one, so the 401 carried no
 * distinction, so apps/web asserted "Your session has expired" for all of them
 * — including for a database outage.
 *
 * `inspectSupabaseJwt` returns `expired` and only `expired` past the crypto: at
 * that point the HMAC has verified against the project secret and `aud` has
 * matched, so the caller is holding a token this project minted and `exp` is a
 * plaintext claim inside the token in their own hand. It discloses nothing.
 * Everything upstream of the signature check still collapses into `malformed`
 * or `unverified`. These tests pin both halves.
 */

import { describe, it, expect } from 'vitest';
import crypto from 'node:crypto';

import { inspectSupabaseJwt, verifySupabaseJwt } from './supabase-jwt.js';

const SECRET = 'project-jwt-secret-under-test';

function b64url(input: string | Buffer): string {
  return Buffer.from(input).toString('base64url');
}

function signedToken(over: Record<string, unknown> = {}, secret = SECRET): string {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = b64url(
    JSON.stringify({
      sub: 'sb-user-1',
      aud: 'authenticated',
      email: 'devotee@demo.com',
      exp: Math.floor(Date.now() / 1000) + 3600,
      ...over,
    }),
  );
  const sig = crypto.createHmac('sha256', secret).update(`${header}.${payload}`).digest();
  return `${header}.${payload}.${b64url(sig)}`;
}

describe('AUTH-07 — inspectSupabaseJwt names expiry, and only expiry', () => {
  it('says expired for a token that is ours and past its exp', () => {
    const result = inspectSupabaseJwt(signedToken({ exp: Math.floor(Date.now() / 1000) - 1 }), SECRET);
    expect(result).toEqual({ ok: false, reason: 'expired' });
  });

  it('does NOT say expired for an expired token signed with the wrong secret', () => {
    // The whole oracle rule in one assertion: an attacker can put any `exp`
    // they like in a payload, so `expired` must be gated on the signature.
    const result = inspectSupabaseJwt(
      signedToken({ exp: Math.floor(Date.now() / 1000) - 1 }, 'attacker-secret'),
      SECRET,
    );
    expect(result).toEqual({ ok: false, reason: 'unverified' });
  });

  it('does NOT say expired for an expired token with the wrong audience', () => {
    // A Supabase anon key is a valid JWT signed by the same secret. Naming its
    // expiry would confirm that the secret is right, which is a real leak.
    const result = inspectSupabaseJwt(
      signedToken({ aud: 'anon', exp: Math.floor(Date.now() / 1000) - 1 }),
      SECRET,
    );
    expect(result).toEqual({ ok: false, reason: 'unverified' });
  });

  it('collapses everything before the crypto into malformed', () => {
    expect(inspectSupabaseJwt('', SECRET)).toEqual({ ok: false, reason: 'malformed' });
    expect(inspectSupabaseJwt('not-a-jwt', SECRET)).toEqual({ ok: false, reason: 'malformed' });
    expect(inspectSupabaseJwt('a.b', SECRET)).toEqual({ ok: false, reason: 'malformed' });
    expect(inspectSupabaseJwt('a..c', SECRET)).toEqual({ ok: false, reason: 'malformed' });
  });

  it('refuses alg:none as unverified, never as anything more specific', () => {
    const header = b64url(JSON.stringify({ alg: 'none', typ: 'JWT' }));
    const payload = b64url(JSON.stringify({ sub: 'x', aud: 'authenticated', exp: 1 }));
    expect(inspectSupabaseJwt(`${header}.${payload}.`, SECRET)).toEqual({
      ok: false,
      reason: 'malformed',
    });
    expect(inspectSupabaseJwt(`${header}.${payload}.AAAA`, SECRET)).toEqual({
      ok: false,
      reason: 'unverified',
    });
  });

  it('says no_secret when offline verification is simply not configured', () => {
    expect(inspectSupabaseJwt(signedToken(), undefined)).toEqual({
      ok: false,
      reason: 'no_secret',
    });
    expect(inspectSupabaseJwt(signedToken(), '')).toEqual({ ok: false, reason: 'no_secret' });
  });

  it('returns the verified token when everything checks out', () => {
    const result = inspectSupabaseJwt(signedToken(), SECRET);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.token.id).toBe('sb-user-1');
      expect(result.token.email).toBe('devotee@demo.com');
    }
  });
});

describe('AUTH-07 — verifySupabaseJwt is unchanged for every existing caller', () => {
  /**
   * The wrapper exists so the SCAL-05 contract — token or null, never a reason —
   * survives verbatim for the code that was written against it, and so there is
   * exactly one implementation of "is this token good".
   */
  const cases: Array<[string, string, string | undefined]> = [
    ['a genuine token', signedToken(), SECRET],
    ['an expired token', signedToken({ exp: Math.floor(Date.now() / 1000) - 1 }), SECRET],
    ['a forged token', signedToken({}, 'attacker-secret'), SECRET],
    ['the wrong audience', signedToken({ aud: 'anon' }), SECRET],
    ['no subject', signedToken({ sub: '' }), SECRET],
    ['garbage', 'not-a-jwt', SECRET],
    ['no secret', signedToken(), undefined],
  ];

  for (const [name, token, secret] of cases) {
    it(`agrees with inspectSupabaseJwt for ${name}`, () => {
      const inspected = inspectSupabaseJwt(token, secret);
      const verified = verifySupabaseJwt(token, secret);
      expect(verified === null).toBe(!inspected.ok);
      if (inspected.ok) expect(verified).toEqual(inspected.token);
    });
  }
});
