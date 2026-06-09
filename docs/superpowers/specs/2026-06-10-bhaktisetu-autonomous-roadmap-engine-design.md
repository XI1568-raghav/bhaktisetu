# Bhaktisetu Autonomous Roadmap Engine (ARE) — Design Spec

> Status: Draft for review · 2026-06-10 · Owner: founder
> Scope: Sub-project 1 of 5 (foundation layer). Sub-projects 2-5 get own specs after ARE soak.
> Decomposition: ARE = engine; Sub-project 2 = CXO advisory layer; Sub-project 3 = Year-1 content (folded into ARE Phase 1); Sub-project 4 = Supply onboarding agent fleet v2; Sub-project 5 = Closed-loop KPI feedback.

## 1. Goal

Build self-running planning + execution loop for Bhaktisetu (Darshya). Cron-driven Orchestrator + dynamic Opus-4.7 sub-agents read live KPIs + structured year-1 roadmap → emit ready-to-paste Claude Code prompts every 6h → founder/Claude consumes from queue → ships work to prod → KPIs update → loop closes. Zero recurring USD cost (free tier). Target year-1 outcome: ₹9 Cr ARR base case (₹25 Cr stretch), profitable by M8, India 1→25 cities + NRI US/UK/CA/AU.

## 2. Non-goals

- Real-time multi-agent coordination (cron polling sufficient)
- Per-cycle paid LLM spend > $0 (Blackbox proxy free tier mandatory; halt + alert if blocked)
- Replace founder judgment (Decision Agent emits prompts; founder/Claude executes; founder owns kill/override)
- Solve activation-gates (U1-U18 — founder-only actions remain founder-only)
- Manage non-Bhaktisetu projects

## 3. Storage architecture

### Source-of-truth: git-tracked YAML+MD in repo

```
docs/roadmap/
├── items/{quarter}/{category}/{NNN-slug}.md     long-lived items (mutable status)
├── queue/{ts}-{role}-{itemId}-{slug}.md         emitted prompts (FIFO)
├── done/{YYYY-MM}/...                           consumed + verified prompts (audit)
├── decisions/{YYYY-MM}/{ts}.md                  Decision Agent reasoning trace per cycle
├── advisory/{YYYY-WW}/{role}.md                 CXO sub-agent weekly notes (post-Sub-project-2)
├── _alerts/{ts}-{type}-{ref}.md                 tripwire fires, verify failures, model rejects
├── _index.json                                  auto-regenerated compact items array
├── _kpi-cache.json                              last-known KPI values + ttl
├── _sector-summaries.json                       compressed dept docs for Decision Agent
├── _manual-kpis.yml                             founder-updated KPIs no auto-source
├── _tripwires-global.yml                        10 global tripwire conditions
├── _budget-snapshot.json                        free-tier usage running totals
└── README.md                                    operator guide
```

Rationale: $0 storage cost, audit trail in git log, diffable, no DB cap consumed, Decision Agent commits via GH Actions w/ `[skip ci]` (no CF burn).

## 4. Roadmap item schema

Each item = YAML frontmatter + MD body. All frontmatter fields required unless `# optional`.

