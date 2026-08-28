/**
 * Ops runbook honesty guard — OPS-02 / OPS-03 / OPS-08 / OPS-10.
 *
 * These are the four ops findings whose whole subject is a document. A document
 * is read once, under stress, by someone who believes it, so "the prose is
 * wrong" is the defect itself and not a cosmetic issue. What this file asserts
 * is therefore not style: every check below corresponds to an instruction that,
 * followed literally today, produces the wrong outcome.
 *
 *   OPS-02  docs/runbooks/db-restore.md must name the three secrets the owner
 *           has to set, and must dispatch the workflow copy that actually
 *           carries the verification guards.
 *   OPS-03  the restore path must work when the Supabase project is the thing
 *           that was lost — which is the entire reason an offsite copy exists.
 *   OPS-08  docs/free-tier-budgets.md must not claim `render-hours-guard.yml`
 *           can be dispatched from a feature branch. It cannot; the workflow's
 *           own header was corrected on 2026-08-21 and the doc was not.
 *   OPS-10  the two multi-region documents describe infrastructure that has
 *           never existed and must be marked superseded, like the DR runbook
 *           beside them.
 *
 * ON THE TEXT STRIPPER. Several of these documents legitimately REPRODUCE the
 * wrong instruction in order to correct it — that is the point of a correction,
 * and a reader who half-remembers the old page has to meet it. A naive substring
 * scan would then flag the correction itself, which is the failure mode this
 * audit has now hit eight times. So prose checks run over `documentVoice()`,
 * which drops the three constructs these documents quote INTO — fenced code
 * blocks, blockquote lines, and markdown table rows (every such table here is a
 * two-column "removed instruction | reality" ledger). What is left is the
 * document asserting in its own voice, which is the only thing worth banning.
 * The stripper has its own tests below, including one proving it does not simply
 * swallow the whole file.
 *
 * Checks about COMMANDS deliberately do NOT strip anything, because commands
 * live in fences; those are written as "every occurrence must look like X",
 * which a quotation cannot satisfy by accident.
 *
 * The contract the OPS-10 bans encode: fictional infrastructure may appear in
 * these documents ONLY inside the quoted ledger, never in a paragraph — even a
 * paragraph that is denying it. That is stricter than strictly necessary, and
 * deliberately so: "we only mentioned it to say it does not exist" is exactly
 * the sentence a future rewrite drifts back through.
 *
 * WHERE THIS RUNS: named explicitly in the `Ops guards` step of
 * `.github/workflows/ci.yml`, because `turbo test` does not include the root
 * vitest project and nothing under `scripts/` runs otherwise. That workflow
 * carries `paths-ignore: docs/**`, so a DOCS-ONLY pull request skips these
 * assertions; they run on any PR that also touches code. Widening the filter
 * costs free-tier minutes on every docs commit — see docs/free-tier-budgets.md.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import yaml from 'js-yaml';

const DB_RESTORE = 'docs/runbooks/db-restore.md';
const DR = 'docs/runbooks/disaster-recovery.md';
const BUDGETS = 'docs/free-tier-budgets.md';
const DR_STUB = 'docs/engineering/disaster-recovery-runbook.md';
const MR_FAILOVER = 'docs/engineering/multi-region-failover-plan.md';
const MR_STRATEGY = 'docs/engineering/multi-region-deployment-strategy.md';

const read = (p) => readFileSync(p, 'utf8');

/**
 * Remove the parts of a markdown document that REPRODUCE something rather than
 * assert it — fenced code blocks, blockquote lines, and table rows — leaving
 * the document speaking in its own voice.
 */
