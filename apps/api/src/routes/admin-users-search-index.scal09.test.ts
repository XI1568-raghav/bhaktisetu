/**
 * SCAL-09 (index half) — the admin user search must have an index that can
 * actually serve it, and shipping one must not be able to stop the API booting.
 *
 * The role half of SCAL-09 was fixed earlier (the filter constrains the query,
 * so the page and `total` agree). What stayed open is the search: three columns
 * matched with a LEADING-WILDCARD pattern, which no btree index can serve, on
 * the read that grows with the whole user base. The audit measured 711.818 ms
 * on a 200,000-row shadow table. Production is suspended, so that number could
 * not be re-measured here and is quoted, not claimed.
 *
 * This guard pins four things about
 * `prisma/migrations/20260824010000_scal09_user_search_trgm`:
 *
 *  1. it exists at all — the trap a migration guard exists to avoid is passing
 *     green because its pattern matched nothing;
 *  2. it indexes EXACTLY the columns the service actually searches, and those
 *     column names are re-derived from `admin.service.ts` and `schema.prisma`
 *     on every run rather than copied into this file. Add a fourth search
 *     column without an index and the OR falls back to a sequential scan for
 *     the whole disjunction — this fails instead;
 *  3. no CREATE INDEX CONCURRENTLY. `migrate deploy` wraps each migration in a
 *     transaction; CONCURRENTLY inside one raises 25001 and then blocks every
 *     later migration;
 *  4. `CREATE EXTENSION` is inside an exception handler that RAISES A WARNING.
 *     Migrations auto-apply on boot, so an unguarded extension failure is not a
 *     missing index — it is an API that never starts.
 *
 * COMMENTS ARE STRIPPED BEFORE ANY OF THIS IS ASSERTED. The migration's own
 * header discusses CONCURRENTLY at length and the service's header quotes its
 * own SQL; a guard reading raw text would be agreeing with prose instead of
 * with code. Assertion 3 below proves the stripper works by checking that the
 * word IS present before stripping and absent after.
 *
 * PROVEN TO FAIL FIRST: with the migration directory renamed away, this file
 * reports 4 failed / 1 passed. The one that still passes is "this guard read
 * the service", which reads admin.service.ts and never touches the migration —
 * i.e. exactly the control it is meant to be.
 *
 * (Filed under routes/ to match the `admin-users*` ownership glob for this
 * change; it tests the admin user list, not a route handler.)
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const API_ROOT = join(import.meta.dirname, '..', '..');
const MIGRATIONS = join(API_ROOT, 'prisma', 'migrations');
const MIGRATION_DIR = '20260824010000_scal09_user_search_trgm';

/** `--` to end of line. No string literal in this migration contains `--`. */
function stripSqlComments(sql: string): string {
  return sql.replace(/--[^\n]*/g, '');
}

/**
 * Block comments, plus line comments only where `//` opens the line.
 *
 * Deliberately NOT a blanket `//.*$`: that also eats the tail of any line
 * holding a URL, which would silently delete code from the text this guard
 * then searches — the failure mode where a guard reports "clean" about source
 * it mangled itself.
 */
function stripTsComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/[^\n]*/gm, '');
}

const migrationPath = join(MIGRATIONS, MIGRATION_DIR, 'migration.sql');
const rawSql = existsSync(migrationPath) ? readFileSync(migrationPath, 'utf8') : '';
const sql = stripSqlComments(rawSql);

const serviceSrc = stripTsComments(
  readFileSync(join(API_ROOT, 'src', 'services', 'admin.service.ts'), 'utf8'),
);
const schema = readFileSync(join(API_ROOT, 'prisma', 'schema.prisma'), 'utf8');

