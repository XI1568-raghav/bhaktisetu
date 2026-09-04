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
 * DERIVATION (measured 2026-09-04, not guessed — the previous comment here
 * asserted "100+ tables ... is megabytes" without a number behind it):
 *
 *   apps/api/prisma/baseline/0_init.sql   77,006 bytes of raw DDL
 *   the same file at gzip -9              10,058 bytes
 *   models in apps/api/prisma/schema.prisma   69
 *
 * `pg_dump --format=custom` zlib-compresses at level 6 — weaker than gzip -9 —
 * so an archive of THIS schema holding ZERO ROWS still cannot come in under
 * ~10 KiB of compressed DDL, plus the archive header and the per-entry framing
 * for 69 tables and their indexes, constraints and sequences.
 *
 * The floor is set at 64 KiB: roughly 6.5x that schema-only lower bound. Two
 * properties follow, and both are wanted:
 *
 *   - a dump carrying only the schema and none of the bookings, payments or
 *     80G donation records is REJECTED, because restoring it would produce an
 *     empty product, not a recovered one;
 *   - any dump that does carry this database's rows is orders of magnitude
 *     above the floor, so the check cannot go off by accident.
 *
 * Re-derive rather than nudge: `wc -c apps/api/prisma/baseline/0_init.sql`.
 * Override with BACKUP_MIN_BYTES only if you know why.
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
 * OPS-02 — tables the archive MUST contain to be a backup of THIS product.
 *
 * A TOC entry count only proves the file is an archive of something. These five
 * names prove it is an archive of Darshya: identity, the temple catalogue, the
 * puja catalogue, and the two ledgers that carry money and 80G donation records.
 * A dump of an empty project, of a scratch database, or of the wrong Supabase
 * project passes the count and fails here.
 *
 * Every name is a real `@@map` in apps/api/prisma/schema.prisma, and
 * test/backup-verification.test.mjs re-checks that against the schema file on
 * every run — so renaming a table breaks the test loudly instead of leaving this
 * guard quietly looking for something that no longer exists.
 */
export const EXPECTED_TABLES = ['users', 'temples', 'puja_types', 'commissions', 'donations'];

/**
 * Table names named by a `pg_restore --list` listing.
 *
 * Entry lines look like:
 *   215;  1259 16456 TABLE public users postgres
 *   3410; 0    16456 TABLE DATA public users postgres
 */
export function tablesInListing(listing) {
  const found = new Set();
  for (const line of String(listing || '').split('\n')) {
    const m = /^\s*\d+;\s+\d+\s+\d+\s+TABLE\s+(?:DATA\s+)?\S+\s+(\S+)/.exec(line);
    if (m) found.add(m[1]);
  }
  return found;
}

