import { describe, it, expect, vi, beforeEach } from 'vitest';

const { inspectSupabaseJwt, inspectSupabaseAsymmetricJwt } = vi.hoisted(() => ({
  inspectSupabaseJwt: vi.fn(),
  inspectSupabaseAsymmetricJwt: vi.fn(),
}));
vi.mock('./supabase-jwt.js', () => ({ inspectSupabaseJwt, inspectSupabaseAsymmetricJwt }));

import { tryFastRefresh, FAST_PATH_MIN_REMAINING_SECONDS } from './refresh-fast-path.js';

const NOW = 1_800_000_000_000;
const ok = (expOffsetSeconds: number) => ({
  ok: true as const,
  token: { id: 'u-1', email: null, phone: null, expSeconds: Math.floor(NOW / 1000) + expOffsetSeconds },
});

beforeEach(() => {
  vi.clearAllMocks();
  inspectSupabaseJwt.mockReturnValue({ ok: false, reason: 'no_secret' });
  inspectSupabaseAsymmetricJwt.mockResolvedValue({ ok: false, reason: 'unverified' });
});

describe('tryFastRefresh', () => {
  it('returns null with no cookie', async () => {
    expect(await tryFastRefresh(undefined, NOW)).toBeNull();
  });

  it('hands back the same token while it has plenty of life left', async () => {
    inspectSupabaseAsymmetricJwt.mockResolvedValue(ok(3000));
    const r = await tryFastRefresh('tok', NOW);
    expect(r).toMatchObject({ accessToken: 'tok', userId: 'u-1', expiresIn: 3000 });
  });

  it('takes the full path when the token is near expiry', async () => {
    inspectSupabaseAsymmetricJwt.mockResolvedValue(ok(FAST_PATH_MIN_REMAINING_SECONDS - 1));
    expect(await tryFastRefresh('tok', NOW)).toBeNull();
  });

  it('takes the full path when the token does not verify', async () => {
    expect(await tryFastRefresh('forged', NOW)).toBeNull();
  });

  it('takes the full path when the token is revoked, or the revocation check fails', async () => {
    inspectSupabaseJwt.mockReturnValue(ok(3000));
    expect(await tryFastRefresh('tok', NOW, async () => true)).toBeNull();
    expect(await tryFastRefresh('tok', NOW, async () => { throw new Error('db'); })).toBeNull();
    expect(await tryFastRefresh('tok', NOW, async () => false)).not.toBeNull();
  });
});
