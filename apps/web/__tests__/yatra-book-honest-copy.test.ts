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
});
