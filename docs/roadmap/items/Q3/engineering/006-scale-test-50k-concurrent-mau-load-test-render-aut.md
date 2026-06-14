---
id: R-Q3-E-006
title: "Scale test — 50K concurrent MAU load test + Render auto-scale verified"
category: engineering
owner_role: cto
quarter: Q3
month_target: 9
priority: P0
status: in_progress
agent_assignable: true
founder_blocker: "Run full PROFILE=full k6 against paid Render copy — see docs/engineering/R-Q3-E-006-handoff.md"
depends_on: ["R-Q2-E-013"]
blocks: []

kpi:
  metric: "scale_test_max_concurrent"
  current: 0
  target: 50000
  unit: "users"
  source: "k6"
  query: "jq -r .scale_test_max_concurrent docs/agent-reports/scale-test-latest.json"

revenue_impact:
  amount_inr: 0
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 32
est_cost_inr: 0

success_criteria:
  - "k6 script scripts/load-tests/50k-concurrent-mau.k6.js exists with smoke/midscale/full profiles"
  - "Full profile (PROFILE=full) runs end-to-end against staging API and writes docs/agent-reports/scale-test-latest.json"
  - "scale_test_max_concurrent >= 50000 in that JSON"
  - "Render dashboard shows auto-scale instance count > 1 during peak window"
  - "p95 latency < 1500ms and error rate < 1% across the 15m hold stage"

agent_brief:
  context_files:
    - scripts/load-tests/50k-concurrent-mau.k6.js
    - scripts/load-tests/README.md
    - docs/engineering/R-Q3-E-006-handoff.md
  prompt_skeleton: |
    Engineering scaffold shipped 2026-06-14 (PR engineering/R-Q3-E-006-batch-2026-06-14).
    Remaining work is operational — see docs/engineering/R-Q3-E-006-handoff.md
    "Founder action items" section. After founder runs PROFILE=full and pastes
    the resulting scale_test_max_concurrent into kpi.current, flip status to
    "shipped" and set shipped_at.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.
  2026-06-14: k6 scaffold shipped with smoke/midscale/full profiles.
    Full 50K run is founder-gated on paid Render plan to avoid blowing
    free-tier egress + Supabase connection cap. See handoff doc.

tags: ["scale","load","k6","perf"]
created_at: 2026-06-09T22:02:48.000Z
updated_at: 2026-06-14T00:00:00.000Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Year-1 Darshya plan projects 50K MAU by end of Q3. We need empirical
confidence that the Render-hosted Fastify API + Supabase Postgres can
absorb that load with auto-scale rather than serial 5xx during peak
festival traffic (Diwali, Janmashtami, Maha Shivratri). A documented
scale ceiling also informs tripwires (when do we need a paid Render
tier upgrade?) and the per-puja capacity model.

# Reference material
- `scripts/load-tests/50k-concurrent-mau.k6.js` — k6 script (smoke / midscale / full profiles)
- `scripts/load-tests/README.md` — invocation cheatsheet
- `docs/engineering/R-Q3-E-006-handoff.md` — founder action items for the full run
