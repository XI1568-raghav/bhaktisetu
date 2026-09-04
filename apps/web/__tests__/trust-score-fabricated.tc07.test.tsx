/**
 * TC-07 (P1) — the temple "Trust score" is a hand-typed seed literal, and the
 * surfaces around it published it as if it were computed.
 *
 * CM-02 fixed the SCALE (a gold star beside "0.2", "4.9/100" printed under
 * "Higher = safer"). It did not ask where the value comes from. The answer:
 * `Temple.trustScore` (`Float @default(0)`) has NO WRITER anywhere in the
 * codebase — every non-zero value in the database is one of twenty literals
 * typed into apps/api/prisma/seed.ts before the platform had taken a booking.
 *
 * Three consequences this file pins, all inside the temple surfaces:
 *
 *  1. lib/trust-score.ts now states plainly that nothing computes the value and
 *     exposes the gate a publisher must pass. The comparison page copy
 *     ("combines temple verification, devotee reviews, on-time delivery and
 *     video-proof completion") describes four inputs to a computation that does
 *     not exist.
 *  2. /temples manufactured its own trust signals: `trustScore: 97` on a scale
 *     whose maximum is 5, and `isVerified: true` for all 25 curated temples,
 *     which awarded the green Verified shield with nothing behind it. It also
 *     derived Jyotirlinga status from the score — a category error, and dead
 *     code besides, because GET /temples deliberately omits trustScore from its
 *     select (P0 #PUB-02) so the comparison was `undefined >= 4.85`. That same
 *     undefined fed `popularity`, so "Most Popular" sorted on NaN.
 *  3. /temples/[slug] printed an unconditional "Verified" hero badge.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import type { ReactElement } from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { TempleListItem } from '../lib/api';
import type { TempleCardData } from '../components/temples/TemplesBrowser';
import {
  TRUST_SCORE_MAX,
  TRUST_SCORE_IS_COMPUTED,
  canPublishTrustScore,
  canPublishTrustScoreMethodology,
} from '../lib/trust-score';

const read = (rel: string) => readFileSync(resolve(__dirname, '..', rel), 'utf8');

/** Comments quote the rule they document, so strip them before any scan. */
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1');

const KASHI_SLUG = 'kashi-vishwanath';

/**
 * Prod shape: GET /temples returns NO trustScore (temple.service.ts whitelists
 * its select and omits it), so the field is absent at runtime however it is
 * typed. KASHI canonicalises onto a curated card; UNMATCHED does not.
 */
const KASHI = {
  id: 'api-kashi',
  name: 'Kashi Vishwanath Temple',
  nameLocal: null,
  slug: KASHI_SLUG,
  description: 'Seeded by the API.',
  deityPrimary: 'Lord Shiva',
  deities: ['Lord Shiva'],
  tradition: 'Shaiva',
  city: 'Varanasi',
  state: 'Uttar Pradesh',
  lat: 0,
  lng: 0,
  images: [],
  // The API row says this temple account is NOT verified.
  isVerified: false,
  liveDarshanEnabled: true,
  status: 'active',
} as unknown as TempleListItem;

const UNMATCHED = {
  id: 'api-unmatched',
  name: 'Unlisted Shiva Temple',
  nameLocal: null,
  slug: 'unlisted-shiva-temple',
  description: 'Seeded by the API, absent from the curated map.',
  deityPrimary: 'Lord Shiva',
  deities: ['Lord Shiva'],
  tradition: 'Shaiva',
  city: 'Somewhere',
  state: 'Bihar',
  lat: 0,
  lng: 0,
  images: [],
  isVerified: true,
  liveDarshanEnabled: false,
  status: 'active',
} as unknown as TempleListItem;

vi.mock('../lib/api', () => ({
  getTemples: vi.fn(async () => ({
    data: [KASHI, UNMATCHED],
    pagination: { page: 1, limit: 50, total: 2, totalPages: 1 },
  })),
  getTempleBySlug: vi.fn(async () => null),
}));

vi.mock('../lib/temple-resolve', () => ({
  resolveApiTemple: vi.fn(async () => null),
}));

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
  permanentRedirect: (to: string) => {
    throw new Error(`NEXT_REDIRECT:${to}`);
  },
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/temples',
  useSearchParams: () => new URLSearchParams(),
}));

import TemplesPage from '../app/temples/page';
import TempleDetailPage from '../app/temples/[slug]/page';

interface BrowserProps {
  temples: TempleCardData[];
  total: number;
}

