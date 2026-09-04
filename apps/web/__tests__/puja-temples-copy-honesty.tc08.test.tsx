/**
 * TC-08 / TC-01 remnant on the temple COMPARISON page — /pujas/[slug]/temples.
 *
 * TC-07 cleaned the trust score off this page (see
 * puja-temples-trust-score.tc07.test.tsx) but only the score. The page's
 * `generateMetadata` and its header paragraph were never read, and they were
 * still publishing three claims the product does not back:
 *
 *   1. "Verified pandits" (meta description) and "certified pandits" (og
 *      description) — the exact TC-08 fiction. `Priest.isVerified`,
 *      `.verificationStatus` and `.aadhaarVerified` have no writer outside
 *      apps/api/prisma/seed.ts; no credential upload, reference workflow or
 *      probation job exists. Both strings are already in the VETTING_FICTIONS
 *      list of trust-copy-lane.tc01-tc13.test.tsx — this surface was simply
 *      never in its SURFACES array.
 *
 *   2. "80G receipts" / "80G" (both descriptions) and "an 80G receipt where
 *      applicable" (header paragraph) — TC-01. `COMPANY.donationLegal
 *      .HAS_80G_VERIFIED` is false, `eightyGNumber` and `pan` are both null.
 *      Unlike /why-darshya this was NOT flag-gated here, and a flag would be
 *      the wrong fix anyway: a puja booking is a paid service, not a
 *      donation, so no 80G receipt applies to it even after the registration
 *      is issued. The claim is deleted rather than deferred.
 *
 *   3. "N verified temples" / "No verified temples" / "our verified partners"
 *      — a blanket verification claim over the whole list. The offering list
 *      is filtered on `isActive` ONLY, and the card beside it renders its
 *      "Verified" chip gated on the per-offering `o.isVerified`. So the prose
 *      asserted for every temple exactly what the markup two lines down
 *      admits is true only for some.
 *
 * Every assertion below was confirmed RED against the page as it stood before
 * this fix: the meta description carried "Verified pandits, video proof, 80G
 * receipts.", the og description "2 verified temples. Video proof, 80G,
 * certified pandits.", and the rendered header "2 verified temples offer
 * Rudrabhishek ... and an 80G receipt where applicable."
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

import PujaTemplesPage, { generateMetadata } from '../app/pujas/[slug]/temples/page';

const PAGE_REL = 'app/pujas/[slug]/temples/page.tsx';

/**
 * This file's own explanatory comments quote every string the source scan
 * forbids, and so do the page's. Strip comments before scanning source text —
 * eight guards in this engagement have been satisfied, or falsely failed, by
 * their own prose.
 */
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1');

const pageSource = () =>
  stripComments(readFileSync(resolve(__dirname, '..', PAGE_REL), 'utf8'));

/** Reused verbatim from trust-copy-lane.tc01-tc13.test.tsx. */
const VETTING_FICTIONS: RegExp[] = [
  /verified pandits?/i,
  /certified pandits?/i,
  /vedic certified/i,
  /Vedic credential verification/i,
  /30-day video probation/i,
  /trust score on every pandit/i,
  /2 senior pandit refs/i,
  /5-step (KYC|verification)/i,
];

/** The 80G promise shapes this page shipped. */
const DEDUCTION_PROMISES: RegExp[] = [
  /80G receipts?\b/i,
  /80G receipt where applicable/i,
  /Video proof, 80G/i,
  /80G[-\s]eligible/i,
];

const OFFERING_A = {
  id: 'offering-a',
  templeName: 'Alpha Mandir',
  templeSlug: 'alpha-mandir',
  templeCity: 'Varanasi',
  templeState: 'Uttar Pradesh',
  priceOverride: '1100',
  isActive: true,
  trustScore: 4.6,
  isVerified: true,
};

/**
 * Deliberately NOT verified. The old prose said "2 verified temples" while
 * this row's own chip was suppressed — the contradiction the third describe
 * block is about.
 */
