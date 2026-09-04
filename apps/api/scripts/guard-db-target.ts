/**
 * Refuse to run a schema/seed command against anything but a local database.
 *
 * AW-09 (2026-08-12, P1). `apps/api/.env` carried the PRODUCTION Supabase
 * DATABASE_URL with NODE_ENV=production. Prisma CLI and a bare
 * `new PrismaClient()` load `.env` (never `.env.local`), so from a local
 * checkout `prisma migrate dev`, `prisma db push`, `prisma migrate reset` or
 * `db:seed` silently targeted the live customer database — and every agent
 * session had ambient production READ access it never asked for.
 *
 * `.env` was supposed to carry the local dev database; this guard is the belt
 * to that braces, because a stray `DATABASE_URL=` in a shell, a copied `.env`
 * or a future edit can put prod back in the default slot at any time.
 *
 * AUTH-09 (2026-09-01) — MEASURED, and the braces are not holding. Comparing
 * apps/api/.env against apps/api/.env.production key by key (values compared,
 * never printed): DATABASE_URL, DIRECT_URL, SUPABASE_URL,
 * SUPABASE_SERVICE_ROLE_KEY and JWT_SECRET are IDENTICAL, and .env carries
 * NODE_ENV=production. The default env file on a developer's machine is the
 * production one.
 *
 * The gap that made that dangerous rather than merely untidy: this guard gated
 * db:migrate, db:push, db:seed, seed:darshan and db:studio — every command that
 * writes SCHEMA — and did not gate `dev`, which is the command a developer runs
 * a hundred times a day. `tsx watch src/server.ts` boots the entire API, with
 * the production service-role key and the production JWT secret, against live
 * customer data; every write endpoint in the app is then one local HTTP request
 * away from production, and a JWT minted locally is valid in production. `dev`
 * is gated now.
 *
 * Wired as a `pre*` npm script in package.json, so it runs BEFORE the
 * destructive command, not after. Pass `--prod`, or set ALLOW_REMOTE_DB=1
 * (which is what a `pre` hook can see — see REMOTE_DB_OVERRIDE_ENV), to
 * override deliberately.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export interface DbTarget {
  /** Host only — never the credentials. */
  host: string;
  local: boolean;
}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '0.0.0.0', 'host.docker.internal']);

/**
 * Classify a Postgres connection string by host.
 *
 * Fails CLOSED: anything unparseable or absent is treated as remote. An
 * unreadable URL is exactly when you least want to assume it is safe.
 */
export function classifyDbTarget(url: string | undefined | null): DbTarget {
  if (!url) return { host: '', local: false };
  let host = '';
  try {
    // `new URL` handles postgresql:// and strips credentials for us; it also
    // normalises the IPv6 bracket form [::1] to ::1 via .hostname.
    host = new URL(url).hostname.replace(/^\[|\]$/g, '');
  } catch {
    return { host: '', local: false };
  }
  if (!host) return { host: '', local: false };
  return { host, local: LOCAL_HOSTS.has(host) };
}

export interface AssertOptions {
  databaseUrl?: string | null;
  argv?: string[];
  env?: Record<string, string | undefined>;
}

/**
 * AUTH-09 (2026-09-01) — the escape hatch an npm `pre*` hook can actually use.
 *
 * `--prod` works for a hand-typed `tsx scripts/guard-db-target.ts --prod`, but
 * npm does NOT forward a command's arguments to its `pre` hook: `pnpm dev
 * --prod` runs `predev` with an empty argv and only then passes `--prod` to
 * `dev`. So gating `dev` with a pre-hook and offering only `--prod` would be
 * gating it with no override at all. This variable is the override that
 * survives the hook boundary.
 */
export const REMOTE_DB_OVERRIDE_ENV = 'ALLOW_REMOTE_DB';

/**
 * Throw unless DATABASE_URL points at a local host, `--prod` was passed, or
 * ALLOW_REMOTE_DB=1 is set. The message names the host (never the password) so
 * the operator can see exactly what they nearly wrote to.
 */
export function assertLocalDbTarget(opts: AssertOptions = {}): void {
  const argv = opts.argv ?? process.argv.slice(2);
  const env = opts.env ?? process.env;
  const databaseUrl = opts.databaseUrl ?? env.DATABASE_URL;
  const target = classifyDbTarget(databaseUrl);
  if (target.local) return;
  if (argv.includes('--prod')) return;
  if (env[REMOTE_DB_OVERRIDE_ENV] === '1') return;
  throw new Error(
    `[guard-db-target] Refusing to run: DATABASE_URL points at "${target.host || '(unparseable)'}", ` +
      'which is not a local database. Local development must never write to production. ' +
      `Use apps/api/.env (local dev DB), pass --prod, or set ${REMOTE_DB_OVERRIDE_ENV}=1 ` +
      'if you genuinely intend to target the remote database.',
  );
}

/**
 * AUTH-09 (2026-09-01) — read DATABASE_URL out of the .env FILE when the
 * process env does not carry it. Without this the guard was inert in the only
 * way that matters.
 *
 * The guard runs as its own process under an npm `pre*` hook. Nothing in
 * apps/api calls `dotenv.config()` — `.env` is loaded for the app by
 * `@prisma/client` at import time, which never happens in this tiny script. So
 * `process.env.DATABASE_URL` was ALWAYS undefined here, `classifyDbTarget`
 * always answered `(unparseable)`, and the guard refused every gated command
 * regardless of what it was pointed at. Verified by running it:
 *
 *   $ npx tsx scripts/guard-db-target.ts
 *   [guard-db-target] Refusing to run: DATABASE_URL points at "(unparseable)" …
 *
 * A guard that refuses unconditionally is not a safety property, it is a
 * papercut — and it trains the operator to reach for `--prod`, which disables
 * the check for the one case it exists to catch.
 *
 * Deliberately a five-line parser rather than a dotenv dependency: this script
 * must run before anything else is loaded, and the only key it needs is one
 * `KEY=value` line. The value is classified and then discarded — only the HOST
 * is ever put in a message, never the credentials.
 */
export function databaseUrlFromEnvFile(filePath: string): string | undefined {
  let text: string;
  try {
    text = readFileSync(filePath, 'utf8');
  } catch {
    return undefined;
  }
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 1) continue;
    if (line.slice(0, eq).trim() !== 'DATABASE_URL') continue;
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    return value || undefined;
  }
  return undefined;
}

// CLI entry — `tsx scripts/guard-db-target.ts`. Kept behind a main-check so the
// test can import the pure functions without the process exiting.
const invokedDirectly =
  typeof process !== 'undefined' &&
  Array.isArray(process.argv) &&
  /guard-db-target\.(ts|js|mjs)$/.test(process.argv[1] ?? '');

if (invokedDirectly) {
  try {
    // The shell wins if it set one; otherwise classify the file the app itself
    // will load. `.env`, not `.env.local` — Prisma and `new PrismaClient()`
    // only ever read `.env`, which is the whole reason AW-09 happened.
    const fromFile = databaseUrlFromEnvFile(
      fileURLToPath(new URL('../.env', import.meta.url)),
    );
    assertLocalDbTarget({ databaseUrl: process.env.DATABASE_URL ?? fromFile });
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}
