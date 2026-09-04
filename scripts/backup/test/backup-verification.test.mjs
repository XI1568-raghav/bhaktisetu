/**
 * OPS-02, second pass — the guards that were still missing after 2026-08-21.
 *
 * The 2026-08-21 pass (backup-integrity.test.mjs) made `assessDump` refuse an
 * empty or unreadable LOCAL dump. It did not close the rest of the path, and
 * three ways to report a backup that does not exist survived:
 *
 *   1. `verifySupabaseObject` skipped its size comparison whenever the store
 *      reported `content-length: 0` — the guard read `got > 0 && got !== expected`,
 *      so the single value that most needs to fail was the one value excluded.
 *      A HEAD with no `content-length` header at all took the same branch,
 *      because `Number(null)` is `0`. Either way the run reported `"ok":true`
 *      with the LOCAL byte count, and nothing anywhere had established that a
 *      single byte was durably stored.
 *   2. The S3 offsite copy — the one OPS-03 exists to create — was never read
 *      back at all. `uploadToS3Compatible` returned `verifiedBytes: sizeBytes`,
 *      a field that asserted a verification which had not happened.
 *   3. The missing-credentials skip returned `{ok:true}` and exit 0. The
 *      workflow grepped for `"skipped":true` in a separate step to catch it,
 *      but the script itself still told every other caller it had succeeded.
 *
 * And one honest-reporting bug, the render-hours-guard failure shape: when
 * `pg_restore` was absent from the runner, the operator was told "not a valid
 * dump" — a tooling failure reported as data corruption, about a dump that may
 * well have been perfect.
 *
 * These tests drive `runBackup` itself with injected dependencies rather than
 * only its pure helpers, because every bug above lived in the wiring between
 * the helpers rather than in a helper.
 *
 * BOTH DIRECTIONS ARE ASSERTED. A guard that always fails is not a guard, so
 * every rejection case below is paired with an acceptance case that must go
 * green through the same code path.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  assessStoredObject,
  buildS3Authorization,
  findMissingTables,
  tablesInListing,
  runBackup,
  EXPECTED_TABLES,
  MIN_DUMP_BYTES,
} from '../supabase-backup.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const SCHEMA = join(HERE, '..', '..', '..', 'apps', 'api', 'prisma', 'schema.prisma');

// ── harness ────────────────────────────────────────────────────────────────

const ENV_KEYS = [
  'SUPABASE_DB_URL',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_BACKUP_BUCKET',
  'BACKUP_S3_ENDPOINT',
  'BACKUP_S3_BUCKET',
  'BACKUP_S3_REGION',
  'BACKUP_S3_ACCESS_KEY_ID',
  'BACKUP_S3_SECRET_ACCESS_KEY',
  'ALLOW_SAME_PROJECT_BACKUP',
  'BACKUP_MIN_BYTES',
  'HEARTBEAT_URL',
];

let savedEnv;

beforeEach(() => {
  savedEnv = {};
  for (const k of ENV_KEYS) savedEnv[k] = process.env[k];
  for (const k of ENV_KEYS) delete process.env[k];
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
  // runBackup signals failure through process.exitCode. Left set, it would
  // make vitest itself exit non-zero after a deliberately-failing case.
  process.exitCode = 0;
});

/**
 * A Supabase destination in a DIFFERENT project from the database, so
 * planDestinations() is satisfied (OPS-03) and these tests exercise OPS-02
 * rather than re-testing the destination gate.
 */
function offsiteSupabaseEnv() {
  process.env.SUPABASE_DB_URL =
    'postgresql://postgres:pw@db.primaryref0000000.supabase.co:5432/postgres';
  process.env.SUPABASE_URL = 'https://backupref00000000.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
}

function s3OnlyEnv() {
  process.env.SUPABASE_DB_URL =
    'postgresql://postgres:pw@db.primaryref0000000.supabase.co:5432/postgres';
  process.env.BACKUP_S3_ENDPOINT = 'https://accountid.r2.cloudflarestorage.com';
  process.env.BACKUP_S3_BUCKET = 'darshya-db-backups';
  process.env.BACKUP_S3_ACCESS_KEY_ID = 'TESTKEYID';
  process.env.BACKUP_S3_SECRET_ACCESS_KEY = 'secret';
}

/** A pg_dump stand-in that writes `bytes` bytes where the real one would. */
function fakePgDump(bytes) {
  return async (_dbUrl, outPath) => {
    writeFileSync(outPath, Buffer.alloc(bytes, 0x5a));
  };
}

/**
 * A pg_restore --list stand-in producing `n` TOC entry lines.
 *
 * By default the listing names every table in EXPECTED_TABLES, so it looks like
 * a dump of this database; `tables` overrides that to model a dump of the wrong
 * or an empty one.
 */
