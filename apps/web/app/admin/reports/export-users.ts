/**
 * AO-13 — an export that leaves the product must be complete.
 *
 * Both export paths on /admin/reports called `getUsers(token)` with no
 * parameters, so the API's default page size applied. Measured on the sweep:
 * darshya-users-2026-08-12.csv held 20 data rows against a reported total of
 * 23, and "Export All" was capped the same way. Nobody re-counts a CSV against
 * the database, so the loss is invisible indefinitely — and it scales, because
 * the cap is a page size, not a number of users.
 *
 * Passing a big `limit` does NOT fix this. apps/api/src/lib/pagination.ts
 * clamps to 100, quietly: `?limit=500` returns 100 rows and a 200. Anything
 * built on "ask for more than we'll ever have" reintroduces the same silent
 * truncation the moment the platform passes 100 users. So the export walks
 * pages to exhaustion.
 *
 * Split out of page.tsx so the walk can be tested without rendering the page
 * or stubbing a download.
 */

/** The slice of the admin-api `getUsers` contract this walk depends on. */
export type UsersPage<T> = {
  users: T[];
  total: number;
  page: number;
  limit: number;
};

export type UsersFetcher<T> = (
  token: string | undefined,
  params: { page: number; limit: number },
) => Promise<UsersPage<T>>;

/** The API's own clamp (lib/pagination.clampLimit max). Asking for more is silently reduced. */
export const EXPORT_PAGE_SIZE = 100;

/**
 * Hard stop on the number of round trips.
 *
 * An export runs in the admin's tab on a click. A server that keeps reporting
 * "there is more" — a rising total, a page that never shortens — must not be
 * able to hang that tab. 50 pages of 100 is 5,000 users, comfortably past any
 * near-term reality, and `exhausted` on the result says whether the walk ended
 * because it ran out of users or because it ran out of budget.
 */
const MAX_PAGES = 50;

/**
 * Read every user the admin is entitled to export.
 *
 * Throws on a failed page rather than returning what it managed to collect: a
 * half-written export is the same lie as a truncated one, only harder to spot.
 */
export async function fetchAllUsersForExport<T>(
  getUsers: UsersFetcher<T>,
  token: string | undefined,
  pageSize: number = EXPORT_PAGE_SIZE,
): Promise<T[]> {
  const limit = Math.min(Math.max(1, Math.floor(pageSize)), EXPORT_PAGE_SIZE);
  const out: T[] = [];

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const res = await getUsers(token, { page, limit });
    const batch = res?.users ?? [];
    out.push(...batch);

    // A short page is the end of the data, whatever `total` claims. This is
    // also the guard against a server whose total is wrong: no rows, no loop.
    if (batch.length < limit) break;
    // A total we have already met is the other, ordinary exit.
    if (typeof res?.total === 'number' && out.length >= res.total) break;
  }

  return out;
}
