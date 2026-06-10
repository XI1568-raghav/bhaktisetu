---
id: R-Q3-M-005
title: "App store launch campaign — ASO + paid installs + influencer + press release"
category: marketing
owner_role: cmo
quarter: Q3
month_target: 8
priority: P0
status: planned
agent_assignable: true
founder_blocker: null
depends_on: ["R-Q3-E-002","R-Q3-E-003"]
blocks: []

kpi:
  metric: "total_app_installs"
  current: 0
  target: 15000
  unit: "count"
  source: "gplay"
  query: "Google Play Console API getInstalls(packageName='online.darshya.app') + App Store Connect getUnits for India region; combined daily roll-up to docs/roadmap/_manual-kpis.yml key=total_app_installs; target 15000 by Sep 30"

revenue_impact:
  amount_inr: 200000
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 40
est_cost_inr: 0

success_criteria:
  - "15000 combined iOS + Android installs in 30 days post-launch (validated via Play Console + App Store Connect)"
  - "ASO keyword ranking top 10 for 5 seed terms (devotional, puja booking, live darshan, hindu astrology, devotee app) in India region"
  - "5 influencer collabs shipped (Sadhguru/Gaur Gopal/Anaspure/Vipul Goyal/Devotional YouTuber tier) w/ ≥ 100K reach each"
  - "Paid install CAC ≤ ₹40 blended (Meta + Google UAC) — tripwire fold to NRI-only SKU if breached per ROADMAP.md"

agent_brief:
  context_files:
    - apps/web/app/launch/page.tsx
    - scripts/agents/founder-tweet-draft.mjs
    - scripts/agents/social-content-multiplexer.mjs
    - docs/company/03-marketing.md
    - docs/launch-state.md
  prompt_skeleton: |
    Marketing sub-agent. P0 App Store launch campaign — 15K installs in 30 days post-iOS/Android GA.
    Pre-req R-Q3-E-002 iOS + R-Q3-E-003 Android prod releases must be live (BOTH founder-blocker U3+U4).
    Draft ASO keyword research (5 seed terms India region: devotional, puja booking, live darshan, hindu astrology, devotee app) + screenshots + 5-lang store listing (en/hi/ta/te/bn).
    Shortlist 5 influencer targets (Sadhguru/Gaur Gopal/Anaspure/Vipul Goyal/devotional-YouTuber tier) + cold-DM scripts + commercials (₹10K-50K each).
    Set up Meta + Google UAC paid install campaigns ₹2L/mo budget, blended CAC tripwire ≤ ₹40 (per ROADMAP.md strategy tripwires).

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.

tags: ["aso","mobile","launch","campaign"]
created_at: 2026-06-09T22:02:53.908Z
updated_at: 2026-06-09T22:02:53.908Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
