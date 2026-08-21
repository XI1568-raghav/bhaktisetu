/**
 * SCAL-04 — the role-filtered admin user list is resolved by a JOIN, and every
 * identifier in that JOIN is one prisma/schema.prisma actually declares.
 *
 * WHAT THIS REPLACES. `admin.service.getUsers` used to answer `?role=PANDIT` by
 * reading EVERY `user_role_assignment` row for that role, mapping it to a bare
 * uuid list, and sending that list BACK to Postgres as an `IN (...)` in both
 * the page query and the count. It was the only read left in this service that
 * scales with the whole USER BASE, and it scaled outbound as well as inbound:
 * at 200k holders the id list alone is ~7 MB per statement, twice per request,
 * on top of the rows coming in. Two previous passes recorded it as the worst
 * read in the file and declined to touch it because the obvious Prisma fix
 * (`where: { roleAssignments: { some: { role } } }`) needs a `@relation` that
 * does not exist, and adding one is a schema change plus a migration — and
 * migrations auto-apply on API boot.
 *
 * A JOIN needs neither. But raw SQL is only as safe as its identifiers, and
 * this repo has already shipped a `groupBy` naming a column that does not exist
 * (`/admin/waitlist/stats`, dead for six days behind a swallowing catch). There
 * is no database to ask here — production is suspended — so the schema file is
 * the oracle, and this test re-derives every table and column name from it on
 * every run rather than trusting the string in the service.
 *
 * WHY THE SCHEMA IS A SUFFICIENT ORACLE FOR THIS PARTICULAR STATEMENT: every
 * name it quotes is one the Prisma client ALREADY emits against this database
 * through the very `userRoleAssignment.findMany` this change replaces. If
 * `@@map("user_role_assignments")` or `@map("user_id")` were wrong, that call
 * would already be failing in production. `"users"` is additionally DDL in
 * prisma/migrations. The only identifier that could NOT be derived is the
 * Postgres enum type name, which is why the predicate is written
 * `ra."role"::text = $1` — the same shape routes/admin-metrics.ts already runs
 * in production as `"status"::text = 'captured'`.
 *
 * THE GUARD'S OWN FAILURE MODE IS PINNED. Six guards in this sweep have agreed
 * with their own documentation instead of with the code — one matched zero
 * templates and passed green over SQL it had never read. So the first
 * assertion here is that statements were captured AT ALL, and the identifier
 * check runs over text taken from the mock, not from a fixture.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import { AdminService } from './admin.service.js';

// ─── schema.prisma, parsed into table + column names ────────────────────────

const SCHEMA = readFileSync(
  join(import.meta.dirname, '..', '..', 'prisma', 'schema.prisma'),
  'utf8',
);

const SCALAR_TYPES = new Set([
  'String',
  'Int',
  'BigInt',
  'Float',
  'Decimal',
  'Boolean',
  'DateTime',
  'Json',
  'Bytes',
]);

const ENUM_NAMES = new Set(
  Array.from(SCHEMA.matchAll(/^enum\s+(\w+)\s*\{/gm)).map((m) => m[1]!),
);

function modelBlock(model: string): string {
  const start = SCHEMA.search(new RegExp(`^model\\s+${model}\\s*\\{`, 'm'));
  if (start === -1) throw new Error(`model ${model} not found in schema.prisma`);
  const end = SCHEMA.indexOf('\n}', start);
  if (end === -1) throw new Error(`model ${model} block not terminated`);
  return SCHEMA.slice(start, end);
}

/** The Postgres table name for a model: `@@map(...)` if present, else the name. */
function tableOf(model: string): string {
  const mapped = modelBlock(model).match(/@@map\("([^"]+)"\)/);
  return mapped ? mapped[1]! : model;
}

/**
 * The Postgres column names for a model.
 *
 * Relation fields are deliberately EXCLUDED — a relation field name is not a
 * column, and letting one into the legal set would let a wrong identifier pass.
 * A field counts as a column when its type is a scalar or a declared enum.
 */
function columnsOf(model: string): Set<string> {
  const cols = new Set<string>();
  for (const line of modelBlock(model).split('\n').slice(1)) {
    const m = line.match(/^\s{2}(\w+)\s+(\w+)(\[\])?\??/);
    if (!m) continue;
    const [, field, type, isList] = m;
    if (isList) continue;
    if (!SCALAR_TYPES.has(type!) && !ENUM_NAMES.has(type!)) continue;
    const mapped = line.match(/@map\("([^"]+)"\)/);
    cols.add(mapped ? mapped[1]! : field!);
  }
  return cols;
}

const USERS_TABLE = tableOf('User');
const URA_TABLE = tableOf('UserRoleAssignment');
const USER_COLS = columnsOf('User');
const URA_COLS = columnsOf('UserRoleAssignment');

/** `@map`-aware lookup: the column a named Prisma field writes to. */
function columnFor(model: string, field: string): string {
  const line = modelBlock(model)
    .split('\n')
    .find((l) => new RegExp(`^\\s{2}${field}\\s`).test(l));
  if (!line) throw new Error(`${model}.${field} not found in schema.prisma`);
  const mapped = line.match(/@map\("([^"]+)"\)/);
  return mapped ? mapped[1]! : field;
}

