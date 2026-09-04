/**
 * AUTH-13 — the Google callback never read the OAuth error parameters.
 *
 * When a user declines consent, or the provider rejects the request, Supabase
 * sends them straight back to /auth/callback carrying `error`,
 * `error_code` and `error_description` — in the URL FRAGMENT for the implicit
 * flow, in the query string for PKCE. This page read neither. It went straight
 * into its 20 x 150ms polling loop for a session that by definition will never
 * appear, spun for three seconds, and then reported "Could not read Google
 * session. Please try again." — which describes a transport problem to someone
 * who deliberately pressed Cancel, and hides a real provider misconfiguration
 * (redirect_uri_mismatch, an unverified app) behind the same sentence.
 *
 * These tests bind: an OAuth error is recognised, reported in the provider's
 * own words, and reported IMMEDIATELY.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const getSession = vi.fn();

vi.mock('../../../../lib/supabase', () => ({
  getSupabaseBrowserClient: () => ({ auth: { getSession } }),
}));

import AuthCallbackPage from '../page';

const realFetch = globalThis.fetch;

function setUrl(search: string, hash: string) {
  window.history.replaceState({}, '', `/auth/callback${search}${hash}`);
}

beforeEach(() => {
  getSession.mockReset();
  getSession.mockResolvedValue({ data: { session: null } });
  globalThis.fetch = vi.fn(async () => new Response('{}', { status: 200 })) as unknown as typeof fetch;
  setUrl('', '');
});

afterEach(() => {
  globalThis.fetch = realFetch;
  vi.restoreAllMocks();
  setUrl('', '');
});

describe('AUTH-13 — the OAuth error parameters are read', () => {
  it('reports a declined consent from the URL fragment without polling first', async () => {
    setUrl(
      '',
      '#error=access_denied&error_code=user_denied&error_description=User+denied+the+request',
    );

    render(<AuthCallbackPage />);

    await waitFor(() => expect(screen.getByText(/sign-in (failed|cancelled|canceled)/i)).toBeTruthy());
    // The provider's own words, not a generic transport apology.
    expect(screen.getByText(/denied/i)).toBeTruthy();
    // And it must NOT have gone anywhere near the three-second session poll.
    expect(getSession).not.toHaveBeenCalled();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('reports an error delivered in the QUERY string (PKCE flow)', async () => {
    setUrl('?error=server_error&error_description=Database+error+saving+new+user', '');

    render(<AuthCallbackPage />);

    await waitFor(() => expect(screen.getByText(/Database error saving new user/i)).toBeTruthy());
    expect(getSession).not.toHaveBeenCalled();
  });

  it('does not mistake an ordinary callback for an error', async () => {
    setUrl('', '#access_token=abc&token_type=bearer');

    render(<AuthCallbackPage />);

    // No error copy — this is the happy path arriving; the page must go on to
    // look for the session as it always did.
    await waitFor(() => expect(getSession).toHaveBeenCalled());
    expect(screen.queryByText(/sign-in failed/i)).toBeNull();
  });
});
