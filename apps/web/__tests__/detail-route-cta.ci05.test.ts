import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { render } from '@testing-library/react';
import {
  DETAIL_ROUTE_LANES,
  EXCLUDED_DETAIL_ROUTES,
  detailCta,
  pujaNameToSlug,
  resolveDetailCta,
} from '../lib/detail-route-cta';

/**
 * CI-05 — every encyclopedia detail route must end somewhere a devotee can act.
 *
 * The finding: 54 of 87 dynamic detail routes carried no link into any
 * transactional surface, and ~29 of those are public encyclopedia routes
 * covering roughly 560 prerendered pages. `/tirth/<slug>` — 84 pilgrimage
 * shrines — was the worst case, because it did not merely omit a CTA: it
 * printed a green pill reading "✓ Online booking available" above a list of
 * "Primary pujas performed here" rendered as inert <li> text. The page made
 * the promise in words and gave the reader nothing to click.
 *
 * This is a source-text guard, so it strips comments FIRST. A CTA described in
 * a docblock, or an old CTA commented out during a refactor, must not satisfy
 * it — that exact mistake has shipped repeatedly in this repo, including a
 * ratchet held green by a comment describing a deleted query.
 */

const APP = join(process.cwd(), 'app');

/** Remove block and line comments so only executable source is scanned. */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

/** `app/<prefix>/[param]/page.tsx` — the sole dynamic child of a route prefix. */
function detailPageFor(prefix: string): string | null {
  const dir = join(APP, ...prefix.split('/'));
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return null;
  for (const entry of readdirSync(dir)) {
    if (!entry.startsWith('[')) continue;
    const page = join(dir, entry, 'page.tsx');
    if (existsSync(page)) return page;
  }
  return null;
}

const REGISTERED = Object.keys(DETAIL_ROUTE_LANES).sort();