```yaml
---
id: R-Q1-S-001                         # stable: R=roadmap, Q=quarter, [letter]=category, NNN=seq
title: Onboard 50 verified pandits in Varanasi
category: supply                       # engineering|marketing|supply|sales|finance|legal|hr|cs|it|geo|product
owner_role: cmo                        # cto|cfo|cmo|cpo|sales|talent|cs|legal|it|hr|founder
quarter: Q1                            # Q1|Q2|Q3|Q4 (year-1); Y2-Q1 etc for year-2
month_target: 2                        # 1-12
priority: P0                           # P0=blocker | P1=critical | P2=important | P3=nice
status: planned                        # planned|in_progress|blocked|shipped|verified|killed
agent_assignable: true                 # false = needs founder hands
founder_blocker: null                  # null OR Uxx (U1 Razorpay KYC, etc)
depends_on: [R-Q1-E-003]               # item IDs that must ship first
blocks: [R-Q1-S-002]                   # items waiting on this

kpi:
  metric: verified_pandits_count_varanasi
  current: 8                           # auto-updated by scraper
  target: 50
  unit: count                          # count|inr|usd|pct|hours|users
  source: supabase                     # supabase|posthog|gh_repo|cf_analytics|render_logs|manual
  query: 'SELECT COUNT(*) FROM "Priest" WHERE aadhaar_verified=true AND city=''Varanasi'''

revenue_impact:
  amount_inr: 75000
  confidence: medium                   # low|medium|high
  basis: "50 pandits × 3 pujas/mo × ₹1500 × 30% commission"

geo:                                   # optional
  scope: city                          # city|state|country|region
  values: [Varanasi]

est_hours: 40
est_cost_inr: 0

tripwire:                              # optional, per-item kill rule
  - condition: "verified_pandits_count_varanasi < 15 by 2026-08-01"
    action: pivot_to_remote_onboarding

success_criteria:                      # measurable + agent-verifiable
  - "Supabase: SELECT COUNT(*) ≥ 50 verified Varanasi pandits"
  - "≥ 30 of those completed ≥ 1 paid puja in last 30d"
  - "Churn (no puja in 45d) < 20%"

agent_brief:
  context_files:
    - docs/company/02-cmo.md
    - docs/company/05-sales.md
    - apps/api/src/routes/priest-onboarding.ts
  prompt_skeleton: |
    Sector CMO + Sales. Pandit-onboarding sprint Varanasi.
    Read CMO §1 + Sales §1 Tactic A. Generate 5 outreach drafts.
    Verify via SQL above.

handoff_notes: |                       # living memory, agents + founder append
  2026-06-10: created from year-1 import.

tags: [varanasi, pandit, supply, year-1]
created_at: 2026-06-10T19:00:00Z
updated_at: 2026-06-10T19:00:00Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Body (human-readable)
## Why this matters
## Reference material
## Already shipped
## Risks
```

Index file (`_index.json`) = compact array of frontmatter (drop body + prompt_skeleton). Regenerated on every item add/edit via pre-commit hook. Orchestrator loads single 50-200KB JSON, not 283 files.

### Year-1 item count target

| Category | Count | Notes |
|---|---|---|
| engineering | 60 | Q1 fix mocks/auth; Q2 perf+features; Q3 scale; Q4 i18n + intl |
| marketing | 50 | SEO clusters, social cadence, PR pitches, ad experiments |
| supply | 40 | City × role onboarding sprints |
| sales | 20 | Temple chain LOIs, B2B pilot, NRI diaspora orgs |
| finance | 15 | Revenue dash, unit econ, FF/pre-seed/seed milestones |
| legal | 10 | Incorp, DPDP, contracts, refund-policy lawyer review |
| hr | 8 | First hire trigger + contractor JDs |
| cs | 15 | Macros, NPS, churn analysis, WA support |
| it | 10 | Observability, DR, free-tier discipline |
| geo | 30 | India 5→25 cities + US/UK/CA/AU NRI launch |
| product | 25 | CEO roadmap Q3-Q4 themes (AI Pandit, voice, gaushala adopt, etc) |
| **Total** | **~283** | Year-1 backlog |

### Year-1 target ladder

| Month | MAU | Paying | MRR | Pandits | Temples | Cities | Geos | NRI mix |
|---|---|---|---|---|---|---|---|---|
| M1 | 500 | 10 | ₹15K | 20 | 10 | 1 | India | 0% |
| M3 | 5K | 100 | ₹1.5L | 50 | 25 | 3 | India | 15% |
| M6 | 25K | 1K | ₹10L | 150 | 75 | 5 | +US soft | 25% |
| M9 | 75K | 5K | ₹35L | 300 | 200 | 12 | +UK +CA | 35% |
| M12 | 200K | 15K | ₹75L | 600 | 400 | 25 | +AU | 40% |

M12 exit = ₹9 Cr ARR run-rate. Break-even ~M8 at ₹15L MRR vs ~₹0 fixed cost.

## 5. Orchestrator + cron

`.github/workflows/roadmap-loop.yml`:

