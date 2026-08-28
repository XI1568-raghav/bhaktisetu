import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';

/**
 * TC-04, items 4 and 6 — the last two surfaces still marketing a withdrawn plan.
 *
 * `nri_premium_yearly` is withdrawn from sale: all six of its advertised
 * benefits carry `enforcedBy: null`, `getPlans()` filters it out, and both
 * activation rails answer 400 with `NRI_PREMIUM_WITHDRAWN_MESSAGE`. The page
 * BODY of /nri was gated on `NRI_PREMIUM_IS_SELLABLE` — but its `metadata`
 * object was not, and metadata is the half a stranger sees first:
 *
 *   metadata.description        "…free donation receipt PDFs, unlimited AI
 *                                Pandit. ₹5,000 per year, charged in INR…"
 *   openGraph.description       "Annual all-access tier … ₹5,000 per year…"
 *   twitter.description         "Annual all-access … ₹5,000/yr, charged in INR."
 *
 * Those three strings are what Google prints in a SERP entry and what WhatsApp,
 * Slack and iMessage render in a link preview. So the one channel that reaches
 * someone who has never opened the site went on advertising a price that cannot
 * be charged and a benefit list that is not enforced, indefinitely — search
 * snippets outlive a deploy.
 *
 * /nri/ca carried the same claim twice in its body: "Daily 5 free questions;
 * unlimited on NRI Premium" in the trust grid, and a "See NRI Premium tier"
 * call to action pointing at the withdrawn plan.
 *
 * Every assertion below was confirmed RED before the fix.
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
});

async function renderPage(mod: string): Promise<string> {
  const { default: Page } = await import(mod);
  const { container } = render(<Page />);
  container.querySelectorAll('script').forEach((s) => s.remove());
  const text = container.textContent ?? '';
  // A silently empty tree would make every negative assertion vacuous.
  expect(text.length).toBeGreaterThan(500);
  return text;
}

describe('TC-04 — the plan really is withdrawn', () => {
  it('the sellable gate is false, which is what makes the copy below a defect', async () => {
    const { NRI_PREMIUM_IS_SELLABLE } = await import('../app/nri/plan-availability');
    expect(NRI_PREMIUM_IS_SELLABLE).toBe(false);
  });
});

describe('TC-04 — /nri metadata sells no withdrawn plan', () => {
  const priceClaim = /₹\s?5,?000|Rs\.?\s?5,?000|\$60/i;

  it('the SERP description quotes no price for it', async () => {
    const { metadata } = await import('../app/nri/page');
    expect(String(metadata.description)).not.toMatch(priceClaim);
    expect(String(metadata.description)).not.toMatch(/per year|\/yr|annual all-access/i);
  });

  it('the link preview (openGraph) quotes no price for it', async () => {
    const { metadata } = await import('../app/nri/page');
    expect(String(metadata.openGraph?.description)).not.toMatch(priceClaim);
    expect(String(metadata.openGraph?.description)).not.toMatch(/per year|\/yr/i);
  });

  it('the twitter card quotes no price for it', async () => {
    const { metadata } = await import('../app/nri/page');
    expect(String(metadata.twitter?.description)).not.toMatch(priceClaim);
    expect(String(metadata.twitter?.description)).not.toMatch(/per year|\/yr/i);
  });

  it('still describes what the page is for, rather than going blank', async () => {
    // A gate, not a deletion. /nri remains a real landing page for the diaspora
    // even with nothing to sell, and TC-01 separately requires the word
    // "receipt" to survive here without the 80G claim beside it.
    const { metadata } = await import('../app/nri/page');
    const description = String(metadata.description);
    expect(description.length).toBeGreaterThan(60);
    expect(description).toMatch(/receipt/i);
    expect(description).not.toMatch(/80G/i);
    expect(String(metadata.openGraph?.description).length).toBeGreaterThan(40);
    expect(String(metadata.twitter?.description).length).toBeGreaterThan(20);
  });
});

describe('TC-04 — /nri/ca advertises no withdrawn tier', () => {
  it('does not offer unlimited AI on a plan nobody can buy', async () => {
    const text = await renderPage('../app/nri/ca/page');
    expect(text).not.toMatch(/unlimited on NRI Premium/i);
  });

  it('offers no call to action pointing at the withdrawn tier', async () => {
    const text = await renderPage('../app/nri/ca/page');
    expect(text).not.toMatch(/see NRI Premium tier/i);
  });

  it('still tells a Canadian filer the truth about CRA (must not regress)', async () => {
    const text = await renderPage('../app/nri/ca/page');
    expect(text).toMatch(/NOT CRA-registered charities/i);
  });

  it('still keeps the free AI allowance it can actually honour', async () => {
    const text = await renderPage('../app/nri/ca/page');
    expect(text).toMatch(/5 free questions/i);
  });
});
