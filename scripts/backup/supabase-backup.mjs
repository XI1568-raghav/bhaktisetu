#!/usr/bin/env node
/**
 * Daily Supabase Postgres backup → object store (Supabase Storage default,
 * S3-compatible R2/B2 swap via env).
 *
 * Spec: docs/roadmap/items/Q2/it/003-supabase-backup-automation-...md (R-Q2-IT-003)
 *
 * Steps:
 *   1. pg_dump $SUPABASE_DB_URL --format=custom --no-owner --no-privileges
 *      → /tmp/backup.dump
 *   2. compute SHA256 + size
 *   3. upload via Supabase Storage REST API
 *      key: backups/YYYY/MM/DD/bhaktisetu-<ISO>.dump
 *   4. (optional) POST $HEARTBEAT_URL on success — cron healthcheck
 *
 * Env (all optional — script no-ops + exits 0 with structured log when
 * vendor creds are missing, so CI doesn't go red before founder pastes secrets):
 *   SUPABASE_DB_URL                 — postgres URL with sslmode=require
 *   SUPABASE_URL                    — https://<project>.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY       — service-role JWT (NEVER ship to client)
 *   SUPABASE_BACKUP_BUCKET          — default "db-backups"
 *   HEARTBEAT_URL                   — optional healthchecks.io URL
 *
 * Output: single-line JSON to stdout (GH Actions parse-friendly).
 *
 * NOTE: exported helpers (buildPgDumpArgs, buildBackupKey) are pure and
 *       tested in scripts/backup/test/backup.test.mjs.
 */

import { spawn } from 'node:child_process';
import { createReadStream, existsSync, mkdirSync, statSync, unlinkSync } from 'node:fs';
import { createHash, createHmac } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const DEFAULT_BUCKET = 'db-backups';

/**
 * OPS-02 — a dump smaller than this is not a restore point.
 *
 * A `pg_dump --format=custom` of this schema (100+ tables) is megabytes. 64 KiB
 * is far below any real dump and far above the 0-byte / few-hundred-byte files
 * that a truncated or failed dump leaves behind. Override with BACKUP_MIN_BYTES
 * only if you know why.
 */
export const MIN_DUMP_BYTES = 65_536;

/**
 * OPS-02 — a custom-format archive whose table of contents has fewer entries
 * than this is not this database. The real schema yields hundreds.
 */
export const MIN_TOC_ENTRIES = 50;

/**
 * Build pg_dump CLI args.
 * Custom format (`--format=custom`) is the recommended pg_restore-friendly
 * binary dump. No-owner/no-privileges keep the dump portable across Supabase
 * tiers + restore targets.
 */
export function buildPgDumpArgs(databaseUrl, outPath) {
  if (!databaseUrl) throw new Error('buildPgDumpArgs: databaseUrl required');
  if (!outPath) throw new Error('buildPgDumpArgs: outPath required');
  return [
    '--no-owner',
    '--no-privileges',
    '--format=custom',
    '-f',
    outPath,
    databaseUrl,
  ];
}

/**
 * Shape: backups/YYYY/MM/DD/bhaktisetu-<ISO with colons+dots replaced by '-'>.dump
 * Colons are illegal in many object-store keys → replace with '-'.
 */
export function buildBackupKey(date = new Date()) {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const iso = date.toISOString().replace(/[:.]/g, '-');
  return `backups/${yyyy}/${mm}/${dd}/bhaktisetu-${iso}.dump`;
}

// ───────────────────────────────────────────────────────────────────────────
// OPS-02 — integrity. "The script exited 0" is not evidence of a backup.
// ───────────────────────────────────────────────────────────────────────────

/**
 * Count entries in `pg_restore --list` output.
 *
 * The listing is a comment preamble (every line starting `;`) followed by one
 * line per TOC entry, each beginning `<id>; <catalog> <oid> <TYPE> ...`. Zero
 * entries means pg_restore could not read the file as an archive at all — which
 * is exactly what a truncated upload or a half-written dump looks like.
 */
export function countTocEntries(listing) {
  if (!listing) return 0;
  let n = 0;
  for (const line of String(listing).split('\n')) {
    if (/^\s*\d+;\s/.test(line)) n += 1;
  }
  return n;
}

/**
 * Is this file a usable restore point?
 *
 * Until 2026-08-21 nothing asked. `runBackup` stat'd the file, hashed it,
 * uploaded it and returned `{ok:true}` — for a 0-byte file as readily as for a
 * real dump. Both halves matter: size catches a dump that never got written,
 * TOC entries catch a file that is the right size but is not a readable archive
 * (truncation) or is a dump of the wrong, empty database.
 */
