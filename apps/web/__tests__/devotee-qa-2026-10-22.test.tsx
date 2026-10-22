import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';

/**
 * Devotee QA 2026-10-22: seven reported defects, one file.
 *
 *  1  /dashboard "We could not verify your sign-in" right after sign-in
 *  2  sign-in "keeps loading" (a full page load threw the session away)
 *  3  /profile Save Changes showed nothing where the person was looking
 *  4  Consultations, 5 Settings, 7 Refer: pages with no way in from the menu
 *  6  /account/subscriptions fell to "Something went wrong"
 */

const nav = { replace: vi.fn(), push: vi.fn() };
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: nav.replace, push: nav.push }),
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams(),
}));

const auth = {
  session: { accessToken: 'tok-1' } as { accessToken: string } | null,
  user: { id: 'u1', fullName: 'Asha Devi', email: 'a@example.com', role: 'devotee', phone: '', avatarUrl: null },
  isAuthenticated: true,
  isLoading: false,
  signOut: vi.fn(),
  refreshUser: vi.fn(async () => undefined),
  renewSession: vi.fn(async () => false),
};
vi.mock('../lib/auth-context', () => ({
  useAuth: () => auth,
  getRoleLabel: () => 'Devotee',
  getRoleDashboardPath: () => '/dashboard',
}));
vi.mock('../components/AuthGuard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('../components/MyProviderProfileCard', () => ({ default: () => null }));
vi.mock('../components/PujaRecommendationWidget', () => ({ default: () => null }));
vi.mock('../components/dashboard/DevoteeTodaySection', () => ({ default: () => null }));
vi.mock('../components/profile/AddressManager', () => ({ default: () => null }));

import DevoteeDashboard from '../app/dashboard/page';
import ProfilePage from '../app/profile/page';
import AccountSubscriptionsPage from '../app/account/subscriptions/page';
import NavAuthButton from '../components/NavAuthButton';
import { normalizeSubscription } from '../lib/subscription-normalize';

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers });

const realFetch = globalThis.fetch;
beforeEach(() => {
  nav.replace.mockReset();
  nav.push.mockReset();
  auth.renewSession.mockReset().mockResolvedValue(false);
  auth.refreshUser.mockReset().mockResolvedValue(undefined);
});
afterEach(() => {
  cleanup();
  globalThis.fetch = realFetch;
});