export function documentVoice(md) {
  const out = [];
  let inFence = false;
  for (const raw of String(md ?? '').split('\n')) {
    const trimmed = raw.trim();
    if (/^(?:```|~~~)/.test(trimmed)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    if (trimmed.startsWith('>')) continue;
    if (trimmed.startsWith('|')) continue;
    out.push(raw);
  }
  return out.join('\n');
}

/** Every line that runs `gh workflow run <file>`, with its 1-based number. */
function dispatchLines(text, workflow) {
  return text
    .split('\n')
    .map((line, i) => ({ line, n: i + 1 }))
    .filter(({ line }) => line.includes(`gh workflow run ${workflow}`));
}

describe('the stripper itself (guard of the guard)', () => {
  it('drops fenced blocks, so a quoted wrong command cannot trip a prose check', () => {
    const md = ['real prose', '```bash', 'git revert HEAD && git push', '```', 'more prose'].join(
      '\n',
    );
    const voice = documentVoice(md);
    expect(voice).toContain('real prose');
    expect(voice).toContain('more prose');
    expect(voice).not.toContain('git revert');
  });

  it('drops blockquote lines, including indented ones', () => {
    const md = ['kept', '> quoted claim', '   > indented quoted claim', 'kept too'].join('\n');
    const voice = documentVoice(md);
    expect(voice).not.toContain('quoted claim');
    expect(voice).toContain('kept');
    expect(voice).toContain('kept too');
  });

  it('drops table rows — the "removed instruction | reality" ledger', () => {
    const md = ['intro', '| Removed | Reality |', '|---|---|', '| Singapore standby | none |'].join(
      '\n',
    );
    const voice = documentVoice(md);
    expect(voice).toContain('intro');
    expect(voice).not.toMatch(/singapore/i);
  });

  it('does not swallow the whole document — an assertion in a paragraph survives', () => {
    // Without this, a stripper that returned '' would make every ban below pass
    // vacuously. That is the shape of the bug these guards keep reintroducing.
    const md = ['| a | b |', '> quoted', 'Singapore standby is live.', '```', 'x', '```'].join('\n');
    expect(documentVoice(md)).toMatch(/singapore standby is live/i);
  });

  it('does not swallow ordinary prose that merely mentions a backtick', () => {
    expect(documentVoice('run `gh workflow run x.yml` by hand')).toContain('gh workflow run x.yml');
  });
});

describe('OPS-02 — db-restore.md must be followable by the owner, blind', () => {
  const text = read(DB_RESTORE);

  it('names all three required GitHub Actions secrets exactly', () => {
    // "check secrets.SUPABASE_* in GH Actions" is not an instruction anyone can
    // follow: it does not say which three, or where in Supabase each is found.
    for (const secret of ['SUPABASE_DB_URL', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']) {
      expect(text).toContain(secret);
    }
  });

  it('warns that the DIRECT connection (5432) is required, not the pooler (6543)', () => {
    // pg_dump fails against the transaction pooler. Getting this wrong is the
    // most likely way for the owner's first attempt to fail.
    expect(text).toMatch(/5432/);
    expect(text).toMatch(/6543/);
  });

  it('states how to confirm the first backup is non-empty, in the run and in the bucket', () => {
    const t = text.toLowerCase();
    expect(t).toContain('sizebytes');
    expect(t).toContain('tocentries');
  });

  it('warns that the three secrets alone make the run FAIL, and names the way out', () => {
    // The finding's own owner-steps contradicted themselves: "set exactly three
    // secrets", then "the run must be GREEN with offsite:true". It cannot be.
    // `planDestinations()` in scripts/backup/supabase-backup.mjs returns
    // `fatal: true` when the only destination is the same Supabase project as
    // SUPABASE_DB_URL — the OPS-03 guard — unless ALLOW_SAME_PROJECT_BACKUP is
    // the literal string 'true'. An owner following the old text would set three
    // secrets, get a red run and reasonably conclude they had done it wrong.
    expect(text).toContain('ALLOW_SAME_PROJECT_BACKUP');
    expect(text).toContain('BACKUP_S3_ENDPOINT');
  });

  it('dispatches the workflow copy that carries the verification guards', () => {
    // `main` still holds the 72-line pre-guard db-backup.yml: no skip guard, and
    // no `restore_drill` input at all. A bare `gh workflow run db-backup.yml`
    // therefore runs the version whose silent-zero-byte success is the finding,
    // and `-f restore_drill=true` is rejected outright.
    // WHEN THIS BRANCH MERGES, main's copy becomes the guarded one and the
    // `--ref` may be dropped here and in the docs, together.
    const hits = dispatchLines(text, 'db-backup.yml');
    expect(hits.length).toBeGreaterThan(0);
    for (const { line, n } of hits) {
      expect(line, `${DB_RESTORE}:${n} dispatches without --ref`).toContain('--ref');
    }
  });
});

describe('OPS-03 — a restore must be possible when the Supabase project is gone', () => {
  const text = read(DB_RESTORE);

  it('documents fetching the dump from the offsite S3/R2 mirror', () => {
    // Every download step in this runbook used the Supabase Storage REST API.
    // If the account that hosts the database is what was lost — the failure
    // mode the offsite copy exists for — those steps have no endpoint to call.
    expect(text).toContain('BACKUP_S3_BUCKET');
    expect(text).toMatch(/r2|s3/i);
  });

  it('the DR runbook dispatches the guarded workflow copy too', () => {
    const hits = dispatchLines(read(DR), 'db-backup.yml');
    expect(hits.length).toBeGreaterThan(0);
    for (const { line, n } of hits) {
      expect(line, `${DR}:${n} dispatches without --ref`).toContain('--ref');
    }
  });
});

describe('OPS-08 — free-tier-budgets.md on scheduled workflows', () => {
  const prose = documentVoice(read(BUDGETS));

  it('does not claim workflow_dispatch works from a non-default branch', () => {
    // GitHub registers a workflow_dispatch trigger only for a file present on
    // the DEFAULT branch; `--ref` selects which copy of an ALREADY REGISTERED
    // workflow to run. Verified: `git cat-file -e main:.github/workflows/
    // render-hours-guard.yml` fails, and the dispatch returns "Could not find
    // any workflows named render-hours-guard.yml". The workflow header was
    // corrected on 2026-08-21; this document was left saying the opposite.
    expect(prose).not.toMatch(/workflow_dispatch[^.\n]*\bdoes\b[^.\n]*work from a non-default/i);
    expect(prose).not.toMatch(/only way to run it is[^\n]*gh workflow run render-hours-guard/i);
  });

  it('states positively that dispatch is unavailable until the merge', () => {
    expect(prose).toMatch(/no way to run/i);
    expect(prose).toMatch(/workflow_dispatch[\s\S]{0,300}default branch/i);
  });

  it('still counts render-hours-guard.yml in the minutes table', () => {
    expect(read(BUDGETS)).toContain('render-hours-guard.yml');
  });
});

