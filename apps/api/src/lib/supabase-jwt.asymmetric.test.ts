import crypto from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { inspectSupabaseAsymmetricJwt, resetSupabaseJwksCache } from './supabase-jwt.js';

const BASE = 'https://proj.supabase.co';
const b64 = (b: Buffer | string) => Buffer.from(b).toString('base64url');

const pair = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
const otherPair = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
const jwk = { ...pair.publicKey.export({ format: 'jwk' }), kid: 'key-1', alg: 'ES256', use: 'sig' };

function sign(
  payload: Record<string, unknown>,
  opts: { kid?: string; alg?: string; key?: crypto.KeyObject; header?: Record<string, unknown> } = {},
): string {
  const header = { alg: opts.alg ?? 'ES256', typ: 'JWT', kid: opts.kid ?? 'key-1', ...(opts.header ?? {}) };
  const data = `${b64(JSON.stringify(header))}.${b64(JSON.stringify(payload))}`;
  const sig = crypto.sign('sha256', Buffer.from(data), { key: opts.key ?? pair.privateKey, dsaEncoding: 'ieee-p1363' });
  return `${data}.${b64(sig)}`;
}

const NOW = 1_800_000_000_000;
const good = () => ({
  sub: '11111111-1111-4111-8111-111111111111',
  email: 'a@example.com',
  aud: 'authenticated',
  iss: `${BASE}/auth/v1`,
  exp: Math.floor(NOW / 1000) + 3600,
});

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  process.env.SUPABASE_URL = BASE;
  resetSupabaseJwksCache();
  fetchMock = vi.fn(async () => new Response(JSON.stringify({ keys: [jwk] }), { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe('inspectSupabaseAsymmetricJwt (ES256 project keys)', () => {
  it('accepts a token signed by the published key and returns the identity', async () => {
    const r = await inspectSupabaseAsymmetricJwt(sign(good()), NOW);
    expect(r).toMatchObject({ ok: true, token: { id: good().sub, email: 'a@example.com' } });
  });

  it('caches the key set: a second token does not fetch again', async () => {
    await inspectSupabaseAsymmetricJwt(sign(good()), NOW);
    await inspectSupabaseAsymmetricJwt(sign(good()), NOW + 1000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('reports expired only after the signature verified', async () => {
    const r = await inspectSupabaseAsymmetricJwt(sign({ ...good(), exp: Math.floor(NOW / 1000) - 5 }), NOW);
    expect(r).toEqual({ ok: false, reason: 'expired' });
    const forged = await inspectSupabaseAsymmetricJwt(sign({ ...good(), exp: Math.floor(NOW / 1000) - 5 }, { key: otherPair.privateKey }), NOW);
    expect(forged).toEqual({ ok: false, reason: 'unverified' });
  });

  it('refuses a token signed by a different key', async () => {
    expect(await inspectSupabaseAsymmetricJwt(sign(good(), { key: otherPair.privateKey }), NOW)).toEqual({ ok: false, reason: 'unverified' });
  });

  it('refuses a tampered payload', async () => {
    const [h, , s] = sign(good()).split('.') as [string, string, string];
    const evil = b64(JSON.stringify({ ...good(), sub: '22222222-2222-4222-8222-222222222222' }));
    expect(await inspectSupabaseAsymmetricJwt(`${h}.${evil}.${s}`, NOW)).toEqual({ ok: false, reason: 'unverified' });
  });

  it('refuses alg none, HS256 confusion and an unknown kid', async () => {
    const none = `${b64(JSON.stringify({ alg: 'none', kid: 'key-1' }))}.${b64(JSON.stringify(good()))}.`;
    expect(await inspectSupabaseAsymmetricJwt(none, NOW)).toMatchObject({ ok: false });
    const mac = crypto.createHmac('sha256', JSON.stringify(jwk)).update('x').digest();
    const hs = `${b64(JSON.stringify({ alg: 'HS256', kid: 'key-1' }))}.${b64(JSON.stringify(good()))}.${b64(mac)}`;
    expect(await inspectSupabaseAsymmetricJwt(hs, NOW)).toMatchObject({ ok: false });
    expect(await inspectSupabaseAsymmetricJwt(sign(good(), { kid: 'nope' }), NOW)).toMatchObject({ ok: false });
  });

  it('refuses the wrong audience and the wrong issuer', async () => {
    expect(await inspectSupabaseAsymmetricJwt(sign({ ...good(), aud: 'anon' }), NOW)).toMatchObject({ ok: false });
    expect(await inspectSupabaseAsymmetricJwt(sign({ ...good(), iss: 'https://evil.example/auth/v1' }), NOW)).toMatchObject({ ok: false });
  });

  it('refuses a missing sub, malformed input and an empty string', async () => {
    const { sub: _omit, ...noSub } = good();
    expect(await inspectSupabaseAsymmetricJwt(sign(noSub), NOW)).toMatchObject({ ok: false });
    expect(await inspectSupabaseAsymmetricJwt('not.a.jwt', NOW)).toMatchObject({ ok: false });
    expect(await inspectSupabaseAsymmetricJwt('', NOW)).toEqual({ ok: false, reason: 'malformed' });
  });

  it('never throws and fails closed when the key set cannot be loaded', async () => {
    resetSupabaseJwksCache();
    fetchMock.mockRejectedValue(new Error('network down'));
    expect(await inspectSupabaseAsymmetricJwt(sign(good()), NOW)).toEqual({ ok: false, reason: 'unverified' });
  });

  it('picks up a rotated key by refetching once after the cool-down', async () => {
    const fresh = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
    const jwk2 = { ...fresh.publicKey.export({ format: 'jwk' }), kid: 'key-2', alg: 'ES256' };
    await inspectSupabaseAsymmetricJwt(sign(good()), NOW);
    fetchMock.mockImplementation(async () => new Response(JSON.stringify({ keys: [jwk, jwk2] }), { status: 200 }));
    const r = await inspectSupabaseAsymmetricJwt(sign(good(), { kid: 'key-2', key: fresh.privateKey }), NOW + 120_000);
    expect(r.ok).toBe(true);
  });
});
