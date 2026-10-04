/**
 * RES-09 (final sweep) — behaviour, not source text. A fake fetch answers the
 * way a real outage does, and the assertion is on what a user would read.
 *
 * Samples one surface from each family the sweep touched:
 *   - a component that rendered the server's raw `error` field
 *     (EmailCapture: {"error":"Internal Server Error"})
 *   - a lib client whose thrown Error became on-screen text
 *     (lib/wellness-api: "Failed to load students (500): <raw body>")
 *   - an admin API wrapper over a money operation, whose server sentence must
 *     SURVIVE (app/admin/refunds/refund-api) while status text must not
 *   - a page that rendered `err.message` for a failed fetch
 *     (app/admin/consultations: "Failed to fetch")
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';

vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({
    session: { accessToken: 'test-token' },
    user: { id: 'u1', role: 'admin' },
    isAuthenticated: true,
    isLoading: false,
  }),
  getRoleDashboardPath: () => '/dashboard',
}));
vi.mock('../components/AuthGuard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/admin/consultations',
  useSearchParams: () => new URLSearchParams(),
}));

import EmailCapture from '../components/EmailCapture';
import { getMyStudents } from '../lib/wellness-api';
import { listPendingRefunds } from '../app/admin/refunds/refund-api';
import AdminConsultationsPage from '../app/admin/consultations/page';
import { classifyUserFacing } from '../lib/friendly-error';

const res = (body: unknown, status: number, statusText = '') =>
  ({
    ok: status >= 200 && status < 300,
    status,
    statusText,
    headers: new Headers(),
    json: async () => body,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  }) as Response;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const DEV_TEXT = /Internal Server Error|Failed to fetch|\(500\)|\(502\)|HTTP \d{3}|\b50\d\b|Unexpected token/i;

describe('RES-09 — EmailCapture', () => {
  async function submitWith(response: Response | Error) {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        if (response instanceof Error) throw response;
        return response;
      }),
    );
    render(<EmailCapture source="test" variant="inline" />);
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'a@b.com' },
    });
    fireEvent.submit(screen.getByPlaceholderText('you@example.com').closest('form')!);
  }

  it('does not print a bare {"error":"Internal Server Error"}', async () => {
    await submitWith(res({ error: 'Internal Server Error' }, 500, 'Internal Server Error'));
    await waitFor(() => expect(screen.getByText(/Could not save your email/)).toBeTruthy());
    expect(document.body.textContent).not.toMatch(DEV_TEXT);
  });

  it('keeps a sentence the API wrote for the user', async () => {
    await submitWith(res({ error: 'That email address is not valid.' }, 400));
    await waitFor(() => expect(screen.getByText('That email address is not valid.')).toBeTruthy());
  });
});

describe('RES-09 — lib/wellness-api', () => {
  it('turns a 500 with a raw body into friendly copy and keeps the status for reauth', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => res({ error: 'Internal Server Error' }, 500)));
    const err = await getMyStudents('t').catch((e) => e);
    expect(err).toBeInstanceOf(Error);
    expect(err.message).not.toMatch(DEV_TEXT);
    expect(err.message).not.toMatch(/Failed to load students/);
  });

  it('a 401 classifies as reauth without a status code in the text', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => res({ error: 'Unauthorized' }, 401, 'Unauthorized')));
    const err = await getMyStudents('t').catch((e) => e);
    const { message, reauth } = classifyUserFacing(err);
    expect(reauth).toBe(true);
    expect(message).not.toMatch(/401|Unauthorized/);
  });

  it('keeps a validation sentence the API wrote', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => res({ error: 'Class is full.' }, 409)));
    const err = await getMyStudents('t').catch((e) => e);
    expect(err.message).toBe('Class is full.');
  });
});

describe('RES-09 — admin refund wrapper (money path)', () => {
  it('preserves the gateway sentence an operator must read', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => res({ error: 'Razorpay is not configured on this server.' }, 502)),
    );
    const err = await listPendingRefunds('t').catch((e) => e);
    expect(err.message).toBe('Razorpay is not configured on this server.');
  });

  it('hides the status name when the server only sent one', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => res({ error: 'Bad Gateway' }, 502)));
    const err = await listPendingRefunds('t').catch((e) => e);
    expect(err.message).not.toMatch(/Bad Gateway|502|Request failed/);
  });

  it('a dropped connection reads as a connection problem', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    const err = await listPendingRefunds('t').catch((e) => e);
    expect(err.message).not.toMatch(/Failed to fetch/);
  });
});

describe('RES-09 — /admin/consultations', () => {
  it('shows connection copy, not the browser\'s "Failed to fetch"', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    render(<AdminConsultationsPage />);
    await waitFor(() => expect(screen.getByText(/check your connection/i)).toBeTruthy());
    expect(document.body.textContent).not.toMatch(/Failed to fetch/);
  });

  it('shows no HTTP status for a 500', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => res({ error: 'Internal Server Error' }, 500)));
    render(<AdminConsultationsPage />);
    await waitFor(() => expect(screen.getByText(/went wrong on our side/i)).toBeTruthy());
    expect(document.body.textContent).not.toMatch(/API 500/);
  });
});
