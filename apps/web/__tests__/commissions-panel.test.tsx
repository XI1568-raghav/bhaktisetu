/**
 * batch9-review (2026-08-11) — commission reader regressions.
 *
 * Every assertion here fails if the defect is reintroduced:
 *
 *  - listMyCommissions used to call the ADMIN route with `providerId=me`. That
 *    query is validated as `z.string().uuid()` (400) behind `requireRole
 *    ('admin')` (403), so /wellness-portal/earnings was permanently dead.
 *  - listCommissions sent no pagination, silently taking the route's default
 *    pageSize of 20 and discarding `total` — 20 of 500 rows shown as if complete.
 *  - CommissionsPanel compared against LOWERCASE status ids while the API sends
 *    the Prisma enum verbatim, so every filter chip matched zero rows and both
 *    summary cards read Rs 0.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({ session: { accessToken: 'test-token' } }),
}));

import { CommissionsPanel } from '../components/CommissionsPanel';
import {
  listCommissions,
  listMyCommissions,
  COMMISSION_PAGE_SIZE,
} from '../lib/commission-api';

function jsonResponse(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

const PENDING_ROW = {
  id: 'c1',
  bookingId: 'b1',
  providerId: 'p1',
  providerName: 'Pandit Sharma',
  providerRole: 'PANDIT',
  bookingNumber: 'BS-20260811-AAAAA',
  itemName: 'Satyanarayan Puja',
  amount: '4000.00',
  grossAmount: '5000.00',
  platformCut: '1000.00',
  ratePercent: 20,
  status: 'PENDING',
  payoutReference: null,
  processedAt: null,
  createdAt: '2026-08-01T00:00:00.000Z',
};

const PAID_ROW = {
  id: 'c2',
  bookingId: 'b2',
  providerId: 'p1',
  providerName: 'Pandit Sharma',
  providerRole: 'PANDIT',
  bookingNumber: 'BS-20260811-BBBBB',
  itemName: 'Griha Pravesh',
  amount: '880.00',
  grossAmount: '1100.00',
  platformCut: '220.00',
  ratePercent: 20,
  status: 'PAID',
  payoutReference: 'PYT-9001',
  processedAt: '2026-08-05T00:00:00.000Z',
  createdAt: '2026-08-02T00:00:00.000Z',
};

const REVERSED_ROW = {
  ...PAID_ROW,
  id: 'c3',
  bookingId: 'b3',
  bookingNumber: 'BS-20260811-CCCCC',
  itemName: 'Refunded puja',
  amount: '250.00',
  grossAmount: '312.50',
  platformCut: '62.50',
  status: 'REVERSED',
  payoutReference: null,
};

const ALL_ROWS = [PENDING_ROW, PAID_ROW, REVERSED_ROW];

function mockLedger(rows: unknown[] = ALL_ROWS, total = rows.length, page = 1) {
  const fetchMock = vi.fn(async () =>
    jsonResponse({ data: rows, page, pageSize: COMMISSION_PAGE_SIZE, total }),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ─── commission-api ──────────────────────────────────────────────────────────

describe('commission-api — provider self-serve endpoint', () => {
  it('listMyCommissions calls /payouts/commissions, never the admin route', async () => {
    const fetchMock = mockLedger();
    await listMyCommissions('tok');
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('/payouts/commissions');
    expect(url).not.toContain('/admin/commissions');
  });

  it('listMyCommissions never sends the providerId=me sentinel (400s as non-uuid)', async () => {
    const fetchMock = mockLedger();
    await listMyCommissions('tok');
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).not.toContain('providerId');
    expect(url).not.toContain('me');
  });

  it('sends the auth token so the route can resolve the caller', async () => {
    const fetchMock = mockLedger();
    await listMyCommissions('tok-123');
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok-123');
  });
});

describe('commission-api — pagination', () => {
  it('listCommissions requests the route maximum page size, not the default 20', async () => {
    const fetchMock = mockLedger();
    await listCommissions('tok');
    const url = new URL(String(fetchMock.mock.calls[0][0]), 'https://x.test');
    expect(url.searchParams.get('pageSize')).toBe('200');
    expect(url.searchParams.get('page')).toBe('1');
  });

  it('returns the server total instead of discarding it', async () => {
    mockLedger(ALL_ROWS, 500);
    const res = await listCommissions('tok');
    expect(res.total).toBe(500);
    expect(res.items).toHaveLength(3);
  });

  it('forwards an explicit page', async () => {
    const fetchMock = mockLedger();
    await listCommissions('tok', { page: 3 });
    const url = new URL(String(fetchMock.mock.calls[0][0]), 'https://x.test');
    expect(url.searchParams.get('page')).toBe('3');
  });

  it('never sends the dead `role` param the backend silently strips', async () => {
    const fetchMock = mockLedger();
    // `role` is not part of ListCommissionOptions any more; passing it must not
    // reach the wire even if a caller force-casts.
    await listCommissions('tok', { role: 'PANDIT' } as never);
    const url = new URL(String(fetchMock.mock.calls[0][0]), 'https://x.test');
    expect(url.searchParams.get('role')).toBeNull();
  });
});

describe('commission-api — error surfacing', () => {
  it('surfaces the API `error` field instead of the bare status code', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse({ error: 'Not a provider account' }, { ok: false, status: 403 }),
      ),
    );
    await expect(listMyCommissions('tok')).rejects.toThrow('Not a provider account');
  });
});

// ─── CommissionsPanel ────────────────────────────────────────────────────────

describe('CommissionsPanel — status filter matches the wire enum', () => {
  it('the Pending chip shows PENDING rows (used to show the empty state)', async () => {
    mockLedger();
    render(<CommissionsPanel mode="admin" />);
    await screen.findByText('Satyanarayan Puja');

    fireEvent.click(screen.getByRole('button', { name: 'Pending' }));

    expect(screen.getByText('Satyanarayan Puja')).toBeTruthy();
    expect(screen.queryByText('Griha Pravesh')).toBeNull();
    expect(screen.queryByText(/No commission/i)).toBeNull();
  });

  it('the Paid chip shows PAID rows only', async () => {
    mockLedger();
    render(<CommissionsPanel mode="admin" />);
    await screen.findByText('Griha Pravesh');

    fireEvent.click(screen.getByRole('button', { name: 'Paid' }));

    expect(screen.getByText('Griha Pravesh')).toBeTruthy();
    expect(screen.queryByText('Satyanarayan Puja')).toBeNull();
  });

  it('offers a Reversed chip and renders reversed rows under it', async () => {
    mockLedger();
    render(<CommissionsPanel mode="admin" />);
    await screen.findByText('Refunded puja');

    fireEvent.click(screen.getByRole('button', { name: 'Reversed' }));

    expect(screen.getByText('Refunded puja')).toBeTruthy();
    expect(screen.queryByText('Griha Pravesh')).toBeNull();
  });

  it('has no PayoutRequest-only chips a Commission can never hold', async () => {
    mockLedger();
    render(<CommissionsPanel mode="admin" />);
    await screen.findByText('Satyanarayan Puja');

    expect(screen.queryByRole('button', { name: 'Processing' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Failed' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'On hold' })).toBeNull();
  });
});

describe('CommissionsPanel — summary cards', () => {
  it('sums PAID into "Total earned" and PENDING into "Pending" (both read Rs 0 before)', async () => {
    mockLedger();
    const { container } = render(<CommissionsPanel mode="me" />);
    await screen.findByText('Satyanarayan Puja');

    const text = container.textContent ?? '';
    // 880 paid, 4,000 pending. The lowercase-compare bug produced ₹0 for both.
    expect(text).toContain('880');
    expect(text).toContain('4,000');
    expect(text).not.toMatch(/Total earned \(paid\)[\s\S]{0,80}₹0\b/);
  });

  it('does not concatenate stringified Decimals (800 + 1200 was "08001200")', async () => {
    mockLedger([
      { ...PAID_ROW, id: 'x1', itemName: 'Puja one', amount: '800.00' },
      { ...PAID_ROW, id: 'x2', itemName: 'Puja two', amount: '1200.00' },
    ]);
    const { container } = render(<CommissionsPanel mode="me" />);
    await screen.findByText('Puja two');

    const text = container.textContent ?? '';
    expect(text).toContain('2,000');
    expect(text).not.toContain('08001200');
  });
});

describe('CommissionsPanel — reconciliation columns', () => {
  it('renders Gross and Platform cut, and no ambiguous "Net" column', async () => {
    mockLedger();
    render(<CommissionsPanel mode="admin" />);
    await screen.findByText('Satyanarayan Puja');

    expect(screen.getByRole('columnheader', { name: 'Gross' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Platform cut' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Provider earning' })).toBeTruthy();
    // "Net" and "Provider earning" are the same number under the fixed ledger
    // convention; showing both is the confusion commission-math.ts ended.
    expect(screen.queryByRole('columnheader', { name: 'Net' })).toBeNull();
  });

  it('shows the derived gross and platform cut, not em-dashes', async () => {
    mockLedger([PENDING_ROW]);
    const { container } = render(<CommissionsPanel mode="admin" />);
    await screen.findByText('Satyanarayan Puja');

    const text = container.textContent ?? '';
    expect(text).toContain('5,000'); // gross
    expect(text).toContain('1,000'); // platform cut
    expect(text).toContain('4,000'); // provider earning
  });

  it('names the provider instead of printing a raw UUID', async () => {
    mockLedger([PENDING_ROW]);
    render(<CommissionsPanel mode="admin" />);
    await screen.findByText('Satyanarayan Puja');

    expect(screen.getByText('Pandit Sharma')).toBeTruthy();
    expect(screen.queryByText('p1')).toBeNull();
  });

  it('renders the payout reference from the linked PayoutRequest', async () => {
    mockLedger([PAID_ROW]);
    render(<CommissionsPanel mode="admin" />);
    await screen.findByText('Griha Pravesh');

    expect(screen.getByText('PYT-9001')).toBeTruthy();
  });
});

describe('CommissionsPanel — truncation is visible', () => {
  it('says how many of the total rows are on screen', async () => {
    mockLedger(ALL_ROWS, 500);
    const { container } = render(<CommissionsPanel mode="admin" />);
    await screen.findByText('Satyanarayan Puja');

    expect(container.textContent).toContain('of 500');
  });

  it('pages forward through the ledger', async () => {
    const fetchMock = mockLedger(ALL_ROWS, 500);
    render(<CommissionsPanel mode="admin" />);
    await screen.findByText('Satyanarayan Puja');

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    await waitFor(() => {
      const last = String(fetchMock.mock.calls[fetchMock.mock.calls.length - 1][0]);
      expect(new URL(last, 'https://x.test').searchParams.get('page')).toBe('2');
    });
  });

  it('hides the pager when a single page holds everything', async () => {
    mockLedger(ALL_ROWS, 3);
    render(<CommissionsPanel mode="admin" />);
    await screen.findByText('Satyanarayan Puja');

    expect(screen.queryByRole('button', { name: 'Next' })).toBeNull();
  });
});
