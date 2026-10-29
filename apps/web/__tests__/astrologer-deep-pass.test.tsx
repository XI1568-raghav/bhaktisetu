import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import React from 'react';

/**
 * Astrologer deep pass 2026-10-29. Each block pins a defect found by reading the
 * portal and the devotee booking flow against the live API, not just by looking
 * at the empty state.
 */

const useAuthMock = vi.fn();
vi.mock('../lib/auth-context', () => ({ useAuth: () => useAuthMock() }));
vi.mock('../components/AuthGuard', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('../components/MyProviderProfileCard', () => ({ default: () => <div /> }));
vi.mock('../components/provider/EarningsCard', () => ({ default: () => <div /> }));
vi.mock('../components/provider/KycStatusBadge', () => ({ default: () => <div /> }));
vi.mock('../lib/razorpay-loader', () => ({ preloadRazorpayCheckout: () => undefined }));

vi.mock('../lib/api-config', () => ({
  API_BASE_URL: 'https://api.test',
  DATA_FETCH_TIMEOUT_MS: 15000,
  AUTH_FETCH_TIMEOUT_MS: 20000,
  fetchWithTimeout: (input: RequestInfo | URL, init: RequestInit = {}) => globalThis.fetch(input, init),
  isNetworkFailure: (e: unknown) => e instanceof TypeError,
  NETWORK_ERROR_MESSAGE: 'Could not reach Darshya.',
  loadErrorMessage: () => "Couldn't load live data.",
  loadErrorIsReauth: () => false,
}));

const routerPush = vi.fn();
let routeParams: Record<string, string> = { id: '71e54617-6963-418e-845f-920f4350505b' };
vi.mock('next/navigation', () => ({
  useParams: () => routeParams,
  useRouter: () => ({ push: routerPush, replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams({ id: routeParams.id ?? '' }),
  usePathname: () => '/astrologer-portal',
}));

import AstrologerConsultationsPage from '../app/astrologer-portal/consultations/page';
import AstrologerEarningsPage from '../app/astrologer-portal/earnings/page';
import AstrologerProfilePage from '../app/astrologer-portal/profile/page';
import AstrologerAvailabilityPage from '../app/astrologer-portal/availability/page';
import AstrologyBookPage from '../app/astrology/[id]/book/page';
import AstrologerProfileClient from '../app/astrology/view/AstrologerProfileClient';
import { ASTROLOGER_PRESENCE_EVENT, HEARTBEAT_INTERVAL_MS, useAstrologerHeartbeat } from '../lib/use-astrologer-heartbeat';

const realFetch = globalThis.fetch;
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

beforeEach(() => {
  vi.clearAllMocks();
  useAuthMock.mockReturnValue({ session: { accessToken: 'tok' }, user: { fullName: 'Acharya Test', email: 'a@test' } });
});
afterEach(() => {
  cleanup();
  globalThis.fetch = realFetch;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ─── Consultations page ──────────────────────────────────────────────────────

describe('astrologer Consultations page', () => {
  const row = (over: Record<string, unknown>) => ({
    id: 'x', reference: 'AC-X', minutes: 15, amountInr: 375, status: 'confirmed',
    jitsiUrl: 'https://meet.jit.si/r', scheduledAt: null, createdAt: '2026-11-01T00:00:00Z', paidAt: '2026-11-01T00:00:00Z', ...over,
  });
  const serve = (consultations: unknown[]) => {
    globalThis.fetch = vi.fn(async () => json({ consultations })) as unknown as typeof fetch;
  };

  it('lists the NEXT session first (the API list is newest-first) and hides unpaid checkouts', async () => {
    serve([
      row({ id: 'late', reference: 'AC-LATE', scheduledAt: '2026-12-20T05:30:00Z' }),
      row({ id: 'soon', reference: 'AC-SOON', scheduledAt: '2026-11-10T05:30:00Z' }),
      row({ id: 'ghost', reference: 'AC-UNPAID', status: 'pending_payment', paidAt: null }),
    ]);
    render(<AstrologerConsultationsPage />);
    await screen.findByText('AC-SOON');
    const text = document.body.textContent ?? '';
    expect(text.indexOf('AC-SOON')).toBeLessThan(text.indexOf('AC-LATE'));
    expect(text).not.toContain('AC-UNPAID');
    expect(text).not.toMatch(/Awaiting payment/);
  });

  it('prints times in IST with the label', async () => {
    serve([row({ id: 'a', reference: 'AC-A', scheduledAt: '2026-11-10T03:30:00Z' })]);
    render(<AstrologerConsultationsPage />);
    await screen.findByText('AC-A');
    expect(document.body.textContent).toMatch(/10 Nov, 9:00\s?am IST/i);
  });

  it('End asks first: declining sends nothing, accepting completes', async () => {
    serve([row({ id: 'a', reference: 'AC-A' })]);
    render(<AstrologerConsultationsPage />);
    await screen.findByText('AC-A');
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockClear();

    vi.spyOn(window, 'confirm').mockReturnValueOnce(false);
    fireEvent.click(screen.getByRole('button', { name: /End/ }));
    expect(fetchMock).not.toHaveBeenCalled();

    vi.spyOn(window, 'confirm').mockReturnValueOnce(true);
    fireEvent.click(screen.getByRole('button', { name: /End/ }));
    await waitFor(() => expect(fetchMock.mock.calls.some((c) => String(c[0]).endsWith('/consultation/a/complete'))).toBe(true));
  });
});

// ─── Earnings page ───────────────────────────────────────────────────────────

describe('astrologer Earnings rows', () => {
  it('a refunded (REVERSED) row is not labelled Pending, an upcoming one says it is after the session', async () => {
    globalThis.fetch = vi.fn(async () =>
      json({
        data: [
          { id: '1', bookingId: 'b1', status: 'REVERSED', releaseStatus: 'reversed', createdAt: '2026-11-01T10:00:00Z', grossAmountInr: 500, platformCutInr: 100, earningsInr: 400 },
          { id: '2', bookingId: 'b2', status: 'PENDING', releaseStatus: 'upcoming', createdAt: '2026-11-01T11:00:00Z', grossAmountInr: 250, platformCutInr: 50, earningsInr: 200 },
          { id: '3', bookingId: 'b3', status: 'PENDING', releaseStatus: 'payable', createdAt: '2026-11-01T12:00:00Z', grossAmountInr: 125, platformCutInr: 25, earningsInr: 100 },
          { id: '4', bookingId: 'b4', status: 'PAID', releaseStatus: 'paid', createdAt: '2026-11-01T13:00:00Z', grossAmountInr: 125, platformCutInr: 25, earningsInr: 100 },
        ],
        summary: { totalEarningsInr: 400, pendingInr: 100, upcomingInr: 200, paidInr: 100, astrologerShare: 0.8 },
      }),
    ) as unknown as typeof fetch;
    render(<AstrologerEarningsPage />);
    await screen.findByText('Refunded');
    expect(screen.getByText('After session')).toBeTruthy();
    expect(screen.getByText('Ready')).toBeTruthy();
    expect(screen.getByText('Paid', { selector: 'span.rounded-full' })).toBeTruthy();
    expect(screen.queryByText('Pending', { selector: 'span.rounded-full' })).toBeNull();
  });
});

// ─── Profile page ────────────────────────────────────────────────────────────

describe('astrologer Profile page', () => {
  const profile = { displayName: 'Real Name', bio: 'Old bio', experience: 7, specialties: ['Vedic Astrology'], languages: ['Hindi'], pricePerMinute: '30', rating: 0, approved: true };

  it('a failed load does NOT leave a savable blank form (saving it would overwrite the real profile)', async () => {
    globalThis.fetch = vi.fn(async () => json({ error: 'boom' }, 500)) as unknown as typeof fetch;
    render(<AstrologerProfilePage />);
    await screen.findByRole('alert');
    expect((screen.getByRole('button', { name: /Save Changes/ }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole('button', { name: /Retry/ })).toBeTruthy();
    // And nothing was written.
    const calls = (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls.some((c) => (c[1] as RequestInit | undefined)?.method === 'PATCH')).toBe(false);
  });

  it('clearing the bio sends an EMPTY bio (it used to be dropped, so the old text came back)', async () => {
    const fetchMock = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) =>
      init?.method === 'PATCH' ? json({ profile: { ...profile, bio: null, pricePerMinute: '30' } }) : json({ profile }),
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    render(<AstrologerProfilePage />);
    const bio = (await screen.findByPlaceholderText(/Tell devotees/)) as HTMLTextAreaElement;
    await waitFor(() => expect(bio.value).toBe('Old bio'));
    fireEvent.change(bio, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/ }));
    await waitFor(() => expect(fetchMock.mock.calls.some((c) => c[1]?.method === 'PATCH')).toBe(true));
    const body = JSON.parse(String(fetchMock.mock.calls.find((c) => c[1]?.method === 'PATCH')![1]!.body));
    expect(body.bio).toBe('');
    expect(body.pricePerMinute).toBe(30);
  });

  it('the rate box can be cleared and retyped, and an out-of-range rate is refused before any request', async () => {
    const fetchMock = vi.fn(async () => json({ profile }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    render(<AstrologerProfilePage />);
    const rate = (await screen.findByLabelText(/Per-minute rate/)) as HTMLInputElement;
    await waitFor(() => expect(rate.value).toBe('30'));
    fireEvent.change(rate, { target: { value: '' } });
    expect(rate.value).toBe('');
    fireEvent.change(rate, { target: { value: '100000' } });
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/ }));
    expect(await screen.findByText(/between ₹1 and ₹1000/)).toBeTruthy();
    expect(fetchMock.mock.calls.some((c) => (c as unknown[])[1] && ((c as unknown[])[1] as RequestInit).method === 'PATCH')).toBe(false);
  });

  it('a new astrologer sees "No ratings yet", not a 0.0 star', async () => {
    globalThis.fetch = vi.fn(async () => json({ profile })) as unknown as typeof fetch;
    render(<AstrologerProfilePage />);
    expect(await screen.findByText('No ratings yet')).toBeTruthy();
    expect(document.body.textContent).not.toContain('0.0');
  });
});

// ─── Availability page ───────────────────────────────────────────────────────

describe('astrologer Availability page', () => {
  it('says so when nothing is saved: the suggested week is not presented as the saved schedule', async () => {
    globalThis.fetch = vi.fn(async () => json({ profile: { availability: null } })) as unknown as typeof fetch;
    render(<AstrologerAvailabilityPage />);
    expect(await screen.findByText(/You have not saved a schedule yet/)).toBeTruthy();
  });

  it('reads the grid the MOBILE app saved instead of discarding it for the defaults', async () => {
    globalThis.fetch = vi.fn(async () =>
      json({ profile: { availability: { weekly: [{ day: 'Sun', morning: true, afternoon: true, evening: true }] } } }),
    ) as unknown as typeof fetch;
    render(<AstrologerAvailabilityPage />);
    await waitFor(() => expect(screen.queryByText(/You have not saved a schedule yet/)).toBeNull());
    expect(document.body.textContent).toMatch(/3 slots active/);
  });

  it('a failed load leaves Save disabled (saving the suggested week would overwrite the real one)', async () => {
    globalThis.fetch = vi.fn(async () => json({ error: 'x' }, 500)) as unknown as typeof fetch;
    render(<AstrologerAvailabilityPage />);
    await screen.findByText(/Retry/);
    expect((screen.getByRole('button', { name: /Save Schedule/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('states that times are IST', async () => {
    globalThis.fetch = vi.fn(async () => json({ profile: { availability: null } })) as unknown as typeof fetch;
    render(<AstrologerAvailabilityPage />);
    expect((await screen.findAllByText(/\bIST\b/)).length).toBeGreaterThan(0);
  });
});

// ─── Booking page ────────────────────────────────────────────────────────────

describe('devotee booking page', () => {
  const ASTRO = {
    id: '71e54617-6963-418e-845f-920f4350505b', name: 'Acharya V', perMinuteRate: 30, specializations: ['Vedic'], languages: ['Hindi'],
    rating: 0, isOnline: true,
    availability: {
      days: {
        Monday: { morning: true, afternoon: false, evening: false }, Tuesday: { morning: false, afternoon: false, evening: false },
        Wednesday: { morning: false, afternoon: false, evening: false }, Thursday: { morning: false, afternoon: false, evening: false },
        Friday: { morning: false, afternoon: false, evening: false }, Saturday: { morning: false, afternoon: false, evening: false },
        Sunday: { morning: false, afternoon: false, evening: false },
      },
      hours: { morning: '06:00-12:00', afternoon: '12:00-17:00', evening: '17:00-22:00' },
      timezone: 'IST',
    },
  };

  it('shows the hours it will enforce, in IST', async () => {
    globalThis.fetch = vi.fn(async () => json({ astrologer: ASTRO })) as unknown as typeof fetch;
    render(<AstrologyBookPage />);
    await screen.findByText(/Hours for booked slots \(IST\)/);
    expect(document.body.textContent).toMatch(/Mon\s*Morning 06:00–12:00/);
  });

  it('a slot outside the hours disables Pay and explains why, before any request to book', async () => {
    const fetchMock = vi.fn(async () => json({ astrologer: ASTRO }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    render(<AstrologyBookPage />);
    await screen.findByText(/Hours for booked slots/);
    // The next Sunday, 11:00 local. Sunday is closed in the fixture whatever the zone.
    const d = new Date(Date.now() + 3 * 86_400_000);
    while (new Date(d.getTime() + 330 * 60_000).getUTCDay() !== 0) d.setDate(d.getDate() + 1);
    const pad = (n: number) => String(n).padStart(2, '0');
    const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const dateInput = document.querySelector('input[type="date"], input[inputmode], input[placeholder]') as HTMLInputElement | null;
    const timeInput = document.querySelector('input[type="time"]') as HTMLInputElement;
    expect(timeInput).toBeTruthy();
    // DateInput may render a text field: find the first non-time input inside the datetime group.
    const group = timeInput.closest('[role="group"]')!;
    const first = group.querySelector('input:not([type="time"])') as HTMLInputElement;
    void dateInput;
    fireEvent.change(first, { target: { value: dateStr } });
    fireEvent.change(timeInput, { target: { value: '11:00' } });
    expect(await screen.findByRole('alert')).toBeTruthy();
    const pay = screen.getByRole('button', { name: /Pay/ }) as HTMLButtonElement;
    expect(pay.disabled).toBe(true);
    expect(fetchMock.mock.calls.some((c) => String(c[0]).includes('/consultation/book'))).toBe(false);
  });

  it('no longer promises a 10-minute refund that nothing measures', async () => {
    globalThis.fetch = vi.fn(async () => json({ astrologer: { ...ASTRO, availability: null } })) as unknown as typeof fetch;
    render(<AstrologyBookPage />);
    await screen.findByText(/Secure Razorpay checkout/);
    expect(document.body.textContent).not.toMatch(/within 10 min/i);
    expect(document.body.textContent).toMatch(/24 hours/);
  });
});

// ─── Public profile ──────────────────────────────────────────────────────────

describe('public astrologer profile invents nothing', () => {
  const NEW_ASTRO = {
    id: '71e54617-6963-418e-845f-920f4350505b', name: 'New Astrologer', specializations: [], languages: [], experienceYears: 0,
    rating: 0, consultationCount: 0, perMinuteRate: 20, isOnline: false, bio: '', verified: false,
  };

  it('a brand-new, unverified astrologer shows no rating, no "0 reviews", no "Verified: Yes"', async () => {
    globalThis.fetch = vi.fn(async () => json({ astrologer: NEW_ASTRO })) as unknown as typeof fetch;
    render(<AstrologerProfileClient />);
    await screen.findByText('New Astrologer');
    const text = document.body.textContent ?? '';
    expect(text).not.toMatch(/0 reviews/);
    expect(text).not.toMatch(/0 consultations/);
    expect(text).not.toMatch(/Verified\s*Yes/);
    expect(text).not.toMatch(/onboarded and verified/);
    expect(text).toMatch(/Not rated yet/);
    expect(text).toMatch(/New on Darshya/);
    expect(text).toMatch(/Live on Darshya/);
    expect(text).toMatch(/has not added a bio yet/);
  });

  it('only a really reviewed astrologer says Verified', async () => {
    globalThis.fetch = vi.fn(async () => json({ astrologer: { ...NEW_ASTRO, verified: true } })) as unknown as typeof fetch;
    render(<AstrologerProfileClient />);
    await screen.findByText('New Astrologer');
    expect(document.body.textContent).toMatch(/Verified by Darshya/);
  });
});

// ─── Presence heartbeat ──────────────────────────────────────────────────────

describe('useAstrologerHeartbeat', () => {
  it('re-asserts presence the server still reports online, and tells the dashboard', async () => {
    vi.useFakeTimers();
    const calls: Array<{ url: string; method: string }> = [];
    globalThis.fetch = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(url), method: init?.method ?? 'GET' });
      return json({ online: true });
    }) as unknown as typeof fetch;
    const seen: boolean[] = [];
    const onPresence = (e: Event) => seen.push((e as CustomEvent<{ online: boolean }>).detail.online);
    window.addEventListener(ASTROLOGER_PRESENCE_EVENT, onPresence);

    const { unmount } = renderHook(() => useAstrologerHeartbeat('tok'));
    await act(async () => { await vi.advanceTimersByTimeAsync(HEARTBEAT_INTERVAL_MS + 10); });
    expect(calls.map((c) => c.method)).toEqual(['GET', 'POST']);
    expect(seen).toEqual([true]);
    // The beat is well inside the API's 15-minute decay.
    expect(HEARTBEAT_INTERVAL_MS).toBeLessThan(15 * 60 * 1000);

    unmount();
    await act(async () => { await vi.advanceTimersByTimeAsync(HEARTBEAT_INTERVAL_MS * 3); });
    expect(calls).toHaveLength(2);
    window.removeEventListener(ASTROLOGER_PRESENCE_EVENT, onPresence);
  });

  it('never switches an offline astrologer back on', async () => {
    vi.useFakeTimers();
    const methods: string[] = [];
    globalThis.fetch = vi.fn(async (_u: RequestInfo | URL, init?: RequestInit) => {
      methods.push(init?.method ?? 'GET');
      return json({ online: false });
    }) as unknown as typeof fetch;
    renderHook(() => useAstrologerHeartbeat('tok'));
    await act(async () => { await vi.advanceTimersByTimeAsync(HEARTBEAT_INTERVAL_MS + 10); });
    expect(methods).toEqual(['GET']);
  });

  it('does nothing without a session', async () => {
    vi.useFakeTimers();
    globalThis.fetch = vi.fn() as unknown as typeof fetch;
    renderHook(() => useAstrologerHeartbeat(undefined));
    await act(async () => { await vi.advanceTimersByTimeAsync(HEARTBEAT_INTERVAL_MS * 2); });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
