import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { reviveSessionFromCookieResult, __resetReviveCache } from '../lib/session-revive';

const session = { accessToken: 'a', refreshToken: 'r', expiresIn: 3500, expiresAt: Math.floor(Date.now() / 1000) + 3500 };
let calls = 0;

beforeEach(() => {
  __resetReviveCache();
  calls = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      calls += 1;
      return { ok: true, status: 200, json: async () => ({ success: true, session }) } as unknown as Response;
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

describe('revive reuse window', () => {
  it('shares one request between sequential callers on the same page load', async () => {
    const a = await reviveSessionFromCookieResult();
    const b = await reviveSessionFromCookieResult();
    const c = await reviveSessionFromCookieResult();
    expect([a.session?.accessToken, b.session?.accessToken, c.session?.accessToken]).toEqual(['a', 'a', 'a']);
    expect(calls).toBe(1);
  });

  it('shares one request between overlapping callers', async () => {
    await Promise.all([reviveSessionFromCookieResult(), reviveSessionFromCookieResult()]);
    expect(calls).toBe(1);
  });

  it('asks again when the caller needs a fresh session', async () => {
    await reviveSessionFromCookieResult();
    await reviveSessionFromCookieResult({ fresh: true });
    expect(calls).toBe(2);
  });

  it('does not cache a failed revive', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      calls += 1;
      return { ok: false, status: 401, json: async () => ({}) } as unknown as Response;
    }));
    await reviveSessionFromCookieResult();
    await reviveSessionFromCookieResult();
    expect(calls).toBeGreaterThanOrEqual(2);
  });
});
