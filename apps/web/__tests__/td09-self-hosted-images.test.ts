import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { SELF_HOSTED_COMMONS, SELF_HOSTED_UNSPLASH } from '../lib/self-hosted-images.data';
import { selfHostedFor, selfHostedPath, relativizeOwnImage } from '../lib/self-hosted-images';
import { remoteImage } from '../lib/images';

const WEB = path.resolve(__dirname, '..');
const PUBLIC = path.join(WEB, 'public');

function sizeOf(dir: string): number {
  let n = 0;
  for (const e of readdirSync(dir)) {
    const p = path.join(dir, e);
    n += statSync(p).isDirectory() ? sizeOf(p) : statSync(p).size;
  }
  return n;
}

describe('TD-09 — self-hosted catalogue photography', () => {
  const entries = [...Object.values(SELF_HOSTED_COMMONS), ...Object.values(SELF_HOSTED_UNSPLASH)];

  it('the table is real and every file it names (and every variant) exists on disk', () => {
    expect(entries.length).toBeGreaterThan(50);
    for (const e of entries) {
      expect(existsSync(path.join(PUBLIC, e.path)), e.path).toBe(true);
      for (const v of e.variants ?? []) expect(existsSync(path.join(PUBLIC, v.path)), v.path).toBe(true);
    }
  });

  it('every file is under /images and is WebP (RIFF....WEBP)', () => {
    for (const e of entries) {
      expect(e.path).toMatch(/^\/images\/(temples|store|gaushala)\/[a-z0-9_-]+\.webp$/);
      const head = readFileSync(path.join(PUBLIC, e.path)).subarray(0, 12);
      expect(head.toString('latin1', 0, 4)).toBe('RIFF');
      expect(head.toString('latin1', 8, 12)).toBe('WEBP');
    }
  });

  it('the added weight stays inside the budget (~6 MB)', () => {
    const bytes = ['temples', 'store', 'gaushala'].reduce(
      (n, d) => n + sizeOf(path.join(PUBLIC, 'images', d)),
      0,
    );
    expect(bytes).toBeLessThan(6.5 * 1024 * 1024);
    expect(bytes).toBeGreaterThan(1024 * 1024);
  });

  it('the API carries an identical copy of the table', () => {
    const api = readFileSync(path.resolve(WEB, '../api/src/lib/self-hosted-images.data.ts'), 'utf8');
    const web = readFileSync(path.join(WEB, 'lib/self-hosted-images.data.ts'), 'utf8');
    expect(api).toBe(web);
  });

  it('ATTRIBUTION.md records source, author and licence for every hosted master file', () => {
    const md = readFileSync(path.join(PUBLIC, 'images/ATTRIBUTION.md'), 'utf8');
    for (const e of entries) {
      const rel = e.path.replace(/^\/images\//, '');
      expect(md, rel).toContain(`| ${rel} |`);
    }
    expect(md).toMatch(/commons\.wikimedia\.org\/wiki\/File:/);
    expect(md).toMatch(/CC BY/);
  });

  it('selfHostedFor picks the smallest covering variant, then the full file', () => {
    const url = 'https://upload.wikimedia.org/wikipedia/commons/f/ff/Kashi_Vishwanath.jpg';
    const e = SELF_HOSTED_COMMONS['Kashi_Vishwanath.jpg']!;
    expect(selfHostedFor(url, 120)?.width).toBe(e.variants?.[0]?.width ?? e.width);
    expect(selfHostedFor(url, 4000)?.url).toBe(e.path);
    expect(selfHostedFor('https://abc.supabase.co/x.jpg', 500)).toBeUndefined();
  });

  it('own-origin absolute URLs (what the API returns) resolve to the same local file', () => {
    expect(relativizeOwnImage('https://darshya.online/images/temples/kashi-vishwanath.webp')).toBe(
      '/images/temples/kashi-vishwanath.webp',
    );
    expect(remoteImage('https://www.darshya.online/images/temples/kashi-vishwanath.webp', 4000)).toBe(
      '/images/temples/kashi-vishwanath.webp',
    );
  });

  it('an un-hosted photo keeps its remote URL (never an uncleared local copy)', () => {
    const other = 'https://upload.wikimedia.org/wikipedia/commons/9/9c/Example_Unhosted_Photo.jpg';
    expect(selfHostedPath(other)).toBeUndefined();
    expect(remoteImage(other, 500)).toContain('upload.wikimedia.org');
  });
});
