import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';

/**
 * TC-01 (P0, trust) — the 80G honesty gate covers only 7 of ~45 surfaces.
 *
 * COM-02 gated /gaushala, /donations, /about, /refunds, /csr-match,
 * /gaushala/[id] and components/DonationForm.tsx on
 * `COMPANY.donationLegal.HAS_80G_VERIFIED`. Every other page went on promising
 * an income-tax deduction the platform cannot deliver: the flag is false, both
 * `eightyGNumber` and `pan` are null, and the receipt generator itself prints
 * "Proof of donation — not a tax exemption certificate" whenever
 * `is80GEligible()` is false (which is always, because
 * `gaushala_profiles.regn_80g` / `.pan` are read in one place and written
 * nowhere).
 *
 * This file closes the trust-copy lane's share of that gap:
 *   app/nri/page.tsx, app/nri/ca/page.tsx, app/faqs/page.tsx
 * plus the one assertion that escaped the gate INSIDE an otherwise-gated page,
 * app/gaushala/page.tsx ("80G — Tax-deductible receipt on eligible donations"
 * in the "what your gau seva pays for" strip).
 *
 * Assertions run against RENDERED text and real `metadata` objects, not source,
 * so a comment explaining a removed claim can neither trip nor satisfy them.
 * The last case flips the owner flag and proves the copy comes back — the point
 * is a gate, not a deletion.
 */

vi.mock('../components/ApprovedProvidersStrip', () => ({
  ApprovedProvidersStrip: () => <div data-testid="providers-strip" />,
}));

vi.mock('../components/EmailCapture', () => ({
  default: () => <div data-testid="email-capture" />,
}));

afterEach(() => {
  cleanup();
  vi.resetModules();
  vi.doUnmock('../lib/company');
});

/**
 * Rendered VISIBLE copy, with <script> payloads removed.
 *
 * The JSON-LD blocks are excluded deliberately, not to make an assertion pass:
 * `lib/jsonld.ts` is a different lane and still ships the deduction promise in
 * four places that Google indexes —
 *   jsonld.ts:222  "free 80G receipts"                (nriPremiumServiceJsonLd)
 *   jsonld.ts:247  "donate to gaushalas with 80G receipts"
 *   jsonld.ts:265  "80G receipts use real PAN and donee 80G registration numbers"
 *   jsonld.ts:274  "gaushala donations with real 80G receipts"
 *   jsonld.ts:283  "full 80G receipts where eligible"
 * That is reported as remaining work, so this file asserts only what it can
 * actually hold. Widen it to `container.textContent` the moment jsonld.ts is
 * gated, and these pages will already be clean.
 */
async function renderPage(mod: string): Promise<string> {
  const { default: Page } = await import(mod);
  const { container } = render(<Page />);
  container.querySelectorAll('script').forEach((s) => s.remove());
  const text = container.textContent ?? '';
  // A silently empty tree would make every negative assertion vacuous.
  expect(text.length).toBeGreaterThan(500);
  return text;
}

/** A promise of a deduction, in any of the shapes these pages used. */
function expectNoDeductionPromise(text: string): void {
  expect(text).not.toMatch(/80G receipts?\b/i);
  expect(text).not.toMatch(/80G receipt PDFs?/i);
  expect(text).not.toMatch(/tax[-\s]compliant 80G/i);
  expect(text).not.toMatch(/80G[-\s]eligible/i);
  expect(text).not.toMatch(/India[-\s]tax[-\s]deductible/i);
  expect(text).not.toMatch(/Tax[-\s]deductible receipt/i);
  expect(text).not.toMatch(/get the deduction/i);
}

describe('TC-01 — the gate is false, so nothing may promise a deduction', () => {
  it('the owner flag and both donee fields are still empty', async () => {
    const { COMPANY } = await import('../lib/company');
    expect(COMPANY.donationLegal.HAS_80G_VERIFIED).toBe(false);
    expect(COMPANY.donationLegal.eightyGNumber).toBeNull();
    expect(COMPANY.donationLegal.pan).toBeNull();
  });

  it('the receipt generator itself refuses the exemption line', () => {
    const fs = require('node:fs') as typeof import('node:fs');
    const path = require('node:path') as typeof import('node:path');
    const src = fs.readFileSync(
      path.resolve(__dirname, '../../api/src/lib/pdf-receipt.ts'),
      'utf8',
    );
    expect(src).toMatch(/Proof of donation — not a tax exemption certificate/);
  });
});

describe('TC-01 — /nri', () => {
  it('renders no 80G deduction promise', async () => {
    expectNoDeductionPromise(await renderPage('../app/nri/page'));
  });

  it('its metadata sells no 80G receipt', async () => {
    const { metadata } = await import('../app/nri/page');
    expect(String(metadata.description)).not.toMatch(/80G/i);
    expect(String(metadata.description)).toMatch(/receipt/i);
  });

  it('restores the 80G copy the day the owner sets the verified flag', async () => {
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
    const text = await renderPage('../app/nri/page');
    expect(text).toMatch(/80G/);
  });
});

describe('TC-01 — /nri/ca', () => {
  it('renders no 80G deduction promise', async () => {
    expectNoDeductionPromise(await renderPage('../app/nri/ca/page'));
  });

  it('its metadata sells no 80G receipt', async () => {
    const { metadata } = await import('../app/nri/ca/page');
    expect(String(metadata.description)).not.toMatch(/80G/i);
  });

  it('still tells a Canadian filer the truth about CRA', async () => {
    const text = await renderPage('../app/nri/ca/page');
    expect(text).toMatch(/NOT CRA-registered charities/i);
  });
});

describe('TC-01 — /faqs', () => {
  it('its own header copy and metadata sell no 80G receipt', async () => {
    // The FAQ ANSWERS come from lib/faqs.ts, which is a different lane; this
    // asserts only the copy app/faqs/page.tsx writes itself.
    const { metadata } = await import('../app/faqs/page');
    expect(String(metadata.description)).not.toMatch(/80G/i);

    const { default: Page } = await import('../app/faqs/page');
    const { container } = render(<Page />);
    const header = container.querySelector('header');
    expect(header).not.toBeNull();
    const text = header?.textContent ?? '';
    expect(text.length).toBeGreaterThan(100);
    expect(text).not.toMatch(/80G/i);
  });
});

describe('TC-01 — /gaushala: the assertion that escaped its own page gate', () => {
  it('the gau-seva funding strip claims no tax-deductible receipt', async () => {
    const text = await renderPage('../app/gaushala/page');
    expect(text).not.toMatch(/Tax-deductible receipt/i);
    // The three sibling tiles must survive, so this is a gate and not a delete.
    expect(text).toMatch(/Green fodder, dry chara and mineral feed/);
  });

  it('restores the tile the day the owner sets the verified flag', async () => {
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
    const text = await renderPage('../app/gaushala/page');
    expect(text).toMatch(/Tax-deductible receipt/i);
  });
});
