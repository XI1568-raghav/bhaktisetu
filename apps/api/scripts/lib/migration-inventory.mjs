/**
 * Shared, dependency-free facts about `prisma/migrations`.
 *
 * Two consumers that must never disagree:
 *   - `scripts/apply-perf-indexes.mjs` and `scripts/bootstrap-fresh-db.mjs`,
 *     which execute what is in here;
 *   - `src/lib/money-key-constraints.di06.test.ts` and
 *     `src/lib/fresh-db-bootstrap.test.ts`, which assert on it.
 *
 * The point of the shared module is that the CONCURRENTLY statements are read
 * OUT OF the migration file rather than copied into a script. Copying is what
 * produced the original bug: `20260503_perf_indexes` says in its own header
 * that `prisma migrate deploy` "executes each statement separately, which is
 * fine", and no second copy of that claim ever got corrected. There is one copy
 * of the SQL, and it is the migration file.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
/** apps/api */
export const API_ROOT = join(here, '..', '..');
export const MIGRATIONS_DIR = join(API_ROOT, 'prisma', 'migrations');

/**
 * The one migration that contains CREATE INDEX CONCURRENTLY and cannot be
 * edited. See `docs/runbooks/fresh-database-bootstrap.md`.
 */
export const PERF_INDEX_MIGRATION = '20260503_perf_indexes';

/**
 * How Prisma checksums a migration: SHA-256 over the RAW FILE BYTES.
 *
 * Measured 2026-09-02 against Prisma 6.19.3 + PostgreSQL 17.10, by applying a
 * migration whose file had CRLF line endings and reading back
 * `_prisma_migrations.checksum`: the stored value matched sha256(raw bytes) and
 * did NOT match sha256(LF-normalised bytes).
 *
 * That is why line endings are load-bearing here, not cosmetic. A checkout that
 * changes CRLF to LF changes every checksum, and `migrate deploy` then refuses
 * to run — on a service whose start command is
 * `prisma migrate deploy && node dist/server.js`, that is a crash-loop.
 */
export function prismaChecksum(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

/** Every migration directory Prisma would see, in the order Prisma applies them. */
export function listMigrations() {
  return readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => ({ name: e.name, file: join(MIGRATIONS_DIR, e.name, 'migration.sql') }))
    .filter((m) => existsSync(m.file))
    .map((m) => {
      const bytes = readFileSync(m.file);
      return {
        name: m.name,
        file: m.file,
        bytes,
        sql: bytes.toString('utf8'),
        checksum: prismaChecksum(bytes),
      };
    })
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

export function readMigration(name) {
  const found = listMigrations().find((m) => m.name === name);
  if (!found) throw new Error(`no such migration: ${name}`);
  return found;
}

/**
 * Tokenise SQL into statements, dropping comments.
 *
 * This is fussier than it looks and the fussiness is load-bearing. A `--`
 * comment in these migrations very often contains an apostrophe ("the planner's
 * threshold", "don't"). A splitter that does not understand comments reads that
 * apostrophe as the start of a string literal, swallows every following `;`,
 * and hands PostgreSQL a statement with English prose in it — which is exactly
 * how this function failed the first time, with
 * `syntax error at or near "keeping"`.
 *
 * Handles: `--` line comments, `/* *\/` block comments (PostgreSQL nests them),
 * `'...'` strings with `''` escapes, `"..."` quoted identifiers, and
 * `$tag$...$tag$` dollar quoting (the money-key migrations are DO blocks).
 *
 * @param {string} sql
 * @param {{ keepComments?: boolean }} [opts]
 */
export function splitStatements(sql, opts = {}) {
  const keep = opts.keepComments === true;
  const out = [];
  let buf = '';
  let i = 0;

  while (i < sql.length) {
    const rest = sql.slice(i);

    // -- line comment
    if (sql.startsWith('--', i)) {
      const end = sql.indexOf('\n', i);
      const stop = end === -1 ? sql.length : end;
      if (keep) buf += sql.slice(i, stop);
      i = stop;
      continue;
    }

    // /* block comment */ — PostgreSQL allows nesting
    if (sql.startsWith('/*', i)) {
      let depth = 0;
      let j = i;
      while (j < sql.length) {
        if (sql.startsWith('/*', j)) {
          depth++;
          j += 2;
        } else if (sql.startsWith('*/', j)) {
          depth--;
          j += 2;
          if (depth === 0) break;
        } else j++;
      }
      if (keep) buf += sql.slice(i, j);
      i = j;
      continue;
    }

    // '...' string literal, '' is an escaped quote
    if (sql[i] === "'") {
      let j = i + 1;
      while (j < sql.length) {
        if (sql[j] === "'") {
          if (sql[j + 1] === "'") j += 2;
          else {
            j++;
            break;
          }
        } else j++;
      }
      buf += sql.slice(i, j);
      i = j;
      continue;
    }

    // "..." quoted identifier
    if (sql[i] === '"') {
      let j = i + 1;
      while (j < sql.length) {
        if (sql[j] === '"') {
          if (sql[j + 1] === '"') j += 2;
          else {
            j++;
            break;
          }
        } else j++;
      }
      buf += sql.slice(i, j);
      i = j;
      continue;
    }

    // $tag$ ... $tag$ dollar quoting
    const dollar = /^\$[A-Za-z_0-9]*\$/.exec(rest);
    if (dollar) {
      const tag = dollar[0];
      const close = sql.indexOf(tag, i + tag.length);
      const j = close === -1 ? sql.length : close + tag.length;
      buf += sql.slice(i, j);
      i = j;
      continue;
    }

    if (sql[i] === ';') {
      if (buf.trim()) out.push(buf.trim());
      buf = '';
      i++;
      continue;
    }

    buf += sql[i];
    i++;
  }

  if (buf.trim()) out.push(buf.trim());
  return out;
}

/** SQL with comments removed, via the same tokeniser (so they cannot disagree). */
export function stripSqlComments(sql) {
  return splitStatements(sql).join(';\n') + (sql.trim().endsWith(';') ? ';' : '');
}

/**
 * The executable `CREATE INDEX CONCURRENTLY` statements in a migration, with
 * comments stripped. Comments matter: several migrations DISCUSS CONCURRENTLY
 * in their headers to explain why it is banned, and matching those would be a
 * false positive.
 */
export function concurrentIndexStatements(sql) {
  return splitStatements(sql)
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter((s) => /^CREATE\s+(UNIQUE\s+)?INDEX\s+CONCURRENTLY\b/i.test(s));
}

/** `CREATE INDEX CONCURRENTLY IF NOT EXISTS "foo" ON "bar" (...)` -> `foo` / `bar`. */
export function describeIndexStatement(stmt) {
  const m =
    /^CREATE\s+(?:UNIQUE\s+)?INDEX\s+CONCURRENTLY\s+(?:IF\s+NOT\s+EXISTS\s+)?"?([A-Za-z0-9_]+)"?\s+ON\s+"?([A-Za-z0-9_]+)"?/i.exec(
      stmt,
    );
  return { index: m?.[1] ?? null, table: m?.[2] ?? null };
}

/** Every migration whose executable SQL (not its comments) uses CONCURRENTLY. */
export function migrationsUsingConcurrently() {
  return listMigrations()
    .filter((m) => concurrentIndexStatements(m.sql).length > 0)
    .map((m) => m.name)
    .sort();
}
