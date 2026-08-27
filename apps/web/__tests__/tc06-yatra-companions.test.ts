/**
 * TC-06 (P1) — the eight travel companions who do not exist.
 *
 * `lib/yatra-data.ts` shipped a block headed "TRAVEL COMPANIONS — 8 verified
 * profiles": eight named elderly-care escorts (Rajesh Kumar, Priya Sharma,
 * Mohammed Aslam, Lakshmi Iyer, Vikram Nayar, Anita Deshmukh, Suresh Nair,
 * Meena Agarwal) with hand-typed ages, home cities, day rates, star ratings,
 * review counts, "yatras completed" in the hundreds, and
 * `verified: { aadhaar: true, background: true, medical: true }` — plus sixteen
 * invented people who "reviewed" them.
 *
 * Nothing counted any of it. There is no companion table: Yatra has no Prisma
 * model at all, and `/yatra/book` posts to a lead form
 * (`POST /api/v1/yatra-inquiry`) with no payment gateway behind it. Every
 * Aadhaar pill, police-verification claim, medical certification and testimonial
 * on that surface was a literal typed by a developer.
 *
 * That is the fake-review pattern the CCPA framework and BIS IS 19000:2022
 * address, and here it carries a physical-safety consequence the rest of the
 * fabrication sweep does not: a family could pick one of those names to escort
 * an elderly parent across the country on the strength of a green "background
 * checked" badge, and the person on the other end is not real.
 *
 * A previous pass stopped the RENDER — `lib/companion-roster.ts` gates both
 * routes behind an empty published roster. This test pins the rest of it: the
 * fabricated rows themselves are deleted from `lib/yatra-data.ts`, and neither
 * page can put a verification claim, a rating or an availability grid on screen
 * that no data source produced.
 *
 * What is deliberately NOT deleted: the `TravelCompanion` interface (it is the
 * shape a real, recruited roster row will take, and `lib/companion-roster.ts`
 * imports it), and every non-companion export in the file — `yatras`,
 * `sacredSites`, `getYatraBySlug`, `formatINR` and the filter buckets are
 * imported by seven other routes. Those are asserted intact below so this test
 * fails loudly if the deletion ever over-reaches.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import * as yatraData from '../lib/yatra-data';
import { publishedCompanions, getPublishedCompanionById } from '../lib/companion-roster';

const read = (rel: string) => readFileSync(resolve(__dirname, '..', rel), 'utf8');

/**
 * Every guard below scans source text, and a comment that DOCUMENTS the banned
 * pattern matches just as readily as code that commits it — the header of this
 * very file names all eight people. Strip comments before every scan so the
 * explanation of the rule can never be what trips the rule.
 */
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1');

const YATRA_DATA = 'lib/yatra-data.ts';
const LISTING = 'app/yatra/companion/page.tsx';
const DETAIL = 'app/yatra/companion/[id]/page.tsx';

/**
 * The eight invented people, hardcoded rather than read back from the module.
 * Reading them from `companions` is how the earlier gate-only test was written,
 * and it cannot express "these are gone" — the moment the fixture is deleted
 * such a test has nothing left to iterate. These literals ARE the finding.
 */
const INVENTED_IDS = [
  'rajesh-kumar',
  'priya-sharma',
  'mohammed-aslam',
  'lakshmi-iyer',
  'vikram-nayar',
  'anita-deshmukh',
  'suresh-nair',
  'meena-agarwal',
];

const INVENTED_NAMES = [
  'Rajesh Kumar',
  'Priya Sharma',
  'Mohammed Aslam',
  'Lakshmi Iyer',
  'Vikram Nayar',
  'Anita Deshmukh',
  'Suresh Nair',
  'Meena Agarwal',
];

