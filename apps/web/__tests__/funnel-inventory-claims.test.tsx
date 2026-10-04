import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';

/**
 * CM-11 + DF-05 (prod sweep 2026-08-12) — the homepage funnel advertised
 * inventory it does not have.
 *
 * Live Postgres darshya_utf8 on 2026-08-13:
 *   select count(*) from temples                -> 20   (all is_verified = true)
 *   select count(*) from priests                -> 3
 *   select count(*) from puja_types             -> 10
 *   select count(*) from puja_bookings          -> 102, of which 0 are weddings
 *
 * The shipped strings were "200+ verified temples", "500+ vetted pandits",
 * "Watch live aarti from 200+ temples" (x2 components + /waitlist) and
 * "1,500+ weddings". Every one is roughly an order of magnitude above reality
 * and none of them was wired to a data source, so they could only ever be
 * right by coincidence.
 *
 * The rule this locks: a funnel surface may print an inventory number ONLY if
 * a server-side count produced it. When the count is unavailable the copy
 * must degrade to a claim with no digits in it — never to a remembered
 * marketing figure. Same doctrine as lib/social-proof.ts.
 */

const WEB = path.resolve(__dirname, '..');

/** Read a source file with comments stripped, so a comment documenting a
 *  banned claim cannot trip the guard that bans it. */