```yaml
name: Roadmap Orchestrator
on:
  schedule: [{ cron: '17 */6 * * *' }]   # 00:17, 06:17, 12:17, 18:17 UTC
  workflow_dispatch:
permissions:
  contents: write
jobs:
  orchestrate:
    runs-on: ubuntu-latest
    timeout-minutes: 8
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 50 }
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: corepack enable && pnpm install --frozen-lockfile --filter=!@poojly/web --filter=!@poojly/api --prefer-offline
      - run: node scripts/agents/roadmap-orchestrator.mjs
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY_BLACKBOX_PROXY }}
          ANTHROPIC_BASE_URL: ${{ secrets.ANTHROPIC_BASE_URL }}
          ANTHROPIC_MODEL: claude-opus-4-7
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          POSTHOG_PERSONAL_API_KEY: ${{ secrets.POSTHOG_PERSONAL_API_KEY }}
          RENDER_API_KEY: ${{ secrets.RENDER_API_KEY }}
          CF_ANALYTICS_TOKEN: ${{ secrets.CF_ANALYTICS_TOKEN }}
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      - name: Commit
        run: |
          git config user.name "roadmap-orchestrator[bot]"
          git config user.email "actions@users.noreply.github.com"
          git add docs/roadmap/
          git diff --cached --quiet || git commit -m "roadmap: orchestrator cycle $(date -u +%Y%m%d-%H%M) [skip ci]"
          git push
```

Cadence rationale: 4 cycles/day × 5 min/cycle = 600 GH min/mo. Cron minute `17` chosen off-peak vs other agent fleet (avoids GH queue contention). `[skip ci]` mandatory (touches no apps/web).

### Orchestrator flow (`scripts/agents/roadmap-orchestrator.mjs`)

```
1. INGEST (deterministic, ~30s)
   - load docs/roadmap/_index.json
   - load docs/roadmap/queue/*.md (filter age < 48h)
   - load docs/roadmap/decisions/last-cycle.md
   - kpi-scraper run (§7)
   - tripwire-eval run (§8)
   - emit signal-context.json (~12-18k tokens)

2. SPAWN DECISION AGENT (Opus 4.7, 1 call, ~60-90s)
   - system prompt = master orchestrator role (compiled, ~2k tok)
   - user prompt = signal-context
   - tools: spawn_subagent, write_decision_note, defer_to_founder, kill_item
   - max_tokens 8000, temperature 0.3
   - retry 3× exponential backoff (2s/8s/30s) on 5xx/429/timeout
   - on persistent 403 (model rejection): T-005 fires → halt workflow

3. SPAWN SUB-AGENTS IN PARALLEL (Opus 4.7, N calls, ~60s wall)
   - Promise.allSettled, max concurrency 5
   - each sub-agent: role context + 1-3 items + ship contract
   - returns queue/{filename}.md + estimated effort + deps
   - partial results persisted

4. WRITE OUTPUTS
   - docs/roadmap/queue/*.md (one per sub-agent)
   - docs/roadmap/decisions/{ts}.md (reasoning trace)
   - update _index.json (touched item statuses)
   - update item handoff_notes if Decision Agent flagged

5. FAIL-SAFE
   - 403 free-tier reject → _alerts/ + exit 1 (no silent model swap)
   - KPI source fail → continue w/ stale value + stale=true tag
   - never silently swap model
```

### Decision Agent system prompt (compiled once)

Defines role, hierarchy (12 sub-agent types: cto/cfo/cmo/cpo/sales/talent/cs/legal/it/hr/researcher/geo-agent), sources of truth, 9 decision principles (founder-blocker respect, free-tier discipline, revenue/hour ranking, tripwire handling, DAG respect, role diversity, India/NRI mix, geo sequencing, reason-aloud), output format (tool calls).

### Sub-agent contract

Each sub-agent receives role + items + briefing. Composes ONE Claude Code prompt per item. Self-contained, cites files + line numbers, specifies TDD, lists success_criteria verbatim, includes verify commands, estimates cost. Outputs to `docs/roadmap/queue/{ts}-{role}-{itemId}-{slug}.md` with mandatory frontmatter.

## 6. Queue file format

