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
 * `.env` now carries the local dev database; this guard is the belt to that
 * braces, because a stray `DATABASE_URL=` in a shell, a copied `.env` or a
 * future edit can put prod back in the default slot at any time.
 *
 * Wired as a `pre*` npm script in package.json, so it runs BEFORE the
 * destructive command, not after. Pass `--prod` to override deliberately.
 */

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
}

/**
 * Throw unless DATABASE_URL points at a local host or `--prod` was passed.
 * The message names the host (never the password) so the operator can see
 * exactly what they nearly wrote to.
 */
export function assertLocalDbTarget(opts: AssertOptions = {}): void {
  const argv = opts.argv ?? process.argv.slice(2);
  const databaseUrl = opts.databaseUrl ?? process.env.DATABASE_URL;
  const target = classifyDbTarget(databaseUrl);
  if (target.local) return;
  if (argv.includes('--prod')) return;
  throw new Error(
    `[guard-db-target] Refusing to run: DATABASE_URL points at "${target.host || '(unparseable)'}", ` +
      'which is not a local database. Local development must never write to production. ' +
      'Use apps/api/.env (local dev DB), or pass --prod if you genuinely intend to target the remote database.',
  );
}

// CLI entry — `tsx scripts/guard-db-target.ts`. Kept behind a main-check so the
// test can import the pure functions without the process exiting.
const invokedDirectly =
  typeof process !== 'undefined' &&
  Array.isArray(process.argv) &&
  /guard-db-target\.(ts|js|mjs)$/.test(process.argv[1] ?? '');

if (invokedDirectly) {
  try {
    assertLocalDbTarget();
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}
