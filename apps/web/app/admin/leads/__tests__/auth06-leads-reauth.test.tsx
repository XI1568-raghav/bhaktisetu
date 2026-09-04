/**
 * AUTH-06 — /admin/leads is one of the six pages that computed `reauth` and
 * threw it away.
 *
 * Every data path in this page goes through a local `authFetch` that throws
 * `new Error(\`${res.status} ${res.statusText}\`)`, so an expired session
 * surfaces as the literal string "401 Unauthorized". The load path fed that to
 * `friendlyApiError(err).message` and rendered the sentence "Your session has
 * expired. Please sign in again to continue." — an instruction with no control
 * anywhere on the page that could carry it out. The three MUTATION paths (add
 * note, change status, import) did not even do that: they rendered
 * `err.message` raw, so an admin whose session died mid-triage was shown
 * "401 Unauthorized" — the exact raw-status leak P1 #208 was filed for, still
 * live on three handlers in this file.
 *
 * A session expiry is not a page-level condition here; it is an ACTION-level
 * one. The list can be on screen and correct while the PATCH that changes a
 * lead's status is the thing that 401s. So the flag has to be carried by every
 * handler, not just the loader.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/leads',
}));

vi.mock('../../../../lib/auth-context', async () => {
  const actual =
    await vi.importActual<typeof import('../../../../lib/auth-context')>(
      '../../../../lib/auth-context',
    );
  return {
    ...actual,
    useAuth: () => ({ session: { accessToken: 'expired-token' }, user: null, isLoading: false }),
  };
});

import AdminLeadsPage from '../page';

const REAUTH_HREF = `/auth/login?redirect=${encodeURIComponent('/admin/leads')}`;

function respond(status: number, statusText: string, body: unknown = {}) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: async () => body,
  } as unknown as Response);
}

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AUTH-06 — /admin/leads renders the sign-in affordance on a 401', () => {
  it('the load path offers a link to sign in again, not just the sentence', async () => {
    globalThis.fetch = vi.fn(() => respond(401, 'Unauthorized')) as unknown as typeof fetch;

    render(<AdminLeadsPage />);

    expect(await screen.findByText(/session has expired/i)).toBeTruthy();
    const link = await screen.findByRole('link', { name: /sign in again/i });
    // Root-relative and carrying this page as the post-login destination, so
    // the admin lands back on the queue they were working.
    expect(link.getAttribute('href')).toBe(REAUTH_HREF);
  });

  it('a non-auth failure keeps a plain message and offers NO sign-in link', async () => {
    // The affordance must be tied to the flag, not shown on every error — a
    // sign-in link on a 500 sends the admin to re-enter credentials that were
    // never the problem.
    globalThis.fetch = vi.fn(() =>
      respond(500, 'Internal Server Error'),
    ) as unknown as typeof fetch;

    render(<AdminLeadsPage />);

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).toBeFalsy();
    });
    expect(await screen.findByText(/went wrong on our side/i)).toBeTruthy();
    expect(screen.queryByRole('link', { name: /sign in again/i })).toBeNull();
    // ...and the raw status line never reaches the admin.
    expect(document.body.textContent).not.toContain('500 Internal Server Error');
  });

  it('a 401 on the IMPORT action gets the same affordance, not a raw status line', async () => {
    // The three mutation handlers rendered `err.message` verbatim. This is the
    // mid-action case the finding is actually about: the page loaded fine and
    // the session died before the admin pressed the button.
    const fetchMock = vi
      .fn()
      // initial list + stats load succeed
      .mockImplementation((url: string) =>
        String(url).includes('/stats')
          ? respond(200, 'OK', { total: 0, replied: 0, converted: 0 })
          : respond(200, 'OK', { data: [], total: 0 }),
      );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    render(<AdminLeadsPage />);

    fireEvent.click(await screen.findByRole('button', { name: /import csv/i }));
    const textarea = await screen.findByPlaceholderText(/"role"/);
    fireEvent.change(textarea, {
      target: { value: '{"role":"TEMPLE","leads":[]}' },
    });

    // The session dies between opening the dialog and submitting it.
    fetchMock.mockImplementation(() => respond(401, 'Unauthorized'));

    fireEvent.click(await screen.findByRole('button', { name: /^import$/i }));

    expect(await screen.findByText(/session has expired/i)).toBeTruthy();
    expect(
      (await screen.findByRole('link', { name: /sign in again/i })).getAttribute('href'),
    ).toBe(REAUTH_HREF);
    expect(document.body.textContent).not.toContain('401 Unauthorized');
  });

  it('a malformed JSON paste still tells the admin what the parser objected to', async () => {
    // Routing the import handler through the friendly seam must NOT flatten
    // the parser's own message: "Unexpected token } in JSON at position 14" is
    // the only thing on screen that tells the admin where their paste is
    // wrong, and "We could not load this right now" would be a downgrade.
    globalThis.fetch = vi.fn((url: string) =>
      String(url).includes('/stats')
        ? respond(200, 'OK', { total: 0, replied: 0, converted: 0 })
        : respond(200, 'OK', { data: [], total: 0 }),
    ) as unknown as typeof fetch;

    render(<AdminLeadsPage />);

    fireEvent.click(await screen.findByRole('button', { name: /import csv/i }));
    const textarea = await screen.findByPlaceholderText(/"role"/);
    fireEvent.change(textarea, { target: { value: '{ not json ]' } });
    fireEvent.click(await screen.findByRole('button', { name: /^import$/i }));

    await waitFor(() => {
      expect(screen.getByText(/could not be read as JSON/i)).toBeTruthy();
    });
    expect(screen.queryByRole('link', { name: /sign in again/i })).toBeNull();
  });
});
