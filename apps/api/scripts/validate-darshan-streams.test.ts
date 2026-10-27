import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
// @ts-expect-error plain .mjs without types
import { channelPageExists, extractPinnedVideoIds, extractSeedChannels, extractSqlChannels, extractTempleChannels, findChannelConflicts, parseFeedHead } from './validate-darshan-streams.mjs';

const root = path.resolve(__dirname, '../../..');
const read = (p: string) => readFileSync(path.join(root, p), 'utf8');

describe('validate-darshan-streams extractors', () => {
  it('finds every configured channel in darshan.ts', () => {
    const rows = extractTempleChannels(read('apps/api/src/routes/darshan.ts'));
    expect(rows.length).toBeGreaterThanOrEqual(8);
    expect(rows.find((r: { slug: string }) => r.slug === 'kashi-vishwanath-varanasi')?.channelId).toBe('UCdMj2twWfMHXrWgX5oVdoyA');
  });
  it('ops SQL only names channel ids that are well formed and never Mahakaleshwar', () => {
    const rows = extractSqlChannels(read('ops/sql/darshan-channels-2026-10.sql'));
    expect(rows.length).toBe(11);
    expect(rows.some((r: { slug: string }) => r.slug === 'badrinath-uttarakhand')).toBe(true);
    for (const r of rows) expect(r.channelId).toMatch(/^UC[\w-]{22}$/);
    expect(rows.some((r: { slug: string }) => /mahakal/.test(r.slug))).toBe(false);
  });
  it('every SQL channel is also what the API serves for that slug', () => {
    const api = new Map(extractTempleChannels(read('apps/api/src/routes/darshan.ts')).map((r: { slug: string; channelId: string }) => [r.slug, r.channelId]));
    for (const r of extractSqlChannels(read('ops/sql/darshan-channels-2026-10.sql'))) {
      const served = api.get(r.slug) ?? api.get(r.slug === 'vaishno-devi-katra' ? 'vaishno-devi' : r.slug);
      if (served) expect(served).toBe(r.channelId);
    }
  });
  it('no slug has two channels and no channel serves two temples across code, SQL and seed', () => {
    const rows = [
      ...extractTempleChannels(read('apps/api/src/routes/darshan.ts')),
      ...extractSqlChannels(read('ops/sql/darshan-channels-2026-10.sql')),
      ...extractSeedChannels(read('apps/api/prisma/seed/darshan-streams.ts')),
    ];
    expect(findChannelConflicts(rows)).toEqual([]);
  });
  it('the seed only carries ids that the SQL review verified', () => {
    const sql = new Set(extractSqlChannels(read('ops/sql/darshan-channels-2026-10.sql')).map((r: { channelId: string }) => r.channelId));
    const seed = extractSeedChannels(read('apps/api/prisma/seed/darshan-streams.ts'));
    expect(seed.length).toBeGreaterThan(0);
    for (const r of seed) expect(sql.has(r.channelId), r.slug).toBe(true);
  });
  it('findChannelConflicts flags a reused channel and a slug with two channels', () => {
    const c = findChannelConflicts([
      { slug: 'a', channelId: 'UCaaaaaaaaaaaaaaaaaaaaaa' },
      { slug: 'b', channelId: 'UCaaaaaaaaaaaaaaaaaaaaaa' },
      { slug: 'c', channelId: 'UCcccccccccccccccccccccc' },
      { slug: 'c', channelId: 'UCdddddddddddddddddddddd' },
    ]);
    expect(c.map((x: { kind: string }) => x.kind).sort()).toEqual(['channel-multiple-temples', 'slug-multiple-channels']);
  });
  it('channelPageExists tells a real channel from a made-up id', () => {
    expect(channelPageExists('<title>SVBC TTD - YouTube</title>')).toBe(true);
    expect(channelPageExists('<html><head></head></html>')).toBe(false);
  });
  it('pinned id extraction ignores live_stream embeds', () => {
    expect(extractPinnedVideoIds("a 'https://www.youtube.com/embed/live_stream?channel=UCdMj2twWfMHXrWgX5oVdoyA' b 'https://www.youtube.com/embed/RwSHT3yg7MI'")).toEqual(['RwSHT3yg7MI']);
  });
  it('parseFeedHead reads newest date', () => {
    const h = parseFeedHead('<title>X</title><entry><published>2026-10-01T00:00:00Z</published></entry><entry><published>2026-10-18T00:00:00Z</published></entry>');
    expect(h.newest).toBe('2026-10-18T00:00:00Z');
  });
});
