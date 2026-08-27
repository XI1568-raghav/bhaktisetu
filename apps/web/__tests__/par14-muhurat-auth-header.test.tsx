/**
 * PAR-14 — the website muhurat finder sent no Authorization header.
 *
 * apps/api/src/routes/weddings.ts registers POST /muhurat behind
 * `preHandler: [authenticateUser]`, but this page's submit handler posted with
 * only a content-type header and no credentials. So the request 401'd for
 * EVERY web visitor — including a fully signed-in one — and the catch turned
 * that into the on-screen string "Request failed: 401". The mobile client
 * sends the token and works, which is why this only ever failed on the web.
 *
 * Two separate defects, both covered here:
 *   1. a signed-in visitor's token was never attached at all;
 *   2. a signed-out visitor was fired at an authenticated endpoint anyway and
 *      shown a raw status code instead of a way forward.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockAuth = vi.hoisted(() => ({ session: null as { accessToken: string } | null }));

vi.mock('../lib/auth-context', () => ({
  useAuth: () => mockAuth,
}));

import MuhuratPage from '../app/weddings/muhurat/page';

const EMPTY_RESULT = {
  bride: { nakshatra: 'Rohini', rashi: 'Vrishabha' },
  groom: { nakshatra: 'Hasta', rashi: 'Kanya' },
  mangalikFlag: { brideMangalik: false, groomMangalik: false },
  candidates: [],
};

function submitForm(container: HTMLElement) {
  const form = container.querySelector('form');
  expect(form).not.toBeNull();
  fireEvent.submit(form as HTMLFormElement);
}

beforeEach(() => {
  mockAuth.session = null;
});

describe('PAR-14 — the muhurat finder authenticates the request it makes', () => {
  it('sends a bearer token when the visitor is signed in', async () => {
    mockAuth.session = { accessToken: 'tok-abc123' };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => EMPTY_RESULT,
    });
    vi.stubGlobal('fetch', fetchMock);

    const { container } = render(<MuhuratPage />);
    submitForm(container);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const init = fetchMock.mock.calls[0]![1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer tok-abc123');
  });

  it('does not fire a doomed request when the visitor is signed out', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { container } = render(<MuhuratPage />);
    submitForm(container);

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(fetchMock).not.toHaveBeenCalled();
    // The visitor gets a way forward, not a status code. The return path is
    // percent-encoded into the query string, so decode before asserting on it.
    const signIn = screen.getByRole('link', { name: /sign in/i });
    const href = signIn.getAttribute('href') ?? '';
    expect(href.startsWith('/auth/login?')).toBe(true);
    expect(decodeURIComponent(href)).toContain('/weddings/muhurat');
  });

  it('never renders a bare HTTP status code as the error', async () => {
    mockAuth.session = { accessToken: 'expired' };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({}) }),
    );

    const { container } = render(<MuhuratPage />);
    submitForm(container);

    const alert = await screen.findByRole('alert');
    expect(alert.textContent ?? '').not.toMatch(/Request failed: 401/);
    expect(alert.textContent ?? '').toMatch(/sign in|session/i);
  });
});
