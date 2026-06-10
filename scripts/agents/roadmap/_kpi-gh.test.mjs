import { describe, it, expect } from 'vitest';
import { scrapeGhRepo } from './_kpi-gh.mjs';

describe('scrapeGhRepo', () => {
  const items = [{ kpi: { source: 'gh', metric: 'open_issues', query: 'gh issue list --json number | jq length' } }];

  it('parses numeric output on success', async () => {
    const fakeExec = () => Buffer.from('42\n');
    const res = await scrapeGhRepo(items, { exec: fakeExec });
    expect(res[0]).toMatchObject({ metric: 'open_issues', value: 42, stale: false });
    expect(res[0].fetchedAt).toBeDefined();
  });

  it('returns stale on non-zero exit', async () => {
    const fakeExec = () => {
      const e = new Error('Command failed: gh issue list');
      e.status = 1;
      throw e;
    };
    const res = await scrapeGhRepo(items, { exec: fakeExec });
    expect(res[0]).toMatchObject({ metric: 'open_issues', stale: true, error: expect.stringMatching(/Command failed/) });
  });

  it('returns raw string value when output is non-numeric', async () => {
    const fakeExec = () => Buffer.from('active\n');
    const res = await scrapeGhRepo(items, { exec: fakeExec });
    expect(res[0]).toMatchObject({ metric: 'open_issues', value: 'active', stale: false });
  });
});
