import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import {
  IMAGES,
  remoteImage,
  remoteSrcSet,
  getImage,
  getTempleHero,
  getTempleThumbnail,
  getTempleGallery,
  getDeityImage,
  getPujaImage,
  getProductImage,
  getGaushalaImage,
  getHeroImage,
  getFestivalImage,
  getContentImage,
} from '../lib/images';

const WEB_ROOT = path.resolve(__dirname, '..');

/**
 * A bare Wikimedia Commons ORIGINAL — `/commons/<x>/<xy>/<File>` with no
 * `/thumb/` segment. These are the 3-15 MB files that must never reach a
 * browser. Anything matching this is a perf regression.
 */
const COMMONS_ORIGINAL = /upload\.wikimedia\.org\/wikipedia\/commons\/(?!thumb\/)[0-9a-f]\/[0-9a-f]{2}\//;

function isCommonsOriginal(url: string): boolean {
  return COMMONS_ORIGINAL.test(url);
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next' || entry === '__tests__') continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

// ────────────────────────────────────────────────────────────
// remoteImage / remoteSrcSet — the single funnel every remote URL passes
// ────────────────────────────────────────────────────────────

describe('remoteImage', () => {
  it('converts a Commons original to a sized thumbnail', () => {
    const url = 'https://upload.wikimedia.org/wikipedia/commons/9/9c/Rudraksha_mala.jpg';
    const out = remoteImage(url, 500);
    expect(out).toBe(
      'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Rudraksha_mala.jpg/500px-Rudraksha_mala.jpg',
    );
    expect(isCommonsOriginal(out)).toBe(false);
  });

  it('re-sizes an existing Commons thumb down to the requested width', () => {
    const url =
      'https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Kedarnath_Temple_in_Rainy_season.jpg/1920px-Kedarnath_Temple_in_Rainy_season.jpg';
    expect(remoteImage(url, 500)).toContain('/500px-');
  });

  it('rewrites Unsplash w/h to the requested width, preserving aspect ratio', () => {
    const url = 'https://images.unsplash.com/photo-123?w=1600&h=800&fit=crop&auto=format&q=85';
    const out = remoteImage(url, 400);
    expect(out).toContain('w=400');
    expect(out).toContain('h=200');
  });

  it('leaves hosts it cannot resize untouched', () => {
    const url = 'https://abc.supabase.co/storage/v1/object/public/x.jpg';
    expect(remoteImage(url, 400)).toBe(url);
  });

  it('is a no-op on empty input', () => {
    expect(remoteImage('', 400)).toBe('');
  });
});

describe('remoteSrcSet', () => {
  it('emits one candidate per width with w descriptors for Commons', () => {
    const url = 'https://upload.wikimedia.org/wikipedia/commons/9/9c/Rudraksha_mala.jpg';
    const out = remoteSrcSet(url, [250, 500]);
    expect(out).toContain('250px-Rudraksha_mala.jpg 250w');
    expect(out).toContain('500px-Rudraksha_mala.jpg 500w');
  });

  it('returns undefined for hosts that cannot be resized', () => {
    expect(remoteSrcSet('https://abc.supabase.co/x.jpg', [250, 500])).toBeUndefined();
  });

  it('de-duplicates widths that snap to the same Commons ladder step', () => {
    const url = 'https://upload.wikimedia.org/wikipedia/commons/9/9c/Rudraksha_mala.jpg';
    // 260 and 300 both snap up to 330 — only one candidate should survive.
    const out = remoteSrcSet(url, [260, 300]);
    expect(out?.split(',').length).toBe(1);
  });
});

// ────────────────────────────────────────────────────────────
// No getter may leak a full-resolution original
// ────────────────────────────────────────────────────────────

describe('no exported getter returns a Commons original', () => {
  it('getProductImage — the /store 29 MB offender', () => {
    // Rudraksha_mala.jpg is 5,594 KB at source.
    const url = getProductImage('rudraksha-mala');
    expect(isCommonsOriginal(url)).toBe(false);
  });

  it('every store product', () => {
    const leaks = Object.keys(IMAGES.store)
      .map((k) => [k, getProductImage(k)] as const)
      .filter(([, u]) => isCommonsOriginal(u));
    expect(leaks).toEqual([]);
  });

  it('getGaushalaImage — the /gaushala 16 MB offender', () => {
    const leaks = Object.keys(IMAGES.gaushala)
      .map((k) => [k, getGaushalaImage(k)] as const)
      .filter(([, u]) => isCommonsOriginal(u));
    expect(leaks).toEqual([]);
  });

  it('getTempleGallery', () => {
    const leaks = Object.keys(IMAGES.temples).flatMap((slug) =>
      getTempleGallery(slug).filter(isCommonsOriginal),
    );
    expect(leaks).toEqual([]);
  });

  it('getImage generic accessor', () => {
    const leaks: string[] = [];
    for (const [category, group] of Object.entries(IMAGES)) {
      for (const key of Object.keys(group as Record<string, unknown>)) {
        const url = getImage(category, key);
        if (isCommonsOriginal(url)) leaks.push(`${category}.${key}`);
      }
    }
    expect(leaks).toEqual([]);
  });

  it('every remaining getter across every key', () => {
    const leaks: string[] = [];
    const check = (label: string, url: string) => {
      if (isCommonsOriginal(url)) leaks.push(label);
    };
    for (const s of Object.keys(IMAGES.temples)) {
      check(`hero:${s}`, getTempleHero(s));
      check(`thumb:${s}`, getTempleThumbnail(s));
    }
    for (const s of Object.keys(IMAGES.deities)) {
      check(`deity:${s}`, getDeityImage(s));
      check(`deity-sq:${s}`, getDeityImage(s, 'square'));
    }
    for (const s of Object.keys(IMAGES.pujas)) check(`puja:${s}`, getPujaImage(s));
    for (const s of Object.keys(IMAGES.hero)) check(`hero:${s}`, getHeroImage(s));
    for (const s of Object.keys(IMAGES.festivals)) check(`fest:${s}`, getFestivalImage(s));
    for (const s of ['aarti', 'chalisa', 'mantra', 'bhajan', 'stotram']) {
      check(`content:${s}`, getContentImage(s));
      check(`content-thumb:${s}`, getContentImage(s, 'thumbnail'));
    }
    check('unknown-slug', getTempleHero('does-not-exist'));
    check('unknown-product', getProductImage('does-not-exist'));
    expect(leaks).toEqual([]);
  });
});

// ────────────────────────────────────────────────────────────
// Card-path getters must not request desktop-hero widths
// ────────────────────────────────────────────────────────────

describe('requested widths match the slot the image is painted into', () => {
  const widthOf = (url: string): number => Number(/\/(\d+)px-/.exec(url)?.[1] ?? 0);

  it('getProductImage defaults to a card-sized thumb, not a 1920 hero', () => {
    expect(widthOf(getProductImage('rudraksha-mala'))).toBeLessThanOrEqual(500);
  });

  it('getTempleThumbnail defaults to a card-sized thumb', () => {
    expect(widthOf(getTempleThumbnail('kedarnath'))).toBeLessThanOrEqual(500);
  });

  it('getGaushalaImage defaults to a card-sized thumb', () => {
    expect(widthOf(getGaushalaImage('gir-cow'))).toBeLessThanOrEqual(500);
  });

  it('getTempleHero honours an explicit card width', () => {
    expect(widthOf(getTempleHero('kedarnath', 400))).toBeLessThanOrEqual(500);
  });

  it('getDeityImage honours an explicit card width', () => {
    expect(widthOf(getDeityImage('lord-shiva', 'square', 250))).toBeLessThanOrEqual(250);
  });
});

// ────────────────────────────────────────────────────────────
// Source-level guards — no bypass routes may reappear
// ────────────────────────────────────────────────────────────

describe('source guards', () => {
  const sources = [
    ...walk(path.join(WEB_ROOT, 'app')),
    ...walk(path.join(WEB_ROOT, 'components')),
    ...walk(path.join(WEB_ROOT, 'lib')).filter((f) => !f.endsWith(`${path.sep}images.ts`)),
  ];

  it('no file outside lib/images.ts hard-codes a Commons original URL', () => {
    const offenders = sources.filter((f) => isCommonsOriginal(readFileSync(f, 'utf8')));
    expect(offenders.map((f) => path.relative(WEB_ROOT, f))).toEqual([]);
  });

  it('API-supplied puja images are routed through the resize helper', () => {
    const src = readFileSync(path.join(WEB_ROOT, 'app', 'pujas', '(index)', 'page.tsx'), 'utf8');
    // The card <img> must not bind a raw API URL straight to src.
    expect(src).not.toMatch(/src=\{\s*puja\.imageUrl\s*\?\?/);
    expect(src).toContain('remoteImage');
  });

  it('the four heaviest pages give every <img> explicit width, height and loading', () => {
    const heavy = [
      ['app', 'store', 'page.tsx'],
      ['app', 'pujas', '(index)', 'page.tsx'],
      ['app', 'gaushala', 'page.tsx'],
      ['app', 'donations', 'page.tsx'],
    ];
    const bad: string[] = [];
    for (const parts of heavy) {
      const rel = parts.join('/');
      const src = readFileSync(path.join(WEB_ROOT, ...parts), 'utf8');
      // Split on a real opening <img tag (trailing whitespace rules out the
      // literal `<img>` that appears in prose comments) and inspect each body.
      const tags = src.split(/<img\s/).slice(1);
      tags.forEach((tail, i) => {
        const body = tail.slice(0, tail.indexOf('/>') + 2);
        if (!body.includes('src=')) return;
        for (const attr of ['width=', 'height=', 'loading=']) {
          if (!body.includes(attr)) bad.push(`${rel}#img${i + 1} missing ${attr}`);
        }
      });
    }
    expect(bad).toEqual([]);
  });
});
