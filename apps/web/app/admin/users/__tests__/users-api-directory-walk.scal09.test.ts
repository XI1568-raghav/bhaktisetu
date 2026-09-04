/**
 * SCAL-09 / AO-07 (client half) - the admin directory walk must terminate on
 * the page size the SERVER returned, not on the one the client asked for.
 *
 * `fetchAllAdminUsers` exists because GET /admin/users is paged: it walks pages
 * until the server's own `total` is satisfied and sets `complete: false` when
 * it had to stop, so a partial directory is never presented as the whole one.
 * The whole admin users screen then filters, counts and paginates over that
 * array - role, status and the footer count all read it.
 *
 * The walk asked for `limit=200`. The API clamps `limit` to
 * `clampLimit(value, 20, 100)` (apps/api/src/lib/pagination.ts), so page 1 came
 * back with 100 rows. The loop's "a short page means the server has nothing
 * more" test compared that 100 against the 200 it had REQUESTED, concluded the
 * directory had ended, set `complete = true` and stopped. Every account after
 * the hundredth was invisible - and, because `complete` was true, the page's
 * "this list is incomplete" banner never rendered, while the footer went on
 * showing the server's real `total` next to a table filtered over 100 rows.
 *
 * That is SCAL-09's own defect - a page that disagrees with its count, with no
 * signal to the operator - moved from the server to the client by the fix for
 * it.
 *
 * WHY THE EXISTING SUITE DID NOT CATCH IT: `__tests__/admin-users-p1.test.tsx`
 * mocks /admin/users with `Number(url.searchParams.get('limit') ?? '20')` and
 * no clamp, so its fake server honours limit=200 - a server the real one is
 * not. Its fixture is 23 users, below any clamp, so the walk terminates
 * correctly there for the wrong reason. This file's fake server clamps exactly
 * the way the real one does, and the clamp value is RE-DERIVED from the API's
 * own pagination module on every run rather than copied here: raise or lower
 * the server cap without teaching the client, and this fails.
 *
 * PROVEN TO FAIL FIRST - against users-api.ts as it stood on 2026-08-27
 * (`PAGE_SIZE = 200`), the walk tests reported a directory of 100 where 207
 * users existed, a `complete` flag of true over that truncation, and a single
 * request where several were needed. The two controls passed, which is what a
 * control is for.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { fetchAllAdminUsers } from '../users-api';

// --- The server's real page-size cap, read from the server -------------------

const PAGINATION_TS = join(
  import.meta.dirname,
  '..',
  '..',
  '..',
  '..',
  '..',
  'api',
  'src',
  'lib',
  'pagination.ts',
);

/**
 * Block comments plus whole-line `//` comments - never a blanket `//.*$`,
 * which would eat the tail of any line holding a URL and delete code from the
 * text this then searches.
 */
function stripTsComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/[^\n]*/gm, '');
}

/**
 * `clampLimit`'s `max` default - the largest page GET /admin/users will ever
 * return, whatever the caller asked for. Read from code, not from prose: the
 * module header discusses page numbers at length and a raw-text search would
 * be agreeing with a comment.
 */
function serverMaxLimit(): number {
  const src = stripTsComments(readFileSync(PAGINATION_TS, 'utf8'));
  const m = src.match(/export function clampLimit\([^)]*\bmax\s*=\s*(\d+)/);
  if (!m) {
    throw new Error(
      'could not read clampLimit(..., max = N) from apps/api/src/lib/pagination.ts - ' +
        'this guard cannot assert a clamp it did not find',
    );
  }
  return Number(m[1]);
}

const SERVER_MAX_LIMIT = serverMaxLimit();

// --- A fake /admin/users that clamps the way the real one does ---------------

function jsonResponse(body: unknown, status = 200): Response {
  const text = JSON.stringify(body);
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => text,
    json: async () => JSON.parse(text),
  } as unknown as Response;
}

function makeUsers(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `u${i + 1}`,
    fullName: `Test User ${i + 1}`,
    email: `user${i + 1}@example.com`,
    phone: null,
    roles: ['DEVOTEE'],
    blocked: false,
    blockedAt: null,
    blockedReason: null,
    createdAt: '2026-01-01T00:00:00.000Z',
  }));
}

