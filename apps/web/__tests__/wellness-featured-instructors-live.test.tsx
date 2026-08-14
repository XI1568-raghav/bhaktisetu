import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * COM-14 (prod sweep 2026-08-12, P2/content) — /wellness shipped fabricated
 * supply.
 *
 * The "Live Sessions — Upcoming this week" half (six cards dated "Apr 18 6:00
 * AM" with "3 spots left" whose Book control navigated to a marketing category
 * page) was closed by AW-07: that block is now <UpcomingClassesSection />,
 * which renders wellness_sessions rows and states plainly when there are none.
 *
 * This closes the other half the finding named — the six invented instructors
 * sitting directly above it. `featuredInstructors` was a literal array:
 * Aarav Sharma 4.9 / 12 yrs / ₹599, Swami Dhyanananda 4.9 / 20 yrs / ₹799,
 * Acharya Goenkaji 4.9 / 25 yrs / ₹999 — ratings, years of experience and
 * per-session prices for people who teach nothing on this platform, each card
 * linking to a fixture profile. A visitor read them as the supply they were
 * buying into.
 *
 * The section is now derived from the same live class rows: an instructor
 * appears because they have an upcoming class, priced at what that class
 * actually costs. No rows, no instructors — and the page says so.
 */

vi.mock('../lib/api-config', () => ({
  API_BASE_URL: 'https://api.test',
  DATA_FETCH_TIMEOUT_MS: 15000,
  AUTH_FETCH_TIMEOUT_MS: 20000,
  fetchWithTimeout: (input: RequestInfo | URL, init: RequestInit = {}) =>
    globalThis.fetch(input, init),
  isNetworkFailure: (e: unknown) => e instanceof TypeError,
  NETWORK_ERROR_MESSAGE: 'Could not reach Darshya.',
  loadErrorMessage: () => "Couldn't load live data.",
}));

function classRow(over: Record<string, unknown> = {}) {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    title: 'Deep Hatha Yoga',
    scheduledAt: new Date(Date.now() + 86_400_000).toISOString(),
    durationMinutes: 60,
    capacity: 10,
    priceInr: '1000',
    status: 'SCHEDULED',
    instructorName: 'Ananya Devi',
    enrolledCount: 3,
    spotsLeft: 7,
    ...over,
  };
}

function okFetch(rows: unknown[]) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ data: rows }),
  });
}

beforeEach(() => vi.restoreAllMocks());
afterEach(() => cleanup());

describe('COM-14 — /wellness instructors come from real classes', () => {
  it('lists the instructors who actually teach here', async () => {
    globalThis.fetch = okFetch([
      classRow(),
      classRow({ id: '2', instructorName: 'Ravi Kumar', priceInr: '450', title: 'Pranayama' }),
    ]) as unknown as typeof fetch;
    const { default: Section } = await import('../app/wellness/FeaturedInstructorsSection');
    render(<Section />);
    await waitFor(() => expect(screen.getByText('Ananya Devi')).toBeTruthy());
    expect(screen.getByText('Ravi Kumar')).toBeTruthy();
    // The fixtures that used to be here must never come back.
    expect(screen.queryByText(/Aarav Sharma/)).toBeNull();
    expect(screen.queryByText(/Swami Dhyanananda/)).toBeNull();
    expect(screen.queryByText(/Acharya Goenkaji/)).toBeNull();
  });

  it('collapses repeat classes into one instructor, not one card per class', async () => {
    globalThis.fetch = okFetch([
      classRow({ id: 'a', priceInr: '900' }),
      classRow({ id: 'b', priceInr: '300', title: 'Evening Yin' }),
    ]) as unknown as typeof fetch;
    const { default: Section } = await import('../app/wellness/FeaturedInstructorsSection');
    render(<Section />);
    await waitFor(() => expect(screen.getAllByText('Ananya Devi').length).toBe(1));
    // Priced from the cheapest real class, never an invented "from" number.
    expect(screen.getByText(/300/)).toBeTruthy();
    expect(screen.queryByText(/599|799|999/)).toBeNull();
  });

  it('says so honestly when nobody is teaching yet', async () => {
    globalThis.fetch = okFetch([]) as unknown as typeof fetch;
    const { default: Section } = await import('../app/wellness/FeaturedInstructorsSection');
    render(<Section />);
    await waitFor(() => expect(screen.getByText(/no instructors/i)).toBeTruthy());
    expect(screen.queryByText(/Aarav Sharma/)).toBeNull();
  });

  it('reports a failed fetch instead of substituting fixtures', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('offline')) as unknown as typeof fetch;
    const { default: Section } = await import('../app/wellness/FeaturedInstructorsSection');
    render(<Section />);
    await waitFor(() => expect(screen.getByText(/couldn’t load|couldn't load/i)).toBeTruthy());
    expect(screen.queryByText(/Aarav Sharma/)).toBeNull();
  });
});

describe('the /wellness page carries no invented supply', () => {
  it('has no hardcoded instructor fixtures left in the source', () => {
    const raw = readFileSync(resolve(__dirname, '..', 'app/wellness/page.tsx'), 'utf8');
    // Comments stripped: AW-07's note quotes one of the removed fixtures by
    // name to explain why it went, and documenting a defect must not trip its
    // own guard.
    const src = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(src).toContain('FeaturedInstructorsSection');
    for (const invented of [
      'Aarav Sharma',
      'Swami Dhyanananda',
      'Rajesh Kulkarni',
      'Acharya Goenkaji',
      'Meera Iyer',
      'Anita Desai',
    ]) {
      expect(src).not.toContain(invented);
    }
  });
});
