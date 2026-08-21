# Free-Tier Service Budgets

> **READ before adding any workflow / cron / integration / SDK / page.**
> User refuses paid plans. Every external service must fit free tier.
> Going over → service paused → user blocked from launching. Last updated 2026-07-10.

## Hard caps per service

| Service                                      | Free cap                          | Resets               | What burns it                                            | Where to check                      |
| -------------------------------------------- | --------------------------------- | -------------------- | -------------------------------------------------------- | ----------------------------------- |
| **GitHub Actions** (private repo)            | 2000 min/mo                       | 1st of month         | Every workflow run. Linux runner = 1× multiplier.        | https://github.com/settings/billing |
| **Cloudflare Pages** builds                  | 500/mo                            | 1st of month         | Every push to main (git integration).                    | CF dash → Pages → project → builds  |
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
| **Stripe test mode**                         | unlimited                         | n/a                  | Test transactions.                                       | stripe.com                          |
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
| `ci.yml`                                                        | PR + push to main (paths-filtered, no docs). +~10s/run for the ops-guard step added 2026-08-20; +~2s more 2026-08-21 (two backup guard files added to the same step) | ~5.25              | ~80 push estimate | ~416             |
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
| `roadmap-loop.yml`                                              | **every 12h = 2 cycles/day** (changed 2026-07-13 from 8h)                      | ~12 (doc: 12×2×30) | 60                | **720**          |
| `onboarding-fleet-v2.yml`                                       | **daily 09:23 UTC**                                                            | ~3                 | 30                | 90               |
| `db-backup.yml`                                                 | **daily 19:00 UTC**                                                            | ~5                 | 30                | 150              |
| `cxo-advisory.yml`                                              | **Mon 08:07 UTC weekly**                                                       | ~3                 | 4                 | 12               |
| `roadmap-finalize.yml`                                          | push to main, paths-filtered on `docs/roadmap/**` only                         | ~1                 | ~10               | ~10              |
| `render-hours-guard.yml`                                        | **daily 06:00 UTC** (added 2026-08-20; see the OPS-08 note below — the cron does not fire until this reaches `main`) | ~1 | 30 | **30** |
| `cf-kill-zombie.yml` / `render-diag.yml` / `render-cutover.yml` | manual only                                                                    | n/a                | 0                 | 0                |
| **Total estimate**                                              |                                                                                |                    |                   | **~1888 min/mo** |

Cap = 2000 min/mo. **Headroom: +112 min/mo.** Fleet is under cap.

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

**Dominant consumer:** `roadmap-loop.yml` at ~720 min/mo (40% of cap) with
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

GitHub honours `schedule:` **only** on the repository's default branch. A cron
added on a feature branch is inert until the branch merges — it is written, not
installed, and there is no warning anywhere in the UI that says so.

This currently applies to `render-hours-guard.yml`, which arrived in commit
`853b4cbc` on `feat/recurring-razorpay-planid`. Until that merges:

- its daily cron has never fired and will not fire;
- Render-suspension detection is exactly what it was during the 2026-08-17
  outage, i.e. nothing;
- the only way to run it is `gh workflow run render-hours-guard.yml --ref feat/recurring-razorpay-planid`
  (`workflow_dispatch` **does** work from a non-default branch).

The same is true of every workflow *correction* made on a branch: the fixed
behaviour of `agents-health.yml`, `e2e.yml` and `db-backup.yml` starts at the
merge, not at the commit. After merging, verify rather than assume:

```bash
gh workflow list --all | grep render-hours-guard
gh run list --workflow=render-hours-guard.yml --limit 5   # a scheduled run within ~24h
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
2. **Pure docs changes** (TASKS.md / ROADMAP.md / PROJECT_CONTEXT.md / docs/\*_, _.md only) MUST append `[skip ci]` to commit subject. CF Pages git-integration runs on every push regardless of paths — `[skip ci]` is the ONLY mechanism that prevents CF build queue entry. Correction 2026-05-30: prior rule said "docs can land alone because they hit no workflows" — that was wrong, CF Pages has no paths-ignore.
3. **Before pushing, check current month burn:** if > 60% of cap consumed and it's < 20th of month, pause until next cycle for non-critical work. Without cloudflare MCP installed, you CANNOT see CF build count programmatically — ask owner before any non-critical push after mid-month.
4. **In an unattended/autonomous batch:** commit at logical chunk boundaries to git, but **push only at end of batch or when blocked**, not after every commit. This keeps CI cost = 1× per batch, not 1× per commit.
5. **`[skip ci]` syntax accepted by CF Pages:** `[skip ci]`, `[ci skip]`, `[skip-ci]`, `[CI Skip]` — place in commit subject or body. Skips queue entirely → zero build quota burn even at 500/500 cap.

### CF Pages rules

1. **Worker bundle ≤ 3 MiB compressed** — see `docs/cf-worker-budget.md` for full playbook.
2. **Default new pages to Static / SSG.** Only add `runtime = 'edge'` if you NEED per-request server logic.
3. **`'use client'` pages don't need edge** — they hydrate in browser.
4. **Heavy SDKs (Stripe, Marked, Lucide-all, date-fns) banned from edge routes.**
5. **CF builds 500/mo:** same rules as GH commit batching. Each push to main = 1 CF build, regardless of file types touched.
6. **Two pushes in same hour for same logical work = budget waste.** If you just pushed code, do NOT push docs follow-up — amend or wait until next code change. Incident 2026-05-30: `72a6da1` code + `a358f92` docs pushed 5 min apart, both blocked at 500/500.

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