function fakePgRestoreList(n, { available = true, tables = EXPECTED_TABLES } = {}) {
  return async () => {
    if (!available) return { available: false, code: null, stdout: '' };
    const lines = ['; Archive created at 2026-09-04 00:30:00 UTC', '; Selected TOC Entries:'];
    const names = [...tables];
    while (names.length < n) names.push(`filler_${names.length}`);
    for (let i = 0; i < n; i++) {
      lines.push(`${200 + i}; 1259 ${16000 + i} TABLE public ${names[i]} postgres`);
    }
    return { available: true, code: 0, stdout: lines.join('\n') };
  };
}

/**
 * Minimal fetch stand-in. `head` decides what the read-back reports:
 *   number  -> that content-length
 *   null    -> a 200 with no content-length header at all
 *   'error' -> a non-2xx
 */
function fakeFetch({ head = 'match', uploadStatus = 200, expectBytes = 0, calls = [] } = {}) {
  return async (url, opts = {}) => {
    const method = (opts.method || 'GET').toUpperCase();
    calls.push({ url: String(url), method });

    // The real fetch consumes the fs.ReadStream body before returning, so
    // runBackup's `finally` unlink is safe. A stand-in that ignores the body
    // leaves the handle to open a file that is already gone, which surfaces as
    // an unhandled ENOENT rather than a test failure. Consume it here.
    if (opts.body && typeof opts.body.destroy === 'function') {
      opts.body.on('error', () => {});
      opts.body.destroy();
    }

    if (method === 'HEAD') {
      if (head === 'error') {
        return { ok: false, status: 404, headers: new Map(), text: async () => 'not found' };
      }
      const value = head === 'match' ? String(expectBytes) : head === null ? null : String(head);
      return {
        ok: true,
        status: 200,
        headers: { get: (k) => (k.toLowerCase() === 'content-length' ? value : null) },
        text: async () => '',
      };
    }

    // PUT (S3) / POST (Supabase Storage) upload
    return {
      ok: uploadStatus >= 200 && uploadStatus < 300,
      status: uploadStatus,
      headers: { get: () => null },
      text: async () => (uploadStatus >= 300 ? 'upload rejected' : ''),
    };
  };
}

const GOOD_BYTES = MIN_DUMP_BYTES * 4;

function goodDeps(fetchOpts = {}) {
  return {
    pgDump: fakePgDump(GOOD_BYTES),
    pgRestoreList: fakePgRestoreList(400),
    fetch: fakeFetch({ expectBytes: GOOD_BYTES, ...fetchOpts }),
  };
}

// ── 1. the read-back verdict, as a pure function ───────────────────────────

describe('assessStoredObject — is the object actually in the store?', () => {
  it('accepts an object whose stored size equals what we uploaded', () => {
    const v = assessStoredObject({ contentLength: '5000000', expectedBytes: 5_000_000 });
    expect(v.ok).toBe(true);
    expect(v.verified).toBe(true);
    expect(v.bytes).toBe(5_000_000);
  });

  it('REJECTS a stored object of zero bytes — the case the old `got > 0` guard excluded', () => {
    const v = assessStoredObject({ contentLength: '0', expectedBytes: 5_000_000 });
    expect(v.ok).toBe(false);
    expect(v.reason).toMatch(/0 bytes|zero/i);
  });

  it('rejects a stored size that disagrees with the uploaded size', () => {
    const v = assessStoredObject({ contentLength: '123', expectedBytes: 5_000_000 });
    expect(v.ok).toBe(false);
    expect(v.reason).toMatch(/123/);
  });

  it('does not fabricate a verification when the store sends no content-length', () => {
    // Not fatal — a store that never returns the header would otherwise make
    // this job permanently red, which is the alarm-fatigue failure. But it must
    // not be reported as verified either.
    const v = assessStoredObject({ contentLength: null, expectedBytes: 5_000_000 });
    expect(v.ok).toBe(true);
    expect(v.verified).toBe(false);
    expect(v.bytes).toBe(null);
    expect(v.reason).toMatch(/content-length/i);
  });

  it('treats an unparseable content-length as unverified rather than as agreement', () => {
    const v = assessStoredObject({ contentLength: 'banana', expectedBytes: 5_000_000 });
    expect(v.ok).toBe(true);
    expect(v.verified).toBe(false);
  });
});

// ── 2. not configured vs. configured-and-broken ────────────────────────────

