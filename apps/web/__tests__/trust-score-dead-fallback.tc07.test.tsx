/**
 * TC-07 (cont.) — the fabricated trust literal the first pass did not reach.
 *
 * `trust-score-fabricated.tc07.test.tsx` pinned the RENDERED surfaces: no
 * score in the JSON-LD, no Verified shield the API did not authorise, no
 * Jyotirlinga status derived from an operations metric. It renders
 * /temples/[slug] with `resolveApiTemple` mocked to `null`, which is the
 * curated-temple path — so nothing in it exercises the branch a real API row
 * takes, and nothing in it looks at the literals the source declares.
 *
 * Two things were still in the tree.
 *
 * 1. `app/temples/[slug]/page.tsx` declared a module-level
 *    `const apiFallback: TempleDetail` — an invented temple carrying
 *    `isVerified: true` and `trustScore: 90`. TRUST_SCORE_MAX is 5, so 90 is
 *    eighteen times the largest value a real row can hold; it is a leftover
 *    from the 0-100 reading that CM-02 refuted. Nothing read the const (the
 *    page 404s when neither the rich map nor the API knows the temple), which
 *    is exactly what made it worth deleting rather than leaving: a ready-made
 *    "verified, trust 90" temple one `??` away from a render, in a file whose
 *    own comments now warn against publishing the score.
 *
 * 2. The comment above the JSON-LD block asserted "The trust score itself is
 *    fine and is still rendered on the page — as a trust score, labelled as
 *    one." Both halves were false: the value has no writer, and no temple
 *    surface renders it any more. A stale comment claiming the opposite is how
 *    the aggregateRating tag gets re-added.
 *
 * The ratchet below is per-occurrence, not whole-file: it reads every
 * `trustScore: <number>` literal in the temple sources and checks each one
 * against the single scale, rather than asserting something about the file as
 * a whole and calling the nested case covered.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { TRUST_SCORE_MAX } from '../lib/trust-score';

const API_TEMPLE = {
  id: 'api-kashi',
  name: 'Kashi Vishwanath Temple',
  nameLocal: null,
  slug: 'kashi-vishwanath-varanasi',
  description: 'Seeded by the API.',
  deityPrimary: 'Lord Shiva',
  deities: ['Lord Shiva'],
  tradition: 'Shaiva',
  addressLine: 'Lahori Tola',
  city: 'Varanasi',
  state: 'Uttar Pradesh',
  pincode: '221001',
  country: 'India',
  lat: 25.3109,
  lng: 83.0107,
  phone: null,
  email: null,
  websiteUrl: null,
  images: [],
  timingInfo: null,
  isVerified: true,
  verificationDate: null,
  // The API's own select omits trustScore entirely (P0 #PUB-02), so this is
  // what the page really receives: no score at all.
  liveDarshanEnabled: false,
  streamUrl: null,
  status: 'active',
  priests: [],
  pujaOfferings: [],
  darshanStream: [],
};

vi.mock('../lib/temple-resolve', () => ({
  resolveApiTemple: vi.fn(async () => API_TEMPLE),
}));

vi.mock('../lib/reviews', async () => {
  const actual = await vi.importActual<typeof import('../lib/reviews')>('../lib/reviews');
  return { ...actual, getTempleDevoteeReviews: vi.fn(async () => actual.EMPTY_TEMPLE_REVIEWS) };
});

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

import TempleDetailPage from '../app/temples/[slug]/page';

const read = (rel: string) => readFileSync(resolve(__dirname, '..', rel), 'utf8');

/**
 * Strip comments before every source scan.
 *
 * Not optional here. The comment that records the deletion has to name the
 * literal it deleted — "isVerified: true and trustScore: 90" — so a raw-text
 * scan would match its own documentation and fail forever, and the obvious
 * "fix" is to weaken the assertion. Strip first, assert on code only.
 */
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1');

