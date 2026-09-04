#!/usr/bin/env node
// Health Agent — runs the full role smoke every 12h, writes a pass/fail digest,
// and FAILS THE RUN when it finds production down.
// Wraps apps/api/scripts/smoke-all-roles.mjs and pulls a short summary.
//
// OPS-01 — this script used to end with an unconditional `process.exit(0)` and
// the comment "Don't fail the workflow on smoke failures — we want the artifact
// + history." The wrapped smoke already exits 1 on any failing endpoint, so the
// one signal that mattered was read, printed, and discarded.
//
// The consequence was measured, not hypothetical: on 2026-08-17 Render
// suspended both free services for exceeding the account-wide 750 instance-hour
// cap, darshya.online and api.darshya.online served HTTP 503 for three days,
// and this agent reported a green tick on every twice-daily run.
//
// The artifact requirement was real and is kept — the digest is written BEFORE
// the exit code is applied, and `.github/workflows/agents-health.yml` commits it
// with `if: always()`. What changed is that a run which found production down
// now ends non-zero, exactly like `.github/workflows/db-backup.yml` was
// corrected on 2026-08-20 so a skipped backup stops reading as a successful one.
import { spawnSync } from 'node:child_process';
import { writeReport, TODAY, isoNow, API_BASE, WEB_BASE } from './_lib.mjs';

const SMOKE_TIMEOUT_MS = 240_000;

/**
 * Pull the `Total: N pass, M fail` trailer out of a smoke transcript.
 *
 * Scans the whole transcript for the LAST match rather than only the final
 * line: a trailing newline, a stderr interleave or a truncated tail all used to
 * turn a real result into a silent `0 pass / -1 fail`.
 *
 * @returns {{pass: number, fail: number}} `fail === -1` means "no totals line" —
 *   the smoke crashed, timed out or was truncated. That is a failure, not a zero.
 */
export function parseSmokeTotals(stdout) {
  const matches = [...String(stdout ?? '').matchAll(/Total:\s+(\d+)\s+pass,\s+(\d+)\s+fail/g)];
  if (matches.length === 0) return { pass: 0, fail: -1 };
  const last = matches[matches.length - 1];
  return { pass: parseInt(last[1], 10), fail: parseInt(last[2], 10) };
}

/**
 * The whole point of OPS-01: decide, from the smoke result alone, whether this
 * run represents a healthy production.
 *
 * Non-zero on every one of these, because each is indistinguishable from "the
 * site is down" to anyone reading a green tick:
 *   - the smoke reported ANY failing endpoint;
 *   - no totals line could be parsed (crash / timeout / truncated output);
 *   - zero checks passed AND zero failed, i.e. nothing actually ran;
 *   - the child process itself died (`status` null on signal/timeout, or non-zero).
 *
 * @param {{pass: number, fail: number, status: number|null}} r
 * @returns {0|1}
 */
export function exitCodeFor({ pass, fail, status }) {
  if (fail === null || fail === undefined || fail < 0) return 1;
  if (fail > 0) return 1;
  if (!(pass > 0)) return 1;
  if (status !== 0) return 1;
  return 0;
}

/** Render the digest that gets committed to docs/agent-reports/. */
export function buildReport({ pass, fail, status, stdout, code }) {
  const failingRows = String(stdout ?? '')
    .split('\n')
    .filter((l) => l.includes('[FAIL]'));

  const verdict =
    code === 0
      ? '✅ **HEALTHY** — every checked endpoint answered.'
      : '❌ **UNHEALTHY — this run is RED.** Production did not answer as expected. ' +
        'See `.github/workflows/agents-health.yml`; a `render-suspended`-style issue ' +
        'is filed automatically and this digest is still committed.';

  const parseNote =
    fail < 0
      ? '\n> ⚠ No `Total:` line was found in the smoke output — the smoke crashed, ' +
        'timed out or was truncated. Treated as a failure.\n'
      : '';

  return `# Health Smoke — ${TODAY} ${isoNow().slice(11, 19)}

> Runs every 12h via GH Actions. Hits public + per-role endpoints on prod.

${verdict}
${parseNote}
## Result

- **Pass**: ${pass}
- **Fail**: ${fail < 0 ? 'UNKNOWN (no totals line)' : fail}
- **Child exit**: ${status === null || status === undefined ? 'null (killed / timed out)' : status}
- **Agent exit**: ${code}
- **API**: ${API_BASE}
- **Web**: ${WEB_BASE}

${fail > 0 ? `## Failing endpoints (${failingRows.length})\n\n\`\`\`\n${failingRows.slice(0, 30).join('\n')}\n\`\`\`` : code === 0 ? '✓ All clear.' : ''}

## Tail

\`\`\`
${String(stdout ?? '').trim().split('\n').slice(-40).join('\n')}
\`\`\`

---
*Agent: health-smoke*
`;
}

function defaultSpawn() {
  return spawnSync('node', ['apps/api/scripts/smoke-all-roles.mjs', API_BASE, WEB_BASE], {
    encoding: 'utf8',
    timeout: SMOKE_TIMEOUT_MS,
  });
}

/**
 * Run the smoke, ALWAYS write the digest, and return the exit code the process
 * should use. Dependencies are injected so the decision is testable without
 * spawning anything or touching the report directory.
 */
export function runSmoke({ spawnFn = defaultSpawn, writeFn = writeReport } = {}) {
  const res = spawnFn() || {};
  const stdout = res.stdout || '';
  const { pass, fail } = parseSmokeTotals(stdout);
  const status = res.status === undefined ? null : res.status;
  const code = exitCodeFor({ pass, fail, status });

  // Artifact first, unconditionally — the history is written even when the run
  // is about to go red. That was the legitimate half of the old behaviour.
  writeFn('health-smoke', buildReport({ pass, fail, status, stdout, code }), {
    suffix: isoNow().slice(11, 13) + 'h',
  });

  return { code, pass, fail, status };
}

const isMain =
  import.meta.url === `file://${process.argv[1]}` ||
  (process.argv[1] && process.argv[1].endsWith('health-smoke.mjs'));

if (isMain) {
  const { code, pass, fail } = runSmoke();
  console.log(`Health: ${pass} pass / ${fail < 0 ? 'UNKNOWN' : fail} fail`);
  if (code !== 0) {
    console.error(
      `::error::Health smoke FAILED — ${fail < 0 ? 'no totals line (smoke crashed or timed out)' : `${fail} failing endpoint(s)`} against ${API_BASE} / ${WEB_BASE}. Production is not answering.`,
    );
  }
  process.exit(code);
}
