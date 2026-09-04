import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * LEG-03 (F223) — the site must not offer a refund the engine refuses to pay.
 *
 * The finding was filed as "the site says no refund inside 24h, the code owes
 * 50% or 25%". The copy half was closed by routing /faqs, /nri-pujas,
 * /why-darshya and Terms §8 through apps/web/lib/cancellation-policy.ts. Two
 * things survived that, both live:
 *
 * 1. THE QUOTE. `booking.service.cancelBooking` refuses a devotee cancel inside
 *    24h of the slot, which makes the ladder's 50% (4-24h) and 25% (<4h) tiers
 *    unreachable on that path. /bookings/view never knew: `isCancellable` was a
 *    pure status allowlist with no clock test at all, so a paid booking ten
 *    hours from its slot still rendered "Cancel Booking". Pressing it fetched
 *    /cancel-quote, which priced the unreachable tier, printed "You get ₹4,000
 *    back (50% refund (4-24h before))", and the POST that followed answered
 *    409. The devotee was quoted half their money and paid none of it.
 *
 * 2. THREE SURFACES still hardcoding "Free cancellation up to 24 hours before".
 *    That promises a FULL refund at the exact hour DEFAULT_CANCEL_POLICY drops
 *    to 75% — the over-promise pointing the other way, on a checkout page.
 *
 * Confirmed RED before the fix: with a booking 10 hours out the cancel control
 * rendered, the dialog printed the rupee figure, and the three files below each
 * contained the banned sentence.
 */

vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({
    session: { accessToken: 'test-token' },
    user: { id: 'u1', fullName: 'Test Devotee', email: 'd@x.test', phone: '9990000000' },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

vi.mock('../components/AuthGuard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const searchParams = new URLSearchParams('id=bk-1');
vi.mock('next/navigation', () => ({
  useSearchParams: () => searchParams,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/bookings/view',
}));

import BookingViewPage from '../app/bookings/view/page';
import {
  CANCELLATION_CUTOFF_HOURS,
  FULL_REFUND_HOURS_BEFORE,
  PARTIAL_REFUND_PERCENT,
} from '../lib/cancellation-policy';

vi.setConfig({ testTimeout: 45_000 });

const WEB_ROOT = path.resolve(__dirname, '..');

/**
 * A PAID booking whose slot is `hoursOut` hours away.
 *
 * `scheduledTimeSlot` is what the page measures from — measuring off the DATE
 * alone is RV-11, and it is the reason a 10-hour offset has to be built from
 * the real instant rather than from "tomorrow".
 */
function bookingRow(hoursOut: number) {
  const slot = new Date(Date.now() + hoursOut * 60 * 60 * 1000);
  const hh = String(slot.getHours()).padStart(2, '0');
  const mm = String(slot.getMinutes()).padStart(2, '0');
  const y = slot.getFullYear();
  const m = String(slot.getMonth() + 1).padStart(2, '0');
  const d = String(slot.getDate()).padStart(2, '0');
  return {
    id: 'bk-1',
    bookingNumber: 'BS-20260828-00001',
    status: 'priest_assigned',
    scheduledDate: `${y}-${m}-${d}`,
    scheduledTimeSlot: `${hh}:${mm}`,
    priceAmount: '8000.00',
    videoProofUrl: null,
    createdAt: '2026-08-01T00:00:00.000Z',
    temple: { name: 'Kashi Vishwanath', city: 'Varanasi', state: 'Uttar Pradesh' },
    pujaType: { name: 'Rudrabhishek', slug: 'rudrabhishek' },
    payments: [{ status: 'captured', amount: '8000.00', refundAmount: null }],
  };
}

/** What the OLD server returned for a booking inside the cutoff. */
const UNREACHABLE_TIER_QUOTE = {
  bookingId: 'bk-1',
  refundFraction: 0.5,
  refundAmountInr: 4000,
  feeAmountInr: 4000,
  tierLabel: '50% refund (4–24h before)',
  hoursUntilSlot: 10,
  refundDaysLabel: '5-7 business days',
};

function jsonOk(body: unknown) {
  return { ok: true, status: 200, json: async () => body } as unknown as Response;
}

function mockApi(hoursOut: number, quote: unknown) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/cancel-quote')) return jsonOk(quote);
    if (url.includes('/bookings/bk-1')) return jsonOk({ booking: bookingRow(hoursOut) });
    return jsonOk({});
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

async function renderView() {
  render(<BookingViewPage />);
  await screen.findByRole('heading', { name: /Rudrabhishek/i }, { timeout: 15_000 });
}

beforeEach(() => {
  vi.unstubAllGlobals();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('LEG-03 — /bookings/view inside the cancellation cutoff', () => {
  it('does not offer a cancel control on a booking 10 hours from its slot', async () => {
    mockApi(10, UNREACHABLE_TIER_QUOTE);
    await renderView();

    expect(screen.queryByRole('button', { name: /^cancel booking$/i })).toBeNull();
  });

  it('says why, and quotes the published tiers rather than the unreachable ones', async () => {
    mockApi(10, UNREACHABLE_TIER_QUOTE);
    await renderView();

    const body = document.body.textContent ?? '';
    expect(body).toMatch(
      new RegExp(`within ${CANCELLATION_CUTOFF_HOURS} hours of its scheduled time`, 'i'),
    );
    expect(body).toMatch(new RegExp(`${PARTIAL_REFUND_PERCENT}%`));
    expect(body).toMatch(new RegExp(`${FULL_REFUND_HOURS_BEFORE} hours`));
  });

  it('offers no route at all to the unreachable tier or its rupee figure', async () => {
    mockApi(10, UNREACHABLE_TIER_QUOTE);
    await renderView();

    // Walk whatever path this page still offers. On the fixed page there is no
    // control, so this is a no-op; on the unfixed page the control is present,
    // the click fetches the quote, and ₹4,000 / "50% refund" land on screen —
    // which is what makes this assertion RED rather than vacuous.
    const control = screen.queryByRole('button', { name: /^cancel booking$/i });
    if (control) {
      fireEvent.click(control);
      await waitFor(() =>
        expect(document.body.textContent).not.toMatch(/Working out what you get back/i),
      );
    }

    const body = document.body.textContent ?? '';
    // ₹4,000 was the exact number the devotee was shown and then not paid.
    expect(body).not.toMatch(/4,000/);
    expect(body).not.toMatch(/50% refund/i);
  });

  it('still offers the control on a booking three days out', async () => {
    // The gate must be the clock, not a blanket removal — otherwise the fix is
    // "nobody can ever cancel", which is a different bug.
    mockApi(72, {
      ...UNREACHABLE_TIER_QUOTE,
      refundFraction: 1,
      refundAmountInr: 8000,
      feeAmountInr: 0,
      tierLabel: 'Full refund (48h+ before)',
      hoursUntilSlot: 72,
      cancellationAllowed: true,
    });
    await renderView();

    expect(screen.getByRole('button', { name: /^cancel booking$/i })).toBeTruthy();
  });

  /**
   * Defence in depth. The client gate uses the browser clock; the server is the
   * authority. If a skewed clock lets the dialog open, the quote's
   * `cancellationAllowed: false` must still suppress the figure and disable the
   * confirm — never let the devotee fire a POST the server has already said it
   * will refuse.
   */
  it('honours cancellationAllowed:false from the server even with the dialog open', async () => {
    mockApi(72, {
      ...UNREACHABLE_TIER_QUOTE,
      cancellationAllowed: false,
      cancellationCutoffHours: CANCELLATION_CUTOFF_HOURS,
      refundAmountInr: 0,
      feeAmountInr: 8000,
      tierLabel: 'Cancellation is not possible within 24 hours of the scheduled time',
    });
    await renderView();

    fireEvent.click(screen.getByRole('button', { name: /^cancel booking$/i }));
    await waitFor(() =>
      expect(document.body.textContent).toMatch(/can no longer be cancelled/i),
    );

    const confirm = screen.getByRole('button', { name: /yes, cancel/i }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    expect(document.body.textContent).not.toMatch(/You get ₹/);
  });
});

/**
 * The three surfaces that still hardcoded a full-refund promise at the 24-hour
 * mark. A source ratchet rather than a render, because two of them are async
 * server components; the assertion is on the exact sentence the finding quotes,
 * so it cannot pass by accident.
 */
describe('LEG-03 — no surface promises a free cancellation at the 24-hour mark', () => {
  const SURFACES = [
    'app/checkout/offering/page.tsx',
    'app/pujas/home-puja/[slug]/page.tsx',
    'app/pujas/home-puja/book/BookHomePujaClient.tsx',
  ];

  /**
   * Matches the banned promise only in RENDERED positions. The fixed files
   * describe the old wording in their comments — that is the record of what was
   * wrong and must stay — so comment lines are excluded before matching.
   */
  const BANNED = /free cancellation\s+(up to\s+)?24\s+hours?\s+before/i;

  /** Source with every block and line comment removed — JSX `{\/* … *\/}` included. */
  function code(rel: string): string {
    return readFileSync(path.join(WEB_ROOT, rel), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|\n)[^\n'"`]*\/\/[^\n]*/g, '$1');
  }

  it('the ratchet rejects the exact sentence that shipped', () => {
    expect(BANNED.test('Free cancellation up to 24 hours before the scheduled time.')).toBe(true);
    expect(BANNED.test('Free cancellation 24 hours before')).toBe(true);
    // ...and accepts the canonical badge, which names the real full-refund hour.
    expect(BANNED.test('Free cancellation 48h+ before')).toBe(false);
  });

  it('the comment stripper does not blind the ratchet to rendered text', () => {
    // If `code()` over-stripped, every assertion below would pass vacuously.
    // These two files DO still contain the banned sentence inside a comment,
    // which is exactly the case the stripper has to handle — and the JSX the
    // comment sits next to has to survive.
    const offering = code('app/checkout/offering/page.tsx');
    expect(offering).toContain('CANCELLATION_BADGE_LABEL');
    expect(offering).not.toContain('LEG-03 (F223)');
  });

  for (const rel of SURFACES) {
    it(`${rel} does not promise a free cancellation at 24 hours`, () => {
      expect(BANNED.test(code(rel))).toBe(false);
    });

    it(`${rel} renders the shared cancellation-policy module instead`, () => {
      // Not a substitute for the assertion above — it pins WHERE the replacement
      // came from, so the next edit cannot retype a literal that happens to dodge
      // the regex.
      expect(readFileSync(path.join(WEB_ROOT, rel), 'utf8')).toMatch(
        /from '(\.\.\/)+lib\/cancellation-policy'/,
      );
    });
  }
});
