/**
 * TC-07 (P1), comparison-page half — /pujas/[slug]/temples.
 *
 * `Temple.trustScore` has no writer anywhere in the codebase; every non-zero
 * value is one of twenty literals typed into apps/api/prisma/seed.ts before the
 * platform had taken a booking (see lib/trust-score.ts for the full trace).
 *
 * Unlike /temples — whose GET whitelists its select and omits the column — this
 * route DOES receive a live value: apps/api/src/services/puja.service.ts maps
 * `trustScore: o.temple.trustScore` onto every offering. So this page was the
 * one surface still publishing the fabricated number, and it did three things
 * with it:
 *
 *   1. ranked the offerings by it, "sorted by trustScore desc so best temple
 *      first" — a seed literal deciding which temple a devotee sends money to,
 *   2. printed "Trust score: 4.9/5" gated on `hasMeaningfulTrustScore` (is the
 *      number thick enough) rather than `canPublishTrustScore` (does the number
 *      mean anything) — exactly the distinction lib/trust-score.ts documents,
 *   3. published a four-factor methodology for it — "combines temple
 *      verification, devotee reviews, on-time delivery and video-proof
 *      completion. Higher = safer." — describing work the platform does not do.
 *
 * These assertions were confirmed RED against the pre-fix page before the fix
 * landed: the rendered markup carried "Trust score: 5.0/5", the methodology
 * sentence, and the highest-scoring temple in first position.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));

import PujaTemplesPage from '../app/pujas/[slug]/temples/page';

const PAGE_REL = 'app/pujas/[slug]/temples/page.tsx';

/**
 * The comments in this page quote the very copy and identifiers the scans
 * below forbid, so strip them first. Seven source-text guards in this
 * engagement have been satisfied (or falsely failed) by their own explanatory
 * comment.
 */
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1');

const pageSource = () =>
  stripComments(readFileSync(resolve(__dirname, '..', PAGE_REL), 'utf8'));

/**
 * Two offerings, deliberately anti-correlated: the temple with the HIGHEST
 * fabricated trust score is also the most expensive, and sorts LAST
 * alphabetically. Any order the page produces therefore identifies what it
 * ranked on.
 */
const CHEAP_LOW_SCORE = {
  id: 'offering-cheap',
  templeName: 'Zeta Mandir',
  templeSlug: 'zeta-mandir',
  templeCity: 'Pune',
  templeState: 'Maharashtra',
  priceOverride: '1100',
  isActive: true,
  trustScore: 4.6,
  isVerified: true,
};

const DEAR_TOP_SCORE = {
  id: 'offering-dear',
  templeName: 'Alpha Mandir',
  templeSlug: 'alpha-mandir',
  templeCity: 'Varanasi',
  templeState: 'Uttar Pradesh',
  priceOverride: '9100',
  isActive: true,
  trustScore: 5,
  isVerified: true,
};

const PUJA = {
  id: 'puja-1',
  name: 'Rudrabhishek',
  nameLocal: null,
  slug: 'rudrabhishek',
  description: 'Abhishek of the Shivalinga.',
  category: 'shiva',
  deity: 'Lord Shiva',
  basePrice: '2100',
  // API order is arbitrary — findBySlug has no orderBy on templeOfferings.
  temples: [CHEAP_LOW_SCORE, DEAR_TOP_SCORE],
};

async function renderPage(): Promise<string> {
  const el = await PujaTemplesPage({ params: Promise.resolve({ slug: 'rudrabhishek' }) });
  render(el);
  return document.body.innerHTML ?? '';
}

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, json: async () => PUJA })),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('TC-07 — the comparison page publishes no fabricated trust score', () => {
  it('prints no trust score next to a temple', async () => {
    const html = await renderPage();
    // Sanity: the list rendered at all, so the absence below means something.
    expect(html).toContain('Zeta Mandir');
    expect(html).toContain('Alpha Mandir');

    expect(html).not.toMatch(/Trust score/i);
    // formatTrustScoreOutOf(5) === "5.0/5"; formatTrustScoreOutOf(4.6) === "4.6/5".
    expect(html).not.toMatch(/\d\.\d\/5\b/);
  });

  it('publishes no four-factor methodology for a number nobody computes', async () => {
    const html = await renderPage();
    expect(html).not.toMatch(/combines temple verification/i);
    expect(html).not.toMatch(/video-proof completion/i);
    expect(html).not.toMatch(/Higher = safer/i);
  });

  it('does not invite the devotee to compare a score it will not show', async () => {
    const html = await renderPage();
    expect(html).not.toMatch(/trust scores/i);
  });

  it('gates the badge on whether the number MEANS anything, not on its size', () => {
    const src = pageSource();
    expect(src).toMatch(/canPublishTrustScore\(/);
    // hasMeaningfulTrustScore only asks whether the number is thick enough.
    expect(src).not.toMatch(/hasMeaningfulTrustScore\(/);
  });
});

describe('TC-07 — a seed literal does not decide which temple is seen first', () => {
  it('does not rank the offerings by trustScore', async () => {
    const html = await renderPage();
    const cheap = html.indexOf('Zeta Mandir');
    const dear = html.indexOf('Alpha Mandir');
    expect(cheap).toBeGreaterThan(-1);
    expect(dear).toBeGreaterThan(-1);
    // trustScore desc would put Alpha (5.0) first. The real, checkable
    // attribute this page exists to compare is price.
    expect(cheap).toBeLessThan(dear);
  });

  it('orders the JSON-LD ItemList the same way the page does', async () => {
    await renderPage();
    const node = document.querySelector('script[type="application/ld+json"]');
    expect(node).toBeTruthy();
    const parsed = JSON.parse(node?.textContent ?? '{}') as {
      itemListElement?: { position: number; name: string }[];
    };
    const names = (parsed.itemListElement ?? []).map((i) => i.name);
    expect(names).toEqual(['Zeta Mandir', 'Alpha Mandir']);
  });

  it('stays deterministic when no price can be parsed', async () => {
    // Hardening on the replacement comparator, not on the finding: with an
    // unparseable basePrice and no overrides every row hits the fallback, and
    // an Infinity sentinel would make the subtraction NaN — a comparator
    // returning NaN is undefined behaviour, so the order would follow whatever
    // arbitrary sequence the API happened to send. Input here is reverse
    // alphabetical so a pass-through order is visible.
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          ...PUJA,
          basePrice: 'on request',
          temples: [
            { ...DEAR_TOP_SCORE, priceOverride: null },
            { ...CHEAP_LOW_SCORE, priceOverride: null },
          ],
        }),
      })),
    );
    const html = await renderPage();
    expect(html.indexOf('Alpha Mandir')).toBeLessThan(html.indexOf('Zeta Mandir'));
  });

  it('carries no trustScore comparator in the source', () => {
    const src = pageSource();
    expect(src).not.toMatch(/sort\([\s\S]{0,160}trustScore/);
    expect(src).not.toMatch(/best temple first/i);
  });
});