function code(rel: string): string {
  return fs
    .readFileSync(path.join(WEB, rel), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
}

/** "200+", "1,500+", "500 plus" — an unsourced inventory boast. */
const INFLATED = /\b\d{1,3}(,\d{3})*\s*\+/;

/**
 * The six supply-acquisition landers. Same list as
 * __tests__/supply-page-claims.test.ts, kept in step deliberately: a claim
 * that is false on one of these is false on all of them.
 */
const SUPPLY_PAGES = [
  'app/become-priest/page.tsx',
  'app/become-astrologer/page.tsx',
  'app/become-wellness/page.tsx',
  'app/become-gurukul/page.tsx',
  'app/list-temple/page.tsx',
  'app/list-gaushala/page.tsx',
].filter((p) => fs.existsSync(path.join(WEB, p)));

afterEach(() => {
  vi.resetModules();
});

describe('CM-11 — homepage trust numbers are counts, not string literals', () => {
  const FUNNEL_SOURCES = [
    'components/home/TrustStrip.tsx',
    'components/home/IntentTrio.tsx',
    'components/home/WorshipStrip.tsx',
    'app/waitlist/page.tsx',
  ];

  for (const rel of FUNNEL_SOURCES) {
    it(`${rel} hardcodes no inflated inventory figure`, () => {
      expect(code(rel)).not.toMatch(INFLATED);
    });
  }

  it('no funnel surface claims a pandit headcount — the database holds 3', () => {
    for (const rel of FUNNEL_SOURCES) {
      expect(code(rel)).not.toMatch(/\d+\s*\+?\s*(vetted|verified)\s+pandits/i);
    }
  });
});

describe('DF-05 — wedding volume claim removed (zero completed weddings)', () => {
  it('the /pujas marriage banner does not claim 1,500+ weddings', () => {
    expect(code('app/pujas/(index)/page.tsx')).not.toMatch(/weddings/i);
  });

  it('the /pujas/marriage hero does not claim 1,500+ weddings', () => {
    expect(code('app/pujas/marriage/page.tsx')).not.toMatch(INFLATED);
  });

  it('the home-puja landing does not claim 500+ pujas completed', () => {
    expect(code('app/pujas/home-puja/page.tsx')).not.toMatch(/\d+\s*\+\s*pujas completed/i);
  });
});

describe('DF-06 — the homepage cow-adoption price matches the /gaushala ladder', () => {
  it('the Worship rail quotes no price the plan table does not offer', async () => {
    const { GAUSHALA_PLANS, GAUSHALA_ENTRY_PLAN, GAUSHALA_ENTRY_CLAIM } = await import(
      '../lib/gaushala-plans'
    );
    const strip = code('components/home/WorshipStrip.tsx');
    const gaushalaCard = strip.slice(strip.indexOf("href: '/gaushala'"));
    const cardBody = gaushalaCard.slice(0, gaushalaCard.indexOf('cta:'));

    // The card must not retype a price at all — it interpolates the ladder.
    expect(cardBody).not.toMatch(/₹[\d,]+/);
    expect(cardBody).toContain('GAUSHALA_ENTRY_CLAIM');
    expect(GAUSHALA_PLANS.some((p) => p.price === GAUSHALA_ENTRY_PLAN.price)).toBe(true);
    expect(GAUSHALA_ENTRY_PLAN.price).toBe('₹51');
    expect(GAUSHALA_ENTRY_CLAIM).toBe('from ₹51 a day');
  });

  it('the ladder in lib matches the plans /gaushala actually renders', async () => {
    const { GAUSHALA_PLANS } = await import('../lib/gaushala-plans');
    const page = code('app/gaushala/page.tsx');
    for (const plan of GAUSHALA_PLANS) {
      // The page writes the rupee sign as an escaped ₹ literal.
      const asEscaped = plan.price.replace('₹', '\\u20B9');
      expect(page.includes(plan.price) || page.includes(asEscaped)).toBe(true);
      expect(page).toContain(plan.id);
    }
  });

  /**
   * TC-12 — this guard used to loop over WorshipStrip and IntentTrio only, so
   * it could not see the SUPPLY side of the same funnel. app/list-gaushala
   * was telling gaushala owners "Devotees can subscribe to ₹500/month 'feed a
   * cow' plans" four months after DF-06 established that no such tier exists.
   * The demand-side claim and the supply-side claim are the same false fact
   * pointed at two different audiences, and the supply one is arguably worse:
   * a gaushala signs up on the strength of a product feature that was never
   * built.
   */
  it('no demand OR supply surface invents a ₹500/month cow tier', () => {
    for (const rel of [
      'components/home/WorshipStrip.tsx',
      'components/home/IntentTrio.tsx',
      ...SUPPLY_PAGES,
    ]) {
      expect(code(rel), `${rel} quotes a monthly cow tier the ladder does not offer`).not.toMatch(
        /₹\s?500\s*(a|\/)\s*month/i,
      );
    }
  });

  it('the /list-gaushala pitch quotes prices the ladder actually holds', async () => {
    const { GAUSHALA_PLANS } = await import('../lib/gaushala-plans');
    const src = code('app/list-gaushala/page.tsx');
    const quoted = src.match(/₹\s?[\d,]+/g) ?? [];
    const known = new Set(GAUSHALA_PLANS.map((p) => p.price.replace(/\s/g, '')));
    for (const q of quoted) {
      expect(known.has(q.replace(/\s/g, '')), `${q} is not a tier /gaushala offers`).toBe(true);
    }
  });
});

/**
 * TC-12 — the supply-acquisition pages promised an audience size and a
 * settlement date.
 *
 * app/list-temple carried "Live darshan to 10,000+ devotees", "Reach 10,000+
 * devotees on Darshya" and "Settlements within 7 days". Those are already
 * gone (every surviving match in that file is a comment recording the
 * removal, and __tests__/trust-copy-lane.tc01-tc13.test.tsx pins it), but
 * nothing stopped the same two claims reappearing on the other five supply
 * pages.
 *
 * __tests__/supply-page-claims.test.ts, which does cover all six, cannot
 * catch either: its headcount regex enumerates supply nouns (pandits,
 * temples, astrologers…) and omits "devotees" entirely — and would not match
 * "10,000+" across the comma even if it did — while its payout regex covers
 * only /every Monday/ and /(earn|get paid|paid) weekly/, not a settlement
 * window stated in days. These two close that gap.
 *
 * Both read comment-stripped source, so the explanatory block at the top of
 * app/list-temple/page.tsx — which quotes the banned strings verbatim in
 * order to record why they went — does not trip the guard that bans them.
 */
describe('TC-12 — no supply page promises an audience or a settlement date', () => {
  /** "10,000+ devotees", "reach 5000 devotees". */
  const DEVOTEE_AUDIENCE = /\b\d[\d,]*\s*\+?\s*(verified\s+)?devotees\b/i;

  /** "Settlements within 7 days", "7-day settlement", "settled in 48 hours". */
  const SETTLEMENT_WINDOW =
    /(settle\w*\s+(with)?in\s+\d|\b\d+\s*-\s*(day|hour|week)\s+settlement|\bpayouts?\s+(with)?in\s+\d)/i;

  it.each(SUPPLY_PAGES)('%s claims no devotee audience size', (rel) => {
    expect(code(rel)).not.toMatch(DEVOTEE_AUDIENCE);
  });

  it.each(SUPPLY_PAGES)('%s promises no fixed settlement window', (rel) => {
    expect(code(rel)).not.toMatch(SETTLEMENT_WINDOW);
  });

  it('the guards have teeth — they flag the strings that actually shipped', () => {
    expect('Live darshan to 10,000+ devotees').toMatch(DEVOTEE_AUDIENCE);
    expect('Reach 10,000+ devotees on Darshya').toMatch(DEVOTEE_AUDIENCE);
    expect('Settlements within 7 days.').toMatch(SETTLEMENT_WINDOW);
    expect('7-day settlement').toMatch(SETTLEMENT_WINDOW);
    // ...and do not flag the honest copy that replaced them.
    expect('Devotees book pujas with you directly').not.toMatch(DEVOTEE_AUDIENCE);
    expect('Payouts are released once your Aadhaar is verified').not.toMatch(SETTLEMENT_WINDOW);
  });
});

/**
 * The homepage itself was never in the CM-11 sweep.
 *
 * FUNNEL_SOURCES above lists the three home COMPONENTS plus /waitlist, and the
 * rule it locks — "a funnel surface may print an inventory number ONLY if a
 * server-side count produced it" — was applied to each of them. `app/page.tsx`,
 * the page that mounts them, was never scanned, and it carries an inventory
 * number of its own: the astrology card's fourth tile is
 * `<p data-counter data-counter-target="15+">15+</p><p>Astrologers</p>`, a
 * count-up animation that reads as a live metric.
 *
 * Fifteen is not an approximation of anything. It is the size of the in-memory
 * astrologer fixture, and AW-02 spent a whole pass removing it: its test header
 * is titled "the LAST door that still sold the 15 invented astrologers" and it
 * rebound the directory, the profile page, the reviews endpoint, the booking
 * endpoint and the Expo app's only astrologer source onto real supply — three
 * approved profiles. Every door but this one. The homepage kept advertising the
 * fixture's headcount at five times the real roster.
 *
 * The correction is the one lib/platform-stats.ts already prescribes for the
 * pandit headcount, and for the same reason: "Three seeded priests is a true
 * number that reads as an empty marketplace, and the honest move on a trust
 * strip is to make a claim that is not about volume at all." So the tile makes
 * a claim about vetting instead of volume, and this guard keeps any headcount
 * from returning to it.
 *
 * WHY THIS SCANS TAG-STRIPPED PROSE. In JSX the number and the noun it counts
 * live in different elements, so an adjacency regex over raw source cannot see
 * "15+ Astrologers" at all. `prose()` strips comments first (via `code()`) and
 * then tags, which is also what keeps the block you are reading — and the
 * explanatory JSX comment left in app/page.tsx — from tripping the guard that
 * bans the string they both quote.
 */
describe('CM-11 — the homepage prints no inventory number of its own', () => {
  /** `code()` with JSX tags removed, so text split across elements reads as text. */
  function prose(rel: string): string {
    return code(rel)
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ');
  }

  /** "15+ Astrologers", "200+ verified temples", "500 + pandits". */
  const HEADCOUNT =
    /\b\d[\d,]*\s*\+\s*(?:verified\s+|vetted\s+)?(astrologers?|pandits?|priests?|temples?|devotees?|gaushalas?|instructors?|gurukuls?)\b/i;

  it('app/page.tsx claims no supply headcount', () => {
    expect(
      prose('app/page.tsx'),
      'the homepage prints a supply headcount nothing counted',
    ).not.toMatch(HEADCOUNT);
  });

  it('nor does any of the components it mounts', () => {
    for (const rel of ['components/home/TrustStrip.tsx', 'components/home/IntentTrio.tsx', 'components/home/WorshipStrip.tsx']) {
      expect(prose(rel), rel).not.toMatch(HEADCOUNT);
    }
  });

  it('the guard has teeth — it flags the tile that actually shipped', () => {
    // Exactly the shape the astrology card rendered, tags and all.
    expect(prose_of('<p data-counter data-counter-target="15+">15+</p><p>Astrologers</p>')).toMatch(
      HEADCOUNT,
    );
    expect(prose_of('<span>200+</span> <span>verified temples</span>')).toMatch(HEADCOUNT);
    // ...and does not flag a claim about vetting rather than volume, which is
    // what replaced it. A guard that failed on the corrected text would force
    // the bug back in.
    expect(prose_of('<p>Verified</p><p>Astrologers</p>')).not.toMatch(HEADCOUNT);
    expect(prose_of('<p>Aadhaar-verified pandits</p>')).not.toMatch(HEADCOUNT);
    // A real, counted figure rendered from a variable is not a literal and
    // cannot match — that is the whole point of the CM-11 rule.
    expect(prose_of('<p>{verifiedTempleClaim(counts.verifiedTemples)}</p>')).not.toMatch(HEADCOUNT);
  });

  /** The same tag-strip applied to a literal, for the teeth cases above. */
  function prose_of(src: string): string {
    return src.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
  }
});

/**
 * TC-12, the other half: a supply page may not quote a RESULT it never measured.
 *
 * The existing guards cover what a supply page promises to PAY (no weekly bank
 * credit, no settlement window) and what it claims to HAVE (no headcount, no
 * devotee audience). Neither covers what it claims the provider will EARN by
 * joining, and app/list-gaushala carried exactly that: "Verified badge boosts
 * donor conversion 3-4x."
 *
 * There is no such measurement. The gaushala donation rail has processed no
 * donations, so no verified-badge cohort has ever been compared with an
 * unverified one — the multiplier is a number typed to make registering look
 * worth it, aimed at trusts that will hand over a PAN and an 80G certificate on
 * the strength of it. Same defect as the Rs 500 tier two benefit cards above
 * it, one abstraction up: not a feature that does not exist, but a result that
 * was never obtained.
 */
describe('TC-12 — no supply page quotes a conversion lift nobody measured', () => {
  /** "boosts donor conversion 3-4x", "increases bookings by 40%", "doubles ... 2x". */
  const UNMEASURED_LIFT =
    /\b(boosts?|boosting|increases?|lifts?|improves?|doubles?|triples?|grows?)\b[^.!?]{0,60}?\b\d+(?:\s*[-–]\s*\d+)?\s*(?:x\b|×|%)/i;

  /** "3x more donors", "2x higher". */
  const BARE_MULTIPLIER = /\b\d+(?:\s*[-–]\s*\d+)?\s*(?:x\b|×)\s*(?:more|higher|better|faster)\b/i;

  it.each(SUPPLY_PAGES)('%s quotes no unmeasured performance lift', (rel) => {
    const src = code(rel);
    expect(src, `${rel} quotes a result the platform has never measured`).not.toMatch(
      UNMEASURED_LIFT,
    );
    expect(src, `${rel} quotes a bare multiplier`).not.toMatch(BARE_MULTIPLIER);
  });

  it('the guard has teeth, and spares the claims that are true', () => {
    expect('Verified badge boosts donor conversion 3-4×.').toMatch(UNMEASURED_LIFT);
    expect('Verified badge boosts donor conversion 3-4x.').toMatch(UNMEASURED_LIFT);
    expect('Listing increases your bookings by 40%.').toMatch(UNMEASURED_LIFT);
    expect('3x more donors').toMatch(BARE_MULTIPLIER);
    // The flat 80% provider share is the shipped commercial term, not a boast.
    expect('Earn 80% of every booking').not.toMatch(UNMEASURED_LIFT);
    expect('You keep 80% of the fee; Darshya keeps 20%.').not.toMatch(UNMEASURED_LIFT);
    // A badge described by what it IS rather than by what it lifts.
    expect('Submit registration + 80G certificate once. Donors see a verified badge on your listing.').not.toMatch(
      UNMEASURED_LIFT,
    );
  });
});

describe('lib/platform-stats — counts are parsed strictly or not at all', () => {
  it('reads the total off a paginated temples payload', async () => {
    const { templeTotalFromPayload } = await import('../lib/platform-stats');
    expect(templeTotalFromPayload({ pagination: { total: 20 } })).toBe(20);
  });

  it('refuses a non-integer, a negative and a numeric string', async () => {
    const { templeTotalFromPayload } = await import('../lib/platform-stats');
    expect(templeTotalFromPayload({ pagination: { total: 20.5 } })).toBeNull();
    expect(templeTotalFromPayload({ pagination: { total: -1 } })).toBeNull();
    expect(templeTotalFromPayload({ pagination: { total: '200' } })).toBeNull();
    expect(templeTotalFromPayload({ pagination: { total: NaN } })).toBeNull();
    expect(templeTotalFromPayload(null)).toBeNull();
    expect(templeTotalFromPayload({})).toBeNull();
  });

  it('counts distinct live-darshan temples off the streams payload', async () => {
    const { liveDarshanTempleCountFromPayload } = await import('../lib/platform-stats');
    expect(
      liveDarshanTempleCountFromPayload({
        streams: [
          { temple: { slug: 'kashi-vishwanath-varanasi' } },
          { temple: { slug: 'kashi-vishwanath-varanasi' } },
          { temple: { slug: 'somnath' } },
        ],
      }),
    ).toBe(2);
    expect(liveDarshanTempleCountFromPayload({ streams: [] })).toBeNull();
    expect(liveDarshanTempleCountFromPayload('nope')).toBeNull();
  });

  it('a failed fetch yields nulls, never a remembered number', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('API down');
      }),
    );
    const { getPlatformCounts } = await import('../lib/platform-stats');
    const counts = await getPlatformCounts();
    expect(counts.verifiedTemples).toBeNull();
    expect(counts.liveDarshanTemples).toBeNull();
    vi.unstubAllGlobals();
  });

  it('formats a known count exactly and drops the digits when unknown', async () => {
    const { verifiedTempleClaim, liveDarshanClaim } = await import('../lib/platform-stats');
    expect(verifiedTempleClaim(20)).toBe('20 verified temples');
    expect(verifiedTempleClaim(1)).toBe('1 verified temple');
    expect(verifiedTempleClaim(null)).not.toMatch(/\d/);
    expect(liveDarshanClaim(17)).toMatch(/\b17 temples\b/);
    expect(liveDarshanClaim(null)).not.toMatch(/\d/);
  });
});

describe('TrustStrip renders the count it is given and nothing when it has none', () => {
  it('prints the real temple count', async () => {
    const { default: TrustStrip } = await import('../components/home/TrustStrip');
    render(<TrustStrip verifiedTemples={20} />);
    expect(screen.getByText('20 verified temples')).toBeInTheDocument();
  });

  it('prints no inventory figure at all when the count is unavailable', async () => {
    const { default: TrustStrip } = await import('../components/home/TrustStrip');
    const { container } = render(<TrustStrip verifiedTemples={null} />);
    const text = container.textContent ?? '';
    // "80G receipt available" is a statutory term, not an inventory boast, so
    // the assertion targets counted nouns rather than every digit on screen.
    expect(text).not.toMatch(/\d[\d,]*\s*\+?\s*(verified\s+|vetted\s+)?(temples?|pandits?|priests?)/i);
    expect(text).not.toMatch(INFLATED);
  });
});
