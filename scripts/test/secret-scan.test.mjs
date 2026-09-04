/**
 * OPS-11 — pre-commit secret scan.
 *
 * This repository has already lost credentials to git history once:
 * `docs/chat-archive/038e0002-5099-4d22-83b2-f98bbf480df7.md` was added in
 * cc02057d, modified in aafa9386 and untracked in 085dd3ca. Untracking removed
 * it from the tip; the blob stays reachable from the first two trees forever.
 * Only rotation closes that, and rotation is the owner's.
 *
 * What IS closeable in code is the next one. A CI scan exists in
 * `.github/workflows/commitlint.yml`, but it sees pull requests only — a direct
 * push to `main` is never scanned, and the leak is already in history by the
 * time a PR would have run. A pre-commit hook is the only place that can stop a
 * credential BEFORE it becomes a commit, which is the point at which rotation
 * becomes mandatory.
 *
 * These tests drive `scripts/secret-scan.mjs`, the shared scanner both the hook
 * and CI can call, and then assert the hook actually wires it up.
 *
 * NO TEST IN THIS FILE CONTAINS A REAL CREDENTIAL. Every fixture is a
 * synthetic, structurally-valid, never-issued value.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { RULES, looksPlaceholder, scanDiff, stripShellComments } from '../secret-scan.mjs';

/** Build a `git diff -U0`-shaped patch for one file's added lines. */
function diffFor(file, addedLines, startLine = 1) {
  return [
    `diff --git a/${file} b/${file}`,
    `--- a/${file}`,
    `+++ b/${file}`,
    `@@ -0,0 +${startLine},${addedLines.length} @@`,
    ...addedLines.map((l) => `+${l}`),
  ].join('\n');
}

describe('rule table', () => {
  it('covers every credential shape this repo has actually leaked or uses', () => {
    const names = RULES.map(([name]) => name);
    expect(names).toContain('postgres-dsn-with-password');
    expect(names).toContain('jwt-like-key');
    expect(names).toContain('razorpay-live-key');
    expect(names).toContain('private-key-block');
  });

  it('every rule is a global regex, so scanning cannot silently stop at the first hit', () => {
    for (const [name, re] of RULES) {
      expect(re.global, `${name} is not global`).toBe(true);
    }
  });
});

describe('placeholder handling', () => {
  it('treats documentation placeholders as non-secrets', () => {
    for (const v of ['password', 'changeme', 'YOUR-PASSWORD', '<your-password>', '${DB_PASS}', '[YOUR-PASSWORD]', 'xxxxxxxx']) {
      expect(looksPlaceholder(v), `${v} should be a placeholder`).toBe(true);
    }
  });

  it('does not treat a real-shaped credential as a placeholder', () => {
    // 16 chars, mixed classes, no placeholder marker — the shape of the one
    // value in the leaked transcript that has to be assumed live.
    expect(looksPlaceholder('Kq7wZ2mTb9xR4vLp')).toBe(false);
  });
});

describe('scanDiff', () => {
  it('flags a Postgres DSN carrying a real-shaped password', () => {
    const diff = diffFor('apps/api/.env.production', [
      'DATABASE_URL=postgresql://postgres:***REMOVED***@db.example.supabase.co:5432/postgres',
    ]);
    const hits = scanDiff(diff);
    expect(hits).toHaveLength(1);
    expect(hits[0].name).toBe('postgres-dsn-with-password');
    expect(hits[0].file).toBe('apps/api/.env.production');
  });

  it('NEVER returns the matched value — only file, line and rule name', () => {
    const secret = 'Kq7wZ2mTb9xR4vLp';
    const diff = diffFor('x.env', [`DATABASE_URL=postgresql://u:***REMOVED***@h:5432/d`]);
    const hits = scanDiff(diff);
    expect(hits).toHaveLength(1);
    expect(Object.keys(hits[0]).sort()).toEqual(['file', 'line', 'name']);
    expect(JSON.stringify(hits)).not.toContain(secret);
  });

  it('ignores a DSN whose password is obviously a placeholder', () => {
    const diff = diffFor('README.md', [
      'postgresql://postgres:***REMOVED***@db.example.supabase.co:5432/postgres',
    ]);
    expect(scanDiff(diff)).toEqual([]);
  });

  it('scans markdown under docs/ — the exact file type that leaked here', () => {
    // ci.yml carries `paths-ignore: docs/**, **/*.md`. A scanner inheriting that
    // filter would have missed the leak this finding is about.
    const diff = diffFor('docs/chat-archive/session.md', [
      '  DATABASE_URL="postgresql://postgres:***REMOVED***@db.example.supabase.co:5432/postgres"',
    ]);
    expect(scanDiff(diff)).toHaveLength(1);
  });

  it('only looks at added lines — a removed credential is not a new leak', () => {
    const diff = [
      'diff --git a/x.env b/x.env',
      '--- a/x.env',
      '+++ b/x.env',
      '@@ -1 +0,0 @@',
      '-DATABASE_URL=postgresql://u:***REMOVED***@h:5432/d',
    ].join('\n');
    expect(scanDiff(diff)).toEqual([]);
  });

  it('reports the line number from the hunk header, not the diff offset', () => {
    const diff = diffFor('x.env', ['harmless', 'postgresql://u:***REMOVED***@h:5432/d'], 120);
    const hits = scanDiff(diff);
    expect(hits).toHaveLength(1);
    expect(hits[0].line).toBe(121);
  });

  it('attributes hits to the right file across a multi-file diff', () => {
    const diff = [
      diffFor('a/clean.ts', ['const x = 1;']),
      diffFor('b/dirty.env', ['postgresql://u:***REMOVED***@h:5432/d']),
    ].join('\n');
    const hits = scanDiff(diff);
    expect(hits).toHaveLength(1);
    expect(hits[0].file).toBe('b/dirty.env');
  });

  it('flags a private key block even though it would look like a placeholder', () => {
    const diff = diffFor('key.pem', ['-----BEGIN RSA PRIVATE KEY-----']);
    expect(scanDiff(diff).map((h) => h.name)).toEqual(['private-key-block']);
  });

  it('flags a live Razorpay key id', () => {
    const diff = diffFor('apps/web/.env', ['RAZORPAY_KEY_ID=rzp_live_A1b2C3d4E5f6G7']);
    expect(scanDiff(diff).map((h) => h.name)).toEqual(['razorpay-live-key']);
  });

  it('does not flag the test key ids this repo legitimately commits', () => {
    const diff = diffFor('apps/web/.env.example', ['RAZORPAY_KEY_ID=rzp_test_demo']);
    expect(scanDiff(diff)).toEqual([]);
  });

  it('exempts the scanner and its own tests, whose rule table is not a leak', () => {
    // `private-key-block` bypasses the placeholder allowlist by design, so the
    // literal in the rule table would otherwise flag this file forever.
    const diff = diffFor('scripts/secret-scan.mjs', ['-----BEGIN RSA PRIVATE KEY-----']);
    expect(scanDiff(diff)).toEqual([]);
    const diff2 = diffFor('scripts/test/secret-scan.test.mjs', ['-----BEGIN RSA PRIVATE KEY-----']);
    expect(scanDiff(diff2)).toEqual([]);
  });

  it('the exemption is exact-path, not a prefix — a sibling script is still scanned', () => {
    // An exemption matched by `startsWith` would let scripts/secret-scan.mjs.bak
    // (or anything under a scripts/secret-scan/ directory) smuggle a value out.
    const diff = diffFor('scripts/secret-scan.mjs.bak', [
      'postgresql://u:***REMOVED***@h:5432/d',
    ]);
    expect(scanDiff(diff)).toHaveLength(1);
  });

  it('survives an empty diff', () => {
    expect(scanDiff('')).toEqual([]);
    expect(scanDiff(undefined)).toEqual([]);
  });
});

