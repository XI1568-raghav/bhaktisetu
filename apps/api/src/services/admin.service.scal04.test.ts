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
