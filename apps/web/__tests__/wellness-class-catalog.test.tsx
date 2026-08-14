import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * AW-07 (2026-08-12, P1) — the wellness marketplace had a complete supply side
 * and ZERO demand side.
 *
 * GET /api/v1/wellness/sessions returned a real, bookable class
 * ({"title":"QA Deep Hatha Yoga","priceInr":"1000","status":"SCHEDULED"}) and
 * POST /wellness/sessions/:id/enroll worked end to end from curl — but
 * apps/web/app/wellness/{page,yoga,meditation,vipassana}/page.tsx contained
 * ZERO occurrences of fetch or API_BASE_URL, and `grep -rn "enroll"
 * apps/web/app --include=*.tsx` matched exactly four files, all instructor-side.
 * Nothing in the website could invoke the enrolment API. Wellness revenue was
 * structurally zero and the whole instructor-side build was stranded.
 *
 * Worse, the discovery surface that DID exist was fabricated: /wellness listed
 * six hardcoded classes ("Morning Hatha Flow · Aarav Sharma · 8 spots left")
 * that do not exist in any table, next to six fictional instructors.
 *
 * These tests lock the two properties that matter: a devotee can reach and pay
 * for a REAL class, and every empty/failed state stays honest instead of
 * rendering fixtures.
 */

vi.mock('../lib/api-config', () => ({
  API_BASE_URL: 'https://api.test',
  DATA_FETCH_TIMEOUT_MS: 15000,
  AUTH_FETCH_TIMEOUT_MS: 20000,
  // Must delegate to the CURRENT global fetch: these suites swap
  // globalThis.fetch per test, and a captured reference would freeze the first
  // one. The signal is passed through so the pages' timeout wiring stays real.
  fetchWithTimeout: (input: RequestInfo | URL, init: RequestInit = {}) =>
    globalThis.fetch(input, { ...init, signal: AbortSignal.timeout(15000) }),
  isNetworkFailure: (e: unknown) => e instanceof TypeError,
  NETWORK_ERROR_MESSAGE: 'Could not reach Darshya.',
  loadErrorMessage: (c: unknown) =>
    typeof c === 'object' && c !== null && 'status' in c
      ? `Couldn't load live data (HTTP ${(c as { status: number }).status}).`
      : "Couldn't load live data.",
}));

const useAuthMock = vi.fn();
vi.mock('../lib/auth-context', () => ({
  useAuth: () => useAuthMock(),
}));

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn(), back: vi.fn() }),
  useParams: () => ({ id: SESSION_ID }),
  useSearchParams: () => new URLSearchParams(),
}));

import WellnessClassesClient from '../app/wellness/classes/WellnessClassesClient';
import ClassDetailClient from '../app/wellness/classes/[id]/ClassDetailClient';

const SESSION_ID = '11111111-1111-1111-1111-111111111111';
const ENROLLMENT_ID = '22222222-2222-2222-2222-222222222222';

/** Exactly the shape GET /wellness/sessions returns after the AW-07 API change. */
const REAL_CLASS = {
  id: SESSION_ID,
  title: 'QA Deep Hatha Yoga',
  description: 'Morning hatha practice with pranayama.',
  type: 'YOGA',
  scheduledAt: new Date(Date.now() + 86_400_000).toISOString(),
  durationMinutes: 60,
  capacity: 10,
  priceInr: '1000',
  status: 'SCHEDULED',
  instructorName: 'Ananya Devi',
  enrolledCount: 3,
  spotsLeft: 7,
};

beforeEach(() => {
  vi.clearAllMocks();
  useAuthMock.mockReturnValue({
    session: { accessToken: 'demo-devotee-token' },
    user: { fullName: 'Demo Devotee', email: 'devotee@demo.com' },
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AW-07 — devotee class catalog', () => {
  it('lists a real class with its instructor, price and true seats left', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ data: [REAL_CLASS] }) })),
    );

    render(<WellnessClassesClient />);

    expect(await screen.findByText('QA Deep Hatha Yoga')).toBeTruthy();
    expect(screen.getByText(/Ananya Devi/)).toBeTruthy();
    expect(screen.getByText(/7 spots left/i)).toBeTruthy();
  });

  it('links each class to its own detail page', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ data: [REAL_CLASS] }) })),
    );

    render(<WellnessClassesClient />);

    const link = await screen.findByRole('link', { name: /QA Deep Hatha Yoga/i });
    expect(link.getAttribute('href')).toBe(`/wellness/classes/${SESSION_ID}`);
  });

  it('renders an honest empty state — never a fixture class — when nothing is scheduled', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ data: [] }) })),
    );

    render(<WellnessClassesClient />);

    expect(await screen.findByText(/no live classes scheduled/i)).toBeTruthy();
    // The fixtures that used to live on /wellness must not reappear anywhere.
    expect(screen.queryByText(/Morning Hatha Flow/)).toBeNull();
    expect(screen.queryByText(/Aarav Sharma/)).toBeNull();
  });

  it('says the load failed instead of silently showing an empty catalog', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) })),
    );

    render(<WellnessClassesClient />);

    expect(await screen.findByText(/couldn’t load|could not load/i)).toBeTruthy();
    expect(screen.queryByText(/no live classes scheduled/i)).toBeNull();
  });
});