/** Drive /temples down to the props it hands TemplesBrowser. */
async function templeCards(): Promise<TempleCardData[]> {
  const page = TemplesPage() as ReactElement<{ children: ReactElement }>;
  const dataElement = page.props.children;
  const TemplesData = dataElement.type as () => Promise<ReactElement<BrowserProps>>;
  const browser = await TemplesData();
  return browser.props.temples;
}

describe('TC-07 — lib/trust-score records that nothing computes the value', () => {
  it('does not claim the score is computed', () => {
    expect(TRUST_SCORE_IS_COMPUTED).toBe(false);
  });

  it('refuses to publish a score to a devotee while nothing computes it', () => {
    // 4.9 is Kashi Vishwanath's seeded literal. It renders fine and means
    // nothing, which is the trap: hasMeaningfulTrustScore says yes.
    expect(canPublishTrustScore(4.9)).toBe(false);
    expect(canPublishTrustScore(5)).toBe(false);
  });

  it('refuses to publish the four-factor methodology describing work nobody does', () => {
    expect(canPublishTrustScoreMethodology()).toBe(false);
  });
});

describe('TC-07 — /temples manufactures no trust signal of its own', () => {
  it('never hands out a score outside the one real scale', async () => {
    for (const card of await templeCards()) {
      expect(Number.isFinite(card.trustScore)).toBe(true);
      expect(card.trustScore).toBeGreaterThanOrEqual(0);
      // 97 was the literal on every curated card. TRUST_SCORE_MAX is 5.
      expect(card.trustScore).toBeLessThanOrEqual(TRUST_SCORE_MAX);
    }
  });

  it('never sorts on a value the API does not send', async () => {
    for (const card of await templeCards()) {
      // `popularity: t.trustScore` was undefined for every API temple, and
      // TemplesBrowser sorts with `b.popularity - a.popularity` — NaN.
      expect(Number.isFinite(card.popularity)).toBe(true);
    }
  });

  it('awards the Verified shield only where an API row says so', async () => {
    const cards = await templeCards();

    const kashi = cards.find((c) => c.slug === KASHI_SLUG);
    expect(kashi).toBeTruthy();
    // The API row for this temple says isVerified: false.
    expect(kashi?.isVerified).toBe(false);

    // Curated temples the API has never heard of cannot verify themselves.
    const unmatchedCurated = cards.filter((c) => c.hasRichDetail && c.slug !== KASHI_SLUG);
    expect(unmatchedCurated.length).toBeGreaterThan(0);
    for (const card of unmatchedCurated) {
      expect(card.isVerified).toBe(false);
    }
  });

  it('does not decide Jyotirlinga status from an operations score', () => {
    const src = stripComments(read('app/temples/page.tsx'));
    expect(src).not.toMatch(/TRUST_SCORE_MARQUEE/);
    expect(src).not.toMatch(/trustScore\s*>=/);
    expect(src).not.toMatch(/popularity:\s*t\.trustScore/);
  });
});

describe('TC-07 — /temples/[slug] claims no verification it cannot source', () => {
  it('prints no Verified badge when the API has no row for the temple', async () => {
    cleanup();
    const el = await TempleDetailPage({ params: Promise.resolve({ slug: KASHI_SLUG }) });
    render(el);
    const html = document.body.innerHTML ?? '';
    expect(html).toContain('Kashi Vishwanath');
    // Read the markup, not textContent: happy-dom drops the text node that
    // follows an inline <svg> inside the same element, and every HeroBadge is
    // <svg/>{text} — so a textContent scan silently passes while the badge is
    // on screen. The Jyotirlinga badge next to it renders the same way.
    expect(html).not.toMatch(/>Verified</);
    // Sanity: the sibling badge that SHOULD render proves the hero mounted and
    // that this assertion can see badges at all.
    expect(html).toMatch(/>Jyotirlinga</);
  });

  it('publishes no trust score in the page JSON-LD', async () => {
    cleanup();
    const el = await TempleDetailPage({ params: Promise.resolve({ slug: KASHI_SLUG }) });
    render(el);
    const ld = document.querySelector('script[type="application/ld+json"]');
    expect(ld).toBeTruthy();
    const parsed = JSON.parse(ld?.textContent ?? '{}');
    expect(parsed.aggregateRating).toBeUndefined();
    expect(JSON.stringify(parsed)).not.toMatch(/trustScore|ratingValue/);
  });
});
