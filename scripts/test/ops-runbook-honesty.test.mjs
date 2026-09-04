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