describe('runBackup — "no credentials" and "backup failed" are different, and neither is success', () => {
  it('does NOT report ok:true when the credentials are missing', async () => {
    const res = await runBackup({ deps: goodDeps() });
    expect(res.skipped).toBe(true);
    expect(res.reason).toBe('missing-env');
    // The whole finding: this used to be `ok: true`, and exit 0.
    expect(res.ok).toBe(false);
    expect(process.exitCode).not.toBe(0);
    expect(res.missing).toContain('SUPABASE_DB_URL');
  });

  it('keeps the unconfigured state distinguishable from a broken backup', async () => {
    const unconfigured = await runBackup({ deps: goodDeps() });
    process.exitCode = 0;

    offsiteSupabaseEnv();
    const broken = await runBackup({
      deps: { ...goodDeps(), pgDump: async () => { throw new Error('pg_dump exited 1: FATAL'); } },
    });

    // Both fail, but an operator can tell which is which without reading prose.
    expect(unconfigured.ok).toBe(false);
    expect(broken.ok).toBe(false);
    expect(unconfigured.skipped).toBe(true);
    expect(broken.skipped).toBeUndefined();
    expect(unconfigured.stage).toBeUndefined();
    expect(broken.stage).toBe('pg_dump');
  });
});

// ── 3. the local artifact ──────────────────────────────────────────────────

describe('runBackup — the dump on disk must be a restore point', () => {
  it('rejects a zero-byte dump', async () => {
    offsiteSupabaseEnv();
    const res = await runBackup({
      deps: { ...goodDeps(), pgDump: fakePgDump(0), pgRestoreList: fakePgRestoreList(0) },
    });
    expect(res.ok).toBe(false);
    expect(res.stage).toBe('verify-dump');
    expect(res.sizeBytes).toBe(0);
  });

  it('rejects a full-size file that pg_restore cannot enumerate — truncation', async () => {
    offsiteSupabaseEnv();
    const res = await runBackup({
      deps: { ...goodDeps(), pgRestoreList: fakePgRestoreList(0) },
    });
    expect(res.ok).toBe(false);
    expect(res.stage).toBe('verify-dump');
    expect(res.error).toMatch(/archive|entries/i);
  });

  it('blames the missing TOOL, not the dump, when pg_restore is not installed', async () => {
    // The render-hours-guard shape: "the checker is absent" reported as
    // "the thing being checked is broken" trains the reader to ignore both.
    offsiteSupabaseEnv();
    const res = await runBackup({
      deps: { ...goodDeps(), pgRestoreList: fakePgRestoreList(0, { available: false }) },
    });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/pg_restore/i);
    expect(res.error).not.toMatch(/not a valid dump/i);
    expect(res.stage).toBe('verify-tooling');
  });

  it('ACCEPTS a dump that is large enough and structurally readable', async () => {
    offsiteSupabaseEnv();
    const res = await runBackup({ deps: goodDeps() });
    expect(res.ok).toBe(true);
    expect(res.sizeBytes).toBe(GOOD_BYTES);
    expect(res.tocEntries).toBe(400);
  });
});

// ── 3b. is it a dump of THIS database? ─────────────────────────────────────

describe('the archive must contain this product’s tables, not just enough tables', () => {
  const listing = [
    '; Selected TOC Entries:',
    '215; 1259 16456 TABLE public users postgres',
    '216; 1259 16460 TABLE public temples postgres',
    '3410; 0 16456 TABLE DATA public users postgres',
    '217; 1259 16470 INDEX public users_email_key postgres',
  ].join('\n');

  it('reads table names out of a listing, including TABLE DATA lines', () => {
    const found = tablesInListing(listing);
    expect(found.has('users')).toBe(true);
    expect(found.has('temples')).toBe(true);
    // An INDEX entry is not a table.
    expect(found.has('users_email_key')).toBe(false);
  });

  it('names exactly what is missing', () => {
    expect(findMissingTables(listing, ['users', 'temples'])).toEqual([]);
    expect(findMissingTables(listing, ['users', 'donations'])).toEqual(['donations']);
  });

  it('every EXPECTED_TABLES entry is a real @@map in schema.prisma', () => {
    // Without this, renaming a table would leave the backup silently checking
    // for something that cannot be there, and every run would go red for a
    // reason nobody could find.
    const schema = readFileSync(SCHEMA, 'utf8');
    const mapped = new Set(
      [...schema.matchAll(/@@map\("([a-z0-9_]+)"\)/g)].map((m) => m[1]),
    );
    for (const t of EXPECTED_TABLES) expect([t, mapped.has(t)]).toEqual([t, true]);
  });

  it('REJECTS a large, readable archive of the wrong database', async () => {
    offsiteSupabaseEnv();
    const res = await runBackup({
      deps: {
        ...goodDeps(),
        pgRestoreList: fakePgRestoreList(400, { tables: ['completely', 'other', 'tables'] }),
      },
    });
    expect(res.ok).toBe(false);
    expect(res.stage).toBe('verify-schema');
    expect(res.missingTables).toEqual(EXPECTED_TABLES);
  });

  it('rejects an archive missing even one of them', async () => {
    offsiteSupabaseEnv();
    const partial = EXPECTED_TABLES.filter((t) => t !== 'donations');
    const res = await runBackup({
      deps: { ...goodDeps(), pgRestoreList: fakePgRestoreList(400, { tables: partial }) },
    });
    expect(res.ok).toBe(false);
    expect(res.missingTables).toEqual(['donations']);
  });

  it('ACCEPTS an archive that names all of them', async () => {
    offsiteSupabaseEnv();
    const res = await runBackup({ deps: goodDeps() });
    expect(res.ok).toBe(true);
    expect(res.stage).toBeUndefined();
  });
});

