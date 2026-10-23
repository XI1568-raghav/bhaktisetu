/**
 * Provider signup -> portal. Production defect: POST /auth/register answered 201
 * with a session, signUpWithCredentials seeded the auth context, and the page's
 * "already signed in" effect then did `window.location.href = <portal>` WHILE the
 * POST /onboarding/provider call was still in flight. That full page load
 *   1. aborted the provider profile call (profiles stayed empty), and
 *   2. dropped the in-memory access token, so the portal's first requests were
 *      /auth/refresh with an empty body (400) and /auth/session/revive (401), and
 *      AuthGuard sent the new provider to /auth/login.
 * The signup must keep the session: soft navigation only, only after the profile
 * call settled, and the register request must let the browser keep the cookies.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';

const replace = vi.fn();
vi.mock('next/navigation', async (orig) => {
  const actual = (await orig()) as Record<string, unknown>;
  return { ...actual, useRouter: () => ({ replace, push: replace, prefetch: vi.fn(), back: vi.fn() }), usePathname: () => '/auth/signup' };
});

import { AuthProvider } from '../lib/auth-context';
import SignupPage from '../app/auth/signup/page';

const realFetch = globalThis.fetch;
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

let calls: Array<{ url: string; init?: RequestInit }> = [];
let releaseOnboarding: (() => void) | null = null;
let hrefWrites: string[] = [];

beforeEach(() => {
  calls = [];
  hrefWrites = [];
  replace.mockClear();
  localStorage.clear();
  // Any hard navigation shows up as a write to location.href.
  const loc = window.location;
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: new Proxy(loc, {
      set(_t, prop, value) {
        if (prop === 'href') hrefWrites.push(String(value));
        return true;
      },
      get(t, prop) {
        const v = (t as unknown as Record<string | symbol, unknown>)[prop];
        return typeof v === 'function' ? (v as (...a: unknown[]) => unknown).bind(t) : v;
      },
    }),
  });
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });
    if (url.endsWith('/auth/register')) {
      return json(201, {
        session: { accessToken: 'tok-new', refreshToken: 'ref-new', expiresAt: Date.now() + 3_600_000 },
        user: { id: 'u-1', email: 'p@example.com', fullName: 'Pandit Test', role: 'pandit' },
      });
    }
    if (url.endsWith('/onboarding/provider')) {
      await new Promise<void>((res) => {
        releaseOnboarding = res;
      });
      return json(200, { approved: false, listing: { message: 'Your portal is active. Add your price and details to be listed.' } });
    }
    return json(404, {});
  }) as unknown as typeof fetch;
});
afterEach(() => {
  globalThis.fetch = realFetch;
  vi.restoreAllMocks();
});

async function fillPanditForm(container: HTMLElement) {
  render(
    <AuthProvider>
      <SignupPage />
    </AuthProvider>,
  );
  await waitFor(() => expect(screen.getByText('Pandit')).toBeInTheDocument());
  fireEvent.click(screen.getByText('Pandit'));
  fireEvent.click(screen.getByRole('button', { name: /Continue as/ }));
  const set = (sel: string, value: string) => {
    const el = document.querySelector(sel) as HTMLInputElement;
    fireEvent.change(el, { target: { value } });
  };
  await waitFor(() => expect(document.querySelector('input[name="name"]')).toBeTruthy());
  set('input[name="name"]', 'Pandit Test');
  set('input[name="email"]', 'p@example.com');
  set('input[name="password"]', 'Passw0rd!x1');
  set('input[placeholder="e.g. 10"]', '10');
  fireEvent.click(screen.getByRole('button', { name: 'Satyanarayan Puja' }));
  const boxes = document.querySelectorAll('input[type="checkbox"]');
  fireEvent.click(boxes[boxes.length - 1]!);
  void container;
}

describe('provider signup keeps the session it was just given', () => {
  it('does not navigate while the profile call is in flight, then soft-navigates into the portal', async () => {
    await fillPanditForm(document.body);
    fireEvent.click(screen.getByRole('button', { name: /Create Account/ }));

    await waitFor(() => expect(calls.some((c) => c.url.endsWith('/onboarding/provider'))).toBe(true));
    // The auth context already holds the session here. Pre-fix, this is the moment
    // the effect navigated away and aborted the call above.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(replace).not.toHaveBeenCalled();
    expect(hrefWrites).toEqual([]);

    await act(async () => {
      releaseOnboarding?.();
    });
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/priest'));
    expect(hrefWrites).toEqual([]);
  });

  it('sends the provider profile with the new Bearer token and NO price', async () => {
    await fillPanditForm(document.body);
    fireEvent.click(screen.getByRole('button', { name: /Create Account/ }));
    await waitFor(() => expect(calls.some((c) => c.url.endsWith('/onboarding/provider'))).toBe(true));
    const onboard = calls.find((c) => c.url.endsWith('/onboarding/provider'))!;
    expect((onboard.init!.headers as Record<string, string>).Authorization).toBe('Bearer tok-new');
    const body = JSON.parse(String(onboard.init!.body));
    expect(body.role).toBe('PANDIT');
    expect(body.data).not.toHaveProperty('pricePerPuja');
    expect(body.data.specialties).toEqual(['Satyanarayan Puja']);
    await act(async () => {
      releaseOnboarding?.();
    });
  });

  it('lets the browser keep the session cookies from /auth/register', async () => {
    await fillPanditForm(document.body);
    fireEvent.click(screen.getByRole('button', { name: /Create Account/ }));
    await waitFor(() => expect(calls.some((c) => c.url.endsWith('/auth/register'))).toBe(true));
    expect(calls.find((c) => c.url.endsWith('/auth/register'))!.init!.credentials).toBe('include');
    await waitFor(() => expect(calls.some((c) => c.url.endsWith('/onboarding/provider'))).toBe(true));
    await act(async () => {
      releaseOnboarding?.();
    });
  });
});
