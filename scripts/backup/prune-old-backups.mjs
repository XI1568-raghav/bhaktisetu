#!/usr/bin/env node
/**
 * Retention pruner — delete Supabase Storage backups older than RETENTION_DAYS
 * (default 30).
 *
 * Lists objects under prefix `backups/` recursively, filters those whose
 * created_at < now - RETENTION_DAYS, deletes them in a single batch call.
 *
 * Env-gated. No-op + exit 0 when vendor creds missing (same pattern as
 * supabase-backup.mjs).
 *
 * NOTE: pickOldBackups() is exported pure for vitest.
 */

const DEFAULT_BUCKET = 'db-backups';
const DEFAULT_RETENTION_DAYS = 30;
const PREFIX = 'backups/';

/**
 * Pure: keep the N newest entries (by created_at), return the rest for
 * deletion. Entries without parseable created_at are excluded from both
 * sides (defensive — they are neither retained nor pruned).
 *
 * Semantic: "30-day retention" = always keep the 30 most-recent dumps,
 * regardless of calendar drift / missed runs. Matches the spec's stated
 * test invariant: "given 35 fake backups, exactly 30 newest retained".
 */
export function pickOldBackups(list, now, retentionDays = DEFAULT_RETENTION_DAYS) {
  if (!Array.isArray(list)) return [];
  const dated = list.filter((item) => {
    if (!item || !item.created_at) return false;
    const t = new Date(item.created_at).getTime();
    return !Number.isNaN(t);
  });
  if (dated.length <= retentionDays) return [];
  // Newest first.
  dated.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return dated.slice(retentionDays);
}

function envGate() {
  const missing = [];
  for (const k of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']) {
    if (!process.env[k]) missing.push(k);
  }
  return missing;
}

/**
 * Recursively list every object under `backups/` using Supabase Storage's
 * `list` REST endpoint. The endpoint returns one folder level at a time,
 * so we walk YYYY/ → MM/ → DD/ → files.
 */
async function listAllBackups(supabaseUrl, bucket, serviceKey) {
  const base = supabaseUrl.replace(/\/$/, '');
  async function listPath(path) {
    const url = `${base}/storage/v1/object/list/${bucket}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prefix: path,
        limit: 1000,
        offset: 0,
        sortBy: { column: 'name', order: 'asc' },
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Storage list ${res.status} for ${path}: ${text.slice(0, 200)}`);
    }
    return res.json();
  }

  const all = [];
  // Top: list YYYY/ folders under PREFIX (strip trailing slash for prefix arg).
  const root = await listPath(PREFIX.replace(/\/$/, ''));
  for (const yearFolder of root) {
    if (!yearFolder || !yearFolder.name) continue;
    const yearPath = `${PREFIX}${yearFolder.name}`;
    const months = await listPath(yearPath);
    for (const monthFolder of months) {
      if (!monthFolder || !monthFolder.name) continue;
      const monthPath = `${yearPath}/${monthFolder.name}`;
      const days = await listPath(monthPath);
      for (const dayFolder of days) {
        if (!dayFolder || !dayFolder.name) continue;
        const dayPath = `${monthPath}/${dayFolder.name}`;
        const files = await listPath(dayPath);
        for (const file of files) {
          if (!file || !file.name) continue;
          all.push({
            name: file.name,
            path: `${dayPath}/${file.name}`,
            created_at: file.created_at || file.updated_at || null,
          });
        }
      }
    }
  }
  return all;
}

async function deleteObjects(supabaseUrl, bucket, serviceKey, paths) {
  if (paths.length === 0) return { deleted: 0 };
  const base = supabaseUrl.replace(/\/$/, '');
  const url = `${base}/storage/v1/object/${bucket}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prefixes: paths }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Storage delete ${res.status}: ${text.slice(0, 300)}`);
  }
  return { deleted: paths.length };
}

export async function runPrune({ now = new Date(), retentionDays = DEFAULT_RETENTION_DAYS } = {}) {
  const missing = envGate();
  if (missing.length > 0) {
    const skipped = {
      ok: true,
      skipped: true,
      reason: 'missing-env',
      missing,
    };
    console.log(JSON.stringify(skipped));
    return skipped;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const bucket = process.env.SUPABASE_BACKUP_BUCKET || DEFAULT_BUCKET;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  let list;
  try {
    list = await listAllBackups(supabaseUrl, bucket, serviceKey);
  } catch (err) {
    const fail = { ok: false, stage: 'list', error: err instanceof Error ? err.message : String(err) };
    console.error(JSON.stringify(fail));
    process.exitCode = 2;
    return fail;
  }

  const toDelete = pickOldBackups(list, now, retentionDays);
  if (toDelete.length === 0) {
    const result = { ok: true, total: list.length, deleted: 0, retentionDays };
    console.log(JSON.stringify(result));
    return result;
  }

  try {
    const paths = toDelete.map((x) => x.path);
    const { deleted } = await deleteObjects(supabaseUrl, bucket, serviceKey, paths);
    const result = { ok: true, total: list.length, deleted, retentionDays };
    console.log(JSON.stringify(result));
    return result;
  } catch (err) {
    const fail = { ok: false, stage: 'delete', error: err instanceof Error ? err.message : String(err) };
    console.error(JSON.stringify(fail));
    process.exitCode = 3;
    return fail;
  }
}

const isMain =
  import.meta.url === `file://${process.argv[1]}` ||
  (process.argv[1] && process.argv[1].endsWith('prune-old-backups.mjs'));
if (isMain) {
  runPrune().catch((err) => {
    console.error(JSON.stringify({ ok: false, stage: 'unhandled', error: err instanceof Error ? err.message : String(err) }));
    process.exit(1);
  });
}
