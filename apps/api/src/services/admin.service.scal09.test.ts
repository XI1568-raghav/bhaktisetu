/**
 * SCAL-09 — the admin user list filtered by role in JavaScript AFTER paging.
 *
 * Measured before this test existed (apps/api/src/services/admin.service.ts):
 *   - the page was fetched with `skip/take` and NO role predicate,
 *   - role assignments were then loaded for those 20 rows,
 *   - `filters.role` was applied with a JS `.filter()` on that page only,
 *   - and `total` came from `prisma.user.count({ where })` — the UNFILTERED
 *     count.
 * So "show me all admins" returned however many of page 1's 20 users happened
 * to be admins, next to a total that counted everyone. An operator reading
 * that concludes there are no pandits when there are thousands.
 *
 * `filters.limit` was also passed straight through from the route with no
 * ceiling (routes/admin.ts: `limit: parsed.data.limit ? Number(...) : undefined`),
 * so `?limit=100000` asked Postgres for 100k rows.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import { AdminService } from './admin.service.js';

let service: AdminService;

beforeEach(() => {
  vi.clearAllMocks();
  service = new AdminService();
  prismaMock.user.findMany.mockResolvedValue([]);
  prismaMock.user.count.mockResolvedValue(0);
  prismaMock.userRoleAssignment.findMany.mockResolvedValue([]);
});

describe('SCAL-09: role filter constrains the query, not the fetched page', () => {
  it('resolves the role to its holders and constrains the users query on id', async () => {
    prismaMock.userRoleAssignment.findMany.mockResolvedValue([
      { userId: 'u-1' },
      { userId: 'u-7' },
    ]);

    await service.getUsers({ role: 'PANDIT' });

    // First query: who holds PANDIT. (`roleAssignments: { some: … }` is not
    // available — UserRoleAssignment has no Prisma relation to User, verified
    // live as `Unknown argument 'roleAssignments'` → HTTP 500.)
    const roleQuery = prismaMock.userRoleAssignment.findMany.mock.calls[0]![0]!;
    expect(roleQuery.where).toEqual({ role: 'PANDIT' });

    const args = prismaMock.user.findMany.mock.calls[0]![0]!;
    expect(args.where.id).toEqual({ in: ['u-1', 'u-7'] });
  });

  it('counts with the SAME predicate, so total matches the filtered list', async () => {
    prismaMock.userRoleAssignment.findMany.mockResolvedValue([{ userId: 'u-9' }]);

    await service.getUsers({ role: 'ADMIN' });

    const listWhere = prismaMock.user.findMany.mock.calls[0]![0]!.where;
    const countWhere = prismaMock.user.count.mock.calls[0]![0]!.where;
    expect(countWhere).toEqual(listWhere);
    expect(countWhere.id).toEqual({ in: ['u-9'] });
  });

  it('an unrecognised role is an honest empty answer, not a 500', async () => {
    const out = await service.getUsers({ role: 'NOT_A_ROLE' });

    expect(out.users).toEqual([]);
    expect(out.total).toBe(0);
    // Prisma is never asked to match an invalid enum value.
    expect(prismaMock.user.findMany).not.toHaveBeenCalled();
  });

  it('returns every row the query returned — no post-pagination JS drop', async () => {
    // Both rows came back from a query that was already constrained to PANDIT
    // holders. Dropping either one here is the SCAL-09 defect: it would hide
    // real pandits because their role rows load in a second query.
    prismaMock.userRoleAssignment.findMany.mockResolvedValue([
      { userId: 'u-1' },
      { userId: 'u-2' },
    ]);
    prismaMock.user.findMany.mockResolvedValue([
      { id: 'u-1', fullName: 'A', email: 'a@e', phone: '1', subscriptionTier: null, createdAt: new Date() },
      { id: 'u-2', fullName: 'B', email: 'b@e', phone: '2', subscriptionTier: null, createdAt: new Date() },
    ]);
    prismaMock.user.count.mockResolvedValue(2);
    prismaMock.userRoleAssignment.findMany.mockResolvedValue([
      { userId: 'u-1', role: 'PANDIT' },
      { userId: 'u-2', role: 'PANDIT' },
    ]);

    const out = await service.getUsers({ role: 'PANDIT' });

    expect(out.users).toHaveLength(2);
    expect(out.total).toBe(2);
  });

  it('caps limit at 100 the way the public list routes do', async () => {
    await service.getUsers({ limit: 100_000 });

    const args = prismaMock.user.findMany.mock.calls[0]![0]!;
    expect(args.take).toBe(100);
  });

  it('never asks Postgres for a negative offset', async () => {
    await service.getUsers({ page: -3, limit: 20 });

    const args = prismaMock.user.findMany.mock.calls[0]![0]!;
    expect(args.skip).toBe(0);
  });

  it('leaves the query unfiltered when no role is requested', async () => {
    await service.getUsers({});

    const args = prismaMock.user.findMany.mock.calls[0]![0]!;
    expect(args.where.id).toBeUndefined();
    expect(prismaMock.userRoleAssignment.findMany.mock.calls[0]![0]!.where).toEqual({
      userId: { in: [] },
    });
  });
});
