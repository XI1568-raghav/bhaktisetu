/**
 * legal-content P2 sweep (prod-sweep-raw-2026-08-12) — LEG-13, LEG-14, LEG-15,
 * LEG-16, LEG-18.
 *
 * Same rule as legal-content-p1.test.ts: these are source assertions, because
 * the failure mode on this site is a published sentence that contradicts the
 * code — and a render test passes happily on a page that renders the wrong
 * sentence perfectly.
 *
 * NOT covered here, deliberately: the refund ladder (LEG-01/LEG-03), the store
 * struck-through MRPs (LEG-17, second half — apps/web/app/store/** and
 * lib/store-pricing.ts are another agent's lane and the "was sold at" price is
 * a business fact nobody in this repo holds), and the /bookings/view "Failed to
 * fetch" half of LEG-18.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { COMPANY } from '../lib/company';

const read = (rel: string) => readFileSync(path.resolve(__dirname, '..', rel), 'utf8');
const exists = (rel: string) => existsSync(path.resolve(__dirname, '..', rel));

/**
 * Drop comment lines before grepping. These files carry a written record of the
 * sentence that was removed and why; without this the record itself would trip
 * the assertion that the sentence is gone.
 */
const codeOnly = (src: string) =>
  src
    .split('\n')
    .filter((line) => !/^\s*(\/\/|\/\*|\*)/.test(line))
    .join('\n');

const about = codeOnly(read('app/about/page.tsx'));
const cookiePolicy = codeOnly(read('app/legal/cookies/page.tsx'));
const privacy = codeOnly(read('app/privacy/page.tsx'));
const refunds = codeOnly(read('app/refunds/page.tsx'));
const bookingView = codeOnly(read('app/bookings/view/page.tsx'));

describe('LEG-13 — /about stat strip is not a hardcoded headline number', () => {
  it('does not publish "200+" temples against a catalogue of 20', () => {
    expect(about).not.toContain("'200+'");
    expect(about).not.toContain('"200+"');
  });

  it('does not publish a 100% video-proof rate', () => {
    // 4 bookings sit in status `completed` with videoProofUrl NULL, and
    // checkVideoProofGate (apps/api/src/routes/bookings.ts:276) only requires
    // proof for `video_uploaded` and `delivered` — never for `completed`.
    expect(about).not.toContain("'100%'");
    expect(about).not.toMatch(/Bookings with video proof/);
  });

  it('reads its counts from the live API rather than a literal', () => {
    expect(about).toMatch(/fetchPublicStats|live-stats/);
  });

  it('does not claim video proof is taken before every payout without exception', () => {
    // No payout path reads videoProofUrl: apps/api/src/services/payout.service.ts
    // has no reference to it.
    expect(about).not.toMatch(/No exceptions, no opt-outs/);
    expect(about).not.toMatch(/video recording from the priest before payout/);
  });
});

describe('LEG-14 — /csr-match cannot publish an 80G/CSR-1 certification it does not hold', () => {
  it('company.ts gates the CSR-1 claim the way it already gates 80G', () => {
    expect(COMPANY.donationLegal.HAS_80G_VERIFIED).toBe(false);
    expect(COMPANY.donationLegal).toHaveProperty('HAS_CSR1_VERIFIED');
    expect(COMPANY.donationLegal.HAS_CSR1_VERIFIED).toBe(false);
  });

  it('the page never hardcodes the certification sentence', () => {
    const client = codeOnly(
      exists('app/csr-match/CsrMatchClient.tsx')
        ? read('app/csr-match/CsrMatchClient.tsx')
        : read('app/csr-match/page.tsx'),
    );
    expect(client).not.toContain('Bhaktisetu is 80G certified + CSR-1 registered');
    expect(client).not.toContain('80G + CSR-1 compliant');
  });

  it('the route itself is gated off by default instead of by a comment', () => {
    const page = read('app/csr-match/page.tsx');
    expect(page).toContain('ENABLE_CSR_MATCH');
    expect(page).toMatch(/notFound\(\)/);
  });
});

describe('LEG-15 — cookie consent can be withdrawn without hand-editing storage', () => {
  it('the policy no longer tells the user to clear a localStorage key', () => {
    expect(cookiePolicy).not.toContain('darshya_cookie_consent_v1');
  });

  it('the policy carries a real control', () => {
    expect(exists('components/CookieSettingsButton.tsx')).toBe(true);
    expect(cookiePolicy).toContain('CookieSettingsButton');
  });

  it('the banner can be re-opened after a choice has been stored', () => {
    const banner = read('components/CookieBanner.tsx');
    expect(banner).toContain('darshya:open-consent');
  });
});

describe('LEG-16 — DPDP rights are exercisable in the product, not only by email', () => {
  it('a DSAR screen exists', () => {
    expect(exists('app/account/privacy/page.tsx')).toBe(true);
  });

  it('it posts to the endpoint that already exists', () => {
    const screen = read('app/account/privacy/page.tsx');
    expect(screen).toContain('/dpdp/dsar');
    expect(screen).toContain('/dpdp/dsar/mine');
  });

  it('/privacy links to it from the rights section', () => {
    expect(privacy).toContain('/account/privacy');
  });
});

describe('LEG-18 — /refunds names controls that exist', () => {
  it('does not tell the user to click a "Request Refund" button', () => {
    expect(refunds).not.toContain('Request Refund');
  });

  it('every control label /refunds quotes exists in the booking screen', () => {
    // Both sides of the contract. The labels live in
    // apps/web/app/bookings/view/page.tsx; if either is renamed this fails.
    const quoted = [...refunds.matchAll(/&quot;([^&]{4,60})&quot;/g)].map((m) => m[1]);
    expect(quoted.length).toBeGreaterThan(0);
    for (const label of quoted) {
      const escaped = label.replace(/&amp;/g, '&');
      const inView =
        bookingView.includes(escaped) || bookingView.includes(label);
      expect(inView, `/refunds quotes a control "${label}" that /bookings/view does not render`).toBe(
        true,
      );
    }
  });

  it('points the user at the booking screen that hosts those controls', () => {
    expect(refunds).toContain('/bookings');
  });
});
