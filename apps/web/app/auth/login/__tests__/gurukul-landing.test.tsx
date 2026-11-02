import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';

// The login page's single post-login navigation effect: a devotee who owns a gurukul lands on
// /gurukul-portal, every other sign-in keeps the destination it had before.

const navigate = vi.fn();
let authState: { role: string; accessToken: string };

vi.mock('../../../../lib/use-soft-navigate', () => ({ useSoftNavigate: () => navigate }));
vi.mock('../../../../lib/auth-context', async () => {
  const actual = await vi.importActual<typeof import('../../../../lib/auth-context')>(
    '../../../../lib/auth-context',
  );
  return {
    ...actual,
    useAuth: () => ({
      signInWithCredentials: vi.fn(),
      signInWithOtp: vi.fn(),
      verifyOtp: vi.fn(),
      isAuthenticated: true,
      user: { id: 'u1', role: authState.role },
      session: { accessToken: authState.accessToken },
    }),
  };
});
vi.mock('../../../../lib/supabase', () => ({ getSupabaseBrowserClient: () => null }));

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

async function renderLogin(search = '') {
  window.history.replaceState({}, '', `/auth/login${search}`);
  const { default: LoginPage } = await import('../page');
  render(<LoginPage />);
}

beforeEach(() => {
  navigate.mockReset();
  authState = { role: 'devotee', accessToken: 'tok' };
});
afterEach(() => vi.unstubAllGlobals());

describe('login landing for a gurukul owner', () => {
  it('sends a devotee who owns a gurukul to /gurukul-portal, once', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ gurukuls: [{ id: 'g1' }] })));
    await renderLogin();
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/gurukul-portal'));
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it('keeps a devotee with no gurukul on /dashboard', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ gurukuls: [] })));
    await renderLogin();
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/dashboard'));
  });

  it('lands on /dashboard when the lookup fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({}, 500)));
    await renderLogin();
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/dashboard'));
  });

  it('honours an explicit ?redirect= without probing', async () => {
    const spy = vi.fn(async () => json({ gurukuls: [{ id: 'g1' }] }));
    vi.stubGlobal('fetch', spy);
    await renderLogin('?redirect=%2Fastrology');
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/astrology'));
    expect(spy).not.toHaveBeenCalled();
  });

  it('does not change where a priest lands', async () => {
    authState = { role: 'priest', accessToken: 'tok' };
    const spy = vi.fn(async () => json({ gurukuls: [{ id: 'g1' }] }));
    vi.stubGlobal('fetch', spy);
    await renderLogin();
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/priest'));
    expect(spy).not.toHaveBeenCalled();
  });
});
