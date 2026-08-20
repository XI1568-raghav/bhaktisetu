/**
 * OPS-01 — the health monitor was built so it could never fail.
 *
 * `scripts/agents/health-smoke.mjs` ended with an unconditional
 * `process.exit(0)`. `apps/api/scripts/smoke-all-roles.mjs`, which it wraps,
 * already exits 1 when any endpoint fails — that signal was read, printed and
 * then thrown away. So on 2026-08-17 Render suspended both services for
 * exceeding the account-wide free instance-hour cap, darshya.online and
 * api.darshya.online served HTTP 503 for three days, and `agents-health.yml`
 * reported a green tick on every one of its twice-daily runs.
 *
 * The reason given in the source was "we want the artifact + history". That is
 * a real requirement and it is kept: the digest is still written on a failing
 * run, and the workflow still commits it (`if: always()`). What changes is that
 * a run which found production down now ends non-zero.
 *
 * These assertions are on the decision itself, not on the text of the file — a
 * source-text guard would pass the moment someone reworded the comment.
 */
import { describe, it, expect } from 'vitest';

// This module used to call run() at import time, which spawned the full role
// smoke against production. Point both bases at a closed local port so the
// red-first run of this file fails fast instead of hammering prod.
process.env.API_BASE = process.env.API_BASE || 'http://127.0.0.1:9';
process.env.WEB_BASE = process.env.WEB_BASE || 'http://127.0.0.1:9';

const { parseSmokeTotals, exitCodeFor, runSmoke } = await import('./health-smoke.mjs');

const CLEAN_TRANSCRIPT = [
  'Smoke API=https://api.darshya.online WEB=https://darshya.online',
  '',
  '=== public ===',
  '  [PASS] api   200  /health',
  '',
  'Total: 120 pass, 0 fail',
  '',
].join('\n');

const DOWN_TRANSCRIPT = [
  'Smoke API=https://api.darshya.online WEB=https://darshya.online',
  '',
  '=== public ===',
  '  [FAIL] api   503  /health  -- x-render-routing: suspended',
  '  [FAIL] api   503  /api/v1/temples  -- x-render-routing: suspended',
  '  [FAIL] web   503  /  -- x-render-routing: suspended',
  '',
  'Total: 0 pass, 137 fail',
  '',
].join('\n');

describe('OPS-01 — a health smoke that found production down must fail the run', () => {
  it('parses the totals trailer out of a full transcript', () => {
    expect(parseSmokeTotals(CLEAN_TRANSCRIPT)).toEqual({ pass: 120, fail: 0 });
    expect(parseSmokeTotals(DOWN_TRANSCRIPT)).toEqual({ pass: 0, fail: 137 });
  });

  it('reports fail = -1 when no totals line exists (crash / timeout / truncation)', () => {
    expect(parseSmokeTotals('')).toEqual({ pass: 0, fail: -1 });
    expect(parseSmokeTotals('Smoke API=...\nboom\n')).toEqual({ pass: 0, fail: -1 });
  });

  it('exits non-zero when the smoke reported failing endpoints', () => {
    // The exact shape of the three-day outage: every endpoint 503.
    expect(exitCodeFor({ pass: 0, fail: 137, status: 1 })).toBe(1);
    // And a partial outage too — one failing endpoint is still a failure.
    expect(exitCodeFor({ pass: 119, fail: 1, status: 1 })).toBe(1);
  });

  it('exits non-zero when the totals line could not be parsed', () => {
    expect(exitCodeFor({ pass: 0, fail: -1, status: 0 })).toBe(1);
  });

  it('exits non-zero when nothing ran at all', () => {
    // 0 pass / 0 fail means the smoke produced no checks. That is not health.
    expect(exitCodeFor({ pass: 0, fail: 0, status: 0 })).toBe(1);
  });

  it('exits non-zero when the child process itself died (timeout / signal)', () => {
    expect(exitCodeFor({ pass: 120, fail: 0, status: null })).toBe(1);
    expect(exitCodeFor({ pass: 120, fail: 0, status: 143 })).toBe(1);
  });

  it('exits zero only for a clean, non-empty, all-pass run', () => {
    expect(exitCodeFor({ pass: 120, fail: 0, status: 0 })).toBe(0);
  });

  it('still writes the digest artifact on a failing run', () => {
    // The artifact + history was the stated reason for swallowing the exit
    // code. Keep the artifact; drop the swallow.
    const writes = [];
    const result = runSmoke({
      spawnFn: () => ({ stdout: DOWN_TRANSCRIPT, status: 1 }),
      writeFn: (name, body) => {
        writes.push({ name, body });
        return `docs/agent-reports/${name}.md`;
      },
    });

    expect(result.code).toBe(1);
    expect(writes).toHaveLength(1);
    expect(writes[0].name).toBe('health-smoke');
    expect(writes[0].body).toContain('137');
    expect(writes[0].body).toContain('/api/v1/temples');
  });

  it('writes the digest and returns 0 on a clean run', () => {
    const writes = [];
    const result = runSmoke({
      spawnFn: () => ({ stdout: CLEAN_TRANSCRIPT, status: 0 }),
      writeFn: (name, body) => {
        writes.push({ name, body });
        return `docs/agent-reports/${name}.md`;
      },
    });

    expect(result.code).toBe(0);
    expect(writes).toHaveLength(1);
  });
});
