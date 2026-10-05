/**
 * OPS-02 / OPS-03 — the backup must be able to say "no".
 *
 * OPS-02. `supabase-backup.mjs` reported `{ok:true}` for any dump `pg_dump`
 * happened to leave on disk. It stat'd the file for a size, hashed it, uploaded
 * it — and never once asked whether the thing was a usable restore point. A
 * truncated archive, a dump of an empty database, a `pg_dump` that wrote a
 * 0-byte file and still exited 0: all of them produced a green run and a
 * green tick. The daily workflow's only failure mode was a skipped run.
 *
 * OPS-03. The single upload destination was Supabase Storage in the SAME
 * project as `SUPABASE_DB_URL`. That is not a backup; it is a second copy on the
 * same disk under the same billing relationship. The 2026-08-17 Render
 * suspension is the shape of the risk — one account action, everything gone at
 * once. Nothing in the code noticed that the insurer and the insured were the
 * same account.
 *
 * These tests exercise the pure decision functions. Nothing here talks to
 * Postgres or to a network.
 */

import { describe, it, expect } from 'vitest';
import {
  MIN_DUMP_BYTES,
  MIN_TOC_ENTRIES,
  assessDump,
  countTocEntries,
  projectRefFromSupabaseUrl,
  projectRefFromDatabaseUrl,
  planDestinations,
  sigv4SigningKey,
  buildS3Authorization,
} from '../supabase-backup.mjs';
import { pickLatest } from '../fetch-latest-backup.mjs';

describe('OPS-02 — the restore half: pick a dump to drill against', () => {
  it('picks the newest dated object', () => {
    const list = [
      { path: 'backups/2026/08/19/a.dump', created_at: '2026-08-19T19:00:00Z' },
      { path: 'backups/2026/08/21/c.dump', created_at: '2026-08-21T19:00:00Z' },
      { path: 'backups/2026/08/20/b.dump', created_at: '2026-08-20T19:00:00Z' },
    ];
    expect(pickLatest(list).path).toBe('backups/2026/08/21/c.dump');
  });

  it('ignores undated entries rather than restoring an arbitrary file', () => {
    expect(pickLatest([{ path: 'x', created_at: null }])).toBe(null);
    expect(pickLatest([])).toBe(null);
    expect(pickLatest(null)).toBe(null);
  });
});

describe('OPS-02 — assessDump refuses to call an unusable file a backup', () => {
  const good = { sizeBytes: 5_000_000, tocEntries: 400 };

  it('accepts a dump that is both large enough and structurally readable', () => {
    expect(assessDump(good)).toEqual({ ok: true, reason: null });
  });

  it('rejects a zero-byte dump — the exact case that reported ok:true for months', () => {
    const verdict = assessDump({ sizeBytes: 0, tocEntries: 0 });
    expect(verdict.ok).toBe(false);
    expect(verdict.reason).toMatch(/empty|bytes/i);
  });

  it('rejects a dump below the minimum size floor', () => {
    expect(assessDump({ sizeBytes: MIN_DUMP_BYTES - 1, tocEntries: 400 }).ok).toBe(false);
    expect(assessDump({ sizeBytes: MIN_DUMP_BYTES, tocEntries: 400 }).ok).toBe(true);
  });

  it('rejects a big file that pg_restore cannot enumerate — truncation, or not an archive', () => {
    const verdict = assessDump({ sizeBytes: 50_000_000, tocEntries: 0 });
    expect(verdict.ok).toBe(false);
    expect(verdict.reason).toMatch(/archive|entries/i);
  });

  it('rejects a valid archive that holds almost nothing — a dump of the wrong database', () => {
    expect(assessDump({ sizeBytes: 5_000_000, tocEntries: MIN_TOC_ENTRIES - 1 }).ok).toBe(false);
  });

  it('counts pg_restore --list entries, ignoring its comment preamble', () => {
    const listing = [
      ';',
      '; Archive created at 2026-08-21 00:30:00 UTC',
      ';     dbName: postgres',
      ';',
      '; Selected TOC Entries:',
      ';',
      '215; 1259 16456 TABLE public users postgres',
      '216; 1259 16460 TABLE public temples postgres',
      '3410; 0 16456 TABLE DATA public users postgres',
      '',
    ].join('\n');
    expect(countTocEntries(listing)).toBe(3);
  });

  it('counts zero entries for an empty or garbage listing', () => {
    expect(countTocEntries('')).toBe(0);
    expect(countTocEntries('pg_restore: error: input file is not a valid archive')).toBe(0);
  });
});

