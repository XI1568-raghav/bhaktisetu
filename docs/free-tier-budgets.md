# Free-Tier Service Budgets

> **READ before adding any workflow / cron / integration / SDK / page.**
> User refuses paid plans. Every external service must fit free tier.
> Going over → service paused → user blocked from launching. Last updated 2026-05-28.

## Hard caps per service

| Service | Free cap | Resets | What burns it | Where to check |
|---|---|---|---|---|
| **GitHub Actions** (private repo) | 2000 min/mo | 1st of month | Every workflow run. Linux runner = 1× multiplier. | https://github.com/settings/billing |
| **Cloudflare Pages** builds | 500/mo | 1st of month | Every push to main (git integration). | CF dash → Pages → project → builds |
| **Cloudflare Pages** worker bundle | 3 MiB compressed | per deploy | Edge routes + their deps. Hard fail on overshoot. | `docs/cf-worker-budget.md` |
| **Cloudflare Pages** requests | 100k/day | daily | Visitor traffic | CF dash → Analytics |
| **Resend** emails | 100/day, 3000/mo | rolling 24h, monthly | Welcome / receipt / reset / referral. | resend.com/dashboard |
| **Supabase** DB | 500 MB | hard | Prisma writes. | supabase.com/dashboard → storage |
| **Supabase** egress | 5 GB/mo | monthly | API responses, image fetches. | supabase.com/dashboard → bandwidth |
| **Supabase** storage | 1 GB | hard | Avatar / temple image uploads. | supabase.com/dashboard → storage |
| **Render** web service | 750 hr/mo (always-on free) | monthly | API container uptime. Free spins down after 15 min idle. | render.com/dashboard |
| **Render** build minutes | 500/mo | monthly | API deploys. | render.com/dashboard |
| **Cloudflare Workers** (separate from Pages) | 100k req/day | daily | Not currently used; don't enable without budget. | n/a |
| **FCM** push notifications | unlimited | n/a | n/a | n/a |
| **IndexNow** | unlimited | n/a | n/a | n/a |
| **Razorpay test mode** | unlimited | n/a | Test transactions. | razorpay.com |
| **Stripe test mode** | unlimited | n/a | Test transactions. | stripe.com |
| **Sentry** (Developer plan) | 5k errors / 10k transactions / mo | monthly | Errors + perf spans. | sentry.io |
| **DuckDuckGo HTML** (used by SERP agents) | rate-limited soft | per IP | competitor-watch, keyword-rank-tracker. | n/a — back off on 429 |
| **Nitter** mirrors | rate-limited soft | per mirror | x-engagement-digest. | rotate 3 mirrors |

## GitHub Actions per-workflow burn (post 2026-05-28 cuts)

| Workflow | Trigger | Min/run | Runs/mo | Min/mo |
|---|---|---|---|---|
| `ci.yml` | PR + push to main (paths-filtered, no docs) | ~5 | ~80 push estimate | ~400 |
| `e2e.yml` | PR only + Sun weekly + manual | ~15 | ~5 | ~75 |
| `agents-health.yml` | every 12h | ~3 | 60 | 180 |
| `agents-daily.yml` | daily 03:30 UTC (6 critical agents) | ~2 | 30 | 60 |
| `agents-weekly.yml` | Mon 04:00 UTC (20 agents) | ~10 | 4 | 40 |
| `lighthouse-weekly.yml` | Mon 04:00 UTC | ~12 | 4 | 48 |
| `daily-cron.yml` | daily 00:00 UTC | ~0.1 | 30 | 3 |
| `pr-checks.yml` | PR only (paths-filtered) | ~0.5 | ~20 | 10 |
| `sentry-release.yml` | tag only (manual cut) | ~15 | ~2 | 30 |
| `deploy-web.yml` | manual only | ~6 | 0 | 0 |
| **Total estimate** | | | | **~846 min/mo** |

Cap = 2000 min/mo. Headroom ~1150 min/mo for ad-hoc reruns and manual.

## Pre-cut state (2026-05-27, billing failed)

| Workflow | Old min/mo |
|---|---|
| ci.yml (3 jobs × pnpm install × every push) | ~1500 |
| e2e.yml (every push) | ~900 |
| deploy-web.yml (every push) | ~360 |
| agents-health.yml (every 6h) | 360 |
| agents-daily.yml (24 agents) | ~150 |
| sentry-release.yml (every push) | ~900 |
| **Total** | **~4170 min/mo** — exceeded cap by 2×, billing blocked all workflows |

## Rules — read before adding/changing anything

### Workflow rules

1. **No `push:` trigger on a workflow > 5 min/run without paths-filter.** Every PR + every push to main if it must run on push.
2. **`paths-ignore: docs/**, **/*.md, TASKS.md, ROADMAP.md, PROJECT_CONTEXT.md`** on any code workflow. Docs-only commits must not burn minutes.
3. **One consolidated job** wherever possible. Three jobs = three `pnpm install` = three runner spinups.
4. **Crons coarser than the value they produce.** A health check every 6h that no one looks at twice a day = 12h.
5. **Sentry / E2E / Lighthouse: weekly or tag-triggered, never per-push.** Catch regression weekly, not every commit.
6. **`workflow_dispatch` always present** so you can re-run manually without merging.

### Commit batching rules

1. **No 1-commit pushes for code that triggers CI.** Wait until you have ≥ a logical chunk (5-10 changes, one feature, or end of a debug session).
2. **Pure docs changes** (TASKS.md / ROADMAP.md / PROJECT_CONTEXT.md / docs/**, *.md only) MUST append `[skip ci]` to commit subject. CF Pages git-integration runs on every push regardless of paths — `[skip ci]` is the ONLY mechanism that prevents CF build queue entry. Correction 2026-05-30: prior rule said "docs can land alone because they hit no workflows" — that was wrong, CF Pages has no paths-ignore.
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
const MAX_REQ = 50;       // per-run cap
const MIN_GAP_MS = 200;   // between requests
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

| Symptom | Likely cause | Fix |
|---|---|---|
| All workflows red with "recent account payments have failed" | GH Actions cap hit + billing not set | Add payment + spending limit at GH billing settings; cut burn |
| `Cloudflare Pages` check red but GH workflows green | CF 500/mo cap or git integration broken | CF dash; wait for reset or unlink/relink |
| CF deploy summary `Build failed` no details | Bundle > 3 MiB | `docs/cf-worker-budget.md` playbook |
| Resend `quota exceeded` 429 | 100/day or 3000/mo hit | Wait reset; audit who's sending what |
| Supabase API slow / `connection pool exhausted` | Free pooler caps | Reduce concurrent agents; batch reads |
| Render API "spinning up" 30+s | Cold start after idle | Expected on free; add uptime-pinger every 12 min IF needed (costs GH min) |

## Future plans must read this first

Any new initiative — new agent, new integration, new page family, new email type, new mobile feature — first answer: which lines in this doc does it move? If the answer is "I'll exceed X", revise the plan, not the budget.
