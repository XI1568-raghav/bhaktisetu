// [SEO-05] + [SEO-06] — structured data that contradicts the page it sits on
// (prod sweep 2026-08-12).
//
// SEO-05a  /pujas/rudrabhishek rendered
//            offers: { AggregateOffer, lowPrice: 1100, highPrice: 5500,
//                      offerCount: 2, offers: [ {price:1100}, {price:1100} ] }
//          Both enumerated Offers are ₹1,100. puja_types.base_price is 1100.00.
//          Scraping every rupee amount in the page HTML yields exactly one
//          distinct value: ₹1,100. The 5500 is `Number(puja.basePrice) * 5` —
//          a price that exists in no offer, on no page and in no database row.
//          Google's structured-data policy requires markup prices to match the
//          page; a rich result promising up to ₹5,500 is a manual-action risk
//          and breaks trust for the first devotee who clicks it.
//
// SEO-05b  Each Offer.url pointed at /pujas/{slug}/book?temple=… which is a
//          redirect stub (app/pujas/[slug]/book/page.tsx calls redirect()) —
//          every Offer URL in the markup 307s.
//
// SEO-05c  /temples/{slug} built `aggregateRating` from an internal ops metric:
//            ratingValue: Math.min(5, ldTrustScore / 20), ratingCount: 1
//          An operations trust score presented to Google, and to a devotee
//          choosing where to send money, as if it were a user review average.
//          There is no review behind it. Same manual-action risk, plus it is
//          simply untrue.
//
// SEO-06   /temples/kashi-vishwanath (200) and /temples/kashi-vishwanath-varanasi
//          (200) both render the same temple and each declares ITSELF canonical,
//          while the JSON-LD on the long-slug page sets
//          url: ".../kashi-vishwanath" — contradicting that page's own canonical.
//          The sitemap advertises only the short slug; the DB carries the long
//          one, so internal links point at the un-advertised twin.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { pujaOffersJsonLd } from '../../lib/jsonld';
import { canonicalTempleSlug, TEMPLE_SLUG_ALIASES } from '../../lib/temple-slug';

const APP_DIR = path.resolve(__dirname, '../../app');

/** Source with comments stripped — a comment explaining WHY `basePrice * 5` and
 *  `aggregateRating` were removed must not read as those things still existing. */
