import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { WEDDING_PACKAGES, readPackageTier, weddingPackage } from '../wedding-packages';

/**
 * The app and the website must publish the SAME wedding prices.
 *
 * WHY THIS GUARD EXISTS
 * ---------------------
 * There is no wedding-package endpoint — `POST /api/v1/weddings/inquiry` takes
 * a bare `z.enum(['basic','premium','royal'])` — so nothing at runtime can
 * reconcile the two catalogues. Before this, `app/(devotee)/weddings.tsx`
 * offered `₹25k / ₹2L+ / ₹10L+` while the website offered
 * `₹15,000 / ₹50,000 / ₹2,00,000`. All three tiers disagreed; Royal disagreed
 * by 5x. A devotee picked a tier in the app, the inquiry recorded that tier,
 * and the concierge quoted the website's number.
 *
 * A test is the only thing that can hold two hand-maintained catalogues
 * together, so this one reads the website's own source and compares.
 */

const WEB_PACKAGES_PAGE = path.resolve(
  __dirname,
  '../../../web/app/weddings/packages/page.tsx',
);

const webSource = (): string => readFileSync(WEB_PACKAGES_PAGE, 'utf8');

/** `₹2,00,000` -> 200000. Indian grouping, so a plain parseInt will not do. */
function rupeesFromLabel(label: string): number {
  return Number(label.replace(/[₹,\s]/g, ''));
}

describe('wedding package catalogue parity with the website', () => {
  it('reads the web page at all — a missing file would pass everything below', () => {
    expect(webSource().length).toBeGreaterThan(500);
    expect(webSource()).toContain("tier: 'basic'");
  });

  it('publishes exactly the three tiers the inquiry endpoint accepts', () => {
    // apps/api/src/routes/weddings.ts:21 — z.enum(['basic','premium','royal'])
    expect(WEDDING_PACKAGES.map((p) => p.tier)).toEqual(['basic', 'premium', 'royal']);
  });

  it('quotes the same rupee figure as the website for every tier', () => {
    const src = webSource();
    for (const pkg of WEDDING_PACKAGES) {
      // The web page states the price as a display string on the row whose
      // `tier` matches, e.g.  tier: 'royal', … price: '₹2,00,000',
      const block = new RegExp(
        `tier:\\s*'${pkg.tier}'[\\s\\S]{0,400}?price:\\s*'([^']+)'`,
      ).exec(src);
      expect(block, `web packages page no longer states a price for '${pkg.tier}'`).not.toBeNull();
      expect(
        rupeesFromLabel(block![1]!),
        `${pkg.tier}: mobile says ${pkg.priceInr}, website says ${block![1]}`,
      ).toBe(pkg.priceInr);
    }
  });

  it('uses the same tier name and tagline as the website', () => {
    const src = webSource();
    for (const pkg of WEDDING_PACKAGES) {
      expect(src).toContain(`name: '${pkg.name}'`);
      expect(src).toContain(`tagline: '${pkg.tagline}'`);
    }
  });

  it('marks the same tier "most popular" as the website does', () => {
    const src = webSource();
    const popular = WEDDING_PACKAGES.filter((p) => p.popular).map((p) => p.tier);
    expect(popular).toHaveLength(1);
    const webPopular = /tier:\s*'([a-z]+)'[\s\S]{0,300}?popular:\s*true/.exec(src);
    expect(webPopular).not.toBeNull();
    expect(webPopular![1]).toBe(popular[0]);
  });

  it('carries no price the website does not state', () => {
    // Guards the direction the regex above cannot: a tier row invented here
    // with a plausible number that the site has never published.
    const src = webSource();
    for (const pkg of WEDDING_PACKAGES) {
      const grouped = pkg.priceInr.toLocaleString('en-IN');
      expect(src, `₹${grouped} appears nowhere on the web packages page`).toContain(grouped);
    }
  });
});

describe('readPackageTier', () => {
  it('accepts the three real tiers', () => {
    expect(readPackageTier('basic')).toBe('basic');
    expect(readPackageTier('premium')).toBe('premium');
    expect(readPackageTier('royal')).toBe('royal');
  });

  it('takes the first entry of an expo-router array param', () => {
    expect(readPackageTier(['royal', 'basic'])).toBe('royal');
  });

  it('returns null rather than guessing on anything else', () => {
    for (const bad of ['', 'gold', 'BASIC', undefined, null, 7, {}, []]) {
      expect(readPackageTier(bad)).toBeNull();
    }
  });
});

describe('weddingPackage', () => {
  it('returns the row, price included', () => {
    expect(weddingPackage('premium').priceInr).toBe(50000);
  });

  it('throws rather than returning undefined for an unknown tier', () => {
    expect(() => weddingPackage('gold' as never)).toThrow();
  });
});