describe('OPS-03 — the backup must not live in the account it insures', () => {
  it('reads the project ref out of a Supabase project URL', () => {
    expect(projectRefFromSupabaseUrl('https://abcdefghijklmnop.supabase.co')).toBe(
      'abcdefghijklmnop',
    );
    expect(projectRefFromSupabaseUrl('https://abcdefghijklmnop.supabase.co/')).toBe(
      'abcdefghijklmnop',
    );
    expect(projectRefFromSupabaseUrl('')).toBe(null);
    expect(projectRefFromSupabaseUrl('https://example.com')).toBe(null);
  });

  it('reads the project ref out of both direct and pooled Postgres DSNs', () => {
    // Direct: db.<ref>.supabase.co
    expect(
      projectRefFromDatabaseUrl('postgresql://postgres:pw@db.abcdefghijklmnop.supabase.co:5432/postgres'),
    ).toBe('abcdefghijklmnop');
    // Pooled: the ref rides in the username as postgres.<ref>
    expect(
      projectRefFromDatabaseUrl(
        'postgresql://postgres.abcdefghijklmnop:pw@aws-0-ap-south-1.pooler.supabase.com:6543/postgres',
      ),
    ).toBe('abcdefghijklmnop');
    expect(projectRefFromDatabaseUrl('postgresql://u:p@localhost:5432/db')).toBe(null);
    expect(projectRefFromDatabaseUrl('')).toBe(null);
  });

  it('flags the same-project case as fatal, because a copy there insures nothing', () => {
    const plan = planDestinations({
      SUPABASE_URL: 'https://sameref0000000000.supabase.co',
      SUPABASE_DB_URL: 'postgresql://postgres:pw@db.sameref0000000000.supabase.co:5432/postgres',
      SUPABASE_SERVICE_ROLE_KEY: 'k',
    });
    expect(plan.sameProject).toBe(true);
    expect(plan.offsite).toBe(false);
    expect(plan.fatal).toBe(true);
    expect(plan.message).toMatch(/same Supabase project/i);
  });

  it('is satisfied once an S3-compatible offsite mirror is configured', () => {
    const plan = planDestinations({
      SUPABASE_URL: 'https://sameref0000000000.supabase.co',
      SUPABASE_DB_URL: 'postgresql://postgres:pw@db.sameref0000000000.supabase.co:5432/postgres',
      SUPABASE_SERVICE_ROLE_KEY: 'k',
      BACKUP_S3_ENDPOINT: 'https://accountid.r2.cloudflarestorage.com',
      BACKUP_S3_BUCKET: 'darshya-db-backups',
      BACKUP_S3_ACCESS_KEY_ID: 'TESTKEYID',
      BACKUP_S3_SECRET_ACCESS_KEY: 'secret',
    });
    expect(plan.targets.map((t) => t.kind)).toEqual(['supabase', 's3']);
    expect(plan.offsite).toBe(true);
    expect(plan.fatal).toBe(false);
  });

  it('accepts a Supabase bucket in a DIFFERENT project as offsite', () => {
    const plan = planDestinations({
      SUPABASE_URL: 'https://backupref00000000.supabase.co',
      SUPABASE_DB_URL: 'postgresql://postgres:pw@db.primaryref0000000.supabase.co:5432/postgres',
      SUPABASE_SERVICE_ROLE_KEY: 'k',
    });
    expect(plan.sameProject).toBe(false);
    expect(plan.offsite).toBe(true);
    expect(plan.fatal).toBe(false);
  });

  it('lets an operator knowingly accept a same-project backup, and says what it is', () => {
    const plan = planDestinations({
      SUPABASE_URL: 'https://sameref0000000000.supabase.co',
      SUPABASE_DB_URL: 'postgresql://postgres:pw@db.sameref0000000000.supabase.co:5432/postgres',
      SUPABASE_SERVICE_ROLE_KEY: 'k',
      ALLOW_SAME_PROJECT_BACKUP: 'true',
    });
    expect(plan.fatal).toBe(false);
    expect(plan.offsite).toBe(false);
    expect(plan.message).toMatch(/not protected against/i);
  });

  it('an S3-only configuration needs no Supabase destination at all', () => {
    const plan = planDestinations({
      SUPABASE_DB_URL: 'postgresql://postgres:pw@db.primaryref0000000.supabase.co:5432/postgres',
      BACKUP_S3_ENDPOINT: 'https://accountid.r2.cloudflarestorage.com',
      BACKUP_S3_BUCKET: 'darshya-db-backups',
      BACKUP_S3_ACCESS_KEY_ID: 'TESTKEYID',
      BACKUP_S3_SECRET_ACCESS_KEY: 'secret',
    });
    expect(plan.targets.map((t) => t.kind)).toEqual(['s3']);
    expect(plan.offsite).toBe(true);
    expect(plan.fatal).toBe(false);
  });

  it('is artifact-only (not fatal, not offsite) when no destination is configured', () => {
    // 2026-10-06: this used to be fatal, so a repo holding only the database
    // secret took no dump at all. The dump is now taken, verified and kept as a
    // workflow artifact; it must never read as offsite.
    const plan = planDestinations({
      SUPABASE_DB_URL: 'postgresql://postgres:pw@db.primaryref0000000.supabase.co:5432/postgres',
    });
    expect(plan.targets).toEqual([]);
    expect(plan.fatal).toBe(false);
    expect(plan.offsite).toBe(false);
    expect(plan.artifactOnly).toBe(true);
    expect(plan.message).toMatch(/7-day workflow artifact/);
  });
});

