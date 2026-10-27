/**
 * SEC-02 STEP 2 — the half of revive that magic-link users were missing.
 *
 * MEASURED AT HEAD. `lib/session-revive.ts` had exactly one revive call and it
 * was `POST /auth/refresh`, a SUPABASE exchange. Its own header said so and
 * flagged the consequence in capitals:
 *
 *     "⚠ THIS DOES NOT COVER MAGIC-LINK USERS, AND THAT GATES SEC-02 STEP 4.
 *      ... apps/api/src/routes/magic-link.ts mints an `email_sessions` row via
 *      createEmailSession and answers `refreshToken: ''`, and that route
 *      deliberately issues NO `darshya_refresh` cookie ... So for every provider
 *      onboarded through the partnerships pipeline this call has no credential
 *      to send and 400s."
 *
 * Those are the users with no password at all — a magic link is their only
 * credential. They are unaffected only because `app/auth/verify` still writes
 * `poojly_session` to localStorage. Delete that write (SEC-02 step 4, the whole
 * point of the finding) and every one of them revive-fails, has their profile
 * marker cleared, and is signed out on their next reload.
 *
 * The API side now answers them: POST /auth/session/revive validates the 7-day
 * httpOnly `darshya_session` cookie against `email_sessions` and reports the
 * session — see apps/api/src/routes/auth.ts and
 * routes/auth.email-session-revive.sec02.test.ts. These tests pin the browser
 * side of that contract:
 *
 *   1. a Supabase user still costs exactly ONE round-trip — the fallback must
 *      not fire when /auth/refresh answers;
 *   2. a magic-link user, for whom /auth/refresh can only 400, falls through to
 *      the email-session route and comes back signed in;
 *   3. the cookie is the credential on that call too — credentials mode on, no
 *      token in the body;
 *   4. both refusing still means "signed out", not an unhandled rejection.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../lib/auth-context';
import { reviveSessionFromCookie, __resetReviveCache } from '../lib/session-revive';

const realFetch = globalThis.fetch;

const PROFILE = {
  id: '33333333-3333-3333-3333-333333333333',
  phone: '+919812345678',
  fullName: 'Mandir Trust',
  email: 'mandir.trust@example.com',
  avatarUrl: null,
  preferredLanguage: 'hi',
  subscriptionTier: 'free',
  role: 'temple_manager',
};

/** What POST /auth/session/revive answers: the email-session token, no refresh. */
const EMAIL_SESSION = {
  accessToken: 'email-33333333-3333-3333-3333-333333333333-abcdef0123456789abcdef0123456789',
  refreshToken: '',
  expiresIn: 7 * 24 * 60 * 60,
  expiresAt: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
};

const SUPABASE_SESSION = {
  accessToken: 'supabase-rotated-access-token',
  refreshToken: 'supabase-rotated-refresh-token',
  expiresIn: 3600,
  expiresAt: Math.floor(Date.now() / 1000) + 3600,
};

type Call = { url: string; init: RequestInit };

function installFetch(handler: (url: string) => Response): Call[] {
  const calls: Call[] = [];
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = String(input);
    calls.push({ url, init });
    return handler(url);
  }) as unknown as typeof fetch;
  return calls;
}

function ok(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function refused(status = 400): Response {
  return new Response(JSON.stringify({ error: 'Bad Request' }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** The API a magic-link browser really meets: /refresh has nothing to exchange. */
function magicLinkApi(url: string): Response {
  if (url.endsWith('/auth/refresh')) return refused(400);
  if (url.endsWith('/auth/session/revive')) {
    return ok({ success: true, session: EMAIL_SESSION, user: PROFILE });
  }
  return refused(404);
}

function Probe() {
  const { user, isLoading } = useAuth();
  return <span data-testid="role">{isLoading ? 'loading' : (user?.role ?? 'none')}</span>;
}

beforeEach(() => {
  __resetReviveCache();
  localStorage.clear();
  for (const pair of document.cookie.split(';')) {
    const name = pair.split('=')[0]?.trim();
    if (name) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  }
});

afterEach(() => {
  globalThis.fetch = realFetch;
  vi.restoreAllMocks();
});

describe('SEC-02 step 2 — revive falls through to the email-session route', () => {
  it('revives a magic-link browser that /auth/refresh can only refuse', async () => {
    const calls = installFetch(magicLinkApi);

    const revived = await reviveSessionFromCookie();

    expect(
      revived?.accessToken,
      'a provider whose only credential is a magic link cannot come back — ' +
        'deleting the localStorage write signs every one of them out on reload',
    ).toBe(EMAIL_SESSION.accessToken);
    expect(calls.some((c) => c.url.endsWith('/auth/session/revive'))).toBe(true);
  });

  it('sends the cookie as the credential, with no token in the body', async () => {
    const calls = installFetch(magicLinkApi);
    await reviveSessionFromCookie();

    const call = calls.find((c) => c.url.endsWith('/auth/session/revive'))!;
    expect(call.init.method).toBe('POST');
    expect(
      call.init.credentials,
      'outside credentials mode a cross-origin fetch omits darshya_session ' +
        'entirely, so the cookie can never be the credential',
    ).toBe('include');
    expect(String(call.init.body ?? '')).not.toContain('accessToken');
    expect(String(call.init.body ?? '')).not.toContain('email-');
  });

  it('does NOT fire for a Supabase user — one round-trip, not two', async () => {
    const calls = installFetch((url) =>
      url.endsWith('/auth/refresh') ? ok({ success: true, session: SUPABASE_SESSION }) : refused(),
    );

    const revived = await reviveSessionFromCookie();

    expect(revived?.accessToken).toBe(SUPABASE_SESSION.accessToken);
    expect(
      calls.filter((c) => c.url.endsWith('/auth/session/revive')),
      'every password/OAuth user would pay an extra cross-origin round-trip on ' +
        'every cold page load',
    ).toHaveLength(0);
  });

  it('still answers null when BOTH refuse', async () => {
    installFetch(() => refused(401));
    await expect(reviveSessionFromCookie()).resolves.toBeNull();
  });

  it('answers null rather than throwing when the API is unreachable', async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    }) as unknown as typeof fetch;
    await expect(reviveSessionFromCookie()).resolves.toBeNull();
  });
});

describe('SEC-02 step 2 — AuthProvider signs a magic-link browser back in', () => {
  it('rehydrates from the httpOnly cookie with no localStorage token', async () => {
    // Exactly the state SEC-02 step 4 leaves a magic-link provider in: the
    // token-free profile marker, and nothing else.
    localStorage.setItem('poojly_user', JSON.stringify(PROFILE));
    installFetch(magicLinkApi);

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    // `temple_manager` and not `devotee`: a provider demoted on rehydrate is
    // bounced straight out of their own portal (AUTH-03's failure mode).
    await waitFor(() => expect(screen.getByTestId('role')).toHaveTextContent('temple_manager'));
  });

  it('makes no call at all when nothing is stored — the anonymous path stays offline', async () => {
    const calls = installFetch(magicLinkApi);

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('role')).toHaveTextContent('none'));
    expect(calls).toHaveLength(0);
  });
});
