#!/usr/bin/env node
/**
 * Download the newest dump from the backup bucket to a local path.
 *
 * OPS-02 — the restore half. `db-backup.yml`'s `restore-drill` job calls this
 * before restoring into a throwaway Postgres, because a dump nobody has
 * restored is a hypothesis rather than a backup, and the DR drill history table
 * in docs/runbooks/db-restore.md has been empty since the day it was written.
 *
 * Usage:  node scripts/backup/fetch-latest-backup.mjs /tmp/drill.dump
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_BACKUP_BUCKET (opt).
 *
 * Read-only against the bucket. It never writes to, or deletes from, any
 * object store, and it never touches a database.
 *
 * `pickLatest` is exported pure and covered in test/backup-integrity.test.mjs.
 */

import { createWriteStream } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const DEFAULT_BUCKET = 'db-backups';
const PREFIX = 'backups/';

/**
 * Newest entry by created_at. Entries without a parseable timestamp are
 * ignored rather than sorted arbitrarily — restoring "some file" is worse than
 * failing loudly.
 */
export function pickLatest(list) {
  if (!Array.isArray(list)) return null;
  const dated = list.filter((i) => i && i.created_at && !Number.isNaN(Date.parse(i.created_at)));
  if (dated.length === 0) return null;
  dated.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  return dated[0];
}

async function listPath(base, bucket, serviceKey, path) {
  const res = await fetch(`${base}/storage/v1/object/list/${bucket}`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prefix: path, limit: 1000, offset: 0, sortBy: { column: 'name', order: 'asc' } }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Storage list ${res.status} for ${path}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

async function listAllBackups(base, bucket, serviceKey) {
  const all = [];
  const years = await listPath(base, bucket, serviceKey, PREFIX.replace(/\/$/, ''));
  for (const y of years) {
    if (!y?.name) continue;
    const yearPath = `${PREFIX}${y.name}`;
    for (const m of await listPath(base, bucket, serviceKey, yearPath)) {
      if (!m?.name) continue;
      const monthPath = `${yearPath}/${m.name}`;
      for (const d of await listPath(base, bucket, serviceKey, monthPath)) {
        if (!d?.name) continue;
        const dayPath = `${monthPath}/${d.name}`;
        for (const f of await listPath(base, bucket, serviceKey, dayPath)) {
          if (!f?.name) continue;
          all.push({
            name: f.name,
            path: `${dayPath}/${f.name}`,
            created_at: f.created_at || f.updated_at || null,
          });
        }
      }
    }
  }
  return all;
}

export async function fetchLatest(outPath) {
  const missing = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'].filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(`fetch-latest-backup: missing ${missing.join(', ')}`);
  }
  const base = process.env.SUPABASE_URL.replace(/\/$/, '');
  const bucket = process.env.SUPABASE_BACKUP_BUCKET || DEFAULT_BUCKET;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const all = await listAllBackups(base, bucket, serviceKey);
  const latest = pickLatest(all);
  if (!latest) {
    throw new Error(
      `fetch-latest-backup: bucket ${bucket} holds no dated backup under ${PREFIX}. ` +
        'The daily backup has never produced an object — that is the finding, not a drill failure.',
    );
  }

  const res = await fetch(`${base}/storage/v1/object/${bucket}/${encodeURI(latest.path)}`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  if (!res.ok) throw new Error(`fetch-latest-backup: download ${res.status} for ${latest.path}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(outPath));

  const out = { ok: true, path: latest.path, created_at: latest.created_at, outPath };
  console.log(JSON.stringify(out));
  return out;
}

const isMain = process.argv[1] && process.argv[1].endsWith('fetch-latest-backup.mjs');
if (isMain) {
  const outPath = process.argv[2];
  if (!outPath) {
    console.error('usage: fetch-latest-backup.mjs <out-path>');
    process.exit(2);
  }
  fetchLatest(outPath).catch((err) => {
    console.error(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }));
    process.exit(1);
  });
}
