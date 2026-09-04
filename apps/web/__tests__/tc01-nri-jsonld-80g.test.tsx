/**
 * TC-01 (P0, trust) — the 80G promise /nri was still shipping in its <script>.
 *
 * tc01-80g-surface-coverage.test.tsx gated the VISIBLE copy on /nri, /nri/ca,
 * /faqs and /gaushala, and said so honestly: its `renderPage` helper deletes
 * every <script> before asserting, with a comment naming the five lines in
 * lib/jsonld.ts that still promise a deduction. That exclusion was correct
 * scoping, but it left /nri emitting the claim to the one reader that matters
 * most for a tax assertion — Google. `nriPremiumServiceJsonLd` (lib/jsonld.ts:222)
 * describes the plan as including "free 80G receipts", and /nri renders that
 * object verbatim inside `<script type="application/ld+json">`.
 *
 * The claim is false for the same reason it was false in the visible copy:
 * COMPANY.donationLegal.HAS_80G_VERIFIED is false, `eightyGNumber` and `pan`
 * are both null, and apps/api/src/lib/pdf-receipt.ts stamps every receipt
 * "Proof of donation — not a tax exemption certificate" because
 * `is80GEligible()` needs a donee registration number AND a PAN, and
 * `gaushala_profiles.regn_80g` / `.pan` are read in one place and written
 * nowhere.
 *
 * lib/jsonld.ts is another lane, so the fix is scoped to the page: /nri sanitises
 * the description of the object IT emits. The sanitiser is conditional and
 * idempotent — the day lib/jsonld.ts is gated, or the day the owner sets the
 * verified flag, it passes the object through untouched, which is what the last
 * case here proves.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';

vi.mock('../components/EmailCapture', () => ({
  default: () => <div data-testid="email-capture" />,
}));

afterEach(() => {
  cleanup();
  vi.resetModules();
  vi.doUnmock('../lib/company');
});

/** Every application/ld+json payload the page emits, concatenated. */
async function renderJsonLd(): Promise<string> {
  const { default: Page } = await import('../app/nri/page');
  const { container } = render(<Page />);
  const scripts = Array.from(
    container.querySelectorAll('script[type="application/ld+json"]'),
  );
  expect(scripts.length).toBeGreaterThan(0);
  const payload = scripts.map((s) => s.textContent ?? '').join('\n');
  // A blank payload would make the negative assertion vacuous.
  expect(payload.length).toBeGreaterThan(200);
  return payload;
}

describe('TC-01 — /nri structured data', () => {
  it('the upstream object really does still carry the ungated claim', async () => {
    // If this ever fails, lib/jsonld.ts has been gated in its own lane and the
    // page-level sanitiser below has become a no-op. That is the good outcome —
    // delete the sanitiser and this case together, keep the rest.
    const { nriPremiumServiceJsonLd } = await import('../lib/jsonld');
    expect(nriPremiumServiceJsonLd.description).toMatch(/80G/i);
  });

  it('emits no 80G deduction promise while the owner flag is false', async () => {
    const { COMPANY } = await import('../lib/company');
    expect(COMPANY.donationLegal.HAS_80G_VERIFIED).toBe(false);
    expect(await renderJsonLd()).not.toMatch(/80G/i);
  });

  it('still describes the receipt, rather than dropping the benefit silently', async () => {
    expect(await renderJsonLd()).toMatch(/receipt/i);
  });

  it('publishes the 80G wording again the day the owner sets the verified flag', async () => {
    const actual = await vi.importActual<typeof import('../lib/company')>('../lib/company');
    vi.doMock('../lib/company', () => ({
      ...actual,
      COMPANY: {
        ...actual.COMPANY,
        donationLegal: {
          ...actual.COMPANY.donationLegal,
          HAS_80G_VERIFIED: true,
          eightyGNumber: 'AAATS1234QF20214',
          pan: 'AAATS1234Q',
        },
      },
    }));
    vi.resetModules();
    expect(await renderJsonLd()).toMatch(/80G/i);
  });
});
