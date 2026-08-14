/**
 * AO-03 (prod sweep 2026-08-12) — /admin/kyc returned HTTP 404.
 *
 * The provider-KYC rail exists on the API and has no screen:
 *   GET   /api/v1/admin/bookings/provider-kyc?status=pending|verified|rejected
 *         → { status, submissions: [ { user_id, verified, verified_at,
 *              rejection_reason, created_at, has_bank, full_name, email } ] }
 *   PATCH /api/v1/admin/bookings/provider-kyc/:userId
 *         body { action: 'verify' | 'reject', reason? }
 *         → { ok: true, userId, verified, reason }
 *
 * Why this matters more than a missing page: payout.service gates BOTH payout
 * paths on provider_kyc.verified, and until 2026-08-12 nothing in the codebase
 * could ever set that column to true. Every earning provider was permanently
 * told "KYC pending" and could not withdraw. This screen is the only writer.
 *
 * Locked down here:
 *  1. Verify is blocked in the UI when no bank account is on file — the API
 *     409s that case, and it does so only after the operator has told the
 *     provider they are approved.
 *  2. Reject requires a reason (the API's zod refine rejects it otherwise).
 *  3. Neither decision is claimed from a 200. Both check the server's own
 *     `verified` flag AND refetch the queue to prove the row moved.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({ session: { accessToken: 'test-token' } }),
}));

import AdminKycPage from '../app/admin/kyc/page';

// ─── fixtures — snake_case exactly as the raw SQL projection returns ─────────

const PENDING_SUBMISSION = {
  user_id: 'b61f02c9-b795-4e2e-a1e8-1f10660520b9',
  verified: false,
  verified_at: null,
  rejection_reason: null,
  created_at: '2026-08-12T11:40:34.983Z',
  has_bank: true,
  full_name: 'Demo Pandit',
  email: 'pandit@demo.com',
};

const NO_BANK_SUBMISSION = {
  ...PENDING_SUBMISSION,
  user_id: '7b9d7a61-8caa-4349-9ba2-02e441ec38da',
  has_bank: false,
  full_name: 'Pandit Ramesh Shastri',
  email: 'ramesh@example.com',
};

function jsonResponse(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  const text = JSON.stringify(body);
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    text: async () => text,
    json: async () => JSON.parse(text),
  } as unknown as Response;
}

interface MockOpts {
  /** Pending-queue payload per successive GET (last entry repeats). */
  queues?: unknown[][];
  decide?: (body: Record<string, unknown>, url: string) => Response;
}

function mockApi(opts: MockOpts = {}) {
  const queues = opts.queues ?? [[PENDING_SUBMISSION], []];
  let queueCall = 0;

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method ?? 'GET').toUpperCase();

    if (method === 'PATCH') {
      const body = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;
      if (opts.decide) return opts.decide(body, url);
      return jsonResponse({
        ok: true,
        userId: PENDING_SUBMISSION.user_id,
        verified: body.action === 'verify',
        reason: body.reason ?? null,
      });
    }
    if (url.includes('/admin/bookings/provider-kyc')) {
      const status = /status=([a-z]+)/.exec(url)?.[1] ?? 'pending';
      if (status !== 'pending') return jsonResponse({ status, submissions: [] });
      const q = queues[Math.min(queueCall, queues.length - 1)];
      queueCall += 1;
      return jsonResponse({ status, submissions: q });
    }
    throw new Error(`unexpected fetch: ${method} ${url}`);
  });

  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function nonGetCalls(fetchMock: ReturnType<typeof vi.fn>) {
  return fetchMock.mock.calls.filter(
    (c) => ((c[1] as RequestInit | undefined)?.method ?? 'GET').toUpperCase() !== 'GET',
  );
}

async function renderPage(name = 'Demo Pandit') {
  render(<AdminKycPage />);
  await screen.findByText(name);
}

const verifyButton = () => screen.getByRole('button', { name: /^verify$/i });
const verifyConfirm = () => screen.getByRole('button', { name: /confirm verification/i });
const rejectConfirm = () => screen.getByRole('button', { name: /confirm rejection/i });

async function openRejectDialog(reason = 'ID document is unreadable') {
  fireEvent.click(screen.getByRole('button', { name: /^reject$/i }));
  const input = await screen.findByLabelText(/reason/i);
  fireEvent.change(input, { target: { value: reason } });
}

beforeEach(() => {
  vi.unstubAllGlobals();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

// ─── the missing screen ──────────────────────────────────────────────────────

describe('AO-03 — /admin/kyc renders the KYC review queue', () => {
  it('loads the pending queue from the real endpoint', async () => {
    const fetchMock = mockApi();
    await renderPage();

    const urls = fetchMock.mock.calls.map((c) => String(c[0]));
    expect(urls.some((u) => u.includes('/admin/bookings/provider-kyc'))).toBe(true);
    expect(screen.getByText('pandit@demo.com')).toBeTruthy();
  });

  it('authenticates the queue fetch so the admin preHandler does not 401 it', async () => {
    const fetchMock = mockApi();
    await renderPage();
    const call = fetchMock.mock.calls.find((c) => String(c[0]).includes('/provider-kyc'));
    const headers = ((call?.[1] as RequestInit | undefined)?.headers ?? {}) as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer test-token');
  });

  it('can switch to the verified and rejected views', async () => {
    const fetchMock = mockApi();
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: /^verified$/i }));

    await waitFor(() => {
      const urls = fetchMock.mock.calls.map((c) => String(c[0]));
      expect(urls.some((u) => u.includes('status=verified'))).toBe(true);
    });
  });

  it('reports an empty queue instead of implying nobody is waiting on a failed load', async () => {
    mockApi({ queues: [[]] });
    render(<AdminKycPage />);
    await screen.findByText(/no kyc submissions/i);
    expect(screen.queryByRole('button', { name: /^verify$/i })).toBeNull();
  });
});

