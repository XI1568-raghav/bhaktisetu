/**
 * AUTH-02 — sign-in parsed the response BODY before it checked the response
 * STATUS.
 *
 * `const data = await res.json(); if (!res.ok) …` looks harmless until the
 * failure is not JSON. A gateway in front of a cold, crashed or suspended API
 * answers 502/503 with an HTML error page; `res.json()` on HTML throws a
 * `SyntaxError`, which lands in the same `catch` as a rejected credential.
 * `isNetworkFailure` says false for a SyntaxError, so the handler fell through
 * to its last line and told a user whose password was CORRECT that their email
 * or password was wrong — sending them off to reset a password that was never
 * the problem. That is the live production state today: darshya.online and
 * api.darshya.online are 503 behind Render's suspension.
 *
 * The contract these bind: check `res.ok` FIRST, and never blame the
 * credential for a 5xx.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useEffect } from 'react';
import { render, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../lib/auth-context';

type SignIn = (email: string, password: string) => Promise<{ success: boolean; message: string }>;
type SignUp = (data: {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  role: 'devotee';
}) => Promise<{ success: boolean; message: string }>;
type VerifyOtp = (
  phone: string,
  token: string,
) => Promise<{ success: boolean; message: string }>;
type SendOtp = (phone: string) => Promise<{ success: boolean; message: string }>;

const realFetch = globalThis.fetch;

let signIn: SignIn | null = null;
let signUp: SignUp | null = null;
let verifyOtp: VerifyOtp | null = null;
let sendOtp: SendOtp | null = null;

function Probe() {
  const auth = useAuth();
  useEffect(() => {
    signIn = auth.signInWithCredentials;
    signUp = auth.signUpWithCredentials as unknown as SignUp;
    verifyOtp = auth.verifyOtp;
    sendOtp = auth.signInWithOtp;
  }, [auth]);
  return <span data-testid="state">{auth.isLoading ? 'loading' : 'ready'}</span>;
}

const GATEWAY_HTML =
  '<!DOCTYPE html><html><head><title>502 Bad Gateway</title></head><body><h1>502 Bad Gateway</h1></body></html>';

function serveGatewayHtml(status: number) {
  globalThis.fetch = vi.fn(
    async () =>
      new Response(GATEWAY_HTML, {
        status,
        headers: { 'Content-Type': 'text/html' },
      }),
  ) as unknown as typeof fetch;
}

async function mountAuth() {
  const view = render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
  await waitFor(() => expect(view.getByTestId('state').textContent).toBe('ready'));
  return view;
}

beforeEach(() => {
  signIn = null;
  signUp = null;
  verifyOtp = null;
  sendOtp = null;
  localStorage.clear();
  globalThis.fetch = vi.fn(async () => new Response('{}', { status: 200 })) as unknown as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = realFetch;
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('AUTH-02 — an HTML 502 must not read as a wrong password', () => {
  it('does not blame the credentials when the API answers 502 with HTML', async () => {
    await mountAuth();
    serveGatewayHtml(502);

    let result: { success: boolean; message: string } | null = null;
    await act(async () => {
      result = await signIn!('real-user@example.com', 'the-correct-password');
    });

    expect(result!.success).toBe(false);
    expect(result!.message).not.toMatch(/invalid email or password/i);
    expect(result!.message).not.toMatch(/incorrect password/i);
    // The status the server actually sent has to reach the user, or they have
    // no way to tell "try again in a minute" from "reset your password".
    expect(result!.message).toMatch(/502/);
  });

  it('says the same honest thing for a 503 — the current production state', async () => {
    await mountAuth();
    serveGatewayHtml(503);

    let result: { success: boolean; message: string } | null = null;
    await act(async () => {
      result = await signIn!('real-user@example.com', 'the-correct-password');
    });

    expect(result!.success).toBe(false);
    expect(result!.message).not.toMatch(/password/i);
    expect(result!.message).toMatch(/503/);
  });

  it('still shows the SERVER’s own 401 message verbatim', async () => {
    await mountAuth();
    globalThis.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ message: 'Invalid email or password' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }),
    ) as unknown as typeof fetch;

    let result: { success: boolean; message: string } | null = null;
    await act(async () => {
      result = await signIn!('real-user@example.com', 'wrong');
    });

    expect(result!.success).toBe(false);
    expect(result!.message).toBe('Invalid email or password');
  });

  it('falls back to a credential message on a 401 with a non-JSON body', async () => {
    await mountAuth();
    globalThis.fetch = vi.fn(
      async () => new Response('not json at all', { status: 401 }),
    ) as unknown as typeof fetch;

    let result: { success: boolean; message: string } | null = null;
    await act(async () => {
      result = await signIn!('real-user@example.com', 'wrong');
    });

    expect(result!.success).toBe(false);
    expect(result!.message).toMatch(/invalid email or password/i);
  });

  it('reports a 200 whose body is not JSON as a server problem, not a login failure', async () => {
    await mountAuth();
    globalThis.fetch = vi.fn(
      async () => new Response('<html>oops</html>', { status: 200 }),
    ) as unknown as typeof fetch;

    let result: { success: boolean; message: string } | null = null;
    await act(async () => {
      result = await signIn!('real-user@example.com', 'the-correct-password');
    });

    expect(result!.success).toBe(false);
    expect(result!.message).not.toMatch(/invalid email or password/i);
  });

  it('signs in normally when the API answers properly', async () => {
    await mountAuth();
    globalThis.fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            session: { accessToken: 'a', refreshToken: 'r', expiresIn: 3600, expiresAt: Date.now() + 3600_000 },
            user: { id: 'u1', phone: '+911', fullName: 'A', email: 'a@b.com', avatarUrl: null, preferredLanguage: 'en', subscriptionTier: 'free', role: 'pandit' },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
    ) as unknown as typeof fetch;

    let result: { success: boolean; message: string } | null = null;
    await act(async () => {
      result = await signIn!('a@b.com', 'pw');
    });

    expect(result!.success).toBe(true);
  });
});

describe('AUTH-02 — the same order of checks on the other auth doors', () => {
  it('register does not report a gateway 502 as a validation failure', async () => {
    await mountAuth();
    serveGatewayHtml(502);

    let result: { success: boolean; message: string } | null = null;
    await act(async () => {
      result = await signUp!({
        fullName: 'New User',
        email: 'new@example.com',
        phone: '+919000000000',
        password: 'password1',
        role: 'devotee',
      });
    });

    expect(result!.success).toBe(false);
    expect(result!.message).not.toMatch(/^registration failed$/i);
    expect(result!.message).toMatch(/502/);
  });

  it('verify-otp does not report a gateway 502 as a bad OTP', async () => {
    await mountAuth();
    serveGatewayHtml(502);

    let result: { success: boolean; message: string } | null = null;
    await act(async () => {
      result = await verifyOtp!('+919000000000', '123456');
    });

    expect(result!.success).toBe(false);
    expect(result!.message).not.toMatch(/verification failed/i);
    expect(result!.message).toMatch(/502/);
  });

  it('send-otp does not report a gateway 502 as a send failure with no cause', async () => {
    await mountAuth();
    serveGatewayHtml(502);

    let result: { success: boolean; message: string } | null = null;
    await act(async () => {
      result = await sendOtp!('+919000000000');
    });

    expect(result!.success).toBe(false);
    expect(result!.message).toMatch(/502/);
  });
});