```yaml
---
queueId: Q-2026-06-10T1817-cmo-001
itemId: R-Q1-S-001
itemTitle: Onboard 50 verified pandits in Varanasi
role: cmo
emittedAt: 2026-06-10T18:17:00Z
emittedBy: cmo-agent (Opus 4.7)
cycleId: C-2026-06-10T1817
priority: P0
consumedAt: null
consumedBy: null
consumedInSessionId: null
shippedCommits: []
verifiedAt: null
estTokens: 45000
estMinutes: 90
estCfBuilds: 1
estGhMinutes: 0
blocksDeploy: false
founderActionRequired: null              # OR { type, count, template }
dependsOnQueue: []
spawnPlanContext:
  reasoning: "..."
  kpiDelta: "..."
  tripwireTouches: []
verifyContract:
  successCriteria: [...]
  curlChecks: [...]
  sqlChecks: [...]
  testCommand: null
finalizationActions:
  - move_self_to_done
  - update_item_kpi
  - update_item_handoff_notes
  - if all success_criteria met: set item.status = in_progress
---

# Claude Code prompt (paste-ready)
## Context
## Background to read first (in order)
## Task
## Verify (mandatory per superpowers:verification-before-completion)
## Tools / skills
## Free-tier discipline
## Estimated effort
## On completion
```

## 7. KPI scraper (`scripts/agents/_kpi-scraper.mjs`)

Deterministic, no LLM. Parallel fan-out across 6 sources via `Promise.allSettled`. Hard 30s timeout per source. Graceful degrade with `stale:true` flag on failure.

### Per-source contracts

| Source | Auth | Cache TTL | Notes |
|---|---|---|---|
| supabase | service-role key OR read-only role pwd | 1h | SELECT-only regex pre-check; per-query 5s timeout; PG `prepare` parameterized |
| posthog | personal API key | 1h | Insight ID per KPI (created once in PostHog UI); doesn't count toward 1M event quota |
| render | API key | 6h | `/v1/services/{id}/deploys` + `/metrics/cpu` |
| cf_analytics | scoped API token (Account Analytics:Read) | 24h | GraphQL `httpRequests1dGroups` |
| gh_repo | `GITHUB_TOKEN` action-scoped | 1h | `gh api repos/.../commits|issues` |
| manual | none | per cycle | Reads `_manual-kpis.yml` (founder updates by hand) |

### Cache layer

`docs/roadmap/_kpi-cache.json`:

```jsonc
{
  "lastFullRefresh": "2026-06-10T18:17:03Z",
  "entries": {
    "supabase:verified_pandits_count:Varanasi": {
      "value": 31, "fetchedAt": "2026-06-10T18:17:01Z", "ttlSec": 3600
    }
  }
}
```

Git-tracked for audit + replay.

### signal-context.json schema

(Full schema in §4 of brainstorming transcript — abbreviated here)

```jsonc
{
  "cycle": { ts, previousTs, intervalHours, missedCycles },
  "budget": { ghMinutesMonth, cfBuildsMonth, resendDay, supabaseDbMb, renderHoursMonth, anthropicTokensMonth },
  "kpis": { ...one entry per items[].kpi.metric (deduped) },
  "items": { totalCount, byStatus, byCategory, byPriority, byOwnerRole, tripwireHits, readyToShip, founderBlocked, inProgressStale },
  "queue": { depth, oldestAgeHours, byRole, drainRate24h },
  "verticals": { supply, geo, revenue, marketing, engineering, cs },
  "sectorDocs": { cto: "...500 tok...", cfo, cmo, cpo, sales, talent, cs, legal, it, hr },
  "founderState": { lastSeenCommit, lastSeenAt, hoursIdle, openDecisions },
  "external": { competitorReleases, lastAnthropicError }
}
```

Compression: ~12-18k tokens via YAML + drop verbose MD bodies + pre-compiled sector summaries.

## 8. Tripwire engine (`scripts/agents/_tripwire-eval.mjs`)

Two flavors:

### Global (`docs/roadmap/_tripwires-global.yml`)