// ─── verify ──────────────────────────────────────────────────────────────────

describe('AO-03 — verifying a provider', () => {
  it("PATCHes action 'verify' at the provider's user id", async () => {
    const fetchMock = mockApi();
    await renderPage();
    fireEvent.click(verifyButton());
    fireEvent.click(await screen.findByRole('button', { name: /confirm verification/i }));

    await waitFor(() => expect(nonGetCalls(fetchMock).length).toBeGreaterThan(0));
    const [url, init] = nonGetCalls(fetchMock)[0] as [string, RequestInit];
    expect(String(url)).toContain(`/admin/bookings/provider-kyc/${PENDING_SUBMISSION.user_id}`);
    expect((init.method ?? '').toUpperCase()).toBe('PATCH');
    expect(JSON.parse(String(init.body)).action).toBe('verify');
  });

  it('blocks verification when no bank account is on file', async () => {
    const fetchMock = mockApi({ queues: [[NO_BANK_SUBMISSION]] });
    await renderPage('Pandit Ramesh Shastri');

    fireEvent.click(verifyButton());
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(screen.getByRole('alert').textContent).toMatch(/bank/i);
    expect(nonGetCalls(fetchMock)).toHaveLength(0);
  });

  it('confirms only after the server reports verified and the row leaves the queue', async () => {
    mockApi({ queues: [[PENDING_SUBMISSION], []] });
    await renderPage();
    fireEvent.click(verifyButton());
    fireEvent.click(verifyConfirm());

    const banner = await screen.findByRole('status');
    expect(banner.textContent).toMatch(/Demo Pandit/);
    expect(banner.textContent).toMatch(/verified/i);
  });

  it('refuses to claim success when the server did not set verified', async () => {
    mockApi({
      decide: () => jsonResponse({ ok: true, userId: PENDING_SUBMISSION.user_id, verified: false }),
    });
    await renderPage();
    fireEvent.click(verifyButton());
    fireEvent.click(verifyConfirm());

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toBeTruthy();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('refuses to claim success when the row is still pending after the refetch', async () => {
    mockApi({ queues: [[PENDING_SUBMISSION], [PENDING_SUBMISSION]] });
    await renderPage();
    fireEvent.click(verifyButton());
    fireEvent.click(verifyConfirm());

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/still pending/i);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('surfaces the API 409 rather than telling the provider they are approved', async () => {
    mockApi({
      decide: () =>
        jsonResponse(
          {
            error:
              'Cannot verify: this provider has no bank account on file. Ask them to resubmit KYC with bank details.',
          },
          { ok: false, status: 409 },
        ),
    });
    await renderPage();
    fireEvent.click(verifyButton());
    fireEvent.click(verifyConfirm());

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/no bank account on file/i);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('a double click cannot fire the decision twice', async () => {
    const fetchMock = mockApi();
    await renderPage();
    fireEvent.click(verifyButton());
    const btn = verifyConfirm();
    fireEvent.click(btn);
    fireEvent.click(btn);

    await waitFor(() => expect(nonGetCalls(fetchMock).length).toBeGreaterThan(0));
    expect(nonGetCalls(fetchMock)).toHaveLength(1);
  });
});

// ─── reject ──────────────────────────────────────────────────────────────────

describe('AO-03 — rejecting a KYC submission', () => {
  it("PATCHes action 'reject' with the reason", async () => {
    const fetchMock = mockApi();
    await renderPage();
    await openRejectDialog('ID document is unreadable');
    fireEvent.click(rejectConfirm());

    await waitFor(() => expect(nonGetCalls(fetchMock).length).toBeGreaterThan(0));
    const init = nonGetCalls(fetchMock)[0][1] as RequestInit;
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(body.action).toBe('reject');
    expect(body.reason).toBe('ID document is unreadable');
  });

  it('will not send a rejection the API would 400 for having no reason', async () => {
    const fetchMock = mockApi();
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: /^reject$/i }));
    await screen.findByLabelText(/reason/i);
    fireEvent.click(rejectConfirm());

    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(nonGetCalls(fetchMock)).toHaveLength(0);
  });

  it('confirms only after the server reports the provider unverified with a reason', async () => {
    mockApi({ queues: [[PENDING_SUBMISSION], []] });
    await renderPage();
    await openRejectDialog();
    fireEvent.click(rejectConfirm());

    const banner = await screen.findByRole('status');
    expect(banner.textContent).toMatch(/Demo Pandit/);
    expect(banner.textContent).toMatch(/rejected/i);
  });

  it('refuses to claim a rejection when the server reports the provider verified', async () => {
    mockApi({
      decide: () => jsonResponse({ ok: true, userId: PENDING_SUBMISSION.user_id, verified: true }),
    });
    await renderPage();
    await openRejectDialog();
    fireEvent.click(rejectConfirm());

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toBeTruthy();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('a network failure surfaces as an error, not a hung dialog', async () => {
    mockApi({
      decide: () => {
        throw new TypeError('Failed to fetch');
      },
    });
    await renderPage();
    await openRejectDialog();
    fireEvent.click(rejectConfirm());

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toBeTruthy();
    expect((rejectConfirm() as HTMLButtonElement).disabled).toBe(false);
  });
});
