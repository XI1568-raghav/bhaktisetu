import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';

/**
 * COM-02 (prod sweep 2026-08-12, P0/trust) — the marketing half.
 *
 * The 80G receipt Darshya issues is not a valid 80G instrument: the donee's
 * registration number and PAN (`gaushala_profiles.regn_80g` / `.pan`) are read
 * in one place and written nowhere, so they are NULL for every donee, and the
 * temple branch never loads them at all. `lib/company.ts` already records this
 * honestly — `donationLegal.HAS_80G_VERIFIED: false`, `eightyGNumber: null` —
 * and /csr-match was made to respect it (LEG-14).
 *
 * /gaushala did not. It sold "80G tax receipt" as a bullet on the ₹30,000 and
 * ₹2,25,000 plans, put "Tax Receipt (80G) — Save on income tax" in the trust
 * strip, and answered "Is my donation tax-deductible?" with "Yes! ... You will
 * receive a valid 80G receipt for your records." A donor who acts on that has
 * the deduction disallowed at assessment.
 *
 * The claim is now gated on the SAME owner-controlled flag as every other 80G
 * surface. Obtaining the registration is the owner's action; until it exists,
 * no page may promise it.
 */

// The page embeds an async server component that fetches approved gaushalas.
// Under happy-dom it suspends forever and the whole tree renders empty, which
// would make every "does not contain" assertion below vacuous. Stub it.
vi.mock('../components/ApprovedProvidersStrip', () => ({
  ApprovedProvidersStrip: () => <div data-testid="providers-strip" />,
}));

afterEach(() => {
  cleanup();
  vi.resetModules();
  vi.doUnmock('../lib/company');
});

async function renderGaushala() {
  const { default: Page } = await import('../app/gaushala/page');
  const { container } = render(<Page />);
  const text = container.textContent ?? '';
  // Guard against a silently empty tree making every negative assertion pass.
  expect(text.length).toBeGreaterThan(500);
  return text;
}

describe('COM-02 — /gaushala promises 80G only when Darshya actually holds it', () => {
  it('the platform does not currently claim a verified 80G registration', async () => {
    const { COMPANY } = await import('../lib/company');
    expect(COMPANY.donationLegal.HAS_80G_VERIFIED).toBe(false);
    expect(COMPANY.donationLegal.eightyGNumber).toBeNull();
  });

  it('renders no 80G promise while the registration is unverified', async () => {
    const text = await renderGaushala();
    // The word may still appear — the honest disclaimer names the section it
    // is disclaiming. What may not appear is a PROMISE of one.
    expect(text).not.toMatch(/80G tax receipt/i);
    expect(text).not.toMatch(/Tax Receipt \(80G\)/i);
    expect(text).not.toMatch(/Save on income tax/i);
    expect(text).not.toMatch(/eligible for (tax )?deduction under Section 80G/i);
    expect(text).not.toMatch(/valid 80G receipt/i);
  });

  it('answers the tax-deductibility question truthfully instead of "Yes!"', async () => {
    const text = await renderGaushala();
    expect(text).toMatch(/Is my donation tax-deductible\?/i);
    expect(text).not.toMatch(/Yes! Donations under the Annual/i);
    expect(text).toMatch(/not .{0,40}tax-deductible|cannot be claimed|no .{0,30}registration/i);
  });

  it('the /gaushala/[id] adoption panel makes no 80G promise either', async () => {
    const { default: Page } = await import('../app/gaushala/[id]/page');
    const el = await (Page as unknown as (a: {
      params: Promise<{ id: string }>;
    }) => Promise<React.ReactElement>)({ params: Promise.resolve({ id: 'cow_001' }) });
    const { container } = render(el);
    const text = container.textContent ?? '';
    expect(text.length).toBeGreaterThan(500);
    expect(text).not.toMatch(/80G tax receipt/i);
    expect(text).not.toMatch(/Annual care \+ 80G/i);
  });

  it('the /donations meta description does not sell an 80G deduction', async () => {
    const { metadata } = await import('../app/donations/page');
    expect(String(metadata.description)).not.toMatch(/80G/);
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

    const text = await renderGaushala();
    expect(text).toMatch(/Tax Receipt \(80G\)/i);
    expect(text).toMatch(/Save on income tax/i);
    expect(text).toMatch(/eligible for deduction under Section 80G/i);
  });
});
