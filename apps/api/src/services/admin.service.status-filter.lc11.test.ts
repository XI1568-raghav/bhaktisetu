/**
 * LC-11 — GET /admin/users accepted `?status=` and silently ignored it.
 *
 * Measured at HEAD before this test existed. `admin.service.ts` declared
 * `status?: string` on `UserFilters` with the comment "User has no status
 * column - applying it would 500 every /admin/users call… The router still
 * forwards it for backward compat; we ignore it here", and `getUsers` never
 * read `filters.status`. `routes/admin.ts` parsed it, forwarded it, and
 * answered 200. So `?status=blocked` returned EVERY user next to a total
 * counting every user, and nothing in the response distinguished that from a
 * platform where nobody is blocked.
 *
 * The premise of that comment was already false when it was written:
 * `20260511_user_blocked` added `users.blocked BOOLEAN NOT NULL DEFAULT false`
 * (plus `users_blocked_idx … WHERE blocked = true`), and this same service
 * reads `blocked` / `blockedAt` / `blockedReason` off every row it returns.
 *
 * This is SCAL-09's defect class with a different filter on it: a predicate
 * that does not constrain the query cannot constrain `total`, so the page and
 * the number under it describe different populations.
 *
 * PROVEN TO FAIL FIRST. Every assertion below was run against an unmodified
 * copy of HEAD's `admin.service.ts` before the fix landed (the copy was placed
 * beside the original so its relative imports resolved identically, then
 * deleted). Result: 6 failed / 1 passed — the one pass being "no status filter
 * leaves the query unconstrained", which is the control.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import { AdminService, UnsupportedUserStatusError } from './admin.service.js';

let service: AdminService;

beforeEach(() => {
  vi.clearAllMocks();
  service = new AdminService();
  prismaMock.user.findMany.mockResolvedValue([]);
  prismaMock.user.count.mockResolvedValue(0);
  prismaMock.userRoleAssignment.findMany.mockResolvedValue([]);
});

describe('LC-11 — the status filter constrains the query, not nothing', () => {
  it('?status=blocked constrains the page AND the count on User.blocked', async () => {
    await service.getUsers({ status: 'blocked' });

    const listWhere = prismaMock.user.findMany.mock.calls[0]![0]!.where;
    const countWhere = prismaMock.user.count.mock.calls[0]![0]!.where;

    expect(listWhere.blocked).toBe(true);
    // The SCAL-09 invariant: a filter that the count does not share produces a
    // total describing a different population than the rows above it.
    expect(countWhere).toEqual(listWhere);
  });

  it('?status=active resolves to blocked:false and is not dropped as falsy', async () => {
    // The trap: the mapping value for `active` IS `false`. A truthiness test
    // anywhere on the path (`if (blocked)`, `blocked ?` …) silently turns this
    // filter back into the ignored one this finding is about.
    await service.getUsers({ status: 'active' });

    const listWhere = prismaMock.user.findMany.mock.calls[0]![0]!.where;
    const countWhere = prismaMock.user.count.mock.calls[0]![0]!.where;

    expect(listWhere).toHaveProperty('blocked', false);
    expect(countWhere).toEqual(listWhere);
  });

  it('no status filter leaves the query unconstrained (control)', async () => {
    await service.getUsers({});

    const listWhere = prismaMock.user.findMany.mock.calls[0]![0]!.where;
    expect(listWhere).not.toHaveProperty('blocked');
  });

  it('status survives alongside search, both in the page and in the count', async () => {
    await service.getUsers({ search: 'priya', status: 'blocked' });

    const listWhere = prismaMock.user.findMany.mock.calls[0]![0]!.where;
    expect(listWhere.blocked).toBe(true);
    expect(listWhere.OR).toHaveLength(3);
    expect(prismaMock.user.count.mock.calls[0]![0]!.where).toEqual(listWhere);
  });

  // REWRITTEN 2026-08-28 (SCAL-04). These were TWO tests — one for the raw-SQL
  // JOIN's two statements, one for the id-resolution fallback beneath it —
  // because `?role=` had two code paths and LC-11's rule ("the status predicate
  // must be in BOTH the page and the count, or `?role=PANDIT&status=blocked`
  // pages one set and counts another") had to hold on each. There is now one
  // path: the role is a Prisma relation predicate on the SAME `where` object
  // the count already receives, so the two-sets failure is not merely tested
  // against, it is unconstructable. The assertion is not weakened — it still
  // demands role AND status on both reads, and object identity between them.
  it('role + status: both predicates constrain the page AND the count', async () => {
    prismaMock.user.findMany.mockResolvedValue([
      {
        id: 'u-1',
        fullName: 'A',
        email: null,
        phone: null,
        subscriptionTier: null,
        blocked: true,
        blockedAt: null,
        blockedReason: null,
        createdAt: new Date(),
      },
    ]);
    prismaMock.user.count.mockResolvedValue(1);

    await service.getUsers({ role: 'PANDIT', status: 'blocked' });

    const listWhere = prismaMock.user.findMany.mock.calls[0]![0]!.where;
    const countWhere = prismaMock.user.count.mock.calls[0]![0]!.where;
    expect(listWhere.blocked).toBe(true);
    expect(listWhere.roleAssignments).toEqual({ some: { role: 'PANDIT' } });
    // Applying either predicate to the page but not to the count is SCAL-09 one
    // level down.
    expect(countWhere).toEqual(listWhere);
    // And no hand-written SQL is involved in answering it any more.
    expect(prismaMock.$queryRaw).not.toHaveBeenCalled();
  });

  it('a status this endpoint cannot express is refused, never answered empty', async () => {
    // `pending` is a real state the admin table displays, but it lives in the
    // provider profiles and arrives from /admin/pending-approvals. Returning an
    // empty page for it would tell an operator nobody is awaiting approval.
    // (Contrast with an unknown ROLE, which IS an honest empty page: a role
    // outside the enum genuinely has no holders.)
    await expect(service.getUsers({ status: 'pending' })).rejects.toBeInstanceOf(
      UnsupportedUserStatusError,
    );
    expect(prismaMock.user.findMany).not.toHaveBeenCalled();
    expect(prismaMock.user.count).not.toHaveBeenCalled();

    const err = await service.getUsers({ status: 'pending' }).catch((e) => e);
    expect(err.supported).toEqual(['active', 'blocked']);
    expect(err.supported).not.toContain('pending');
  });
});
