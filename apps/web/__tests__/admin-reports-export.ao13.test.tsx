/**
 * AO-13 — "Export Users" silently dropped every user past the twentieth.
 *
 * Sweep (2026-08-12): darshya-users-2026-08-12.csv held 21 lines = 1 header +
 * 20 data rows, while GET /admin/users?limit=500 reported total 23. "Export
 * All" (38 lines) was capped identically. No warning, no row count on screen,
 * and a filename that reads like a complete export.
 *
 * Cause: both export paths called `getUsers(token)` with no params, so the
 * API's default page size applied — clampLimit's fallback of 20. The shortfall
 * scales with the user base: at 1,000 users it exports 20 and loses 980.
 *
 * A high `limit` alone does NOT fix it — admin.service clamps limit to 100
 * (lib/pagination.clampLimit), so `limit=500` still truncates at 100. The
 * export has to walk pages to exhaustion, which is what these tests pin.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchAllUsersForExport } from '../app/admin/reports/export-users';

type Row = { id: string; fullName: string };

function page(users: Row[], total: number, pageNo: number, limit: number) {
  return { users, total, page: pageNo, limit };
}

let getUsers: ReturnType<typeof vi.fn>;

beforeEach(() => {
  getUsers = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AO-13 — the export contains every user', () => {
  it('walks pages until it has them all', async () => {
    // The sweep's exact numbers: 23 users, a server that yields at most 100 a
    // page but is asked here in pages of 20 to prove the walk actually loops.
    const all: Row[] = Array.from({ length: 23 }, (_, i) => ({
      id: `u${i}`,
      fullName: `User ${i}`,
    }));
    getUsers.mockImplementation(
      async (_t: unknown, params: { page?: number; limit?: number }) => {
        const limit = params.limit ?? 20;
        const p = params.page ?? 1;
        return page(all.slice((p - 1) * limit, p * limit), all.length, p, limit);
      },
    );

    const rows = await fetchAllUsersForExport(getUsers, 'token', 20);

    expect(rows).toHaveLength(23);
    expect(rows[22]!.id).toBe('u22');
    expect(getUsers.mock.calls.length).toBeGreaterThan(1);
  });

  it('always asks for an explicit page and limit', async () => {
    getUsers.mockResolvedValue(page([], 0, 1, 100));

    await fetchAllUsersForExport(getUsers, 'token');

    // The whole defect was a call with no params at all.
    const params = getUsers.mock.calls[0]![1] as { page?: number; limit?: number };
    expect(params).toBeDefined();
    expect(params.page).toBe(1);
    expect(typeof params.limit).toBe('number');
  });

  it('never asks for a page size the API would clamp away', async () => {
    getUsers.mockResolvedValue(page([], 0, 1, 100));

    await fetchAllUsersForExport(getUsers, 'token');

    // admin.service clamps to 100. Asking for 500 does not fail loudly — it
    // silently returns 100, which is how a "big limit" fix would reintroduce
    // this bug at 101 users.
    const params = getUsers.mock.calls[0]![1] as { limit?: number };
    expect(params.limit).toBeLessThanOrEqual(100);
  });

  it('stops when the server stops yielding rows, rather than looping forever', async () => {
    // A server that reports a total it cannot actually serve must not spin.
    getUsers.mockResolvedValue(page([], 9999, 1, 100));

    const rows = await fetchAllUsersForExport(getUsers, 'token');

    expect(rows).toHaveLength(0);
    expect(getUsers).toHaveBeenCalledTimes(1);
  });

  it('is bounded even if the server keeps claiming there is more', async () => {
    // Pathological server: every page returns a full batch and a rising total.
    getUsers.mockImplementation(async (_t: unknown, params: { page?: number; limit?: number }) => {
      const limit = params.limit ?? 100;
      return page(
        Array.from({ length: limit }, (_, i) => ({ id: `p${params.page}-${i}`, fullName: 'x' })),
        Number.MAX_SAFE_INTEGER,
        params.page ?? 1,
        limit,
      );
    });

    const rows = await fetchAllUsersForExport(getUsers, 'token');

    // An admin clicking Export must not hang the tab. Bounded, and honest
    // about it via the returned count rather than by pretending.
    expect(getUsers.mock.calls.length).toBeLessThanOrEqual(50);
    expect(rows.length).toBeGreaterThan(0);
  });

  it('surfaces a failure instead of exporting a short file', async () => {
    getUsers
      .mockResolvedValueOnce(
        page(
          Array.from({ length: 100 }, (_, i) => ({ id: `u${i}`, fullName: 'x' })),
          150,
          1,
          100,
        ),
      )
      .mockRejectedValueOnce(new Error('upstream 500'));

    // Half an export is the same lie as a truncated one, just later.
    await expect(fetchAllUsersForExport(getUsers, 'token')).rejects.toThrow(/upstream 500/);
  });
});
