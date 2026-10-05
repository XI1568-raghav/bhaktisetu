/**
 * prod-db-task guards, executed rather than eyeballed.
 *
 * Every refusal in scripts/ops/prod-db-task.sh happens BEFORE a connection is
 * opened, so these run with no database: an input that gets past the guards
 * reaches the "DATABASE_URL is empty" line, and that is how "allowed" is told
 * apart from "refused". Both directions are asserted, so a guard that refuses
 * everything cannot pass.
 */
import { describe, it, expect, afterAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import yaml from 'js-yaml';

const SCRIPT = 'scripts/ops/prod-db-task.sh';
const WORKFLOW = '.github/workflows/prod-db-task.yml';
const made = [];

function fixture(name, sql) {
  const p = `ops/sql/${name}`;
  writeFileSync(p, sql);
  made.push(p);
  return p;
}
afterAll(() => made.forEach((p) => rmSync(p, { force: true })));

function run(file, { mode, allow, url = '' } = {}) {
  const env = { PATH: process.env.PATH, DATABASE_URL: url, TASK_FILE: file };
  if (mode) env.TASK_MODE = mode;
  if (allow) env.ALLOW_DESTRUCTIVE = allow;
  const r = spawnSync('bash', [SCRIPT], { env, encoding: 'utf8' });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
}
const PASSED_GUARDS = /DATABASE_URL is empty/;

describe('prod-db-task.sh input guards', () => {
  it('refuses a path outside ops/sql, with traversal, or with a bad name', () => {
    for (const f of ['scripts/x.sql', 'ops/sql/../../etc/passwd.sql', 'ops/sql/Upper.sql', 'ops/sql/a b.sql', 'ops/sql/sub/x.sql', 'ops/sql/x.txt', '']) {
      const r = run(f);
      expect(r.code, f).not.toBe(0);
      expect(r.out).toMatch(/must match|\.\./);
    }
  });

  it('refuses a file that does not exist in the checked-out ref', () => {
    const r = run('ops/sql/nope-does-not-exist.sql');
    expect(r.code).not.toBe(0);
    expect(r.out).toMatch(/does not exist/);
  });

  it('refuses an unknown mode', () => {
    const f = fixture('t-mode.sql', 'SELECT 1;\n');
    const r = run(f, { mode: 'yolo' });
    expect(r.code).not.toBe(0);
    expect(r.out).toMatch(/dry-run or apply/);
  });

  it('lets a plain file through every guard, defaulting to dry-run', () => {
    const f = fixture('t-ok.sql', 'SELECT 1;\n');
    const r = run(f);
    expect(r.out).toMatch(PASSED_GUARDS);
  });

  it('lets both real task files through every guard', () => {
    for (const f of ['ops/sql/commission-default-80.sql', 'ops/sql/verify-commission-state.sql']) {
      expect(run(f).out, f).toMatch(PASSED_GUARDS);
    }
  });
});

describe('prod-db-task.sh content guards', () => {
  it.each([
    ['DROP TABLE users;'],
    ['drop   table users;'],
    ['DROP DATABASE x;'],
    ['DROP SCHEMA public CASCADE;'],
    ['TRUNCATE priests;'],
    ['truncate table priests;'],
  ])('refuses %s without allow_destructive', (sql) => {
    const f = fixture('t-destructive.sql', `${sql}\n`);
    const r = run(f);
    expect(r.code).not.toBe(0);
    expect(r.out).toMatch(/allow_destructive/);
    expect(r.out).not.toMatch(PASSED_GUARDS);
  });

  it('accepts the same statement when allow_destructive=true, with a warning', () => {
    const f = fixture('t-destructive2.sql', 'TRUNCATE priests;\n');
    const r = run(f, { allow: 'true' });
    expect(r.out).toMatch(/::warning::allow_destructive/);
    expect(r.out).toMatch(PASSED_GUARDS);
  });

  it('does not mistake DROP COLUMN / identifiers like truncated_at for a destructive statement', () => {
    const f = fixture('t-benign.sql', 'ALTER TABLE a DROP COLUMN b;\nSELECT truncated_at FROM t;\n');
    expect(run(f).out).toMatch(PASSED_GUARDS);
  });

  it.each([['COMMIT;'], ['rollback;'], ['BEGIN;'], ['START TRANSACTION;'], ['  END TRANSACTION;']])(
    'refuses transaction control %s (it would make a dry-run permanent)',
    (sql) => {
      const f = fixture('t-tx.sql', `SELECT 1;\n${sql}\n`);
      const r = run(f);
      expect(r.code).not.toBe(0);
      expect(r.out).toMatch(/transaction control/);
    },
  );

  it('allows plpgsql BEGIN ... END inside a DO block', () => {
    const f = fixture('t-do.sql', "DO $$\nBEGIN\n  RAISE NOTICE 'x';\nEND $$;\n");
    expect(run(f).out).toMatch(PASSED_GUARDS);
  });

  it.each([['\\! env'], ['\\i /etc/passwd'], ['SELECT 1 \\gexec'], ['\\copy t to stdout']])(
    'refuses psql meta-command %s',
    (sql) => {
      const f = fixture('t-meta.sql', `${sql}\n`);
      const r = run(f);
      expect(r.code).not.toBe(0);
      expect(r.out).toMatch(/backslash/);
    },
  );

  it('allows \\echo', () => {
    const f = fixture('t-echo.sql', "\\echo 'hello'\nSELECT 1;\n");
    expect(run(f).out).toMatch(PASSED_GUARDS);
  });
});

describe('prod-db-task.sh never prints the connection string', () => {
  it('prints the host only, masking user and password', () => {
    const f = fixture('t-host.sql', 'SELECT 1;\n');
    // An unreachable port keeps this offline; libpq's own error must not leak either.
    const url = ['postgresql:', '', 'postgres:Sup3rSecretPw@db.example.invalid:5432/postgres'].join('/');
    const r = run(f, { url });
    expect(r.out).toMatch(/Target host : db\.example\.invalid/);
    expect(r.out).not.toMatch(/Sup3rSecretPw/);
    expect(r.out).not.toMatch(/postgresql:\/\//);
  });
});

describe('prod-db-task.yml', () => {
  const doc = yaml.load(readFileSync(WORKFLOW, 'utf8'));
  // js-yaml parses the bare key `on` as boolean true under YAML 1.1.
  const triggers = doc.on ?? doc[true];

  it('is workflow_dispatch only, so it costs no scheduled minutes', () => {
    expect(Object.keys(triggers)).toEqual(['workflow_dispatch']);
  });

  it('defaults to dry-run, takes file and allow_destructive, and has a 10 minute cap', () => {
    const inputs = triggers.workflow_dispatch.inputs;
    expect(inputs.mode.default).toBe('dry-run');
    expect(inputs.mode.options).toEqual(['dry-run', 'apply']);
    expect(inputs.file.required).toBe(true);
    expect(inputs.allow_destructive.default).toBe(false);
    expect(doc.jobs.run['timeout-minutes']).toBe(10);
  });

  it('serialises runs and never cancels one mid-transaction', () => {
    expect(doc.concurrency.group).toBe('prod-db-task');
    expect(doc.concurrency['cancel-in-progress']).toBe(false);
  });

  it('reads the direct URL secret only in the run step, and never echoes it', () => {
    const text = readFileSync(WORKFLOW, 'utf8');
    expect(text.match(/secrets\.SUPABASE_DIRECT_URL/g)).toHaveLength(1);
    expect(text).not.toMatch(/echo[^\n]*DATABASE_URL/);
    expect(text).not.toMatch(/\bset -x\b/);
  });

  it('refuses apply from any ref but main', () => {
    const step = doc.jobs.run.steps[0];
    expect(step.if).toMatch(/inputs\.mode == 'apply'/);
    expect(step.if).toMatch(/refs\/heads\/main/);
  });

  it('the script it calls exists', () => {
    expect(existsSync(SCRIPT)).toBe(true);
  });
});
