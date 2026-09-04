import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * AUTH-09 — signing out on one device signed the user out of every device, with
 * no way to choose and (on most buttons) nothing saying so.
 *
 * The plumbing has existed for a while: `signOut` accepts `{ scope }`,
 * `readSignOutScope` keeps `onClick={signOut}` call sites type-safe, the API
 * enum accepts `local | global`, and the response names the scope it applied.
 * Nothing ever called it with a scope, because there was no account/security
 * screen to host the choice.
 *
 * TWO PIECES, and they are deliberately different.
 *
 * 1. `/auth/logout` stays a one-click GLOBAL sign-out with a disclosure. It
 *    signs out on mount and every "Sign Out" affordance routes to it, so
 *    turning it into a chooser would make the ordinary sign-out two clicks —
 *    and a choice offered after the global sign-out has already run is not a
 *    choice.
 *
 * 2. The CHOICE belongs on the account screen, where a user goes deliberately.
 *    /profile now carries a Security section with both scopes, each labelled
 *    with what it actually does.
 *
 * Global remains the default everywhere else, by omission rather than by
 * sending `scope: 'global'` — auth-context.tsx documents why: defaulting to
 * `local` would silently stop revoking other sessions on a lost device.
 *
 * Confirmed RED before the fix: /profile rendered no security section and
 * `signOut` was never called with a scope anywhere in apps/web; and
 * app/dashboard/page.tsx still wired `onClick={signOut}` directly, bypassing
 * the disclosure on /auth/logout.
 */

const signOut = vi.fn(async () => {});
const replace = vi.fn();

vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({
    user: {
      id: 'u1',
      fullName: 'Test Devotee',
      email: 'd@x.test',
      phone: '9990000000',
      avatarUrl: null,
      isNri: false,
      preferredLanguage: 'en',
    },
    session: { accessToken: 'test-token' },
    isAuthenticated: true,
    isLoading: false,
    refreshUser: vi.fn(async () => {}),
    signOut,
  }),
}));

vi.mock('../components/AuthGuard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../components/profile/AddressManager', () => ({
  default: () => <div data-testid="address-manager" />,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace, back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(''),
  usePathname: () => '/profile',
}));

import ProfilePage from '../app/profile/page';

const WEB = path.resolve(__dirname, '..');

function stripComments(src: string): string {
  return src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

beforeEach(() => {
  signOut.mockClear();
  replace.mockClear();
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, status: 200, json: async () => ({}) }) as unknown as Response),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('AUTH-09 — /profile offers a real choice of sign-out scope', () => {
  it('renders a security section', async () => {
    render(<ProfilePage />);
    await waitFor(() => expect(screen.getByText(/security/i)).toBeTruthy());
  });

  it('signs out only this device when asked to', async () => {
    render(<ProfilePage />);
    const button = await screen.findByRole('button', { name: /sign out on this device/i });
    fireEvent.click(button);
    await waitFor(() => expect(signOut).toHaveBeenCalled());
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('signs out everywhere when asked to', async () => {
    render(<ProfilePage />);
    const button = await screen.findByRole('button', { name: /sign out (on all|everywhere)/i });
    fireEvent.click(button);
    await waitFor(() => expect(signOut).toHaveBeenCalled());
    expect(signOut).toHaveBeenCalledWith({ scope: 'global' });
  });

  it('says what each option does, rather than leaving the user to guess', async () => {
    render(<ProfilePage />);
    await screen.findByRole('button', { name: /sign out on this device/i });
    const body = document.body.textContent ?? '';
    expect(body).toMatch(/other devices|stay signed in|all your devices/i);
  });

  it('leaves the browser somewhere sensible after signing out', async () => {
    render(<ProfilePage />);
    fireEvent.click(await screen.findByRole('button', { name: /sign out on this device/i }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
  });
});

describe('AUTH-09 — the remaining in-lane sign-out affordance discloses the effect', () => {
  it('app/dashboard/page.tsx no longer signs out inline', () => {
    const src = stripComments(readFileSync(path.join(WEB, 'app/dashboard/page.tsx'), 'utf8'));
    // `onClick={signOut}` sends the default GLOBAL scope with nothing on screen
    // saying so. NavAuthButton was fixed the same way: route to /auth/logout,
    // which runs the identical sign-out and discloses it first.
    expect(src).not.toMatch(/onClick=\{signOut\}/);
    expect(src).toMatch(/\/auth\/logout/);
  });

  it('/auth/logout stays a one-click global sign-out, not a chooser', () => {
    // Deliberate: it signs out on mount, so a choice offered there would come
    // after the global sign-out had already run.
    const src = stripComments(readFileSync(path.join(WEB, 'app/auth/logout/page.tsx'), 'utf8'));
    expect(src).toMatch(/signOut\(\)/);
    expect(src).not.toMatch(/scope:/);
  });
});