describe('OPS-03 — SigV4, so R2/B2/S3 is a real destination and not a promise in a comment', () => {
  it('derives the AWS documented signing key for the published test vector', () => {
    // AWS SigV4 documentation example: secret/date/region/service -> signing key.
    const key = sigv4SigningKey(
      'wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY',
      '20150830',
      'us-east-1',
      'iam',
    );
    expect(Buffer.from(key).toString('hex')).toBe(
      'c4afb1cc5771d871763a393e44b703571b55cc28424d1a5e86da6ed3c154a4b9',
    );
  });

  it('builds an Authorization header with the credential scope and signed headers', () => {
    const auth = buildS3Authorization({
      method: 'PUT',
      host: 'accountid.r2.cloudflarestorage.com',
      canonicalUri: '/bucket/backups/2026/08/21/x.dump',
      region: 'auto',
      accessKeyId: 'AWSDOCSEXAMPLEKEYID',
      secretAccessKey: 'wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY',
      amzDate: '20260821T003000Z',
      payloadHash: 'a'.repeat(64),
      contentLength: 1234,
    });
    expect(auth.headers.Authorization).toContain('AWS4-HMAC-SHA256');
    expect(auth.headers.Authorization).toContain(
      'Credential=AWSDOCSEXAMPLEKEYID/20260821/auto/s3/aws4_request',
    );
    expect(auth.headers.Authorization).toContain(
      'SignedHeaders=content-length;host;x-amz-content-sha256;x-amz-date',
    );
    expect(auth.headers.Authorization).toMatch(/Signature=[0-9a-f]{64}$/);
    expect(auth.headers['x-amz-content-sha256']).toBe('a'.repeat(64));
    expect(auth.headers['x-amz-date']).toBe('20260821T003000Z');
  });

  it('produces a different signature when any signed input changes', () => {
    const base = {
      method: 'PUT',
      host: 'accountid.r2.cloudflarestorage.com',
      canonicalUri: '/bucket/key.dump',
      region: 'auto',
      accessKeyId: 'TESTKEYID',
      secretAccessKey: 'secret',
      amzDate: '20260821T003000Z',
      payloadHash: 'b'.repeat(64),
      contentLength: 10,
    };
    const sig = (o) => buildS3Authorization({ ...base, ...o }).headers.Authorization;
    const original = sig({});
    expect(sig({ payloadHash: 'c'.repeat(64) })).not.toBe(original);
    expect(sig({ amzDate: '20260822T003000Z' })).not.toBe(original);
    expect(sig({ canonicalUri: '/bucket/other.dump' })).not.toBe(original);
    expect(sig({ secretAccessKey: 'other' })).not.toBe(original);
    // …and it is deterministic for identical input.
    expect(sig({})).toBe(original);
  });

  it('percent-encodes the object key path without encoding the separators', () => {
    const auth = buildS3Authorization({
      method: 'PUT',
      host: 'h',
      canonicalUri: '/bucket/backups/2026/08/21/bhaktisetu-2026-08-21T00-30-00-000Z.dump',
      region: 'auto',
      accessKeyId: 'TESTKEYID',
      secretAccessKey: 'secret',
      amzDate: '20260821T003000Z',
      payloadHash: 'd'.repeat(64),
      contentLength: 1,
    });
    expect(auth.canonicalRequest.split('\n')[1]).toBe(
      '/bucket/backups/2026/08/21/bhaktisetu-2026-08-21T00-30-00-000Z.dump',
    );
  });
});
