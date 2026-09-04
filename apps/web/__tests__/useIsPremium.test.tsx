import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const useAuthMock = vi.fn();

vi.mock('../lib/auth-context', () => ({
  useAuth: () => useAuthMock(),
}));

import { useIsPremium } from '../components/useIsPremium';

/**
 * TC-04 / PM-05 — the ad gate asks the server.
 *
 * REWRITTEN 2026-09-01. The previous suite asserted the defect: six of its
 * eight cases fed a `subscriptionTier` string straight into the hook and
 * expected `true` back ("returns true for pro tier", "returns true for
 * annual_ratna tier", "returns true when user has isNriPremium flag"). Every
 * one of those passed against a hook that could not gate anything, because no
 * route in apps/api ever writes `User.subscriptionTier` and `isNriPremium`
 * existed nowhere but in the hook that read it. A green suite over a tier
 * string the product never assigns is what let the gate ship.
 *
 * These cases assert the two properties that make a gate safe instead: it asks
 * the SERVER, and it fails CLOSED. The first case below is the regression
 * guard — a signed-in user whose profile carries every one of the old magic
 * tier strings must still not be granted, because the server did not say so.
 */
const originalFetch = globalThis.fetch;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function signedIn(user: Record<string, unknown> = {}) {
  useAuthMock.mockReturnValue({
    isAuthenticated: true,
    session: { accessToken: 'tok-1' },
    user: { subscriptionTier: 'free', ...user },
  });
}

beforeEach(() => {
  useAuthMock.mockReset();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe('useIsPremium — ad suppression is a server answer', () => {
  it('does NOT grant on a client-side tier string the server never confirmed', async () => {
    const spy = vi.fn().mockResolvedValue(jsonResponse({ tier: 'ENTERPRISE', entitlements: [] }));
    globalThis.fetch = spy as unknown as typeof fetch;
    // Every string the deleted implementation treated as premium, at once.
    signedIn({ subscriptionTier: 'annual_ratna', isNriPremium: true });

    const { result } = renderHook(() => useIsPremium());
    await waitFor(() => expect(spy).toHaveBeenCalled());
    await waitFor(() => expect(result.current).toBe(false));

    const [url] = spy.mock.calls[0] as [string];
    expect(String(url)).toContain('/subscriptions/entitlements');
  });

  it('grants when the server actually lists ads.suppressed', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ tier: 'ENTERPRISE', entitlements: ['ads.suppressed'] }),
      ) as unknown as typeof fetch;
    signedIn();

    const { result } = renderHook(() => useIsPremium());
    await waitFor(() => expect(result.current).toBe(true));
  });

  it('does not grant on a neighbouring capability', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ tier: 'ENTERPRISE', entitlements: ['ai_astro.unlimited'] }),
      ) as unknown as typeof fetch;
    signedIn();

    const { result } = renderHook(() => useIsPremium());
    await waitFor(() => expect(result.current).toBe(false));
  });

  it('fails closed when the entitlements call errors', async () => {
    globalThis.fetch = vi
      .fn()
      .mockRejectedValue(new Error('network down')) as unknown as typeof fetch;
    signedIn({ subscriptionTier: 'pro' });

    const { result } = renderHook(() => useIsPremium());
    await waitFor(() => expect(result.current).toBe(false));
  });

  it('asks nothing and grants nothing when signed out', async () => {
    const spy = vi.fn();
    globalThis.fetch = spy as unknown as typeof fetch;
    useAuthMock.mockReturnValue({ isAuthenticated: false, session: null, user: null });

    const { result } = renderHook(() => useIsPremium());
    await waitFor(() => expect(result.current).toBe(false));
    expect(spy).not.toHaveBeenCalled();
  });
});
