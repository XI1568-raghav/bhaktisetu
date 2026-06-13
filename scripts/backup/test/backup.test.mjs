/**
 * TDD tests for scripts/backup/supabase-backup.mjs + prune-old-backups.mjs.
 *
 * Pure unit tests — no real pg_dump, no real Supabase. We exercise the helper
 * functions exported from each script:
 *
 *   - buildPgDumpArgs()         → asserts --no-owner --no-privileges
 *                                 --format=custom flags + dump-path tail.
 *   - buildBackupKey(date, iso) → asserts backups/YYYY/MM/DD/bhaktisetu-<ts>.dump
 *   - pickOldBackups(list, now) → retention prune: 35 dated dumps → 5 dropped,
 *                                 30 newest retained.
 */

import { describe, it, expect } from 'vitest';
import {
  buildPgDumpArgs,
  buildBackupKey,
} from '../supabase-backup.mjs';
import { pickOldBackups } from '../prune-old-backups.mjs';

describe('buildPgDumpArgs', () => {
  it('passes --no-owner --no-privileges --format=custom and dump path', () => {
    const args = buildPgDumpArgs('postgres://x:***REMOVED***@h:5432/d', '/tmp/backup.dump');
    expect(args).toContain('--no-owner');
    expect(args).toContain('--no-privileges');
    expect(args).toContain('--format=custom');
    expect(args).toContain('-f');
    expect(args).toContain('/tmp/backup.dump');
    // The DB URL is the trailing positional arg pg_dump accepts.
    expect(args[args.length - 1]).toBe('postgres://x:***REMOVED***@h:5432/d');
  });

  it('throws when databaseUrl is missing', () => {
    expect(() => buildPgDumpArgs('', '/tmp/backup.dump')).toThrow();
    expect(() => buildPgDumpArgs(undefined, '/tmp/backup.dump')).toThrow();
  });
});

describe('buildBackupKey', () => {
  it('shapes key as backups/YYYY/MM/DD/bhaktisetu-<ISO>.dump', () => {
    const iso = '2026-06-13T19:30:00.000Z';
    const key = buildBackupKey(new Date(iso));
    expect(key).toBe('backups/2026/06/13/bhaktisetu-2026-06-13T19-30-00-000Z.dump');
  });

  it('zero-pads single-digit months and days', () => {
    const iso = '2026-01-05T01:02:03.000Z';
    const key = buildBackupKey(new Date(iso));
    expect(key).toMatch(/^backups\/2026\/01\/05\//);
  });
});

describe('pickOldBackups (retention)', () => {
  // Generate N entries dated [now-0d .. now-(N-1)d] with the prod key shape.
  function fakeList(n, now) {
    const items = [];
    for (let d = 0; d < n; d++) {
      const t = new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
      const yyyy = t.getUTCFullYear();
      const mm = String(t.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(t.getUTCDate()).padStart(2, '0');
      const iso = t.toISOString().replace(/[:.]/g, '-');
      items.push({
        name: `bhaktisetu-${iso}.dump`,
        // emulate Supabase Storage list output (created_at ISO string)
        created_at: t.toISOString(),
        path: `backups/${yyyy}/${mm}/${dd}/bhaktisetu-${iso}.dump`,
      });
    }
    return items;
  }

  it('keeps 30 newest when given 35 dumps across last 35 days', () => {
    const now = new Date('2026-06-13T00:00:00.000Z');
    const list = fakeList(35, now);
    const toDelete = pickOldBackups(list, now, 30);
    expect(toDelete).toHaveLength(5);
    // All deleted entries must be older than 30 days.
    for (const item of toDelete) {
      const ageMs = now.getTime() - new Date(item.created_at).getTime();
      expect(ageMs).toBeGreaterThan(30 * 24 * 60 * 60 * 1000 - 1);
    }
  });

  it('returns empty when list has 30 or fewer entries', () => {
    const now = new Date('2026-06-13T00:00:00.000Z');
    expect(pickOldBackups(fakeList(30, now), now, 30)).toHaveLength(0);
    expect(pickOldBackups(fakeList(1, now), now, 30)).toHaveLength(0);
    expect(pickOldBackups([], now, 30)).toHaveLength(0);
  });

  it('skips entries with no created_at (defensive)', () => {
    const now = new Date('2026-06-13T00:00:00.000Z');
    const list = [
      { name: 'orphan.dump', path: 'backups/orphan.dump' },
      ...fakeList(31, now),
    ];
    const toDelete = pickOldBackups(list, now, 30);
    // Only the 31st newest (oldest) should be picked, orphan never.
    expect(toDelete).toHaveLength(1);
    expect(toDelete[0].name).not.toBe('orphan.dump');
  });
});
