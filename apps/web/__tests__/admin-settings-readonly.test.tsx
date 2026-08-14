/**
 * /admin/settings — AO-10 (prod sweep 2026-08-12).
 *
 * "Save Changes" was `await new Promise(r => setTimeout(r, 700))`. It rendered
 * "Saved!", issued ZERO non-GET requests, and the value reverted on reload. A
 * founder discounting a category to win supply would believe the discount was
 * live while the ledger kept charging the old rate.
 *
 * The displayed rates were fabricated too: six hardcoded categories
 * ["25","15","30","20","10","20"] including "Astrology Consultations 30%" while
 * the live commission row for Acharya Vinod Sharma was gross Rs 500 / platform
 * cut Rs 100 — 20%. The Admins tab was three invented people whose Add/Remove
 * controls only pushed to local state, and the subscription plans were a
 * hardcoded price list with dead Active/Inactive switches.
 *
 * There is no GET/PUT /admin/settings/commissions endpoint of any kind, so the
 * screen becomes what it can honestly be: the rates the ledger has ACTUALLY
 * applied, the plans the API actually serves, and the accounts that actually
 * hold the admin role — with no control that pretends to write.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({ session: { accessToken: 'test-token' } }),
}));

vi.mock('../components/AuthGuard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import AdminSettingsPage from '../app/admin/settings/page';

// ─── fixtures ────────────────────────────────────────────────────────────────

/** GET /admin/commissions — every live row is a 20% platform take. */
const COMMISSION_PAGE = {
  data: [
    {
      id: 'c-1',
      providerId: 'p-1',
      providerName: 'Acharya Vinod Sharma',
      providerRole: 'ASTROLOGER',
      bookingNumber: 'BS-20260812-0266C',
      itemName: 'Kundli consultation',
      amount: '400',
      percentage: '0.2',
      grossAmount: '500',
      platformCut: '100',
      ratePercent: 20,
      status: 'PENDING',
      createdAt: '2026-08-12T08:00:00.000Z',
    },
    {
      id: 'c-2',
      providerId: 'p-2',
      providerName: 'Demo Wellness',
      providerRole: 'WELLNESS_INSTRUCTOR',
      bookingNumber: null,
      itemName: 'Morning Hatha Yoga',
      amount: '2800',
      percentage: '0.2',
      grossAmount: '3500',
      platformCut: '700',
      ratePercent: 20,
      status: 'PENDING',
      createdAt: '2026-08-12T09:00:00.000Z',
    },
  ],
  page: 1,
  pageSize: 200,
  total: 2,
};

/** GET /subscriptions/plans — the API sends `price`, not `priceMonthly`. */
const PLANS = {
  plans: [
    {
      id: 'pandit-pro',
      name: 'Pandit Pro',
      roles: ['PANDIT'],
      price: 499,
      currency: 'INR',
      features: ['Priority dispatch', 'Verified badge'],
    },
  ],
};

/** GET /admin/users — one real admin among the directory. */
const USERS = {
  users: [
    {
      id: 'u-admin',
      fullName: 'Platform Admin',
      email: 'admin@demo.com',
      phone: '+919000000001',
      roles: ['ADMIN'],
      blocked: false,
      blockedAt: null,
      blockedReason: null,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'u-devotee',
      fullName: 'Test Devotee',
      email: 'devotee@demo.com',
      phone: '+919000000002',
      roles: ['DEVOTEE'],
      blocked: false,
      blockedAt: null,
      blockedReason: null,
      createdAt: '2026-01-02T00:00:00.000Z',
    },
  ],
  total: 2,
  page: 1,
  limit: 200,
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

function mockApi(opts: { commissions?: unknown; plans?: unknown; users?: unknown } = {}) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method ?? 'GET').toUpperCase();
    if (url.includes('/admin/commissions')) return jsonResponse(opts.commissions ?? COMMISSION_PAGE);
    if (url.includes('/subscriptions/plans')) return jsonResponse(opts.plans ?? PLANS);
    if (url.includes('/admin/users')) return jsonResponse(opts.users ?? USERS);
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

async function renderSettings() {
  render(<AdminSettingsPage />);
  await screen.findByRole('heading', { name: /^settings$/i });
}

function openTab(name: RegExp) {
  fireEvent.click(screen.getByRole('button', { name }));
}