/** Route a stubbed fetch by URL substring. Any unrouted URL 404s loudly. */
function routedFetch(handlers: Record<string, () => unknown>) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const key = Object.keys(handlers).find((k) => url.includes(k));
    if (!key) return { ok: false, status: 404, json: async () => ({ error: 'not found' }) };
    void init;
    return handlers[key]!();
  });
}

describe('AW-07 — devotee enrolment', () => {
  function fetchFor(handlers: Record<string, () => unknown>) {
    return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const key = Object.keys(handlers).find((k) => url.includes(k));
      if (!key) return { ok: false, status: 404, json: async () => ({ error: 'not found' }) };
      void init;
      return handlers[key]!();
    });
  }

  it('enrols and pays in demo mode, then reveals the real join link', async () => {
    // The API returns roomUrl ONLY to a PAID enrollee, so the pre-payment GET
    // must not carry it. Anything else would let the test pass without a
    // payment ever happening.
    let paid = false;
    const fetchMock = fetchFor({
      [`/wellness/sessions/${SESSION_ID}/enroll`]: () => ({
        ok: true,
        status: 201,
        json: async () => ({
          data: {
            enrollmentId: ENROLLMENT_ID,
            razorpayOrderId: 'order_demo_1',
            amount: 100000,
            currency: 'INR',
            keyId: 'rzp_test_demo',
            isDemoPayment: true,
          },
        }),
      }),
      [`/wellness/enrollments/${ENROLLMENT_ID}/verify`]: () => {
        paid = true;
        return {
          ok: true,
          status: 200,
          json: async () => ({ data: { id: ENROLLMENT_ID, status: 'PAID' } }),
        };
      },
      [`/wellness/sessions/${SESSION_ID}`]: () => ({
        ok: true,
        status: 200,
        json: async () => ({
          data: paid ? { ...REAL_CLASS, roomUrl: 'https://meet.jit.si/darshya-class' } : REAL_CLASS,
        }),
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<ClassDetailClient />);
    const button = await screen.findByRole('button', { name: /enrol|enroll/i });
    await act(async () => { fireEvent.click(button); });

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /join/i }).getAttribute('href')).toBe(
        'https://meet.jit.si/darshya-class',
      );
    });

    const calls = fetchMock.mock.calls.map((c) => String(c[0]));
    expect(calls.some((u) => u.includes(`/sessions/${SESSION_ID}/enroll`))).toBe(true);
    expect(calls.some((u) => u.includes(`/enrollments/${ENROLLMENT_ID}/verify`))).toBe(true);
  });

  it('never claims success when the server refuses the enrolment', async () => {
    const fetchMock = fetchFor({
      [`/wellness/sessions/${SESSION_ID}/enroll`]: () => ({
        ok: false,
        status: 409,
        json: async () => ({ error: 'Session is full' }),
      }),
      [`/wellness/sessions/${SESSION_ID}`]: () => ({
        ok: true,
        status: 200,
        json: async () => ({ data: REAL_CLASS }),
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<ClassDetailClient />);
    const button = await screen.findByRole('button', { name: /enrol|enroll/i });
    await act(async () => { fireEvent.click(button); });

    expect(await screen.findByText(/session is full/i)).toBeTruthy();
    expect(screen.queryByRole('link', { name: /join/i })).toBeNull();
    // The verify call must never fire after a failed enroll.
    expect(fetchMock.mock.calls.map((c) => String(c[0])).some((u) => u.includes('/verify'))).toBe(
      false,
    );
  });

  it('shows the real price and seats on the detail page', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ data: REAL_CLASS }) })),
    );

    render(<ClassDetailClient />);

    expect(await screen.findByText('QA Deep Hatha Yoga')).toBeTruthy();
    expect(screen.getByText(/7 spots left/i)).toBeTruthy();
    // Price shows on the card and again on the enrol button — both must be the
    // real ₹1,000 the API sent, never a rounded or invented figure.
    const priced = screen.getAllByText(/1,000/);
    expect(priced.length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /enrol|enroll/i }).textContent).toMatch(/1,000/);
  });
});

