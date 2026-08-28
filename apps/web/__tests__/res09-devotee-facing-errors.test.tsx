/**
 * RES-09 — the two devotee-facing residuals the pandit-portal pass named and
 * could not reach.
 *
 * MEASURED BEFORE (this branch, 2026-08-28):
 *
 *  app/account/subscriptions/page.tsx
 *    :54  throw new Error(`Failed to load subscription (${res.status})`)
 *    :58  setError(err instanceof Error ? err.message : 'Could not load subscription')
 *    :84  throw new Error(data.error || `Cancel failed (${res.status})`)
 *    :102 setError(err instanceof Error ? err.message : 'Could not cancel auto-renewal')
 *
 *  So a devotee whose token had expired read "Failed to load subscription
 *  (401)" in a red banner on their own billing page, and one on a dropped
 *  connection read whatever their browser wrote — "Failed to fetch" on Chrome,
 *  "Load failed" on iOS Safari. Neither says the one thing they could act on.
 *
 *  lib/api.ts:51
 *    throw new Error(`API error: ${res.status} ${res.statusText}`)
 *
 *  Developer text by construction, and it DISCARDS the server's own sentence:
 *  the API localizes its error bodies into five languages
 *  (apps/api/src/lib/error-i18n.ts) and this threw all of that away in favour
 *  of a status name. Nothing renders it today — every error boundary in
 *  apps/web prints `error.digest`, never `error.message` — so this is the
 *  latent half of the finding, fixed at the throw rather than at some future
 *  render site.
 *
 * A THIRD defect was found in the same file while fixing it, and it belongs to
 * PM-05 rather than RES-09: the card printed "All premium benefits unlocked"
 * whenever `subscription.plan === 'ENTERPRISE'` — that is NRI Premium, whose
 * six benefits ALL carry `enforcedBy: null`. Not one of them is unlocked by
 * anything; that is precisely why the plan was withdrawn from sale.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';

vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({
    session: { accessToken: 'test-token' },
    user: { id: 'u1' },
    isAuthenticated: true,
    isLoading: false,
  }),
  getRoleDashboardPath: () => '/dashboard',
}));

vi.mock('../components/AuthGuard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/account/subscriptions',
  useSearchParams: () => new URLSearchParams(),
}));

import AccountSubscriptionsPage from '../app/account/subscriptions/page';
import { getTemples } from '../lib/api';

const res = (body: unknown, ok = true, status = 200, statusText = 'OK') =>
  ({
    ok,
    status,
    statusText,
    json: async () => body,
    text: async () => JSON.stringify(body),
  }) as Response;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ── /account/subscriptions ───────────────────────────────────────────────────

describe('RES-09 — /account/subscriptions shows a devotee copy they can act on', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('an expired session reads as an expired session, not "(401)"', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(res({ error: 'Unauthorized' }, false, 401, 'Unauthorized')),
    );
    render(<AccountSubscriptionsPage />);
    await waitFor(() =>
      expect(screen.getByText(/session has expired/i)).toBeTruthy(),
    );
    const body = document.body.textContent ?? '';
    expect(body).not.toMatch(/401/);
    expect(body).not.toMatch(/Failed to load subscription/i);
  });

  it('a dropped connection names the connection, on every browser', async () => {
    // `err.message` here is written by the platform, not by us, and each engine
    // words it differently. A status-code sweep never sees this row.
    for (const raw of ['Failed to fetch', 'Load failed', 'NetworkError when attempting to fetch resource.']) {
      cleanup();
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError(raw)));
      render(<AccountSubscriptionsPage />);
      await waitFor(() => expect(screen.getByText(/check your connection/i)).toBeTruthy());
      expect(document.body.textContent ?? '').not.toMatch(new RegExp(raw, 'i'));
    }
  });

  it('a 500 with a developer name for the body does not render that name', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        res({ error: 'Internal Server Error' }, false, 500, 'Internal Server Error'),
      ),
    );
    render(<AccountSubscriptionsPage />);
    await waitFor(() => expect(screen.getByText(/on our side/i)).toBeTruthy());
    const body = document.body.textContent ?? '';
    expect(body).not.toMatch(/Internal Server Error/i);
    expect(body).not.toMatch(/500/);
  });

  it("keeps the API's own sentence when the server wrote one worth reading", async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        res(
          { error: 'This subscription was already cancelled.' },
          false,
          409,
          'Conflict',
        ),
      ),
    );
    render(<AccountSubscriptionsPage />);
    await waitFor(() =>
      expect(screen.getByText('This subscription was already cancelled.')).toBeTruthy(),
    );
  });
});

/**
 * PM-05 residue on the same screen. `subscription.plan === 'ENTERPRISE'` is
 * NRI Premium. All six of its benefits carry `enforcedBy: null` in
 * apps/api/src/services/subscription-entitlements.ts — that is why
 * `nriPremiumIsSellable()` is false and the plan is withdrawn. Telling a holder
 * "All premium benefits unlocked" is the same claim the withdrawal exists to
 * stop, made to the one person who paid for it.
 */