```yaml
tripwires:
  - id: T-001
    name: NRI Day-30 retention low
    condition: "kpis.nriD30Retention < 25 && cycle.ts > '2026-08-01'"
    action: spawn_subagent
    spawnRole: cpo
    spawnBrief: "Tripwire T-001 fired. Fold to NRI-only SKU per steelman."

  - id: T-002
    name: Sri Mandir USD launch
    condition: "external.competitorReleases.some(r => r.competitor==='Sri Mandir' && /USD/.test(r.release))"
    action: defer_to_founder
    deferMessage: "URGENT: Execute NRI pivot now or lose ground."

  - id: T-003
    name: GH minutes budget overrun
    condition: "budget.ghMinutesMonth.pct > 80 && dayOfMonth < 25"
    action: throttle
    throttleConfig: { cronCadenceHours: 12, skipSpawn: true }

  - id: T-004
    name: CF builds budget overrun
    condition: "budget.cfBuildsMonth.pct > 60 && dayOfMonth < 20"
    action: defer_to_founder

  - id: T-005
    name: Anthropic proxy blocked
    condition: "external.lastAnthropicError && /Free tier|forbidden|403/.test(external.lastAnthropicError)"
    action: kill_workflow
    killMessage: "Halt — founder must upgrade OR approve model change."

  - id: T-006
    name: Render free-tier saturated
    condition: "budget.renderHoursMonth.pct > 95"
    action: defer_to_founder

  - id: T-007
    name: Engineering velocity flatline
    condition: "verticals.engineering.commits7d < 3 && verticals.engineering.openP0Bugs === 0"
    action: spawn_subagent
    spawnRole: cto

  - id: T-008
    name: Roadmap drained
    condition: "items.byStatus.planned < 30"
    action: spawn_subagent
    spawnRole: cpo
    spawnBrief: "Generate 50 new items from CEO roadmap Q3/Q4 themes."

  - id: T-009
    name: Single role over-spawned
    condition: "queue.byRole.maxValue / queue.depth > 0.6 && queue.depth >= 5"
    action: rebalance

  - id: T-010
    name: Queue stale
    condition: "queue.oldestAgeHours > 72"
    action: defer_to_founder
```

### Per-item (in item frontmatter)

```yaml
tripwire:
  - condition: "verified_pandits_count_varanasi < 15 by 2026-08-01"
    action: pivot_to_remote_onboarding
```

### Evaluator

Sandboxed JS context (`new Function` with frozen `ctx`, no `require/process/eval`). Returns `firedTripwires[]` injected into signal-context. Decision Agent treats fires as MUST-HANDLE.

## 9. Session pickup

### Path A — implicit auto-inject

Founder types `/goal` (empty). `.claude/settings.json` UserPromptSubmit hook runs `roadmap-queue-pop.ps1`. Script picks oldest unconsumed queue by `emittedAt`. Outputs body as injected context. Marks `consumedAt` + `consumedBy` + `consumedInSessionId`. Does NOT move to `done/` (only after commit with `Closes:` trailer).

### Path B — explicit cherry-pick

`/goal-from-roadmap <itemId|queueId|next|next-cmo>` slash command. Reads queue, injects matching file.

### Path C — view-only

`/roadmap-list` — top 10 queue items + titles + estTokens + estMinutes. No injection, no state change.

### Finalization

- Commit message MUST include a trailer of the form `Closes: Q-<queueId>` on its own line in the commit body (git-trailer convention). Multiple `Closes:` trailers allowed for multi-item commits.
- Example:
  ```
  feat(agents): pandit outreach batch — Varanasi 5 leads

  Generated 5 personalized WhatsApp drafts per Sales §1 Tactic A.

  Closes: Q-2026-06-10T1817-cmo-001
  ```
- `.github/workflows/roadmap-finalize.yml` (push-triggered, paths-filter `docs/roadmap/queue/`):
  - Parse `Closes:` trailers
  - For each matched queue file: run verifyContract; pass → move to `done/{YYYY-MM}/`, update item KPI, append handoff timestamp + commit SHA
  - Fail → write `_alerts/{ts}-verify-failed-{queueId}.md`, leave queue file in place
- 7d post-consume without Closes trailer → T-010 fires

## 10. `/admin/roadmap` dashboard

`apps/web/app/admin/roadmap/page.tsx` — Next.js edge runtime, admin role-gated.

6 panels:

1. **Burn-down chart** — items shipped vs M1-M12 target
2. **Live KPI grid** — 60s auto-refresh, hits `_kpi-cache.json`
3. **Queue** — depth, oldest age, by role, per-row actions (mark consumed | re-emit | kill)
4. **Tripwires** — fired (red) + clear (green)
5. **Items board** — filters (status/priority/owner/quarter/category/geo/tag), sort by revenue_impact_per_hour desc, row → item detail w/ MD body + handoff timeline + KPI sparkline
6. **Decision history** — last 20 cycle reasoning traces

