# Free-Tier Service Budgets

> **READ before adding any workflow / cron / integration / SDK / page.**
> User refuses paid plans. Every external service must fit free tier.
> Going over → service paused → user blocked from launching. Last updated 2026-07-10.

## Hard caps per service

| Service                                      | Free cap                          | Resets               | What burns it                                            | Where to check                      |
| -------------------------------------------- | --------------------------------- | -------------------- | -------------------------------------------------------- | ----------------------------------- |
| **GitHub Actions** (private repo)            | 2000 min/mo                       | 1st of month         | Every workflow run. Linux runner = 1× multiplier.        | https://github.com/settings/billing |
| **Cloudflare Pages** builds                  | 500/mo (n/a since 2026-07-08)     | 1st of month         | **Nothing.** Pages git integration was disabled 2026-07-08 (`cf-kill-zombie.yml`); web is a Render Docker service. Row kept so the zero is deliberate, not an omission. | CF dash → Pages → project → builds  |
| **Cloudflare Pages** worker bundle           | 3 MiB compressed                  | per deploy           | Edge routes + their deps. Hard fail on overshoot.        | `docs/cf-worker-budget.md`          |
| **Cloudflare Pages** requests                | 100k/day                          | daily                | Visitor traffic                                          | CF dash → Analytics                 |
| **Resend** emails                            | 100/day, 3000/mo                  | rolling 24h, monthly | Welcome / receipt / reset / referral.                    | resend.com/dashboard                |
| **Supabase** DB                              | 500 MB                            | hard                 | Prisma writes.                                           | supabase.com/dashboard → storage    |
| **Supabase** egress                          | 5 GB/mo                           | monthly              | API responses, image fetches.                            | supabase.com/dashboard → bandwidth  |
| **Supabase** storage                         | 1 GB                              | hard                 | Avatar / temple image uploads.                           | supabase.com/dashboard → storage    |
| **Render** instance-hours (ACCOUNT-WIDE)     | 750 hr/mo **shared by ALL services** | monthly           | **TWO services now: `bhaktisetu` (API) + `darshya-web`. See the note below — they cannot both be always-on.** | render.com/billing |

> ### ⚠ Render instance-hours — corrected 2026-08-20 after an outage
> This row previously read *"750 hr/mo, API container uptime"*, describing **one**
> service. The Cloudflare Pages → Render cutover added a **second** (`darshya-web`)
> and this budget was never updated, so nothing modelled the real cost.
>
> The 750 hours are **per ACCOUNT, not per service**:
>
> | Scenario | Hours in a 31-day month | Fits in 750? |
> |---|---:|---|
> | 1 service always-on | 744 | yes, 6 h spare |
> | **2 services always-on** | **1,488** | **no — over by 738** |
>
> On **2026-08-17** the account reached **750.2 / 750** and Render suspended **both**
> services (`"suspenders": ["billing"]`). darshya.online and api.darshya.online
> served HTTP 503 for three days before anyone noticed, because nothing was
> watching. `.github/workflows/render-hours-guard.yml` now checks daily and opens
> an issue on suspension.
>
> **No amount of cron tuning fixes this.** Only three workflows wake production
> (`agents-daily`, `agents-health` ×2/day, `e2e` weekly) — about 23 h/month, or 3%
> of a 738-hour deficit. The overrun is structural.
>
> If one service must sleep, it should be the **web**: it is mostly static
> (0 pages `force-dynamic`, 157 on ISR, only 7 calling the API during SSR), so it
> tolerates spin-down far better than the API. **But** the API runs an in-process
> scheduler (`apps/api/src/jobs/scheduler.ts`, 30-min interval) that only ticks
> while the container is up — an API allowed to sleep silently stops notifications
> and panchang pushes, and `GET /ops/scheduler` will report `stale: true`. Move that
> scheduler to a GitHub Actions cron before letting the API sleep.

