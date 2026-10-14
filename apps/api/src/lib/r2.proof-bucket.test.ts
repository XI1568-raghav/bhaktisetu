import { describe, it, expect, vi, beforeEach } from 'vitest';

const send = vi.hoisted(() => ({ buckets: [] as string[] }));

vi.mock('./supabase.js', () => ({ supabaseAdmin: {}, isDemoMode: false }));
vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn(async (_c: unknown, cmd: { input: { Bucket: string } }) => {
    send.buckets.push(cmd.input.Bucket);
    return `https://r2.test/${cmd.input.Bucket}`;
  }),
}));

async function load(env: Record<string, string | undefined>) {
  vi.resetModules();
  send.buckets = [];
  for (const k of ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET', 'R2_PRIVATE_BUCKET', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']) {
    if (env[k] === undefined) delete process.env[k];
    else process.env[k] = env[k];
  }
  return import('./r2.js');
}
const R2 = { R2_ACCOUNT_ID: 'a', R2_ACCESS_KEY_ID: 'k', R2_SECRET_ACCESS_KEY: 's', R2_BUCKET: 'public-media' };

beforeEach(() => vi.restoreAllMocks());

describe('presignProofUpload bucket safety', () => {
  it('refuses on R2 without R2_PRIVATE_BUCKET, logs once, never signs the public bucket', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const m = await load(R2);
    await expect(m.presignProofUpload({ key: 'k1', contentType: 'video/mp4' })).rejects.toMatchObject({ code: 'PROOF_BUCKET_UNCONFIGURED' });
    await expect(m.presignProofUpload({ key: 'k2', contentType: 'video/mp4' })).rejects.toMatchObject({ code: 'PROOF_BUCKET_UNCONFIGURED' });
    expect(send.buckets).toEqual([]);
    expect(err).toHaveBeenCalledTimes(1);
  });
  it('treats a blank R2_PRIVATE_BUCKET as unset', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const m = await load({ ...R2, R2_PRIVATE_BUCKET: '  ' });
    await expect(m.presignProofUpload({ key: 'k', contentType: 'video/mp4' })).rejects.toBeTruthy();
  });
  it('signs the private bucket when configured', async () => {
    const m = await load({ ...R2, R2_PRIVATE_BUCKET: 'private-proofs' });
    const r = await m.presignProofUpload({ key: 'k', contentType: 'video/mp4' });
    expect(r).toEqual({ uploadUrl: 'https://r2.test/private-proofs', backend: 'r2' });
  });
  it('still reads existing proofs via the media bucket when private is unset (signed GET)', async () => {
    const m = await load(R2);
    expect(await m.signProofRead('old-key')).toBe('https://r2.test/public-media');
  });
  it('Supabase-storage mode is unaffected', async () => {
    const m = await load({ SUPABASE_URL: 'https://p.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'x' });
    // no R2 -> falls to the supabase path (stub client throws inside try => null), never the R2 refusal
    await expect(m.presignProofUpload({ key: 'k', contentType: 'video/mp4' })).resolves.toBeNull();
  });
});
