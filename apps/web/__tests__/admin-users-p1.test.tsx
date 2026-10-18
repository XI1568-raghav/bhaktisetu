/**
 * /admin/users — AO-05, AO-07, AO-08 (prod sweep 2026-08-12).
 *
 * AO-07  The table fetched ONE unparameterised page (`getUsers(token)` →
 *        API default limit 20) and then filtered, counted and paginated that
 *        array client-side. With 23 users in the database the footer read
 *        "Showing 1-10 of 20 users", three accounts were unreachable through
 *        both numbered pages, and the Pandit filter answered 2 against a real
 *        3. Every derived number inherited the truncation, so the screen was
 *        confidently wrong rather than obviously empty.
 *
 * AO-08  GET /admin/users now returns `blocked`/`blockedAt` (the AO-01 fix),
 *        but the page still read a `status` string the API has never sent, so
 *        mapStatus() fell through to 'active' for every row forever: the
 *        Blocked filter answered "0 users" while accounts were blocked, and
 *        the per-row Approve button — gated on status === 'pending' — could
 *        never render on any row.
 *
 * AO-05  Both the row link and the Eye button point at /admin/users/<id>,
 *        which had no route segment and returned HTTP 404. Covered for the
 *        destination side in admin-user-detail-p1.test.tsx; here we only lock
 *        the hrefs so they cannot drift back to the mock ?id= screen.
 *
 * The fixtures below mirror the live shape of GET /api/v1/admin/users:
 * { users: [{ id, fullName, email, phone, roles, subscriptionTier, blocked,
 *   blockedAt, blockedReason, createdAt }], total, page, limit }.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({ session: { accessToken: 'test-token' } }),
}));

vi.mock('../components/AuthGuard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import AdminUsersPage from '../app/admin/users/page';

// ─── fixtures ────────────────────────────────────────────────────────────────

const TOTAL_USERS = 23;

/** 23 users: 3 PANDIT, 1 blocked, 1 awaiting approval — the live census. */
const ALL_USERS = Array.from({ length: TOTAL_USERS }, (_, i) => {
  const n = i + 1;
  // Pandits deliberately placed so ONE of them (#22) falls outside the first
  // page of 20 — that is exactly the user the old single-fetch lost.
  const roles =
    n === 1 || n === 2 || n === 22 ? ['PANDIT'] : n === 3 ? ['ASTROLOGER'] : ['DEVOTEE'];
  return {
    id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
    fullName: `Test User ${n}`,
    email: `user${n}@darshya.online`,
    phone: `+9199999000${String(n).padStart(2, '0')}`,
    roles,
    subscriptionTier: 'free',
    blocked: n === 5,
    blockedAt: n === 5 ? '2026-08-11T10:00:00.000Z' : null,
    blockedReason: n === 5 ? 'payments fraud' : null,
    createdAt: '2026-08-11T19:19:10.000Z',
  };
});

const BLOCKED_USER = ALL_USERS[4]!; // Test User 5
const OFF_PAGE_PANDIT = ALL_USERS[21]!; // Test User 22 — index 21, beyond limit 20
const AWAITING_APPROVAL = ALL_USERS[2]!; // Test User 3 — ASTROLOGER, unapproved

/** GET /admin/pending-approvals */
const PENDING_APPROVALS = {
  approvals: [
    {
      id: 'ap-1',
      userId: AWAITING_APPROVAL.id,
      role: 'ASTROLOGER',
      profileName: AWAITING_APPROVAL.fullName,
      city: null,
      createdAt: '2026-08-11T19:19:10.000Z',
    },
  ],
  total: 1,
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

/**
 * Serves /admin/users exactly the way the API does: `limit` defaults to 20,
 * `total` is always the unfiltered count, and the returned slice is whatever
 * page was asked for. A client that fetches once gets 20 of 23 and is never
 * told it is missing anyone.
 */
function mockApi(opts: { approvals?: unknown; patch?: () => Response } = {}) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), 'http://localhost');
    const method = (init?.method ?? 'GET').toUpperCase();

    if (url.pathname.endsWith('/admin/pending-approvals')) {
      return jsonResponse(opts.approvals ?? PENDING_APPROVALS);
    }
    if (/\/admin\/users\/[^/]+$/.test(url.pathname) && method === 'PATCH') {
      return opts.patch ? opts.patch() : jsonResponse({ message: 'User updated' });
    }
    if (url.pathname.endsWith('/admin/users')) {
      const limit = Number(url.searchParams.get('limit') ?? '20');
      const page = Number(url.searchParams.get('page') ?? '1');
      const start = (page - 1) * limit;
      return jsonResponse({
        users: ALL_USERS.slice(start, start + limit),
        total: TOTAL_USERS,
        page,
        limit,
      });
    }
    throw new Error(`unexpected fetch: ${method} ${String(input)}`);
  });

  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

