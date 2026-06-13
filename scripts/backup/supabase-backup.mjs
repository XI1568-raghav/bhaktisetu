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
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const DEFAULT_BUCKET = 'db-backups';

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

function envGate() {
  const missing = [];
  for (const k of ['SUPABASE_DB_URL', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']) {
    if (!process.env[k]) missing.push(k);
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

  const key = buildBackupKey(now);
  let uploaded;
  try {
    uploaded = await uploadToSupabaseStorage(dumpPath, key, sizeBytes);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const fail = { ok: false, stage: 'upload', error: msg, key, sizeBytes };
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
    bucket: uploaded.bucket,
    key: uploaded.key,
    sizeBytes,
    sha256,
    elapsedMs,
    date: now.toISOString().slice(0, 10),
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
