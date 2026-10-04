/**
 * The Graft code-graph cache must not be tracked.
 *
 * `.gitignore` lists `graft/` and says the folder is a regenerable local cache,
 * but an ignore rule does not apply to files git already tracks, and 1,461 of
 * them (46 MB) were tracked. Every graph refresh then showed up as over a
 * thousand modified files, which buries real changes in `git status` and in
 * review. Untracking them fixes it once; this keeps it fixed, since the next
 * `git add -f` or `git add -A` from a stale checkout would quietly bring them
 * back.
 */
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';

const inGitCheckout = (() => {
  try {
    return execFileSync('git', ['rev-parse', '--is-inside-work-tree'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() === 'true';
  } catch {
    return false;
  }
})();

describe('graft cache', () => {
  it.skipIf(!inGitCheckout)('has no tracked files under graft/', () => {
    const tracked = execFileSync('git', ['ls-files', '--', 'graft'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).split('\n').filter(Boolean);
    expect(tracked.slice(0, 5), `${tracked.length} tracked graft files, e.g.`).toEqual([]);
  });

  it.skipIf(!inGitCheckout)('is ignored by .gitignore, so it cannot be added by accident', () => {
    // check-ignore exits 0 when the path is ignored.
    expect(() => execFileSync('git', ['check-ignore', '-q', 'graft/INDEX.md'])).not.toThrow();
  });
});
