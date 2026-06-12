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
founder_blocker: null
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

tags: ["fundraising","deck","financials"]
created_at: 2026-06-09T21:56:41.463Z
updated_at: 2026-06-12T11:45:00.000Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
