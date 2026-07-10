#!/usr/bin/env node
// Agent-friendly test summary: runs the vitest suite with the JSON reporter
// and prints a CONCISE summary — total/passed/failed/skipped + the NAMES of
// failing tests only. This is what the darshya-verify agent and the
// stop-verify-gate hook should consume, instead of wading through thousands
// of lines of verbose vitest TAP output (which agents misread).
//
// Usage:  pnpm test:agent            # full suite
//         pnpm test:agent apps/api   # scoped (passthrough args)
//
// Exit code = vitest's exit code (non-zero if any test failed), so CI / the
// verify-gate can gate on it. The JSON payload is also written to
// .claude/test-result.json for downstream agents to read.
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const passthrough = process.argv.slice(2);
const projectRoot = process.env.CLAUDE_PROJECT_DIR || process.cwd();

// vitest's --reporter=json ALSO prints the default checkmark output to stdout,
// which makes stdout unreliable to parse (the JSON blob is appended at the end,
// and `indexOf('{')` catches literal braces in test names). Instead we use
// --outputFile to write clean JSON to a known path, then read that file.
const dotClaude = join(projectRoot, '.claude');
mkdirSync(dotClaude, { recursive: true });
const resultPath = join(dotClaude, 'vitest-result.json');

const args = [
  'exec',
  'vitest',
  'run',
  '--reporter=json',
  `--outputFile=${resultPath}`,
  ...passthrough,
];
const res = spawnSync('pnpm', args, {
  cwd: projectRoot,
  encoding: 'utf8',
  timeout: 300000,
  shell: true,
});

let summary = null;
try {
  summary = JSON.parse(readFileSync(resultPath, 'utf8'));
} catch {
  /* vitest crashed before writing the file — fall through to raw fallback */
}

let agentOutput;
if (summary) {
  const total = summary.numTotalTests ?? summary.numTotalTestSuites ?? 0;
  const passed = summary.numPassedTests ?? 0;
  const failed = summary.numFailedTests ?? 0;
  const skipped = summary.numSkippedTests ?? 0;
  const duration = summary.startTime ? Date.now() - summary.startTime : null;

  // Collect failing test names (agent-actionable: these are what to fix).
  const failing = [];
  for (const suite of summary.testResults || []) {
    for (const t of suite.assertionResults || []) {
      if (t.status === 'failed') {
        failing.push(`${suite.name?.replace(projectRoot + '/', '')}:${t.title}`);
      }
    }
  }

  // Known pre-existing failure — NOT a regression. See darshya-code-review skill.
  const PREEXISTING = /canada-pandit-prospector/i;
  const realFailures = failing.filter((f) => !PREEXISTING.test(f));
  const preexistingFailures = failing.filter((f) => PREEXISTING.test(f));

  agentOutput = {
    verdict: realFailures.length === 0 ? 'PASS' : 'FAIL',
    total,
    passed,
    failed,
    skipped,
    durationMs: duration,
    failingTests: realFailures,
    preexistingKnownFailures: preexistingFailures,
    note:
      preexistingFailures.length > 0
        ? `${preexistingFailures.length} pre-existing known failure(s) excluded from verdict (canada-pandit-prospector.test.ts — SyntaxError/CSV_COLUMNS import, fails on clean main, NOT a regression).`
        : undefined,
  };
} else {
  // Couldn't read the JSON file — vitest crashed or reporter changed.
  agentOutput = {
    verdict: 'UNVERIFIED',
    error: 'Could not read vitest JSON outputFile',
    rawStdoutTail: (res.stdout || '').slice(-500),
    rawStderrTail: (res.stderr || '').slice(-500),
  };
}

// Persist the agent summary, print concise JSON to stdout.
try {
  writeFileSync(join(dotClaude, 'test-result.json'), JSON.stringify(agentOutput, null, 2));
} catch {
  /* non-fatal */
}

console.log(JSON.stringify(agentOutput, null, 2));
process.exit(res.status ?? 1);