/** Which of `expected` the archive does NOT contain. Empty array means all present. */
export function findMissingTables(listing, expected = EXPECTED_TABLES) {
  const found = tablesInListing(listing);
  return expected.filter((t) => !found.has(t));
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

/**
 * Did the object survive the trip? Pure, so the decision is testable without a
 * network.
 *
 * The bug this replaces read `got > 0 && got !== expectedBytes`, which excluded
 * the one value that most needed to fail: a store reporting the object as ZERO
 * BYTES took the "no mismatch" branch and the run reported success. A HEAD with
 * no `content-length` header at all took the same branch, because `Number(null)`
 * is `0`.
 *
 * The three outcomes are deliberately distinct:
 *   - sizes agree                -> ok, verified
 *   - sizes disagree, or 0 bytes -> NOT ok. There is no object.
 *   - no usable header           -> ok, but NOT verified.
 *
 * The last one is not fatal on purpose. A store that never returns
 * `content-length` would otherwise make this job permanently red, and a job
 * that is always partly red teaches its reader that red is normal — which is
 * how the render-hours-guard false alarm ended up muting the real alarm. It is
 * reported as `verified: false` and surfaced in the workflow summary instead,
 * so the gap is visible without being an alarm.
 */
export function assessStoredObject({ contentLength, expectedBytes }) {
  const raw = contentLength === null || contentLength === undefined ? null : String(contentLength).trim();
  const n = raw === null || raw === '' ? NaN : Number(raw);

  if (!Number.isFinite(n)) {
    return {
      ok: true,
      verified: false,
      bytes: null,
      reason:
        'the object store returned no usable content-length, so the stored size could not be confirmed',
    };
  }
  if (n === 0) {
    return {
      ok: false,
      verified: false,
      bytes: 0,
      reason: `the object store reports this key as 0 bytes — nothing was stored (expected ${expectedBytes})`,
    };
  }
  if (n !== expectedBytes) {
    return {
      ok: false,
      verified: false,
      bytes: n,
      reason: `stored size ${n} does not match the ${expectedBytes} bytes uploaded — the object is truncated`,
    };
  }
  return { ok: true, verified: true, bytes: n, reason: null };
}

/**
 * `pg_restore --list` on the dump.
 *
 * Returns `{ available, code, stdout }` rather than a bare string, because the
 * caller has to tell two very different things apart. Collapsing them was the
 * render-hours-guard mistake in miniature: when `pg_restore` was absent from
 * the runner this resolved `''`, the TOC count came out 0, and the operator was
 * told "not a valid dump" about an archive that may have been perfect. A
 * missing checker is not a corrupt artifact, and saying so costs credibility
 * that the real alarm later needs.
 */
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
    // ENOENT here means the binary is not on PATH at all.
    proc.on('error', () => resolve({ available: false, code: null, stdout: '' }));
    proc.on('close', (code) => resolve({ available: true, code, stdout: out }));
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

  // A HEAD read-back has no body, so there is no content-length to sign. Only
  // that case changes shape — a PUT signs exactly the header set it always did.
  const hasBody = contentLength !== undefined && contentLength !== null;

  const canonicalHeaders =
    (hasBody ? `content-length:${contentLength}\n` : '') +
    `host:${host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`;
  const signedHeaders = hasBody
    ? 'content-length;host;x-amz-content-sha256;x-amz-date'
    : 'host;x-amz-content-sha256;x-amz-date';

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
      ...(hasBody ? { 'Content-Length': String(contentLength) } : {}),
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
async function uploadToSupabaseStorage(localPath, key, sizeBytes, doFetch = fetch) {
  const supabaseUrl = process.env.SUPABASE_URL.replace(/\/$/, '');
  const bucket = process.env.SUPABASE_BACKUP_BUCKET || DEFAULT_BUCKET;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = `${supabaseUrl}/storage/v1/object/${bucket}/${encodeURI(key)}`;

  const body = createReadStream(localPath);
  // Node 20+ fetch streams ReadableStream from fs via duplex: 'half'.
  const res = await doFetch(url, {
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
async function verifySupabaseObject(key, expectedBytes, doFetch = fetch) {
  const supabaseUrl = process.env.SUPABASE_URL.replace(/\/$/, '');
  const bucket = process.env.SUPABASE_BACKUP_BUCKET || DEFAULT_BUCKET;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const res = await doFetch(
    `${supabaseUrl}/storage/v1/object/${bucket}/${encodeURI(key)}`,
    { method: 'HEAD', headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
  );
  if (!res.ok) throw new Error(`Supabase Storage verify ${res.status} for ${bucket}/${key}`);

  const verdict = assessStoredObject({
    contentLength: res.headers.get('content-length'),
    expectedBytes,
  });
  if (!verdict.ok) {
    throw new Error(`Supabase Storage verify failed for ${bucket}/${key}: ${verdict.reason}`);
  }
  // `verifiedBytes` stays null when nothing was verified. It previously fell
  // back to `expectedBytes`, i.e. it echoed our own local number back as though
  // the store had confirmed it.
  return {
    bucket,
    key,
    verified: verdict.verified,
    verifiedBytes: verdict.bytes,
    ...(verdict.reason ? { note: verdict.reason } : {}),
  };
}

/**
 * OPS-02/OPS-03 — read the OFFSITE object back too.
 *
 * This is the copy that exists precisely because the Supabase project may be
 * gone, and until now it was the only destination with no read-back at all:
 * `uploadToS3Compatible` returned `verifiedBytes: sizeBytes` — the local number,
 * under a field name that claimed the store had confirmed it.
 */
async function verifyS3Object(key, expectedBytes, target, doFetch = fetch) {
  const endpoint = target.endpoint.replace(/\/$/, '');
  const { host } = new URL(endpoint);
  const canonicalUri = `/${target.bucket}/${key}`;
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  // SigV4 payload hash for a request with no body.
  const EMPTY_PAYLOAD_SHA256 =
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

  const { headers } = buildS3Authorization({
    method: 'HEAD',
    host,
    canonicalUri,
    region: target.region,
    accessKeyId: process.env.BACKUP_S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.BACKUP_S3_SECRET_ACCESS_KEY,
    amzDate,
    payloadHash: EMPTY_PAYLOAD_SHA256,
  });
  delete headers.Host;

  const res = await doFetch(`${endpoint}${canonicalUri}`, { method: 'HEAD', headers });
  if (!res.ok) {
    throw new Error(`S3 verify ${res.status} for ${host}${canonicalUri}`);
  }
  const verdict = assessStoredObject({
    contentLength: res.headers.get('content-length'),
    expectedBytes,
  });
  if (!verdict.ok) {
    throw new Error(`S3 verify failed for ${host}${canonicalUri}: ${verdict.reason}`);
  }
  return {
    bucket: target.bucket,
    key,
    endpoint,
    verified: verdict.verified,
    verifiedBytes: verdict.bytes,
    ...(verdict.reason ? { note: verdict.reason } : {}),
  };
}

/**
 * OPS-03 — upload to any S3-compatible object store (Cloudflare R2, Backblaze
 * B2, AWS S3). This is the offsite copy: a different vendor, a different
 * account, unreachable by whatever takes the Supabase project down.
 *
 * Single-shot PUT with SigV4. Dumps of this database are tens of MB, far below
 * the 5 GB single-PUT ceiling.
 */
async function uploadToS3Compatible(localPath, key, sizeBytes, payloadHash, target, doFetch = fetch) {
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

  const res = await doFetch(`${endpoint}${canonicalUri}`, {
    method: 'PUT',
    headers,
    body: createReadStream(localPath),
    duplex: 'half',
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`S3 upload ${res.status} to ${host}${canonicalUri}: ${text.slice(0, 300)}`);
  }
  // The caller reads the object back; this function no longer claims to have.
  return { bucket: target.bucket, key, endpoint };
}

async function pingHeartbeat(success, payload, doFetch = fetch) {
  const url = process.env.HEARTBEAT_URL;
  if (!url) return;
  try {
    await doFetch(success ? url : `${url}/fail`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    // best-effort
  }
}

/**
 * `deps` exists so the guards below can be driven in a test without a Postgres,
 * a network, or a Supabase project. Defaults are the real implementations, so
 * production behaviour is unchanged by its presence.
 */
export async function runBackup({ now = new Date(), deps = {} } = {}) {
  const {
    pgDump = runPgDump,
    pgRestoreList: listArchive = pgRestoreList,
    fetch: doFetch = fetch,
  } = deps;

  const missing = envGate();
  if (missing.length > 0) {
    // NOT `ok: true`.
    //
    // This used to report success and exit 0, on the reasoning that an
    // unconfigured repo should not send failure mail. The effect was that a
    // product holding bookings, payments and 80G donation records reported a
    // green backup every night for months while taking none, and no reader of
    // the checkmark could have discovered it.
    //
    // "Not configured" and "configured but broken" both mean THERE IS NO
    // RESTORE POINT FOR TODAY, so both fail. They stay tellable apart by
    // `skipped: true`, the `missing` list, and exit code 7 (vs 2-6 for a real
    // failure), which is what the workflow uses to print a different summary.
    //
    // This is not the always-red trap: it is red until the secrets are set,
    // once, and then never again — unlike a check that reports red as its
    // steady state and thereby trains its reader to ignore it.
    const skipped = {
      ok: false,
      skipped: true,
      reason: 'missing-env',
      missing,
      note: 'Founder must set SUPABASE_DB_URL + SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY GH Actions secrets.',
      error: `No backup was taken: ${missing.join(', ')} not set. There is no restore point for today.`,
    };
    console.error(JSON.stringify(skipped));
    process.exitCode = 7;
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
    await pingHeartbeat(false, fail, doFetch);
    process.exitCode = 5;
    return fail;
  }

  const workDir = join(tmpdir(), 'bhaktisetu-backup');
  if (!existsSync(workDir)) mkdirSync(workDir, { recursive: true });
  const dumpPath = join(workDir, 'backup.dump');

  const startedAt = Date.now();
  try {
    await pgDump(process.env.SUPABASE_DB_URL, dumpPath);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const fail = { ok: false, stage: 'pg_dump', error: msg };
    console.error(JSON.stringify(fail));
    await pingHeartbeat(false, fail, doFetch);
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
    await pingHeartbeat(false, fail, doFetch);
    process.exitCode = 3;
    return fail;
  }

  // OPS-02 — the file exists and has a size. Is it a RESTORE POINT? Until now
  // nothing asked, and `{"ok":true}` meant no more than "pg_dump exited 0".
  const listing = await listArchive(dumpPath);

  // A missing checker is not a corrupt artifact. Fail closed — an unverifiable
  // dump is not a proven restore point — but say which of the two it is, so the
  // operator does not go looking for a database problem that is a runner
  // problem.
  if (!listing.available) {
    const fail = {
      ok: false,
      stage: 'verify-tooling',
      error:
        'pg_restore is not on PATH, so the dump could not be checked for readability. ' +
        'The dump itself may be fine; install postgresql-client on the runner and re-run.',
      sizeBytes,
    };
    console.error(JSON.stringify(fail));
    await pingHeartbeat(false, fail, doFetch);
    try { unlinkSync(dumpPath); } catch { /* best-effort */ }
    process.exitCode = 8;
    return fail;
  }

  const tocEntries = countTocEntries(listing.stdout);
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
    await pingHeartbeat(false, fail, doFetch);
    try { unlinkSync(dumpPath); } catch { /* best-effort */ }
    process.exitCode = 6;
    return fail;
  }

  // OPS-02 — an archive of SOMETHING is not an archive of this product. The
  // count above would be satisfied by a dump of any database with enough
  // objects in it; these names are the ones a restore has to bring back.
  const missingTables = findMissingTables(listing.stdout);
  if (missingTables.length > 0) {
    const fail = {
      ok: false,
      stage: 'verify-schema',
      error:
        `the archive does not contain ${missingTables.join(', ')} — it parses, but it is not ` +
        'a dump of this database. Check that SUPABASE_DB_URL points at production.',
      sizeBytes,
      tocEntries,
      missingTables,
    };
    console.error(JSON.stringify(fail));
    await pingHeartbeat(false, fail, doFetch);
    try { unlinkSync(dumpPath); } catch { /* best-effort */ }
    process.exitCode = 9;
    return fail;
  }

  const key = buildBackupKey(now);
  const destinations = [];
  try {
    for (const target of plan.targets) {
      if (target.kind === 'supabase') {
        await uploadToSupabaseStorage(dumpPath, key, sizeBytes, doFetch);
        // OPS-02 — a 200 is not a stored object. Read it back.
        const verified = await verifySupabaseObject(key, sizeBytes, doFetch);
        destinations.push({ kind: 'supabase', ...verified });
      } else {
        const uploaded = await uploadToS3Compatible(dumpPath, key, sizeBytes, sha256, target, doFetch);
        // OPS-02 — the offsite copy gets the same read-back, not a promise.
        const verified = await verifyS3Object(key, sizeBytes, target, doFetch);
        destinations.push({ kind: 's3', ...uploaded, ...verified });
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const fail = { ok: false, stage: 'upload', error: msg, key, sizeBytes, destinations };
    console.error(JSON.stringify(fail));
    await pingHeartbeat(false, fail, doFetch);
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
    // True only when EVERY destination confirmed the stored byte count. False
    // means the copies were written but at least one store would not tell us
    // what it holds — reported rather than papered over.
    verified: destinations.every((d) => d.verified === true),
    sizeBytes,
    tocEntries,
    sha256,
    elapsedMs,
    date: now.toISOString().slice(0, 10),
    ...(plan.message ? { warning: plan.message } : {}),
  };
  console.log(JSON.stringify(result));
  await pingHeartbeat(true, result, doFetch);
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