describe('1. dashboard 401 while the client holds a session', () => {
  const unverified = () =>
    json({ error: 'Unauthorized' }, 401, { 'x-auth-reason': 'invalid_credential' });

  it('renews the session once instead of showing the banner', async () => {
    auth.renewSession.mockResolvedValue(true);
    const fetchMock = vi.fn(async (url: string) =>
      String(url).includes('/users/me/bookings') ? unverified() : json({ subscription: null }),
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    render(<DevoteeDashboard />);
    await waitFor(() => expect(auth.renewSession).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(/could not verify your sign-in/i)).toBeNull();
  });

  it('still tells the truth when the renew fails, and does not loop', async () => {
    auth.renewSession.mockResolvedValue(false);
    globalThis.fetch = vi.fn(async (url: string) =>
      String(url).includes('/users/me/bookings') ? unverified() : json({ subscription: null }),
    ) as unknown as typeof fetch;
    render(<DevoteeDashboard />);
    await waitFor(() => expect(screen.getByText(/could not verify your sign-in/i)).toBeTruthy());
    expect(auth.renewSession).toHaveBeenCalledTimes(1);
  });
});

describe('3. profile save feedback', () => {
  const profile = {
    user: {
      fullName: 'Asha Devi', email: 'a@example.com', gotra: '', nakshatra: '', rashi: '',
      preferredLanguage: 'hi', locationCity: '', locationState: '', isNri: false, nriCountry: '',
    },
  };

  it('shows the confirmation next to the Save button and re-syncs from the server', async () => {
    const calls: Array<[string, RequestInit | undefined]> = [];
    globalThis.fetch = vi.fn(async (url: string, init?: RequestInit) => {
      calls.push([String(url), init]);
      if (init?.method === 'PATCH') {
        return json({ success: true, user: { ...profile.user, locationCity: 'Pune', gotra: 'Kashyap' } });
      }
      return json(profile);
    }) as unknown as typeof fetch;
    render(<ProfilePage />);
    await screen.findByDisplayValue('Asha Devi');
    const city = screen.getByPlaceholderText('e.g., Mumbai');
    fireEvent.change(city, { target: { value: ' Pune ' } });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    const status = await screen.findByRole('status');
    expect(status.textContent).toMatch(/profile saved/i);
    const save = screen.getByRole('button', { name: /save changes/i });
    // the confirmation lives in the same block as the button, not only at the top
    expect(save.parentElement?.previousElementSibling?.contains(status)).toBe(true);
    const patch = calls.find(([, i]) => i?.method === 'PATCH')!;
    expect(JSON.parse(String(patch[1]!.body)).locationCity).toBe('Pune');
    expect((city as HTMLInputElement).value).toBe('Pune');
    expect(auth.refreshUser).toHaveBeenCalled();
  });

  it('a 401 on save says to sign in again, with a way to do it', async () => {
    globalThis.fetch = vi.fn(async (_u: string, init?: RequestInit) =>
      init?.method === 'PATCH'
        ? json({ error: 'Unauthorized' }, 401, { 'x-auth-reason': 'invalid_credential' })
        : json(profile),
    ) as unknown as typeof fetch;
    render(<ProfilePage />);
    const name = await screen.findByDisplayValue('Asha Devi');
    fireEvent.change(name, { target: { value: 'Asha D' } });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    await waitFor(() => expect(screen.getAllByRole('link', { name: /sign in again/i }).length).toBeGreaterThan(0));
  });

  it('5. lists the account pages under a Settings section', async () => {
    globalThis.fetch = vi.fn(async () => json(profile)) as unknown as typeof fetch;
    const { container } = render(<ProfilePage />);
    await screen.findByDisplayValue('Asha Devi');
    const section = container.querySelector('#settings')!;
    const hrefs = Array.from(section.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(
      expect.arrayContaining(['/profile/consultations', '/account/subscriptions', '/account/privacy', '/refer']),
    );
  });
});

describe('4/5/7. the account menu reaches the pages that had no way in', () => {
  it('links Consultations, Subscriptions, Refer and Settings', () => {
    const { container } = render(<NavAuthButton />);
    fireEvent.click(container.querySelector('button')!);
    const hrefs = Array.from(container.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(
      expect.arrayContaining(['/profile/consultations', '/account/subscriptions', '/refer', '/profile#settings']),
    );
    expect(screen.getByText('Settings')).toBeTruthy();
    expect(screen.getByText('My Consultations')).toBeTruthy();
  });
});

describe('6. subscriptions page', () => {
  it.each([
    ['null body', 'null'],
    ['empty object', '{}'],
    ['a list under another key', '{"subscriptions":[]}'],
    ['a string where the row should be', '{"subscription":"x"}'],
    ['a row with no plan', '{"subscription":{"id":"1","status":"ACTIVE"}}'],
  ])('shows the friendly empty state for %s', async (_n, body) => {
    globalThis.fetch = vi.fn(async () => new Response(body, { status: 200 })) as unknown as typeof fetch;
    render(<AccountSubscriptionsPage />);
    expect(await screen.findByText(/don.t have an active subscription/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /see plans/i })).toBeTruthy();
  });

  it('renders a partial row without throwing on missing dates', async () => {
    globalThis.fetch = vi.fn(async () =>
      json({ subscription: { id: 's1', plan: 'PANDIT_BASIC', status: 'ACTIVE', amount: '999' } }),
    ) as unknown as typeof fetch;
    render(<AccountSubscriptionsPage />);
    expect(await screen.findByText('PANDIT_BASIC')).toBeTruthy();
    expect(screen.queryByText(/invalid date/i)).toBeNull();
  });

  it('normalizeSubscription picks the ACTIVE row from a list and coerces amount', () => {
    const row = normalizeSubscription({
      subscriptions: [{ plan: 'A', status: 'CANCELLED' }, { plan: 'B', status: 'ACTIVE', amount: '10' }],
    });
    expect(row?.plan).toBe('B');
    expect(row?.amount).toBe(10);
    expect(normalizeSubscription(undefined)).toBeNull();
  });

  it('sends a signed-out visitor to the real sign-in page, not the 404 /auth', async () => {
    const prev = { ...auth };
    auth.session = null;
    auth.isAuthenticated = false;
    globalThis.fetch = vi.fn(async () => json({})) as unknown as typeof fetch;
    render(<AccountSubscriptionsPage />);
    await waitFor(() => expect(nav.push).toHaveBeenCalled());
    expect(String(nav.push.mock.calls[0]![0])).toMatch(/^\/auth\/login\?redirect=/);
    Object.assign(auth, prev);
  });
});

describe('2. sign-in does not discard the session it just created', () => {
  it('useSoftNavigate uses the router when one is mounted', async () => {
    const { useSoftNavigate } = await import('../lib/use-soft-navigate');
    function Probe() {
      const go = useSoftNavigate();
      return <button onClick={() => go('/dashboard')}>go</button>;
    }
    render(<Probe />);
    fireEvent.click(screen.getByText('go'));
    expect(nav.replace).toHaveBeenCalledWith('/dashboard');
  });

  it('the login page navigates through it, never with window.location', async () => {
    const { readFileSync } = await import('node:fs');
    const path = await import('node:path');
    const src = readFileSync(path.join(process.cwd(), 'app/auth/login/page.tsx'), 'utf8');
    expect(src).toMatch(/useSoftNavigate/);
    expect(src).not.toMatch(/window\.location\.href\s*=\s*redirect/);
  });

  it('concurrent revives share one refresh request (the cookie is single use)', async () => {
    const { reviveSessionFromCookieResult } = await import('../lib/session-revive');
    const fetchMock = vi.fn(async () => json({ session: { accessToken: 'new', refreshToken: 'r', expiresIn: 1, expiresAt: 1 } }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const [a, b] = await Promise.all([reviveSessionFromCookieResult(), reviveSessionFromCookieResult()]);
    expect(a.session?.accessToken).toBe('new');
    expect(b.session?.accessToken).toBe('new');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
