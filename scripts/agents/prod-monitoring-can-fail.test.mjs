/**
 * OPS-01 — the production monitors were configured so that they could not fail.
 *
 * Two separate mechanisms did it:
 *   - `scripts/agents/health-smoke.mjs` ended with an unconditional
 *     `process.exit(0)` (covered by health-smoke.test.mjs);
 *   - `.github/workflows/e2e.yml` carried `continue-on-error: true` twice, at
 *     job level AND again on the Playwright step.
 *
 * Result: Render suspended both services on 2026-08-17, darshya.online and
 * api.darshya.online served HTTP 503 for three days, and every scheduled check
 * in this repository reported green.
 *
 * This file guards the workflow half. It parses the YAML rather than grepping
 * it, which is deliberate: this very file, and the header of `e2e.yml` itself,
 * both contain the literal text `continue-on-error: true` inside a COMMENT
 * explaining why it was removed. A text scan would flag its own documentation
 * and then be "fixed" by deleting the assertion. `js-yaml` discards comments as
 * part of parsing, so only real configuration is ever examined.
 *
 * The job level and the step level are asserted as distinct facts — removing
 * one and leaving the other still suppresses the failure.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import yaml from 'js-yaml';

/**
 * Every place a workflow suppresses its own failure.
 * `continue-on-error` may be a literal boolean or an expression string; only an
 * explicit false (or absence) counts as "not suppressed".
 */
export function findFailSuppression(text) {
  const doc = yaml.load(text) ?? {};
  const suppressed = (v) => v !== undefined && v !== null && v !== false && v !== 'false';
  const found = [];
  for (const [jobId, job] of Object.entries(doc.jobs ?? {})) {
    if (suppressed(job?.['continue-on-error'])) found.push(`job:${jobId}`);
    const steps = Array.isArray(job?.steps) ? job.steps : [];
    steps.forEach((step, i) => {
      if (suppressed(step?.['continue-on-error'])) {
        found.push(`job:${jobId} step:${step?.name ?? step?.uses ?? i}`);
      }
    });
  }
  return found;
}

/** The `if:` guard on a named step, or undefined when the step has none. */
export function stepCondition(text, jobId, stepName) {
  const doc = yaml.load(text) ?? {};
  const steps = doc.jobs?.[jobId]?.steps ?? [];
  return steps.find((s) => s?.name === stepName)?.if;
}

const read = (p) => readFileSync(p, 'utf8');

// Verbatim shape of `.github/workflows/e2e.yml` before 2026-08-20, including a
// comment that mentions the flag — the exact trap a text-based guard falls into.
const PRE_FIX_E2E = `name: E2E (Playwright)

# E2E is INFORMATIONAL: continue-on-error stays true and the base URL is
# prod, so it must NOT gate PRs.

on:
  schedule:
    - cron: '0 4 * * 0'

jobs:
  e2e:
    runs-on: ubuntu-latest
    timeout-minutes: 25
    continue-on-error: true
    steps:
      - uses: actions/checkout@v4
      - name: Run Playwright (TD2 specs)
        run: pnpm exec playwright test tests/e2e --reporter=html,list
        continue-on-error: true
      - name: Upload HTML report
        if: always()
        uses: actions/upload-artifact@v4
`;

describe('OPS-01 — the scheduled production monitors must be able to report failure', () => {
  it('detects both suppression sites in the pre-fix workflow, and ignores the comment', () => {
    // Red-first proof, frozen as a fixture: the old file yields exactly two
    // violations — the job and the step. The comment on line 3, which contains
    // the literal `continue-on-error` text, contributes nothing.
    const found = findFailSuppression(PRE_FIX_E2E);
    expect(found).toEqual(['job:e2e', 'job:e2e step:Run Playwright (TD2 specs)']);
  });

  it('e2e.yml no longer suppresses its own failure at job or step level', () => {
    expect(findFailSuppression(read('.github/workflows/e2e.yml'))).toEqual([]);
  });

  it('agents-health.yml no longer suppresses its own failure', () => {
    expect(findFailSuppression(read('.github/workflows/agents-health.yml'))).toEqual([]);
  });

  it('agents-health.yml still commits the digest when the smoke run goes red', () => {
    // The artifact + history was the stated reason for swallowing the failure.
    // Keeping the artifact is a requirement; swallowing the failure was not.
    // Without `if: always()` the commit step is skipped on a red run and the
    // very outage the digest documents would never be recorded.
    const text = read('.github/workflows/agents-health.yml');
    expect(stepCondition(text, 'smoke', 'Commit report')).toBe('always()');
  });

  it('db-backup.yml — the 2026-08-20 precedent this change matches — can still fail', () => {
    expect(findFailSuppression(read('.github/workflows/db-backup.yml'))).toEqual([]);
  });
});
