/**
 * Local-stack QA (slice D): with Supabase email confirmation ON, POST /auth/register
 * answers 201 `{ session: null, user }` — the account exists, there is just no
 * session yet. signUpWithCredentials treated the missing session as an UNREADABLE
 * reply, so the signup page showed "Darshya sent a reply we could not read" for an
 * account that had been created, and the "Verify your email" screen it already has
 * (keyed on `!result.accessToken`) was unreachable.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useEffect } from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../lib/auth-context';

const realFetch = globalThis.fetch;
type Auth = ReturnType<typeof useAuth>;
let auth: Auth | null = null;

function Probe() {
  const value = useAuth();
  useEffect(() => {
    auth = value;
  }, [value]);
  return <span data-testid="state">{value.isLoading ? 'loading' : 'ready'}</span>;
}

const DATA = {
  fullName: 'Confirm Me',
  email: 'confirm@example.com',
  phone: '9812345678',
  password: 'Passw0rd1',
  role: 'devotee' as const,
};

beforeEach(() => {
  auth = null;
  localStorage.clear();
});
afterEach(() => {
  globalThis.fetch = realFetch;
  vi.restoreAllMocks();
});

async function mount() {
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
  await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('ready'));
}

describe('signUpWithCredentials — email confirmation pending', () => {
  it('reports success WITHOUT an accessToken, and stores no session', async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ session: null, user: { id: 'u1', email: DATA.email, fullName: DATA.fullName, role: 'devotee' } }),
          { status: 201, headers: { 'Content-Type': 'application/json' } },
        ),
    ) as unknown as typeof fetch;
    await mount();
    let result: Awaited<ReturnType<Auth['signUpWithCredentials']>> | undefined;
    await act(async () => {
      result = await auth!.signUpWithCredentials(DATA);
    });
    expect(result?.success).toBe(true);
    expect(result?.accessToken).toBeUndefined();
    expect(localStorage.getItem('poojly_user')).toBeNull();
    expect(auth!.isAuthenticated).toBe(false);
  });

  it('still treats a reply with no user as unreadable', async () => {
    globalThis.fetch = vi.fn(
      async () => new Response(JSON.stringify({ session: null }), { status: 201, headers: { 'Content-Type': 'application/json' } }),
    ) as unknown as typeof fetch;
    await mount();
    let result: Awaited<ReturnType<Auth['signUpWithCredentials']>> | undefined;
    await act(async () => {
      result = await auth!.signUpWithCredentials(DATA);
    });
    expect(result?.success).toBe(false);
  });
});