beforeEach(() => {
  vi.unstubAllGlobals();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

// ─── no control that cannot write ────────────────────────────────────────────

describe('AO-10 — nothing on /admin/settings pretends to save', () => {
  it('ships no Save Changes button', async () => {
    mockApi();
    await renderSettings();
    expect(screen.queryByRole('button', { name: /save changes|^saved/i })).toBeNull();
  });

  it('never confirms a save, because there is nothing to save to', async () => {
    const fetchMock = mockApi();
    await renderSettings();

    // Click everything the screen offers. The old page answered a click on
    // "Save Changes" with a 700 ms timer and then the word "Saved!" — a success
    // message over zero requests. The wait has to outlast that timer, or the
    // button is still reading "Saving..." when the assertion runs and the test
    // passes against the very defect it exists to catch.
    for (const button of screen.queryAllByRole('button')) {
      fireEvent.click(button);
    }
    await new Promise((r) => setTimeout(r, 900));

    expect(nonGetCalls(fetchMock)).toHaveLength(0);
    expect(screen.queryByText(/saved/i)).toBeNull();
    expect(screen.queryByText(/saving/i)).toBeNull();
  });

  it('leaves no editable commission-rate input behind', async () => {
    mockApi();
    await renderSettings();
    expect(screen.queryByRole('slider')).toBeNull();
    expect(screen.queryByRole('spinbutton')).toBeNull();
  });
});

// ─── the rates shown are the rates charged ───────────────────────────────────

describe('AO-10 — commission rates come from the ledger, not a fixture', () => {
  it('reports the take rate the ledger actually applied', async () => {
    mockApi();
    await renderSettings();

    await waitFor(() => expect(screen.getAllByText(/20%/).length).toBeGreaterThan(0));
  });

  it('drops the invented category rates', async () => {
    mockApi();
    await renderSettings();

    // "Astrology Consultations 30%" against a live 20% row was the sweep's
    // own example of this screen contradicting the ledger.
    expect(screen.queryByText(/astrology consultations/i)).toBeNull();
    expect(screen.queryByText('30')).toBeNull();
  });

  it('shows every rate the ledger holds, not one headline number', async () => {
    // The live ledger on this machine is NOT uniform: 10 rows at 33.10%, 5 at
    // 20%, 1 at 23.54% — because Priest.commissionRate still carries the
    // pre-revamp 0.70 schema default while DEFAULT_PRIEST_SHARE says 0.8. A
    // screen announcing a flat "20% platform take" would be wrong for most of
    // the money that has actually moved.
    mockApi({
      commissions: {
        data: [
          { ...COMMISSION_PAGE.data[0], id: 'c-a', ratePercent: 33.1, platformCut: '380.97', amount: '770' },
          { ...COMMISSION_PAGE.data[1], id: 'c-b', ratePercent: 20 },
        ],
        page: 1,
        pageSize: 200,
        total: 2,
      },
    });
    await renderSettings();

    await waitFor(() => expect(screen.getByText('33.1%')).toBeTruthy());
    expect(screen.getByText('20%')).toBeTruthy();
  });

  it('says so honestly when no commission has been charged yet', async () => {
    mockApi({ commissions: { data: [], page: 1, pageSize: 200, total: 0 } });
    await renderSettings();

    await waitFor(() =>
      expect(screen.getByText(/no commission has been charged yet/i)).toBeTruthy(),
    );
  });
});

// ─── plans and admins are real rows ──────────────────────────────────────────

describe('AO-10 — subscription plans and admins are fetched, not hardcoded', () => {
  it('lists the plans the API serves', async () => {
    mockApi();
    await renderSettings();
    openTab(/subscriptions/i);

    await waitFor(() => expect(screen.getByText('Pandit Pro')).toBeTruthy());
    // The old hardcoded price list.
    expect(screen.queryByText('Temple Trust')).toBeNull();
    expect(screen.queryByText('Bhakti Pass Annual')).toBeNull();
  });

  it('lists the accounts that really hold the admin role', async () => {
    mockApi();
    await renderSettings();
    openTab(/admins/i);

    await waitFor(() => expect(screen.getByText('Platform Admin')).toBeTruthy());
    expect(screen.queryByText('Rahul Verma')).toBeNull();
    expect(screen.queryByText('Meena Kapoor')).toBeNull();
    // A devotee is not an admin.
    expect(screen.queryByText('Test Devotee')).toBeNull();
  });

  it('offers no Add Admin control — POST /admin/users is a fabricated-success stub', async () => {
    mockApi();
    await renderSettings();
    openTab(/admins/i);

    await waitFor(() => expect(screen.getByText('Platform Admin')).toBeTruthy());
    expect(screen.queryByRole('button', { name: /add admin/i })).toBeNull();
  });

  it('drops the Platform tab whose four toggles persisted nothing', async () => {
    mockApi();
    await renderSettings();

    expect(screen.queryByRole('button', { name: /^platform$/i })).toBeNull();
    expect(screen.queryByText(/auto-approve devotees/i)).toBeNull();
    expect(screen.queryByText(/maintenance mode/i)).toBeNull();
  });
});
