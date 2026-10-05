/**
 * OPS-02 — the workflow's own gate, exercised rather than eyeballed.
 *
 * The script can be as honest as it likes; the thing a human actually reads is
 * the green tick on `db-backup`. That tick is decided by one bash block in
 * .github/workflows/db-backup.yml, and for months it decided "green" for a run
 * that had taken no backup at all. A shell gate nobody executes is exactly the
 * kind of code that drifts back into lying.
 *
 * So: extract that step's `run:` block from the YAML and actually run it,
 * across the full range of JSON the script can produce.
 *
 * BOTH DIRECTIONS, on purpose. Six inputs must turn the run red and three must
 * leave it green. A gate that only ever fails would pass every "does it reject
 * X?" test while being useless, which is how the render-hours-guard false alarm
 * got itself ignored — it was red no matter what, so red stopped meaning
 * anything and the real outage went unnoticed.
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import yaml from 'js-yaml';

const execFileAsync = promisify(execFile);

const HERE = dirname(fileURLToPath(import.meta.url));
const WORKFLOW = join(HERE, '..', '..', '..', '.github', 'workflows', 'db-backup.yml');
const STEP_NAME = 'Assert a real, verified, offsite backup was produced';

// The script is handed to bash as a FILE, never as a multi-line `-c` argument:
// on Windows, Git Bash mangles newlines inside a command-line argument and the
// child produces nothing at all.
//
// The timeout is deliberately huge. On Linux CI each case is milliseconds, but
// process creation under Git Bash on Windows costs seconds — a bare
// `bash -c 'echo hi'` was measured at ~6s on the author's machine, and one gate
// run, which spawns ten or so grep/head/cut children, at ~20s. A tight timeout
// here does not catch a bug; it just makes the suite fail on Windows.
//
// The spawn is ASYNC on purpose. `spawnSync` blocks the worker's event loop for
// the whole run, and vitest then reports `Timeout calling "onTaskUpdate"` as an
// unhandled error even though every assertion passed — a green suite carrying a
// red error line, which is its own small version of the lie this file is about.
const SCRATCH = mkdtempSync(join(tmpdir(), 'db-backup-gate-'));
const BASH_TIMEOUT_MS = 120_000;
const CASE_TIMEOUT_MS = 150_000;

async function bashFile(script) {
  const path = join(SCRATCH, `gate-${Math.random().toString(36).slice(2)}.sh`);
  writeFileSync(path, script.replace(/\r\n/g, '\n'), 'utf8');
  try {
    const { stdout, stderr } = await execFileAsync('bash', [path.replace(/\\/g, '/')], {
      encoding: 'utf8',
      timeout: BASH_TIMEOUT_MS,
      maxBuffer: 8 * 1024 * 1024,
    });
    return { status: 0, stdout, stderr, error: null };
  } catch (err) {
    // A non-zero exit lands here with `code` set to the exit status; a failure
    // to spawn at all (no bash, timeout) has no numeric code.
    const status = typeof err?.code === 'number' ? err.code : null;
    return {
      status,
      stdout: err?.stdout || '',
      stderr: err?.stderr || '',
      error: status === null ? err : null,
    };
  }
}

const probe = await bashFile('echo PROBE_OK');
const hasBash = probe.status === 0 && /PROBE_OK/.test(probe.stdout || '');

vi.setConfig({ testTimeout: CASE_TIMEOUT_MS, hookTimeout: CASE_TIMEOUT_MS });

let assertScript;

beforeAll(() => {
  const doc = yaml.load(readFileSync(WORKFLOW, 'utf8'));
  const step = doc.jobs.backup.steps.find((s) => s.name === STEP_NAME);
  if (!step) throw new Error(`workflow step "${STEP_NAME}" not found — did it get renamed?`);
  assertScript = step.run;
});

/**
 * Run the real workflow step against a given backup-out.json body.
 * Returns { code, out } — `code` is what GitHub would use to colour the run.
 */
async function runGate(json) {
  const script = [
    'set +e',
    'rm -f /tmp/backup-out.json /tmp/step-summary.md',
    "cat > /tmp/backup-out.json <<'DARSHYA_JSON_EOF'",
    json,
    'DARSHYA_JSON_EOF',
    'export GITHUB_STEP_SUMMARY=/tmp/step-summary.md',
    ': > "$GITHUB_STEP_SUMMARY"',
    '(',
    assertScript,
    ')',
    'gate_code=$?',
    'echo "---SUMMARY---"',
    'cat "$GITHUB_STEP_SUMMARY"',
    'exit $gate_code',
  ].join('\n');

  const res = await bashFile(script);
  if (res.error) throw new Error(`bash failed to run the gate: ${res.error.message}`);
  return { code: res.status, out: `${res.stdout || ''}${res.stderr || ''}` };
}

const BIG = 8_400_000;

const GREEN = JSON.stringify({
  ok: true,
  bucket: 'db-backups',
  key: 'backups/2026/09/04/bhaktisetu-x.dump',
  destinations: [{ kind: 's3', verified: true, verifiedBytes: BIG }],
  offsite: true,
  sameProject: false,
  verified: true,
  sizeBytes: BIG,
  tocEntries: 412,
  sha256: 'a'.repeat(64),
});