describe('PM-05 — /account/subscriptions claims no unlocked benefit', () => {
  const ACTIVE_NRI = {
    subscription: {
      id: 's1',
      plan: 'ENTERPRISE',
      role: 'DEVOTEE',
      startDate: '2026-01-01T00:00:00.000Z',
      endDate: '2027-01-01T00:00:00.000Z',
      amount: 5000,
      status: 'ACTIVE',
    },
  };

  it('does not tell an NRI Premium holder that everything is unlocked', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(res(ACTIVE_NRI)));
    render(<AccountSubscriptionsPage />);
    await waitFor(() => expect(screen.getByText('NRI Premium')).toBeTruthy());
    expect(document.body.textContent ?? '').not.toMatch(/all premium benefits unlocked/i);
  });

  it('tells them the truth instead — the tier is withdrawn and theirs runs on', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(res(ACTIVE_NRI)));
    render(<AccountSubscriptionsPage />);
    await waitFor(() => expect(screen.getByText('NRI Premium')).toBeTruthy());
    const body = document.body.textContent ?? '';
    expect(body).toMatch(/not currently sold|withdrew/i);
    expect(body).toMatch(/end date|keep running/i);
  });

  it('still renders the money and the dates, which are real', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(res(ACTIVE_NRI)));
    render(<AccountSubscriptionsPage />);
    await waitFor(() => expect(screen.getByText('NRI Premium')).toBeTruthy());
    expect(document.body.textContent ?? '').toMatch(/5000|5,000/);
  });
});

// ── lib/api.ts serverFetch ───────────────────────────────────────────────────

describe('RES-09 — lib/api throws no developer text', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('never throws the "API error: <status> <statusText>" string', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        res({ error: 'Internal Server Error' }, false, 500, 'Internal Server Error'),
      ),
    );
    await expect(getTemples()).rejects.toThrow(
      /Something went wrong on our side\. Please try again in a moment\./,
    );
  });

  it("prefers the API's own sentence, which it used to discard for a status name", async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        res({ error: 'That temple is no longer listed.' }, false, 404, 'Not Found'),
      ),
    );
    await expect(getTemples()).rejects.toThrow('That temple is no longer listed.');
  });

  it('keeps the status for operators, on the error rather than in the message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(res({}, false, 503, 'Service Unavailable')),
    );
    const err = await getTemples().catch((e) => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as { status?: number }).status).toBe(503);
    expect((err as Error).message).not.toMatch(/503|Service Unavailable/);
  });

  it('is a UserFacingError, so userFacingMessage renders it as written', async () => {
    const { UserFacingError, userFacingMessage } = await import('../lib/friendly-error');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        res({ error: 'That temple is no longer listed.' }, false, 404, 'Not Found'),
      ),
    );
    const err = await getTemples().catch((e) => e);
    expect(err).toBeInstanceOf(UserFacingError);
    expect(userFacingMessage(err, 'page copy')).toBe('That temple is no longer listed.');
  });
});