| **Render** build minutes                     | 500/mo                            | monthly              | API deploys.                                             | render.com/dashboard                |
| **Cloudflare Workers** (separate from Pages) | 100k req/day                      | daily                | Not currently used; don't enable without budget.         | n/a                                 |
| **FCM** push notifications                   | unlimited                         | n/a                  | n/a                                                      | n/a                                 |
| **IndexNow**                                 | unlimited                         | n/a                  | n/a                                                      | n/a                                 |
| **Razorpay test mode**                       | unlimited                         | n/a                  | Test transactions.                                       | razorpay.com                        |
| **Stripe**                                   | removed from the product          | n/a                  | Stripe was removed entirely (audit, 2026-08); no usage.  | n/a                                 |
| **Sentry** (Developer plan)                  | 5k errors / 10k transactions / mo | monthly              | Errors + perf spans.                                     | sentry.io                           |
| **DuckDuckGo HTML** (used by SERP agents)    | rate-limited soft                 | per IP               | competitor-watch, keyword-rank-tracker.                  | n/a — back off on 429               |
| **Nitter** mirrors                           | rate-limited soft                 | per mirror           | x-engagement-digest.                                     | rotate 3 mirrors                    |

## GitHub Actions per-workflow burn (reconciled 2026-07-10)

> Reconciled by grepping every `.github/workflows/*.yml` for `cron:` / trigger
> blocks. Prior table (2026-05-28, ~846 min/mo) omitted four scheduled
> workflows that were added afterward AND kept a stale `lighthouse-weekly`
> weekly row whose cron had already been killed. Honest numbers below.

| Workflow                                                        | Trigger                                                                        | Min/run            | Runs/mo           | Min/mo           |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------ | ----------------- | ---------------- |
| `ci.yml`                                                        | **PR only + manual since 2026-10-05 (push-to-main trigger removed, see the 2026-10-05 section)** (paths-filtered, no docs/.claude). **MEASURED 2026-09-04 from the Actions API, not estimated:** August = 70 runs / 530 min / **7.6 min per run**, 61 of them green. The ~5.25 and ~80 below were an estimate and both were wrong — the rate was low and the run count high. Timeout raised 12→25 the same day (see note) | **7.6 measured, ~15-18 expected once web completes** | **70 measured** | **~530 actual Aug; ~1050 projected** |
| `commitlint.yml`                                                | **every PR, no paths filter** (the one gate never skipped). +~5s/run 2026-08-21 for the OPS-11 secret scan | ~0.6               | ~20               | ~12              |
| `ai-review.yml`                                                 | PR, paths-filtered (`apps/**`, `packages/**`, `.github/workflows/**`, `scripts/agents/**`) | ~2                 | ~15               | ~30              |
| `e2e.yml`                                                       | **Sun weekly + manual only** (PR trigger removed 2026-07-10)                   | ~15                | 4                 | ~60              |
| `agents-health.yml`                                             | every 12h                                                                      | ~3                 | 60                | 180              |
| `agents-daily.yml`                                              | daily 03:30 UTC (6 producing agents; 6 paused 2026-07-17 — see header comment) | ~2                 | 30                | 60               |
| `agents-weekly.yml`                                             | Mon 04:00 UTC (20 agents)                                                      | ~10                | 4                 | 40               |
| `lighthouse-weekly.yml`                                         | **cron KILLED 2026-05-28** → manual only                                       | ~12                | 0                 | 0                |
| `daily-cron.yml`                                                | daily 00:00 UTC                                                                | ~0.1               | 30                | 3                |
| `pr-checks.yml`                                                 | PR only (paths-filtered)                                                       | ~0.5               | ~20               | 10               |
| `sentry-release.yml`                                            | tag only (manual cut)                                                          | ~15                | ~2                | 30               |
| `deploy-web-render.yml`                                         | manual + push to `worktree-cf-opennext-migration` branch only (NOT main)       | ~25                | 0 on main flow    | 0                |
| `roadmap-loop.yml`                                              | **weekly, Mon 06:17 UTC** (cut from every-12h 2026-09-01 — see note below)     | ~12                | 4                 | **48**           |
| `onboarding-fleet-v2.yml`                                       | **daily 09:23 UTC**                                                            | ~3                 | 30                | 90               |
| `db-backup.yml`                                                 | **daily 19:00 UTC**                                                            | ~5                 | 30                | 150              |
| `cxo-advisory.yml`                                              | **Mon 08:07 UTC weekly**                                                       | ~3                 | 4                 | 12               |
| `roadmap-finalize.yml`                                          | push to main, paths-filtered on `docs/roadmap/**` only                         | ~1                 | ~10               | ~10              |
| `render-hours-guard.yml`                                        | **daily 06:00 UTC** (added 2026-08-20; see the OPS-08 note below — the cron does not fire until this reaches `main`) | ~1 | 30 | **30** |
| `cf-kill-zombie.yml` / `render-diag.yml` / `render-cutover.yml` | manual only                                                                    | n/a                | 0                 | 0                |
| **Total estimate**                                              |                                                                                |                    |                   | **~1181 min/mo** |

