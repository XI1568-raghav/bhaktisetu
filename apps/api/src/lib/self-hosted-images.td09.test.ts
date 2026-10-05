import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { localizeImages, localizeImageUrl, selfHostedUrl } from './self-hosted-images.js';
import { SELF_HOSTED_COMMONS, SELF_HOSTED_UNSPLASH } from './self-hosted-images.data.js';

const KASHI = 'https://upload.wikimedia.org/wikipedia/commons/f/ff/Kashi_Vishwanath.jpg';

describe('TD-09 self-hosted image mapping (API)', () => {
  it('maps a Commons original and any thumb of the same file to the absolute local URL', () => {
    expect(localizeImageUrl(KASHI)).toBe('https://darshya.online/images/temples/kashi-vishwanath.webp');
    expect(
      localizeImageUrl(
        'https://upload.wikimedia.org/wikipedia/commons/thumb/f/ff/Kashi_Vishwanath.jpg/500px-Kashi_Vishwanath.jpg',
      ),
    ).toBe('https://darshya.online/images/temples/kashi-vishwanath.webp');
  });

  it('decodes percent-encoded Commons names before the lookup', () => {
    const u =
      'https://upload.wikimedia.org/wikipedia/commons/e/e9/Swaminarayan_Akshardham%2C_Delhi.jpg';
    expect(selfHostedUrl(u)).toMatch(/^https:\/\/darshya\.online\/images\/temples\/akshardham/);
  });

  it('maps hosted Unsplash photos and replaces the two dead ones', () => {
    expect(
      localizeImageUrl('https://images.unsplash.com/photo-1541795083-1b160cf4f3d7?w=600&h=600&fit=crop'),
    ).toBe('https://darshya.online/images/store/prod_003.webp');
    expect(
      localizeImageUrl('https://images.unsplash.com/photo-1527153907836-a9a0438ff035?w=800&q=80'),
    ).toBe('https://darshya.online/images/gaushala/cow-field.webp');
  });

  it('leaves unmapped and non-photo strings untouched', () => {
    const other = 'https://upload.wikimedia.org/wikipedia/commons/9/9c/Example_Unhosted_Photo.jpg';
    expect(localizeImageUrl(other)).toBe(other);
    expect(localizeImageUrl('hello')).toBe('hello');
    expect(localizeImageUrl('https://abc.supabase.co/storage/x.jpg')).toBe('https://abc.supabase.co/storage/x.jpg');
  });

  it('deep-maps a temple payload without mutating the input and keeps untouched references', () => {
    const input = { temples: [{ id: 1, images: [KASHI, 'https://x.test/a.jpg'], name: 'K', when: new Date(0) }] };
    const out = localizeImages(input);
    expect(out.temples[0]!.images[0]).toContain('/images/temples/kashi-vishwanath.webp');
    expect(out.temples[0]!.images[1]).toBe('https://x.test/a.jpg');
    expect(out.temples[0]!.when).toBe(input.temples[0]!.when);
    expect(input.temples[0]!.images[0]).toBe(KASHI);
    const clean = { a: ['x'], b: { c: 1 } };
    expect(localizeImages(clean)).toBe(clean);
  });

  it('every mapped file exists under apps/web/public (so no URL we emit can 404)', () => {
    const pub = path.resolve(__dirname, '../../../web/public');
    const all = [...Object.values(SELF_HOSTED_COMMONS), ...Object.values(SELF_HOSTED_UNSPLASH)];
    expect(all.length).toBeGreaterThan(50);
    for (const e of all) {
      expect(existsSync(path.join(pub, e.path)), e.path).toBe(true);
      for (const v of e.variants ?? []) expect(existsSync(path.join(pub, v.path)), v.path).toBe(true);
    }
    expect(existsSync(path.join(pub, 'images/gaushala/cow-field.webp'))).toBe(true);
    expect(existsSync(path.join(pub, 'images/gaushala/gir-cow.webp'))).toBe(true);
  });

  it('the preSerialization hook rewrites a real response body end to end', async () => {
    const app = Fastify();
    app.addHook('preSerialization', async (_r, _p, payload) => localizeImages(payload));
    app.get('/t', async () => ({ temples: [{ images: [KASHI] }] }));
    const res = await app.inject({ url: '/t' });
    expect(res.json().temples[0].images[0]).toBe('https://darshya.online/images/temples/kashi-vishwanath.webp');
    await app.close();
  });
});