/** The physical column a `model User` field writes to (`@map` aware). */
function userColumn(field: string): string {
  const model = schema.slice(schema.search(/^model User \{/m));
  const line = model
    .slice(0, model.indexOf('\n}'))
    .split('\n')
    .find((l) => new RegExp(`^\\s{2}${field}\\s`).test(l));
  if (!line) throw new Error(`User.${field} not found in schema.prisma`);
  const mapped = line.match(/@map\("([^"]+)"\)/);
  return mapped ? mapped[1]! : field;
}

/**
 * The columns the admin user search matches with a wildcard pattern.
 *
 * DERIVATION CHANGED 2026-08-28 (SCAL-04), and the change is why this file
 * failed rather than passing vacuously. It used to read the service's own
 * hand-written SQL (`u."full_name" ILIKE ?`). That SQL is gone: `?role=` is now
 * a Prisma relation predicate and there is no `$queryRaw` in admin.service.ts
 * at all, so the old pattern matched NOTHING and `searchedColumns` came back
 * empty — the exact vacuous-guard failure the "this guard read the service"
 * assertion below exists to catch. It caught it.
 *
 * The oracle is now the Prisma predicate itself: the `where.OR = [ … ]` array
 * that carries the search, with each `field: { contains: … }` mapped through
 * `@map` to its physical column. Prisma compiles `contains` to `LIKE '%…%'`
 * (or `ILIKE` with `mode: 'insensitive'`), so this is the same set of
 * leading-wildcard matches the trigram indexes have to serve.
 *
 * The block is located by its own `where.OR = [` assignment and bracket-matched
 * to its close, then EXACTLY ONE such block is required. Scanning the whole
 * file for `{ contains:` would have picked up any other model's search — the
 * nested-structure-for-top-level mistake this sweep has now made eight times.
 */
function searchPredicateBlocks(src: string): string[] {
  const blocks: string[] = [];
  const open = /where\.OR\s*=\s*\[/g;
  for (;;) {
    const m = open.exec(src);
    if (!m) return blocks;
    let depth = 0;
    let i = m.index + m[0].length - 1;
    for (; i < src.length; i += 1) {
      if (src[i] === '[') depth += 1;
      else if (src[i] === ']') {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    blocks.push(src.slice(m.index, i + 1));
    open.lastIndex = i + 1;
  }
}

const SEARCH_BLOCKS = searchPredicateBlocks(serviceSrc);

const searchedColumns = new Set(
  SEARCH_BLOCKS.flatMap((block) =>
    Array.from(block.matchAll(/(\w+)\s*:\s*\{\s*contains\s*:/g)).map((m) =>
      userColumn(m[1]!),
    ),
  ),
);

describe('SCAL-09 — the admin user search has an index that can serve it', () => {
  it('the SCAL-09 search-index migration exists', () => {
    expect(readdirSync(MIGRATIONS)).toContain(MIGRATION_DIR);
    expect(rawSql.length).toBeGreaterThan(0);
    expect(sql).toMatch(/CREATE EXTENSION IF NOT EXISTS pg_trgm/i);
  });

  it('this guard read the service, and the service still searches three columns', () => {
    // Without this, "every searched column is indexed" is vacuously true over
    // an empty set — the way a guard passes green having matched nothing. This
    // assertion has now earned its keep once: it is what failed when SCAL-04
    // deleted the raw SQL the previous derivation was reading.
    //
    // Exactly one predicate block: `getUsers` builds ONE `where` that serves
    // both the page and the count, so a second search predicate in this file
    // would mean the two reads can disagree — SCAL-09's original defect.
    expect(SEARCH_BLOCKS).toHaveLength(1);
    expect(searchedColumns).toEqual(
      new Set([userColumn('fullName'), userColumn('email'), userColumn('phone')]),
    );
  });

  it('indexes every column the search actually matches, with gin_trgm_ops', () => {
    for (const column of searchedColumns) {
      expect(
        sql,
        `no trigram index for the searched column "${column}" — an unindexed ` +
          `disjunct sends the whole OR back to a sequential scan`,
      ).toMatch(
        new RegExp(
          `CREATE INDEX IF NOT EXISTS "users_\\w*${column}\\w*_trgm_idx" ` +
            `ON "users" USING gin \\("${column}" %I\\.gin_trgm_ops\\)`,
          'i',
        ),
      );
    }
  });

  it('never CREATE INDEX CONCURRENTLY — 25001 blocks every later migration', () => {
    // The stripper is proven honest here: the header explains the ban in prose,
    // so the word must survive in the raw file and be gone from the stripped one.
    expect(rawSql).toMatch(/CONCURRENTLY/i);
    expect(sql).not.toMatch(/CONCURRENTLY/i);
  });

  it('cannot stop the API booting: the extension is guarded and announced', () => {
    // Migrations run as `prisma migrate deploy && node dist/server.js`, so a
    // statement that throws here is an outage, not a slow screen.
    expect(sql).toMatch(/EXCEPTION\s+WHEN\s+OTHERS/i);
    // Guarded is not the same as swallowed: a skipped index has to be visible.
    expect(sql.match(/RAISE\s+WARNING/gi) ?? []).toHaveLength(2);
    expect(sql).toMatch(/SQLSTATE/);
  });
});
