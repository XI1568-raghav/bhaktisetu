import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Fastify from 'fastify';
import adminRoadmapRoutes, { __testing } from './admin-roadmap.js';

/**
 * /admin/roadmap aggregates Autonomous Roadmap Engine state from git-tracked
 * files. Admin role-gated. No DB. Tests verify auth + shape using the demo
 * token bypass path (NODE_ENV=test => allowed).
 */

let tmpRoot: string;
const ORIG_ROADMAP_ROOT = process.env.ROADMAP_ROOT;

beforeAll(() => {
  tmpRoot = mkdtempSync(join(tmpdir(), 'admin-roadmap-test-'));
  // _index.json
  writeFileSync(
    join(tmpRoot, '_index.json'),
    JSON.stringify({ generatedAt: '2026-06-10T00:00:00.000Z', items: [{ id: 'q1-eng-001' }] }),
  );
  // _kpi-cache.json
  writeFileSync(
    join(tmpRoot, '_kpi-cache.json'),
    JSON.stringify({ lastFullRefresh: '2026-06-10T00:00:00.000Z', entries: { nriD30Retention: { value: 30 } } }),
  );
  // _tripwires-global.yml
  writeFileSync(
    join(tmpRoot, '_tripwires-global.yml'),
    `version: 1\ntripwires:\n  - id: T-001\n    name: test tripwire\n  - id: T-002\n    name: another tripwire\n`,
  );
  // queue/
  mkdirSync(join(tmpRoot, 'queue'));
  writeFileSync(
    join(tmpRoot, 'queue', 'sample.md'),
    `---\nid: q-sample-001\ntitle: Sample queue item\nstatus: pending\n---\n\nbody text here\n`,
  );
  // decisions/2026-06/
  mkdirSync(join(tmpRoot, 'decisions', '2026-06'), { recursive: true });
  writeFileSync(
    join(tmpRoot, 'decisions', '2026-06', 'd-001.md'),
    '# Decision 001\n\nFirst decision content.\n',
  );
  writeFileSync(
    join(tmpRoot, 'decisions', '2026-06', 'd-002.md'),
    '# Decision 002\n\nSecond decision content.\n',
  );

  process.env.ROADMAP_ROOT = tmpRoot;
});

afterAll(() => {
  if (ORIG_ROADMAP_ROOT) process.env.ROADMAP_ROOT = ORIG_ROADMAP_ROOT;
  else delete process.env.ROADMAP_ROOT;
  try {
    rmSync(tmpRoot, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
});

describe('admin-roadmap helpers', () => {
  const { readQueue, readLastDecisions, parseTripwiresYaml } = __testing;

  it('readQueue parses frontmatter from .md files', () => {
    const items = readQueue(tmpRoot);
    expect(items).toHaveLength(1);
    expect(items[0]!.filename).toBe('sample.md');
    expect((items[0] as Record<string, unknown>).id).toBe('q-sample-001');
    expect((items[0] as Record<string, unknown>).status).toBe('pending');
  });

  it('readLastDecisions walks YYYY-MM subdirs recursively', () => {
    const decisions = readLastDecisions(tmpRoot, 20);
    expect(decisions).toHaveLength(2);
    const filenames = decisions.map((d) => d.filename).sort();
    expect(filenames[0]).toContain('d-001.md');
    expect(filenames[1]).toContain('d-002.md');
    expect(decisions[0]!.content.length).toBeLessThanOrEqual(4000);
  });

  it('readLastDecisions truncates content to 4000 chars', () => {
    const dir = mkdtempSync(join(tmpdir(), 'admin-roadmap-trunc-'));
    mkdirSync(join(dir, 'decisions', '2026-06'), { recursive: true });
    const big = 'x'.repeat(5000);
    writeFileSync(join(dir, 'decisions', '2026-06', 'big.md'), big);
    const decisions = readLastDecisions(dir, 20);
    expect(decisions[0]!.content.length).toBe(4000);
    rmSync(dir, { recursive: true, force: true });
  });

  it('parseTripwiresYaml extracts the tripwires list', () => {
    const yaml = `version: 1\ntripwires:\n  - id: T-001\n    name: foo\n  - id: T-002\n    name: bar\n`;
    const parsed = parseTripwiresYaml(yaml);
    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toMatchObject({ id: 'T-001', name: 'foo' });
    expect(parsed[1]).toMatchObject({ id: 'T-002', name: 'bar' });
  });
});

describe('GET /admin/roadmap', () => {
  async function buildApp() {
    const app = Fastify({ logger: false });
    await app.register(adminRoadmapRoutes, { prefix: '/api/v1' });
    return app;
  }

  it('401 without auth token', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/v1/admin/roadmap' });
    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it('403 if user is not admin', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/roadmap',
      headers: { authorization: 'Bearer demo-devotee' },
    });
    expect(res.statusCode).toBe(403);
    await app.close();
  });

  it('200 with admin token and returns shape with all 5 top-level keys', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/roadmap',
      headers: { authorization: 'Bearer demo-admin' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as Record<string, unknown>;
    expect(body).toHaveProperty('index');
    expect(body).toHaveProperty('queue');
    expect(body).toHaveProperty('decisions');
    expect(body).toHaveProperty('kpis');
    expect(body).toHaveProperty('tripwires');
    expect(Array.isArray(body.queue)).toBe(true);
    expect(Array.isArray(body.decisions)).toBe(true);
    expect((body.tripwires as { all: unknown[] }).all.length).toBe(2);
    await app.close();
  });
});