// ─── capture the SQL the service actually sends ─────────────────────────────

interface Captured {
  sql: string;
  values: unknown[];
}

let service: AdminService;
let statements: Captured[];

/**
 * Reassemble a tagged-template call into readable SQL with `?` placeholders.
 * Whitespace is collapsed so the assertions below pin the STATEMENT, not the
 * indentation it happens to be written with.
 */
function toSql(strings: TemplateStringsArray | string[], values: unknown[]): Captured {
  return { sql: Array.from(strings).join('?').replace(/\s+/g, ' ').trim(), values };
}

beforeEach(() => {
  vi.clearAllMocks();
  service = new AdminService();
  statements = [];
  prismaMock.$queryRaw.mockImplementation((strings: any, ...values: unknown[]) => {
    const cap = toSql(strings, values);
    statements.push(cap);
    // The count statement is the one with the aggregate; everything else is
    // the id page.
    if (/count\(\*\)/i.test(cap.sql)) return Promise.resolve([{ count: 2 }]);
    return Promise.resolve([{ id: 'u-newest' }, { id: 'u-older' }]);
  });
  prismaMock.user.findMany.mockResolvedValue([]);
  prismaMock.user.count.mockResolvedValue(0);
  prismaMock.userRoleAssignment.findMany.mockResolvedValue([]);
});

