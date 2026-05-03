#!/usr/bin/env node
/**
 * Weekly Postgres backup — pg_dump + Cloudflare R2 upload.
 *
 * Designed to be invoked from:
 *   1. master-cron tick (Sunday 02:00 IST) via runWeeklyBackup() in api/jobs/backup.ts
 *   2. Render cron (paid) or cron-job.org → POST /api/v1/admin/jobs/backup
 *   3. Manually:  node apps/api/scripts/backup.mjs
 *
 * Env-gated. No-op + exit 0 when any of these are missing:
 *   DATABASE_URL
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY
 *
 * R2 bucket defaults to R2_BACKUP_BUCKET (recommended: separate from media
 * bucket so a media-bucket compromise can't wipe backups), falls back to
 * R2_BUCKET, then 'darshya-backups'.
 *
 * Retention: we keep dumps named  pg-YYYY-MM-DD.sql.gz  in R2. Lifecycle
 * is enforced via R2 bucket lifecycle rule (set out-of-band, see
 * docs/backup-restore-runbook.md). This script doesn't delete old objects.
 *
 * Failure modes (all surface as non-zero exit + structured stderr line):
 *   - pg_dump not on PATH         → exit 2
 *   - pg_dump non-zero exit       → exit 3
 *   - R2 upload throws            → exit 4
 *
 * Required system binaries: pg_dump, gzip. On Render base image both are
 * present. On Alpine, install with `apk add postgresql16-client`.
 */

import { spawn } from 'node:child_process';
import { createReadStream, createWriteStream, statSync, unlinkSync, existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createGzip } from 'node:zlib';
import { pipeline } from 'node:stream/promises';

const REQUIRED = ['DATABASE_URL', 'R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY'];

function envGate() {
  const missing = REQUIRED.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.log(
      JSON.stringify({
        skipped: true,
        reason: 'missing env',
        missing,
      }),
    );
    return false;
  }
  return true;
}

function isoDate() {
  return new Date().toISOString().slice(0, 10);
}

async function pgDumpToFile(databaseUrl, outPath) {
  return new Promise((resolve, reject) => {
    // --no-owner / --no-privileges → portable across Supabase tiers.
    // --format=p (plain SQL) → easy to inspect + restore via `psql`.
    // --quote-all-identifiers → defensive against reserved-word collisions.
    const args = [
      '--no-owner',
      '--no-privileges',
      '--format=p',
      '--quote-all-identifiers',
      databaseUrl,
    ];
    const proc = spawn('pg_dump', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    const out = createWriteStream(outPath);
    let stderr = '';
    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    proc.on('error', (err) => reject(err));
    proc.stdout.pipe(out);
    out.on('finish', () => {
      if (proc.exitCode === null) {
        // still running; wait for proc 'close'
      }
    });
    proc.on('close', (code) => {
      out.end();
      if (code !== 0) {
        reject(new Error(`pg_dump exited ${code}: ${stderr.slice(-400)}`));
        return;
      }
      resolve();
    });
  });
}

async function gzipFile(srcPath, dstPath) {
  await pipeline(createReadStream(srcPath), createGzip({ level: 6 }), createWriteStream(dstPath));
}

async function uploadToR2(localPath, key) {
  // Lazy-import S3 client so this script can be invoked even without
  // node_modules (in which case env-gate already exits).
  const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
  const accountId = process.env.R2_ACCOUNT_ID;
  const bucket =
    process.env.R2_BACKUP_BUCKET || process.env.R2_BUCKET || 'darshya-backups';
  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
  const body = createReadStream(localPath);
  const stat = statSync(localPath);
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: 'application/gzip',
      ContentLength: stat.size,
      Metadata: {
        'darshya-backup': '1',
        'created-at': new Date().toISOString(),
      },
    }),
  );
  return { bucket, key, sizeBytes: stat.size };
}

export async function runBackup() {
  if (!envGate()) return { skipped: true };

  const date = isoDate();
  const workDir = join(tmpdir(), 'darshya-backup');
  if (!existsSync(workDir)) mkdirSync(workDir, { recursive: true });
  const sqlPath = join(workDir, `pg-${date}.sql`);
  const gzPath = join(workDir, `pg-${date}.sql.gz`);

  const startedAt = Date.now();
  try {
    await pgDumpToFile(process.env.DATABASE_URL, sqlPath);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/ENOENT/i.test(msg) || /not found/i.test(msg)) {
      console.error(JSON.stringify({ ok: false, stage: 'pg_dump', error: 'pg_dump not on PATH' }));
      process.exitCode = 2;
      return { ok: false, stage: 'pg_dump', error: 'pg_dump not on PATH' };
    }
    console.error(JSON.stringify({ ok: false, stage: 'pg_dump', error: msg }));
    process.exitCode = 3;
    return { ok: false, stage: 'pg_dump', error: msg };
  }

  try {
    await gzipFile(sqlPath, gzPath);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(JSON.stringify({ ok: false, stage: 'gzip', error: msg }));
    process.exitCode = 3;
    return { ok: false, stage: 'gzip', error: msg };
  }

  let uploaded;
  try {
    const key = `pg-${date}.sql.gz`;
    uploaded = await uploadToR2(gzPath, key);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(JSON.stringify({ ok: false, stage: 'r2', error: msg }));
    process.exitCode = 4;
    return { ok: false, stage: 'r2', error: msg };
  } finally {
    try {
      unlinkSync(sqlPath);
    } catch {
      // best-effort
    }
    try {
      unlinkSync(gzPath);
    } catch {
      // best-effort
    }
  }

  const elapsedMs = Date.now() - startedAt;
  const result = {
    ok: true,
    bucket: uploaded.bucket,
    key: uploaded.key,
    sizeBytes: uploaded.sizeBytes,
    elapsedMs,
    date,
  };
  console.log(JSON.stringify(result));
  return result;
}

// CLI entrypoint — only run when invoked directly, not when imported.
const isMain =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith('backup.mjs');
if (isMain) {
  runBackup().catch((err) => {
    console.error(
      JSON.stringify({ ok: false, stage: 'unhandled', error: err instanceof Error ? err.message : String(err) }),
    );
    process.exit(1);
  });
}
