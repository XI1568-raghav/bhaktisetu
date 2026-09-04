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
  // REWRITTEN 2026-08-28 (SCAL-04), deliberately, and NOT weakened.
  //
  // These two tests used to assert the MECHANISM SCAL-09 happened to ship with:
  // resolve the role to every holder id, then constrain `user.findMany` with
  // `where.id = { in: [...] }`. That mechanism is gone — it was the one read in
  // this service that scaled with the whole user base — and `getUsers` now uses
  // the relation predicate it was imitating. The INVARIANT is unchanged and is
  // still what is asserted: the role constrains the QUERY (so the page and the
  // total are computed from the same set), never a JS `.filter()` over a page
  // that was already fetched. Only the expected shape of the predicate moved.
  it('constrains the users query with the role predicate, not a JS filter', async () => {
    await service.getUsers({ role: 'PANDIT' });

    const args = prismaMock.user.findMany.mock.calls[0]![0]!;
    expect(args.where.roleAssignments).toEqual({ some: { role: 'PANDIT' } });

    // The holder scan this endpoint used to open with must not come back. Only
    // the page-bounded roles hydration (`userId: { in: page }`) may read that
    // table now.
    const roleScans = prismaMock.userRoleAssignment.findMany.mock.calls.filter(
      (c: unknown[]) => (c[0] as { where?: { role?: unknown } })?.where?.role !== undefined,
    );
    expect(roleScans).toHaveLength(0);
  });

  it('counts with the SAME predicate, so total matches the filtered list', async () => {
    await service.getUsers({ role: 'ADMIN' });

    const listWhere = prismaMock.user.findMany.mock.calls[0]![0]!.where;
    const countWhere = prismaMock.user.count.mock.calls[0]![0]!.where;
    expect(countWhere).toEqual(listWhere);
    expect(countWhere.roleAssignments).toEqual({ some: { role: 'ADMIN' } });
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
