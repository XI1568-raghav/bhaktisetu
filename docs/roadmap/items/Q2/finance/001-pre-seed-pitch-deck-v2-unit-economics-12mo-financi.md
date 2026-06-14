---
id: R-Q2-F-001
title: "Pre-seed pitch deck v2 — unit economics + 12mo financial model"
category: finance
owner_role: cfo
quarter: Q2
month_target: 4
priority: P0
status: in_progress
agent_assignable: true
founder_blocker: design_send_investors
depends_on: ["R-Q2-M-002"]
blocks: []

kpi:
  metric: "pitch_deck_v2_shipped"
  current: 0
  target: 1
  unit: "count"
  source: "gh_repo"
  query: "TBD-populate-before-orchestrator-go-live"

revenue_impact:
  amount_inr: 0
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 16
est_cost_inr: 0

success_criteria:
  - "Populate during first sub-agent emission cycle"

agent_brief:
  context_files: []
  prompt_skeleton: |
    TBD — populated by first sub-agent cycle.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.
  2026-06-12: Outline + 12-mo financial model shipped. docs/finance/pitch-deck-v2-outline.md:
    - 12-slide deck structure (Cover / Problem / Solution / Why-now / Wedge / Traction / Business Model / Unit Econ / Market+Competitors / Team / Ask+UoF / Closing)
    - Target round: ₹3-5 Cr pre-seed at $3-5M post; 18-month runway to ₹15L MRR Series A
    - Concrete unit economics (per-puja India ₹61 contrib + per-puja NRI ₹905 contrib; LTV/CAC math)
    - 12-month financial model template (5 revenue lanes × monthly trajectory; cost lines including phased hiring; cumulative-burn projection; break-even Sep 2026; ₹3+ Cr cumulative net by May 2027)
    - 3 sensitivity scenarios (Bear/Base/Bull) for Series A signal
    - 10 investor target list (Blume/Kalaari/Stellaris/Together/Speciale + 5 angel paths) — all `[VERIFY-FOUNDER]` for warm-intro identification
    - Founder action checklist (11 items: review + fill placeholders + design + advisor review + pre-warm investors + send)
  FOUNDER ACTION: design deck in Figma/Slides (~6h) + fill financial model Google Sheet (~3h) + pre-warm 5 investors (~ongoing 30 days) + send + track in investor-pipeline-2026-06.md.
  Closes (partial): R-Q2-F-001. Status flips to shipped after deck designed + sent to first 3 investors.
  2026-06-14: Round-2 ship adds 2 artifacts to complete the agent-shippable scope:
    - docs/finance/pitch-deck-v2-financial-model.csv — 12-month monthly model w/ 5 revenue lanes + cost lines + cashflow + KPIs + 3 sensitivity scenarios (Bear/Base/Bull). Founder pastes into Google Sheets, adds formulas, color-codes assumption cells (~3h).
    - docs/finance/investor-pipeline-2026-06.md — 10-investor target list (5 institutional Blume/Kalaari/Stellaris/Together/Speciale + 5 angel/NRI), pipeline-value calculator, touch log, materials checklist, 30-day pre-warm plan, 5 open questions for founder (round structure, cap, lead req, close schedule, founder-friendly clauses).
  founder_blocker flipped to `design_send_investors`. All agent-shippable artifacts now in place; remaining work is founder hand-execution (Figma design + Sheets formulas + warm-intro outreach + advisor reviews + first 3 sends).

tags: ["fundraising","deck","financials"]
created_at: 2026-06-09T21:56:41.463Z
updated_at: 2026-06-14T00:00:00.000Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
