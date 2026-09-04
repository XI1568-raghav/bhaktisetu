#!/usr/bin/env node
/**
 * Credential scanner for added lines of a unified diff. `OPS-11`.
 *
 * WHY THIS EXISTS AS A SEPARATE FILE. The same scan already runs in CI
 * (`.github/workflows/commitlint.yml`), but CI sees pull requests only. A direct
 * push to `main` is never scanned, and by the time any check could run the
 * credential is already a commit — at which point rotation is mandatory whatever
 * happens next. This repository has been there once already:
 * `docs/chat-archive/038e0002-5099-4d22-83b2-f98bbf480df7.md` was added in
 * cc02057d, modified in aafa9386 and untracked in 085dd3ca. Untracking removed it
 * from the tip and removed nothing from history.
 *
 * The pre-commit hook (`.githooks/pre-commit`) is the only place that can stop a
 * credential BEFORE it is a commit. This module is what it calls.
 *
 * KNOWN LIMITS, stated so nobody over-trusts it:
 *   - shape-based. A credential with no recognisable prefix — a bare token, a
 *     password as a plain YAML value — passes.
 *   - added lines only, so a pre-existing match in an untouched file cannot
 *     block unrelated work.
 *   - `git commit --no-verify` bypasses it, deliberately: a scanner that can
 *     trap someone is a scanner they will uninstall.
 *   - it can do nothing about anything already in history.
 *
 * NO MATCHED VALUE IS EVER RETURNED OR PRINTED — only file, line and rule name.
 * A tool that echoes the secret it found writes it into a terminal scrollback,
 * a CI log and a screenshot.
 *
 * CLI:  git diff --cached -U0 | node scripts/secret-scan.mjs
 *       node scripts/secret-scan.mjs --staged      (runs the git command itself)
 *   exit 0 = clean, 1 = possible credential found, 2 = the scan could not run.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

/**
 * Credential shapes. Each capture group is the VALUE to placeholder-check;
 * where there is no group the whole match is used.
 *
 * Every regex is global — a non-global regex used with `exec` in a loop either
 * misses later hits on the same line or spins forever, depending on which way
 * you get it wrong. The test asserts the flag rather than trusting review.
 */
export const RULES = [
  ['postgres-dsn-with-password', /postgres(?:ql)?:\/\/[^\s:@/]+:([^\s@/]+)@[^\s/]+/g],
  ['jwt-like-key', /\b(eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,})\b/g],
  ['razorpay-live-key', /\b(rzp_live_[A-Za-z0-9]{10,})\b/g],
  ['github-token', /\b(ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/g],
  ['resend-api-key', /\b(re_[A-Za-z0-9]{8}_[A-Za-z0-9]{20,})\b/g],
  ['aws-access-key-id', /\b(AKIA[0-9A-Z]{16})\b/g],
  ['private-key-block', /(-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----)/g],
];

/**
 * Files whose own content is the rule table, and which would therefore flag
 * themselves forever. Matched EXACTLY, never by prefix: a `startsWith` check
 * would exempt `scripts/secret-scan.mjs.bak` and anything under a directory of
 * the same name, which is a hole wide enough to carry a real value through.
 */
const EXEMPT_FILES = new Set([
  'scripts/secret-scan.mjs',
  'scripts/test/secret-scan.test.mjs',
  '.github/workflows/commitlint.yml',
]);

const PLACEHOLDER =
  /^(?:pw|pass|password|passwd|secret|changeme|example|test|dummy|placeholder|redacted|xxx+|yyy+|\*+|\.\.\.|your[-_a-z]*|my[-_a-z]*|<[^>]*>|\$\{?[A-Za-z_][A-Za-z0-9_]*\}?|%[A-Z_]+%|\[[^\]]*\])$/i;

/**
 * A value that is obviously documentation is not a leak. Keep this tight: every
 * entry is a way for a real secret to pass.
 */
export function looksPlaceholder(value) {
  const v = String(value ?? '');
  return (
    PLACEHOLDER.test(v) || v.includes('<') || v.includes('$') || v.includes('...') || v.length < 8
  );
}

/** Drop whole-line shell comments, so a comment naming a command proves nothing. */
export function stripShellComments(script) {
  return String(script ?? '')
    .split('\n')
    .filter((line) => {
      const t = line.trim();
      return !t.startsWith('#') || t.startsWith('#!');
    })
    .join('\n');
}

/**
 * Scan the added lines of a unified diff.
 *
 * The diff MUST be produced with zero context (`-U0`). Line numbers are counted
 * forward from each hunk header, and with context lines present that count
 * drifts — the number reported would point at the wrong line, which is worse
 * than reporting none.
 *
 * @returns {{file: string, line: number, name: string}[]} — never the value.
 */
export function scanDiff(diff) {
  const hits = [];
  let file = '(unknown)';
  let lineNo = 0;

  for (const raw of String(diff ?? '').split('\n')) {
    if (raw.startsWith('+++ b/')) {
      file = raw.slice(6);
      lineNo = 0;
      continue;
    }
    if (raw.startsWith('+++ ')) {
      file = '(unknown)';
      lineNo = 0;
      continue;
    }
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)/.exec(raw);
    if (hunk) {
      lineNo = Number(hunk[1]);
      continue;
    }
    if (!raw.startsWith('+')) continue;

    const text = raw.slice(1);
    const n = lineNo++;
    if (EXEMPT_FILES.has(file)) continue;

    for (const [name, re] of RULES) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(text)) !== null) {
        const value = m[1] ?? m[0];
        // A private key header has no "value" to placeholder-check, and any
        // occurrence of it is worth a human look.
        if (name !== 'private-key-block' && looksPlaceholder(value)) continue;
        hits.push({ file, line: n, name });
      }
    }
  }
  return hits;
}

/** Read the staged diff with the zero-context form `scanDiff` requires. */
export function stagedDiff() {
  return execFileSync('git', ['diff', '--cached', '-U0'], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
}

/** Read a diff piped on stdin. Returns '' when stdin is a tty or empty. */
function readStdin() {
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

// ── CLI ─────────────────────────────────────────────────────────────────────
// `import.meta.main` is not available on Node 20, which this repo still targets.
const invokedDirectly =
  process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('scripts/secret-scan.mjs');

if (invokedDirectly) {
  let diff = '';
  try {
    diff = process.argv.includes('--staged') ? stagedDiff() : readStdin();
  } catch (err) {
    console.error(`secret-scan: could not read the diff — ${err?.message ?? err}`);
    process.exit(2);
  }

  const hits = scanDiff(diff);
  if (hits.length === 0) {
    console.log('secret-scan: no credential-shaped values on added lines.');
    process.exit(0);
  }

  console.error('');
  console.error('  POSSIBLE CREDENTIAL IN STAGED CHANGES — commit blocked.');
  console.error('');
  for (const h of hits) {
    console.error(`    ${h.file}:${h.line}  (${h.name})`);
  }
  console.error('');
  console.error('  The value is deliberately not printed. Remove it from the change,');
  console.error('  and if it was ever real, ROTATE it — see docs/runbooks/secret-rotation.md.');
  console.error('  A false positive? `git commit --no-verify` bypasses this check.');
  console.error('');
  process.exit(1);
}
