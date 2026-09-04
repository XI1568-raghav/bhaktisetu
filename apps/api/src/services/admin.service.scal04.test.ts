import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import { AdminService } from './admin.service.js';

/**
 * SCAL-04 — /admin's role tally must be counted by Postgres.
 *
 * `getDashboard` called `prisma.userRoleAssignment.findMany()` with NO where
 * clause — the entire table — purely to tally roles in a JS for-loop. EXPLAIN
 * (ANALYZE, SERIALIZE) measured the equivalent unbounded read at 33,360 kB
 * against a 200k-row shadow table: the single largest transfer in the API, on
 * the page an admin opens first, inside a 512 MB Render container.
 */

let service: AdminService;

/** Everything getDashboard awaits apart from the role tally under test. */
function wireDashboardBackground() {
  prismaMock.user.count.mockResolvedValue(100);
  prismaMock.marketplaceSubscription.count.mockResolvedValue(8);
  prismaMock.transaction.findMany.mockResolvedValue([]);
  prismaMock.transaction.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
  prismaMock.payment.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
  prismaMock.panditProfile.count.mockResolvedValue(0);
  prismaMock.storeProfile.count.mockResolvedValue(0);
  prismaMock.astrologerProfile.count.mockResolvedValue(0);
  prismaMock.wellnessProfile.count.mockResolvedValue(0);
  prismaMock.gaushalaProfile.count.mockResolvedValue(0);
  prismaMock.templeProfile.count.mockResolvedValue(0);
}

beforeEach(() => {
  vi.clearAllMocks();
  service = new AdminService();
});

describe('SCAL-04 — admin dashboard role tally', () => {
  it('groups roles in SQL instead of reading every assignment row', async () => {
    wireDashboardBackground();
    prismaMock.userRoleAssignment.groupBy.mockResolvedValue([
      { role: 'DEVOTEE', _count: { _all: 2 } },
      { role: 'PANDIT', _count: { _all: 1 } },
    ]);
    // Any unbounded read here is the defect itself.
    prismaMock.userRoleAssignment.findMany.mockImplementation(async () => {
      throw new Error('getDashboard must not read the whole role table — SCAL-04');
    });

    const out = await service.getDashboard();

    expect(prismaMock.userRoleAssignment.findMany).not.toHaveBeenCalled();
    expect(prismaMock.userRoleAssignment.groupBy).toHaveBeenCalledWith({
      by: ['role'],
      _count: { _all: true },
    });
    expect(out.usersByRole).toEqual({ DEVOTEE: 2, PANDIT: 1 });
  });

  it('reports an empty tally rather than inventing roles when nobody has one', async () => {
    wireDashboardBackground();
    prismaMock.userRoleAssignment.groupBy.mockResolvedValue([]);

    const out = await service.getDashboard();

    expect(out.usersByRole).toEqual({});
  });
});

/**
 * SCAL-04 — the role hydration on the admin user list.
 *
 * `getUsers` pages the user table properly (clampLimit caps it at 100), then
 * hydrates each row's roles with a second read keyed `userId: { in: page }`.
 * That read is bounded by the page and so is not a ratchet entry — but it asked
 * for whole `UserRoleAssignment` rows to build a map out of exactly two of
 * their columns. A user can hold every one of the eight roles, so the discarded
 * remainder is up to 800 rows of id + isPrimary + createdAt per page view, on
 * the first screen an operator opens. Bounded is not the same as free.
 */
describe('SCAL-04 — getUsers role hydration', () => {
  const PAGE_USER = {
    id: 'u1',
    fullName: 'Asha',
    email: 'asha@example.com',
    phone: null,
    subscriptionTier: 'free',
    blocked: false,
    blockedAt: null,
    blockedReason: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  it('asks for only the two columns the role map reads', async () => {
    prismaMock.user.findMany.mockResolvedValue([PAGE_USER] as never);
    prismaMock.user.count.mockResolvedValue(1);
    prismaMock.userRoleAssignment.findMany.mockResolvedValue([
      { userId: 'u1', role: 'PANDIT' },
      { userId: 'u1', role: 'DEVOTEE' },
    ] as never);

    const out = await service.getUsers({ page: 1, limit: 20 });

    // The answer is unchanged — a narrower query is not a narrower result.
    expect(out.total).toBe(1);
    expect(out.users[0]!.roles).toEqual(['PANDIT', 'DEVOTEE']);

    const call = prismaMock.userRoleAssignment.findMany.mock.calls[0]![0] as {
      select?: Record<string, unknown>;
    };
    expect(
      call.select,
      'the hydration fetches every column of every assignment row on the page',
    ).toBeDefined();
    expect(Object.keys(call.select!).sort()).toEqual(['role', 'userId']);
  });
});
