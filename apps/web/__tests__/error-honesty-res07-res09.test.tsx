/**
 * RES-07 + RES-09 (prod sweep 2026-08-12) — the app throws away the server's
 * own explanation, then shows the user a developer string instead.
 *
 * RES-07: POST /bookings/create-order answers a fully localized, actionable
 * failure — HTTP 409 {"error":"The selected time slot is no longer
 * available.","code":"SLOT_UNAVAILABLE","message":"…"} (apps/api routes/
 * bookings.ts classifier + lib/error-i18n.ts). The wizard built its message
 * from `res.status` alone and never parsed the body, so a devotee who lost a
 * slot race was told "Could not create your booking (409). Please try again"
 * — advice that can never succeed, because retrying the same slot 409s again.
 *
 * RES-09: /bookings rendered `API 500: {"error":"Internal Server Error"}` and,
 * with a malformed body, a raw JavaScript parser message — while
 * SIMULTANEOUSLY showing "No bookings yet / Explore our pujas to book your
 * first sacred ritual" to a devotee who has confirmed pujas. friendlyApiError()
 * already existed and was wired into exactly two admin screens.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { friendlyApiError, apiErrorCode, serverErrorMessage } from '../lib/friendly-error';

vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({
    session: { accessToken: 'test-token' },
    user: { id: 'u1', role: 'devotee' },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

vi.mock('../components/AuthGuard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import BookingsPage from '../app/bookings/page';

vi.setConfig({ testTimeout: 30_000 });

const read = (rel: string) => readFileSync(path.resolve(__dirname, '..', rel), 'utf8');

beforeEach(() => {
  vi.unstubAllGlobals();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

// ── RES-07: the server's sentence outranks the status code ───────────────────

describe('RES-07 — the API error body is read, not discarded', () => {
  it('prefers the server sentence over a status-code fallback', () => {
    const body = {
      error: 'The selected time slot is no longer available.',
      code: 'SLOT_UNAVAILABLE',
      message: 'The selected time slot is no longer available.',
    };
    expect(serverErrorMessage(body, 'Could not create your booking (409).')).toBe(
      'The selected time slot is no longer available.',
    );
  });

  it('falls back only when the body carries nothing usable', () => {
    expect(serverErrorMessage(null, 'fallback copy')).toBe('fallback copy');
    expect(serverErrorMessage({}, 'fallback copy')).toBe('fallback copy');
    expect(serverErrorMessage({ error: '   ' }, 'fallback copy')).toBe('fallback copy');
    // "Internal Server Error" is the developer name of a 500, not something to
    // read to a devotee — it must not win over the caller's own copy.
    expect(serverErrorMessage({ error: 'Internal Server Error' }, 'fallback copy')).toBe(
      'fallback copy',
    );
  });

  it('exposes the machine code so the caller can recover in-page', () => {
    expect(apiErrorCode({ code: 'SLOT_UNAVAILABLE' })).toBe('SLOT_UNAVAILABLE');
    expect(apiErrorCode({ error: 'boom' })).toBeNull();
    expect(apiErrorCode(null)).toBeNull();
  });

  it('the booking wizard parses the body and recovers from SLOT_UNAVAILABLE', () => {
    const src = read('app/pujas/book/page.tsx');
    // The create-order failure branch must consult the body, not just status.
    expect(src).toContain('serverErrorMessage');
    expect(src).toContain('SLOT_UNAVAILABLE');
    // …and send the devotee back to the slot picker instead of "try again".
    expect(src).toMatch(/SLOT_UNAVAILABLE[\s\S]{0,400}setCurrentStep\(0\)/);
  });
});

// ── RES-09: no raw developer text, and never an empty state under an error ───

describe('RES-09 — user-visible errors are friendly and never contradict themselves', () => {
  it('maps the exact strings /bookings used to render raw', () => {
    expect(friendlyApiError('API 500: {"error":"Internal Server Error"}').message).toBe(
      'Something went wrong on our side. Please try again in a moment.',
    );
    expect(
      friendlyApiError(
        new Error('Unexpected token \'<\', "<html>502 "... is not valid JSON'),
      ).message,
    ).not.toContain('Unexpected token');
  });

  function renderBookings() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    return render(
      <QueryClientProvider client={client}>
        <BookingsPage />
      </QueryClientProvider>,
    );
  }

  it('a 500 shows friendly copy, no JSON blob, and a retry control', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        ({
          ok: false,
          status: 500,
          text: async () => '{"error":"Internal Server Error"}',
          json: async () => ({ error: 'Internal Server Error' }),
        }) as unknown as Response,
      ),
    );

    renderBookings();

    await waitFor(() => {
      expect(
        screen.getByText(/Something went wrong on our side/i),
      ).toBeTruthy();
    });
    expect(screen.queryByText(/Internal Server Error/)).toBeNull();
    expect(screen.getByRole('button', { name: /retry/i })).toBeTruthy();
  });

  it('/bookings/view no longer renders a bare "HTTP 500" into the refund panel', () => {
    const src = read('app/bookings/view/page.tsx');
    // The refund failure now prefers the server's own sentence and falls back
    // to human copy, instead of throwing the literal `HTTP ${status}` string
    // and rendering it.
    expect(src).toContain('serverErrorMessage(body, friendlyApiError(');
    // The network-failure catch no longer leaks the browser's own text
    // ("Failed to fetch") straight into the panel.
    expect(src).not.toContain("err instanceof Error ? err.message : 'Failed to request refund'");
    expect(src).toContain('setRefundError(friendlyApiError(err).message)');
  });

  it('never shows "No bookings yet" next to a load error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        ({
          ok: false,
          status: 502,
          text: async () => '<html>502 Bad Gateway</html>',
          json: async () => {
            throw new Error('Unexpected token \'<\'');
          },
        }) as unknown as Response,
      ),
    );

    renderBookings();

    await waitFor(() => {
      expect(screen.getByText(/Something went wrong on our side/i)).toBeTruthy();
    });
    // The devotee HAS bookings; the list is simply unknown right now. Telling
    // her she has none is the lie RES-09 is about.
    expect(screen.queryByText(/No bookings yet/i)).toBeNull();
    expect(screen.queryByText(/book your first sacred ritual/i)).toBeNull();
  });
});