// ── 4. the object in the store ─────────────────────────────────────────────

describe('runBackup — a 200 from the upload endpoint is not a stored object', () => {
  it('REJECTS an upload the store reports back as 0 bytes', async () => {
    offsiteSupabaseEnv();
    const res = await runBackup({ deps: goodDeps({ head: 0 }) });
    expect(res.ok).toBe(false);
    expect(res.stage).toBe('upload');
    expect(res.error).toMatch(/0 bytes|zero/i);
  });

  it('rejects an upload the store reports back at the wrong size', async () => {
    offsiteSupabaseEnv();
    const res = await runBackup({ deps: goodDeps({ head: 42 }) });
    expect(res.ok).toBe(false);
    expect(res.stage).toBe('upload');
  });

  it('reports verified:false rather than claiming a size it never received', async () => {
    offsiteSupabaseEnv();
    const res = await runBackup({ deps: goodDeps({ head: null }) });
    expect(res.ok).toBe(true);
    expect(res.destinations[0].verified).toBe(false);
    expect(res.verified).toBe(false);
  });

  it('ACCEPTS an upload the store reports back at exactly the uploaded size', async () => {
    offsiteSupabaseEnv();
    const res = await runBackup({ deps: goodDeps() });
    expect(res.ok).toBe(true);
    expect(res.destinations[0].verified).toBe(true);
    expect(res.destinations[0].verifiedBytes).toBe(GOOD_BYTES);
    expect(res.verified).toBe(true);
  });

  it('actually issues a HEAD read-back rather than trusting the write', async () => {
    offsiteSupabaseEnv();
    const calls = [];
    await runBackup({ deps: goodDeps({ calls }) });
    expect(calls.some((c) => c.method === 'HEAD')).toBe(true);
  });
});

// ── 5. the offsite copy specifically ───────────────────────────────────────

describe('runBackup — the S3 offsite copy is verified too, not assumed', () => {
  it('reads the S3 object back and rejects a size mismatch', async () => {
    s3OnlyEnv();
    const res = await runBackup({ deps: goodDeps({ head: 9 }) });
    expect(res.ok).toBe(false);
    expect(res.stage).toBe('upload');
  });

  it('rejects an S3 object the store reports as 0 bytes', async () => {
    s3OnlyEnv();
    const res = await runBackup({ deps: goodDeps({ head: 0 }) });
    expect(res.ok).toBe(false);
    expect(res.stage).toBe('upload');
  });

  it('ACCEPTS a verified S3 object and marks the run offsite', async () => {
    s3OnlyEnv();
    const calls = [];
    const res = await runBackup({ deps: goodDeps({ calls }) });
    expect(res.ok).toBe(true);
    expect(res.offsite).toBe(true);
    expect(res.destinations[0].kind).toBe('s3');
    expect(res.destinations[0].verified).toBe(true);
    expect(calls.filter((c) => c.method === 'HEAD')).toHaveLength(1);
  });
});

// ── 6. SigV4 must be able to sign the read-back ────────────────────────────

describe('buildS3Authorization — signs a bodyless HEAD as well as a PUT', () => {
  const base = {
    host: 'accountid.r2.cloudflarestorage.com',
    canonicalUri: '/bucket/backups/2026/09/04/x.dump',
    region: 'auto',
    accessKeyId: 'TESTKEYID',
    secretAccessKey: 'secret',
    amzDate: '20260904T003000Z',
    payloadHash: 'e'.repeat(64),
  };

  it('omits content-length from the signed set when there is no body', () => {
    const auth = buildS3Authorization({ ...base, method: 'HEAD' });
    expect(auth.headers.Authorization).toContain(
      'SignedHeaders=host;x-amz-content-sha256;x-amz-date',
    );
    expect(auth.headers['Content-Length']).toBeUndefined();
  });

  it('still signs content-length for a PUT — the existing behaviour is unchanged', () => {
    const auth = buildS3Authorization({ ...base, method: 'PUT', contentLength: 1234 });
    expect(auth.headers.Authorization).toContain(
      'SignedHeaders=content-length;host;x-amz-content-sha256;x-amz-date',
    );
    expect(auth.headers['Content-Length']).toBe('1234');
  });
});
