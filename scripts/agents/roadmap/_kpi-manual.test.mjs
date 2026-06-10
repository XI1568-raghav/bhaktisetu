import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { scrapeManual } from './_kpi-manual.mjs';
import { writeFileSync, unlinkSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('scrapeManual', () => {
  let tmpDir;
  let yamlPath;

  beforeAll(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'kpi-manual-'));
    yamlPath = join(tmpDir, '_manual-kpis.yml');
    writeFileSync(yamlPath, [
      'last_updated: 2026-06-10',
      'values:',
      '  verified_temples_count: 12',
      '  iskcon_loi_status: prospect',
    ].join('\n'));
  });

  afterAll(() => {
    try { unlinkSync(yamlPath); } catch {}
  });

  it('returns value from yaml on hit', async () => {
    const items = [{ kpi: { source: 'manual', metric: 'verified_temples_count' } }];
    const res = await scrapeManual(items, { yamlPath });
    expect(res[0]).toMatchObject({ metric: 'verified_temples_count', value: 12, stale: false });
    expect(res[0].fetchedAt).toBeDefined();
  });

  it('returns stale + error on yaml miss', async () => {
    const items = [{ kpi: { source: 'manual', metric: 'no_such_metric' } }];
    const res = await scrapeManual(items, { yamlPath });
    expect(res[0]).toMatchObject({ metric: 'no_such_metric', stale: true, error: expect.stringMatching(/no manual value/) });
  });
});
