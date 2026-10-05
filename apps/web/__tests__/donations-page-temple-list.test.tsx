import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';

/**
 * Temple manager test (2026-10-05): the donations page offered every verified
 * catalogue temple as a donation cause (Kashi Vishwanath, Tirupati, ...), most
 * of which have no manager and no relationship with Darshya, so a donation to
 * them could not be paid on. It must list only temples the API says can receive
 * a donation, and say so plainly when there are none.
 */

const getTemples = vi.fn();
const getDonatableTemples = vi.fn();
vi.mock('../lib/api', () => ({
  getTemples: (...a: unknown[]) => getTemples(...a),
  getDonatableTemples: (...a: unknown[]) => getDonatableTemples(...a),
  getApprovedProviders: async () => ({ providers: [], total: 0, page: 1, limit: 6 }),
}));
vi.mock('../components/DonationForm', () => ({ default: () => <div data-testid="form" /> }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

async function renderList() {
  const { default: DonationsPage } = await import('../app/donations/page');
  const ui = await DonationsPage({ searchParams: Promise.resolve({}) });
  return render(ui);
}

describe('/donations temple list', () => {
  it('lists only the temples the donations API says can receive a donation', async () => {
    getDonatableTemples.mockResolvedValue([
      { id: 'tmp-1', name: 'QA Sheetla Mata Mandir', city: 'Gurugram', state: 'Haryana', deityPrimary: 'Sheetla Mata', description: 'A QA temple', images: [] },
    ]);
    const { container } = await renderList();
    expect(container.textContent).toContain('QA Sheetla Mata Mandir');
    expect(getTemples).not.toHaveBeenCalled();
    const hrefs = Array.from(container.querySelectorAll('a[href^="/donations?"]')).map((a) => a.getAttribute('href'));
    expect(hrefs.some((h) => h?.includes('causeId=tmp-1') && h.includes('causeKind=temple'))).toBe(true);
  });

  it('says no temples are taking donations yet, not that the list is "temporarily unavailable"', async () => {
    getDonatableTemples.mockResolvedValue([]);
    const { container } = await renderList();
    expect(container.textContent).not.toMatch(/temporarily unavailable/i);
    expect(container.textContent).toMatch(/No temples are accepting donations through Darshya yet/i);
  });

  it('says it could not load the list when the API is down', async () => {
    getDonatableTemples.mockRejectedValue(new Error('boom'));
    const { container } = await renderList();
    expect(container.textContent).toMatch(/could not be loaded/i);
    expect(container.textContent).not.toMatch(/No temples are accepting/i);
  });
});
