/**
 * AuthProvider mount-path regressions (2026-08-10):
 *   A-011 — a session persisted with the raw API role (`pandit`) must be
 *           re-translated on load; the raw value used to survive every reload
 *           and lock that pandit out of /priest permanently.
 *   A-003 — the middleware portal gate reads the `poojly_user` cookie, which
 *           the magic-link path (/auth/verify) never writes; a session loaded
 *           from localStorage must re-sync it.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth, type AuthUser } from '../lib/auth-context';

const BASE_USER: Omit<AuthUser, 'role'> = {
  id: 'user-1',
  phone: '+919876543210',
  fullName: 'Pandit Ramesh',
  email: 'ramesh@example.com',
  avatarUrl: null,
  preferredLanguage: 'hi',
  subscriptionTier: 'free',
};

// Valid for another hour, so loadSession takes the "token still valid" branch
// and never calls /auth/refresh.
const VALID_SESSION = {
  accessToken: 'access-token-abc',
  refreshToken: 'refresh-token-xyz',
  expiresIn: 3600,
  expiresAt: Date.now() + 3600_000,
};

function cookieValue(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match && match[2] ? decodeURIComponent(match[2]) : null;
}

function seed(role: string) {
  localStorage.setItem('poojly_session', JSON.stringify(VALID_SESSION));
  localStorage.setItem('poojly_user', JSON.stringify({ ...BASE_USER, role }));
}

function Probe() {
  const { user, isLoading } = useAuth();
  return <span data-testid="role">{isLoading ? 'loading' : (user?.role ?? 'none')}</span>;
}

function renderProvider() {
  return render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  for (const pair of document.cookie.split(';')) {
    const name = pair.split('=')[0]?.trim();
    if (name) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  }
});

describe('AuthProvider rehydration', () => {
  it('A-011: re-translates a stored `pandit` role to `priest` and heals storage', async () => {
    seed('pandit');

    renderProvider();

    await waitFor(() => expect(screen.getByTestId('role')).toHaveTextContent('priest'));
    expect(JSON.parse(localStorage.getItem('poojly_user')!).role).toBe('priest');
    expect(JSON.parse(cookieValue('poojly_user')!).role).toBe('priest');
  });

  it('A-011: leaves an already-correct role untouched', async () => {
    seed('temple_manager');

    renderProvider();

    await waitFor(() => expect(screen.getByTestId('role')).toHaveTextContent('temple_manager'));
  });

  it('A-003: re-syncs the poojly_user cookie the middleware gate reads', async () => {
    // Exactly the state /auth/verify (magic link) leaves behind: localStorage
    // written directly, no cookie at all.
    seed('devotee');
    expect(cookieValue('poojly_user')).toBeNull();

    renderProvider();

    await waitFor(() => expect(cookieValue('poojly_user')).not.toBeNull());
    expect(JSON.parse(cookieValue('poojly_user')!).id).toBe('user-1');
  });

  it('A-007: rehydrating never re-creates the token cookie', async () => {
    seed('devotee');

    renderProvider();

    await waitFor(() => expect(screen.getByTestId('role')).toHaveTextContent('devotee'));
    expect(cookieValue('poojly_session')).toBeNull();
    expect(document.cookie).not.toContain(VALID_SESSION.refreshToken);
  });

  it('stays signed out when nothing is stored', async () => {
    renderProvider();

    await waitFor(() => expect(screen.getByTestId('role')).toHaveTextContent('none'));
    expect(cookieValue('poojly_user')).toBeNull();
  });
});
