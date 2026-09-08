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
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const WINDOWS_SEP = String.fromCharCode(92);

/**
 * Every markdown file a human might open and follow — walked, never listed.
 *
 * `docs/audit/**` is excluded for the reason commitlint.yml excludes it: that
 * directory's job is to quote defects verbatim, and a ledger row reading "it
 * says push a revert, but both services are autoDeploy:false" is the
 * DESCRIPTION of the finding, not a recurrence of it. Rewording the audit
 * record to satisfy a grep would falsify it. `docs/chat-archive/**` is raw
 * conversation transcript, not instruction. Nothing else is excluded — the
 * cron-written directories (`docs/agent-reports`, `docs/roadmap/_dryrun`,
 * `docs/roadmap/_alerts`) are deliberately IN scope, because a scheduled agent
 * writing the retired claim into the repo is a regression worth failing on.
 */
const EXCLUDED = [
  // The audit ledger's job is to quote defects verbatim (same exclusion, same
  // reason, as .github/workflows/commitlint.yml).
  /^docs\/audit\//,
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
    expect(docs.some((f) => f.startsWith('docs/audit/'))).toBe(false);
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

  it('no document hands an operator a render-diag dispatch carrying -f branch=', () => {
    const offenders = [];
    for (const file of allFollowableDocs().filter((f) => !OUT_OF_LANE.includes(f))) {
      read(file)
        .split('\n')
        .forEach((line, i) => {
          if (!line.includes('render-diag.yml')) return;
          if (/-f\s+branch=/.test(line)) offenders.push(`${file}:${i + 1} ${line.trim()}`);
        });
    }
    expect(offenders, `\n${offenders.join('\n')}\n`).toEqual([]);
  });

  it('the rule is capable of failing — the exact line seven docs carried', () => {
    const retired =
      'gh workflow run render-diag.yml -f mode=deploy -f sid=srv-d970l2ks728c738fc33g -f branch=main';
    expect(retired.includes('render-diag.yml') && /-f\s+branch=/.test(retired)).toBe(true);
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
