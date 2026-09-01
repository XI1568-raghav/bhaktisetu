/**
 * AUTH-06 — the screens the first sweep could not see.
 *
 * The finding names six pages and all six were fixed. They shared one property:
 * they call `friendlyApiError` by name and drop `.reauth`, so a grep for
 * `.reauth` found every one of them. This file covers the population that grep
 * cannot reach — screens that call `userFacingMessage`, whose signature only
 * ever returns a string. The `reauth` decision is still computed, by the same
 * `friendlyApiError`, and then discarded inside the helper where no call site
 * mentions it. What the user sees is identical: "Your session has expired.
 * Please sign in again to continue." beside a Retry button that re-fires the
 * request with the same dead credential.
 *
 * Five more live copies, enumerated by reading every `userFacingMessage` call
 * site in apps/web rather than by grepping for the flag:
 *
 *   app/account/subscriptions  a red banner, no control at all. Reached during
 *                              "cancel auto-renewal" — a mid-action expiry on
 *                              a billing screen.
 *   app/priest/payouts         banner + Retry. WORST of the five: it throws
 *                              `UserFacingError(serverErrorText(body, own))`,
 *                              and `serverErrorText` refuses "Unauthorized" as
 *                              a developer name, so the 401 is destroyed before
 *                              any classifier runs. The pandit was told the
 *                              ledger failed, never that his session had.
 *   app/priest/bookings        banner + Retry, same status-destroying throw.
 *   app/priest/reviews         banner + Retry.
 *   app/priest/services        banner + Retry.
 *
 * app/priest/profile is deliberately NOT here: it already branches on
 * `res.status === 401 || res.status === 403` into a dedicated `authExpired`
 * screen with a "Sign in again" link (PJ-06, page.tsx:222-240). It was correct
 * before this pass and is untouched by it.
 *
 * Each case asserts the affordance, not the wording — a link into /auth/login
 * carrying this page as `redirect` — and each pins the NEGATIVE case, a 500,
 * where Retry is the right control and the sign-in link must not appear. The
 * payouts and bookings 401 cases are the ones that fail without the
 * `UserFacingError.status` plumbing: their bodies carry nothing a text
 * classifier can use.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const authState = {
  session: { accessToken: 'live-token' } as { accessToken: string } | null,
  user: { id: 'u1', role: 'priest', fullName: 'Pandit' } as unknown,
  isAuthenticated: true,
  isLoading: false,
};

vi.mock('../lib/auth-context', async () => {
  const actual = await vi.importActual<typeof import('../lib/auth-context')>('../lib/auth-context');
  return { ...actual, useAuth: () => authState };
});

let pathname = '/priest/payouts';

vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(''),
}));

// AuthGuard renders its children only after its own checks; these tests are
// about what the page does with an API refusal, not about the guard.
vi.mock('../components/AuthGuard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import PriestPayoutsPage from '../app/priest/payouts/page';
import PriestBookingsPage from '../app/priest/bookings/page';
import PriestReviewsPage from '../app/priest/reviews/page';
import PriestServicesPage from '../app/priest/services/page';
import AccountSubscriptionsPage from '../app/account/subscriptions/page';

const realFetch = globalThis.fetch;

/**
 * A refusal whose BODY says nothing usable — the common shape, and the one
 * that defeats a text classifier. `{"error":"Unauthorized"}` is a developer
 * name for 401, which `serverErrorText` correctly refuses to render, and an
 * empty body gives it nothing at all. Either way the only remaining evidence
 * that the session died is `res.status`.
 */
function statusOnly(status: number, body = '') {
  return vi.fn(async () =>
    Promise.resolve({
      ok: false,
      status,
      statusText: status === 401 ? 'Unauthorized' : 'Internal Server Error',
      text: async () => body,
      // The body must match the STATUS. An earlier draft answered
      // {"error":"Unauthorized"} for every status, and the 500 cases then
      // "passed" through the auth branch — `isAuthError` matches the word
      // "unauthorized" wherever it appears. A negative control that reaches the
      // positive branch is not a control.
      json: async () =>
        body
          ? JSON.parse(body)
          : { error: status === 401 ? 'Unauthorized' : 'Internal Server Error' },
    } as unknown as Response),
  );
}

/** The affordance: a link into /auth/login carrying this page as `redirect`. */
function reauthLink(): HTMLAnchorElement | null {
  return document.querySelector<HTMLAnchorElement>('a[href^="/auth/login"]');
}

function retryButton(): HTMLElement | null {
  return (
    screen.queryByRole('button', { name: /^retry$/i }) ??
    screen.queryByRole('button', { name: /try again/i })
  );
}

beforeEach(() => {
  authState.session = { accessToken: 'live-token' };
  authState.isAuthenticated = true;
  authState.isLoading = false;
});

