import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve as resolvePath } from 'node:path';
import { sendOpsAlert } from '../lib/alert.js';

/**
 * Layer TD9 — weekly database backup tick.
 *
 * Invoked from master-cron's runDailyOps() every tick. Internally gated so
 * the actual pg_dump only runs once per Sunday in the 02:00 IST window.
 *
 * The heavy lifting (pg_dump → gzip → R2 upload) lives in the standalone
 * script `scripts/backup.mjs` so:
 *   1. We can also invoke it from a Render cron (paid) or external scheduler
 *      without booting the Fastify server.
 *   2. pg_dump's binary stdio doesn't tangle with Fastify's event loop.
 *
 * On failure we fire a Slack/email ops alert (lib/alert.ts). The tick
 * itself never throws — failures surface as `{ ok: false, ... }` in the
 * runDailyOps result so downstream ticks continue.
 *
 * Required env (no-op if missing — backup.mjs handles the gate):
 *   DATABASE_URL
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY
 *   R2_BACKUP_BUCKET (recommended, defaults to R2_BUCKET / 'darshya-backups')
 *
 * Optional:
 *   SLACK_WEBHOOK_URL or ADMIN_EMAILS — failure alerts
 *   BACKUP_FORCE=1 — bypass the Sunday-02:00-IST gate (one-shot manual)
 */

export interface BackupResult {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  bucket?: string;
  key?: string;
  sizeBytes?: number;
  elapsedMs?: number;
  error?: string;
}

const ONE_HOUR_MS = 60 * 60 * 1000;

/** Sunday in IST, hour ∈ [2, 3). 02:00–02:59 IST = 20:30–21:29 UTC Saturday. */
function isSundayTwoAmIst(now: Date): boolean {
  const utcMs = now.getTime();
  const istMs = utcMs + 5.5 * ONE_HOUR_MS;
  const ist = new Date(istMs);
  // getUTC* methods on the shifted Date give us IST wall-clock components.
  const dow = ist.getUTCDay(); // 0 = Sunday
  const hour = ist.getUTCHours();
  return dow === 0 && hour === 2;
}

/**
 * Spawn `node apps/api/scripts/backup.mjs` and resolve with the JSON line
 * the script prints on stdout. Never throws.
 */
function runBackupScript(): Promise<BackupResult> {
  return new Promise((resolve) => {
    // From src/jobs/backup-cron.ts at runtime → dist/jobs/backup-cron.js,
    // so `../../scripts/backup.mjs` resolves correctly in both layouts.
    const here = dirname(fileURLToPath(import.meta.url));
    const script = resolvePath(here, '..', '..', 'scripts', 'backup.mjs');
    const proc = spawn(process.execPath, [script], {
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (c) => {
      stdout += c.toString();
    });
    proc.stderr.on('data', (c) => {
      stderr += c.toString();
    });
    proc.on('error', (err) => {
      resolve({ ok: false, error: err instanceof Error ? err.message : String(err) });
    });
    proc.on('close', (code) => {
      // Prefer the last JSON line from stdout/stderr.
      const lastLine = (stderr.trim().split('\n').pop() || stdout.trim().split('\n').pop() || '').trim();
      let parsed: BackupResult | null = null;
      if (lastLine.startsWith('{')) {
        try {
          parsed = JSON.parse(lastLine) as BackupResult;
        } catch {
          parsed = null;
        }
      }
      if (parsed) {
        resolve(parsed);
        return;
      }
      if (code === 0) {
        resolve({ ok: true });
        return;
      }
      resolve({ ok: false, error: `backup.mjs exited ${code}: ${stderr.slice(-400)}` });
    });
  });
}

let lastRunAt = 0;
const RUN_COOLDOWN_MS = 23 * ONE_HOUR_MS; // re-arm after a day so ticks at :00 + :30 don't double-run

export async function maybeRunWeeklyBackup(): Promise<BackupResult> {
  const force = process.env.BACKUP_FORCE === '1';
  const now = new Date();
  if (!force) {
    if (!isSundayTwoAmIst(now)) {
      return { ok: true, skipped: true, reason: 'outside Sunday 02:00 IST window' };
    }
    if (Date.now() - lastRunAt < RUN_COOLDOWN_MS) {
      return { ok: true, skipped: true, reason: 'already ran within cooldown' };
    }
  }
  lastRunAt = Date.now();

  const result = await runBackupScript();

  if (!result.ok && !result.skipped) {
    void sendOpsAlert({
      severity: 'high',
      subject: 'Weekly DB backup failed',
      body: `stage=${(result as { stage?: string }).stage ?? 'unknown'} error=${result.error ?? 'unknown'}`,
    });
  }

  return result;
}
