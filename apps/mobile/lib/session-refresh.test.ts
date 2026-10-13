import { describe, expect, it, vi } from 'vitest';

import { refreshSession, refreshSessionOnce } from './session-refresh';

const sess = { accessToken: 'a2', refreshToken: 'r2', expiresIn: 3600, expiresAt: 1 };
const http = (statusCode: number) => Object.assign(new Error('x'), { statusCode });

describe('session refresh outcome', () => {
  it('returns the rotated session', async () => {
    const post = vi.fn().mockResolvedValue({ success: true, session: sess });
    expect(await refreshSession('r1', post)).toEqual({ kind: 'refreshed', session: sess });
    expect(post).toHaveBeenCalledWith('/api/v1/auth/refresh', { refreshToken: 'r1' }, { noAuth: true });
  });

  it.each([400, 401, 403])('treats %i as the server rejecting the session', async (code) => {
    expect(await refreshSession('r1', vi.fn().mockRejectedValue(http(code)))).toEqual({ kind: 'rejected' });
  });

  it.each([429, 500, 503, 0, 408])('does not sign out on %i', async (code) => {
    expect(await refreshSession('r1', vi.fn().mockRejectedValue(http(code)))).toEqual({ kind: 'unavailable' });
  });

  it('treats a malformed 200 as unavailable, a missing token as rejected', async () => {
    expect(await refreshSession('r1', vi.fn().mockResolvedValue({ success: true }))).toEqual({ kind: 'unavailable' });
    expect(await refreshSession(undefined, vi.fn())).toEqual({ kind: 'rejected' });
  });

  it('shares one request between concurrent callers (rotation replay guard)', async () => {
    const post = vi.fn().mockResolvedValue({ success: true, session: sess });
    const [a, b] = await Promise.all([refreshSessionOnce('r1', post), refreshSessionOnce('r1', post)]);
    expect(post).toHaveBeenCalledTimes(1);
    expect(a).toBe(b);
  });
});
