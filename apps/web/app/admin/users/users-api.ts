/**
 * Admin user-directory client.
 *
 * Verified against apps/api/src/routes/admin.ts:
 *
 *   GET   /api/v1/admin/users?page&limit&search   → { users, total, page, limit }
 *   GET   /api/v1/admin/users/:id                 → { user: { …User, roles, profiles } }
 *   PATCH /api/v1/admin/users/:id                 body { approved?, blocked?, blockedReason?, roles? }
 *   GET   /api/v1/admin/pending-approvals         → { approvals: [{ userId, role, … }], total }
 *
 * Two API behaviours this module exists to work around, both load-bearing:
 *
 * 1. `limit` DEFAULTS TO 20 AND IS CAPPED AT 100 (admin.service.getUsers, via
 *    `clampLimit(value, 20, 100)`). `getUsers(token)` with no params therefore
 *    returned 20 of 23 users and the page counted, filtered and paginated that
 *    array — AO-07. `fetchAllAdminUsers` walks pages until the server's own
 *    `total` is satisfied and reports `complete: false` when it had to stop,
 *    so a partial directory is never presented as the whole one. The CAP is
 *    the half that bit later: the walk asked for 200, and every response it
 *    could ever get looked "short" — see PAGE_SIZE below.
 *
 * 2. The `role` and `status` query params were both broken on the server, so
 *    this module fetched everything and the page filtered locally. BOTH ARE
 *    FIXED NOW and the note that used to stand here is out of date:
 *      - `?role=` constrains the query (a JOIN), so the page and `total` agree
 *        — SCAL-09, then SCAL-04;
 *      - `?status=` maps to `User.blocked` instead of being silently ignored,
 *        and an unsupported value is a 400 rather than an unfiltered 200 —
 *        LC-11, 2026-08-24.
 *
 *    Client-side filtering stays anyway, for a reason that is about THIS page
 *    rather than about the API: the table offers a third status, `pending`,
 *    which is not a `User` column at all — it means "a provider profile on this
 *    account is unapproved" and it arrives from /admin/pending-approvals. The
 *    server cannot express it, so delegating the status filter would quietly
 *    drop that option. Pagination is local for the same reason: `filtered`
 *    spans all three filters at once.
 *
 *    The cost is the 4,000-row ceiling below, which is reported honestly
 *    (`complete: false` → the page's "list is incomplete" banner). Moving this
 *    screen to server-driven paging is the real fix and is a separate change:
 *    it needs the pending set to become a server-side predicate first.
 */

import {
  API_BASE_URL,
  fetchWithTimeout,
  isNetworkFailure,
  NETWORK_ERROR_MESSAGE,
} from '../../../lib/api-config';

/** One row of GET /admin/users. `blocked` arrives from the AO-01 fix. */
export interface AdminUserRecord {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  roles: string[];
  subscriptionTier?: string | null;
  blocked?: boolean;
  blockedAt?: string | null;
  blockedReason?: string | null;
  createdAt: string;
}

export interface AdminUserProfiles {
  pandit?: Record<string, unknown> | null;
  store?: Record<string, unknown> | null;
  astrologer?: Record<string, unknown> | null;
  wellness?: Record<string, unknown> | null;
  gaushala?: Record<string, unknown> | null;
  temple?: Record<string, unknown> | null;
}

/** GET /admin/users/:id — every User column plus roles and provider profiles. */
export interface AdminUserDetail extends AdminUserRecord {
  locationCity?: string | null;
  locationState?: string | null;
  isNri?: boolean;
  nriCountry?: string | null;
  preferredLanguage?: string | null;
  avatarUrl?: string | null;
  updatedAt?: string;
  profiles?: AdminUserProfiles;
}

export interface AdminUserDirectory {
  users: AdminUserRecord[];
  /** The server's own count of matching users — the number the footer must show. */
  total: number;
  /** False when paging stopped before `total` was reached. */
  complete: boolean;
}

/** Thrown when the account itself is missing, so callers can say so honestly. */
export class AdminUserNotFoundError extends Error {
  constructor(message = 'User not found.') {
    super(message);
    this.name = 'AdminUserNotFoundError';
  }
}

/**
 * The page size asked for, and it is the SERVER'S cap on purpose.
 *
 * This was 200 until 2026-08-27, and the API clamps `limit` to
 * `clampLimit(value, 20, 100)` (apps/api/src/lib/pagination.ts), so page 1 came
 * back with 100 rows. The walk below then compared that 100 against the 200 it
 * had REQUESTED, read the short page as "the server has nothing more", and
 * stopped — with `complete: true`. The directory silently ended at the
 * hundredth account: the table filtered 100 rows, the footer went on showing
 * the server's real `total` beside them, and the "list is incomplete" banner
 * never rendered because nothing believed the list was incomplete. That is
 * SCAL-09's lying number rebuilt on the client by the fix for it.
 *
 * Asking for exactly what the server will give makes the request honest, and
 * the termination test below no longer depends on this constant agreeing with
 * the API at all.
 */
const PAGE_SIZE = 100;
/** 40 x 100 = 4,000 users before the directory admits it is partial. */
const MAX_PAGES = 40;

function authHeaders(token: string | undefined): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Fastify replies `{ error }` here, not `{ message }` — reading only `message`
 * turns every backend rejection into a bare "Request failed (400)".
 */
