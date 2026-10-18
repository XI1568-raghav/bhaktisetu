import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
// @ts-expect-error plain .mjs without types
import { extractPinnedVideoIds, extractSqlChannels, extractTempleChannels, parseFeedHead } from './validate-darshan-streams.mjs';

const root = path.resolve(__dirname, '../../..');
const read = (p: string) => readFileSync(path.join(root, p), 'utf8');

describe('validate-darshan-streams extractors', () => {
  it('finds every configured channel in darshan.ts', () => {
    const rows = extractTempleChannels(read('apps/api/src/routes/darshan.ts'));
    expect(rows.length).toBeGreaterThanOrEqual(9);
    expect(rows.find((r: { slug: string }) => r.slug === 'kashi-vishwanath-varanasi')?.channelId).toBe('UCdMj2twWfMHXrWgX5oVdoyA');
  });
  it('ops SQL only names channel ids that are well formed and never Mahakaleshwar', () => {
    const rows = extractSqlChannels(read('ops/sql/darshan-channels-2026-10.sql'));
    expect(rows.length).toBe(10);
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
  it('pinned id extraction ignores live_stream embeds', () => {
    expect(extractPinnedVideoIds("a 'https://www.youtube.com/embed/live_stream?channel=UCdMj2twWfMHXrWgX5oVdoyA' b 'https://www.youtube.com/embed/RwSHT3yg7MI'")).toEqual(['RwSHT3yg7MI']);
  });
  it('parseFeedHead reads newest date', () => {
    const h = parseFeedHead('<title>X</title><entry><published>2026-10-01T00:00:00Z</published></entry><entry><published>2026-10-18T00:00:00Z</published></entry>');
    expect(h.newest).toBe('2026-10-18T00:00:00Z');
  });
});