describe('OPS-06 — no page may present "revert and push" as a rollback', () => {
  // Both Render services are `autoDeploy: false` (render.yaml:28, :60) and no
  // workflow deploys on push, so a revert produces clean history and leaves the
  // same bytes serving traffic. `scripts/agents/deploy-rollback-lever.test.mjs`
  // already guards the workflow that DOES roll back; nothing guarded the prose,
  // which is what an operator actually reads at 3am.
  //
  // Verbatim shape of the two sections before 2026-08-28. Held here so the ban
  // below is demonstrably capable of failing — a regression lock that has never
  // been shown to catch anything is a comment.
  const PRE_FIX_DEPLOY_RUNBOOK = [
    '## Rollback procedures',
    '',
    '- **Anything else catastrophic**: revert the relevant commits and push.',
  ].join('\n');
  const PRE_FIX_SENTRY = [
    '## Reverting a bad release',
    '',
    'Revert the commit that broke things and let CI deploy the new HEAD.',
  ].join('\n');

  /** True when the page tells you, in its own voice, to roll back by pushing. */
  function assertsRevertAsRollback(md) {
    const voice = documentVoice(md);
    return (
      /revert the (relevant )?commits? .{0,40}and push/i.test(voice) ||
      /revert the commit .{0,60}let CI deploy/i.test(voice)
    );
  }

  it('the ban catches the exact prose both pages carried before the fix', () => {
    expect(assertsRevertAsRollback(PRE_FIX_DEPLOY_RUNBOOK)).toBe(true);
    expect(assertsRevertAsRollback(PRE_FIX_SENTRY)).toBe(true);
  });

  for (const path of ['docs/deploy-runbook-2026-04-28.md', 'docs/sentry-releases.md']) {
    it(`${path} no longer asserts it`, () => {
      expect(assertsRevertAsRollback(read(path))).toBe(false);
    });

    it(`${path} points at the authoritative rollback runbook`, () => {
      expect(read(path)).toContain('runbooks/prod-rollback.md');
    });

    it(`${path} names the dispatch that does deploy`, () => {
      expect(read(path)).toMatch(/gh workflow run render-diag\.yml[^\n]*mode=deploy/);
    });
  }

  it('render.yaml still has autoDeploy disabled — the whole correction assumes it', () => {
    // If this ever flips to true, pushing WOULD deploy and every page above has
    // to be rewritten again. Failing here is the reminder.
    //
    // PARSED, not text-matched. The first draft of this assertion counted
    // /autoDeploy:\s*false/ occurrences and expected 2; render.yaml has THREE,
    // because line 23 is a comment that says `autoDeploy:false mirrors the web
    // docker service below`. A guard that reads a comment as configuration is
    // the same defect this audit keeps finding in guards, so it does not get to
    // survive in a guard about honesty.
    const services = yaml.load(read('render.yaml'))?.services ?? [];
    expect(services.length).toBeGreaterThanOrEqual(2);
    for (const svc of services) {
      expect(svc.autoDeploy, `${svc.name} autoDeploy`).toBe(false);
    }
  });
});

