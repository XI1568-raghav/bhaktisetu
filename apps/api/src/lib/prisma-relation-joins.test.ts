import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Latency (2026-10-29): with Prisma's default strategy every relation in a
 * `select`/`include` is its own sequential query, so a booking list with three
 * relations (temple, puja type, user) cost four round trips to the remote
 * database in a row. Measured locally through a 0.4 s-per-round-trip proxy:
 * 1610 ms -> 406 ms, byte-identical rows. Enabling the `relationJoins` preview
 * feature makes Prisma resolve those in one joined query by default; no query
 * in the codebase changes. If the client on a deploy was generated without it,
 * nothing breaks, the reads just stay as slow as before.
 */
describe('prisma schema', () => {
  it('keeps relationJoins enabled so nested selects are one round trip', () => {
    const schema = readFileSync(path.join(__dirname, '../../prisma/schema.prisma'), 'utf8');
    const generator = schema.slice(schema.indexOf('generator client'), schema.indexOf('datasource db'));
    expect(generator).toMatch(/previewFeatures\s*=\s*\[[^\]]*"relationJoins"/);
  });
});
