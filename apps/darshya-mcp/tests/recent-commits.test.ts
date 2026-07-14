import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock execFile so we don't depend on real git history. execFile is called as
// execFile(cmd, args, callback) — we capture both and drive the callback.
const mockExecFile = vi.fn() as any;
vi.mock('node:child_process', () => ({
  execFile: (...args: any[]) => {
    // last arg is the callback (err, stdout, stderr)
    const cb = args[args.length - 1];
    mockExecFile(...args);
    cb(mockExecFile.__err, mockExecFile.__stdout, mockExecFile.__stderr);
  },
}));

import { recentCommits, RecentCommitsSchema } from '../src/tools/recent-commits.js';

beforeEach(() => {
  vi.clearAllMocks();
  mockExecFile.__err = null;
  mockExecFile.__stdout = '';
  mockExecFile.__stderr = '';
});

describe('recentCommits', () => {
  it('parses git log --pretty=format output into structured commits', async () => {
    mockExecFile.__stdout = [
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

  it('calls execFile with git + an args array (no shell), default count 10', async () => {
    mockExecFile.__stdout = 'aaa|R|2026-01-01|x';
    // default count
    await recentCommits({});

    // execFile(cmd, args, cb): cmd is 'git', args is the array.
    const [cmd, args] = mockExecFile.mock.calls[0];
    expect(cmd).toBe('git');
    expect(Array.isArray(args)).toBe(true);
    expect(args).toContain('-10');
    expect(args).toContain('--pretty=format:%h|%an|%ad|%s');
    expect(args).toContain('--date=short');
  });

  it('reflects the requested count in the args array', async () => {
    mockExecFile.__stdout = 'a|R|2026-01-01|x';
    await recentCommits({ count: 25 });
    const [, args] = mockExecFile.mock.calls[0];
    expect(args).toContain('-25');
  });

  it('REJECTS out-of-range / non-integer count via Zod (the injection-safety property)', async () => {
    // The whole security argument rests on count being a validated integer in
    // 1..50 — so a malicious or malformed count never reaches the shell. Lock it.
    expect(() => RecentCommitsSchema.parse({ count: 999 })).toThrow();
    expect(() => RecentCommitsSchema.parse({ count: 0 })).toThrow();
    expect(() => RecentCommitsSchema.parse({ count: -5 })).toThrow();
    expect(() => RecentCommitsSchema.parse({ count: 3.5 })).toThrow();
    // shell-metacharacter strings are not numbers at all → rejected.
    expect(() => RecentCommitsSchema.parse({ count: '5; rm -rf /' as any })).toThrow();
  });

  it('returns an error array on git failure', async () => {
    mockExecFile.__err = new Error('not a git repository');
    mockExecFile.__stderr = 'fatal: not a git repository';
    const data = JSON.parse((await recentCommits({})).content[0].text);
    expect(data.error).toMatch(/git|repository/i);
    expect(data.commits).toEqual([]);
  });

  it('handles empty git output gracefully', async () => {
    mockExecFile.__stdout = '';
    const data = JSON.parse((await recentCommits({})).content[0].text);
    expect(data.commits).toEqual([]);
  });
});
