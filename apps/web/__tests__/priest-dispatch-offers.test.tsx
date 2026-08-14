/**
 * PJ-04 (P1/broken) — the tiered dispatch engine had no pandit-facing surface.
 *
 * The API has shipped `GET /priest/offers`, `POST /priest/offers/:bookingId/accept`
 * and `POST /priest/offers/:bookingId/decline` since the 2026-08-04 booking
 * revamp (apps/api/src/routes/priest.ts:258-302). Nothing in apps/web called any
 * of them: a repo-wide grep for 'priest/offers' returned zero matches. The
 * portal could not stand in either — `getAssignedBookings` filters on
 * `{ priestId }`, and an OFFERED booking has no priestId yet, so a dispatch
 * offer was invisible on /priest/bookings by construction.
 *
 * The WhatsApp one-tap fallback was dead for the same reason: dispatch.service
 * builds `${WEB_BASE_URL}/priest/bookings/${bookingId}?accept=1` and no [id]
 * segment existed under app/priest/bookings.
 *
 * NOTE ON WHERE THAT LINK MUST LAND. It must NOT land on the booking detail
 * page: `GET /priest/bookings/:id` calls getAssignedBookingById, which answers
 * 403 "This booking is not assigned to you" whenever priestId !== me — which is
 * exactly the state every un-accepted offer is in. Sending the accept link
 * there would swap a 404 for a 403 and still leave the pandit unable to accept.
 * It has to land on the offers surface, which is the only screen backed by an
 * endpoint that can see an offer before it is accepted.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const useAuthMock = vi.fn();
vi.mock('../lib/auth-context', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('../lib/api-config', () => ({
  API_BASE_URL: 'https://api.test',
}));

vi.mock('../components/AuthGuard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const nav = vi.hoisted(() => ({ params: new URLSearchParams() }));
vi.mock('next/navigation', () => ({
  useSearchParams: () => nav.params,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/priest/offers',
  redirect: (to: string) => {
    throw new Error(`NEXT_REDIRECT:${to}`);
  },
}));

const WEB = path.resolve(__dirname, '..');
const OFFERS_PAGE = path.join(WEB, 'app/priest/offers/page.tsx');
const BOOKING_ID_PAGE = path.join(WEB, 'app/priest/bookings/[id]/page.tsx');

function offer(overrides: Record<string, unknown> = {}) {
  return {
    id: 'offer-1',
    bookingId: 'b-1111',
    sentAt: new Date(Date.now() - 60_000).toISOString(),
    expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
    booking: {
      id: 'b-1111',
      bookingNumber: 'BS-20260813-A1B2C',
      scheduledDate: '2026-08-20T00:00:00.000Z',
      scheduledTimeSlot: '09:00-11:00',
      priceAmount: '5100',
      pujaType: { name: 'Satyanarayan Katha' },
      temple: { name: 'Shri Ram Mandir', city: 'Gurugram' },
    },
    ...overrides,
  };
}

beforeEach(() => {
  nav.params = new URLSearchParams();
  useAuthMock.mockReset();
  useAuthMock.mockReturnValue({ session: { accessToken: 'tok' } });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('PJ-04 — /priest/offers exists and is wired to the dispatch endpoints', () => {
  it('has a page file at app/priest/offers/page.tsx', () => {
    expect(existsSync(OFFERS_PAGE)).toBe(true);
  });

  it('lists open offers from GET /priest/offers', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ offers: [offer()] }),
      text: async () => '',
    } as Response);

    const { default: OffersPage } = await import('../app/priest/offers/page');
    render(<OffersPage />);

    await waitFor(() => {
      expect(screen.getByText(/Satyanarayan Katha/)).toBeTruthy();
    });
    expect(fetchSpy.mock.calls[0][0]).toBe('https://api.test/priest/offers');
    const body = document.body.textContent ?? '';
    expect(body).toContain('BS-20260813-A1B2C');
    expect(body).toContain('Gurugram');
  });

  it('accepts an offer through POST /priest/offers/:bookingId/accept', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ offers: [offer()] }),
        text: async () => '',
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ message: 'Booking confirmed. You are assigned.' }),
        text: async () => '',
      } as Response);

    const { default: OffersPage } = await import('../app/priest/offers/page');
    render(<OffersPage />);

    const acceptBtn = await screen.findByRole('button', { name: /accept/i });
    fireEvent.click(acceptBtn);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });
    const [url, init] = fetchSpy.mock.calls[1] as [string, RequestInit];
    expect(url).toBe('https://api.test/priest/offers/b-1111/accept');
    expect(init.method).toBe('POST');
  });

  it('declines through POST /priest/offers/:bookingId/decline', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ offers: [offer()] }),
        text: async () => '',
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ message: 'Offer declined.' }),
        text: async () => '',
      } as Response);

    const { default: OffersPage } = await import('../app/priest/offers/page');
    render(<OffersPage />);

    const declineBtn = await screen.findByRole('button', { name: /decline/i });
    fireEvent.click(declineBtn);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });
    const [url, init] = fetchSpy.mock.calls[1] as [string, RequestInit];
    expect(url).toBe('https://api.test/priest/offers/b-1111/decline');
    expect(init.method).toBe('POST');
  });

  it('never claims success when the accept call fails — it surfaces the server error', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ offers: [offer()] }),
        text: async () => '',
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'This offer has already been taken.' }),
        text: async () => '{"error":"This offer has already been taken."}',
      } as Response);

    const { default: OffersPage } = await import('../app/priest/offers/page');
    render(<OffersPage />);

    fireEvent.click(await screen.findByRole('button', { name: /accept/i }));

    await waitFor(() => {
      expect(screen.getByText(/already been taken/i)).toBeTruthy();
    });
    expect(document.body.textContent ?? '').not.toMatch(/you are assigned/i);
  });

  it('shows an honest empty state, not an invented offer', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ offers: [] }),
      text: async () => '',
    } as Response);

    const { default: OffersPage } = await import('../app/priest/offers/page');
    render(<OffersPage />);

    await waitFor(() => {
      expect(screen.getByText(/no open offers/i)).toBeTruthy();
    });
    expect(document.body.textContent ?? '').not.toContain('BS-2026');
  });

  it('shows an honest error state when the fetch fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));

    const { default: OffersPage } = await import('../app/priest/offers/page');
    render(<OffersPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /try again/i })).toBeTruthy();
    });
    expect(document.body.textContent ?? '').not.toMatch(/no open offers/i);
  });
});

describe('PJ-04 — the WhatsApp deep link resolves', () => {
  it('has a dynamic segment at app/priest/bookings/[id]/page.tsx', () => {
    expect(existsSync(BOOKING_ID_PAGE)).toBe(true);
  });

  it('sends ?accept=1 to the offers surface, never to the assigned-only detail page', async () => {
    const mod = await import('../app/priest/bookings/[id]/page');
    await expect(
      (mod.default as (p: unknown) => Promise<unknown>)({
        params: Promise.resolve({ id: 'b-1111' }),
        searchParams: Promise.resolve({ accept: '1' }),
      }),
    ).rejects.toThrow('NEXT_REDIRECT:/priest/offers?booking=b-1111');
  });

  it('sends a plain booking link to the existing detail view', async () => {
    const mod = await import('../app/priest/bookings/[id]/page');
    await expect(
      (mod.default as (p: unknown) => Promise<unknown>)({
        params: Promise.resolve({ id: 'b-1111' }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow('NEXT_REDIRECT:/priest/bookings/view?id=b-1111');
  });

  it('tells the pandit when the deep-linked offer is gone instead of showing nothing', async () => {
    nav.params = new URLSearchParams('booking=b-9999');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ offers: [offer()] }),
      text: async () => '',
    } as Response);

    const { default: OffersPage } = await import('../app/priest/offers/page');
    render(<OffersPage />);

    await waitFor(() => {
      expect(screen.getByText(/no longer open/i)).toBeTruthy();
    });
  });
});

describe('PJ-04 — the offers screen is reachable from the portal nav', () => {
  it('links /priest/offers from the priest sidebar', () => {
    const layout = readFileSync(path.join(WEB, 'app/priest/layout.tsx'), 'utf8');
    expect(layout).toContain("href: '/priest/offers'");
  });

  /**
   * The dashboard's on-duty toggle is where the pandit opts INTO instant
   * dispatch — "Turn on to receive instant puja requests near you (Uber-style
   * dispatch)". Opting in and then having no route to the requests is the exact
   * dead end PJ-04 describes, so the card itself has to point at the offers
   * screen.
   */
  it('points the on-duty pandit at the offers screen from the dashboard card', () => {
    const dashboard = readFileSync(path.join(WEB, 'app/priest/page.tsx'), 'utf8');
    expect(dashboard).toContain('/priest/offers');
  });
});
