/**
 * /admin/users/<id> — AO-05 + AO-06 (prod sweep 2026-08-12).
 *
 * AO-05  Every row link and every Eye button on /admin/users pointed at
 *        /admin/users/<uuid>, and no such route segment existed: 24 dead links
 *        on the first page of the table alone. The user list is the entry point
 *        for every support and moderation task and it led to a 404.
 *
 * AO-06  The one detail screen that did exist (/admin/users/view?id=) looked
 *        the id up in a hardcoded `usersDb` map of nine invented people —
 *        "Arjun Sharma", "Pandit Ramesh Sharma" — and answered "User not found.
 *        This may be a demo limitation." for every real uuid. It made no API
 *        call at all, and its Approve / Block / Reset-password / Delete buttons
 *        had no handlers. The devotee card rendered a fabricated "12 bookings /
 *        Rs. 24,500 / Bhakti Pass" for whoever it was shown for.
 *
 * The fixture is the live shape of GET /api/v1/admin/users/:id →
 * { user: { ...User columns, roles: string[], profiles: {pandit,…,temple} } }.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const USER_ID = '47542478-977f-4d9d-bab0-4b1212e400c8';

vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({ session: { accessToken: 'test-token' } }),
}));

vi.mock('../components/AuthGuard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: USER_ID }),
  useSearchParams: () => new URLSearchParams(`id=${USER_ID}`),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

import AdminUserDetailPage from '../app/admin/users/[id]/page';

// ─── fixtures ────────────────────────────────────────────────────────────────

const REAL_USER = {
  id: USER_ID,
  phone: '+919812345678',
  email: 'gaushala.hinganghat@darshya.online',
  fullName: 'Hinganghat Goseva Samiti',
  avatarUrl: null,
  preferredLanguage: 'hi',
  locationCity: 'Hinganghat',
  locationState: 'Maharashtra',
  isNri: false,
  subscriptionTier: 'free',
  blocked: false,
  blockedReason: null,
  blockedAt: null,
  createdAt: '2026-08-11T19:19:10.000Z',
  updatedAt: '2026-08-11T19:19:10.000Z',
  roles: ['GAUSHALA_MANAGER'],
  profiles: {
    pandit: null,
    store: null,
    astrologer: null,
    wellness: null,
    gaushala: {
      id: 'g-1',
      userId: USER_ID,
      gaushalaName: 'Hinganghat Goseva Samiti',
      city: 'Hinganghat',
      totalCows: 140,
      verified: false,
      approved: false,
      createdAt: '2026-08-11T19:19:10.000Z',
    },
    temple: null,
  },
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
  /** Successive GET /admin/users/:id payloads (last entry repeats). */
  gets?: Array<{ body: unknown; ok?: boolean; status?: number }>;
  patch?: (body: Record<string, unknown>) => Response;
}

function mockApi(opts: MockOpts = {}) {
  const gets = opts.gets ?? [{ body: { user: REAL_USER } }];
  let getCall = 0;

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method ?? 'GET').toUpperCase();

    if (url.includes(`/admin/users/${USER_ID}`)) {
      if (method === 'PATCH') {
        const body = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;
        return opts.patch ? opts.patch(body) : jsonResponse({ message: 'User updated' });
      }
      const entry = gets[Math.min(getCall, gets.length - 1)]!;
      getCall += 1;
      return jsonResponse(entry.body, { ok: entry.ok, status: entry.status });
    }
    throw new Error(`unexpected fetch: ${method} ${url}`);
  });

  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

/**
 * The account name legitimately appears twice — as the page heading and as the
 * gaushala's own name inside its profile card — so the heading is the anchor.
 */
async function renderDetail() {
  render(<AdminUserDetailPage />);
  return screen.findByRole('heading', { name: REAL_USER.fullName });
}