const OFFERING_B = {
  id: 'offering-b',
  templeName: 'Zeta Mandir',
  templeSlug: 'zeta-mandir',
  templeCity: 'Pune',
  templeState: 'Maharashtra',
  priceOverride: '9100',
  isActive: true,
  trustScore: 5,
  isVerified: false,
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
  temples: [OFFERING_A, OFFERING_B],
};

function stubPuja(puja: unknown): void {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => puja })));
}

async function renderPage(): Promise<string> {
  const el = await PujaTemplesPage({ params: Promise.resolve({ slug: 'rudrabhishek' }) });
  render(el);
  return document.body.innerHTML ?? '';
}

async function metadataText(): Promise<string> {
  const md = await generateMetadata({ params: Promise.resolve({ slug: 'rudrabhishek' }) });
  const og = (md.openGraph ?? {}) as { title?: unknown; description?: unknown };
  return [md.title, md.description, og.title, og.description]
    .map((v) => (typeof v === 'string' ? v : ''))
    .join(' | ');
}

beforeEach(() => stubPuja(PUJA));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('TC-08 — the comparison page claims no pandit vetting that does not run', () => {
  it('its metadata makes no vetting claim', async () => {
    const text = await metadataText();
    // Sanity: metadata was produced at all, so the absences below mean something.
    expect(text).toMatch(/Rudrabhishek/);
    for (const fiction of VETTING_FICTIONS) {
      expect(text, `metadata still claims ${fiction}`).not.toMatch(fiction);
    }
  });

  it('its rendered body makes no vetting claim', async () => {
    const html = await renderPage();
    expect(html).toContain('Alpha Mandir');
    for (const fiction of VETTING_FICTIONS) {
      expect(html, `page still claims ${fiction}`).not.toMatch(fiction);
    }
  });

  it('carries no vetting fiction in its source outside comments', () => {
    const src = pageSource();
    for (const fiction of VETTING_FICTIONS) {
      expect(src, `source still carries ${fiction}`).not.toMatch(fiction);
    }
  });
});

describe('TC-01 — the comparison page promises no 80G receipt for a puja booking', () => {
  it('its metadata sells no 80G receipt', async () => {
    const text = await metadataText();
    for (const promise of DEDUCTION_PROMISES) {
      expect(text, `metadata still promises ${promise}`).not.toMatch(promise);
    }
    expect(text).not.toMatch(/80G/i);
  });

  it('its rendered body promises no 80G receipt', async () => {
    const html = await renderPage();
    for (const promise of DEDUCTION_PROMISES) {
      expect(html, `page still promises ${promise}`).not.toMatch(promise);
    }
    expect(html).not.toMatch(/80G/i);
  });

  it('does not defer the claim behind a flag — a booking is a service, not a donation', () => {
    const src = pageSource();
    // /why-darshya restores its 80G row the day HAS_80G_VERIFIED flips. That
    // is right there and wrong here: no 80G registration makes a paid puja
    // deductible, so there must be no flag to flip on this page either.
    expect(src).not.toMatch(/80G/i);
    expect(src).not.toMatch(/HAS_80G_VERIFIED/);
  });
});

describe('TC-08 — the page asserts no verification for temples it does not check', () => {
  it('makes no blanket "N verified temples" claim over a list filtered only on isActive', async () => {
    const html = await renderPage();
    expect(html).toContain('Alpha Mandir');
    expect(html).toContain('Zeta Mandir');
    expect(html).not.toMatch(/\d+ verified temples?/i);
    expect(html).not.toMatch(/verified partners?/i);
  });

  it('still shows the per-temple chip, which is the one verification that is real', async () => {
    // Temple.isVerified DOES have a writer — apps/api/src/routes/admin.ts:409
    // sets it on temple create. The per-card gate stays; only the blanket
    // prose claim goes.
    const html = await renderPage();
    const verifiedChips = html.match(/Verified/g) ?? [];
    expect(verifiedChips).toHaveLength(1); // OFFERING_A only, not OFFERING_B
  });

  it('says nothing is listed rather than nothing is verified, on the empty state', async () => {
    stubPuja({ ...PUJA, temples: [] });
    const html = await renderPage();
    expect(html).not.toMatch(/No verified temples/i);
    expect(html).not.toMatch(/verified partners?/i);
    // The empty state still exists — it was not silently deleted.
    expect(html).toMatch(/being onboarded|no temples/i);
  });
});

