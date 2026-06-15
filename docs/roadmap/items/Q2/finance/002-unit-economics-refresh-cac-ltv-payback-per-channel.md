---
id: R-Q2-F-002
title: "Unit economics refresh — CAC + LTV + payback per channel (NRI/domestic)"
category: finance
owner_role: cfo
quarter: Q2
month_target: 5
priority: P1
status: in_progress
agent_assignable: true
founder_blocker: null
depends_on: []
blocks: []

kpi:
  metric: "unit_econ_dashboard_live"
  current: 0
  target: 1
  unit: "count"
  source: "manual"
  query: "ls docs/agent-reports/unit-econ/ | grep -c unit-econ-refresh.json"

revenue_impact:
  amount_inr: 0
  confidence: medium
  basis: "Indirect: enables intelligent Q4 paid-spend allocation; breach detection prevents wasted spend on unprofitable channels (NRI CAC > $40 tripwire)."

est_hours: 12
est_cost_inr: 0

success_criteria:
  - "Per-channel CAC/LTV/payback baseline JSON shipped"
  - "Refresh script env-or-noop pattern with tripwire engine"
  - "Founder handoff doc covers KPI promotion path"
  - "Snapshot writer dry-run produces valid blended JSON"

agent_brief:
  context_files:
    - docs/finance/unit-econ-refresh-channel-spec.md
    - docs/finance/unit-econ-channel-data.json
    - docs/finance/R-Q2-F-002-handoff.md
    - scripts/finance/unit-econ-refresh.mjs
  prompt_skeleton: |
    Refresh per-channel CAC/LTV/payback. Inputs: PostHog cohort attribution + Supabase referral ledger.
    Output: timestamped snapshot under docs/agent-reports/unit-econ/. Flag breach if NRI CAC > $40 OR domestic payback > 3mo.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.
  2026-06-15 (R4): shipped per-channel baseline JSON + refresh script (env-or-noop) + tripwire engine + founder handoff doc.
    Status stays in_progress because KPI unit_econ_dashboard_live requires PostHog env populated + first non-stale snapshot.
    Founder action: ~50 min wall (env paste + utm tagging + PostHog query block + first refresh).
    See docs/finance/R-Q2-F-002-handoff.md for sequential action list.

tags: ["finance","unit-econ","cac","ltv"]
created_at: 2026-06-09T21:56:41.463Z
updated_at: 2026-06-15T00:00:00.000Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters

Founder needs intelligent allocation for Q4 paid-spend budget. Without per-channel CAC/LTV/payback discipline we either (a) overspend on channels that look cheap but churn or (b) underspend on channels that compound. Two ROADMAP.md tripwires are wired directly to this metric: blended NRI CAC > $40 OR blended domestic payback > 3 mo for 2 consecutive weeks → fold to NRI-only SKU.

# What shipped (R4 — 2026-06-15)

- `docs/finance/unit-econ-channel-data.json` — 7-channel × domestic+NRI baseline (CAC/LTV/payback/monthly_acquired_target/attribution_source/status/confidence)
- `scripts/finance/unit-econ-refresh.mjs` — env-or-noop refresh executor; computes blended (weighted by acquired target); writes timestamped snapshot under `--write`; exits 2 on tripwire breach
- `docs/finance/unit-econ-refresh-channel-spec.md` — extended w/ deliverables list + attribution mapping + cadence + KPI promotion rules + tripwire wiring
- `docs/finance/R-Q2-F-002-handoff.md` — 8-step founder action list to promote KPI 0 → 1

# Reference material

- `docs/finance/unit-economics-m9-audit-template.md` — M9 rigorous CA-led audit (3 months later)
- `ROADMAP.md` "Strategy tripwires" — NRI CAC + payback thresholds
- `docs/roadmap/items/Q3/finance/002-unit-economics-m9-audit-...md` — M9 follow-up
- `docs/roadmap/items/Q2/marketing/011-...md` — referral program (one CAC source)
