/**
 * Trust-copy lane — TC-01, TC-03, TC-04, TC-08, TC-12, TC-13.
 *
 * One rule across all six findings: a sentence may be published only if
 * something in the product performs what it says. Where nothing does, the
 * honest fix is to stop making the claim, and every deletion here is gated on
 * the owner-controlled flag that will bring it back rather than hardcoded out.
 *
 * The gates, and why each claim was false when it shipped:
 *
 *  80G   `COMPANY.donationLegal.HAS_80G_VERIFIED` is false, `eightyGNumber`
 *        and `pan` are both null, and apps/api/src/lib/pdf-receipt.ts stamps
 *        every receipt "Proof of donation — not a tax exemption certificate"
 *        because `is80GEligible()` needs a donee registration number AND a
 *        PAN, and `gaushala_profiles.regn_80g` / `.pan` are read in one place
 *        and written nowhere.
 *
 *  SKU   `nri_premium_yearly` is withdrawn. All six benefits carry
 *        `enforcedBy: null` in apps/api/src/services/subscription-entitlements.ts,
 *        so `nriPremiumIsSellable()` is false, `getPlans()` filters the plan
 *        out and both activation rails answer 400.
 *        `app/nri/plan-availability.ts` mirrors that fact for the web app and
 *        is drift-tested against the API source by
 *        `tc03-nri-plan-availability.test.tsx`.
 *
 *  VET   There is no pandit vetting pipeline. `Priest.isVerified`,
 *        `.verificationStatus` and `.aadhaarVerified` have no writer outside
 *        apps/api/prisma/seed.ts; `.aadhaarVerified` is read in exactly one
 *        place, payment.service.ts, as a PAYOUT gate. No credential upload, no
 *        reference workflow, no probation job, no trust-score column.
 *
 *  PAY   `payout.service` refuses every withdrawal until an admin sets
 *        `provider_kyc.verified`, and the bank transfer itself is manual on a
 *        rail (RazorpayX/Cashfree) that is not enabled.
 *
 * Assertions run against RENDERED text and against real exported objects
 * wherever possible. Where a source scan is unavoidable, comments are stripped
 * FIRST — several of the files below have to quote the claim they removed in
 * order to explain why, and a raw scan would match its own documentation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { COMPANY } from '../lib/company';
import { FAQ_GROUPS, allFaqs } from '../lib/faqs';
import { brandFaqJsonLd, nriPremiumServiceJsonLd } from '../lib/jsonld';
import {
  NRI_PREMIUM_IS_SELLABLE,
  NRI_PREMIUM_WITHDRAWN_NOTICE,
} from '../app/nri/plan-availability';
import { PAYOUT_TIMING_SHORT, PRICING_FAQS } from '../app/pricing/faqs';

const WEB = resolve(__dirname, '..');
const read = (rel: string) => readFileSync(resolve(WEB, rel), 'utf8');

/** Source with block and line comments removed. */
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1');

const code = (rel: string) => stripComments(read(rel));

const textOf = (node: React.ReactElement) => render(node).container.textContent ?? '';
const textOfAsync = async (node: Promise<React.ReactElement>) =>
  render(await node).container.textContent ?? '';

/** The flag every 80G claim on the site is gated on. */
const VERIFIED_COMPANY = {
  ...COMPANY,
  donationLegal: {
    ...COMPANY.donationLegal,
    HAS_80G_VERIFIED: true,
    eightyGNumber: 'AAATS1234QF20214',
    pan: 'AAATS1234Q',
  },
};

afterEach(() => {
  cleanup();
  vi.resetModules();
  vi.doUnmock('../lib/company');
  vi.unstubAllGlobals();
});

