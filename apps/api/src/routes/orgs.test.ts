import { describe, it, expect } from 'vitest';
import crypto from 'crypto';

/**
 * Pure-function tests for the signed-token helper used by /orgs invites.
 * The helpers are inlined into orgs.ts (to keep the route self-contained)
 * so we re-implement the same pair here and assert behaviour is symmetric.
 */

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf as Buffer).toString('base64')
    .replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}
function b64urlDecode(s: string): Buffer {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Buffer.from(s, 'base64');
}
function signToken(payload: object, secret: string): string {
  const body = b64url(Buffer.from(JSON.stringify(payload)));
  const sig = b64url(crypto.createHmac('sha256', secret).update(body).digest());
  return `${body}.${sig}`;
}
function verifyToken<T>(token: string, secret: string): T | null {
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = b64url(crypto.createHmac('sha256', secret).update(body).digest());
  if (expected.length !== sig.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
  try {
    const obj = JSON.parse(b64urlDecode(body).toString('utf8'));
    if (typeof obj.exp === 'number' && obj.exp * 1000 < Date.now()) return null;
    return obj as T;
  } catch {
    return null;
  }
}

describe('orgs invite token (HMAC)', () => {
  const secret = 'test-secret-1234567890';

  it('round-trips a valid payload', () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const token = signToken({ orgId: 'a', email: 'x@y.z', role: 'MEMBER', kind: 'org-invite', exp }, secret);
    const out = verifyToken<{ orgId: string; role: string }>(token, secret);
    expect(out).not.toBeNull();
    expect(out!.orgId).toBe('a');
    expect(out!.role).toBe('MEMBER');
  });

  it('rejects tampered body', () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const token = signToken({ orgId: 'a', kind: 'org-invite', exp }, secret);
    const [, sig] = token.split('.');
    const tampered = `${b64url(Buffer.from(JSON.stringify({ orgId: 'evil', kind: 'org-invite', exp })))}.${sig}`;
    expect(verifyToken(tampered, secret)).toBeNull();
  });

  it('rejects wrong secret', () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const token = signToken({ orgId: 'a', kind: 'org-invite', exp }, secret);
    expect(verifyToken(token, 'other-secret')).toBeNull();
  });

  it('rejects expired tokens', () => {
    const expired = Math.floor(Date.now() / 1000) - 60;
    const token = signToken({ orgId: 'a', kind: 'org-invite', exp: expired }, secret);
    expect(verifyToken(token, secret)).toBeNull();
  });

  it('rejects malformed tokens', () => {
    expect(verifyToken('not-a-token', secret)).toBeNull();
    expect(verifyToken('only-one-part', secret)).toBeNull();
  });
});