API: `GET /api/v1/admin/roadmap` — admin-gated, edge runtime, 60s cache. Reads git-tracked files (no DB). Returns `{ items, queue, decisions[20], kpis, tripwires }`.

Mobile-responsive (matches existing `/admin/agents` pattern).

## 11. Override + manual control

Slash commands (`.claude/commands/`):

- `/roadmap-add` — interactive new item wizard
- `/roadmap-kill <itemId> <reason>` — status=killed, kills downstream blocked, logs `_alerts`
- `/roadmap-status <itemId> <status>` — manual transition w/ optional commit SHA
- `/roadmap-emit <itemId>` — bypass Decision Agent, immediately queue prompt
- `/roadmap-pause` — sets `_orchestrator-paused: true` in `_budget-snapshot.json`; cron exits cleanly
- `/roadmap-resume` — clears pause flag

## 12. Phased rollout

| Phase | What | Sessions | Wall | CF builds | GH min |
|---|---|---|---|---|---|
| 0 | Scaffold dirs + README + tripwires yml + manual KPIs + 3 sample items | 1 | 4h | 0 | 0 |
| 1 | Year-1 content (~283 items) drafted from existing docs, founder reviews in batches of 50 | 3-4 | 16h | 0 | 0 |
| 2 | KPI scraper + tripwire engine + anthropic client + index builder + vitest | 1-2 | 8h | 0 | 0 |
| 3 | Orchestrator + Decision Agent + sub-agent runner + workflow yml + 7-day dry-run | 2 | 10h | 0 | ~30 (dry-run) |
| 4 | Session pickup PS1 + finalize workflow + 3 slash commands + settings.json hook | 1 | 4h | 0 | 0 |
| 5 | Admin dashboard + api endpoint | 1 | 6h | 1 | 0 |
| 6 | 14d soak — observe + tune Decision Agent prompt + calibrate tripwires | ongoing | 14d (first soak) | ~7 (first month) | ~600 (first month) |
| **Total to live** | | **9-11** | **~50h build + 14d soak** | **~8 first month** | **~630 first month** |

## 13. Steady-state budget allocation

| Resource | Allocated | Cap | Headroom |
|---|---|---|---|
| GH Actions min/mo | ARE alone: ~1496 (846 existing + 600 orchestrator + 50 finalize + buffer). Full system w/ Sub-project 2 CXO weekly added later: ~1896 | 2000 | 25% (ARE alone); 5% (full) |
| CF Pages builds/mo | ~32 (30 apps/web + 2 dashboard) | 500 | 94% |
| Render hours/mo | unchanged | 750 | unchanged |
| Supabase | +<1MB/mo (KPI cache) | 500MB | 99%+ |
| Resend | +0 | 100/d | unchanged |
| Anthropic via Blackbox | ~10M tok/mo (free proxy) | n/a | hard risk on 403 → T-005 |

## 14. Risk matrix