/** The sixteen invented people who "reviewed" the eight invented people. */
const INVENTED_REVIEW_AUTHORS = [
  'Seema Gupta',
  'Anil Desai',
  'Kamla Devi',
  'Veena Iyer',
  'Gaurav Mehta',
  'Pankaj Sharma',
  'Nirmal Saxena',
  'Shanti Bhatia',
  'Neeta Agarwal',
  'Hari Chand',
  'Prema Kulkarni',
  'Ram Lal',
  'Murali Krishnan',
  'Rani Pillai',
  'Vijay Singh',
  'Sushma Jain',
];

describe('TC-06 — the invented companion fixture is deleted from lib/yatra-data.ts', () => {
  it('exports no companion roster and no companion lookup', () => {
    // `companions` was the array of eight; `getCompanionById` was its only
    // accessor and is now dead — nothing outside the deleted fixture read it.
    const exported = Object.keys(yatraData);
    expect(exported).not.toContain('companions');
    expect(exported).not.toContain('getCompanionById');
  });

  it('contains none of the eight invented people', () => {
    const src = stripComments(read(YATRA_DATA));
    for (const name of INVENTED_NAMES) expect(src).not.toContain(name);
    for (const id of INVENTED_IDS) expect(src).not.toContain(`'${id}'`);
  });

  it('contains none of the sixteen invented testimonial authors', () => {
    const src = stripComments(read(YATRA_DATA));
    for (const author of INVENTED_REVIEW_AUTHORS) expect(src).not.toContain(author);
    // The companion rows were the only `author:` payloads in the file. Yatra
    // package reviews use a `name:` field (see `YatraReview`), so a surviving
    // `author:` outside the interface declaration means a row came back.
    const authorPayloads = (src.match(/author:\s*'/g) ?? []).length;
    expect(authorPayloads).toBe(0);
  });

  it('asserts no verification a check never performed', () => {
    // The exact literal the finding is about: three government/medical
    // verification claims hardcoded to true for a person who does not exist.
    const src = stripComments(read(YATRA_DATA));
    expect(src).not.toMatch(/verified:\s*\{/);
    expect(src).not.toMatch(/aadhaar:\s*true/);
    expect(src).not.toMatch(/background:\s*true/);
    expect(src).not.toMatch(/medical:\s*true/);
  });

  it('no longer advertises a roster size in its own section header', () => {
    // `lib/yatra-data.ts:643` — "TRAVEL COMPANIONS — 8 verified profiles".
    expect(read(YATRA_DATA)).not.toMatch(/8 verified profiles/);
    expect(read(YATRA_DATA)).not.toMatch(/8 companions/);
  });
});

describe('TC-06 — the deletion did not touch the rest of yatra-data', () => {
  // Seven routes import from this module (/yatra, /yatra/[slug],
  // /yatra/[slug]/book, /yatra/book, /yatra/plan, /profile/yatra-bookings,
  // and the companion pages). Removing the companion block must not disturb
  // any of them, so pin the surviving surface rather than trusting a diff.
  it('still exports every non-companion symbol its importers use', () => {
    for (const key of [
      'yatras',
      'sacredSites',
      'getYatraBySlug',
      'formatINR',
      'durationBuckets',
      'budgetBuckets',
      'regionOptions',
    ]) {
      expect(Object.keys(yatraData)).toContain(key);
    }
  });

  it('still carries the nine yatra packages and the sacred-site list', () => {
    expect(yatraData.yatras.length).toBeGreaterThanOrEqual(9);
    expect(yatraData.sacredSites.length).toBeGreaterThanOrEqual(30);
    // Slug resolution is what /yatra/[slug] and /yatra/[slug]/book depend on.
    for (const y of yatraData.yatras) {
      expect(yatraData.getYatraBySlug(y.slug)).toBe(y);
    }
  });

  it('keeps the TravelCompanion shape, which lib/companion-roster.ts imports', () => {
    // A type is not a claim that anyone exists. It is the contract a real,
    // recruited row must satisfy, and deleting it would break the roster
    // module that replaced the fixture.
    expect(read(YATRA_DATA)).toMatch(/export interface TravelCompanion/);
  });
});

describe('TC-06 — nothing publishes a companion', () => {
  it('has an empty published roster, so no profile carries any flag at all', () => {
    expect(publishedCompanions).toEqual([]);
  });

  it('resolves none of the invented ids', () => {
    for (const id of INVENTED_IDS) {
      expect(getPublishedCompanionById(id)).toBeUndefined();
    }
  });

  it('never publishes a verification flag or a testimonial without a source', () => {
    // The rule for the day a real companion is added: a `verified` flag may be
    // true only for a check Darshya actually performed, and a review may exist
    // only if a yatri wrote it — which means `reviewCount` must equal the
    // number of review rows, and `rating` must be their mean, never a literal.
    for (const c of publishedCompanions) {
      expect(c.reviewCount).toBe(c.reviews.length);
      if (c.reviews.length === 0) {
        expect(c.rating).toBe(0);
      } else {
        const mean = c.reviews.reduce((s, r) => s + r.rating, 0) / c.reviews.length;
        expect(c.rating).toBeCloseTo(mean, 5);
      }
    }
  });
});

describe('TC-06 — /yatra/companion renders no uncounted number', () => {
  it('shows a star rating only for a companion who has actually been reviewed', () => {
    // The detail page already gated its rating on `c.reviewCount > 0`; the
    // listing card did not, so a freshly-listed real companion would render
    // "0.0 (0)" stars — a rating nobody gave.
    const src = stripComments(read(LISTING));
    if (/c\.rating\.toFixed/.test(src)) {
      expect(src).toMatch(/c\.reviewCount > 0/);
    }
  });

  it('reads the roster module, never the fixture', () => {
    const src = stripComments(read(LISTING));
    expect(src).toMatch(/publishedCompanions/);
    expect(src).not.toMatch(/from '\.\.\/\.\.\/\.\.\/lib\/yatra-data'[\s\S]*companions/);
    for (const name of INVENTED_NAMES) expect(src).not.toContain(name);
  });
});

describe('TC-06 — /yatra/companion/[id] renders no uncounted number', () => {
  it('shows no verification pill that reads nothing', () => {
    // The profile header printed an unconditional green "Verified" pill next
    // to the person's name. It was not derived from `c.verified` or from
    // anything else — it was typed into the JSX and rendered for every id that
    // resolved. The three pills below it at least read the data.
    const src = stripComments(read(DETAIL));
    const uncomputedPills = src.match(/<BadgeCheck[^>]*\/>\s*Verified/g) ?? [];
    expect(uncomputedPills).toEqual([]);
  });

  it('synthesises no availability calendar', () => {
    // The "30-day availability" grid coloured each of thirty squares green or
    // pink from `i % 7 > 4` / `i % 3 !== 0` — a booking calendar generated from
    // the loop index. No booking exists to read: Yatra has no Prisma model.
    const src = stripComments(read(DETAIL));
    expect(src).not.toMatch(/30-day availability/);
    expect(src).not.toMatch(/availability === 'busy'/);
    expect(src).not.toMatch(/setDate\(today\.getDate\(\)/);
  });

  it('quotes no discount nobody agreed to', () => {
    // A three-tier ladder gave 5% off a "medium" yatra and 10% off a "long"
    // one, then printed the discounted day rate as a price. Neither the
    // percentages nor the resulting figure came from any pricing source.
    const src = stripComments(read(DETAIL));
    expect(src).not.toMatch(/discount:\s*\d/);
    expect(src).not.toMatch(/multiplier/);
  });

  it('still 404s rather than resolving anything from the fixture', () => {
    const src = stripComments(read(DETAIL));
    expect(src).toMatch(/getPublishedCompanionById/);
    expect(src).toMatch(/notFound\(\)/);
    expect(src).not.toMatch(/getCompanionById/);
  });
});
