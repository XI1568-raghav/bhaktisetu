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
    expect(code('app/pujas/page.tsx')).not.toMatch(/weddings/i);
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

  it('no funnel surface invents a ₹500/month cow tier', () => {
    for (const rel of ['components/home/WorshipStrip.tsx', 'components/home/IntentTrio.tsx']) {
      expect(code(rel)).not.toMatch(/₹\s?500\s*(a|\/)\s*month/i);
    }
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