const read = (p: string) =>
  fs
    .readFileSync(path.join(APP_DIR, p), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');

describe('[SEO-05] puja offer markup quotes prices that exist', () => {
  const rudrabhishek = {
    slug: 'rudrabhishek',
    basePrice: 1100,
    temples: [
      { templeSlug: 'kashi-vishwanath', templeName: 'Kashi Vishwanath', priceOverride: null, isActive: true },
      { templeSlug: 'somnath', templeName: 'Somnath', priceOverride: null, isActive: true },
    ],
  };

  it('emits a single Offer — not a price RANGE — when every temple charges the same', () => {
    const offers = pujaOffersJsonLd(rudrabhishek);
    expect(offers['@type']).toBe('Offer');
    expect(offers.price).toBe(1100);
    expect(
      JSON.stringify(offers),
      'The production markup advertised ₹1,100–₹5,500 for a puja with exactly one price.',
    ).not.toContain('5500');
    expect(Object.keys(offers)).not.toContain('highPrice');
  });

  it('caps highPrice at the real maximum of the enumerated offers', () => {
    const offers = pujaOffersJsonLd({
      ...rudrabhishek,
      temples: [
        { templeSlug: 'kashi-vishwanath', templeName: 'Kashi Vishwanath', priceOverride: null, isActive: true },
        { templeSlug: 'somnath', templeName: 'Somnath', priceOverride: 2100, isActive: true },
      ],
    });
    expect(offers['@type']).toBe('AggregateOffer');
    expect(offers.lowPrice).toBe(1100);
    expect(
      offers.highPrice,
      'highPrice must be a price the checkout can actually produce — the highest ' +
        'enumerated offer, never an arbitrary multiple of basePrice.',
    ).toBe(2100);
    const enumerated = (offers.offers as { price: number }[]).map((o) => o.price);
    expect(Math.max(...enumerated)).toBe(offers.highPrice);
    expect(Math.min(...enumerated)).toBe(offers.lowPrice);
  });

  it('never invents a bound when a temple override is the only price', () => {
    const offers = pujaOffersJsonLd({
      slug: 'x',
      basePrice: 5000,
      temples: [{ templeSlug: 't', templeName: 'T', priceOverride: 900, isActive: true }],
    });
    // basePrice is a catalogue default, not an offer. With one temple at ₹900
    // the only honest markup is a single ₹900 Offer.
    expect(offers['@type']).toBe('Offer');
    expect(offers.price).toBe(900);
  });

  it('points every Offer url at the URL that actually serves the booking form', () => {
    const offers = pujaOffersJsonLd(rudrabhishek) as Record<string, unknown>;
    const single = offers.url as string;
    // One price across every temple ⇒ one Offer, and the honest destination is
    // the puja's booking form, not an arbitrarily-chosen temple.
    expect(single).toBe('https://darshya.online/pujas/book?slug=rudrabhishek');

    const multi = pujaOffersJsonLd({
      ...rudrabhishek,
      temples: [
        { templeSlug: 'kashi-vishwanath', templeName: 'Kashi Vishwanath', priceOverride: null, isActive: true },
        { templeSlug: 'somnath', templeName: 'Somnath', priceOverride: 2100, isActive: true },
      ],
    });
    for (const o of multi.offers as { url: string }[]) {
      expect(
        o.url,
        '/pujas/{slug}/book is a redirect stub — an Offer url that 307s wastes crawl ' +
          'budget and can drop the offer from the rich result.',
      ).toMatch(/^https:\/\/darshya\.online\/pujas\/book\?slug=/);
    }
  });

  it('marks an inactive temple out of stock and keeps it out of the price bounds', () => {
    const offers = pujaOffersJsonLd({
      slug: 'x',
      basePrice: 1100,
      temples: [
        { templeSlug: 'a', templeName: 'A', priceOverride: null, isActive: true },
        { templeSlug: 'b', templeName: 'B', priceOverride: 9000, isActive: false },
      ],
    });
    // A price nobody can buy must not set the ceiling advertised to Google.
    expect(offers['@type']).toBe('Offer');
    expect(offers.price).toBe(1100);
  });

  it('the puja page uses the helper and no longer multiplies basePrice', () => {
    const src = read('pujas/[slug]/page.tsx');
    expect(src).toMatch(/pujaOffersJsonLd/);
    expect(
      /basePrice\s*\)?\s*\*\s*5/.test(src),
      'basePrice * 5 was the fabricated highPrice.',
    ).toBe(false);
  });
});

