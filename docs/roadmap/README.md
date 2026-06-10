# Bhaktisetu Autonomous Roadmap Engine (ARE)

Operator guide. Caveman tone. Dense.

Spec: `docs/superpowers/specs/2026-06-10-bhaktisetu-autonomous-roadmap-engine-design.md`
Plan: `docs/superpowers/plans/2026-06-10-bhaktisetu-autonomous-roadmap-engine-plan.md`

---

## Overview

ARE = self-driving roadmap. Engine reads category backlogs, emits work items to FIFO queue, agent fleet picks next item every session, ships it, marks done. Human overrides via slash commands. Tripwires kill bad items auto.

Goal: zero-touch roadmap execution. Owner approves direction, engine drives weekly cadence. 11 categories × 4 quarters = 44 lanes. Each lane = backlog of items. Engine emits N items/week per lane based on cap + budget + tripwire state.

Non-goal: replace human strategy. Owner still picks themes, kills initiatives, sets quarterly OKRs.

---

## Directory layout

```
docs/roadmap/
  README.md              ← you are here
  items/
    Q1/                  ← quarter folders
      engineering/       ← 11 category lanes per quarter
      marketing/
      supply/
      sales/
      finance/
      legal/
      hr/
      cs/
      it/
      geo/
      product/
    Q2/  Q3/  Q4/        ← same 11 subdirs
  queue/                 ← emitted items waiting pickup (FIFO by emittedAt)
  done/                  ← completed items (archive)
  decisions/             ← ADR-style override records
  advisory/              ← non-blocking warnings from agents
  _alerts/               ← tripwire fires (read by Stop hook)
```

Item file = `<slug>.md` with frontmatter (id, category, quarter, estimatedHours, dependsOn, killSwitch, emittedAt, status).

Schema enforced by `scripts/roadmap/_validate.mjs` (Task 0.4 — not yet built).

---

## Adding an item

### Manual

1. Pick lane: `docs/roadmap/items/Q<n>/<category>/`
2. Create `<slug>.md` with frontmatter:
   ```yaml
   ---
   id: ENG-Q2-042
   category: engineering
   quarter: Q2
   estimatedHours: 4
   dependsOn: []
   killSwitch: cf-build-burn-gt-400
   emittedAt: null
   status: backlog
   ---
   ```
3. Body = task description, acceptance criteria, links.
4. Commit. Engine picks up on next cron.

### Via `_bulk-create.mjs` (Phase 1 — not yet built)

_Not yet built — Phase 1._

For batch seeding (e.g., quarterly planning):

```bash
node scripts/roadmap/_bulk-create.mjs --quarter Q2 --category engineering --csv plan.csv
```

CSV columns: `slug,estimatedHours,dependsOn,killSwitch,body`. Script writes one file per row, validates frontmatter, commits batch.

---

## Killing an item

Three ways:

1. **Slash command:** `/roadmap-kill <id>` — moves to `done/` with `status: killed` + reason prompt.
2. **Manual:** edit frontmatter `status: killed`, move file to `done/`.
3. **Tripwire auto-kill:** engine moves item to `done/` with `status: killed-by-tripwire-<name>` when killSwitch condition fires.

Killed items archived, never re-emitted. Decision logged to `decisions/<date>-kill-<id>.md`.

---

## Override slash commands (Phase 4 — not yet built)

_Not yet built — Phase 4._

- `/roadmap-emit <id>` — force emit specific item now, bypass cap
- `/roadmap-kill <id>` — kill item, log decision
- `/roadmap-pause <category>` — freeze lane, no emissions until resumed
- `/roadmap-resume <category>` — unfreeze lane
- `/roadmap-status` — print queue depth, done count, tripwire state
- `/roadmap-reorder <id> <position>` — move queue item up/down
- `/roadmap-snooze <id> <days>` — defer emission N days
- `/roadmap-bump <id>` — promote item priority within lane
- `/roadmap-import <csv>` — bulk add via CSV
- `/roadmap-export` — dump current state as JSON

Full list in `scripts/roadmap/commands/` (Phase 2).

---

## Tripwires

### 10 global tripwires (kill all emissions when fire)