Cap = 2000 min/mo. **Headroom: +819 min/mo.** Fleet is comfortably under cap.

## 2026-10-05 - Actions burn measured, and what was cut

**Measured (Actions API + run logs, 2026-10-01 to 2026-10-05):** ~1,260 wall-minutes in 5 days
against a 2,000 min/month cap, i.e. ~63% of the month gone by the 5th.

| Line | Runs | Billed min | Why |
|---|---:|---:|---|
| `ci.yml` total | 83 | ~970 | ~11.7 min/run |
| of which `push` to main | 37 | ~430 (37 x ~11.7) | re-ran exactly what the PR run had just passed |
| of which `pull_request` | 46 | ~540 | the real gate |
| `next build` font flake reruns | several | ~8 each | `TypeError: Cannot read properties of null (reading '1')` in `next/font/google`, all tests green |
| `render-diag.yml` deploy polling | - | ~109 | wall time spent sleeping while Render builds |
| everything else (crons, commitlint, ai-review, ...) | - | ~180 | 1,260 - 970 - 109 |

**What changed (#308):**
1. `ci.yml` no longer triggers on `push` to main. `pull_request` already tests the PR merged
   into main, so the push run was a duplicate. `workflow_dispatch` added for a manual main run;
   `.claude/**` added to `paths-ignore`. The merge gate (`docs/merge-gatekeeping.md`: PR CI green)
   is unchanged. Saves the ~37-push share: **~430 min per 5 days at the October pace**.
2. Fonts are self-hosted (`apps/web/app/fonts/*.woff2`, SIL OFL, loaded via `next/font/local`).
   `next build` no longer touches fonts.googleapis.com, so the flake that forced ~8-12 min
   reruns is gone by construction.
3. `render-diag.yml` deploy poll: 10s interval, 14 min cap that now FAILS on timeout (it used
   to fall through silently), warm-up loop cut from up to ~8 min to ~1.5 min.

**Expected burn after the change (estimate, not measured - verify on 2026-11-01):**

| Item | Math | Min/mo |
|---|---|---:|
| `ci.yml` PR runs | ~46 PR runs per 5 days is the October pace; assume ~25 PR runs/mo once batching holds x ~11 min | ~275 (range 200-550) |
| flake reruns | ~0 (cause removed); allow 2 x ~11 | ~22 |
| Other workflows (unchanged) | sum of the table's Min/mo column excluding ci.yml: 12+30+60+180+60+40+3+10+30+48+90+150+12+10+30 | ~765 |
| `render-diag.yml` deploys | ~4 deploys x ~12 min of polling | ~50 |
| **Total** | 275 + 22 + 765 + 50 | **~1,110 (range ~1,000-1,450)** |

Caveat: the measured non-CI, non-deploy remainder was ~180 min in 5 days (~1,080/mo pace), well above this table's ~765, so the other workflows may be under-modelled; the high end of the range allows for that.

At the October pace without any change the month projects to ~7,500 min (1,260 / 5 x 30),
which is why the free allowance ran out. The estimate above only holds if PR count also drops:
the biggest remaining lever is still pushes per PR.

## How to stay under 2,000 min/month

1. **Batch commits; one push per PR.** Every push to an open PR re-runs the full ~11 min CI
   (cancel-in-progress only saves you when the previous run was still going). No push-per-fix.
2. **Run the checks locally first** (`pnpm exec vitest run`, `pnpm exec tsc --noEmit`, and
   `next build` for web changes) so CI is confirmation, not the debugger.
3. **Re-run only failed jobs** (`gh run rerun <id> --failed`) and only after reading the log:
   a flake is not a reason to push an empty commit.
4. **Docs-only and `.claude/**` changes** skip `ci.yml` by path filter. Keep them in separate
   PRs from code only if the code PR would otherwise be mid-flight.
5. **Do not add push triggers** to workflows; use `pull_request` with a paths filter or
   `workflow_dispatch`. Run `darshya-free-tier-check` before adding any workflow.
6. **Deploys are by dispatch** (`render-diag.yml -f mode=deploy`) and cost ~12 min of polling each;
   batch merges first, deploy once.
7. Check usage mid-month at https://github.com/settings/billing; if over ~1,000 by the 15th,
   stop non-essential PRs.

> **RECONCILED 2026-09-04 — the CI line was wrong in both directions, and the
> error was hiding a dead gate.**
>
> Pulled from `actions/workflows/ci.yml/runs` rather than estimated:
>
> | Period | Runs | Billed min | Avg | Outcomes |
> |---|---|---|---|---|
> | August 2026 | 70 | 530 | 7.6 | **61 success**, 4 cancelled, 5 failure |
> | September 1-4 | 10 | 96 | 9.6 | **0 success**, 9 cancelled, 1 failure |
>
> The table said ~5.25 min/run × ~80 runs = ~416. Actual August was 7.6 × 70 =
> 530 — so this row alone under-counted by ~114 min/mo, and it is the fleet's
> largest single consumer.
>
> The more important finding is in the September column. Every run is being
> killed at `timeout-minutes: 12` with `@poojly/web` still running; the packages
> that do finish (shared, api-client, api at 287 files, mobile at 34) all pass.
> The suites outgrew the ceiling. **A killed run bills the full 12 minutes and
> returns no verdict**, so the repo was paying ~96 min in four days for zero
> signal while `docs/merge-gatekeeping.md` still required a green CI to merge.
>
> Timeout raised to 25. This does NOT cost 25 min/run — Actions bills real
> duration, so the expected cost is the ~15-18 a completing run actually needs.
> Projected ci.yml ~1050 min/mo at 70 runs, taking the fleet to roughly
> **~1700 min/mo, headroom ~300**. That fits, but CI is now decisively the
> dominant line item, so the CLAUDE.md "batch commits before pushing" rule is
> load-bearing for the budget and not merely tidiness.
>
> Watch for: a timed-out job reports `cancelled`, not `failure`. That reads as
> "superseded by a newer push" and is exactly why nine consecutive dead runs went
> unnoticed. Check duration against the timeout before believing a cancellation.

> ### `roadmap-loop.yml` cut to weekly — 2026-09-01
>
> This was **720 min/mo, 39% of the entire allowance** and by far the largest
> single line in this table. It ran twice a day with `timeout-minutes: 50`.
>
> It was cut because the minutes buy nothing today, not merely to save quota.
> The workflow's own header records why: the orchestrator is still in dry-run
> and still writes **0 queue files per cycle** because of the sub-agent
> silent-failure bug. Two corroborating facts, both checked today:
> **148 unread dry-run items** have accumulated in `docs/roadmap/_dryrun/queue/`,
> and the engine's own tracker `docs/roadmap/_budget-snapshot.json` has been
> frozen at `"month": "2026-06"` with `ghMinutes.used: 0` since June — the thing
> meant to watch this budget has not recorded a single minute.
>
> This is not tidiness. **`OPS-09`: all production monitoring rides on this same
> quota, and it has been exhausted once already.** A monitoring fleet that dies
> because a dry-run loop ate the budget is exactly how the 2026-08-17 Render
> suspension served 503s for three days before anyone noticed.
>
> **To restore** once the silent-failure bug is fixed and the ARE Phase-6 soak
> resumes: change the one `cron:` line back to `'17 */12 * * *'` and re-check
> this total first. Headroom returns to ~147 min/mo, which is 7%.

> **Arithmetic corrected 2026-08-28.** This line read `~1888` / `+112`, and the
> rows above it do not sum to that. Adding the Min/mo column:
> 416 + 12 + 30 + 60 + 180 + 60 + 40 + 0 + 3 + 10 + 30 + 0 + 720 + 90 + 150 + 12
> + 10 + 30 + 0 = **1853**. The 2026-08-21 note below is self-inconsistent in the
> same direction: it says the two omitted workflows are "~42 min/mo" and take the
> total "from ~1843 to ~1888", but 1843 + 42 = 1885. The error is conservative —
> it over-states burn, so nothing was under-budgeted — but a budget nobody can
> re-add is a budget nobody checks, which is how the four omitted workflows got
> in. Re-derive by summing the column, not by trusting this cell.

> **Reconciled again 2026-08-21 (OPS-02 / OPS-11).** Two workflows that have been
> running for months were **never in this table**: `commitlint.yml` (~12 min/mo —
> every PR, deliberately unfiltered) and `ai-review.yml` (~30 min/mo). That is
> ~42 min/mo of real burn the budget did not model, and it is the same class of
> error as the Render row: a number that describes a fleet that no longer exists.
> Adding them takes the honest total from ~1843 to ~1888 before any new work.
>
> This wave's actual additions cost **~5 min/mo total**:
>
> | Change | Minutes/mo |
> |---|---:|
> | `commitlint.yml` secret-scan step (OPS-11) — ~5s on an already-checked-out runner, PRs only | ~+2 |
> | `ci.yml` ops-guard step gains the two `scripts/backup/test/*` files — ~+2s/run | ~+3 |
> | `db-backup.yml` dump verification (`pg_restore --list` + one HEAD request) | **0** (seconds, inside the existing 5-min budget) |
> | `db-backup.yml` `restore-drill` job | **0 scheduled** — `workflow_dispatch` only, gated on an input. ~6 min per manual run; expected quarterly. |
>
> The restore drill is deliberately not on a schedule. A quarterly manual drill
> costs ~24 min/year; a daily one would cost ~180 min/mo and buy nothing, because
> what it verifies (that the dump restores) does not change day to day.

> **2026-08-28 wave (OPS-02 / OPS-03 / OPS-08 / OPS-10 / OPS-11): ~+2 min/mo.**
>
> | Change | Minutes/mo |
> |---|---:|
> | `ci.yml` ops-guard step gains `scripts/test/ops-runbook-honesty.test.mjs` and `scripts/test/secret-scan.test.mjs` — ~+1.5s/run at ~80 runs | ~+2 |
> | `.githooks/pre-commit` secret scan (OPS-11) | **0** — runs on the committer's machine, never on a runner |
> | Root `prepare` → `scripts/install-git-hooks.mjs` | **0** on CI: the script returns immediately when `CI` is set |
> | Documentation rewrites (runbooks, multi-region stubs, legal pack) | **0** — `ci.yml` is `paths-ignore: docs/**` |
>
> No cron was added, removed or re-timed. The only new *scheduled* workflow in
> this repository remains `render-hours-guard.yml`, which is counted above and
> which did not fire until its branch merged (it is on `main` now) — see the next section.

> **Reconciled 2026-08-20.** `render-hours-guard.yml` (30 min/mo) was added on
> `feat/recurring-razorpay-planid` and had never been counted, so the "~1800 /
> +200" line above was describing a fleet that no longer existed. The `OPS-01`
> and `OPS-09` corrections landed in the same wave cost **zero additional
> minutes**: `agents-health.yml` gained a heartbeat `curl` and a conditional
> `github-script` step (seconds, and the issue step only runs on failure), and
> `e2e.yml` only had two `continue-on-error` flags removed. No cron frequency
> changed.
>
> The one line item that DID cost minutes is the `ci.yml` "Ops guards" step.
> `turbo test` is per-package and never ran the repo-root vitest project, so the
> `scripts/**` guards protecting the monitors would have been dead code that
> nothing executed. Running three named files on an already-installed runner is
> ~10s, i.e. **~13 min/mo** at ~80 runs. Total 1830 -> 1843, headroom 170 -> 157.

**Dominant consumer (historical — cut to weekly 2026-09-01, now ~48 min/mo):** `roadmap-loop.yml` at ~720 min/mo (40% of cap) with
2 cycles/day. The 8h→12h change 2026-07-13 cut ~360 min/mo. Six agents paused
in `agents-daily.yml` 2026-07-17 (cold-temple-outreach, daily-devotional-broadcast, dormant-reactivation, referral-nudge + the pre-existing onboarding-nudge, support-intent-triage) cut another ~45 min/mo — all six were producing 0 artifacts because RESEND_API_KEY / WHATSAPP_ACCESS_TOKEN secrets are unset and the funnel has 0 eligible users.

**Recommended cuts to get back under cap (ops decision, not done here):**

1. Drop `roadmap-loop.yml` to every 12h (2/day): 12×2×30 = 720 → saves 360 → total ~1800. SAFE.
2. Or drop to 1 cycle/day: 12×1×30 = 360 → saves 720 → total ~1440. More headroom.
3. `db-backup.yml` (150) + `onboarding-fleet-v2.yml` (90) are the next-largest
   scheduled costs — both daily; neither is a candidate to cut without product
   impact (backups + onboarding drips).
4. Re-enabling `lighthouse-weekly.yml` cron would add ~48 min/mo — do NOT
   re-enable until the silent-failure root cause is fixed AND the cap has room.

## Pre-cut state (2026-05-27, billing failed)

| Workflow                                    | Old min/mo                                                           |
| ------------------------------------------- | -------------------------------------------------------------------- |
| ci.yml (3 jobs × pnpm install × every push) | ~1500                                                                |
| e2e.yml (every push)                        | ~900                                                                 |
| deploy-web.yml (every push)                 | ~360                                                                 |
| agents-health.yml (every 6h)                | 360                                                                  |
| agents-daily.yml (24 agents)                | ~150                                                                 |
| sentry-release.yml (every push)             | ~900                                                                 |
| **Total**                                   | **~4170 min/mo** — exceeded cap by 2×, billing blocked all workflows |

## Monitoring depends on this budget — read this before trimming it (`OPS-09`)

Every production check this repository owns runs on the GitHub Actions quota:

| Monitor | What it would catch | Min/mo |
|---|---|---|
| `agents-health.yml` (12h) | any prod endpoint failing, across all 8 roles | 180 |
| `render-hours-guard.yml` (daily) | either Render service suspended | 30 |
| `e2e.yml` (weekly) | prod regression in real browser flows | 60 |
| `db-backup.yml` (daily) | no restore point being produced | 150 |

**They share a single point of failure with each other and with the thing they
watch.** When the Actions quota is exhausted, or billing is blocked, or Actions
itself has an incident, all four stop simultaneously and *nothing reports it* —
a workflow that does not run cannot open an issue about not running. This has
already happened once to this repository (2026-05-27, "recent account payments
have failed"; see the pre-cut table above).

The only monitor that survives that is one that alarms on **absence**:

- `agents-health.yml` pings `HEALTH_HEARTBEAT_URL` on every run (`/fail` when the
  smoke found prod down). A free healthchecks.io check with a 12-hour period and
  a 1-hour grace emails when the ping stops arriving — whether prod died, or the
  monitor did.
- **Owner action, unset today:** create the check, then
  `gh secret set HEALTH_HEARTBEAT_URL --body '<ping-url>'`. Until it is set, the
  workflow prints a warning into its job summary on every run rather than
  quietly staying unarmed. Cost: ₹0, 0 GH minutes.
- `db-backup.yml` already reads `HEARTBEAT_URL` for the same purpose; the two can
  be separate checks on the same free account.

Corollary for anyone cutting minutes: `agents-health.yml` and
`render-hours-guard.yml` are the last two rows to touch. 210 min/mo is the price
of knowing whether the product is up.

## Scheduled workflows only run from the default branch (`OPS-08`)

GitHub honours `schedule:` **only** on the repository's default branch, and
registers a `workflow_dispatch` trigger only for a workflow file that exists on
the **default branch**. `--ref` chooses *which copy of an already-registered
workflow* to execute; it cannot conjure a trigger for a file `main` has never
seen. A cron added on a feature branch is inert until the branch merges.

**Status as of 2026-10-04: no longer an open problem for the three workflows
this page used to track.** `render-hours-guard.yml` and `db-backup.yml` are both
in `main`'s tree (`git ls-tree origin/main .github/workflows/`), so their crons
register and both are dispatchable with **no `--ref`**:

```bash
gh workflow run render-hours-guard.yml
gh workflow run db-backup.yml
```

Earlier revisions of this page said the guard had "no way to run" and told the
reader to dispatch `db-backup.yml` against the old feature branch. Both are
retired: the guards merged (#249, extended 2026-09-04), and that branch is now an
older, weaker copy than `main`. The general rule above still holds for any NEW
workflow: it starts at the merge, not at the commit. After merging one, verify
rather than assume:

```bash
gh workflow list --all | grep <workflow-file>
gh run list --workflow=<workflow-file> --limit 5   # a scheduled run within ~24h
```

Also note GitHub disables scheduled workflows in a repository with 60 days of no
activity and re-enables them only on a manual dispatch, so an empty run list
months later is a real state rather than a display bug.

## Rules — read before adding/changing anything

### Workflow rules

1. **No `push:` trigger on a workflow > 5 min/run without paths-filter.** Every PR + every push to main if it must run on push.
2. **`paths-ignore: docs/**, **/\*.md, TASKS.md, ROADMAP.md, PROJECT_CONTEXT.md`** on any code workflow. Docs-only commits must not burn minutes.
3. **One consolidated job** wherever possible. Three jobs = three `pnpm install` = three runner spinups.
4. **Crons coarser than the value they produce.** A health check every 6h that no one looks at twice a day = 12h.
5. **Sentry / E2E / Lighthouse: weekly or tag-triggered, never per-push.** Catch regression weekly, not every commit.
6. **`workflow_dispatch` always present** so you can re-run manually without merging.

### Commit batching rules

1. **No 1-commit pushes for code that triggers CI.** Wait until you have ≥ a logical chunk (5-10 changes, one feature, or end of a debug session).
2. **`[skip ci]` on docs-only commits — RETIRED 2026-09-08 (`OPS-06`).** This rule used to read: *"Pure docs changes MUST append `[skip ci]` to commit subject. CF Pages git-integration runs on every push regardless of paths — `[skip ci]` is the ONLY mechanism that prevents CF build queue entry."* That Cloudflare Pages git integration was disabled on 2026-07-08 (`cf-kill-zombie.yml`), so no push to this repository enters a CF build queue and there is no CF build to prevent. `[skip ci]` now only affects GitHub Actions, and `ci.yml` already carries `paths-ignore: docs/**, **/*.md`, so a docs-only push costs nothing there either. **Do not add `[skip ci]` to a docs commit** — `commitlint.yml` runs on every PR with no paths filter (it is the one gate never skipped) and you want it to.
3. **Before pushing, check current month burn:** if > 60% of the GitHub Actions cap is consumed and it's < 20th of month, pause until next cycle for non-critical work. *(Corrected 2026-09-08, `OPS-06`: this rule used to add "you CANNOT see CF build count programmatically — ask owner before any non-critical push after mid-month". There is no CF build count to see; the Pages integration has been off since 2026-07-08. GitHub Actions minutes are the only per-push budget left, and `gh api /repos/:owner/:repo/actions/billing/usage` reads them.)*
4. **In an unattended/autonomous batch:** commit at logical chunk boundaries to git, but **push only at end of batch or when blocked**, not after every commit. This keeps CI cost = 1× per batch, not 1× per commit.
5. **`[skip ci]` syntax — RETIRED 2026-09-08 (`OPS-06`).** This listed the four spellings Cloudflare Pages accepted and said they "skip the queue entirely → zero build quota burn even at 500/500 cap". There is no Pages queue and no 500/mo cap on this repository any more (`cf-kill-zombie.yml`, 2026-07-08). The tokens still work on GitHub Actions, but see rule 2: do not use them, because `commitlint.yml` must run.

### CF Pages rules

1. **Worker bundle ≤ 3 MiB compressed** — see `docs/cf-worker-budget.md` for full playbook.
2. **Default new pages to Static / SSG.** Only add `runtime = 'edge'` if you NEED per-request server logic.
3. **`'use client'` pages don't need edge** — they hydrate in browser.
4. **Heavy SDKs (Stripe, Marked, Lucide-all, date-fns) banned from edge routes.**
5. **CF builds 500/mo — RETIRED 2026-09-02 (OPS-06).** This rule assumed the Cloudflare Pages git integration was live and that merging to `main` consumed a CF build. That integration was disabled on 2026-07-08 (`cf-kill-zombie.yml`) when the web front end moved to Render, so the CF build budget is no longer consumed by this repository at all. Render deploys are hand-dispatched (`autoDeploy: false`, `render.yaml:28`/`:60`) and bill against instance-hours, not builds — see the Render rows above.
6. **Two pushes in same hour — mostly RETIRED 2026-09-08 (`OPS-06`).** The stated cost was a Cloudflare Pages build per push, and the cited 2026-05-30 incident (`72a6da1` code + `a358f92` docs pushed 5 min apart, both blocked at 500/500) happened while that integration was live. It was disabled 2026-07-08, so a second push no longer costs a Pages build. What survives is smaller and still real: a second push re-runs `ci.yml` (unless docs-only) and burns Actions minutes, and on the Render free tier a new push **cancels an in-flight deploy** if one is running — which is why `autoDeploy: false` was set in the first place (`render.yaml:28`, `:60`). Batch anyway; the reason is minutes and deploy-cancellation, not Pages builds.

### Resend rules

1. **Welcome + receipt only.** No marketing blast. 100/day cap = ~3 per signup.
2. **Skip on `NODE_ENV !== 'production'`** — already done via env-or-noop. Don't change.
3. **Test email flows in dev with `RESEND_API_KEY` unset** so they noop.

### Supabase rules

1. **No bulk image upload from agents.** Agents may reference but not seed images into storage.
2. **Egress ~5 GB/mo:** if a public-facing page fetches a 1 MB image, 5000 pageviews = cap. Use CDN URLs + small avatars (< 50 KB).
3. **Watch DB size weekly.** 500 MB is small. Prune `_logs` / `_metrics` tables, never store full request bodies.

### Render rules

1. **Free spins down after 15 min idle.** Cold-start = 30-60s. Acceptable for agents, painful for users.
2. **One always-on free service possible** — currently API. Don't add a second free service.
3. **Build minutes 500/mo:** ~30 builds at 10 min each. Don't push API changes 60× per day.

### SDK / dep rules

1. **Before `pnpm add` in `apps/web`:** check the bundled size. Anything > 50 KiB minified needs justification.
2. **No `lucide-react` star imports.** `import { X } from 'lucide-react'` only.
3. **No `date-fns`** — Intl + native Date.
4. **No `moment.js`** — same.
5. **No `lodash` star.** Per-function import or rewrite.

## Throttle / circuit-breaker pattern for agents

Every agent that hits external APIs MUST:

```js
const start = Date.now();
const MAX_REQ = 50; // per-run cap
const MIN_GAP_MS = 200; // between requests
let reqs = 0;
async function hit(url) {
  if (reqs >= MAX_REQ) {
    console.warn(`[${agent}] cap ${MAX_REQ} reached; stopping early`);
    return null;
  }
  reqs += 1;
  await new Promise((r) => setTimeout(r, MIN_GAP_MS));
  try {
    return await fetch(url, { signal: AbortSignal.timeout(10_000) });
  } catch (e) {
    console.warn(`[${agent}] ${url} failed: ${e.message}`);
    return null; // never throw; agent must always exit 0
  }
}
```

Agents must exit 0 on transient failure — never red the workflow.

## Pre-flight checklist (run mentally before every push)

- [ ] Is this push needed now, or can it batch with the next 2-3 changes?
- [ ] Did I add a workflow? Triggered on push? Paths-filtered? Hourly cron?
- [ ] Did I add an edge route? Could it be Static / SSG instead?
- [ ] Did I add a new SDK? Size on bundlephobia.com?
- [ ] Did I add an agent that hits an external API? Throttle in place?
- [ ] Will this generate emails / DB writes / storage / image fetches at scale?

## Failure modes to recognize

| Symptom                                                      | Likely cause                            | Fix                                                                       |
| ------------------------------------------------------------ | --------------------------------------- | ------------------------------------------------------------------------- |
| All workflows red with "recent account payments have failed" | GH Actions cap hit + billing not set    | Add payment + spending limit at GH billing settings; cut burn             |
| `Cloudflare Pages` check red but GH workflows green          | CF 500/mo cap or git integration broken | CF dash; wait for reset or unlink/relink                                  |
| CF deploy summary `Build failed` no details                  | Bundle > 3 MiB                          | `docs/cf-worker-budget.md` playbook                                       |
| Resend `quota exceeded` 429                                  | 100/day or 3000/mo hit                  | Wait reset; audit who's sending what                                      |
| Supabase API slow / `connection pool exhausted`              | Free pooler caps                        | Reduce concurrent agents; batch reads                                     |
| Render API "spinning up" 30+s                                | Cold start after idle                   | Expected on free; add uptime-pinger every 12 min IF needed (costs GH min) |

## Future plans must read this first

Any new initiative — new agent, new integration, new page family, new email type, new mobile feature — first answer: which lines in this doc does it move? If the answer is "I'll exceed X", revise the plan, not the budget.