describe('OPS-10 — documents describing infrastructure that does not exist', () => {
  for (const [label, path] of [
    ['DR runbook stub', DR_STUB],
    ['multi-region failover plan', MR_FAILOVER],
    ['multi-region deployment strategy', MR_STRATEGY],
  ]) {
    it(`${label} is marked superseded in its first heading`, () => {
      const first = read(path).split('\n').find((l) => l.startsWith('# ')) ?? '';
      expect(first, `${path} first heading: ${first}`).toMatch(/SUPERSEDED|DO NOT FOLLOW/i);
    });

    it(`${label} points at the authoritative runbook`, () => {
      expect(read(path)).toContain('docs/runbooks/disaster-recovery.md');
    });
  }

  it('the multi-region plans no longer present a failover procedure in their own voice', () => {
    // Both files told a responder to flip Cloudflare DNS to a Singapore standby
    // that has never existed. Correcting them means the instruction may still be
    // QUOTED (so a reader who half-remembers it is corrected) but must not be
    // asserted. Hence the stripper.
    for (const path of [MR_FAILOVER, MR_STRATEGY]) {
      const prose = documentVoice(read(path));
      expect(prose, `${path} still asserts a Singapore standby`).not.toMatch(
        /singapore (standby|secondary|read-replica|becomes primary)/i,
      );
      expect(prose, `${path} still asserts UptimeRobot`).not.toMatch(/uptimerobot/i);
    }
  });

  it('does not send a responder to a runbook path that does not exist', () => {
    // docs/ops/runbooks/regional-failover.md was cited as "the runbook"; there
    // is no docs/ops/ directory in this repository at all.
    for (const path of [MR_FAILOVER, MR_STRATEGY]) {
      expect(documentVoice(read(path))).not.toContain('docs/ops/runbooks/');
    }
  });
});
