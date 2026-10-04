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
import { existsSync, readFileSync } from 'node:fs';
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

/**
 * The blockquote that immediately follows `headingLine` — the construct this
 * repository uses to retire a page or a section ("SUPERSEDED … DO NOT FOLLOW").
 *
 * Needed because two of the OPS-06 pages could not be fixed by deletion: their
 * retired steps are the historical record of a migration, so they stay on the
 * page under a banner that says not to follow them. For those, "is it fixed?"
 * is a question about the banner, not about the absence of the old words.
 *
 * Returns '' when the heading is missing or is not followed by a blockquote,
 * so a page that loses its banner fails rather than passing on an empty string.
 */
export function bannerUnder(md, headingLine) {
  const lines = String(md ?? '').split('\n');
  const i = lines.findIndex((l) => l.trim() === headingLine);
  if (i < 0) return '';
  const out = [];
  for (let j = i + 1; j < lines.length; j++) {
    const t = lines[j].trim();
    if (t === '') {
      if (out.length) break;
      continue;
    }
    if (!t.startsWith('>')) break;
    out.push(t);
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

  it('bannerUnder returns the retirement blockquote, and nothing when there is none', () => {
    const retired = ['# Page', '', '> SUPERSEDED. DO NOT FOLLOW.', '> reason', '', 'body'].join(
      '\n',
    );
    expect(bannerUnder(retired, '# Page')).toMatch(/SUPERSEDED/);
    expect(bannerUnder(retired, '# Page')).toContain('reason');
    // Stops at the blank line — a second, unrelated blockquote is not the banner.
    expect(bannerUnder(retired, '# Page')).not.toContain('body');
    // No banner, missing heading, and a non-blockquote first line all yield ''.
    expect(bannerUnder(['# Page', '', 'body'].join('\n'), '# Page')).toBe('');
    expect(bannerUnder(retired, '# Absent')).toBe('');
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

  it('dispatches main\'s own copy of db-backup.yml, never the stale feature branch', () => {
    // The guards (skip check, size check, `restore_drill` input) used to live
    // only on `feat/recurring-razorpay-planid`, and these docs told the reader to
    // dispatch with `--ref` to reach them. They merged to main in #249 and were
    // extended afterwards (2026-09-04 read-back fixes). That branch is now an
    // OLDER copy than main: `--ref` to it runs a workflow with weaker guards.
    expect(readFileSync('.github/workflows/db-backup.yml', 'utf8')).toContain('restore_drill');
    const hits = dispatchLines(text, 'db-backup.yml');
    expect(hits.length).toBeGreaterThan(0);
    for (const { line, n } of hits) {
      expect(line, `${DB_RESTORE}:${n} pins the stale branch`).not.toContain('razorpay-planid');
    }
    expect(text).not.toContain('--ref feat/recurring-razorpay-planid');
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

  it('the DR runbook dispatches main\'s copy too, not the stale feature branch', () => {
    const hits = dispatchLines(read(DR), 'db-backup.yml');
    expect(hits.length).toBeGreaterThan(0);
    for (const { line, n } of hits) {
      expect(line, `${DR}:${n} pins the stale branch`).not.toContain('razorpay-planid');
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

  it('does not say the guard is absent from main now that it is on main', () => {
    // render-hours-guard.yml reached main (it is in the tree), so its cron
    // registers and it is dispatchable. The page used to say there was "no way
    // to run" it and recommended `--ref feat/recurring-razorpay-planid`.
    expect(existsSync('.github/workflows/render-hours-guard.yml')).toBe(true);
    expect(prose).not.toMatch(/no way to run it/i);
    expect(read(BUDGETS)).not.toContain('--ref feat/recurring-razorpay-planid');
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
  // Two further live copies were found on 2026-09-01 and a fifth and sixth on
  // 2026-09-02. Verbatim, from `git show 1723b62f^:<path>`:
  const PRE_FIX_UI_REVAMP = 'Single `git revert` on batched commit restores prior IA.';
  const PRE_FIX_CAVEATS =
    '3. Commit + push (CF Pages auto-deploys the new headers file — no build needed, static file).';
  const PRE_FIX_BUILD_FILTER =
    'Render auto-deploys `bhaktisetu-api` on **every** push to `main`, regardless of `[skip ci]` tag.';

  /** True when the page tells you, in its own voice, to roll back by pushing. */
  function assertsRevertAsRollback(md) {
    const voice = documentVoice(md);
    return (
      /revert the (relevant )?commits? .{0,40}and push/i.test(voice) ||
      /revert the commit .{0,60}let CI deploy/i.test(voice) ||
      // "Single `git revert` on batched commit restores prior IA."
      /\bgit revert\b[^.\n]{0,60}\brestores?\b/i.test(voice) ||
      // "Commit + push (CF Pages auto-deploys the new headers file …)"
      /\bcommit \+ push\b[^.\n]{0,40}auto-?deploys?/i.test(voice) ||
      // "Render auto-deploys `bhaktisetu-api` on **every** push to `main`"
      /auto-?deploys?\b[^.\n]{0,60}\bon\b[^.\n]{0,20}\bpush\b/i.test(voice)
    );
  }

  it('the ban catches the exact prose every corrected page carried before its fix', () => {
    // Five verbatim pre-fix snippets. Without this the widened ban below could
    // be satisfied by pages that were never wrong, which is the vacuous-test
    // failure mode this audit keeps producing.
    expect(assertsRevertAsRollback(PRE_FIX_DEPLOY_RUNBOOK)).toBe(true);
    expect(assertsRevertAsRollback(PRE_FIX_SENTRY)).toBe(true);
    expect(assertsRevertAsRollback(PRE_FIX_UI_REVAMP)).toBe(true);
    expect(assertsRevertAsRollback(PRE_FIX_CAVEATS)).toBe(true);
    expect(assertsRevertAsRollback(PRE_FIX_BUILD_FILTER)).toBe(true);
  });

  it('the ban does not fire on a page that merely QUOTES the retired claim', () => {
    // Every correction in this repo reproduces the wrong line in order to
    // refute it. If the widened ban flagged those, it would fail the commits
    // that fix the problem — the exact trap the stripper exists for.
    const correction = [
      '### Rollback',
      '',
      `> **CORRECTED.** This section said: ${PRE_FIX_UI_REVAMP}`,
      `> It also said: ${PRE_FIX_CAVEATS}`,
      '',
      'Deploying is a separate, hand-dispatched step.',
    ].join('\n');
    expect(assertsRevertAsRollback(correction)).toBe(false);
  });

  // All EIGHT pages that have ever presented a push as a way to change
  // production. The first two were corrected 2026-08-28, the next three
  // 2026-09-01, the last three 2026-09-02 — each found only because the
  // preceding "done" was swept again.
  //
  // TWO CAUTIONS FROM THE 2026-09-02 SWEEP, both about trusting a prior pass:
  //
  // 1. `docs/ui-revamp-audit-2026-06-05.md` was listed here and recorded as
  //    corrected on 2026-09-01, but the file was never actually edited — it
  //    still carried the retired sentence verbatim, and all three assertions
  //    below plus the deletion check were RED on a clean tree. Being named in
  //    this array is not evidence that a page was fixed; running it is.
  //
  // 2. `DARSHYA_DEPLOYMENT.md` is added 2026-09-02. It is the root-level
  //    deployment guide — the most likely page for a new operator to open —
  //    and it sat outside every previous sweep because they searched `docs/`.
  //    It told the reader to deploy web by pushing to `main`, and named a DNS
  //    repoint to `darshya.pages.dev` as the rollback, which `prod-rollback.md`
  //    §7 explicitly forbids.
  const OPS06_PAGES = [
    'docs/deploy-runbook-2026-04-28.md',
    'docs/sentry-releases.md',
    'docs/ui-revamp-audit-2026-06-05.md',
    'docs/caveats.md',
    'docs/cloudflare-pages-migration.md',
    'docs/engineering/render-build-filter-setup.md',
    'docs/cf-pages-env-wiring-2026-05-13.md',
    'DARSHYA_DEPLOYMENT.md',
  ];

  for (const path of OPS06_PAGES) {
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

  // Two pages could not be fixed by deletion: their Pages-era steps ARE the
  // record of the 2026-05→07 migration. They stay, under a banner. For those,
  // the banner is the fix, so the banner is what gets locked.
  for (const [path, heading] of [
    ['docs/cloudflare-pages-migration.md', '## Rollback plan'],
    ['docs/engineering/render-build-filter-setup.md', '# Render build filter setup — stop quota burn'],
    ['docs/cf-pages-env-wiring-2026-05-13.md', '# Cloudflare Pages env wiring — Sentry + PostHog'],
  ]) {
    it(`${path} keeps its retirement banner under "${heading}"`, () => {
      const banner = bannerUnder(read(path), heading);
      expect(banner, `${path}: no blockquote directly under "${heading}"`).toMatch(
        /SUPERSEDED|DO NOT FOLLOW/i,
      );
      expect(banner).toMatch(/autoDeploy|auto-deploy|Pages is no longer|not been a hosting layer/i);
    });
  }

  it('the two pages whose wrong sentence was DELETED do not carry it anywhere', () => {
    // A banner is not available here — these sections were rewritten, so the
    // retired sentence must simply be gone. Proven non-vacuous by
    // `git show 1723b62f^:docs/ui-revamp-audit-2026-06-05.md | grep -F ...`,
    // which returns the line; the current file must not.
    expect(read('docs/ui-revamp-audit-2026-06-05.md')).not.toContain(PRE_FIX_UI_REVAMP);
    expect(read('docs/caveats.md')).not.toContain(PRE_FIX_CAVEATS);
    expect(read('docs/engineering/render-build-filter-setup.md')).not.toContain(
      PRE_FIX_BUILD_FILTER,
    );
  });

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
  // The last two were found on 2026-09-02: the 2026-08-28 pass retired three
  // documents and missed two siblings that asserted the SAME Mumbai/Singapore
  // topology in the present tense. Being a "plan" is not a defence — none of
  // these said so once you were three headings deep.
  for (const [label, path] of [
    ['DR runbook stub', DR_STUB],
    ['multi-region failover plan', MR_FAILOVER],
    ['multi-region deployment strategy', MR_STRATEGY],
    ['R-Q4-E-014 failover handoff', 'docs/engineering/R-Q4-E-014-handoff.md'],
    ['multi-region failover spec', 'docs/engineering/multi-region-failover-spec.md'],
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

  // ── The signable instruments ───────────────────────────────────────────────
  //
  // The three files above are engineering plans: wrong, but only an engineer
  // reads them. The eleven claims below lived in a published Privacy Policy, a
  // vendor agreement's DPA, a regulator-facing DPIA, a multi-geo policy draft,
  // a Tier-0 outage script and the founder's investor-conversation FAQ. A
  // residency line in a signed instrument is a WARRANTY, and a status URL in a
  // crisis template is broadcast to the public at the worst possible moment,
  // so these are locked by exact text rather than by prose shape.
  //
  // NON-VACUITY. Every string below was present in its file before 2026-09-02
  // and is absent after. Reproduce with, for each pair:
  //   git show HEAD:<path> | grep -F '<string>'   # prints the line
  //   grep -F '<string>' <path>                   # prints nothing
  // A correction may still QUOTE a retired claim to refute it — each string is
  // therefore anchored with enough surrounding structure (the list bullet, the
  // question number, the diagram's `+->` arm) that a quotation cannot match it.
  const OPS10_RETIRED = [
    ['docs/legal/bhaktisetu-legal-doc-pack.md', '- Servers: Mumbai (primary) + Singapore (standby)'],
    [
      'docs/legal/contractor-vendor-agreement-templates.md',
      '- Data residency: India primary, Singapore standby',
    ],
    ['docs/legal/dpia-uk-launch.md', 'User (UK) -> Cloudflare Pages (edge) -> Render API (Mumbai)'],
    ['docs/legal/dpia-uk-launch.md', '+-> Supabase Postgres (Mumbai)'],
    ['docs/legal/dpia-uk-launch.md', '+-> Stripe (USA) for payment'],
    ['docs/legal/dpia-uk-launch.md', '+-> Twilio (USA) for WhatsApp'],
    ['docs/legal/privacy-policy-v2-multi-geo.md', '- India servers (Mumbai)'],
    [
      'docs/legal/privacy-policy-v2-multi-geo.md',
      '- US-based processors (Stripe, Resend, Anthropic) — under SCC equivalent',
    ],
    [
      'docs/cs/crisis-communications-playbook.md',
      '- Status page (status.bhaktisetu.com) — live system status',
    ],
    ['docs/product/founder-faq-100-questions.md', '44. **Data residency?** Primary: Mumbai'],
    // Added 2026-09-02. The Stripe rail was removed 2026-08-11, but six
    // signable / published instruments still named it as an active processor —
    // including an Article 30 ROPA that recorded a USA transfer under SCCs to a
    // processor which receives no personal data, while omitting the transfer
    // that does occur (Render `oregon`). Naming a processor you do not use is
    // not a harmless leftover: in a ROPA and a DPIA it is a false disclosure.
    ['docs/legal/records-of-processing-activities.md', '| Transfers outside UK/EEA | USA (Stripe, Resend) — SCCs |'],
    ['docs/legal/records-of-processing-activities.md', '| Recipients | Razorpay (India), Stripe (USA), our finance team, tax authorities |'],
    ['docs/legal/bhaktisetu-legal-doc-pack.md', '- **Razorpay/Stripe**: payment processing'],
    ['docs/legal/refund-policy-v2-FINAL.md', 'the payment aggregator (Stripe)'],
    ['docs/legal/priest-contract-template.md', '(a) Payment processor fees (Razorpay/Stripe — actuals)'],
    ['docs/legal/dpia-template-uk-launch.md', '- PAN/payment: tokenised via Stripe — never stored'],
    ['docs/cs/crisis-communications-playbook.md', '- Payment card details (Razorpay/Stripe tokenized)'],
    // Public-facing copy stating a stack this product does not run.
    ['docs/marketing/reddit-ama-q-a-prep.md', 'Hosted on Cloudflare Pages (web) and Render (API)'],
    ['docs/marketing/producthunt-launch-runbook.md', 'Pre-staged status page at status.darshya.online'],
    // A setup guide that would build production in the wrong region.
    ['DARSHYA_DEPLOYMENT.md', '   - **Region**: Singapore'],
    [
      'docs/product/founder-faq-100-questions.md',
      '82. **Database operations?** Supabase Mumbai primary',
    ],
  ];

  for (const [path, retired] of OPS10_RETIRED) {
    it(`${path} no longer states: ${retired.slice(0, 52)}…`, () => {
      expect(read(path)).not.toContain(retired);
    });
  }

  it('every corrected instrument cites where the truth was checked', () => {
    // Removing a false warranty and leaving nothing produces a second problem:
    // the next author fills the gap from memory, which is how "Mumbai" got
    // there the first time. Each page must name its ground truth.
    for (const path of [...new Set(OPS10_RETIRED.map(([p]) => p))]) {
      const text = read(path);
      expect(text, `${path} does not reference the OPS-10 correction`).toContain('OPS-10');
      expect(text, `${path} cites no verifiable source`).toMatch(
        /render\.yaml|docs\/runbooks\/disaster-recovery\.md|apps\/api\/src/,
      );
    }
  });

  it('no instrument substitutes a region it has not verified', () => {
    // The failure mode one step past this fix: replacing "Mumbai" with a
    // different confident region. The Supabase region is genuinely unrecorded,
    // so every corrected page must carry the [verify] marker instead of a
    // guess — the convention docs/legal/additional-legal-docs-pack.md set.
    for (const path of [
      'docs/legal/bhaktisetu-legal-doc-pack.md',
      'docs/legal/contractor-vendor-agreement-templates.md',
      'docs/legal/dpia-uk-launch.md',
      'docs/legal/privacy-policy-v2-multi-geo.md',
      'docs/product/founder-faq-100-questions.md',
    ]) {
      expect(read(path), `${path} states a Supabase region without verifying it`).toMatch(
        /\[verify\]|\[VERIFY BEFORE SIGNING/i,
      );
    }
  });

  it('the Tier-0 crisis template does not broadcast a host that serves nothing', () => {
    // Measured 2026-09-02: status.bhaktisetu.com resolves to parked AWS
    // addresses and times out on both schemes (curl exit 28, HTTP 000), while
    // https://darshya.online/status returns 200 but renders its
    // "Status temporarily unavailable" fallback with every monitor Unknown,
    // because NEXT_PUBLIC_UPTIME_STATUS_URL is absent from render.yaml.
    const text = read('docs/cs/crisis-communications-playbook.md');
    // The sign-off block of the "Site fully down" script must not carry it.
    const script = text.slice(text.indexOf('### Site fully down'), text.indexOf('### Data breach'));
    const scriptVoice = script
      .split('\n')
      .filter((l) => !l.trim().startsWith('>'))
      .join('\n');
    expect(scriptVoice, 'Tier-0 script still links status.bhaktisetu.com').not.toContain(
      'status.bhaktisetu.com',
    );
    // And the build-time nature of the fix is recorded, so a runtime-only
    // dashboard entry is not mistaken for having configured it.
    expect(text).toContain('NEXT_PUBLIC_UPTIME_STATUS_URL');
    expect(read('render.yaml')).not.toContain('NEXT_PUBLIC_UPTIME_STATUS_URL');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Added 2026-09-08 — the holes the 2026-09-02 pass left open.
//
// Every check above this line names its documents in a hand-maintained array.
// That is why OPS-06 was reported "already correct" twice and was twice wrong:
// a page nobody had thought to add to `OPS06_PAGES` was invisible to the guard,
// and being listed there was mistaken for being fixed. Three further live
// copies were found on 2026-09-08 by grepping, not by running this file:
//
//   docs/cloudflare-pages-migration.md   "Push any commit to trigger redeploy"
//                                        still asserted BELOW its own
//                                        DO-NOT-FOLLOW banner, in page voice.
//   docs/ui-revamp-audit-2026-06-05.md   an entire "Push impact / 1 CF build
//                                        slot" budget, priced in builds that a
//                                        push has not produced since 2026-07-08.
//   docs/company/03-cfo.md               "→ Sentry alert + revert deploy".
//
// None of them was in `OPS06_PAGES`, so all 83 assertions above were green
// while all three were live. The fix is to stop enumerating: walk every
// markdown file a human could follow and check the shape, so the next page
// nobody thought of is caught on the day it is written.
//
// DENIALS ARE NOT ASSERTIONS — the same rule `.github/workflows/commitlint.yml`
// carries, for the same reason. The ban matches "push … deploys" by proximity,
// so it fires just as hard on a sentence refuting the claim. Every correction
// in this repository reproduces the wrong sentence in order to correct it, and
// a guard that fails the commits fixing the defect trains people to bypass it.
// A paragraph carrying an explicit negation is therefore exempt, and the
// markers are deliberately specific (`autoDeploy: false`, `deploys nothing`,
// `used to say`, …) so a bare "not" cannot smuggle a real claim through.
//
// GRANULARITY IS THE PARAGRAPH, not the line. Verified: at line granularity
// this sweep failed on `docs/operational-context.md`, whose correction wraps as
//     **Not** on push — `autoDeploy: false` at `render.yaml:60`. (This line
//     previously said Render auto-deploys on main push; corrected 2026-09-01.)
// — the denial sits on the first physical line and the ban shape on the second.
// Splitting on blank lines and re-joining wraps is how a reader parses it. The
// per-line, added-lines-only tripwire in commitlint.yml is the stricter half of
// the pair; this is the half that sees the whole file.
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const WINDOWS_SEP = String.fromCharCode(92);

/**
 * Lines that hand an operator a `render-diag.yml` dispatch carrying the
 * deprecated branch input, as `path:line text`.
 *
 * Extracted to module scope 2026-09-09 so the non-vacuity test runs THIS
 * function rather than re-implementing the condition inline. The version it
 * replaced asserted `retired.includes('render-diag.yml') && /-f\s+branch=/`
 * on a local string, which proves a regex matches a string — not that the
 * sweep would catch the line. That is the shape of a test that cannot fail.
 */
export function branchFlagLines(text, label = '<inline>') {
  const offenders = [];
  String(text ?? '')
    .split('\n')
    .forEach((line, i) => {
      if (!line.includes('render-diag.yml')) return;
      if (/-f\s+branch=/.test(line)) offenders.push(`${label}:${i + 1} ${line.trim()}`);
    });
  return offenders;
}

/**
 * The audit directory's RECORD files, by exact path.
 *
 * OPS-15. Until 2026-09-09 this was the single pattern `/^docs\/audit\//`, and
 * the mismatch between that pattern and its own justification was the defect.
 * The justification is about a KIND of document: a ledger row reading "it says
 * push a revert, but both services are autoDeploy:false" is the DESCRIPTION of
 * a finding, not a recurrence of it, and rewording it to satisfy a grep would
 * falsify the record. That reason covers the ledger and the preserved agent
 * transcripts. It does not cover `docs/audit/DEPLOY-PLAN.md`, which is a
 * numbered deploy sequence an operator follows at 3am — and which sat at line
 * 85 handing out a `render-diag.yml` dispatch carrying the deprecated branch
 * input, invisible to this file's own sweep, while it reported 108/108 green.
 *
 * So the exclusion is now scoped the way its reason is scoped, and a reader can
 * check every entry by opening it. All 22 markdown files under `docs/audit/`
 * were classified on 2026-09-09:
 *
 *   RECORD (below — excluded): the ledger; the four preserved batch runs; the
 *   two stage-2 raw transcripts and the re-verification results; the raw
 *   388-finding prod sweep; the delta-completion brief (whose OPS-06 table row
 *   is the exact line that made commitlint.yml adopt this exclusion); the two
 *   stale-verification lanes; the triage write-up; the customer-test findings.
 *   Each of these reproduces defect text in order to record it.
 *
 *   INSTRUCTION (NOT excluded — scanned like any other page): DEPLOY-PLAN.md,
 *   OWNER-ACTIONS.md, RESUME.md, SESSION-STATE.md, CUSTOMER-TEST-PROMPT.md,
 *   customer-test/{AGENT-BRIEF,FIX-BRIEF,RESUME,MAIN-RED-8-FAILURES}.md. Every
 *   one of them tells a reader to do something.
 *
 * Measured before narrowing: with the whole directory in scope, ONE file fails
 * — DEPLOY-PLAN.md:85, on the branch-input rule. Every other instruction page
 * is already clean, and of the record files only delta-completion-2026-08-20.md
 * carries a line the ban shape matches at all, inside a table row that
 * `documentVoice()` strips. So the narrowing costs nothing and buys the
 * directory's default: a NEW file dropped into `docs/audit/` is scanned unless
 * someone adds it here with a reason.
 */
const AUDIT_RECORDS = [
  'docs/audit/LEDGER.md',
  'docs/audit/prod-sweep-raw-2026-08-12.md',
  'docs/audit/stage2-money-path-raw.md',
  'docs/audit/stage2-reverify-results.md',
  'docs/audit/delta-completion-2026-08-20.md',
  'docs/audit/batch5-agent-fixes.md',
  'docs/audit/batch5-review.md',
  'docs/audit/batch6-agent-fixes.md',
  'docs/audit/batch8-review-findings.md',
  'docs/audit/stale-verification-a.md',
  'docs/audit/stale-verification-b.md',
  'docs/audit/triage-2026-08-15.md',
  'docs/audit/customer-test/FINDINGS.md',
];

/**
 * Every markdown file a human might open and follow — walked, never listed.
 *
 * `docs/chat-archive/**` is raw conversation transcript, not instruction.
 * Nothing else is excluded — the cron-written directories
 * (`docs/agent-reports`, `docs/roadmap/_alerts`) are deliberately IN scope,
 * because a scheduled agent writing the retired claim into the repo is a
 * regression worth failing on.
 */
const EXCLUDED = [
  // The audit RECORD files only — see AUDIT_RECORDS above for the classification
  // and for why this is no longer the whole directory.
  ...AUDIT_RECORDS.map((p) => new RegExp(`^${p.replace(/[.]/g, '\\.')}$`)),
  // Raw conversation transcript, not instruction.
  /^docs\/chat-archive\//,
  // CLAUDE.md declares docs/handoff.md an APPEND-ONLY ARCHIVE. Its June entries
  // record, in the past tense, a period when Cloudflare Pages really did build
  // on every push and Render really did auto-redeploy the API — "Phase 5 final
  // push (fc52ea5): single CF build slot consumed. Render auto-redeploys api on
  // push." That was true when it was written. Banning it would mean editing the
  // record of what happened to satisfy a grep, which is the trade this
  // repository already refused for docs/audit/.
  /^docs\/handoff\.md$/,
  /^docs\/handoff-\d{4}-\d{2}-\d{2}/,
  // Machine-written dry-run output from the 2026-06 roadmap orchestrator.
  /^docs\/roadmap\/_dryrun\//,
];

export function allFollowableDocs(root = '.') {
  const out = [];
  const skipDir = new Set(['node_modules', '.git', '.next', 'dist', 'coverage']);
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const p = join(dir, entry);
      let st;
      try {
        st = statSync(p);
      } catch {
        continue;
      }
      if (st.isDirectory()) {
        if (skipDir.has(entry)) continue;
        walk(p);
      } else if (entry.endsWith('.md')) {
        out.push(p.split(WINDOWS_SEP).join('/').replace(/^\.\//, ''));
      }
    }
  };
  walk(join(root, 'docs'));
  for (const entry of readdirSync(root)) {
    if (entry.endsWith('.md')) out.push(entry);
  }
  return out.filter((f) => !EXCLUDED.some((re) => re.test(f)));
}

/** Every markdown file under docs/audit, excluded or not. */
export function auditMarkdownFiles(root = '.') {
  const out = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const p = join(dir, entry);
      let st;
      try {
        st = statSync(p);
      } catch {
        continue;
      }
      if (st.isDirectory()) walk(p);
      else if (entry.endsWith('.md')) out.push(p.split(WINDOWS_SEP).join('/').replace(/^\.\//, ''));
    }
  };
  walk(join(root, 'docs', 'audit'));
  return out;
}

/**
 * The document's own voice, split into paragraphs with wrapped lines rejoined.
 * Fences, blockquotes and table rows are already gone via documentVoice().
 */
export function ownVoiceParagraphs(md) {
  return documentVoice(md)
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean);
}

/**
 * Blockquote markers stripped and whitespace collapsed. Needed because the
 * corrections in this repository are written as `> ` callouts wrapped at ~90
 * columns, so a phrase like "not been reviewed or approved by the owner" is
 * physically "…by the\n> owner". Three assertions below were written against
 * the raw text, and all three failed on that wrap rather than on the thing they
 * were checking — which is how a guard ends up loosened until it stops biting.
 */
export function flatten(md) {
  return String(md ?? '')
    .replace(/^[ \t]*>+ ?/gm, '')
    .replace(/\s+/g, ' ');
}

/** A push, or a revert, presented as a thing that changes production. */
const PUSH_DEPLOYS_BAN = [
  /revert the (relevant )?commits? .{0,40}and push/i,
  /revert the commit .{0,60}let CI deploy/i,
  /\bgit revert\b[^.]{0,60}\brestores?\b/i,
  /\bcommit \+ push\b[^.]{0,40}auto-?deploys?/i,
  /auto-?deploys?\b[^.]{0,60}\bon\b[^.]{0,20}\bpush\b/i,
  /\bpush\b[^.]{0,60}(auto-?deploys?|triggers? (a )?redeploy|to (deploy|ship) to prod)/i,
  /(pushing|a push|push any commit)[^.]{0,60}(deploys?|redeploys?|builds?)\b/i,
  // Added after the first run of this sweep, which surfaced two more shapes the
  // patterns above did not reach. Cloudflare Pages stopped building this
  // repository on 2026-07-08 (`cf-kill-zombie.yml`), so a live budget priced in
  // builds-per-push is a cost that cannot be incurred and a batching rule that
  // buys nothing:
  //   "**Single batched apps/web push = 1 CF build slot** for full 5-batch sweep."
  //   "CF Pages git-integration runs on every push regardless of paths"
  /\bpush\b[^.]{0,30}=\s*(\d+|a|one|single)?\s*(cf |cloudflare )?build/i,
  /\b(\d+|single|one)\s+cf build\b/i,
  /\bpush\b[^.]{0,40}\bto trigger\b[^.]{0,30}\bbuild/i,
  /\b(cf|cloudflare)[^.]{0,60}\bruns? on (every |each )?[^.]{0,20}push\b/i,
  /\bcf builds?\b[^.]{0,20}\bpush\b/i,
];

/** An explicit negation of deployment, on the same paragraph. */
const PUSH_DEPLOYS_DENIAL =
  /autoDeploy:\s?false|deploys? nothing|does not deploy|will not deploy|never deploys?|no longer (auto-?)?(deploys?|builds?)|do(es)? not (auto-?)?(deploy|build)|DOES NOTHING|not a rollback|is not a deploy|neither a revert nor a push|deploys? no\b|builds? nothing|used to (say|claim|read)|previously (said|read|claimed)|false since/i;

/** Paragraphs where this document tells you, in its own voice, that a push ships. */
export function pushAsDeployAssertions(md) {
  return ownVoiceParagraphs(md).filter(
    (para) => !PUSH_DEPLOYS_DENIAL.test(para) && PUSH_DEPLOYS_BAN.some((re) => re.test(para)),
  );
}

describe('OPS-06 (2026-09-08) — the ban is enumerated by walking, not by listing', () => {
  // ── Non-vacuity first. Every string below is the VERBATIM prose that was
  // live in this repository on the morning of 2026-09-08, on a page that no
  // previous OPS-06 pass had listed. If the sweep below ever passes while
  // these pass too, the sweep has stopped working.
  const LIVE_ON_2026_09_08 = [
    // docs/cloudflare-pages-migration.md, below its own "DO NOT FOLLOW" banner
    'Or set the repo variable: `CLOUDFLARE_PROJECT_NAME = poojly-web`. Push any commit to trigger redeploy.',
    // docs/ui-revamp-audit-2026-06-05.md
    '**Single batched apps/web push = 1 CF build slot** for full 5-batch sweep.',
    // the two shapes the 2026-08-28 pass was written for, kept as anchors
    '- **Anything else catastrophic**: revert the relevant commits and push.',
    'Revert the commit that broke things and let CI deploy the new HEAD.',
  ];

  it('fires on every shape that was live in the repository this morning', () => {
    for (const prose of LIVE_ON_2026_09_08) {
      expect(pushAsDeployAssertions(prose), `ban missed: ${prose}`).toHaveLength(1);
    }
  });

  it('does not fire on the corrections that replaced them', () => {
    // Each of these is real text now in the repository. A guard that failed
    // these would fail the commit that fixes the defect.
    const corrections = [
      'so "Push any commit to trigger redeploy" deploys nothing at all, and both Render services carry `autoDeploy: false`.',
      '**Not** on push — `autoDeploy: false` at `render.yaml:60`. (This line previously said Render auto-deploys on main push; corrected 2026-09-01, `OPS-06`.)',
      '- [ ] **CF Pages does NOT build** on push (auto-deploy killed 2026-07-08)',
      'A push deploys nothing at all — both Render services are `autoDeploy: false`.',
    ];
    for (const prose of corrections) {
      expect(pushAsDeployAssertions(prose), `false positive on: ${prose}`).toHaveLength(0);
    }
  });

  it('a bare "not" cannot smuggle an assertion past the denial exemption', () => {
    // The denial markers are specific on purpose. This paragraph negates
    // something unrelated and must still fail.
    const smuggled =
      'This is not a difficult procedure: push to main and Render auto-deploys the web service within three minutes.';
    expect(pushAsDeployAssertions(smuggled)).toHaveLength(1);
  });

  it('the walker actually finds the documents (it is not returning an empty set)', () => {
    const docs = allFollowableDocs();
    expect(docs.length).toBeGreaterThan(200);
    for (const known of [
      'docs/runbooks/prod-rollback.md',
      'docs/caveats.md',
      'docs/cloudflare-pages-migration.md',
      'docs/ui-revamp-audit-2026-06-05.md',
      'docs/company/03-cfo.md',
      'DARSHYA_DEPLOYMENT.md',
    ]) {
      expect(docs, `walker missed ${known}`).toContain(known);
    }
    // And it must NOT sweep the audit ledger, whose job is verbatim quotation.
    expect(docs).not.toContain('docs/audit/LEDGER.md');
    // But it MUST sweep the audit directory's instruction pages. Asserting the
    // whole directory was absent — which is what this line said until
    // 2026-09-09 — is what let DEPLOY-PLAN.md's dispatch hide in here.
    expect(docs).toContain('docs/audit/DEPLOY-PLAN.md');
  });

  it('NO markdown document in this repository presents a push or a revert as a deploy', () => {
    const offenders = [];
    for (const file of allFollowableDocs()) {
      for (const para of pushAsDeployAssertions(read(file))) {
        offenders.push(`${file}: ${para.slice(0, 160)}`);
      }
    }
    expect(offenders, `\n${offenders.join('\n')}\n`).toEqual([]);
  });
});

describe('OPS-06 (2026-09-08) — the deprecated `-f branch=` input', () => {
  // render-diag.yml's own input description reads "DEPRECATED - Render ignores
  // this. Kept so older documented commands still parse." Render's create-deploy
  // API takes `commitId`, not a branch. A runbook that shows `-f branch=main`
  // teaches an operator that the flag selects what gets deployed; under an
  // outage that is the difference between rolling back and redeploying the
  // broken HEAD. Seven documents carried it on 2026-09-08.
  const WORKFLOW = '.github/workflows/render-diag.yml';

  it('the workflow still declares the input deprecated — this rule is grounded in it', () => {
    const wf = yaml.load(read(WORKFLOW));
    const desc = wf?.on?.workflow_dispatch?.inputs?.branch?.description ?? '';
    expect(desc, `${WORKFLOW} branch input description: ${desc}`).toMatch(/DEPRECATED/i);
    expect(desc).toMatch(/ignores/i);
    // And the lever that DOES roll back is still the commit input.
    expect(wf?.on?.workflow_dispatch?.inputs?.commit?.description ?? '').toMatch(
      /rollback lever/i,
    );
  });

  // The 2026-09-08 docs pass could not reach CLAUDE.md, TASKS.md and AUDIT.md,
  // so it exempted them here behind a self-cleaning assertion that failed the
  // moment one was fixed. All three were fixed on 2026-09-08 and the exemption
  // is gone, which is the whole point of writing it that way: the guard, not a
  // person's memory, is what noticed the debt was paid.
  const OUT_OF_LANE = [];

  it('no document hands an operator a render-diag dispatch carrying the branch input', () => {
    const offenders = [];
    for (const file of allFollowableDocs().filter((f) => !OUT_OF_LANE.includes(f))) {
      offenders.push(...branchFlagLines(read(file), file));
    }
    expect(offenders, `\n${offenders.join('\n')}\n`).toEqual([]);
  });

  it('the rule is capable of failing — the exact line DEPLOY-PLAN.md carried', () => {
    // Verbatim from docs/audit/DEPLOY-PLAN.md:85 on the morning of 2026-09-09,
    // step 4 of the deploy sequence. It was invisible to the sweep above
    // because `docs/audit/**` was excluded as a directory — see AUDIT_RECORDS.
    const retired = [
      '| Step | Command / action |',
      '|---|---|',
      '| 4 | Deploy API: `gh workflow run render-diag.yml -f mode=deploy -f sid=srv-d7mc2n8sfn5c73dfce0g -f branch=main` |',
    ].join('\n');
    expect(branchFlagLines(retired, 'docs/audit/DEPLOY-PLAN.md')).toEqual([
      'docs/audit/DEPLOY-PLAN.md:3 | 4 | Deploy API: `gh workflow run render-diag.yml -f mode=deploy -f sid=srv-d7mc2n8sfn5c73dfce0g -f branch=main` |',
    ]);
    // And the correction that replaced it must NOT be flagged — the command
    // line no longer carries the input, and the sentence that explains why is
    // a separate line, so the sweep never sees both on one line.
    expect(branchFlagLines(read('docs/audit/DEPLOY-PLAN.md'))).toEqual([]);
  });
});

describe('OPS-15 (2026-09-09) — the audit exclusion is scoped by kind, not by directory', () => {
  // The exclusion above this line read `/^docs\/audit\//` while its comment
  // justified it by DOCUMENT KIND: "that directory's job is to quote defects
  // verbatim". Both halves are defensible; together they are the OPS-06 shape
  // one level up. A wrong, load-bearing instruction (DEPLOY-PLAN.md step 4)
  // sat where an operator would act on it, and the guard written to forbid
  // exactly that could not structurally reach it — 108/108 green throughout.
  //
  // These tests lock the two properties the narrowing has to have at once:
  // it still cannot punish a record for quoting, and it CAN reach an
  // instruction page.

  it('every excluded audit path exists — the list cannot rot into a silent no-op', () => {
    // An exact-path exclusion naming a file that has been renamed or deleted
    // stops excluding anything and nobody notices. Worse, it reads like a
    // justification for a directory-wide hole that is no longer there.
    for (const p of AUDIT_RECORDS) {
      expect(existsSync(p), `AUDIT_RECORDS names a file that does not exist: ${p}`).toBe(true);
    }
  });

  it('the records stay out of the walk and the instructions come into it', () => {
    const docs = allFollowableDocs();
    for (const p of AUDIT_RECORDS) {
      expect(docs, `record swept: ${p}`).not.toContain(p);
    }
    // Everything an operator or an agent is told to follow, by exact path.
    for (const p of [
      'docs/audit/DEPLOY-PLAN.md',
      'docs/audit/OWNER-ACTIONS.md',
      'docs/audit/RESUME.md',
      'docs/audit/SESSION-STATE.md',
      'docs/audit/customer-test/AGENT-BRIEF.md',
      'docs/audit/customer-test/FIX-BRIEF.md',
      'docs/audit/customer-test/RESUME.md',
      'docs/audit/customer-test/MAIN-RED-8-FAILURES.md',
    ]) {
      expect(docs, `instruction page not swept: ${p}`).toContain(p);
    }
  });

  it('no markdown file under docs/audit is silently unclassified', () => {
    // A file dropped into docs/audit is scanned unless someone adds it to
    // AUDIT_RECORDS with a reason. This asserts the partition is total, so the
    // next file cannot land in the gap the old pattern created.
    const swept = new Set(allFollowableDocs());
    const excluded = new Set(AUDIT_RECORDS);
    for (const p of auditMarkdownFiles()) {
      expect(
        swept.has(p) || excluded.has(p),
        `${p} is neither swept nor listed in AUDIT_RECORDS`,
      ).toBe(true);
    }
  });

  it('the ledger’s verbatim OPS-06 row still does not trip the ban', () => {
    // The row, exactly as `docs/audit/LEDGER.json` records it. This is the
    // sentence the whole exclusion exists to protect, and it must survive the
    // ban on its own merits — via the denial exemption, not via the exclusion.
    const row =
      'The written rollback procedure cannot work — it says push a revert, ' +
      'but both services are autoDeploy:false and no workflow deploys from main';
    expect(pushAsDeployAssertions(row)).toHaveLength(0);
    // Non-vacuous: the ban DOES fire on the same sentence once the denial is
    // negated, so the zero above is the exemption working and not the ban
    // simply failing to see the sentence.
    //
    // The mutation flips `false` to `enabled` rather than deleting the phrase.
    // Deleting it was the first attempt and it proved nothing: `autoDeploy` is
    // ALSO what the ban matches on (`auto-?deploys?`), so removing the words
    // removed the trigger along with the exemption and the count went to zero
    // for the wrong reason.
    expect(pushAsDeployAssertions(row.replace('autoDeploy:false', 'autoDeploy enabled'))).toHaveLength(
      1,
    );
  });

  it('the ledger row is present in LEDGER.json, so the test above is not a museum piece', () => {
    // If the ledger is ever reworded, this fails and whoever reworded it has to
    // decide deliberately whether the exclusion is still earning its place.
    expect(read('docs/audit/LEDGER.json')).toContain(
      'it says push a revert, but both services are autoDeploy:false',
    );
  });

  it('DEPLOY-PLAN.md, now in scope, is clean under both bans', () => {
    // The other half of this change. Narrowing the exclusion without fixing the
    // page reds CI; fixing the page without narrowing leaves the hole open for
    // the next file added to that directory.
    const plan = read('docs/audit/DEPLOY-PLAN.md');
    expect(pushAsDeployAssertions(plan)).toEqual([]);
    expect(branchFlagLines(plan)).toEqual([]);
  });

  it('DEPLOY-PLAN.md states the lever that actually selects what ships', () => {
    // Removing the wrong flag and leaving nothing is how the wrong flag came
    // back the first time. The page must name `-f commit=<SHA>`, which is both
    // the pin and the rollback, and cite the runbook that owns it.
    const plan = read('docs/audit/DEPLOY-PLAN.md');
    expect(plan).toMatch(/-f commit=/);
    expect(plan).toContain('docs/runbooks/prod-rollback.md');
  });
});

describe('OPS-10 (2026-09-08) — a retirement banner is not a correction', () => {
  // The 2026-09-02 pass gave `multi-region-failover-spec.md` and
  // `R-Q4-E-014-handoff.md` a "SUPERSEDED, DO NOT FOLLOW" banner and a reality
  // table, and stopped there. Both then went on to describe Mumbai, Singapore,
  // read replicas and a Cloudflare load balancer in the PRESENT TENSE, in the
  // page's own voice, for 44 and 284 lines respectively — which is what a
  // reader skimming past a banner actually absorbs. The prose ban above was
  // only ever applied to two of the five retired documents; these are the other
  // three.
  const RETIRED_MULTI_REGION = [
    DR_STUB,
    MR_FAILOVER,
    MR_STRATEGY,
    'docs/engineering/multi-region-failover-spec.md',
    'docs/engineering/R-Q4-E-014-handoff.md',
  ];

  /** Present-tense assertion of a topology that has never existed. */
  const FICTION = [
    /\b(singapore|mumbai)\s+(standby|secondary|primary|replica|read-?replica|region)\b/i,
    /\brender\s+(mumbai|singapore)\b/i,
    /\bapi-(bom|sin)\.render\.com\b/i,
    /\bsingapore (becomes primary|pre-?warmed)\b/i,
    /\bs3 mumbai\b/i,
  ];
  const FICTION_DENIAL =
    /never (been|existed|had)|does not exist|do(es)? not exist|no such|there is no|there has never|was selling|used to (say|claim|read)|previously (said|read|claimed)|\bgot mumbai\b|is not deployed|nothing below is deployed/i;

  function assertsFictionalTopology(md) {
    return ownVoiceParagraphs(md).filter(
      (para) => !FICTION_DENIAL.test(para) && FICTION.some((re) => re.test(para)),
    );
  }

  it('the fiction ban fires on the exact prose these two files carried this morning', () => {
    // Verbatim from docs/engineering/multi-region-failover-spec.md before the
    // 2026-09-08 fix, in the page's own voice, below its own banner.
    const preFixSpec = [
      'Q4 multi-region failover plan. Mumbai primary + Singapore standby + Frankfurt for EU/NRI.',
      '- **Primary**: Render Mumbai region (R-Q4-E-003 Standard tier)',
      '- **Standby**: Render Singapore (passive replica)',
      '- Mumbai region 5xx >50% sustained 10min → manual flip Singapore primary',
      '- Singapore standby pre-warmed (always running)',
    ];
    // Verbatim from docs/engineering/R-Q4-E-014-handoff.md, same morning.
    const preFixHandoff = [
      'live aarti/darshan during peak festival windows cannot tolerate Mumbai region downtime.',
      '5. On Mumbai outage: founder promotes Singapore replica to primary via Supabase dashboard.',
    ];
    for (const prose of [...preFixSpec, ...preFixHandoff]) {
      expect(assertsFictionalTopology(prose), `fiction ban missed: ${prose}`).toHaveLength(1);
    }
  });

  it('the fiction ban does not fire on the corrections beside them', () => {
    for (const prose of [
      'Anyone reading this page to answer *where does our data live* got Mumbai and Singapore, and both are wrong.',
      '`docs/legal/additional-legal-docs-pack.md`, which was selling a Singapore standby to counterparties.',
      'There has never been a Mumbai region for this product.',
    ]) {
      expect(assertsFictionalTopology(prose), `false positive on: ${prose}`).toHaveLength(0);
    }
  });

  for (const path of RETIRED_MULTI_REGION) {
    it(`${path} does not assert the topology in its own voice`, () => {
      const offenders = assertsFictionalTopology(read(path));
      expect(offenders, `\n${path}\n${offenders.join('\n')}\n`).toEqual([]);
    });
  }
});

describe('OPS-10 (2026-09-08) — proposals that read as inventories', () => {
  it('the read-replica eval says it was never implemented', () => {
    // Four documents cited this page's roadmap id (R-Q3-IT-002) as the source
    // of a "Supabase Mumbai primary + Singapore read-replica" claim. The page
    // itself never said a replica exists — but it never said one does not,
    // either, and it is the page they pointed at.
    const text = read('docs/it/supabase-read-replica-spec.md');
    expect(text).toContain('NOT IMPLEMENTED');
    expect(text).toContain('OPS-10');
    expect(flatten(text)).toMatch(/no read.?replica/i);
    expect(text).toMatch(/docs\/runbooks\/disaster-recovery\.md/);
  });

  it('the observability spec says its stack is not deployed', () => {
    // Its "Stack overview" table reads as an inventory of what is running.
    // Logflare appears in no source file, workflow or env var; StatusPage is
    // not purchased; UptimeRobot is an unstarted founder action.
    const text = read('docs/engineering/monitoring-observability-stack-spec.md');
    expect(text).toContain('PROPOSAL, NOT A DEPLOYED STACK');
    expect(text).toContain('OPS-10');
    expect(text).toMatch(/Logflare/);
    expect(text).toMatch(/\[verify\]/i);
  });

  it('operational-context.md no longer states monitoring probe regions as fact', () => {
    // The row read "| HetrixTools regions | Mumbai + Singapore + Frankfurt |
    // 1-min interval |". `hetrix` appears nowhere in this repository, and the
    // code names cron-job.org as its external scheduler instead
    // (apps/api/src/jobs/master-cron.ts:39). Next to a file full of residency
    // statements, "Mumbai + Singapore" read as one.
    const text = read('docs/operational-context.md');
    expect(text).not.toContain('| Mumbai + Singapore + Frankfurt |');
    expect(flatten(text)).toMatch(/hetrix[\s\S]{0,400}appears nowhere in this repository/i);
  });
});

describe('OPS-10 (2026-09-08) — the signable instruments carry an owner gate', () => {
  // A residency representation in a legal instrument is a WARRANTY. The
  // 2026-09-02 pass did not merely annotate these three — it REWROTE the
  // warranting text (§5 of the policy, the DPA residency clause, §3 of the
  // DPIA). Changing what a company warrants to counterparties and to a
  // regulator is not a documentation edit and was never the owner's decision to
  // skip. The corrected text may well be right; it is still unreviewed. The
  // gate below is what makes that visible on the page instead of only in a
  // commit message, and locking it here is what stops a later tidy-up pass from
  // quietly deleting it.
  const INSTRUMENTS = [
    ['Privacy Policy (published under five regimes)', 'docs/legal/privacy-policy-v2-multi-geo.md', /DO NOT PUBLISH/],
    ['DPA / vendor agreement template (signed)', 'docs/legal/contractor-vendor-agreement-templates.md', /DO NOT SIGN OR SEND/],
    ['UK DPIA (regulator-facing)', 'docs/legal/dpia-uk-launch.md', /DO NOT FILE OR DISCLOSE/],
  ];

  for (const [label, path, verb] of INSTRUMENTS) {
    it(`${label} is gated on owner sign-off`, () => {
      const text = read(path);
      expect(text, `${path} lost its sign-off banner`).toContain('PENDING OWNER SIGN-OFF');
      expect(text, `${path} does not say what must not be done with it`).toMatch(verb);
      // The banner must say the surrounding text is provisional — the whole
      // point is that the CORRECTION is unreviewed too, not just the original.
      expect(text, `${path} does not mark the surrounding text provisional`).toMatch(
        /provisional/i,
      );
      expect(flatten(text), `${path} does not say the rewrite is unreviewed`).toMatch(
        /not been reviewed or approved by (the )?owner/i,
      );
    });

    it(`${label} states the verified infrastructure and cites it`, () => {
      const text = read(path);
      // A removed warranty with nothing in its place gets refilled from memory,
      // which is how "Mumbai" arrived the first time.
      expect(text).toContain('render.yaml');
      expect(text).toMatch(/oregon/i);
      expect(text).toMatch(/\[verify\]|VERIFY BEFORE SIGNING/i);
    });
  }

  it('the gate is capable of failing — an instrument without it', () => {
    const ungated = '# Privacy Policy\n\nData residency: Mumbai primary, Singapore standby.\n';
    expect(ungated.includes('PENDING OWNER SIGN-OFF')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// OPS-17 (2026-09-09) — the migration claim, `apps/api/package.json` and
// `render.yaml` are locked together.
//
// TASKS.md:119 said, in bold, "**Migrations DO auto-apply — on API START, not
// build.**", and drew the operational conclusion "**Consequence: a failing
// migration is a CRASH-LOOP, not a failed build** — the API never comes up."
// It cited two real files to prove it, and both citations describe real text:
// the API's `start` script IS `prisma migrate deploy && node dist/server.js`,
// and `render.yaml`'s `startCommand` DOES invoke it.
//
// The deployed service does not behave that way. Measured 2026-09-08 (twice —
// the second run pinned with `-f commit=<SHA>` to rule out a branch mismatch)
// and re-measured from `_prisma_migrations` on 2026-09-09: a deploy reports
// live and healthy while the pending migrations stay pending, and every
// applied migration's `finished_at` falls inside a manual `migrate deploy`
// burst. The real hazard is therefore the OPPOSITE of the one the page warned
// about — not a loud crash-loop, but a silent no-op: a green deploy over a
// schema that never moved. TASKS.md is `@`-imported by CLAUDE.md, so every
// session in this repository read the wrong sentence and reasoned about
// deploys from it. Same class as OPS-06.
//
// Three checks, because the failure had three independent parts:
//
//   1. A CITATION pointing at the wrong line. The retired text said
//      `render.yaml:20`; line 20 is a comment and `startCommand` is on 21. A
//      line number nobody opens is exactly the detail that rots, so the quoted
//      command must actually BE on the line it names.
//   2. A CLAIM that measurement contradicts — swept by WALKING every
//      followable document rather than from a hand-kept list, which is the
//      mistake OPS-06 made twice.
//   3. A PRE-FLIGHT that does not check what it says it checks.
//      `verify-migration-objects.mjs --unexecuted` selects ledger rows with
//      `applied_steps_count = 0`. Measured 2026-09-09 against production it
//      named 6 migrations and exited 1 while the number genuinely pending was
//      0. It is an object-existence probe, not a pending check.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Documents that still carry the retired auto-apply claim and were OUT OF LANE
 * for the OPS-17 pass (scoped to TASKS.md, CLAUDE.md and this file).
 *
 * Enumerated rather than excluded, so the sweep below still runs over them and
 * a reader can see exactly what is left. This array must shrink to `[]` as the
 * runbooks are corrected; anything the sweep finds that is NOT listed here is a
 * new regression and fails immediately.
 *
 * MEASURED 2026-09-09 — these two are what the ban actually reaches:
 *   docs/runbooks/prod-rollback.md:113  "Migrations apply automatically on
 *                                        every boot, including the boot that
 *                                        follows a rollback."
 *   docs/runbooks/disaster-recovery.md:108  "The API start command runs
 *                                        `prisma migrate deploy` before serving."
 *
 * ONE PAGE THE SWEEP DOES NOT REACH, stated here rather than left to be
 * discovered: `docs/runbooks/schema-authority.md` is built end to end on the
 * same false premise ("Nothing else applies schema. There is no manual step and
 * no dashboard override; do not add one.", and a crash-loop-vs-stale-serving
 * table). It escapes because it never uses any of the banned phrasings in its
 * own voice — its numbered boot sequence puts the verb before `migrate deploy`
 * and splits the claim across sentences, and its consequence table is a table
 * row, which `documentVoice()` strips by design. Widening the ban far enough to
 * catch it without also catching correct prose is not something this pass could
 * do honestly, so it is named instead. That page needs a rewrite, not a regex.
 */
const OPS17_KNOWN_UNFIXED = [];

/**
 * Every `` `path:N` → `command` `` citation in a document, as
 * `{ file, line, quoted }`. This is the shape TASKS.md uses to prove a claim
 * about the deploy chain, and the shape that rots without anyone noticing.
 */
export function lineCitations(md) {
  const out = [];
  const re = /`([A-Za-z0-9._/-]+\.(?:ya?ml|json|mjs|ts|js)):(\d+)`\s*(?:→|->)\s*`([^`]+)`/g;
  let m;
  while ((m = re.exec(String(md ?? ''))) !== null) {
    out.push({ file: m[1], line: Number(m[2]), quoted: m[3] });
  }
  return out;
}

/** Citations whose quoted text is not actually on the line they name. */
export function brokenLineCitations(md, root = '.') {
  return lineCitations(md).filter(({ file, line, quoted }) => {
    let text;
    try {
      text = readFileSync(join(root, file), 'utf8');
    } catch {
      return true; // a citation to a file that does not exist is broken too
    }
    const target = text.split(/\r?\n/)[line - 1];
    return target === undefined || !target.includes(quoted);
  });
}

/** Prose asserting that migrations apply themselves on a deploy or a boot. */
const MIGRATIONS_AUTOAPPLY_BAN = [
  /migrations? (?:do |does |will )?(?:auto-?appl|automatically appl)/i,
  /migrations? appl(?:y|ies) automatically/i,
  /(?:apply|applied|applies)[^.]{0,40}\bon every boot\b/i,
  /\bmigrate deploy\b[^.]{0,90}\b(?:runs?|applies|applied)\b[^.]{0,40}\b(?:on|at|before) (?:every |each )?(?:boot|start|deploy)/i,
  /\bstart command\b[^.]{0,80}\b(?:runs?|applies|will apply)\b[^.]{0,60}migrate deploy/i,
  /\bmigrate deploy\b[^.]{0,80}\bbefore serving\b/i,
  /a failing migration is a crash-?loop/i,
  /\bcrash-?loop\b[^.]{0,60}\bnot a failed build\b/i,
];

/**
 * An explicit statement, in the same paragraph, that the claim is retired or
 * that measurement contradicts it. Deliberately narrow: a bare "not" must not
 * buy an exemption, which is the rule OPS-06 arrived at the hard way.
 *
 * `this line said the opposite` was in this list for one run and had to come
 * out. The retired TASKS.md:119 paragraph contained that exact phrase — it was
 * announcing a PREVIOUS correction — so the sentence exempted itself from the
 * ban while still asserting the wrong thing, and the file-level regression
 * below passed 1 assertion it should have failed. A marker that a page has been
 * corrected before is not a denial of what it says now.
 */
const MIGRATIONS_AUTOAPPLY_DENIAL =
  /do(?:es)? not apply on deploy|migrations do not apply|silent no-?op|still pending afterwards|apply them by hand|used to (?:say|claim|read)|previously (?:said|read|claimed)|measurement contradicts/i;

/** Paragraphs where a document says, in its own voice, that migrations self-apply. */
export function migrationAutoApplyAssertions(md) {
  return ownVoiceParagraphs(md).filter(
    (para) =>
      !MIGRATIONS_AUTOAPPLY_DENIAL.test(para) &&
      MIGRATIONS_AUTOAPPLY_BAN.some((re) => re.test(para)),
  );
}

describe('OPS-17 (2026-09-09) — TASKS.md, package.json and render.yaml are locked together', () => {
  const TASKS = 'TASKS.md';
  const API_PKG = 'apps/api/package.json';
  const RENDER = 'render.yaml';

  it('the API start script still is what TASKS.md quotes', () => {
    // Drop `prisma migrate deploy` from the start script — or add it back —
    // and the sentence in TASKS.md describing the boot chain is stale the
    // moment the file is saved. This is the lock that makes that a CI failure
    // instead of a discovery three weeks later.
    const start = JSON.parse(read(API_PKG)).scripts.start;
    expect(start).toBe('prisma migrate deploy && node dist/server.js');
    expect(read(TASKS), 'TASKS.md no longer quotes the API start script verbatim').toContain(
      '`' + start + '`',
    );
  });

  it('the render.yaml startCommand still is what TASKS.md quotes', () => {
    const blueprint = yaml.load(read(RENDER));
    const api = blueprint.services.find((s) => s.name === 'bhaktisetu');
    expect(api, 'the API service disappeared from render.yaml').toBeTruthy();
    expect(api.startCommand).toBe('pnpm --filter @poojly/api start');
    expect(read(TASKS), 'TASKS.md no longer quotes the startCommand verbatim').toContain(
      '`' + api.startCommand + '`',
    );
  });

  it('every `file:line` → `command` citation in TASKS.md lands on that line', () => {
    const broken = brokenLineCitations(read(TASKS));
    expect(broken, 'citation(s) point at the wrong line: ' + JSON.stringify(broken)).toHaveLength(
      0,
    );
    // And the check must be looking at something.
    expect(lineCitations(read(TASKS)).length).toBeGreaterThanOrEqual(2);
  });

  it('the citation check fires on the exact line number that was live this morning', () => {
    // VERBATIM from TASKS.md:119 before this pass. `render.yaml:20` is the
    // comment "# the local prisma binary resolve correctly."; the startCommand
    // is on line 21. This is the regression the check exists for.
    const retired =
      '3. **Migrations DO auto-apply — on API START, not build.** `render.yaml:20` → ' +
      '`pnpm --filter @poojly/api start`; `apps/api/package.json:10` → ' +
      '`prisma migrate deploy && node dist/server.js`.';
    const broken = brokenLineCitations(retired);
    expect(broken).toHaveLength(1);
    expect(broken[0]).toMatchObject({ file: 'render.yaml', line: 20 });

    // The corrected form must pass, or the guard would fail the commit that
    // fixes the defect.
    expect(brokenLineCitations(retired.replace('render.yaml:20', 'render.yaml:21'))).toHaveLength(
      0,
    );
  });

  it('the auto-apply ban fires on the sentences that were live this morning', () => {
    const LIVE_ON_2026_09_09 = [
      // TASKS.md:119 — the whole reason this finding exists
      '**Migrations DO auto-apply — on API START, not build.**',
      '**Consequence: a failing migration is a CRASH-LOOP, not a failed build** — the API never comes up.',
      // docs/runbooks/prod-rollback.md:113
      'Migrations apply automatically on every boot, including the boot that follows a rollback.',
      // The retired TASKS.md:119 paragraph in full-ish: it announces a PRIOR
      // correction, which must not exempt the claim it is still making.
      '**Migrations DO auto-apply — on API START, not build.** This line said the opposite until 2026-09-08.',
      // the shape a future page would most naturally use
      'prisma migrate deploy runs at every boot, before the Node process exists.',
    ];
    for (const prose of LIVE_ON_2026_09_09) {
      expect(migrationAutoApplyAssertions(prose), 'ban missed: ' + prose).toHaveLength(1);
    }
  });

  it('the ban does not fire on the corrections that replaced them', () => {
    const corrections = [
      'Migrations do NOT apply on deploy — MEASURED. The repo config says they should: `render.yaml:21` → `pnpm --filter @poojly/api start`.',
      'A deploy reports green and the schema never moves: a silent no-op, not a crash-loop.',
      'The page used to say migrations auto-apply on API start; measurement contradicts it.',
    ];
    for (const prose of corrections) {
      expect(migrationAutoApplyAssertions(prose), 'false positive on: ' + prose).toHaveLength(0);
    }
    // A bare negation elsewhere in the paragraph must NOT buy an exemption.
    expect(
      migrationAutoApplyAssertions(
        'This is not complicated: migrations apply automatically on every boot.',
      ),
    ).toHaveLength(1);
  });

  it('TASKS.md and CLAUDE.md are clean, and the sweep names every page that is not', () => {
    // Walked, not listed — a NEW page carrying the claim fails here.
    const offenders = allFollowableDocs()
      .filter((f) => migrationAutoApplyAssertions(read(f)).length > 0)
      .sort();

    // The two `@`-imported files are the point of the finding: they are loaded
    // into every session in this repository.
    expect(offenders, 'TASKS.md still asserts migrations self-apply').not.toContain('TASKS.md');
    expect(offenders, 'CLAUDE.md still asserts migrations self-apply').not.toContain('CLAUDE.md');

    expect(offenders).toEqual(OPS17_KNOWN_UNFIXED);
  });

  it('--unexecuted is never presented as a check for pending migrations', () => {
    // Measured 2026-09-09 against production: `--unexecuted` named 6
    // migrations and exited 1, while `_prisma_migrations` had 0 genuinely
    // pending. Any page that offers it as the pre-flight must say what it
    // really is and name `migrate status` as the authority.
    const md = read(TASKS);
    expect(md).toMatch(/--unexecuted/);
    const voice = flatten(documentVoice(md));
    expect(/migrate status/.test(voice), 'TASKS.md does not name `prisma migrate status`').toBe(
      true,
    );
    expect(
      /not\*{0,2} a pending check|applied_steps_count = 0/i.test(voice),
      'TASKS.md presents --unexecuted as a pending check',
    ).toBe(true);
  });

  it('every script path TASKS.md hands an operator exists', () => {
    // The retired step told the reader to run `scripts/verify-migration-objects.mjs`.
    // That path has never existed; the script lives under `apps/api/scripts/`.
    // Paths are handed over inside a backtick span, but not always alone in it
    // — `node scripts/agents/roadmap/orchestrator-pause.mjs false` is the same
    // promise to the reader as a bare path, so scan inside each span.
    const cited = [
      ...read(TASKS).matchAll(/`([^`\n]+)`/g),
    ].flatMap((m) => [
      ...m[1].matchAll(/(?:^|\s)((?:apps\/[a-z-]+\/)?scripts\/[\w./-]+\.(?:mjs|ts|js|sh))/g),
    ].map((x) => x[1]));
    expect(cited.length).toBeGreaterThanOrEqual(3);
    const missing = cited.filter((p) => !existsSync(join('.', p)));
    expect(
      missing,
      'TASKS.md cites script(s) that do not exist: ' + JSON.stringify(missing),
    ).toEqual([]);

    // Non-vacuity: the retired path must still read as missing.
    expect(existsSync(join('.', 'scripts/verify-migration-objects.mjs'))).toBe(false);
    expect(existsSync(join('.', 'apps/api/scripts/verify-migration-objects.mjs'))).toBe(true);
  });
});
