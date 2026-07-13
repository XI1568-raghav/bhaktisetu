import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

// We point the tools at a temp reports root so tests don't depend on the real
// docs/agent-reports/ contents.
const TMP_ROOT = join(process.cwd(), '.tmp-agent-reports-test');

beforeEach(() => {
  rmSync(TMP_ROOT, { recursive: true, force: true });
  mkdirSync(TMP_ROOT, { recursive: true });
  // A dated report.
  writeFileSync(join(TMP_ROOT, '2026-07-13-health-smoke-02h.md'), '# Health smoke\nall good');
  // A subdirectory report (the real dir has cmo/, cs/, sales/, etc.).
  mkdirSync(join(TMP_ROOT, 'cmo'), { recursive: true });
  writeFileSync(join(TMP_ROOT, 'cmo', '2026-07-12-weekly-digest.md'), '# CMO weekly\nstuff');
  // A long report to test truncation.
  const longBody = 'x'.repeat(20_000);
  writeFileSync(join(TMP_ROOT, '2026-07-12-long.md'), longBody);
});
afterEach(() => rmSync(TMP_ROOT, { recursive: true, force: true }));

// Mock env so REPORTS_ROOT resolves to our temp dir.
vi.mock('../src/env.js', () => ({
  loadEnv: () => ({ DIRECT_URL: 'postgresql://test:***REMOVED***@host/db' }),
  // also export a reportsRoot helper if the impl uses it
}));

import { agentReports, agentReportRead } from '../src/tools/agent-reports.js';

describe('agentReports (list)', () => {
  it('lists .md report paths (top-level + subdirs) sorted newest-first, capped', async () => {
    const result = await agentReports({ root: TMP_ROOT });
    const data = JSON.parse(result.content[0].text);
    expect(Array.isArray(data.reports)).toBe(true);
    expect(data.reports.length).toBeLessThanOrEqual(50);
    // each entry has name + relativePath + modifiedAt
    expect(data.reports[0].relativePath).toBeDefined();
    expect(data.reports[0].name).toBeDefined();
    expect(data.reports[0].modifiedAt).toBeDefined();
    // includes the subdir report (relative path with a slash)
    const rels = data.reports.map((r: any) => r.relativePath);
    expect(rels).toContain('2026-07-13-health-smoke-02h.md');
    // impl normalizes subdir paths to POSIX-style ('cmo/...') so assert the
    // POSIX form (join() would emit a backslash on Windows and false-fail).
    expect(rels).toContain('cmo/2026-07-12-weekly-digest.md');
  });
});

describe('agentReportRead (read)', () => {
  it('reads a report by relative path and returns its content', async () => {
    const result = await agentReportRead({
      path: '2026-07-13-health-smoke-02h.md',
      root: TMP_ROOT,
    });
    const data = JSON.parse(result.content[0].text);
    expect(data.relativePath).toBe('2026-07-13-health-smoke-02h.md');
    expect(data.content).toContain('# Health smoke');
    expect(data.truncated).toBe(false);
  });

  it('reads a report in a subdirectory', async () => {
    const rel = join('cmo', '2026-07-12-weekly-digest.md');
    const data = JSON.parse((await agentReportRead({ path: rel, root: TMP_ROOT })).content[0].text);
    expect(data.content).toContain('# CMO weekly');
  });

  it('truncates content over the limit and flags truncated=true', async () => {
    const data = JSON.parse(
      (await agentReportRead({ path: '2026-07-12-long.md', root: TMP_ROOT, limit: 1000 }))
        .content[0].text,
    );
    expect(data.truncated).toBe(true);
    expect(data.content.length).toBeLessThanOrEqual(1000);
  });

  it('REJECTS path traversal (..) — returns an error, does NOT read outside root', async () => {
    const data = JSON.parse(
      (await agentReportRead({ path: '../../../etc/passwd', root: TMP_ROOT })).content[0].text,
    );
    expect(data.error).toMatch(/traversal|outside|invalid/i);
    expect(data.content).toBeUndefined();
  });

  it('REJECTS absolute paths', async () => {
    const data = JSON.parse(
      (await agentReportRead({ path: 'C:\\Windows\\system32\\config\\sam', root: TMP_ROOT }))
        .content[0].text,
    );
    expect(data.error).toMatch(/traversal|outside|invalid|absolute/i);
  });

  it('returns a not-found error for a missing report', async () => {
    const data = JSON.parse(
      (await agentReportRead({ path: 'does-not-exist.md', root: TMP_ROOT })).content[0].text,
    );
    expect(data.error).toMatch(/not found|missing|exist/i);
  });
});