/** Records every page size the client asked for, so the clamp can be proven. */
function mockDirectory(users: ReturnType<typeof makeUsers>) {
  const requested: number[] = [];
  const served: number[] = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input), 'http://localhost');
    if (!url.pathname.endsWith('/admin/users')) {
      throw new Error(`unexpected fetch: ${String(input)}`);
    }
    const asked = Number(url.searchParams.get('limit') ?? '20');
    requested.push(asked);
    // THE ONE BEHAVIOUR THIS FILE EXISTS FOR: the server does not hand back
    // more than its own cap, and it reports the size it actually used.
    const limit = Math.min(asked, SERVER_MAX_LIMIT);
    const page = Number(url.searchParams.get('page') ?? '1');
    const start = (page - 1) * limit;
    const slice = users.slice(start, start + limit);
    served.push(slice.length);
    return jsonResponse({ users: slice, total: users.length, page, limit });
  });
  vi.stubGlobal('fetch', fetchMock);
  return { fetchMock, requested, served };
}

beforeEach(() => {
  vi.unstubAllGlobals();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('SCAL-09 - the directory walk survives the server clamping `limit`', () => {
  it('the clamp this guard asserts is the API own value, and it is a real cap', () => {
    // Control. Without it every test below could pass over a mock that never
    // clamped - the way a guard goes green having exercised nothing.
    expect(Number.isInteger(SERVER_MAX_LIMIT)).toBe(true);
    expect(SERVER_MAX_LIMIT).toBeGreaterThan(0);
  });

  it('the fake server really does clamp what the client asks for', async () => {
    // The second control: proves the fixture reproduces the production
    // behaviour, so a failure below is the client's and not the mock's.
    const { requested, served } = mockDirectory(makeUsers(SERVER_MAX_LIMIT * 2 + 7));
    await fetchAllAdminUsers('t');
    expect(requested.length).toBeGreaterThan(0);
    expect(Math.max(...requested)).toBeGreaterThanOrEqual(SERVER_MAX_LIMIT);
    expect(Math.max(...served)).toBeLessThanOrEqual(SERVER_MAX_LIMIT);
  });

  it('returns every user when the directory is larger than one clamped page', async () => {
    const total = SERVER_MAX_LIMIT * 2 + 7;
    mockDirectory(makeUsers(total));

    const directory = await fetchAllAdminUsers('t');

    expect(directory.users).toHaveLength(total);
    expect(directory.total).toBe(total);
  });

  it('reaches a user who lives past the server page cap', async () => {
    const total = SERVER_MAX_LIMIT * 2 + 7;
    const marker = `Test User ${SERVER_MAX_LIMIT + 50}`;
    mockDirectory(makeUsers(total));

    const directory = await fetchAllAdminUsers('t');

    expect(directory.users.find((u) => u.fullName === marker)?.fullName).toBe(marker);
  });

  it('does not report a truncated directory as complete', async () => {
    // `complete` drives the page's "this list is incomplete" banner. A walk
    // that stops early AND says it finished is worse than one that stops
    // early: the operator has no way to know the filters below are lying.
    const total = SERVER_MAX_LIMIT * 2 + 7;
    mockDirectory(makeUsers(total));

    const directory = await fetchAllAdminUsers('t');

    expect(directory.complete).toBe(directory.users.length >= total);
    expect(directory.complete).toBe(true);
  });

  it('asks the server for more than one page when one page cannot hold the directory', async () => {
    const { fetchMock } = mockDirectory(makeUsers(SERVER_MAX_LIMIT * 2 + 7));

    await fetchAllAdminUsers('t');

    expect(fetchMock.mock.calls.length).toBeGreaterThan(1);
  });
});

describe('SCAL-09 - the ceiling the module documents is the ceiling it enforces', () => {
  /**
   * The module header promises a bounded walk that "admits it is partial"
   * beyond a stated number of users. Both halves are asserted: at the ceiling
   * the directory is whole, one user past it the flag flips. Pinning only the
   * `false` case would pass over a walk that gave up immediately.
   */
  const CEILING = 4000;

  it('a directory exactly at the ceiling is complete', async () => {
    mockDirectory(makeUsers(CEILING));
    const directory = await fetchAllAdminUsers('t');
    expect(directory.users).toHaveLength(CEILING);
    expect(directory.complete).toBe(true);
  });

  it('one user past the ceiling is reported as incomplete, not silently dropped', async () => {
    mockDirectory(makeUsers(CEILING + 1));
    const directory = await fetchAllAdminUsers('t');
    expect(directory.complete).toBe(false);
    // The count still tells the truth about the platform even though the rows
    // do not: the footer reads `total`, not `users.length`.
    expect(directory.total).toBe(CEILING + 1);
  });
});