afterEach(() => {
  globalThis.fetch = realFetch;
  vi.restoreAllMocks();
});

describe('AUTH-06 — app/priest/payouts (status destroyed before classification)', () => {
  beforeEach(() => {
    pathname = '/priest/payouts';
  });

  it('offers a sign-in link and REMOVES Retry when the ledger 401s', async () => {
    globalThis.fetch = statusOnly(401, '{"error":"Unauthorized"}') as unknown as typeof fetch;

    render(<PriestPayoutsPage />);

    await waitFor(() => expect(reauthLink()).not.toBeNull());
    expect(reauthLink()!.getAttribute('href')).toBe(
      '/auth/login?redirect=' + encodeURIComponent('/priest/payouts'),
    );
    expect(retryButton()).toBeNull();
  });

  it('keeps Retry, and offers no sign-in link, for a 500', async () => {
    globalThis.fetch = statusOnly(500) as unknown as typeof fetch;

    render(<PriestPayoutsPage />);

    await waitFor(() => expect(retryButton()).not.toBeNull());
    expect(reauthLink()).toBeNull();
  });
});

describe('AUTH-06 — app/priest/bookings', () => {
  beforeEach(() => {
    pathname = '/priest/bookings';
  });

  it('offers a sign-in link and REMOVES Retry when the list 401s', async () => {
    globalThis.fetch = statusOnly(401, '{"error":"Unauthorized"}') as unknown as typeof fetch;

    render(<PriestBookingsPage />);

    await waitFor(() => expect(reauthLink()).not.toBeNull());
    expect(reauthLink()!.getAttribute('href')).toBe(
      '/auth/login?redirect=' + encodeURIComponent('/priest/bookings'),
    );
    expect(retryButton()).toBeNull();
  });

  it('keeps Retry, and offers no sign-in link, for a 500', async () => {
    globalThis.fetch = statusOnly(500) as unknown as typeof fetch;

    render(<PriestBookingsPage />);

    await waitFor(() => expect(retryButton()).not.toBeNull());
    expect(reauthLink()).toBeNull();
  });
});

describe('AUTH-06 — app/priest/reviews', () => {
  beforeEach(() => {
    pathname = '/priest/reviews';
  });

  it('offers a sign-in link and REMOVES Retry when the list 401s', async () => {
    globalThis.fetch = statusOnly(401, '{"error":"Unauthorized"}') as unknown as typeof fetch;

    render(<PriestReviewsPage />);

    await waitFor(() => expect(reauthLink()).not.toBeNull());
    expect(retryButton()).toBeNull();
  });

  it('keeps Retry, and offers no sign-in link, for a 500', async () => {
    globalThis.fetch = statusOnly(500) as unknown as typeof fetch;

    render(<PriestReviewsPage />);

    await waitFor(() => expect(retryButton()).not.toBeNull());
    expect(reauthLink()).toBeNull();
  });
});

describe('AUTH-06 — app/priest/services', () => {
  beforeEach(() => {
    pathname = '/priest/services';
  });

  it('offers a sign-in link and REMOVES Retry when the list 401s', async () => {
    globalThis.fetch = statusOnly(401, '{"error":"Unauthorized"}') as unknown as typeof fetch;

    render(<PriestServicesPage />);

    await waitFor(() => expect(reauthLink()).not.toBeNull());
    expect(retryButton()).toBeNull();
  });

  it('keeps Retry, and offers no sign-in link, for a 500', async () => {
    globalThis.fetch = statusOnly(500) as unknown as typeof fetch;

    render(<PriestServicesPage />);

    await waitFor(() => expect(retryButton()).not.toBeNull());
    expect(reauthLink()).toBeNull();
  });
});

describe('AUTH-06 — app/account/subscriptions', () => {
  beforeEach(() => {
    pathname = '/account/subscriptions';
    authState.user = { id: 'u1', role: 'devotee', fullName: 'Devotee' };
  });

  it('offers a sign-in link when the subscription load 401s', async () => {
    globalThis.fetch = statusOnly(401, '{"error":"Unauthorized"}') as unknown as typeof fetch;

    render(<AccountSubscriptionsPage />);

    await waitFor(() => expect(reauthLink()).not.toBeNull());
    expect(reauthLink()!.getAttribute('href')).toBe(
      '/auth/login?redirect=' + encodeURIComponent('/account/subscriptions'),
    );
  });

  it('shows the ordinary banner and no sign-in link for a 500', async () => {
    globalThis.fetch = statusOnly(500) as unknown as typeof fetch;

    render(<AccountSubscriptionsPage />);

    await waitFor(() =>
      expect(screen.getByText(/something went wrong on our side/i)).toBeTruthy(),
    );
    expect(reauthLink()).toBeNull();
  });
});