describe('the premise — every gate this lane relies on is still shut', () => {
  it('no 80G registration is on file', () => {
    expect(COMPANY.donationLegal.HAS_80G_VERIFIED).toBe(false);
    expect(COMPANY.donationLegal.eightyGNumber).toBeNull();
    expect(COMPANY.donationLegal.pan).toBeNull();
  });

  it('NRI Premium is withdrawn from sale', () => {
    expect(NRI_PREMIUM_IS_SELLABLE).toBe(false);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// TC-01 — structured data
// ───────────────────────────────────────────────────────────────────────────

describe('TC-01 — lib/jsonld.ts publishes no 80G deduction promise', () => {
  it('the brand FAQ graph carries no 80G assertion at all', () => {
    // Five lines in this file promised a deduction to the one reader that
    // matters most for a tax claim: Google. brandFaqJsonLd is emitted verbatim
    // on / and /about, with no page-level sanitiser in front of it.
    expect(JSON.stringify(brandFaqJsonLd)).not.toMatch(/80G/i);
  });

  it('it no longer states that receipts use a real PAN and donee 80G number', () => {
    const payload = JSON.stringify(brandFaqJsonLd);
    expect(payload).not.toMatch(/80G receipts use real PAN/i);
    // Same sentence, the other half: a public Aadhaar credential check that
    // does not exist (TC-08).
    expect(payload).not.toMatch(/Priests are Aadhaar-verified/i);
    expect(payload).toMatch(/payout gate rather than a public credential check/i);
  });

  it('it no longer offers USD donation — the Stripe rail was removed', () => {
    expect(JSON.stringify(brandFaqJsonLd)).not.toMatch(/donate in USD/i);
    expect(JSON.stringify(brandFaqJsonLd)).toMatch(/billed in INR through Razorpay/i);
  });

  it('the NRI Premium Service says what a receipt is instead of selling 80G', () => {
    expect(nriPremiumServiceJsonLd.description).not.toMatch(/free 80G receipts/i);
    expect(nriPremiumServiceJsonLd.description).toMatch(
      /not an 80G tax-exemption certificate/i,
    );
  });

  it('restores every 80G sentence the day the owner sets the verified flag', async () => {
    vi.doMock('../lib/company', () => ({ COMPANY: VERIFIED_COMPANY }));
    vi.resetModules();
    const jsonld = await import('../lib/jsonld');
    expect(JSON.stringify(jsonld.brandFaqJsonLd)).toMatch(/80G/i);
    expect(jsonld.nriPremiumServiceJsonLd.description).toMatch(/80G receipt PDF/i);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// TC-04 — the Offer for a plan the API refuses to sell
// ───────────────────────────────────────────────────────────────────────────

describe('TC-04 — no in-stock Offer for a withdrawn plan', () => {
  it('the Service object publishes no offers array while the plan is withdrawn', () => {
    expect(NRI_PREMIUM_IS_SELLABLE).toBe(false);
    expect(nriPremiumServiceJsonLd).not.toHaveProperty('offers');
    expect(JSON.stringify(nriPremiumServiceJsonLd)).not.toContain('5000');
    expect(JSON.stringify(nriPremiumServiceJsonLd)).not.toContain('schema.org/InStock');
  });

  it('the description says the tier is not sold rather than describing benefits', () => {
    expect(nriPremiumServiceJsonLd.description).toMatch(/not currently sold/i);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// TC-03 / TC-04 — /upgrade
// ───────────────────────────────────────────────────────────────────────────

vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    isLoading: false,
    session: { accessToken: 'test-token' },
    user: { id: 'u1', fullName: 'Test Devotee', email: 'd@x.test' },
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('../components/AuthGuard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('TC-03 / TC-04 — /upgrade offers no buy click on a withdrawn plan', () => {
  async function renderUpgrade(): Promise<string> {
    const { default: UpgradePage } = await import('../app/upgrade/page');
    const { container } = render(<UpgradePage />);
    const text = container.textContent ?? '';
    // A silently empty tree would make every negative assertion vacuous.
    expect(text.length).toBeGreaterThan(300);
    return text;
  }

  it('renders no NRI Premium card, and no button that would 400', async () => {
    const text = await renderUpgrade();
    expect(text).not.toMatch(/NRI Premium/i);
    expect(text).not.toMatch(/Go Premium/i);
    expect(screen.queryByRole('button', { name: /go premium/i })).toBeNull();
  });

  it('drops the six unenforced benefits with it, including the 80G one', async () => {
    const text = await renderUpgrade();
    expect(text).not.toMatch(/Free 80G receipt PDF/i);
    expect(text).not.toMatch(/Weekly 1:1 priest call/i);
    expect(text).not.toMatch(/No NRI surcharge on bookings/i);
    expect(text).not.toMatch(/₹5000/);
  });

  it('keeps every plan the product can actually sell', async () => {
    const text = await renderUpgrade();
    expect(text).toMatch(/Single Session/);
    expect(text).toMatch(/Monthly Unlimited/);
    expect(text).toMatch(/₹499/);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// TC-13 / TC-01 — lib/faqs.ts, which faqPageJsonLd() syndicates
// ───────────────────────────────────────────────────────────────────────────

describe('TC-13 — /faqs sells only what exists', () => {
  const answers = () => allFaqs().map((f) => `${f.q} ${f.a}`).join('\n');

  it('publishes no 80G claim of any shape while the registration is missing', () => {
    expect(answers()).not.toMatch(/80G/i);
    expect(FAQ_GROUPS.map((g) => g.description).join(' ')).not.toMatch(/80G/i);
  });

  it('restores the 80G answer the day the owner sets the verified flag', async () => {
    vi.doMock('../lib/company', () => ({ COMPANY: VERIFIED_COMPANY }));
    vi.resetModules();
    const { allFaqs: gated } = await import('../lib/faqs');
    expect(gated().map((f) => `${f.q} ${f.a}`).join('\n')).toMatch(/80G/i);
  });

  it('sells no ₹199 Premium darshan plan — no such SKU exists on any rail', () => {
    // The devotee SKUs are astro_session (₹99), astro_monthly (₹499) and the
    // withdrawn nri_premium_yearly. None of them touches darshan.
    expect(answers()).not.toMatch(/₹\s?199/);
    expect(answers()).not.toMatch(/\$9\s?\/\s?month/);
    expect(answers()).not.toMatch(/part of our Premium plan/i);
    expect(answers()).not.toMatch(/Premium subscribers/i);
  });

  it('mentions the three fictional darshan features only to deny them', () => {
    // The honest answer names what does NOT exist, so a blanket ban on the
    // nouns would forbid the correction as well as the claim. Every sentence
    // that names one has to be a denial.
    const sentences = answers().split(/(?<=[.!?])\s+/);
    const named = sentences.filter((s) =>
      /recorded[- ]aarti|multi-camera|HD download/i.test(s),
    );
    expect(named.length, 'the denial sentence disappeared').toBeGreaterThan(0);
    for (const sentence of named) {
      expect(sentence, `not a denial: "${sentence}"`).toMatch(/\bno\b|\bnot\b/i);
    }
  });

  it('claims no download entitlement — there is no download feature', () => {
    expect(answers()).not.toMatch(/download aarti recordings/i);
    expect(answers()).not.toMatch(/Premium subscribers can download/i);
  });

  it('quotes no live-darshan temple count it cannot count', () => {
    const darshan = FAQ_GROUPS.find((g) => g.slug === 'live-darshan');
    expect(darshan).toBeDefined();
    const text = darshan!.faqs.map((f) => f.a).join(' ');
    expect(text).not.toMatch(/25\+/);
    expect(text).not.toMatch(/\d+\+\s*(other\s+)?(major\s+)?temples/i);
    // Mahakaleshwar has no row in apps/api/prisma/seed/darshan-streams.ts.
    expect(text).not.toMatch(/Mahakaleshwar/i);
    // The temples it does name must all have a stream seeded.
    const streams = readFileSync(
      resolve(WEB, '../api/prisma/seed/darshan-streams.ts'),
      'utf8',
    );
    for (const slug of [
      'kashi-vishwanath-varanasi',
      'tirumala-tirupati',
      'siddhivinayak-mumbai',
      'somnath-gujarat',
      'jagannath-puri',
    ]) {
      expect(streams, `named temple ${slug} has no seeded stream`).toContain(slug);
    }
  });

  it('answers the NRI membership question with the server withdrawal notice', () => {
    const faq = allFaqs().find((f) => /annual NRI membership/i.test(f.q));
    expect(faq).toBeDefined();
    expect(faq!.a).toContain(NRI_PREMIUM_WITHDRAWN_NOTICE);
    expect(faq!.a).not.toMatch(/₹5,000/);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// TC-08 — the pandit vetting process that does not run
// ───────────────────────────────────────────────────────────────────────────

/**
 * The canonical honest wording. It ships at
 * app/temples/[slug]/pujas/page.tsx (pinned there by
 * pandit-vetting-claim.tc08.test.tsx) and is reused verbatim on every other
 * surface that used to publish the fictional pipeline, so the surfaces cannot
 * drift into two different accounts of the same fact.
 */
const CANONICAL_VETTING_CLAUSE =
  'A pandit is paid only once Aadhaar-based KYC is on file, which is a payout gate rather ' +
  'than a public credential check';

const VETTING_FICTIONS: RegExp[] = [
  /verified pandits?/i,
  /certified pandits?/i,
  // Hyphen-tolerant, and widened past the noun "pandit". The wedding funnel
  // shipped every one of these variants and NONE of them matched the original
  // list: "Vedic-certified pandits" (hyphen), "Vedic-certified officiants" and
  // "verified specialists" (synonym). A fiction list that only catches the
  // exact phrasing of the first surface it was written for is a list that
  // certifies the next surface as clean.
  /vedic[-\s]certified/i,
  /certified officiants?/i,
  /verified (specialists?|officiants?|priests?)/i,
  /Vedic credential verification/i,
  /30-day video probation/i,
  /probationary first-30-day/i,
  /trust score on every pandit/i,
  /displayed trust score/i,
  /2 senior pandit refs/i,
  /5-step (KYC|verification)/i,
];

describe('TC-08 — no lane surface publishes a vetting step that does not run', () => {
  const SURFACES = [
    'lib/faqs.ts',
    'app/why-darshya/page.tsx',
    'app/nri-pujas/page.tsx',
  ];

  for (const rel of SURFACES) {
    it(`${rel} makes no unbacked pandit-vetting claim`, () => {
      const src = code(rel);
      for (const fiction of VETTING_FICTIONS) {
        expect(src, `${rel} still claims ${fiction}`).not.toMatch(fiction);
      }
    });

    it(`${rel} carries the canonical honest wording instead`, () => {
      expect(code(rel)).toContain(CANONICAL_VETTING_CLAUSE);
    });
  }

  it('the canonical wording is the one already shipping on the temple funnel', () => {
    // Drift guard. If the temple page is reworded, this fails and forces the
    // other three to be reworded with it rather than silently diverging.
    expect(code('app/temples/[slug]/pujas/page.tsx')).toContain(CANONICAL_VETTING_CLAUSE);
  });

  it('/why-darshya renders it, so the comparison table cannot claim otherwise', async () => {
    const WhyDarshya = (await import('../app/why-darshya/page')).default;
    const text = textOf(WhyDarshya());
    expect(text.length).toBeGreaterThan(500);
    expect(text).toContain(CANONICAL_VETTING_CLAUSE);
    expect(text).not.toMatch(/displayed trust score/i);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// TC-08 — the wedding funnel
// ───────────────────────────────────────────────────────────────────────────

/**
 * A SECOND surface list, deliberately not folded into SURFACES above.
 *
 * SURFACES requires the canonical clause verbatim, which is right for a page
 * that RAISES pandit vetting and has to answer it honestly. The three pages
 * below simply stop raising it: the wedding funnel sells a ceremony, and after
 * the fictions come out there is nothing left on it for the clause to correct.
 * Forcing a 130-character disclaimer onto a page that no longer makes the claim
 * would be the same defect pointed the other way. These are guarded by absence.
 *
 * `/pujas/marriage` was the loudest instance in the product: a static
 * `{ icon: Shield, label: 'Vedic certified' }` hero badge — no data behind it at
 * all, the same three words for every visitor — over a page quoting ₹11,000+,
 * plus "Vedic-certified pandits" in the <title> description, in the hero, in the
 * section subhead, in the empty state, and a per-card "Verified pandit" line.
 * That last one deserves its own note: `GET /priests` filters
 * `isVerified: true AND status: 'active'` (apps/api/src/routes/priests-public.ts),
 * so EVERY priest this page can receive has `isVerified === true` and the
 * ternary's false branch was unreachable — a constant rendered as a per-pandit
 * judgement. And `Priest.isVerified` has no writer outside apps/api/prisma/seed.ts:
 * admin.ts's priest route writes `commissionRate` only, and priest.service.ts
 * only ever SELECTs the column. Verified against HEAD, not taken from the note.
 */
const FICTION_FREE_SURFACES = [
  'app/pujas/marriage/page.tsx',
  'app/pujas/marriage/book/page.tsx',
  'app/pujas/home-puja/book/BookHomePujaClient.tsx',
];

describe('TC-08 — the wedding funnel claims no vetting either', () => {
  // The global afterEach unmocks lib/company only; a doMock survives
  // resetModules, so this one has to be dropped here or it leaks forward.
  afterEach(() => {
    vi.doUnmock('../lib/pandit-api');
  });

  for (const rel of FICTION_FREE_SURFACES) {
    it(`${rel} makes no unbacked pandit-vetting claim`, () => {
      // Comments FIRST: each of these files documents the claim it removed in
      // order to explain why, and a raw scan would match that documentation.
      const src = code(rel);
      for (const fiction of VETTING_FICTIONS) {
        expect(src, `${rel} still claims ${fiction}`).not.toMatch(fiction);
      }
    });
  }

  it('/pujas/marriage renders no vetting claim and no static credential badge', async () => {
    vi.doMock('../lib/pandit-api', () => ({ getPublicPriests: async () => [] }));
    vi.resetModules();
    const MarriagePage = (await import('../app/pujas/marriage/page')).default;
    const text = await textOfAsync(MarriagePage());
    // Sanity: the page mounted, so the absences below mean something.
    expect(text.length).toBeGreaterThan(1000);
    for (const fiction of VETTING_FICTIONS) {
      expect(text, `rendered /pujas/marriage still claims ${fiction}`).not.toMatch(fiction);
    }
  });

  it('its metadata sells no certification either', async () => {
    vi.doMock('../lib/pandit-api', () => ({ getPublicPriests: async () => [] }));
    vi.resetModules();
    const { metadata } = await import('../app/pujas/marriage/page');
    const meta = `${metadata.title} ${metadata.description}`;
    for (const fiction of VETTING_FICTIONS) {
      expect(meta, `/pujas/marriage metadata still claims ${fiction}`).not.toMatch(fiction);
    }
  });

  it('the per-card verification line is gone, not merely re-worded', () => {
    // The false branch was unreachable — see the block comment above. A
    // rewording that keeps the ternary keeps a constant dressed as a judgement.
    expect(code('app/pujas/marriage/page.tsx')).not.toMatch(/Profile under review/);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// TC-01 — the two rendered marketing pages in this lane
// ───────────────────────────────────────────────────────────────────────────

const liveStats = vi.hoisted(() => ({ value: { templeCount: 20, pujaTypeCount: 10 } }));
vi.mock('../lib/live-stats', () => ({ fetchPublicStats: async () => liveStats.value }));

/**
 * A promise of a deduction, in every shape these two pages shipped it.
 *
 * A blanket ban on the string "80G" is wrong here: the honest replacement has
 * to name the registration in order to say it is missing, so the ban would
 * forbid the correction along with the claim. The list below is the closed set
 * of PROMISE shapes, and the last assertion requires the denial to be present
 * — so the claim cannot pass by being silently deleted either.
 */
function expectNoDeductionPromise(text: string): void {
  expect(text).not.toMatch(/80G receipts?\b/i);
  expect(text).not.toMatch(/80G receipt PDFs?/i);
  expect(text).not.toMatch(/80G tax receipts?/i);
  expect(text).not.toMatch(/80G[-\s]eligible/i);
  expect(text).not.toMatch(/tax[-\s]compliant 80G/i);
  expect(text).not.toMatch(/PAN-validated/i);
  expect(text).not.toMatch(/eligible for Indian income-tax deduction/i);
  expect(text).not.toMatch(/80G tax-deductible/i);
  expect(text).not.toMatch(/80G receipt within \d+ days/i);
  expect(text).toMatch(/not a tax-exemption certificate|rather than a tax-exemption certificate/i);
}

describe('TC-01 — /why-darshya', () => {
  it('renders no 80G deduction promise', async () => {
    const WhyDarshya = (await import('../app/why-darshya/page')).default;
    const text = textOf(WhyDarshya());
    expect(text.length).toBeGreaterThan(1000);
    expectNoDeductionPromise(text);
    // Still describes the receipt rather than dropping the row silently.
    expect(text).toMatch(/DR-YYYYMMDD-XXXX/);
  });

  it('its metadata sells no 80G receipt', async () => {
    const { metadata } = await import('../app/why-darshya/page');
    expect(String(metadata.description)).not.toMatch(/80G/i);
  });

  it('quotes no live-darshan temple count and no paid darshan tier', async () => {
    const WhyDarshya = (await import('../app/why-darshya/page')).default;
    const text = textOf(WhyDarshya());
    // "✓ 25+ temples" against 20 seeded streams, and an "optional premium"
    // darshan tier that exists on no rail.
    expect(text).not.toMatch(/✓ 25\+ temples/);
    expect(text).not.toMatch(/free with optional premium/i);
    expect(text).not.toMatch(/Mahakaleshwar/);
  });

  it('restores the 80G row the day the owner sets the verified flag', async () => {
    vi.doMock('../lib/company', () => ({ COMPANY: VERIFIED_COMPANY }));
    vi.resetModules();
    const WhyDarshya = (await import('../app/why-darshya/page')).default;
    expect(textOf(WhyDarshya())).toMatch(/80G/i);
  });
});

describe('TC-01 — /nri-pujas', () => {
  it('renders no 80G deduction promise', async () => {
    const Page = (await import('../app/nri-pujas/page')).default;
    const text = await textOfAsync(Page());
    expect(text.length).toBeGreaterThan(1000);
    expectNoDeductionPromise(text);
    expect(text).toMatch(/DR-YYYYMMDD-XXXX/);
  });

  it('its metadata and OG card sell no 80G receipt', async () => {
    const { metadata } = await import('../app/nri-pujas/page');
    expect(String(metadata.description)).not.toMatch(/80G/i);
    expect(String(metadata.openGraph?.description)).not.toMatch(/80G/i);
  });

  it('markets no withdrawn NRI Premium tier', async () => {
    const Page = (await import('../app/nri-pujas/page')).default;
    const text = await textOfAsync(Page());
    expect(text).not.toMatch(/See NRI Premium tier/i);
  });

  it('publishes the engine cancellation ladder, not a fourth hand-typed one', async () => {
    const Page = (await import('../app/nri-pujas/page')).default;
    const text = await textOfAsync(Page());
    // The engine pays 100% at 48h+ and 75% in the 24-48h band.
    expect(text).not.toMatch(/Full refund up to 24h before/i);
    expect(text).toMatch(/75% refund 24-48h before/);
  });

  it('restores the 80G copy the day the owner sets the verified flag', async () => {
    vi.doMock('../lib/company', () => ({ COMPANY: VERIFIED_COMPANY }));
    vi.resetModules();
    const Page = (await import('../app/nri-pujas/page')).default;
    expect(await textOfAsync(Page())).toMatch(/80G/i);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// TC-12 — /list-temple, the supply-acquisition claims
// ───────────────────────────────────────────────────────────────────────────

describe('TC-12 — /list-temple promises only what the product delivers', () => {
  function stubCounts(temples: number | null, liveDarshan: number | null) {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (String(url).includes('/darshan/live')) {
          return {
            ok: liveDarshan !== null,
            json: async () => ({
              streams:
                liveDarshan === null
                  ? []
                  : Array.from({ length: liveDarshan }, (_, i) => ({
                      temple: { slug: `t-${i}` },
                    })),
            }),
          };
        }
        return { ok: temples !== null, json: async () => ({ total: temples }) };
      }),
    );
  }

  async function renderListTemple(): Promise<string> {
    const { default: Page } = await import('../app/list-temple/page');
    const text = await textOfAsync(Page());
    expect(text.length).toBeGreaterThan(300);
    return text;
  }

  it('invents no devotee audience — nothing in the product counts one', async () => {
    stubCounts(20, 17);
    const text = await renderListTemple();
    expect(text).not.toMatch(/10,000\+/);
    expect(text).not.toMatch(/\d[\d,]*\+\s*devotees/i);
    expect(text).not.toMatch(/verified devotees/i);
  });

  it('promises no settlement date, because no transfer rail is live', async () => {
    stubCounts(20, 17);
    const text = await renderListTemple();
    expect(text).not.toMatch(/Settlements within 7 days/i);
    expect(text).not.toMatch(/within \d+ days/i);
    expect(text).toContain(PAYOUT_TIMING_SHORT);
  });

  it('publishes no 80G promise while the registration is missing', async () => {
    stubCounts(20, 17);
    const text = await renderListTemple();
    expect(text).not.toMatch(/80G donation receipts/i);
    expect(text).toMatch(/not a tax-exemption certificate/i);
  });

  it('prints the temple count the API just returned', async () => {
    stubCounts(20, 17);
    expect(await renderListTemple()).toMatch(/17 temples already stream/i);
  });

  it('prints NO inventory figure when the count could not be read', async () => {
    stubCounts(null, null);
    const text = await renderListTemple();
    expect(text).not.toMatch(/\d+\s*temples? already stream/i);
    expect(text).toMatch(/Stream daily aarti/);
  });

  it('its metadata sells no 80G receipt either', async () => {
    const { metadata } = await import('../app/list-temple/page');
    expect(String(metadata.description)).not.toMatch(/80G/i);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// TC-12 — one payout promise, shared
// ───────────────────────────────────────────────────────────────────────────

describe('TC-12 — the payout sentence is one string, used everywhere', () => {
  it('names no day, no weekday and no business-day count', () => {
    for (const s of [
      PAYOUT_TIMING_SHORT,
      PRICING_FAQS.find((f) => /when do i get paid/i.test(f.question))!.answer,
    ]) {
      expect(s).not.toMatch(/every Monday/i);
      expect(s).not.toMatch(/\d+\s*[-–]?\s*\d*\s*business days/i);
      expect(s).not.toMatch(/within \d+ days/i);
      expect(s).toMatch(/by hand|not live yet/i);
    }
  });

  it('/list-temple imports it rather than retyping a second promise', () => {
    expect(code('app/list-temple/page.tsx')).toMatch(/PAYOUT_TIMING_SHORT/);
  });
});