describe('[SEO-05] temple markup carries no invented rating', () => {
  const src = read('temples/[slug]/page.tsx');

  it('emits no aggregateRating derived from the internal trust score', () => {
    expect(
      /aggregateRating/.test(src),
      'ratingValue: Math.min(5, ldTrustScore / 20), ratingCount: 1 — an ops metric ' +
        'dressed up as a user review average. Only real rows in `reviews` may back this.',
    ).toBe(false);
    expect(/ratingValue/.test(src)).toBe(false);
  });

  /**
   * Rewritten 2026-08-28 (TC-07), deliberately, because it encoded a contract
   * that has since been superseded.
   *
   * It was `expect(src).toMatch(/trustScore/)` under the comment "the metric
   * itself is fine and useful — removing the JSON-LD must not silently remove
   * the honest on-page presentation too". TC-07 established that the metric is
   * NOT fine: `Temple.trustScore` has no writer anywhere in the codebase, and
   * every value in the database is one of twenty literals typed into
   * apps/api/prisma/seed.ts before the platform had taken a booking. There is
   * no honest on-page presentation to protect while `TRUST_SCORE_IS_COMPUTED`
   * is false, so an assertion demanding one was pulling the wrong way.
   *
   * (A handoff note claimed the old assertion passed only on this page's own
   * TC-07 COMMENTS. That is wrong and is recorded here so it is not repeated:
   * `read()` above already strips comments, and in the stripped source
   * `trustScore` still occurs twice, at page.tsx:380 and :383. The real
   * weakness was subtler — both occurrences are *inside the gate expression*
   * `canPublishTrustScore(apiTemple?.trustScore)`, so the regex could not tell
   * "renders the score" from "gates the score away", which is the single
   * distinction it existed to make.)
   *
   * What survives from the original intent is the reason the score was GATED
   * rather than deleted: the presentation must be able to come back the day a
   * writer lands, by flipping one flag. That requires the wiring to still be
   * present as code.
   */
  it('keeps the score wired behind the honesty gate, so it returns when a writer lands', () => {
    expect(src).toMatch(/canPublishTrustScore\(/);
    expect(src).toMatch(/formatTrustScoreOutOf\(/);
    // Never the weaker gate: `hasMeaningfulTrustScore` asks only whether the
    // number is thick enough to render, not whether anything computes it.
    expect(src).not.toMatch(/hasMeaningfulTrustScore/);
    // Every print is behind a gate — the assertion the old regex could not make.
    const prints = (src.match(/formatTrustScoreOutOf\(/g) ?? []).length;
    const gates = (src.match(/canPublishTrustScore\(/g) ?? []).length;
    expect(gates).toBeGreaterThanOrEqual(prints);
  });

  it('the gate really is closed, so nothing renders today', async () => {
    const mod = await import('../../lib/trust-score');
    expect(mod.TRUST_SCORE_IS_COMPUTED).toBe(false);
    expect(mod.canPublishTrustScore(5)).toBe(false);
  });
});

describe('[SEO-06] a temple has exactly one canonical URL', () => {
  // The exact slugs the temples table holds today (SELECT slug FROM temples).
  const DB_SLUGS = [
    'akshardham-delhi', 'akshardham-gandhinagar', 'badrinath-uttarakhand',
    'birla-mandir-hyderabad', 'dagdusheth-pune', 'dakshineswar-kolkata',
    'dwarkadhish-dwarka', 'govind-dev-ji-jaipur', 'iskcon-bangalore',
    'jagannath-puri', 'kapaleeshwarar-chennai', 'kashi-vishwanath-varanasi',
    'lingaraj-bhubaneswar', 'meenakshi-madurai', 'ramanathaswamy-rameshwaram',
    'shirdi-sai-baba', 'siddhivinayak-mumbai', 'somnath-gujarat',
    'tirumala-tirupati', 'vaishno-devi-katra',
  ];

  it('maps an API long slug onto the slug the route actually renders', () => {
    expect(canonicalTempleSlug('kashi-vishwanath-varanasi')).toBe('kashi-vishwanath');
    expect(canonicalTempleSlug('somnath-gujarat')).toBe('somnath');
    expect(canonicalTempleSlug('vaishno-devi-katra')).toBe('vaishno-devi');
  });

  it('collapses the same-temple pairs the suffix rule cannot reach', () => {
    // Different names for one temple — no shared prefix, so only an explicit
    // alias closes them. Each was checked against temples.name + temples.city.
    expect(canonicalTempleSlug('tirumala-tirupati')).toBe('tirupati-balaji');
    expect(canonicalTempleSlug('meenakshi-madurai')).toBe('meenakshi-temple');
    expect(canonicalTempleSlug('ramanathaswamy-rameshwaram')).toBe('rameshwaram');
    // TEMPLE_DETAILS carries BOTH 'rameswaram' and 'rameshwaram' for the same
    // temple — a duplicate that predates the API entirely.
    expect(canonicalTempleSlug('rameswaram')).toBe('rameshwaram');
  });

  it('refuses to merge two different temples that share a name', () => {
    // The temples table holds a Delhi Akshardham AND a Gandhinagar Akshardham.
    // A blind prefix strip sent both to the curated `akshardham` entry — which
    // is the DELHI temple — so Gandhinagar rendered Delhi's prose, and once the
    // route began 308ing aliases it would have permanently redirected one real
    // temple onto another. Only a suffix that names the curated entry's own
    // city or state may be stripped.
    expect(canonicalTempleSlug('akshardham-delhi')).toBe('akshardham');
    expect(
      canonicalTempleSlug('akshardham-gandhinagar'),
      'Gandhinagar is not Delhi. Leaving it un-merged costs one duplicate URL; ' +
        'merging it sends devotees to the wrong temple.',
    ).toBe('akshardham-gandhinagar');
  });

  it('never redirects one alias onto another (the 308 cannot loop)', () => {
    for (const [from, to] of Object.entries(TEMPLE_SLUG_ALIASES)) {
      expect(from).not.toBe(to);
      expect(
        TEMPLE_SLUG_ALIASES[to],
        `${from} -> ${to} -> ${TEMPLE_SLUG_ALIASES[to]} would 308 in a circle`,
      ).toBeUndefined();
      expect(canonicalTempleSlug(to)).toBe(to);
    }
  });

  it('every slug in the temples table resolves to a stable URL in one hop', () => {
    for (const slug of DB_SLUGS) {
      const once = canonicalTempleSlug(slug);
      expect(canonicalTempleSlug(once), `${slug} needs a second redirect`).toBe(once);
    }
  });

  it('no two temples in the table collapse onto the same URL', () => {
    // A canonical collision means one real temple 308s onto a different one.
    const byCanonical = new Map<string, string[]>();
    for (const slug of DB_SLUGS) {
      const c = canonicalTempleSlug(slug);
      byCanonical.set(c, [...(byCanonical.get(c) ?? []), slug]);
    }
    const collisions = [...byCanonical.entries()]
      .filter(([, slugs]) => slugs.length > 1)
      .map(([c, slugs]) => `${c} <- ${slugs.join(' + ')}`);
    expect(collisions).toEqual([]);
  });

  it('the canonical URL still gets its live temple row from the API', () => {
    // The redirect moves traffic from the DB slug (which the API resolves) to
    // the curated slug (which it does not). Without a reverse lookup the
    // canonical page would render prose with no darshan state, phone, trust
    // score or bookable offering — a content REGRESSION dressed as an SEO fix.
    // DF-04 moved this resolver into lib/temple-resolve.ts so the detail page
    // and its /pujas child route stop disagreeing about which temples exist.
    // The guarantee is unchanged; only its address moved.
    const src = read('temples/[slug]/page.tsx');
    expect(src).toMatch(/resolveApiTemple/);
    const resolver = fs.readFileSync(
      path.resolve(__dirname, '../../lib/temple-resolve.ts'),
      'utf8',
    );
    expect(resolver).toMatch(/getTemples\s*\(/);
    expect(resolver).toMatch(/canonicalTempleSlug\(t\.slug\)\s*===\s*slug/);
    // and it must stay honest when that lookup fails
    expect(resolver).not.toMatch(/return\s+apiFallback/);
    expect(src).not.toMatch(/return\s+apiFallback/);
  });

  it('leaves a canonical slug untouched (no redirect loop)', () => {
    expect(canonicalTempleSlug('kashi-vishwanath')).toBe('kashi-vishwanath');
    expect(canonicalTempleSlug('somnath')).toBe('somnath');
  });

  it('leaves an unknown slug untouched rather than guessing a prefix', () => {
    expect(canonicalTempleSlug('some-temple-that-does-not-exist')).toBe(
      'some-temple-that-does-not-exist',
    );
  });

  it('is idempotent', () => {
    const once = canonicalTempleSlug('kashi-vishwanath-varanasi');
    expect(canonicalTempleSlug(once)).toBe(once);
  });

  it('the temple route redirects an alias instead of serving a second 200', () => {
    const src = read('temples/[slug]/page.tsx');
    expect(
      src,
      'Two URLs that both return 200 and both self-canonicalise split the link ' +
        'equity of the highest-intent page on the site.',
    ).toMatch(/permanentRedirect/);
    expect(src).toMatch(/canonicalTempleSlug/);
  });

  it('the route derives its canonical AND its JSON-LD url from that one helper', () => {
    const src = read('temples/[slug]/page.tsx');
    // In prod the canonical said …/kashi-vishwanath-varanasi while the
    // PlaceOfWorship JSON-LD on the SAME page said …/kashi-vishwanath — and
    // BOTH interpolated a variable literally named `slug`, in two different
    // scopes holding two different values. So matching names proves nothing;
    // assert that every interpolated name is bound to canonicalTempleSlug().
    const resolved = new Set(
      Array.from(src.matchAll(/const\s+(\w+)\s*=\s*canonicalTempleSlug\(/g)).map((m) => m[1]),
    );
    const interpolated = Array.from(
      src.matchAll(/https:\/\/darshya\.online\/temples\/\$\{(\w+)\}/g),
    ).map((m) => m[1]);

    expect(interpolated.length, 'expected the canonical and the JSON-LD url').toBeGreaterThan(1);
    expect(resolved.size).toBeGreaterThan(0);
    expect(
      interpolated.filter((n) => !resolved.has(n)),
      'A temple URL built from the RAW route param is the alias, not the canonical.',
    ).toEqual([]);
  });

  it('the sitemap advertises the same canonical slug, via the same helper', () => {
    const src = read('sitemap.ts');
    expect(src).toMatch(/canonicalTempleSlug/);
    expect(
      /function toCanonicalTempleSlug/.test(src),
      'A second, hand-rolled slug normaliser in sitemap.ts is how the sitemap and ' +
        'the route disagreed in the first place.',
    ).toBe(false);
  });
});
