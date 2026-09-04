/**
 * PAR-14 — the website muhurat finder 401'd for every visitor.
 *
 * ORIGINAL DEFECT: apps/api/src/routes/weddings.ts registered POST /muhurat
 * behind `preHandler: [authenticateUser]`, and this page's submit handler
 * posted with only a content-type header and no credentials. The request 401'd
 * for EVERY web visitor — including a fully signed-in one — and the catch
 * turned that into the on-screen string "Request failed: 401". The mobile
 * client sends the token and works, which is why this only ever failed on web.
 *
 * ONE ASSERTION HERE WAS DELIBERATELY REWRITTEN, not weakened.
 *
 * The test named "does not fire a doomed request when the visitor is signed
 * out" asserted `expect(fetchMock).not.toHaveBeenCalled()`. That was the
 * correct contract while the endpoint required a session: firing an
 * unauthenticated request at an authenticated route only buys the visitor a
 * status code. It is the WRONG contract now. The API-side half of PAR-14 has
 * landed — POST /weddings/muhurat is public and rate-limited per IP (see
 * apps/api/src/routes/weddings.muhurat-public.par14.test.ts) — because the gate
 * was blocking the exact journey the route exists for: /weddings/inquiry emails
 * this page's URL to brand-new prospects, who are signed out by definition.
 *
 * Keeping the old assertion would have pinned the sign-in wall permanently in
 * place on the product's public lead-gen page. So it is replaced by its
 * opposite: the signed-out visitor's request IS fired, and carries no
 * Authorization header at all.
 *
 * What is covered:
 *   1. a signed-in visitor's token is attached;
 *   2. a signed-out visitor gets dates, with NO Authorization header — not a
 *      sign-in wall, and not a `Bearer undefined`;
 *   3. a session the API rejects still gets a door, not a raw status code.
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

  it('serves a signed-out visitor instead of walling them off', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => EMPTY_RESULT,
    });
    vi.stubGlobal('fetch', fetchMock);

    const { container } = render(<MuhuratPage />);
    submitForm(container);

    // The request is made. This is the assertion that used to be its opposite.
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    // ...and there is no sign-in wall standing between the prospect and the
    // dates they were emailed a link to.
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
    expect(screen.queryByRole('link', { name: /sign in/i })).toBeNull();
    // The results section, not the form. `/Rohini/` alone matches the
    // nakshatra <option> list that is on the page before any request is made,
    // so it would pass against the sign-in wall this test exists to forbid.
    expect(await screen.findByText(/Bride nakshatra/)).toBeInTheDocument();
  });

  it('sends no Authorization header at all when there is no session', async () => {
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
    const headers = (init.headers ?? {}) as Record<string, string>;

    // Not `Bearer undefined`, and not an empty bearer. middlewares/auth.ts
    // reads a present Authorization header as an attempt to authenticate, so a
    // garbage one is strictly worse than none — that is the SEC-02 empty-bearer
    // failure mode, and this page must not reintroduce it.
    const authKey = Object.keys(headers).find((k) => k.toLowerCase() === 'authorization');
    expect(authKey).toBeUndefined();
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
