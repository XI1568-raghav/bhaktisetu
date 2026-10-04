/**
 * AUTH-08b (web half) — a database outage during sign-in must not read as a
 * wrong password ON SCREEN.
 *
 * The API used to answer an unreachable database with
 * `401 { error: 'Unauthorized', message: 'Invalid credentials.' }`
 * (apps/api/src/routes/auth.ts:1136, now 503). Changing only the status would
 * not have moved a single pixel, and THAT is the point these tests pin:
 *
 *   apps/web/lib/auth-context.tsx:942 reads
 *     errBody?.message || authHttpErrorMessage(res.status, 'Invalid email or password')
 *
 * The BODY MESSAGE WINS. `authHttpErrorMessage`'s `>= 500` branch — "Darshya
 * is not responding right now (HTTP n). Your details were not the problem" —
 * is therefore UNREACHABLE for any error the API bothers to give a message to.
 * A 503 whose body still said "Invalid credentials." would have shown the user
 * "Invalid credentials." So the status and the sentence had to move together,
 * which is exactly what the demo branch of the same handler (auth.ts:1024) had
 * been doing correctly all along.
 *
 * These tests characterise that precedence in both directions and then follow
 * the outage sentence all the way to the rendered error banner on
 * /auth/login, through the real handler at page.tsx:172 → setError.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useEffect } from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';

vi.mock('../lib/supabase', () => ({
  getSupabaseBrowserClient: () => null,
}));

import { AuthProvider, useAuth } from '../lib/auth-context';
import LoginPage from '../app/auth/login/page';

/** What the API answered for a database outage BEFORE this fix. */
const PRE_FIX_OUTAGE = {
  status: 401,
  body: { error: 'Unauthorized', message: 'Invalid credentials.' },
};

/** What it answers now — byte-identical to the demo branch at auth.ts:1026. */
const OUTAGE = {
  status: 503,
  body: {
    error: 'ServiceUnavailable',
    message: 'Sign-in is temporarily unavailable. Please try again in a moment.',
  },
};

/** A genuine rejected password, after the API's error catalogue localizes it. */
const WRONG_PASSWORD = {
  status: 401,
  body: {
    error: 'Unauthorized',
    message: 'Invalid email or password.',
    code: 'INVALID_CREDENTIALS',
  },
};

type SignIn = (email: string, password: string) => Promise<{ success: boolean; message: string }>;

const realFetch = globalThis.fetch;
let signIn: SignIn | null = null;

function Probe() {
  const auth = useAuth();
  useEffect(() => {
    signIn = auth.signInWithCredentials;
  }, [auth]);
  return <span data-testid="state">{auth.isLoading ? 'loading' : 'ready'}</span>;
}

function serve({ status, body }: { status: number; body: unknown }) {
  globalThis.fetch = vi.fn(
    async () =>
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
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
  localStorage.clear();
  globalThis.fetch = vi.fn(
    async () => new Response('{}', { status: 200 }),
  ) as unknown as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = realFetch;
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('auth-context.tsx:942 — the body message decides what the user reads', () => {
  it('the OLD outage body reached the user verbatim — this is why the API had to change', async () => {
    await mountAuth();
    serve(PRE_FIX_OUTAGE);

    let result: { success: boolean; message: string } | null = null;
    await act(async () => {
      result = await signIn!('real-user@example.com', 'the-correct-password');
    });

    // Not an accident of the old status: the body won outright. Had the fix
    // moved 401 → 503 and left the sentence alone, THIS is still what a user
    // would have read during an outage.
    expect(result!.success).toBe(false);
    expect(result!.message).toBe('Invalid credentials.');
  });

  it('a 5xx body message also wins — the >=500 branch never runs when a body speaks', async () => {
    await mountAuth();
    // The hypothetical half-fix: right status, wrong sentence.
    serve({ status: 503, body: { error: 'ServiceUnavailable', message: 'Invalid credentials.' } });

    let result: { success: boolean; message: string } | null = null;
    await act(async () => {
      result = await signIn!('real-user@example.com', 'the-correct-password');
    });

    expect(result!.message).toBe('Invalid credentials.');
    // authHttpErrorMessage(503, …) would have said this. It is unreachable.
    expect(result!.message).not.toMatch(/your details were not the problem/i);
  });

  it('the API answer as it stands now reads as an outage, not a credential problem', async () => {
    await mountAuth();
    serve(OUTAGE);

    let result: { success: boolean; message: string } | null = null;
    await act(async () => {
      result = await signIn!('real-user@example.com', 'the-correct-password');
    });

    expect(result!.success).toBe(false);
    expect(result!.message).toMatch(/temporarily unavailable/i);
    expect(result!.message).not.toMatch(/credential/i);
    expect(result!.message).not.toMatch(/password/i);
    expect(result!.message).not.toMatch(/invalid email/i);
  });

  it('a genuine wrong password still reads as a wrong password', async () => {
    await mountAuth();
    serve(WRONG_PASSWORD);

    let result: { success: boolean; message: string } | null = null;
    await act(async () => {
      result = await signIn!('real-user@example.com', 'not-the-password');
    });

    // The guard on the other side of the fix: an outage that now says 503 must
    // not drag the ordinary rejection with it. A user who mistyped still has
    // to be told to retype, not told the platform is down.
    expect(result!.success).toBe(false);
    expect(result!.message).toMatch(/invalid email or password/i);
    expect(result!.message).not.toMatch(/temporarily unavailable/i);
  });
});

describe('/auth/login renders the outage sentence, not the credentials one', () => {
  async function submitLogin(email: string, password: string) {
    render(
      <AuthProvider>
        <LoginPage />
      </AuthProvider>,
    );
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: email } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: password } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    });
  }

  it('shows the outage message in the error banner', async () => {
    serve(OUTAGE);
    await submitLogin('real-user@example.com', 'the-correct-password');

    // page.tsx:172 → setError(result.message) → the red banner at page.tsx:351.
    await waitFor(() =>
      expect(screen.getByText(/sign-in is temporarily unavailable/i)).toBeTruthy(),
    );
    expect(screen.queryByText(/invalid credentials/i)).toBeNull();
    expect(screen.queryByText(/invalid email or password/i)).toBeNull();
  });

  it('still shows the credentials message for a genuinely wrong password', async () => {
    serve(WRONG_PASSWORD);
    await submitLogin('real-user@example.com', 'not-the-password');

    await waitFor(() =>
      expect(screen.getByText(/invalid email or password/i)).toBeTruthy(),
    );
    expect(screen.queryByText(/temporarily unavailable/i)).toBeNull();
  });
});