describe('SCAL-04 — role filter resolved by a JOIN, not by an id list', () => {
  it('sends two statements, and this guard actually saw them', async () => {
    await service.getUsers({ role: 'PANDIT' });

    // The trap this assertion exists for: a source-text guard whose pattern
    // matches nothing passes green over code it never read.
    expect(statements.length).toBe(2);
    expect(statements.some((s) => /count\(\*\)/i.test(s.sql))).toBe(true);
    expect(statements.some((s) => /LIMIT/i.test(s.sql))).toBe(true);
  });

  it('quotes only identifiers prisma/schema.prisma declares', async () => {
    await service.getUsers({ role: 'PANDIT', search: 'priya' });

    const legal = new Set<string>([USERS_TABLE, URA_TABLE, ...USER_COLS, ...URA_COLS]);
    // Sanity: the derivation itself must have found something, or "every
    // identifier is legal" would be vacuously true against an empty set.
    expect(legal.size).toBeGreaterThan(10);
    expect(legal.has('users')).toBe(true);
    expect(legal.has('user_role_assignments')).toBe(true);

    const quoted = new Set<string>();
    for (const s of statements) {
      for (const m of s.sql.matchAll(/"([^"]+)"/g)) quoted.add(m[1]!);
    }
    expect(quoted.size).toBeGreaterThan(0);
    for (const ident of quoted) {
      expect(legal, `"${ident}" is not a table or column in schema.prisma`).toContain(ident);
    }
  });

  it('joins on the columns the schema maps, not on hand-written names', async () => {
    await service.getUsers({ role: 'PANDIT' });

    const uraUserId = columnFor('UserRoleAssignment', 'userId'); // user_id
    const userId = columnFor('User', 'id'); // id
    const createdAt = columnFor('User', 'createdAt'); // created_at

    for (const s of statements) {
      expect(s.sql).toContain(`FROM "${USERS_TABLE}" u`);
      expect(s.sql).toContain(`JOIN "${URA_TABLE}" ra ON ra."${uraUserId}" = u."${userId}"`);
      // The enum type name is the one identifier the schema cannot confirm, so
      // the predicate must never name it.
      expect(s.sql).toContain(`ra."${columnFor('UserRoleAssignment', 'role')}"::text = ?`);
      expect(s.sql).not.toMatch(/::"?UserRole"?/);
    }
    const page = statements.find((s) => /LIMIT/i.test(s.sql))!;
    expect(page.sql).toContain(`ORDER BY u."${createdAt}" DESC`);
  });

  it('searches the same three columns Prisma did, with the same case rules', async () => {
    await service.getUsers({ role: 'PANDIT', search: 'priya' });

    const fullName = columnFor('User', 'fullName'); // full_name
    const page = statements.find((s) => /LIMIT/i.test(s.sql))!;
    // fullName + email are `mode: 'insensitive'` in the Prisma predicate this
    // replaces; phone was not. ILIKE / ILIKE / LIKE preserves that exactly.
    expect(page.sql).toContain(`u."${fullName}" ILIKE ?`);
    expect(page.sql).toContain(`u."${columnFor('User', 'email')}" ILIKE ?`);
    expect(page.sql).toContain(`u."${columnFor('User', 'phone')}" LIKE ?`);
    expect(page.values).toContain('%priya%');
  });

  it('asks Postgres for one page, and never for the whole holder list', async () => {
    await service.getUsers({ role: 'PANDIT', page: 3, limit: 25 });

    const page = statements.find((s) => /LIMIT/i.test(s.sql))!;
    // LIMIT/OFFSET are bound parameters, so the clamped page size and offset
    // must appear among the values — 25 rows starting at 50, not everything.
    expect(page.values).toContain(25);
    expect(page.values).toContain(50);

    // The read this change exists to remove: a scan of every assignment row
    // holding the role. Only the page hydration (`userId: { in: page }`) may
    // touch that table now.
    const roleScans = prismaMock.userRoleAssignment.findMany.mock.calls.filter(
      (c: any[]) => c[0]?.where?.role !== undefined,
    );
    expect(roleScans).toHaveLength(0);
  });

  it('hydrates only the page, bounded, and keeps the SQL row order', async () => {
    // Deliberately returned in the WRONG order: `IN (...)` does not preserve
    // the order of its arguments, so a service that trusts Postgres' answer
    // shows the operator a shuffled "newest first" list.
    prismaMock.user.findMany.mockResolvedValue([
      { id: 'u-older', fullName: 'Older', email: null, phone: null, subscriptionTier: null, blocked: false, blockedAt: null, blockedReason: null, createdAt: new Date('2026-01-01') },
      { id: 'u-newest', fullName: 'Newest', email: null, phone: null, subscriptionTier: null, blocked: false, blockedAt: null, blockedReason: null, createdAt: new Date('2026-08-01') },
    ]);

    const out = await service.getUsers({ role: 'PANDIT' });

    const hydration = prismaMock.user.findMany.mock.calls[0]![0]!;
    expect(hydration.where.id).toEqual({ in: ['u-newest', 'u-older'] });
    // Bounded by construction: the ids ARE the page, so this can never truncate.
    expect(hydration.take).toBe(2);
    expect(hydration.skip).toBeUndefined();

    expect(out.users.map((u: { id: string }) => u.id)).toEqual(['u-newest', 'u-older']);
  });

  it('reports the total from count(*), not from the page length', async () => {
    prismaMock.$queryRaw.mockImplementation((strings: any, ...values: unknown[]) => {
      const cap = toSql(strings, values);
      if (/count\(\*\)/i.test(cap.sql)) return Promise.resolve([{ count: 4173 }]);
      return Promise.resolve([{ id: 'u-1' }]);
    });
    prismaMock.user.findMany.mockResolvedValue([
      { id: 'u-1', fullName: 'A', email: null, phone: null, subscriptionTier: null, blocked: false, blockedAt: null, blockedReason: null, createdAt: new Date() },
    ]);

    const out = await service.getUsers({ role: 'PANDIT', limit: 20 });

    // SCAL-09's defect in miniature: a bounded page whose total silently
    // becomes the page length tells the operator there are 1 pandits.
    expect(out.total).toBe(4173);
    expect(out.users).toHaveLength(1);
  });

  it('an unknown role never reaches Postgres at all', async () => {
    const out = await service.getUsers({ role: 'NOT_A_ROLE' });

    expect(out).toEqual({ users: [], total: 0, page: 1, limit: 20 });
    expect(statements).toHaveLength(0);
    expect(prismaMock.user.findMany).not.toHaveBeenCalled();
  });

  it('falls back to the id-resolution path — same answer — if the JOIN cannot run', async () => {
    // The failure this branch exists for: a table or column the schema names
    // but the live database does not have. It must degrade to the previous
    // (correct, slow) behaviour, NOT to an empty page — an empty PANDIT page
    // reads as "we have no pandits".
    prismaMock.$queryRaw.mockRejectedValue(new Error('relation does not exist'));
    prismaMock.userRoleAssignment.findMany.mockResolvedValue([{ userId: 'u-1' }]);
    prismaMock.user.findMany.mockResolvedValue([
      { id: 'u-1', fullName: 'A', email: null, phone: null, subscriptionTier: null, blocked: false, blockedAt: null, blockedReason: null, createdAt: new Date() },
    ]);
    prismaMock.user.count.mockResolvedValue(1);

    const out = await service.getUsers({ role: 'PANDIT' });

    expect(out.users.map((u: { id: string }) => u.id)).toEqual(['u-1']);
    expect(out.total).toBe(1);
    // Page and count still agree on the predicate — the SCAL-09 invariant.
    const listWhere = prismaMock.user.findMany.mock.calls[0]![0]!.where;
    const countWhere = prismaMock.user.count.mock.calls[0]![0]!.where;
    expect(countWhere).toEqual(listWhere);
    expect(listWhere.id).toEqual({ in: ['u-1'] });
  });

  it('treats a non-array answer as unavailable rather than as an empty role', async () => {
    // A client that answers something other than an array is not answering SQL.
    // Coercing that to zero rows is the lying-number defect.
    prismaMock.$queryRaw.mockResolvedValue(undefined as never);
    prismaMock.userRoleAssignment.findMany.mockResolvedValue([{ userId: 'u-9' }]);
    prismaMock.user.count.mockResolvedValue(1);

    await service.getUsers({ role: 'ADMIN' });

    expect(prismaMock.user.count).toHaveBeenCalled();
    expect(prismaMock.user.findMany.mock.calls[0]![0]!.where.id).toEqual({ in: ['u-9'] });
  });
});
