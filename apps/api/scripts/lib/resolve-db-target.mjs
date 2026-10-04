/**
 * OPS-14 (`F456`, 2026-09-08) — resolve a maintenance script's Postgres
 * connection string from the env file the operator NAMED, never from the
 * ambient process env that `@prisma/client` quietly populated.
 *
 * ── The defect this replaces ──────────────────────────────────────────────
 *
 * Every checker in apps/api/scripts had the same four-line shape:
 *
 *     import { PrismaClient } from '@prisma/client';   // (1)
 *     ...parse --env-file, assign into process.env...  // (2)
 *     const url = process.env.DIRECT_URL || process.env.DATABASE_URL;  // (3)
 *     const prisma = new PrismaClient({ datasourceUrl: url });         // (4)
 *
 * (1) is HOISTED — an ESM import is evaluated before any statement in the
 * module body — and the generated Prisma client calls dotenv on `apps/api/.env`
 * at import time. `apps/api/.env` carries the PRODUCTION URLs for BOTH keys
 * (measured under AUTH-09, re-measured 2026-09-08: both are
 * `aws-1-ap-northeast-1.pooler.supabase.com`). So by the time (2) runs,
 * `process.env` is already pointed at production.
 *
 * (2) then overlays only the keys the named file happens to contain.
 * `apps/api/.env.local` has `DATABASE_URL` and no `DIRECT_URL`. The result is a
 * MIXTURE: `DATABASE_URL` local, `DIRECT_URL` still production. (3) prefers
 * `DIRECT_URL`, so `--env-file .env.local` connected to PRODUCTION while every
 * character of the invocation said local. It was caught only because an ad-hoc
 * probe carried its own localhost check.
 *
 * ── Why this module is structural and not another guard ───────────────────
 *
 * A guard bolted onto (3) would still be reading the mixture, and would still
 * depend on being remembered at every call site. This module removes the
 * mixture: when the operator names an env file, that FILE is the only source of
 * the connection string, and `process.env` is not consulted for it at all.
 * Because the value is read from disk rather than from the environment, the
 * import-order hazard that created the bug cannot express itself — it does not
 * matter what `@prisma/client` loaded, or when.
 *
 * What remains of "guarding" is the part that has to be a judgement call, and
 * every one of them REFUSES rather than picking for you:
 *
 *   • the named file supplies neither key   → refuse (this is the exact fall-
 *     through that reached production; there is no reading of the operator's
 *     intent under which continuing is right)
 *   • the named file is a `*.local` file but resolves to a remote host
 *                                            → refuse (the file and the target
 *     contradict each other)
 *   • the value will not parse as a URL      → refuse (fail closed; an
 *     unreadable target is when you least want to assume it is safe)
 *
 * And every successful run ANNOUNCES the host it resolved, plus any ambient
 * production URL it discarded, on stderr before a client is constructed. A
 * script that says `aws-1-ap-northeast-1.pooler.supabase.com` on its first line
 * cannot silently query production.
 *
 * Hosts only, never credentials: the password is never put in a banner, a note,
 * or an error message. There is a test for that.
 *
 * Sibling: `apps/api/scripts/guard-db-target.ts` gates the npm `pre*` hooks
 * (`predev`, `predb:*`, `preseed:*`). It answers "may this WRITE command run at
 * all"; this module answers "which database did the operator actually name".
 * `LOCAL_HOSTS` is duplicated between them deliberately — this file must be
 * loadable by bare `node` from a `.mjs` script, with no tsx and no build step —
 * and `resolve-db-target.test.ts` asserts the two sets stay in agreement.
 */
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

/** Thrown for every refusal. Callers catch this to exit 2 with the message. */
export class DbTargetError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DbTargetError';
  }
}

/**
 * Keep in sync with LOCAL_HOSTS in `apps/api/scripts/guard-db-target.ts`.
 * `resolve-db-target.test.ts` fails if they drift apart.
 */
export const LOCAL_HOSTS = ['localhost', '127.0.0.1', '::1', '0.0.0.0', 'host.docker.internal'];

