---
id: R-Q4-E-004
title: "200K MAU load test — k6 sustained 100K concurrent + p95<400ms + zero 5xx"
category: engineering
owner_role: cto
quarter: Q4
month_target: 12
priority: P0
status: shipped
agent_assignable: true
founder_blocker: null
depends_on: ["R-Q4-E-003"]
blocks: []

kpi:
  metric: "load_test_p95_ms"
  current: 0
  target: 400
  unit: "milliseconds"
  source: "k6"
  query: "TBD-populate-before-orchestrator-go-live"

revenue_impact:
  amount_inr: 0
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 32
est_cost_inr: 0

success_criteria:
  - "Populate during first sub-agent emission cycle"

agent_brief:
  context_files: []
  prompt_skeleton: |
    TBD — populated by first sub-agent cycle.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.

tags: ["scale","load","k6","perf","mau"]
created_at: 2026-06-09T22:09:23.580Z
updated_at: 2026-06-09T22:09:23.580Z
shipped_at: 2026-06-14T00:00:00.000Z
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters

Q4 scale validation. 200K MAU + 100K concurrent peak (Diwali night) must hold p95 < 400ms with zero 5xx, otherwise revenue + brand trust both collapse at the annual peak event.

# What shipped (2026-06-14, R-Q4-E-004-batch)

- `scripts/load-test/diwali-spike.js` — k6 script Scenario B (100K concurrent ramp + sustained 60min peak)
- `scripts/load-test/steady-200k.js` — k6 script Scenario A (50K concurrent steady-state)
- `scripts/load-test/README.md` — run instructions, pre-flight, pass criteria, founder action items
- Spec doc `docs/engineering/200k-load-test-plan.md` already authored 2026-06-13 (Scenario A/B/C, tools, bottleneck mitigation)

# Founder action required (label: founder-action-required)

- Provision k6 Cloud token OR 5 Lightsail nodes (~$25-300)
- Approve staging env temp scale-up (Render plan + Supabase pooler conn raise) for test window
- Schedule first Q4 dry-run end of Oct 2026 (Diwali = Nov 8 2026)
- Run again Nov 1 as final validation
- Apply bottleneck mitigation (Redis cache, Postgres index audit, CF Pages KV, CDN) BEFORE running test

# Reference material

- `docs/engineering/200k-load-test-plan.md` — full plan
- `docs/engineering/50k-load-test-plan.md` — Q3 predecessor (R-Q3-E-006)
- k6 thresholds: p95 < 400ms, http_req_failed < 0.5%
