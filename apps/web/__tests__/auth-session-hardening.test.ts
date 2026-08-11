/**
 * Regression tests for the auth-hardening batch (2026-08-10):
 *   A-011 — Google OAuth callback persisted the UNTRANSLATED `pandit` role.
 *   A-007 — access + refresh tokens were duplicated into a JS-readable,
 *           auto-transmitted `poojly_session` cookie on top of localStorage.
 *   A-003 / A-013 — `/temple-portal` and `/payouts` had no server-side session
 *           gate, unlike the six other portals.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import {
  fromApiRole,
  persistAuthStorage,
  getRoleDashboardPath,
  type AuthSession,
  type AuthUser,
} from '../lib/auth-context';
import { middleware } from '../middleware';

const SESSION: AuthSession = {
  accessToken: 'access-token-abc',
  refreshToken: 'refresh-token-xyz',
  expiresIn: 3600,
  expiresAt: Date.now() + 3600_000,
};

const USER: AuthUser = {
  id: 'user-1',
  phone: '+919876543210',
  fullName: 'Pandit Ramesh',
  email: 'ramesh@example.com',
  avatarUrl: null,
  preferredLanguage: 'hi',
  subscriptionTier: 'free',
  role: 'priest',
};

function cookieValue(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match && match[2] ? decodeURIComponent(match[2]) : null;
}

beforeEach(() => {
  localStorage.clear();
  for (const pair of document.cookie.split(';')) {
    const name = pair.split('=')[0]?.trim();
    if (name) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  }
});

describe('A-011 — API role is translated before it is persisted', () => {
  it('maps the API `pandit` enum onto the web `priest` role', () => {
    expect(fromApiRole('pandit')).toBe('priest');
  });

  it('is idempotent for already-translated and non-aliased roles', () => {
    expect(fromApiRole('priest')).toBe('priest');
    expect(fromApiRole('devotee')).toBe('devotee');
    expect(fromApiRole('temple_manager')).toBe('temple_manager');
    expect(fromApiRole('admin')).toBe('admin');
  });

  it('defaults a missing role to devotee', () => {
    expect(fromApiRole(undefined)).toBe('devotee');
    expect(fromApiRole(null)).toBe('devotee');
    expect(fromApiRole('')).toBe('devotee');
  });

  it('routes a Google-signed-in pandit to /priest, not the devotee dashboard', () => {
    // The exact composition /auth/callback now performs. Before the fix the raw
    // 'pandit' fell through getRoleDashboardPath's default to /dashboard.
    expect(getRoleDashboardPath(fromApiRole('pandit'))).toBe('/priest');
    expect(getRoleDashboardPath('devotee')).toBe('/dashboard');
  });
});

describe('A-007 — tokens live in exactly one JS-readable store', () => {
  it('writes the session to localStorage and NOT to a cookie', () => {
    persistAuthStorage(SESSION, USER);

    expect(JSON.parse(localStorage.getItem('poojly_session')!)).toEqual(SESSION);
    expect(cookieValue('poojly_session')).toBeNull();
    // No token may ride along on same-origin requests.
    expect(document.cookie).not.toContain(SESSION.accessToken);
    expect(document.cookie).not.toContain(SESSION.refreshToken);
  });

  it('still writes the token-free user cookie the middleware gate reads', () => {
    persistAuthStorage(SESSION, USER);

    const raw = cookieValue('poojly_user');
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!)).toEqual(USER);
  });

  it('clears a token cookie left behind by an older build', () => {
    document.cookie = `poojly_session=${encodeURIComponent(JSON.stringify(SESSION))}; path=/`;
    expect(cookieValue('poojly_session')).not.toBeNull();

    persistAuthStorage(SESSION, USER);

    expect(cookieValue('poojly_session')).toBeNull();
  });

  it('falls back to the cookie when localStorage is unavailable (session must survive)', () => {
    // Safari private mode et al: the cookie is then the ONLY copy of the
    // session, so dropping it would log those users out on every reload.
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => {
        throw new Error('localStorage blocked');
      },
      removeItem: () => {},
      clear: () => {},
    });

    try {
      persistAuthStorage(SESSION, USER);
      expect(JSON.parse(cookieValue('poojly_session')!)).toEqual(SESSION);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('clears both stores on sign-out', () => {
    persistAuthStorage(SESSION, USER);
    persistAuthStorage(null, null);

    expect(localStorage.getItem('poojly_session')).toBeNull();
    expect(localStorage.getItem('poojly_user')).toBeNull();
    expect(cookieValue('poojly_session')).toBeNull();
    expect(cookieValue('poojly_user')).toBeNull();
  });
});

describe('A-003 / A-013 — every portal gets the same server-side session gate', () => {
  const PORTALS = [
    '/admin',
    '/priest',
    '/store-admin',
    '/astrologer-portal',
    '/wellness-portal',
    '/gaushala-portal',
    '/temple-portal',
    '/payouts',
  ];

  function request(pathname: string, withSession: boolean) {
    const req = new NextRequest(new URL(`https://darshya.online${pathname}`));
    if (withSession) req.cookies.set('poojly_user', JSON.stringify({ id: 'u1' }));
    return req;
  }

  it.each(PORTALS)('307s a logged-out visitor away from %s', (portal) => {
    const res = middleware(request(portal, false));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe(
      `https://darshya.online/auth/login?redirect=${encodeURIComponent(portal)}`,
    );
  });

  it.each(PORTALS)('307s a logged-out visitor away from nested %s pages', (portal) => {
    const res = middleware(request(`${portal}/bookings`, false));
    expect(res.status).toBe(307);
  });

  it.each(PORTALS)('lets a session through to %s (role is enforced API-side)', (portal) => {
    const res = middleware(request(portal, true));
    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
  });

  it('leaves public pages alone', () => {
    const res = middleware(request('/temples', false));
    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
  });
});