async function renderPage() {
  render(<AdminUsersPage />);
  await screen.findByText('Test User 1');
}

function footerText(): string {
  return screen.getByText(/Showing .* users/).textContent ?? '';
}

/**
 * The filter selects are identified by their current option text ("All Roles",
 * "All Status") rather than a label, because the row-level role selects are
 * combo boxes too and a role query would match a dozen of them.
 */
function setFilter(current: string, value: string) {
  fireEvent.change(screen.getByDisplayValue(current), { target: { value } });
}

beforeEach(() => {
  vi.unstubAllGlobals();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

// ─── AO-07: the list must be the whole list ──────────────────────────────────

describe('AO-07 — /admin/users shows every user, not the first API page', () => {
  it('reports the API total in the footer, not the length of one page', async () => {
    mockApi();
    await renderPage();
    await waitFor(() => expect(footerText()).toMatch(/of 23 users/));
  });

  it('reaches a user who lives past the first page of 20', async () => {
    mockApi();
    await renderPage();

    const search = screen.getByPlaceholderText(/search by name or email/i);
    fireEvent.change(search, { target: { value: OFF_PAGE_PANDIT.fullName } });

    await waitFor(() => expect(screen.getByText(OFF_PAGE_PANDIT.fullName)).toBeTruthy());
  });

  it('answers the Pandit filter with all 3 pandits, including the off-page one', async () => {
    mockApi();
    await renderPage();

    setFilter('All Roles', 'priest');

    await waitFor(() => expect(footerText()).toMatch(/of 3 users/));
    expect(screen.getByText(OFF_PAGE_PANDIT.fullName)).toBeTruthy();
  });

  it('asks the API for more than one default page', async () => {
    const fetchMock = mockApi();
    await renderPage();

    await waitFor(() => {
      const userCalls = fetchMock.mock.calls
        .map((c) => String(c[0]))
        .filter((u) => u.includes('/admin/users') && !u.includes('/admin/users/'));
      expect(userCalls.length).toBeGreaterThan(0);
      // Either an explicit high limit or real pagination — never the bare
      // unparameterised call that silently capped the table at 20.
      const asked = userCalls.some((u) => {
        const q = new URL(u, 'http://localhost').searchParams;
        return Number(q.get('limit') ?? '20') > 20 || q.get('page') === '2';
      });
      expect(asked).toBe(true);
    });
  });
});

// ─── AO-08: status has to come from the server ───────────────────────────────

describe('AO-08 — status reflects real moderation state', () => {
  it('renders a blocked user as blocked', async () => {
    mockApi();
    await renderPage();

    const row = screen.getByText(BLOCKED_USER.fullName).closest('tr');
    expect(row).toBeTruthy();
    expect(within(row as HTMLElement).getByText(/^blocked$/i)).toBeTruthy();
  });

  it('the Blocked filter finds the blocked user instead of answering 0', async () => {
    mockApi();
    await renderPage();

    setFilter('All Status', 'blocked');

    await waitFor(() => expect(footerText()).toMatch(/of 1 users/));
    expect(screen.getByText(BLOCKED_USER.fullName)).toBeTruthy();
  });

  it('the Active filter excludes the blocked user and the one awaiting approval', async () => {
    mockApi();
    await renderPage();

    setFilter('All Status', 'active');

    // 23 total - 1 blocked - 1 awaiting approval.
    await waitFor(() => expect(footerText()).toMatch(/of 21 users/));
    expect(screen.queryByText(BLOCKED_USER.fullName)).toBeNull();
  });

  it('offers Approve on a user who is actually awaiting approval', async () => {
    mockApi();
    await renderPage();

    const search = screen.getByPlaceholderText(/search by name or email/i);
    fireEvent.change(search, { target: { value: AWAITING_APPROVAL.fullName } });

    const row = await waitFor(() => {
      const el = screen.getByText(AWAITING_APPROVAL.fullName).closest('tr');
      expect(el).toBeTruthy();
      return el as HTMLElement;
    });
    expect(within(row).getByTitle('Approve')).toBeTruthy();
  });

  it('does not offer Approve on a user with nothing pending', async () => {
    mockApi();
    await renderPage();

    const row = screen.getByText('Test User 1').closest('tr') as HTMLElement;
    expect(within(row).queryByTitle('Approve')).toBeNull();
  });
});

// ─── moderation must be proven, never assumed ────────────────────────────────

describe('AO-08 — a moderation action is confirmed from the server, not from a 200', () => {
  it('reports failure when PATCH answers 200 and the account is still active', async () => {
    // Exactly the AO-01 defect: the endpoint replied "User updated" and wrote
    // nothing, while this table flipped the badge from its own optimistic state.
    mockApi();
    await renderPage();

    const row = screen.getByText('Test User 1').closest('tr') as HTMLElement;
    fireEvent.click(within(row).getByTitle('Block'));
    fireEvent.click(screen.getByRole('button', { name: /block account/i }));

    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(screen.getByRole('alert').textContent).toMatch(/still reads as active/i);
    // And the badge must not have been flipped on the strength of the 200.
    const after = screen.getByText('Test User 1').closest('tr') as HTMLElement;
    expect(within(after).getByText(/^active$/i)).toBeTruthy();
  });

  it('does not call an approval confirmed when the approval queue cannot be re-read', async () => {
    let approvalCalls = 0;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input), 'http://localhost');
      const method = (init?.method ?? 'GET').toUpperCase();
      if (url.pathname.endsWith('/admin/pending-approvals')) {
        approvalCalls += 1;
        // First load succeeds so Approve is offered; the verification re-read fails.
        if (approvalCalls > 1) {
          return jsonResponse({ error: 'approvals down' }, { ok: false, status: 500 });
        }
        return jsonResponse(PENDING_APPROVALS);
      }
      if (/\/admin\/users\/[^/]+$/.test(url.pathname) && method === 'PATCH') {
        return jsonResponse({ message: 'User updated' });
      }
      if (url.pathname.endsWith('/admin/users')) {
        const limit = Number(url.searchParams.get('limit') ?? '20');
        const page = Number(url.searchParams.get('page') ?? '1');
        const start = (page - 1) * limit;
        return jsonResponse({
          users: ALL_USERS.slice(start, start + limit),
          total: TOTAL_USERS,
          page,
          limit,
        });
      }
      throw new Error(`unexpected fetch: ${method} ${String(input)}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    await renderPage();
    const row = screen.getByText(AWAITING_APPROVAL.fullName).closest('tr') as HTMLElement;
    fireEvent.click(within(row).getByTitle('Approve'));

    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(screen.getByRole('alert').textContent).toMatch(/unconfirmed/i);
  });
});

// ─── AO-05: the row must lead somewhere that exists ──────────────────────────

describe('AO-05 — user rows link to the real detail route', () => {
  it('points the name and the Eye button at /admin/users/<id>', async () => {
    mockApi();
    await renderPage();

    const row = screen.getByText('Test User 1').closest('tr') as HTMLElement;
    const links = within(row).getAllByRole('link');
    expect(links.length).toBeGreaterThanOrEqual(2);
    for (const link of links) {
      expect(link.getAttribute('href')).toBe(`/admin/users/${ALL_USERS[0]!.id}`);
    }
  });
});
