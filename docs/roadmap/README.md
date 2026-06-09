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

### Via `_bulk-create.mjs`

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

## Override slash commands

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
10. `owner-pause-global` — `_alerts/PAUSE_ALL` file present

### Per-item tripwires

Item frontmatter `killSwitch:` references condition name. Engine checks before emit; if fires, item moved to `done/` with `killed-by-tripwire-<name>`. Categories can register custom checks in `scripts/roadmap/tripwires/<category>.mjs`.

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
ls -t docs/roadmap/queue/*.md  # oldest first
```

Agent picks `head(queue)` each session, moves to in-progress (frontmatter `status: in-progress`), ships, moves to `done/` with `status: done` + `completedAt`.

Queue depth >50 → tripwire `queue-depth-gt-50` fires → emissions pause until drain.

---

## Soak protocol (Phase 6)

Placeholder. Full content added in Task 3.6.

Soak = N-day burn-in before promoting engine config changes to prod. Run new emission rules in shadow mode, compare against current, only promote if delta within bounds.

---

## Session pickup setup

Placeholder. Full content added in Task 4.2.

Session pickup = SessionStart hook reads `queue/` head, injects item context into Claude's first turn. Agent ships item without owner prompting.

---

## Smoke test protocol

Placeholder. Full content added in Task 4.5.

Smoke = end-to-end test: seed backlog → run engine → verify emission → verify pickup → verify done. Run on every Phase boundary.

---

## Implementation status

Phase 0: Foundation scaffold (Task 0.1 = this README + dir tree).

See plan for full 25-task breakdown.