beforeEach(() => {
  vi.unstubAllGlobals();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

// ─── AO-05/AO-06: the route exists and shows the real account ────────────────

describe('AO-06 — the user detail page renders the real user', () => {
  it('fetches GET /admin/users/:id with the admin bearer', async () => {
    const fetchMock = mockApi();
    await renderDetail();

    const call = fetchMock.mock.calls.find((c) => String(c[0]).includes(`/admin/users/${USER_ID}`));
    expect(call).toBeTruthy();
    const headers = ((call?.[1] as RequestInit | undefined)?.headers ?? {}) as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer test-token');
  });

  it('shows the real name, email and phone', async () => {
    mockApi();
    await renderDetail();

    expect(screen.getByText(REAL_USER.email)).toBeTruthy();
    expect(screen.getByText(REAL_USER.phone)).toBeTruthy();
  });

  it('renders the provider profile the API actually returned', async () => {
    mockApi();
    await renderDetail();

    expect(screen.getByText('140')).toBeTruthy(); // totalCows
  });

  it('never renders the old hardcoded demo identities', async () => {
    mockApi();
    await renderDetail();

    for (const ghost of ['Arjun Sharma', 'Pandit Ramesh Sharma', 'Vikram Patel', 'Ananya Devi']) {
      expect(screen.queryByText(ghost)).toBeNull();
    }
    // The invented devotee card: 12 bookings / Rs. 24,500 / Bhakti Pass.
    expect(screen.queryByText(/24,500/)).toBeNull();
  });

  it('says the account is missing instead of showing someone else on a 404', async () => {
    mockApi({ gets: [{ body: { error: 'User not found' }, ok: false, status: 404 }] });
    render(<AdminUserDetailPage />);

    await waitFor(() => expect(screen.getByText(/no account with id/i)).toBeTruthy());
    expect(screen.queryByText(/demo limitation/i)).toBeNull();
    expect(screen.queryByText(REAL_USER.fullName)).toBeNull();
  });

  it('surfaces a load failure instead of rendering an empty profile as fact', async () => {
    mockApi({ gets: [{ body: { error: 'Failed to load user' }, ok: false, status: 500 }] });
    render(<AdminUserDetailPage />);

    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(screen.queryByText(REAL_USER.fullName)).toBeNull();
  });
});

// ─── moderation must be real, and proven ─────────────────────────────────────

describe('AO-06 — the detail page actions hit the API and verify the write', () => {
  it('blocks through PATCH /admin/users/:id and confirms from a refetch', async () => {
    const fetchMock = mockApi({
      gets: [
        { body: { user: REAL_USER } },
        { body: { user: { ...REAL_USER, blocked: true, blockedAt: '2026-08-13T00:00:00.000Z' } } },
      ],
    });
    await renderDetail();

    fireEvent.click(screen.getByRole('button', { name: /^block$/i }));

    await waitFor(() => expect(screen.getByRole('status')).toBeTruthy());
    const patch = fetchMock.mock.calls.find(
      (c) => ((c[1] as RequestInit | undefined)?.method ?? 'GET').toUpperCase() === 'PATCH',
    );
    expect(patch).toBeTruthy();
    expect(JSON.parse(String((patch?.[1] as RequestInit).body))).toMatchObject({ blocked: true });
  });

  it('reports failure when the server says 200 but the account is still unblocked', async () => {
    // The AO-01 defect exactly: PATCH answered "User updated" and wrote nothing.
    mockApi({
      gets: [{ body: { user: REAL_USER } }, { body: { user: REAL_USER } }],
    });
    await renderDetail();

    fireEvent.click(screen.getByRole('button', { name: /^block$/i }));

    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('offers Approve for an unapproved provider and sends approved:true', async () => {
    const approved = {
      ...REAL_USER,
      profiles: { ...REAL_USER.profiles, gaushala: { ...REAL_USER.profiles.gaushala, approved: true } },
    };
    const fetchMock = mockApi({ gets: [{ body: { user: REAL_USER } }, { body: { user: approved } }] });
    await renderDetail();

    fireEvent.click(screen.getByRole('button', { name: /approve/i }));

    await waitFor(() => expect(screen.getByRole('status')).toBeTruthy());
    const patch = fetchMock.mock.calls.find(
      (c) => ((c[1] as RequestInit | undefined)?.method ?? 'GET').toUpperCase() === 'PATCH',
    );
    expect(JSON.parse(String((patch?.[1] as RequestInit).body))).toMatchObject({ approved: true });
  });

  it('ships no control that has no endpoint behind it', async () => {
    mockApi();
    await renderDetail();

    // POST /admin/users and DELETE /admin/users/:id are stubs that answer
    // "User created" / "User deleted" without touching the database (AO-16),
    // and there is no admin password-reset endpoint at all.
    expect(screen.queryByRole('button', { name: /reset password/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /delete/i })).toBeNull();
  });
});

// ─── the mock screen must be gone ────────────────────────────────────────────

describe('AO-06 — the legacy ?id= screen no longer serves fixture people', () => {
  it('does not render a hardcoded profile for a demo id', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ user: REAL_USER })),
    );
    const { default: LegacyViewPage } = await import('../app/admin/users/view/page');
    render(<LegacyViewPage />);

    await waitFor(() => {
      expect(screen.queryByText('Pandit Ramesh Sharma')).toBeNull();
      expect(screen.queryByText(/demo limitation/i)).toBeNull();
    });
  });
});