describe('AW-07 — /wellness discovery section is real, not fixtures', () => {
  const landing = readFileSync(resolve(__dirname, '../app/wellness/page.tsx'), 'utf8');

  it('no longer hardcodes the six invented classes', () => {
    // Match the DATA forms, not prose — the file keeps a comment naming the
    // fixtures it removed, and that comment is documentation, not a fixture.
    expect(landing).not.toMatch(/title:\s*'Morning Hatha Flow'/);
    expect(landing).not.toMatch(/spotsLeft:\s*\d/);
    expect(landing).not.toMatch(/const upcomingSessions = \[/);
  });

  it('routes devotees to the real catalog', () => {
    expect(landing).toMatch(/\/wellness\/classes/);
  });

  it('renders live classes in the section, linked to their detail page', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ data: [REAL_CLASS] }) })),
    );
    const { default: UpcomingClassesSection } = await import('../app/wellness/UpcomingClassesSection');
    render(<UpcomingClassesSection />);

    const link = await screen.findByRole('link', { name: /QA Deep Hatha Yoga/i });
    expect(link.getAttribute('href')).toBe(`/wellness/classes/${SESSION_ID}`);
  });

  it('says the schedule is empty rather than inventing one', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ data: [] }) })),
    );
    const { default: UpcomingClassesSection } = await import('../app/wellness/UpcomingClassesSection');
    render(<UpcomingClassesSection />);

    expect(await screen.findByText(/no live classes scheduled/i)).toBeTruthy();
    expect(screen.queryByText(/Morning Hatha Flow/)).toBeNull();
  });
});

/**
 * AW-07 remaining half (2026-08-14) — the two things the first pass shipped
 * without.
 *
 * 1. A FULL class must not present a payable Enrol button. The detail route
 *    now returns spotsLeft (apps/api/src/routes/wellness-sessions.ts,
 *    publicSession), so `isFull` finally has a number to read; before this the
 *    field was absent, `isFull` was permanently false, and a devotee could
 *    press "Enrol — ₹1,000" only to have POST /enroll answer 409.
 * 2. A signed-out devotee must be taken to sign-in. The page's own copy says
 *    "You'll be asked to sign in to complete the enrolment" and the component
 *    delivered a bare "Unauthorized" string with no way forward.
 */
describe('AW-07 — the enrol button obeys the server', () => {
  it('disables enrolment and says so when the class has no seats left', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ data: { ...REAL_CLASS, enrolledCount: 10, spotsLeft: 0 } }),
      })),
    );

    render(<ClassDetailClient />);

    await screen.findByText('QA Deep Hatha Yoga');
    const button = screen.getByRole('button', { name: /full|enrol|enroll/i });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(button.textContent).toMatch(/full/i);
    // The price must NOT be offered on a seat the server will refuse to sell.
    expect(button.textContent).not.toMatch(/1,000/);
  });

  it('sends a signed-out devotee to sign-in with a return path, not a bare "Unauthorized"', async () => {
    const fetchMock = routedFetch({
      [`/wellness/sessions/${SESSION_ID}/enroll`]: () => ({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized', message: 'Missing or invalid token' }),
      }),
      [`/wellness/sessions/${SESSION_ID}`]: () => ({
        ok: true,
        status: 200,
        json: async () => ({ data: REAL_CLASS }),
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<ClassDetailClient />);
    const button = await screen.findByRole('button', { name: /enrol|enroll/i });
    await act(async () => { fireEvent.click(button); });

    await waitFor(() => expect(pushMock).toHaveBeenCalled());
    const target = String(pushMock.mock.calls[0]?.[0] ?? '');
    expect(target.startsWith('/auth/login')).toBe(true);
    // The param name is load-bearing: /auth/login reads ONLY `redirect`
    // (app/auth/login/page.tsx:119, :441 via safeRedirect). A `returnTo` or
    // `next` spelling is accepted by nothing and silently drops the devotee on
    // a dashboard instead of back at the class they were paying for.
    expect(new URLSearchParams(target.split('?')[1] ?? '').get('redirect')).toBe(
      `/wellness/classes/${SESSION_ID}`,
    );
    // No payment step may follow an unauthenticated enrol attempt.
    expect(fetchMock.mock.calls.map((c) => String(c[0])).some((u) => u.includes('/verify'))).toBe(
      false,
    );
  });
});