export function assessDump({
  sizeBytes,
  tocEntries,
  minBytes = MIN_DUMP_BYTES,
  minTocEntries = MIN_TOC_ENTRIES,
}) {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return { ok: false, reason: 'dump is empty (0 bytes) — no restore point was produced' };
  }
  if (sizeBytes < minBytes) {
    return {
      ok: false,
      reason: `dump is ${sizeBytes} bytes, below the ${minBytes}-byte floor — almost certainly truncated`,
    };
  }
  if (!Number.isFinite(tocEntries) || tocEntries <= 0) {
    return {
      ok: false,
      reason: 'pg_restore could not enumerate the archive (0 TOC entries) — not a valid dump',
    };
  }
  if (tocEntries < minTocEntries) {
    return {
      ok: false,
      reason: `archive holds only ${tocEntries} TOC entries, below the ${minTocEntries} expected — wrong or empty database`,
    };
  }
  return { ok: true, reason: null };
}

/** `pg_restore --list` on the dump. Returns raw stdout; caller counts entries. */
async function pgRestoreList(dumpPath) {
  return new Promise((resolve) => {
    const proc = spawn('pg_restore', ['--list', dumpPath], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    proc.stdout.on('data', (c) => {
      out += c.toString();
    });
    proc.stderr.on('data', () => {});
    proc.on('error', () => resolve(''));
    proc.on('close', () => resolve(out));
  });
}

// ───────────────────────────────────────────────────────────────────────────
// OPS-03 — a backup inside the account it insures is not a backup.
// ───────────────────────────────────────────────────────────────────────────

/** `https://<ref>.supabase.co` -> `<ref>`, else null. */
export function projectRefFromSupabaseUrl(url) {
  if (!url) return null;
  const m = /^https?:\/\/([a-z0-9]{8,})\.supabase\.(?:co|in)\b/i.exec(String(url).trim());
  return m ? m[1].toLowerCase() : null;
}

/**
 * Extract the Supabase project ref from a Postgres DSN. Two shapes:
 *   direct  postgresql://postgres:PW@db.<ref>.supabase.co:5432/postgres
 *   pooled  postgresql://postgres.<ref>:PW@aws-0-<region>.pooler.supabase.com:6543/postgres
 * Returns null for anything else (local dev, a self-hosted Postgres).
 */
export function projectRefFromDatabaseUrl(dsn) {
  if (!dsn) return null;
  const s = String(dsn);
  const direct = /@db\.([a-z0-9]{8,})\.supabase\.(?:co|in)\b/i.exec(s);
  if (direct) return direct[1].toLowerCase();
  const user = /^postgres(?:ql)?:\/\/([^:@/]+)[:@]/i.exec(s);
  if (user) {
    const pooled = /^postgres\.([a-z0-9]{8,})$/i.exec(decodeURIComponent(user[1]));
    if (pooled) return pooled[1].toLowerCase();
  }
  return null;
}

/**
 * Decide where this dump goes, and whether that constitutes insurance.
 *
 * The failure this prevents: the only configured destination is Supabase
 * Storage in the SAME project as SUPABASE_DB_URL. One suspension, one deleted
 * project, one billing dispute takes the database and every backup of it in a
 * single action — which is precisely what happened to the Render account on
 * 2026-08-17, on a different vendor, for the same structural reason.
 *
 * Returns { targets, sameProject, offsite, fatal, message }.
 */
export function planDestinations(env = process.env) {
  const targets = [];

  const hasSupabase = Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
  if (hasSupabase) {
    targets.push({
      kind: 'supabase',
      bucket: env.SUPABASE_BACKUP_BUCKET || DEFAULT_BUCKET,
    });
  }

  const hasS3 = Boolean(
    env.BACKUP_S3_ENDPOINT &&
      env.BACKUP_S3_BUCKET &&
      env.BACKUP_S3_ACCESS_KEY_ID &&
      env.BACKUP_S3_SECRET_ACCESS_KEY,
  );
  if (hasS3) {
    targets.push({
      kind: 's3',
      bucket: env.BACKUP_S3_BUCKET,
      endpoint: env.BACKUP_S3_ENDPOINT,
      region: env.BACKUP_S3_REGION || 'auto',
    });
  }

  const dbRef = projectRefFromDatabaseUrl(env.SUPABASE_DB_URL);
  const storeRef = projectRefFromSupabaseUrl(env.SUPABASE_URL);
  const sameProject = hasSupabase && Boolean(dbRef) && dbRef === storeRef;

  // Offsite = at least one copy lands somewhere the primary project's loss
  // cannot reach. A different Supabase project is weaker than a different
  // vendor but is still a different project; S3-compatible is the real answer.
  const offsite = hasS3 || (hasSupabase && !sameProject);

  if (targets.length === 0) {
    return {
      targets,
      sameProject,
      offsite: false,
      fatal: true,
      message:
        'No backup destination is configured. Set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY, ' +
        'or the four BACKUP_S3_* variables.',
    };
  }

  if (!offsite) {
    const acknowledged = env.ALLOW_SAME_PROJECT_BACKUP === 'true';
    return {
      targets,
      sameProject,
      offsite: false,
      fatal: !acknowledged,
      message: acknowledged
        ? `Backup is being written into the same Supabase project (${dbRef}) as the database ` +
          'it backs up. This copy is NOT protected against loss of that project or that ' +
          'account. Configure BACKUP_S3_* for a real offsite copy.'
        : `Refusing to run: the only destination is the same Supabase project (${dbRef}) as ` +
          'SUPABASE_DB_URL, so one account action destroys the database and every backup of ' +
          'it together. Configure BACKUP_S3_* (Cloudflare R2 free tier works), or set ' +
          'ALLOW_SAME_PROJECT_BACKUP=true to accept a same-project copy knowingly.',
    };
  }

  return { targets, sameProject, offsite: true, fatal: false, message: null };
}

// ── SigV4, so BACKUP_S3_* is a working destination rather than a promise ────

const EMPTY_HASH_ALGO = 'sha256';

function hmac(key, data) {
  return createHmac(EMPTY_HASH_ALGO, key).update(data, 'utf8').digest();
}

/** AWS SigV4 signing key: HMAC chain over date / region / service / terminator. */
export function sigv4SigningKey(secretAccessKey, dateStamp, region, service) {
  const kDate = hmac(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  return hmac(kService, 'aws4_request');
}

/** `encodeURIComponent` leaves these five alone; SigV4 requires them encoded. */
const S3_EXTRA_ESCAPES = /[!'()*]/g;

/** Encode a path for the canonical request: encode segments, keep separators. */
function canonicalizePath(path) {
  return path
    .split('/')
    .map((seg) =>
      encodeURIComponent(seg).replace(
        S3_EXTRA_ESCAPES,
        (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
      ),
    )
    .join('/');
}

/**
 * Build the SigV4 Authorization header for a single-shot S3 PUT.
 * Returns the headers plus the intermediate strings, so a test can assert the
 * canonical request rather than only the opaque signature.
 */
export function buildS3Authorization({
  method,
  host,
  canonicalUri,
  region,
  accessKeyId,
  secretAccessKey,
  amzDate,
  payloadHash,
  contentLength,
  service = 's3',
}) {
  const dateStamp = amzDate.slice(0, 8);
  const uri = canonicalizePath(canonicalUri);

  const canonicalHeaders =
    `content-length:${contentLength}\n` +
    `host:${host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`;
  const signedHeaders = 'content-length;host;x-amz-content-sha256;x-amz-date';

  const canonicalRequest = [
    method,
    uri,
    '',
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const scope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    scope,
    createHash(EMPTY_HASH_ALGO).update(canonicalRequest, 'utf8').digest('hex'),
  ].join('\n');

  const signature = createHmac(
    EMPTY_HASH_ALGO,
    sigv4SigningKey(secretAccessKey, dateStamp, region, service),
  )
    .update(stringToSign, 'utf8')
    .digest('hex');

  return {
    canonicalRequest,
    stringToSign,
    headers: {
      Authorization:
        `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, ` +
        `SignedHeaders=${signedHeaders}, Signature=${signature}`,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
      'Content-Length': String(contentLength),
      Host: host,
    },
  };
}

function envGate() {
  const missing = [];
  if (!process.env.SUPABASE_DB_URL) missing.push('SUPABASE_DB_URL');
  // A destination is required, but either kind will do. Naming the Supabase
  // pair keeps the message actionable for the default setup.
  if (planDestinations(process.env).targets.length === 0) {
    for (const k of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']) {
      if (!process.env[k]) missing.push(k);
    }
  }
  return missing;
}

async function runPgDump(databaseUrl, outPath) {
  return new Promise((resolve, reject) => {
    const args = buildPgDumpArgs(databaseUrl, outPath);
    const proc = spawn('pg_dump', args, { stdio: ['ignore', 'inherit', 'pipe'] });
    let stderr = '';
    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    proc.on('error', (err) => reject(err));
    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`pg_dump exited ${code}: ${stderr.slice(-400)}`));
        return;
      }
      resolve();
    });
  });
}