describe('the pre-commit hook wires the scanner in', () => {
  // Shell comments are stripped first. The hook is heavily commented and several
  // comments name the scanner; a comment mentioning it is not the hook running
  // it. This is the guard-of-the-guard the audit keeps needing.
  const hook = readFileSync('.githooks/pre-commit', 'utf8');
  const code = stripShellComments(hook);

  it('stripShellComments removes comment lines but keeps the shebang and code', () => {
    const sample = ['#!/usr/bin/env bash', '# node scripts/secret-scan.mjs', 'echo hi'].join('\n');
    const stripped = stripShellComments(sample);
    expect(stripped).toContain('echo hi');
    expect(stripped).toContain('#!/usr/bin/env bash');
    expect(stripped).not.toContain('# node scripts/secret-scan.mjs');
  });

  it('actually invokes the scanner, not merely mentions it', () => {
    expect(code).toMatch(/node\s+scripts\/secret-scan\.mjs/);
  });

  it('scans the staged diff with -U0, which the line-number maths requires', () => {
    expect(code).toMatch(/--cached/);
    expect(code).toMatch(/-U0|--unified=0/);
  });

  it('does not filter out docs or markdown before scanning', () => {
    // The whole reason the CI scan lives in commitlint.yml rather than ci.yml.
    expect(code).not.toMatch(/paths-ignore|:!docs|\*\.md'\s*$/m);
  });

  it('does not exit 0 unconditionally before the scan runs', () => {
    // The existing roadmap block short-circuits with `exit 0` when no roadmap
    // item changed. If the secret scan sits after that, it never runs.
    const scanAt = code.search(/node\s+scripts\/secret-scan\.mjs/);
    const roadmapExitAt = code.search(/exit 0/);
    expect(scanAt).toBeGreaterThan(-1);
    expect(scanAt, 'the secret scan must run before any early exit').toBeLessThan(roadmapExitAt);
  });

  it('tells the committer how to bypass, so a false positive cannot trap them', () => {
    expect(hook).toMatch(/--no-verify/);
  });
});

describe('the hook is actually installed, not merely tracked', () => {
  // `.githooks/pre-commit` has been in the repo since 8fcbfe3 and its header
  // claimed core.hooksPath was "already set per repo". It is per-CLONE local
  // config, tracked by nothing — and it was NOT set in the working tree where
  // this scan was written. A tracked hook nobody's git points at protects
  // nobody, and nothing announces that.
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));

  it('root `prepare` wires the installer, so pnpm install turns hooks on', () => {
    expect(pkg.scripts?.prepare).toMatch(/scripts\/install-git-hooks\.mjs/);
  });

  it('the installer exists', () => {
    expect(() => readFileSync('scripts/install-git-hooks.mjs', 'utf8')).not.toThrow();
  });

  it('the installer can never fail an install', () => {
    // It runs inside `pnpm install`, including the Render Docker build where
    // there is no .git at all. A throw there fails the deploy.
    const src = readFileSync('scripts/install-git-hooks.mjs', 'utf8');
    expect(src).toMatch(/catch\s*\(/);
    expect(src).toMatch(/process\.exit\(0\)/);
    expect(src).not.toMatch(/process\.exit\([1-9]/);
  });
});