const TEMPLE_SOURCES = [
  'app/temples/[slug]/page.tsx',
  'app/temples/(index)/page.tsx',
  'app/temples/[slug]/pujas/page.tsx',
  'components/temple/TempleBookPujaCta.tsx',
  'components/temple/TempleDevoteeReviews.tsx',
  'lib/trust-score.ts',
  'lib/reviews.ts',
];

afterEach(() => cleanup());

describe('TC-07 — no temple source declares a trust literal off the scale', () => {
  it('the stripper really does remove the comment that quotes the literal', () => {
    // Guard the guard. If stripComments stopped working, every assertion below
    // would still pass on a file that had the bug back, because the bug and its
    // documentation look identical to a regex.
    const stripped = stripComments(read('app/temples/[slug]/page.tsx'));
    expect(stripped).not.toMatch(/eighteen times the maximum/);
    // ...while leaving actual code alone.
    expect(stripped).toMatch(/export default async function TempleDetailPage/);
  });

  for (const rel of TEMPLE_SOURCES) {
    it(`${rel} holds every trustScore literal within the one scale`, () => {
      const src = stripComments(read(rel));
      const found = [...src.matchAll(/trustScore\s*:\s*(-?\d+(?:\.\d+)?)\b/g)].map((m) =>
        Number(m[1]),
      );
      for (const value of found) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(TRUST_SCORE_MAX);
      }
    });
  }

  it('carries no invented fallback temple that verifies itself', () => {
    const src = stripComments(read('app/temples/[slug]/page.tsx'));
    expect(src).not.toMatch(/\bapiFallback\b/);
  });

  it('renders the score only from behind the canPublishTrustScore gate', () => {
    // The page keeps a real, gated presentation rather than no reference at
    // all — `structured-data-honesty.test.ts` requires one, and a deletion
    // leaves the next author nothing to find, which is how
    // `ratingValue: trustScore / 20` came to be written twice. What must never
    // happen is the presentation without the gate.
    const src = stripComments(read('app/temples/[slug]/page.tsx'));
    expect(src).toMatch(/formatTrustScoreOutOf/);
    expect(src).toMatch(/canPublishTrustScore\(\s*apiTemple\?\.trustScore\s*\)\s*&&/);
    // No second, ungated CALL SITE sneaking the same number onto the page.
    // Match the invocation, not the identifier — the import line is the other
    // occurrence and counting it would make the number meaningless.
    expect([...src.matchAll(/formatTrustScoreOutOf\s*\(/g)]).toHaveLength(1);
  });
});

describe('TC-07 — /temples/[slug] publishes no score even on the API path', () => {
  it('prints no trust score for a temple the API does have a row for', async () => {
    cleanup();
    const el = await TempleDetailPage({ params: Promise.resolve({ slug: 'kashi-vishwanath' }) });
    render(el);
    const html = document.body.innerHTML ?? '';
    // Read markup, not textContent: happy-dom drops the text node following an
    // inline <svg> in the same element, and every badge on this page is
    // <svg/>{text} — a textContent scan passes while the badge is on screen.
    expect(html).toContain('Kashi Vishwanath');
    expect(html).not.toMatch(/[Tt]rust\s*score/);
    // The 0-100 rendering and the /5 rendering of the same fabricated number.
    expect(html).not.toMatch(/\b\d+(\.\d+)?\s*\/\s*100\b/);
    expect(html).not.toMatch(/[Tt]rust[^<]{0,20}\d/);
  });

  it('still emits no aggregateRating when the API row is present', async () => {
    cleanup();
    const el = await TempleDetailPage({ params: Promise.resolve({ slug: 'kashi-vishwanath' }) });
    render(el);
    const ld = document.querySelector('script[type="application/ld+json"]');
    expect(ld).toBeTruthy();
    const parsed = JSON.parse(ld?.textContent ?? '{}');
    expect(parsed.aggregateRating).toBeUndefined();
    expect(JSON.stringify(parsed)).not.toMatch(/trustScore|ratingValue|ratingCount/);
  });
});
