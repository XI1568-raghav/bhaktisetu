import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('./supabase.js', () => ({ supabaseAdmin: {}, isDemoMode: false }));

process.env.SUPABASE_URL = 'https://proj.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service';
delete process.env.R2_ACCOUNT_ID;

const { inspectOwnVideoUrl, r2 } = await import('./r2.js');
const OWN = `${r2.publicBaseUrl}/booking-proofs/b1/1-a.mp4`;

function head(status: number, headers: Record<string, string>) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status, headers }));
}
afterEach(() => vi.restoreAllMocks());

describe('inspectOwnVideoUrl — a signed upload URL accepts any bytes, so the proof is checked when attached', () => {
  it('accepts a real video in our own storage', async () => {
    head(200, { 'content-length': '5000', 'content-type': 'video/mp4' });
    await expect(inspectOwnVideoUrl(OWN)).resolves.toEqual({ ok: true });
  });
  it('refuses a zero-byte object', async () => {
    head(200, { 'content-length': '0', 'content-type': 'video/mp4' });
    await expect(inspectOwnVideoUrl(OWN)).resolves.toEqual({ ok: false, reason: 'empty' });
  });
  it('refuses an HTML page uploaded under a video key', async () => {
    head(200, { 'content-length': '5000', 'content-type': 'text/html' });
    await expect(inspectOwnVideoUrl(OWN)).resolves.toEqual({ ok: false, reason: 'not_video' });
  });
  it('refuses a key that was never uploaded', async () => {
    head(400, {});
    await expect(inspectOwnVideoUrl(OWN)).resolves.toEqual({ ok: false, reason: 'missing' });
  });
  it('reports storage trouble as unreachable, not as a bad file', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('fetch failed'));
    await expect(inspectOwnVideoUrl(OWN)).resolves.toEqual({ ok: false, reason: 'unreachable' });
  });
  it('does not inspect links that are not ours (Drive, YouTube)', async () => {
    const f = head(200, {});
    await expect(inspectOwnVideoUrl('https://drive.google.com/file/d/x/view')).resolves.toEqual({ ok: true });
    expect(f).not.toHaveBeenCalled();
  });
});
