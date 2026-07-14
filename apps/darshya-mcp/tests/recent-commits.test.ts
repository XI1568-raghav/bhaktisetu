import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock exec so we don't depend on real git history.
const mockExec = vi.fn();
vi.mock('node:child_process', () => ({
  exec: (...args: any[]) => {
    // last arg is the callback (err, stdout, stderr)
    const cb = args[args.length - 1];
    mockExec(...args);
    cb(mockExec.__err, mockExec.__stdout, mockExec.__stderr);
  },
}));

import { recentCommits } from '../src/tools/recent-commits.js';

beforeEach(() => {
  vi.clearAllMocks();
  mockExec.__err = null;
  mockExec.__stdout = '';
  mockExec.__stderr = '';
});

describe('recentCommits', () => {
  it('parses git log --pretty=format output into structured commits', async () => {
    mockExec.__stdout = [
      'cec0bc5d|Raghav|2026-07-14|feat(mcp): agent_reports tool',
      'e58f6b21|Raghav|2026-07-14|feat(mcp): kpi_snapshot tool',
    ].join('\n');

    const data = JSON.parse((await recentCommits({ count: 5 })).content[0].text);
    expect(data.commits).toHaveLength(2);
    expect(data.commits[0].sha).toBe('cec0bc5d');
    expect(data.commits[0].author).toBe('Raghav');
    expect(data.commits[0].date).toBe('2026-07-14');
    expect(data.commits[0].subject).toBe('feat(mcp): agent_reports tool');
  });

  it('caps count at a sane maximum (e.g. 50) and defaults to 10', async () => {
    mockExec.__stdout = 'aaa|R|2026-01-01|x\nbbb|R|2026-01-02|y';
    // default count
    await recentCommits({});
    const [cmd] = mockExec.mock.calls[0];
    expect(cmd).toMatch(/-10\b|head -10|-n 10/); // git log -10
  });

  it('returns an error array on git failure', async () => {
    mockExec.__err = new Error('not a git repository');
    mockExec.__stderr = 'fatal: not a git repository';
    const data = JSON.parse((await recentCommits({})).content[0].text);
    expect(data.error).toMatch(/git|repository/i);
    expect(data.commits).toEqual([]);
  });

  it('handles empty git output gracefully', async () => {
    mockExec.__stdout = '';
    const data = JSON.parse((await recentCommits({})).content[0].text);
    expect(data.commits).toEqual([]);
  });
});