/** DIRECT_URL first: pgbouncer in transaction mode breaks schema-level queries. */
export const URL_KEYS = ['DIRECT_URL', 'DATABASE_URL'];

/**
 * Minimal dotenv parser. Deliberately not a dependency: this must work from a
 * bare `node scripts/foo.mjs` with nothing installed but the workspace itself.
 *
 * Splits on the FIRST `=` only — Postgres URLs carry `?pgbouncer=true` and
 * passwords carry `=`, and a greedy split silently truncates both.
 */
export function parseEnvFileText(text) {
  const out = Object.create(null);
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.trim().replace(/^export\s+/, '');
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    let value = line.slice(eq + 1).trim();
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

/** Host only — the credentials are dropped here and never travel further. */
export function hostOf(url) {
  if (!url) return null;
  try {
    const host = new URL(url).hostname.replace(/^\[|\]$/g, '');
    return host || null;
  } catch {
    return null;
  }
}

export function isLocalHost(host) {
  return host !== null && LOCAL_HOSTS.includes(host);
}

/** `.env.local` / `.env.local.test` → true. `.env.production` → false. */
function namesALocalFile(envFile) {
  return basename(envFile).toLowerCase().split('.').includes('local');
}

function pick(vars) {
  for (const key of URL_KEYS) {
    const value = vars?.[key];
    if (value) return { key, url: value };
  }
  return null;
}

function argValue(argv, flag) {
  const i = argv.indexOf(flag);
  if (i === -1) return undefined;
  const value = argv[i + 1];
  if (!value || value.startsWith('--')) {
    throw new DbTargetError(`[db-target] ${flag} needs a path, e.g. ${flag} .env.production`);
  }
  return value;
}

/**
 * Resolve the connection string.
 *
 * @param {object}   opts
 * @param {string[]} opts.argv      argv slice, scanned for `--env-file PATH`
 * @param {object}   opts.env       ambient env, consulted ONLY when no file is named
 * @param {Function} opts.readFile  injected for tests; defaults to reading utf8 off disk
 * @param {boolean}  opts.requireLocal  refuse any non-local host (for write paths)
 * @returns {{url:string, key:string, host:string, local:boolean, envFile:string|null,
 *            source:string, ambient:{key:string,host:string}|null, diverged:boolean,
 *            notes:string[]}}
 * @throws  {DbTargetError} on every refusal listed in the module header
 */
export function resolveDbTarget({
  argv = [],
  env = {},
  readFile = (p) => readFileSync(p, 'utf8'),
  requireLocal = false,
} = {}) {
  const envFile = argValue(argv, '--env-file') ?? null;
  const ambientPick = pick(env);
  const ambient = ambientPick ? { key: ambientPick.key, host: hostOf(ambientPick.url) } : null;
  const notes = [];

  let chosen;
  let source;

  if (envFile) {
    let text;
    try {
      text = readFile(envFile);
    } catch (err) {
      throw new DbTargetError(
        `[db-target] Refusing to run: cannot read the env file you named, "${envFile}" ` +
          `(${err instanceof Error ? err.message : String(err)}). Nothing was resolved and no ` +
          'connection was attempted.',
      );
    }
    const vars = parseEnvFileText(text);
    chosen = pick(vars);

    if (!chosen) {
      // THE F456 FALL-THROUGH. The old code silently used `ambient` here.
      throw new DbTargetError(
        `[db-target] Refusing to run: you named --env-file "${envFile}", but that file defines ` +
          `neither ${URL_KEYS.join(' nor ')}.\n` +
          (ambient
            ? `  Resolved from the ambient environment instead, this run would have connected to ` +
              `"${ambient.host}" via ${ambient.key} — which @prisma/client loaded from apps/api/.env ` +
              `at import time, BEFORE "${envFile}" was read. That is OPS-14 (F456), and it is how a ` +
              `"--env-file ${envFile}" invocation silently queried PRODUCTION.\n` +
              `  You probably meant the database "${envFile}" describes. Add a ${URL_KEYS[0]}= line ` +
              `to it (or a ${URL_KEYS[1]}= line), or drop --env-file and target "${ambient.host}" ` +
              'deliberately.'
            : `  Add a ${URL_KEYS[0]}= or ${URL_KEYS[1]}= line to "${envFile}".`),
      );
    }
    source = `${chosen.key} in ${envFile}`;
  } else {
    if (!ambientPick) {
      throw new DbTargetError(
        `[db-target] Refusing to run: no ${URL_KEYS.join(' or ')} in the environment and no ` +
          '--env-file was named. Pass --env-file <path> so the target is stated, not inherited.',
      );
    }
    chosen = ambientPick;
    source = `${chosen.key} in the ambient environment (apps/api/.env, loaded by @prisma/client)`;
  }

  const host = hostOf(chosen.url);
  if (!host) {
    throw new DbTargetError(
      `[db-target] Refusing to run: ${source} is not a parseable connection URL. ` +
        'Failing closed — an unreadable target is exactly when you least want to assume it is safe.',
    );
  }
  const local = isLocalHost(host);

  if (envFile && namesALocalFile(envFile) && !local) {
    throw new DbTargetError(
      `[db-target] Refusing to run: you named --env-file "${envFile}", whose name says LOCAL, but ` +
        `its ${chosen.key} resolves to "${host}", which is not a local database ` +
        `(local = ${LOCAL_HOSTS.join(', ')}).\n` +
        '  The file and the invocation contradict each other. Fix the file, or name the env file ' +
        'that actually describes the database you want.',
    );
  }

  if (requireLocal && !local) {
    throw new DbTargetError(
      `[db-target] Refusing to run: this command may only target a local database, but ${source} ` +
        `resolves to "${host}".`,
    );
  }

  const diverged = Boolean(envFile && ambient && ambient.host && ambient.host !== host);
  if (diverged) {
    notes.push(
      `IGNORED the ambient ${ambient.key} pointing at "${ambient.host}" — @prisma/client loaded it ` +
        `from apps/api/.env at import time. "${envFile}" is the only source used for the connection ` +
        'string (OPS-14 / F456).',
    );
  }
  if (envFile && !local && !namesALocalFile(envFile)) {
    notes.push(`Target is REMOTE ("${host}"). Confirm this is the database you meant before proceeding.`);
  }

  return { url: chosen.url, key: chosen.key, host, local, envFile, source, ambient, diverged, notes };
}

/** One line, hosts only. Printed before any client is constructed. */
export function formatResolutionBanner(r) {
  const where = r.envFile ? r.envFile : 'ambient environment';
  const head = `[db-target] ${r.local ? 'LOCAL' : 'REMOTE'} ${r.host} — ${r.key} from ${where}`;
  return r.notes.length ? `${head}\n${r.notes.map((n) => `[db-target]   ${n}`).join('\n')}` : head;
}

/**
 * The call every script makes. Resolves, announces on stderr, and exits 2 with
 * the refusal message rather than throwing a stack trace at the operator.
 *
 * Also overlays the rest of the named env file onto `env` (SUPABASE_*, NODE_ENV
 * and friends), which the hand-rolled loops it replaces were also doing — but
 * the connection string has already been resolved from the file by then, so the
 * overlay can no longer decide anything.
 */
export function resolveDbTargetOrExit({
  argv = process.argv.slice(2),
  env = process.env,
  requireLocal = false,
  readFile = (p) => readFileSync(p, 'utf8'),
  write = (s) => process.stderr.write(`${s}\n`),
  exit = (code) => process.exit(code),
} = {}) {
  let resolved;
  try {
    resolved = resolveDbTarget({ argv, env, readFile, requireLocal });
  } catch (err) {
    if (err instanceof DbTargetError) {
      write(err.message);
      exit(2);
      return undefined;
    }
    throw err;
  }
  if (resolved.envFile) {
    let overlay = {};
    try {
      overlay = parseEnvFileText(readFile(resolved.envFile));
    } catch {
      overlay = {};
    }
    for (const [k, v] of Object.entries(overlay)) env[k] = v;
  }
  write(formatResolutionBanner(resolved));
  return resolved;
}
