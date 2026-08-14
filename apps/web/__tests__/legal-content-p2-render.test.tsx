/**
 * legal-content P2 — the same contracts as legal-content-p2.test.ts, asserted
 * against RENDERED output.
 *
 * A source grep catches a stale sentence. It does not catch a page that reads
 * the right value and prints the wrong thing, and it does not catch a stat
 * strip that quietly falls back to a remembered number when the API is down —
 * which is the exact defect class this sweep keeps finding.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import type { PublicStats } from '../lib/live-stats';

const stats = vi.hoisted(() => ({ value: { templeCount: 20, pujaTypeCount: 10 } as PublicStats }));

vi.mock('../lib/live-stats', () => ({
  fetchPublicStats: async () => stats.value,
}));

import AboutPage from '../app/about/page';
import CookiePolicyPage from '../app/legal/cookies/page';
import RefundsPage from '../app/refunds/page';
import PrivacyPage from '../app/privacy/page';

const textOfAsync = async (node: Promise<React.ReactElement>) =>
  render(await node).container.textContent ?? '';
const textOf = (node: React.ReactElement) => render(node).container.textContent ?? '';

describe('LEG-13 — /about publishes the counts the API just returned', () => {
  beforeEach(() => {
    cleanup();
    stats.value = { templeCount: 20, pujaTypeCount: 10 };
  });

  it('renders the live temple count, not "200+"', async () => {
    const t = await textOfAsync(AboutPage());
    expect(t).toContain('20');
    expect(t).toContain('Temples listed');
    expect(t).not.toContain('200+');
    expect(t).not.toContain('Temples partnered');
  });

  it('renders the live bookable-puja count', async () => {
    const t = await textOfAsync(AboutPage());
    expect(t).toContain('Pujas you can book');
  });

  it('claims no video-proof percentage', async () => {
    const t = await textOfAsync(AboutPage());
    expect(t).not.toMatch(/100%\s*Bookings with video proof/);
    expect(t).not.toMatch(/No exceptions, no opt-outs/);
  });

  it('OMITS a stat it could not read rather than inventing one', async () => {
    stats.value = { templeCount: null, pujaTypeCount: null };
    const t = await textOfAsync(AboutPage());
    expect(t).not.toContain('Temples listed');
    expect(t).not.toContain('Pujas you can book');
    // and does not substitute a remembered figure
    expect(t).not.toContain('200+');
    expect(t).toContain('Role portals live');
  });

  it('renders whichever count DID load when the other one did not', async () => {
    stats.value = { templeCount: 20, pujaTypeCount: null };
    const t = await textOfAsync(AboutPage());
    expect(t).toContain('Temples listed');
    expect(t).not.toContain('Pujas you can book');
  });

  it('does not advertise an NRI multiplier the gateway is never asked for', async () => {
    const t = await textOfAsync(AboutPage());
    expect(t).not.toMatch(/NRI pricing is higher than domestic/);
    expect(t).not.toMatch(/9–10× *NRI multiplier/);
  });
});

describe('LEG-15 — the cookie policy carries a control, not an instruction', () => {
  beforeEach(() => cleanup());

  it('renders a Cookie settings button', () => {
    const { getByTestId } = render(<CookiePolicyPage />);
    expect(getByTestId('cookie-settings-button')).toBeTruthy();
  });

  it('no longer tells the reader to clear browser storage by hand', () => {
    const t = textOf(<CookiePolicyPage />);
    expect(t).not.toContain('darshya_cookie_consent_v1');
    expect(t).not.toMatch(/clearing the/i);
  });

  it('/privacy carries the same control', () => {
    const { getAllByTestId } = render(<PrivacyPage />);
    expect(getAllByTestId('cookie-settings-button').length).toBeGreaterThan(0);
  });
});

describe('LEG-16 — /privacy routes rights to the screen that files them', () => {
  beforeEach(() => cleanup());

  it('links to /account/privacy from the rights section', () => {
    const { container } = render(<PrivacyPage />);
    const hrefs = [...container.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/account/privacy');
  });

  it('keeps the email channel as the fallback, not the only route', () => {
    const t = textOf(<PrivacyPage />);
    expect(t).toMatch(/No account, or prefer email/i);
  });
});

describe('LEG-18 — /refunds walks the user to controls that exist', () => {
  beforeEach(() => cleanup());

  it('names the two real buttons', () => {
    const t = textOf(<RefundsPage />);
    expect(t).toContain('Cancel Booking');
    expect(t).toContain('Request cancellation & refund');
  });

  it('does not name a "Request Refund" button', () => {
    const t = textOf(<RefundsPage />);
    expect(t).not.toContain('Request Refund');
  });

  it('links to the bookings list the walkthrough starts from', () => {
    const { container } = render(<RefundsPage />);
    const hrefs = [...container.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/bookings');
  });

  it('warns that the refund may be less than the amount paid', () => {
    const t = textOf(<RefundsPage />);
    expect(t).toMatch(/not necessarily the full\s+amount paid/i);
  });
});