async function asJson<T>(res: Response, fallback: string): Promise<T> {
  const text = await res.text();
  if (!res.ok) {
    let message = `${fallback} (${res.status})`;
    try {
      const parsed = text ? (JSON.parse(text) as { error?: string; message?: string }) : null;
      const detail = parsed?.error ?? parsed?.message;
      if (detail) message = `${fallback} (${res.status}): ${detail}`;
    } catch {
      /* keep the default */
    }
    throw new Error(message);
  }
  return (text ? JSON.parse(text) : {}) as T;
}

function rethrow(err: unknown): never {
  if (isNetworkFailure(err)) throw new Error(NETWORK_ERROR_MESSAGE);
  throw err instanceof Error ? err : new Error('Request failed.');
}

/**
 * Every user, not the first page of them.
 *
 * `search` IS delegated — admin.service builds a real `where.OR` for it before
 * paginating, so the server's `total` is correct for a search. Role and status
 * are server-side too now, but this page still filters them locally; the module
 * header says why.
 */
export async function fetchAllAdminUsers(
  token: string | undefined,
  params: { search?: string } = {},
): Promise<AdminUserDirectory> {
  const users: AdminUserRecord[] = [];
  let total = 0;
  let complete = false;

  try {
    for (let page = 1; page <= MAX_PAGES; page += 1) {
      const qs = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (params.search) qs.set('search', params.search);

      const res = await fetchWithTimeout(`${API_BASE_URL}/admin/users?${qs.toString()}`, {
        headers: authHeaders(token),
      });
      const body = await asJson<{ users?: AdminUserRecord[]; total?: number; limit?: number }>(
        res,
        'Failed to load users',
      );
      const batch = Array.isArray(body.users) ? body.users : [];
      users.push(...batch);
      if (typeof body.total === 'number') total = body.total;

      // The page size the SERVER used, which is not necessarily the one we
      // asked for — `getUsers` clamps `limit` and echoes the clamped value
      // back. Measuring "short page" against the requested size is what
      // truncated this directory at 100 rows while calling it complete; a
      // short page is only evidence the directory ended when it is short
      // against the size the server actually served.
      const servedLimit =
        typeof body.limit === 'number' && body.limit > 0 ? body.limit : PAGE_SIZE;

      // A short page means the server has nothing more, whatever `total` says.
      if (batch.length < servedLimit || users.length >= total) {
        complete = true;
        break;
      }
    }
  } catch (err) {
    return rethrow(err);
  }

  // Trust the larger of the two: a `total` that undercounts what we were handed
  // would understate the directory just as badly as the old truncation did.
  return { users, total: Math.max(total, users.length), complete };
}

/**
 * User ids with an unapproved provider profile.
 *
 * GET /admin/users carries no approval flag, so without this the table's
 * Approve control was unreachable on every row (AO-08). This is the same list
 * /admin/approvals renders, keyed by user.
 */
export async function fetchPendingApprovalUserIds(
  token: string | undefined,
): Promise<Set<string>> {
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/admin/pending-approvals`, {
      headers: authHeaders(token),
    });
    const body = await asJson<{ approvals?: Array<{ userId?: string }> }>(
      res,
      'Failed to load approvals',
    );
    const ids = new Set<string>();
    for (const a of body.approvals ?? []) {
      if (a?.userId) ids.add(a.userId);
    }
    return ids;
  } catch (err) {
    return rethrow(err);
  }
}

export async function fetchAdminUser(
  token: string | undefined,
  userId: string,
): Promise<AdminUserDetail> {
  let res: Response;
  try {
    res = await fetchWithTimeout(`${API_BASE_URL}/admin/users/${encodeURIComponent(userId)}`, {
      headers: authHeaders(token),
    });
  } catch (err) {
    return rethrow(err);
  }
  if (res.status === 404) {
    throw new AdminUserNotFoundError();
  }
  const body = await asJson<{ user?: AdminUserDetail }>(res, 'Failed to load user');
  if (!body.user) {
    throw new AdminUserNotFoundError();
  }
  return body.user;
}

export interface AdminUserUpdate {
  approved?: boolean;
  blocked?: boolean;
  blockedReason?: string;
  roles?: string[];
}

/**
 * PATCH /admin/users/:id.
 *
 * Returns nothing on purpose. A 200 from this endpoint is NOT evidence the
 * write landed — it answered `{"message":"User updated"}` for a `blocked` flag
 * it never persisted (AO-01), and the table believed it because it mutated
 * local state optimistically. Callers must re-read the user and check the
 * field they asked for before telling an operator anything happened.
 */
export async function patchAdminUser(
  token: string | undefined,
  userId: string,
  updates: AdminUserUpdate,
): Promise<void> {
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/admin/users/${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
      body: JSON.stringify(updates),
    });
    await asJson<unknown>(res, 'Action failed');
  } catch (err) {
    return rethrow(err);
  }
}

/** True when any provider profile on the account is still unapproved. */
export function hasUnapprovedProfile(profiles: AdminUserProfiles | undefined): boolean {
  if (!profiles) return false;
  return Object.values(profiles).some(
    (p) => p !== null && p !== undefined && (p as { approved?: boolean }).approved === false,
  );
}