async function sha256File(path) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(path);
    stream.on('error', reject);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

/**
 * Upload dump to Supabase Storage via REST POST.
 * Endpoint: POST {SUPABASE_URL}/storage/v1/object/{bucket}/{key}
 * Auth: service-role JWT in Authorization: Bearer + apikey header.
 */
async function uploadToSupabaseStorage(localPath, key, sizeBytes) {
  const supabaseUrl = process.env.SUPABASE_URL.replace(/\/$/, '');
  const bucket = process.env.SUPABASE_BACKUP_BUCKET || DEFAULT_BUCKET;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = `${supabaseUrl}/storage/v1/object/${bucket}/${encodeURI(key)}`;

  const body = createReadStream(localPath);
  // Node 20+ fetch streams ReadableStream from fs via duplex: 'half'.
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/octet-stream',
      'Content-Length': String(sizeBytes),
      'x-upsert': 'true',
    },
    body,
    duplex: 'half',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Supabase Storage upload ${res.status}: ${text.slice(0, 300)}`);
  }
  return { bucket, key };
}

/**
 * OPS-02 — read the object back and confirm its size.
 *
 * A 200 from the upload endpoint is the server saying it accepted the request,
 * not that N bytes are durably stored under that key. Ask.
 */
async function verifySupabaseObject(key, expectedBytes) {
  const supabaseUrl = process.env.SUPABASE_URL.replace(/\/$/, '');
  const bucket = process.env.SUPABASE_BACKUP_BUCKET || DEFAULT_BUCKET;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const res = await fetch(
    `${supabaseUrl}/storage/v1/object/${bucket}/${encodeURI(key)}`,
    { method: 'HEAD', headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
  );
  if (!res.ok) throw new Error(`Supabase Storage verify ${res.status} for ${bucket}/${key}`);
  const got = Number(res.headers.get('content-length'));
  if (Number.isFinite(got) && got > 0 && got !== expectedBytes) {
    throw new Error(
      `Supabase Storage verify size mismatch for ${bucket}/${key}: stored ${got}, expected ${expectedBytes}`,
    );
  }
  return { bucket, key, verifiedBytes: Number.isFinite(got) ? got : expectedBytes };
}

/**
 * OPS-03 — upload to any S3-compatible object store (Cloudflare R2, Backblaze
 * B2, AWS S3). This is the offsite copy: a different vendor, a different
 * account, unreachable by whatever takes the Supabase project down.
 *
 * Single-shot PUT with SigV4. Dumps of this database are tens of MB, far below
 * the 5 GB single-PUT ceiling.
 */
async function uploadToS3Compatible(localPath, key, sizeBytes, payloadHash, target) {
  const endpoint = target.endpoint.replace(/\/$/, '');
  const { host } = new URL(endpoint);
  const canonicalUri = `/${target.bucket}/${key}`;
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');

  const { headers } = buildS3Authorization({
    method: 'PUT',
    host,
    canonicalUri,
    region: target.region,
    accessKeyId: process.env.BACKUP_S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.BACKUP_S3_SECRET_ACCESS_KEY,
    amzDate,
    payloadHash,
    contentLength: sizeBytes,
  });
  // `Host` is set by fetch itself and is rejected as a forbidden header.
  delete headers.Host;

  // Debugging note for a 403 SignatureDoesNotMatch: `content-length` is a
  // SIGNED header here (standard, and what the AWS CLI does), and the body is a
  // stream. undici only sends an explicit Content-Length instead of chunked
  // transfer-encoding because we set the header by hand above — if a future
  // Node release starts overriding it, the signature stops matching and this is
  // the line to look at. Drop 'content-length' from the signed set in
  // buildS3Authorization if so.

  const res = await fetch(`${endpoint}${canonicalUri}`, {
    method: 'PUT',
    headers,
    body: createReadStream(localPath),
    duplex: 'half',
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`S3 upload ${res.status} to ${host}${canonicalUri}: ${text.slice(0, 300)}`);
  }
  return { bucket: target.bucket, key, endpoint, verifiedBytes: sizeBytes };
}

async function pingHeartbeat(success, payload) {
  const url = process.env.HEARTBEAT_URL;
  if (!url) return;
  try {
    await fetch(success ? url : `${url}/fail`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    // best-effort
  }
}

export async function runBackup({ now = new Date() } = {}) {
  const missing = envGate();
  if (missing.length > 0) {
    const skipped = {
      ok: true,
      skipped: true,
      reason: 'missing-env',
      missing,
      note: 'Founder must set SUPABASE_DB_URL + SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY GH Actions secrets.',
    };
    console.log(JSON.stringify(skipped));
    return skipped;
  }

  // OPS-03 — decide, and refuse, BEFORE spending 5 minutes dumping a database
  // into a bucket that insures nothing.
  const plan = planDestinations(process.env);
  if (plan.fatal) {
    const fail = {
      ok: false,
      stage: 'destination',
      error: plan.message,
      sameProject: plan.sameProject,
      offsite: plan.offsite,
    };
    console.error(JSON.stringify(fail));
    await pingHeartbeat(false, fail);
    process.exitCode = 5;
    return fail;
  }

  const workDir = join(tmpdir(), 'bhaktisetu-backup');
  if (!existsSync(workDir)) mkdirSync(workDir, { recursive: true });
  const dumpPath = join(workDir, 'backup.dump');

  const startedAt = Date.now();
  try {
    await runPgDump(process.env.SUPABASE_DB_URL, dumpPath);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const fail = { ok: false, stage: 'pg_dump', error: msg };
    console.error(JSON.stringify(fail));
    await pingHeartbeat(false, fail);
    process.exitCode = 2;
    return fail;
  }

  let sizeBytes = 0;
  let sha256 = '';
  try {
    sizeBytes = statSync(dumpPath).size;
    sha256 = await sha256File(dumpPath);
  } catch (err) {
    const fail = { ok: false, stage: 'hash', error: err instanceof Error ? err.message : String(err) };
    console.error(JSON.stringify(fail));
    await pingHeartbeat(false, fail);
    process.exitCode = 3;
    return fail;
  }

  // OPS-02 — the file exists and has a size. Is it a RESTORE POINT? Until now
  // nothing asked, and `{"ok":true}` meant no more than "pg_dump exited 0".
  const tocEntries = countTocEntries(await pgRestoreList(dumpPath));
  const verdict = assessDump({
    sizeBytes,
    tocEntries,
    minBytes: Number(process.env.BACKUP_MIN_BYTES) || MIN_DUMP_BYTES,
  });
  if (!verdict.ok) {
    const fail = {
      ok: false,
      stage: 'verify-dump',
      error: verdict.reason,
      sizeBytes,
      tocEntries,
    };
    console.error(JSON.stringify(fail));
    await pingHeartbeat(false, fail);
    try { unlinkSync(dumpPath); } catch { /* best-effort */ }
    process.exitCode = 6;
    return fail;
  }

  const key = buildBackupKey(now);
  const destinations = [];
  try {
    for (const target of plan.targets) {
      if (target.kind === 'supabase') {
        await uploadToSupabaseStorage(dumpPath, key, sizeBytes);
        // OPS-02 — a 200 is not a stored object. Read it back.
        const verified = await verifySupabaseObject(key, sizeBytes);
        destinations.push({ kind: 'supabase', ...verified });
      } else {
        const verified = await uploadToS3Compatible(dumpPath, key, sizeBytes, sha256, target);
        destinations.push({ kind: 's3', ...verified });
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const fail = { ok: false, stage: 'upload', error: msg, key, sizeBytes, destinations };
    console.error(JSON.stringify(fail));
    await pingHeartbeat(false, fail);
    process.exitCode = 4;
    return fail;
  } finally {
    try { unlinkSync(dumpPath); } catch { /* best-effort */ }
  }

  const elapsedMs = Date.now() - startedAt;
  const result = {
    ok: true,
    // Kept for the existing consumers of this JSON; `destinations` is the
    // complete answer once more than one target is configured.
    bucket: destinations[0].bucket,
    key,
    destinations,
    offsite: plan.offsite,
    sameProject: plan.sameProject,
    sizeBytes,
    tocEntries,
    sha256,
    elapsedMs,
    date: now.toISOString().slice(0, 10),
    ...(plan.message ? { warning: plan.message } : {}),
  };
  console.log(JSON.stringify(result));
  await pingHeartbeat(true, result);
  return result;
}

// CLI entrypoint
const isMain =
  import.meta.url === `file://${process.argv[1]}` ||
  (process.argv[1] && process.argv[1].endsWith('supabase-backup.mjs'));
if (isMain) {
  runBackup().catch((err) => {
    console.error(JSON.stringify({ ok: false, stage: 'unhandled', error: err instanceof Error ? err.message : String(err) }));
    process.exit(1);
  });
}