1. `cf-build-burn-gt-400` — Cloudflare Pages builds >400/500 monthly cap
2. `render-cron-burn-gt-450` — Render cron mins >450/500 monthly cap
3. `supabase-egress-gt-4gb` — Supabase egress >4/5 GB monthly cap
4. `fcm-quota-gt-90pct` — FCM push quota >90%
5. `razorpay-failure-rate-gt-5pct` — payment fail rate >5% over 1h window
6. `gh-actions-burn-gt-1800` — GH Actions mins >1800/2000 monthly cap
7. `sentry-error-rate-spike` — error rate >2× 7d baseline
8. `prod-deploy-failure-3x` — 3 consecutive prod deploys fail
9. `queue-depth-gt-50` — emitted-but-not-picked items >50 (backpressure)
10. `owner-pause-global` — `_alerts/PAUSE_ALL` file present _(Phase 3 — not yet built)_. Create: `touch docs/roadmap/_alerts/PAUSE_ALL`. Remove file (or `/roadmap-resume global`) to unfreeze.

### Per-item tripwires

Item frontmatter `killSwitch:` references condition name. Engine checks before emit; if fires, item moved to `done/` with `killed-by-tripwire-<name>`. Categories can register custom checks in `scripts/roadmap/tripwires/<category>.mjs` _(Phase 2-3 — not yet built)_.

Tripwire fires written to `_alerts/<timestamp>-<name>.json`. Stop hook reads + injects warning into next session.

---

## Free-tier budget allocation

| Resource | Cap | Per-lane share | Tripwire |
|---|---|---|---|
| CF Pages builds | 500/mo | 45/lane (11 lanes) | `cf-build-burn-gt-400` |
| Render cron mins | 500/mo | 45/lane | `render-cron-burn-gt-450` |
| Supabase egress | 5 GB/mo | 450 MB/lane | `supabase-egress-gt-4gb` |
| GH Actions mins | 2000/mo | 180/lane | `gh-actions-burn-gt-1800` |
| FCM pushes | unlimited* | n/a | `fcm-quota-gt-90pct` |

*FCM "unlimited" = soft cap, watch quota dashboard.

Engine enforces share at emission time. Lane exceeds → tripwire fires → no more emissions that month.

`[skip ci]` discipline: docs-only commits MUST end commit subject with `[skip ci]` to skip CF Pages build queue. Burns 0 builds. Mandatory.

See `docs/free-tier-budgets.md` for canonical caps.

---

## Where decisions live

`decisions/` = ADR-style override records. Filename: `<YYYY-MM-DD>-<action>-<id>.md`.

Examples:
- `2026-06-10-kill-ENG-Q2-042.md` — why item killed
- `2026-06-12-pause-marketing.md` — why lane paused
- `2026-06-15-emit-override-FIN-Q3-001.md` — why bypassed cap

Format:
```markdown
# Decision: <action> <id>

**Date:** 2026-06-10
**Actor:** owner|tripwire|agent
**Trigger:** <slash-command|tripwire-name|agent-id>

## Context
<why this happened>

## Decision
<what changed>

## Consequences
<expected impact>
```

ADRs never deleted. Audit trail.

---

## How to read the queue

`queue/` = emitted items waiting agent pickup. FIFO by `emittedAt` timestamp in frontmatter.

```bash
# True FIFO head (oldest emittedAt frontmatter first):
grep -l '^status: emitted' docs/roadmap/queue/*.md \
  | xargs grep -H '^emittedAt:' \
  | sort -t: -k3
```

Sort by `emittedAt` field in frontmatter, not file mtime.

Agent picks `head(queue)` each session, moves to in-progress (frontmatter `status: in-progress`), ships, moves to `done/` with `status: done` + `completedAt`.

Queue depth >50 → tripwire `queue-depth-gt-50` fires → emissions pause until drain.

---

## Soak protocol (Phase 3 dry-run → live)

After Phase 3 workflow ships (commit `0e12520`), orchestrator runs every 6h in DRY_RUN mode by default. 7 days minimum before flipping live.

### Day 1-7 — dry-run review

Each cycle:
- Cron fires `17 */6 * * *` UTC = 4 runs/day
- Writes to `docs/roadmap/_dryrun/queue/` + `docs/roadmap/_dryrun/decisions/` (NOT live `queue/` or `decisions/`)
- Decision Agent reasoning logged per cycle in `_dryrun/decisions/C-YYYYMMDDTHHMM.md`
- Founder reviews daily, ~5 min

