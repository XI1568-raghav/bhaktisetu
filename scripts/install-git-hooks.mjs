#!/usr/bin/env node
/**
 * Point git at the tracked hooks in `.githooks/`. `OPS-11`.
 *
 * `.githooks/pre-commit` has been tracked since commit 8fcbfe3 and its own
 * header said "already set per repo" — but `core.hooksPath` is per-CLONE local
 * config, tracked by nothing, so a fresh clone (or one where it was reset to the
 * default `.git/hooks`) silently runs no hooks at all. That was the state of
 * this working tree when the secret scan was added to it, which is exactly the
 * way a hook stops protecting anyone without ever announcing it.
 *
 * Wired to the root `prepare` script, so `pnpm install` installs it.
 *
 * THIS SCRIPT MUST NEVER FAIL AN INSTALL. It runs inside `pnpm install`, which
 * includes the Render Docker build, where there is no `.git` directory at all.
 * Every path exits 0; the worst outcome is a printed note.
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const TARGET = '.githooks';

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
}

try {
  // CI checks out fresh for every job and never commits; installing there wastes
  // a subprocess and can only surprise someone.
  if (process.env.CI) {
    process.exit(0);
  }

  if (!existsSync('.git') && !existsSync(TARGET)) {
    // A packed source copy or a Docker build context — nothing to wire up.
    process.exit(0);
  }

  let current = '';
  try {
    current = git(['config', '--get', 'core.hooksPath']);
  } catch {
    current = ''; // unset — git exits 1, which is not an error here
  }

  if (current === TARGET) {
    process.exit(0);
  }

  git(['config', 'core.hooksPath', TARGET]);
  console.log(
    `git hooks: core.hooksPath -> ${TARGET}` +
      (current ? ` (was "${current}")` : '') +
      ' — pre-commit secret scan active (OPS-11).',
  );
} catch (err) {
  // Not a git repo, git not on PATH, read-only config: all fine, all non-fatal.
  console.log(
    `git hooks: not installed (${err?.message?.split('\n')[0] ?? err}). ` +
      `Run \`git config core.hooksPath ${TARGET}\` by hand to enable the pre-commit secret scan.`,
  );
}

process.exit(0);
