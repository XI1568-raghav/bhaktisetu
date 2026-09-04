/**
 * Types for `migration-inventory.mjs`.
 *
 * The module is plain ESM JavaScript on purpose: `scripts/bootstrap-fresh-db.mjs`
 * and `scripts/apply-perf-indexes.mjs` are disaster-recovery tools that must run
 * from a bare checkout with `node`, without a build step or `tsx`. This
 * declaration exists so the vitest suites in `src/` can import the same module
 * and still type-check under `tsc --noEmit` (the api tsconfig has no `allowJs`).
 */

export interface MigrationFile {
  /** Directory name, e.g. `20260503_perf_indexes`. */
  name: string;
  /** Absolute path to migration.sql. */
  file: string;
  /** Raw bytes — what Prisma checksums. */
  bytes: Buffer;
  sql: string;
  /** sha256 of the raw bytes, i.e. the value Prisma stores. */
  checksum: string;
}

export interface IndexDescription {
  index: string | null;
  table: string | null;
}

export declare const API_ROOT: string;
export declare const MIGRATIONS_DIR: string;
export declare const PERF_INDEX_MIGRATION: string;

export declare function prismaChecksum(bytes: Buffer | string): string;
export declare function listMigrations(): MigrationFile[];
export declare function readMigration(name: string): MigrationFile;
export declare function splitStatements(
  sql: string,
  opts?: { keepComments?: boolean },
): string[];
export declare function stripSqlComments(sql: string): string;
export declare function concurrentIndexStatements(sql: string): string[];
export declare function describeIndexStatement(stmt: string): IndexDescription;
export declare function migrationsUsingConcurrently(): string[];