Daily founder protocol:
1. `git pull` (orchestrator pushes its own commits via `roadmap-orchestrator[bot]`)
2. `ls -tr docs/roadmap/_dryrun/queue/ | tail -8` — last ~2 days of queue files
3. Read 1-2 random files end-to-end
4. Verify:
   - Decision Agent reasoning matches signal context (KPI deltas + tripwire fires)
   - Sub-agent prompts paste-ready (cite real files, include verify commands, follow TDD doctrine)
   - No hallucinated file paths
   - founder-blocked items NOT scheduled for agent
   - Free-tier budget not violated in spawn plan
5. Spot-check 5 KPI values in `_kpi-cache.json` vs independent SQL/PostHog (per-day rotation)
6. Tune `_decision-prompt.mjs` system prompt iteratively if reasoning weak
7. If tripwire false-positive → adjust `_tripwires-global.yml` condition

### Day 7 gate check

After 7 clean cycles (no hallucinations, no false tripwires, no token-budget overruns, KPIs within ±5% of independent check), set:

```bash
gh variable set ROADMAP_DRY_RUN --body false
```

### Day 8 — first live cycle

- Watch first cycle closely (workflow run page)
- Verify queue files land in `docs/roadmap/queue/` (not `_dryrun/queue/`)
- Founder consumes oldest via `/goal` (session-pickup hook from Phase 4)
- If anything looks wrong: `node scripts/agents/roadmap/orchestrator-pause.mjs true` (Phase 4 slash command alias `/roadmap-pause`)

### Day 8-14 — live observation

- Daily 5-min `/admin/roadmap` glance (Phase 5 dashboard)
- Override or kill stale items via slash commands as needed
- Track: queue drain rate (target ≥70% within 7d), verify-pass rate (target ≥85%), tripwire false-pos rate (<10%)

### Day 14 — retro

Write `docs/roadmap/_retros/2026-06-W24.md` (or current ISO week) covering:
- Total queue files emitted vs consumed
- Verify-pass rate
- Tripwire fires + accuracy
- Founder time saved (vs hand-writing prompts)
- Adjustments needed before scaling sub-projects 2-5

### Killswitch reference

Manual halt anytime:
- `touch docs/roadmap/_alerts/PAUSE_ALL` — orchestrator skips next cycle if file present
- OR set repo variable `ROADMAP_DRY_RUN=true` — returns to dry-run mode
- OR disable workflow via `gh workflow disable roadmap-loop.yml`
- OR `node scripts/agents/roadmap/orchestrator-pause.mjs true` (Phase 4)

### Blackbox proxy 403 protocol

If T-005 fires (proxy rejects Opus 4.7):
1. Workflow halts, writes `_alerts/tripwire-T-005-*.md`
2. Founder decides:
   - Upgrade Vercel AI Gateway paid tier (preferred — keeps Opus 4.7)
   - OR explicitly approve fallback model (manual code change to `_anthropic-client.mjs`)
3. Reset `lastAnthropicError` in `_budget-snapshot.json` to resume

---

## Session pickup setup (Windows founder workstation)

Add to `C:\Users\DELL\.claude\settings.json` under `hooks`:

```jsonc
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "matcher": "^/goal\\s*$",
        "command": "powershell -ExecutionPolicy Bypass -File E:\\NewClaude\\bhaktisetu\\scripts\\agents\\roadmap\\queue-pop.ps1"
      }
    ]
  }
}
```

When founder types bare `/goal` (no args), `queue-pop.ps1` runs:
1. Reads `docs/roadmap/queue/` oldest unconsumed .md by filename (which encodes cycle ts)
2. Echoes body to stdout → injected as context into next Claude prompt
3. Marks `consumedAt + consumedBy + consumedInSessionId` in-place

Founder then sees the queue prompt, executes work, commits with `Closes: Q-<queueId>` trailer in commit body. Finalize workflow (Phase 4.3) moves file to `done/` once verified.

### Manual cherry-pick

If founder wants a specific item not the oldest:
- `/goal-from-roadmap <queueId|itemId|next|next-cmo>` (Phase 4.4 slash command)

### Skip + view

- `/roadmap-list` — view top 10 queue items, don't consume (Phase 4.4)

---

## Smoke test protocol

Placeholder. Full content added in Task 4.5.

Smoke = end-to-end test: seed backlog → run engine → verify emission → verify pickup → verify done. Run on every Phase boundary.

---

## Implementation status

Phase 0: Foundation scaffold (Task 0.1 = this README + dir tree).

See plan for full 25-task breakdown.