describe('CI-05 — registered encyclopedia routes render a booking exit', () => {
  it('the registry is not empty (a vacuous pass would hide the whole finding)', () => {
    expect(REGISTERED.length).toBeGreaterThan(20);
  });

  for (const prefix of REGISTERED) {
    describe(`/${prefix}`, () => {
      it('has a detail page', () => {
        expect(detailPageFor(prefix), `no [param]/page.tsx under app/${prefix}`).not.toBeNull();
      });

      it('renders the shared CTA in EXECUTABLE source, not in a comment', () => {
        const page = detailPageFor(prefix);
        expect(page).not.toBeNull();
        const src = stripComments(readFileSync(page as string, 'utf8'));
        expect(src, `app/${prefix}: never imports lib/detail-route-cta`).toMatch(
          /from '(?:\.\.\/)+lib\/detail-route-cta'/,
        );
        expect(src, `app/${prefix}: imports the CTA but never calls it`).toMatch(
          /\b(?:detailCta|renderDetailCta)\s*\(/,
        );
      });
    });
  }
});

describe('CI-05 — the registry describes routes that actually exist', () => {
  for (const prefix of REGISTERED) {
    it(`${prefix} is a real route, not a stale registry entry`, () => {
      expect(detailPageFor(prefix)).not.toBeNull();
    });
  }

  for (const prefix of Object.keys(EXCLUDED_DETAIL_ROUTES)) {
    it(`${prefix} is excluded with a stated reason`, () => {
      expect(EXCLUDED_DETAIL_ROUTES[prefix].length).toBeGreaterThan(20);
    });
  }

  it('no route is both registered and excluded', () => {
    const both = REGISTERED.filter((p) => p in EXCLUDED_DETAIL_ROUTES);
    expect(both, `contradictory entries: ${both.join(', ')}`).toEqual([]);
  });
});

describe('CI-05 — /tirth/[slug] does not promise booking it cannot deliver', () => {
  const page = join(APP, 'tirth', '[slug]', 'page.tsx');

  it('exists', () => {
    expect(existsSync(page)).toBe(true);
  });

  it('a page that advertises "Online booking available" also offers a booking exit', () => {
    const src = stripComments(readFileSync(page, 'utf8'));
    const advertises = /Online booking available/.test(src);
    if (!advertises) return; // badge removed is also an acceptable resolution
    expect(
      /\b(?:detailCta|renderDetailCta)\s*\(/.test(src),
      'tirth/[slug] prints "Online booking available" with nothing bookable to click',
    ).toBe(true);
  });

  it('the "primary pujas performed here" list is not the page\'s only mention of a puja', () => {
    const src = stripComments(readFileSync(page, 'utf8'));
    expect(src).toMatch(/primaryPujas/);
    expect(src, 'tirth/[slug] lists pujas but links to none').toMatch(
      /\b(?:detailCta|renderDetailCta)\s*\(/,
    );
  });
});

describe('resolveDetailCta', () => {
  it('emits deep links only for slugs the live catalogue confirms', () => {
    const cta = resolveDetailCta({
      routePrefix: 'tirth',
      subject: 'Kashi Vishwanath',
      relatedPujas: ['Rudrabhishek', 'Mahamrityunjaya Jaap'],
      catalogue: new Set(['rudrabhishek']),
    });
    expect(cta.kind).toBe('bookable');
    if (cta.kind !== 'bookable') return;
    expect(cta.pujaSlugs).toEqual(['rudrabhishek']);
  });

  it('an unreadable catalogue yields the browse exit, never an optimistic link', () => {
    const cta = resolveDetailCta({
      routePrefix: 'tirth',
      subject: 'Kashi Vishwanath',
      relatedPujas: ['Rudrabhishek'],
      catalogue: new Set<string>(),
    });
    expect(cta.kind).toBe('browse');
    if (cta.kind !== 'browse') return;
    expect(cta.actions.length).toBeGreaterThan(0);
    for (const a of cta.actions) expect(a.href.startsWith('/')).toBe(true);
  });

  it('never upgrades a qualified ritual onto the plain catalogue entry', () => {
    const cta = resolveDetailCta({
      routePrefix: 'tirth',
      subject: 'Kashi Vishwanath',
      relatedPujas: ['Rudrabhishek at Kashi Ghat'],
      catalogue: new Set(['rudrabhishek']),
    });
    expect(cta.kind).toBe('browse');
  });

  it('a page with no editorial puja list still gets an exit', () => {
    const cta = resolveDetailCta({ routePrefix: 'upanishads', subject: 'Isha Upanishad' });
    expect(cta.kind).toBe('browse');
    if (cta.kind !== 'browse') return;
    expect(cta.actions[0].href).toBe('/ask-pandit');
  });

  it('throws on an unregistered prefix rather than silently rendering nothing', () => {
    expect(() => resolveDetailCta({ routePrefix: 'not-a-route', subject: 'x' })).toThrow(
      /DETAIL_ROUTE_LANES/,
    );
  });

  it('the yatra lane sends travellers to packages, not to the puja catalogue', () => {
    const cta = resolveDetailCta({ routePrefix: 'yatra/destinations', subject: 'Char Dham' });
    expect(cta.kind).toBe('browse');
    if (cta.kind !== 'browse') return;
    expect(cta.actions[0].href).toBe('/yatra-packages');
  });
});

describe('the rendered exit is a real, clickable link', () => {
  it('the browse exit renders anchors with same-origin hrefs', () => {
    const el = detailCta({ routePrefix: 'upanishads', subject: 'Isha Upanishad' });
    const { container } = render(el);
    const anchors = [...container.querySelectorAll('a')];
    expect(anchors.length).toBeGreaterThan(0);
    expect(anchors.map((a) => a.getAttribute('href'))).toContain('/ask-pandit');
    for (const a of anchors) {
      const href = a.getAttribute('href') ?? '';
      expect(href.startsWith('/'), `non-routable href: ${href}`).toBe(true);
      expect(a.textContent?.trim().length, 'a link with no label is not clickable').toBeGreaterThan(0);
    }
  });

  it('the bookable exit deep-links each confirmed puja', () => {
    const el = detailCta({
      routePrefix: 'tirth',
      subject: 'Kashi Vishwanath',
      relatedPujas: ['Rudrabhishek', 'Never Sold Ritual'],
      catalogue: new Set(['rudrabhishek']),
    });
    const { container } = render(el);
    const hrefs = [...container.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(['/pujas/rudrabhishek']);
  });

  it('renders a heading naming the subject, so the exit is not a bare button', () => {
    const { container } = render(
      detailCta({ routePrefix: 'tirth', subject: 'Kashi Vishwanath' }),
    );
    expect(container.querySelector('h2')?.textContent).toContain('Kashi Vishwanath');
  });
});

describe('pujaNameToSlug', () => {
  it('slugifies editorial prose', () => {
    expect(pujaNameToSlug('Mahamrityunjaya Jaap')).toBe('mahamrityunjaya-jaap');
    expect(pujaNameToSlug('22 Tirtha Snanam (sacred bath)')).toBe('22-tirtha-snanam-sacred-bath');
  });

  it('never returns a leading or trailing separator', () => {
    expect(pujaNameToSlug('  Shringar Aarti  ')).toBe('shringar-aarti');
  });
});
