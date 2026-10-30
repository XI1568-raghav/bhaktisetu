import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const web = (rel: string) => readFileSync(resolve(__dirname, '..', rel), 'utf8');

// COM-08 (prod sweep 2026-08-12): the live meta description on
// /yatra/char-dham/book read "…Verified pandits, hotel + transport handled,
// Razorpay secure checkout." That page 307s to /yatra/book?slug=char-dham,
// whose only network call is POST /api/v1/yatra-inquiry/ — a LEAD FORM. No
// Razorpay script is loaded anywhere in the yatra flow. A pilgrim arrives on an
// SEO landing page promising secure checkout for a ₹38,500 trip, fills in
// traveller names and ages, and gets a callback promise. The SERP snippet was a
// false claim.
//
// COM-17: the same route dropped ?tier — /yatra/char-dham/book?tier=premium
// 307'd to /yatra/book?slug=char-dham, so a buyer who deliberately chose the
// ₹1,49,000 premium tier silently landed on standard.

describe('yatra per-package book route (COM-08, COM-17)', () => {
  const page = web('app/yatra/[slug]/book/page.tsx');

  it('does not advertise a checkout the page cannot perform', () => {
    expect(page).not.toMatch(/Razorpay secure checkout/);
  });

  it('describes what the page actually does', () => {
    expect(page).toMatch(/Request a booking|request a booking/);
  });

  it('forwards the selected tier through the redirect (COM-17)', () => {
    expect(page).toMatch(/tier/);
    expect(page).not.toMatch(/redirect\(`\/yatra\/book\?slug=\$\{slug\}`\)/);
  });
});

describe('yatra booking form copy (COM-08)', () => {
  const page = web('app/yatra/book/page.tsx');

  it('does not send the dead USD conversion field', () => {
    expect(page).not.toMatch(/totalUsd/);
    expect(page).not.toMatch(/\/ 83/);
  });

  it('is explicit that submitting is a request, not a payment', () => {
    expect(page).toMatch(/Request booking/);
  });

  // Prod QA 2026-10-30: the review step said "Review & pay" and promised an
  // invoice "within 24h" while the received page says no reply time is promised.
  it('review step reads as an inquiry and makes no 24h promise', () => {
    expect(page).not.toMatch(/Review & pay/);
    expect(page).not.toMatch(/within 24h/);
    expect(page).not.toMatch(/before payment/);
  });

  it('shows the start date as a readable date, not raw ISO', () => {
    expect(page).not.toMatch(/value=\{data\.startDate \|\| '—'\}/);
  });
});

/**
 * The yatra quote carried the identical `Math.round(subtotal * 0.05)` "GST (5%)"
 * line that COM-06 / S-09 deleted from the store — in
 * apps/api/src/lib/store-pricing.ts, apps/web/lib/store-pricing.ts and the
 * cart/checkout surfaces above. It was wrong here for two independent reasons:
 *
 *   1. The business is not GST-registered — lib/company.ts records
 *      COMPANY.tax.HAS_GST_REGISTRATION_VERIFIED = false, and /pricing already
 *      says so in words. A tax line quoted by a business that cannot remit it
 *      is a number that goes nowhere.
 *   2. One flat 5% is wrong across what this page quotes anyway: a tour
 *      package, a helicopter seat, travel insurance and a temple puja do not
 *      share a rate. Even with a GSTIN the arithmetic would still be incorrect.
 *
 * And this page charges nothing — `handlePay` POSTs to /yatra-inquiry, a lead
 * form — so the figure is a QUOTE, and an inflated quote is one the operator
 * then has to walk back with the pilgrim.
 *
 * Comments are stripped before matching: the removal is documented in prose at
 * the site, and a test that forbade the WORD would forbid explaining why.
 */
describe('yatra quote carries no invented tax line (COM-06 parity)', () => {
  const code = readFileSync(resolve(__dirname, '..', 'app/yatra/book/page.tsx'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');

  it('computes no 5% anything', () => {
    expect(code).not.toMatch(/subtotal\s*\*\s*0\.05/);
    expect(code).not.toMatch(/0\.05/);
  });

  it('pushes no GST row into the price breakdown', () => {
    expect(code).not.toMatch(/GST/);
  });

  it('totals exactly the sum of the quoted lines', () => {
    expect(code).toMatch(/return\s*\{\s*lines,\s*total:\s*subtotal\s*\}/);
  });

  it('no longer claims a tax is included in the sidebar figure', () => {
    expect(code).not.toMatch(/incl\.\s*GST/i);
  });
});