describe.skipIf(!hasBash)('db-backup.yml — the step that decides the green tick', () => {
  // ── must turn the run RED ────────────────────────────────────────────────

  it('fails when the script produced no output at all', async () => {
    const { code } = await runGate('');
    expect(code).not.toBe(0);
  });

  it('fails on a skipped run, and says no restore point exists', async () => {
    const { code, out } = await runGate(
      JSON.stringify({
        ok: false,
        skipped: true,
        reason: 'missing-env',
        missing: ['SUPABASE_DB_URL', 'SUPABASE_URL'],
      }),
    );
    expect(code).not.toBe(0);
    expect(out).toMatch(/NO BACKUP WAS TAKEN/);
    expect(out).toMatch(/SUPABASE_DB_URL/);
  });

  it('still fails on the legacy skip shape that claimed ok:true', async () => {
    // Belt for the old script output, in case an older script ever runs here.
    const { code, out } = await runGate(
      JSON.stringify({ ok: true, skipped: true, reason: 'missing-env', missing: ['SUPABASE_URL'] }),
    );
    expect(code).not.toBe(0);
    expect(out).toMatch(/NO BACKUP WAS TAKEN/);
  });

  it('fails when the backup errored, and names the stage', async () => {
    const { code, out } = await runGate(
      JSON.stringify({ ok: false, stage: 'pg_dump', error: 'pg_dump exited 1' }),
    );
    expect(code).not.toBe(0);
    expect(out).toMatch(/pg_dump/);
  });

  it('fails on a zero-byte success — the literal finding', async () => {
    const { code, out } = await runGate(
      JSON.stringify({ ok: true, sizeBytes: 0, tocEntries: 0, verified: true, offsite: true }),
    );
    expect(code).not.toBe(0);
    expect(out).toMatch(/not a restore point/i);
  });

  it('fails a big file that pg_restore could not enumerate', async () => {
    const { code, out } = await runGate(
      JSON.stringify({ ok: true, sizeBytes: BIG, tocEntries: 0, verified: true, offsite: true }),
    );
    expect(code).not.toBe(0);
    expect(out).toMatch(/TOC entries/i);
  });

  // ── must leave the run GREEN ─────────────────────────────────────────────

  it('PASSES a real, verified, offsite backup and reports the numbers', async () => {
    const { code, out } = await runGate(GREEN);
    expect(code).toBe(0);
    expect(out).toMatch(/Backup verified/);
    expect(out).toMatch(new RegExp(String(BIG)));
    expect(out).toMatch(/412/);
    expect(out).not.toMatch(/::error::/);
  });

  it('passes but WARNS when the store would not confirm the stored size', async () => {
    const { code, out } = await runGate(
      JSON.stringify({ ok: true, sizeBytes: BIG, tocEntries: 412, verified: false, offsite: true }),
    );
    expect(code).toBe(0);
    expect(out).toMatch(/::warning::/);
    expect(out).toMatch(/did not confirm/i);
  });

  it('passes but WARNS when the only copy sits in the account it insures', async () => {
    const { code, out } = await runGate(
      JSON.stringify({
        ok: true,
        sizeBytes: BIG,
        tocEntries: 412,
        verified: true,
        offsite: false,
        sameProject: true,
      }),
    );
    expect(code).toBe(0);
    expect(out).toMatch(/::warning::/);
    expect(out).toMatch(/same Supabase project/i);
  });

  it('passes an artifact-only run (no object store) but WARNS that nothing is offsite', async () => {
    const { code, out } = await runGate(
      JSON.stringify({
        ok: true,
        artifactOnly: true,
        sizeBytes: BIG,
        tocEntries: 412,
        verified: false,
        offsite: false,
        sameProject: false,
      }),
    );
    expect(code).toBe(0);
    expect(out).toMatch(/::warning::No object store is configured/);
    expect(out).not.toMatch(/::error::/);
  });

  it('still fails an artifact-only run whose dump is empty', async () => {
    const { code } = await runGate(
      JSON.stringify({ ok: true, artifactOnly: true, sizeBytes: 0, tocEntries: 0, offsite: false }),
    );
    expect(code).not.toBe(0);
  });
});

describe('db-backup.yml — structure', () => {
  it('falls back from SUPABASE_DB_URL to SUPABASE_DIRECT_URL and keeps the dump 7 days', () => {
    const doc = yaml.load(readFileSync(WORKFLOW, 'utf8'));
    const run = doc.jobs.backup.steps.find((s) => s.id === 'backup');
    expect(run.env.SUPABASE_DB_URL).toMatch(/secrets\.SUPABASE_DB_URL \|\| secrets\.SUPABASE_DIRECT_URL/);
    const upload = doc.jobs.backup.steps.find((s) => /upload-artifact/.test(s.uses || ''));
    expect(upload.with['retention-days']).toBe(7);
    expect(upload.with['if-no-files-found']).toBe('ignore');
  });

  it('parses as YAML and keeps the gate wired into the backup job', () => {
    const doc = yaml.load(readFileSync(WORKFLOW, 'utf8'));
    const names = doc.jobs.backup.steps.map((s) => s.name).filter(Boolean);
    expect(names).toContain(STEP_NAME);
    // The gate must run even when the backup step already exited non-zero,
    // otherwise a bare exit code reaches the operator with no explanation.
    const gate = doc.jobs.backup.steps.find((s) => s.name === STEP_NAME);
    expect(gate.if).toBe('always()');
  });

  it('installs the pg_restore the integrity check depends on', () => {
    const doc = yaml.load(readFileSync(WORKFLOW, 'utf8'));
    const runs = doc.jobs.backup.steps.map((s) => s.run || '').join('\n');
    expect(runs).toMatch(/pg_restore --version/);
  });
});