/**
 * TC-07 — a REPLACEMENT for a ratchet that never held.
 *
 * `__tests__/seo/structured-data-honesty.test.ts:160` ("still renders the trust
 * score as what it is") guards temples/[slug]/page.tsx with nothing but
 * `expect(src).toMatch(/trustScore/)`. That page renders no trust score any
 * more; the match is satisfied entirely by the file's own TC-07 explanatory
 * COMMENTS, which is how it stayed green for this finding's whole life. That
 * file belongs to another lane and is left untouched — this block re-states
 * what it was meant to check, on stripped source, so the finding no longer
 * rests on it.
 *
 * 2026-08-28: the two surfaces this block previously listed as unreachable —
 * app/pujas/book/page.tsx (gated on the weaker `hasMeaningfulTrustScore`) and
 * app/pujas/[slug]/page.tsx (no gate at all) — are now in the array and were
 * confirmed RED against it before being fixed. Both rendered a filled amber
 * star beside "4.9/5", which a devotee reads as a customer rating, over a
 * column nothing in the codebase writes.
 */
describe('TC-07 — every surface that prints the score checks whether it means anything', () => {
  const GATED_SURFACES = [
    'app/pujas/[slug]/temples/page.tsx',
    'app/temples/[slug]/page.tsx',
    'app/pujas/[slug]/page.tsx',
    'app/pujas/book/page.tsx',
  ];

  const count = (src: string, re: RegExp) => (src.match(re) ?? []).length;

  for (const rel of GATED_SURFACES) {
    it(`${rel} gates every printed score on canPublishTrustScore`, () => {
      const src = stripComments(readFileSync(resolve(__dirname, '..', rel), 'utf8'));
      const prints = count(src, /formatTrustScoreOutOf\(/g);
      const gates = count(src, /canPublishTrustScore\(/g);
      // Sanity: the module is still wired in at all, so the gate count means
      // something rather than passing by absence.
      expect(prints, `${rel} no longer prints a score — drop it from this list`)
        .toBeGreaterThan(0);
      expect(gates, `${rel} prints ${prints} score(s) behind ${gates} gate(s)`)
        .toBeGreaterThanOrEqual(prints);
      // hasMeaningfulTrustScore only asks whether the number is thick enough,
      // not whether anything computes it. It is never the right gate here.
      expect(count(src, /hasMeaningfulTrustScore\(/g)).toBe(0);
    });
  }

  it('the shared gate is closed, which is what makes all of the above render nothing', async () => {
    const mod = await import('../lib/trust-score');
    expect(mod.TRUST_SCORE_IS_COMPUTED).toBe(false);
    expect(mod.canPublishTrustScore(5)).toBe(false);
    expect(mod.canPublishTrustScoreMethodology()).toBe(false);
  });
});

describe('TC-05 — home-pujas exports no fabricated booking record', () => {
  it('does not export sampleBookings', async () => {
    const mod = await import('../lib/home-pujas');
    expect(Object.keys(mod)).not.toContain('sampleBookings');
  });

  it('carries no invented booking number, amount or customer name in source', () => {
    const src = stripComments(
      readFileSync(resolve(__dirname, '..', 'lib/home-pujas.ts'), 'utf8'),
    );
    // Real-format booking numbers for bookings that never happened.
    expect(src).not.toMatch(/BS-\d{8}-\d{5}/);
    expect(src).not.toMatch(/customerName/);
    expect(src).not.toMatch(/sampleBookings/);
  });
});
