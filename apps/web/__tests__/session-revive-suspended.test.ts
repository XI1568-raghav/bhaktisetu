import { describe, it, expect, afterEach, vi } from 'vitest';
import { reviveSessionFromCookieResult } from '../lib/session-revive';

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
  vi.restoreAllMocks();
});

function reply(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('cookie revive surfaces a suspended account', () => {
  it('returns the 403 body from /auth/refresh without trying the email door', async () => {
    const f = vi.fn(async () => reply(403, { error: 'Forbidden', message: 'Account suspended: fraud' }));
    globalThis.fetch = f as unknown as typeof fetch;
    const out = await reviveSessionFromCookieResult();
    expect(out.session).toBeNull();
    expect(out.suspendedBody).toMatchObject({ message: 'Account suspended: fraud' });
    expect(f).toHaveBeenCalledTimes(1);
  });
  it('returns it from the email-session door too', async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce(reply(400, { error: 'Validation Error' }))
      .mockResolvedValueOnce(reply(403, { error: 'Forbidden', message: 'This account has been suspended.' }));
    globalThis.fetch = f as unknown as typeof fetch;
    const out = await reviveSessionFromCookieResult();
    expect(out.suspendedBody).toBeDefined();
  });
  it('a plain 401 stays a quiet sign-out', async () => {
    globalThis.fetch = vi.fn(async () => reply(401, { error: 'Unauthorized' })) as unknown as typeof fetch;
    const out = await reviveSessionFromCookieResult();
    expect(out.suspendedBody).toBeUndefined();
    expect(out.apiAnswered).toBe(true);
  });
});
