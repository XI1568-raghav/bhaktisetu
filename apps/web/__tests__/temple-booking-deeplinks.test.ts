import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * DF-04 (prod sweep 2026-08-12) — every "Book Now" on a temple page threw away
 * both the puja and the temple.
 *
 * Kashi Vishwanath lists bookable pujas at ₹1,100 / ₹1,500 / ₹2,100 behind six
 * CTAs, and all six pointed at `/pujas?temple=kashi-vishwanath`. That URL
 * renders the whole unfiltered ten-item catalogue — the param has no reader.
 * Meanwhile the working pattern already existed:
 * `/pujas/<pujaSlug>/book?temple=<apiTempleSlug>` 307s into the wizard with the
 * temple preselected (app/pujas/[slug]/book/page.tsx).
 *
 * The rule this locks: no temple surface may emit `/pujas?temple=`. A booking
 * CTA either deep-links a puja that the API says this temple offers, or falls
 * back to the temple-scoped listing — never to an unfiltered catalogue that
 * silently drops the intent.
 */

const WEB = path.resolve(__dirname, '..');
const raw = (rel: string) => fs.readFileSync(path.join(WEB, rel), 'utf8');

/** Comments stripped, so a file documenting the banned URL cannot trip its own guard. */
const src = (rel: string) =>
  raw(rel)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

const OFFERINGS = [
  { isActive: true, pujaType: { slug: 'rudrabhishek', name: 'Rudrabhishek' } },
  { isActive: true, pujaType: { slug: 'ganesh-puja', name: 'Ganesh Puja' } },
  { isActive: false, pujaType: { slug: 'lakshmi-puja', name: 'Lakshmi Puja' } },
];

describe('matchTempleOffering', () => {
  it('matches a curated card name onto the API offering', async () => {
    const { matchTempleOffering } = await import('../lib/temple-booking');
    expect(matchTempleOffering('Rudrabhishek', OFFERINGS)?.pujaType.slug).toBe('rudrabhishek');
    expect(matchTempleOffering('  ganesh   puja ', OFFERINGS)?.pujaType.slug).toBe('ganesh-puja');
  });

  it('never matches an inactive offering', async () => {
    const { matchTempleOffering } = await import('../lib/temple-booking');
    expect(matchTempleOffering('Lakshmi Puja', OFFERINGS)).toBeNull();
  });

  it('does not guess — a curated-only ritual matches nothing', async () => {
    const { matchTempleOffering } = await import('../lib/temple-booking');
    expect(matchTempleOffering('Mangala Aarti Darshan (VIP)', OFFERINGS)).toBeNull();
    expect(matchTempleOffering('Sugam Darshan Pass', OFFERINGS)).toBeNull();
  });
});

describe('templeBookHref', () => {
  it('deep-links the puja and the temple when both are known', async () => {
    const { templeBookHref, matchTempleOffering } = await import('../lib/temple-booking');
    expect(
      templeBookHref(
        'kashi-vishwanath',
        'kashi-vishwanath-varanasi',
        matchTempleOffering('Rudrabhishek', OFFERINGS),
      ),
    ).toBe('/pujas/rudrabhishek/book?temple=kashi-vishwanath-varanasi');
  });

  it('falls back to the temple-scoped listing, not the global catalogue', async () => {
    const { templeBookHref } = await import('../lib/temple-booking');
    expect(templeBookHref('kashi-vishwanath', 'kashi-vishwanath-varanasi', null)).toBe(
      '/temples/kashi-vishwanath/pujas',
    );
  });

  it('falls back to /pujas only when the API does not know the temple', async () => {
    const { templeBookHref } = await import('../lib/temple-booking');
    expect(templeBookHref('some-temple', null, null)).toBe('/pujas');
  });

  it('never emits the ignored ?temple= query form', async () => {
    const { templeBookHref, matchTempleOffering } = await import('../lib/temple-booking');
    const hrefs = [
      templeBookHref('t', 't-city', matchTempleOffering('Rudrabhishek', OFFERINGS)),
      templeBookHref('t', 't-city', null),
      templeBookHref('t', null, null),
    ];
    for (const href of hrefs) expect(href).not.toMatch(/^\/pujas\?temple=/);
  });
});

describe('the temple detail page emits no dead booking links', () => {
  it('contains no /pujas?temple= href', () => {
    expect(src('app/temples/[slug]/page.tsx')).not.toMatch(/\/pujas\?temple=/);
  });

  it('routes its CTAs through the helper', () => {
    const page = src('app/temples/[slug]/page.tsx');
    expect(page).toMatch(/templeBookHref/);
    expect(page).toMatch(/matchTempleOffering/);
  });

  it('no other surface still links /pujas?temple=', () => {
    const roots = ['app', 'components'];
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(path.join(WEB, dir), { withFileTypes: true })) {
        const rel = `${dir}/${entry.name}`;
        if (entry.isDirectory()) walk(rel);
        else if (/\.tsx?$/.test(entry.name) && src(rel).includes('/pujas?temple=')) {
          offenders.push(rel);
        }
      }
    };
    roots.forEach(walk);
    expect(offenders).toEqual([]);
  });
});

describe('the temple-scoped listing resolves the same temples as the detail page', () => {
  it('uses the shared API resolver rather than its own short-slug table', () => {
    const listing = src('app/temples/[slug]/pujas/page.tsx');
    expect(listing).toMatch(/resolveApiTemple/);
    expect(listing).not.toMatch(/const SHORT_TO_API_SLUG/);
  });
});