| Risk | Lkl | Imp | Mitigation |
|---|---|---|---|
| Blackbox proxy blocks Opus 4.7 | Med (precedent HANDOFF #10) | HIGH | T-005 halts + alerts; founder approves model swap or upgrades |
| Decision Agent emits low-quality prompts | High (P0-2) | Med | 7d DRY_RUN; daily founder review; tune prompt; `/roadmap-pause` |
| KPI scraper hammers Supabase | Low | Med | 1h cache + SELECT-only + read-only role |
| Sub-agent writes broken YAML | Med | Low | yaml.parse fail = drop file; informed next cycle |
| Git push race w/ other agents | Med | Low | Pull --rebase retry; on 2nd fail → file GH issue |
| Founder absent 7+ days | Med | Low | T-010 alerts; throttle to daily cadence after 3d idle |
| Items drift from reality | High | High | Weekly retro reviews 5 random KPI values; `_manual-kpis.yml` escape hatch |
| One role over-spawned | Med | Med | T-009 enforces diversity; sys prompt mandates CTO+CMO+Sales+CS min |
| Founder bypasses queue | High | Low | Allowed; T-010 surfaces neglect |
| Roadmap stale month 3 | Certain | Med | Quarterly refresh sprint (Sub-project planned post-ARE) |
| ARE ships but Sub-project 2-5 never do | Med | High | Each Sub-project has own spec ready post-ARE soak |
| Year-1 ₹9 Cr ARR too aggressive | High | Low | Tripwires force pivot; targets reactive not fixed |
| Supply onboarding can't scale solo | High | High | Sub-project 4 addresses; first hire trigger (Decision #4) accelerates |

## 15. Open questions for founder

(Pre-emptive answers proposed in parens — reply with deltas only.)

1. **Content authorship**: I draft 283 from existing docs, founder reviews in batches of ~50. *(Default: yes)*
2. **Year-1 revenue target**: ₹9 Cr base / ₹25 Cr stretch — both as tripwire conditions not fixed. *(Default: yes)*
3. **Geo sequence**: India BLR→VNS→MUM→DEL→PUN→HYD→CHN (1/mo), then NRI US M7, UK M9, CA M10, AU M11. *(Default: ship; Decision Agent reshuffles per traction)*
4. **CXO advisory layer (Sub-project 2)**: 30d soak post-ARE before adding. *(Default: yes)*
5. **Dashboard auth**: existing admin role. *(Default: yes)*
6. **Slack/Discord notify**: skip for v1. *(Default: yes)*
7. **Killswitch on Blackbox 403**: pause + alert ALWAYS, never silent swap. *(Default: locked per user directive)*
8. **New-item rate limit per cycle**: max 3. *(Default: yes)*

## 16. Out of scope (deferred to sub-projects)

- Per-sector CXO weekly advisory (Sub-project 2, post 30d soak)
- Year-2+ content (refresh sprint Q4 2026)
- Supply onboarding agent fleet v2 (Sub-project 4)
- Closed-loop KPI feedback / A/B orchestration (Sub-project 5)
- Investor pipeline CRM (extension of Sub-project 2 CFO agent)
- International legal/tax (US LLC, UK Ltd — founder-only)

## 17. Success criteria for ARE

| Criterion | Target | How measured |
|---|---|---|
| Cron uptime | ≥ 95% (29/30 cycles per week) | GH Actions workflow runs page |
| Queue drain rate | ≥ 70% of emitted prompts consumed within 7d | Finalize workflow logs |
| Verify-pass rate | ≥ 85% of consumed prompts pass verifyContract | `_alerts/verify-failed-*` count |
| KPI scraper accuracy | ≥ 90% of values within 5% of independent spot-check | Weekly manual audit |
| Tripwire false-positive rate | < 10% (founder marks "wrong tripwire") | Manual review |
| Founder time saved | ≥ 5h/week (vs hand-writing prompts + reviewing roadmap) | Founder self-report after 30d |
| Free-tier compliance | 0 months exceeding any cap | Monthly budget snapshot |
| Year-1 revenue ladder hit rate | ≥ 70% of monthly targets met or exceeded | KPI dashboard |

## 18. Mapping to user goal

| User ask | ARE solution |
|---|---|
| Auto-planned prompts for every roadmap step | Decision Agent + sub-agents emit every 6h |
| Structured roadmap format | §4 YAML schema, every item KPI-bound |
| Plan tied to darshya website | `kpi.source` = Supabase/PostHog/CF/Render live |
| For-loop on actual time | GH cron `*/6h`, 1900 GH min/mo budget |
| Cloud sees next prompt + auto-pushes | Orchestrator commits queue; session pickup hook |
| Marketing + actionables | category=marketing, owner=cmo, KPI-bound traffic + funnel |
| End-to-end company on boards + agents | 12 sub-agent roles cover all CXO + research |
| Onboard pandits + boards + all roles | category=supply items, city-by-city sprints |
| Per-sector CTO/CFO/HR agents | Sub-agents spawn role-specialized from cycle 1; Sub-project 2 adds weekly advisory |
| Without spending money | Free-tier discipline + budget tracker + tripwires |
| Run company from zero → revenue → profitable in year | KPI ladder M1→M12; tripwires force pivot on miss |
| Cities → states → India → international | Geo schema + sequencing; NRI launch M7+ |
| Very high revenue numbers | Revenue-impact ranking; ₹9 Cr base / ₹25 Cr stretch |

---

*Spec ready for founder review. On approval → invoke `superpowers:writing-plans` for implementation plan.*
