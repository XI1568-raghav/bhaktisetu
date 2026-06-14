---
id: R-Q4-G-003
title: "Onboard new India city Indore (8 of 25 — central)"
category: geo
owner_role: sales
quarter: Q4
month_target: 10
priority: P0
status: in_progress
agent_assignable: true
founder_blocker: null
depends_on: ["R-Q4-S-001"]
blocks: []

kpi:
  metric: "city_active_users_indore"
  current: 0
  target: 3000
  unit: "users"
  source: "posthog"
  query: "TBD-populate-before-orchestrator-go-live"

revenue_impact:
  amount_inr: 120000
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 32
est_cost_inr: 0

success_criteria:
  - "/city/indore page lists ≥5 temples + ≥4 puja offerings (ENGINEERING)"
  - "≥5 verified pandits in Indore (Priest table, city='Indore', aadhaar_verified=true) — FOUNDER KYC"
  - "≥5 verified temples in Indore (Temple table, city='Indore', verified=true) — FOUNDER MoU"
  - "25 pandits onboarded across Q4 (5x sub-batches) — FOUNDER recruit cadence"
  - "3000 city_active_users_indore (PostHog) — 90d post-supply-ready"

agent_brief:
  context_files:
    - "docs/geo/R-Q4-G-003-indore-launch.md"
    - "apps/web/lib/cities.ts"
  prompt_skeleton: |
    Tactics for Indore (8/25 cities): Khajrana Ganesh Wednesday-loop (1L+ devotees/week), Annapurna temple, Ujjain pandit overflow (Bhasm Aarti pandits live in Indore), MP Brahmana Sabha mass WhatsApp, Google Maps temple scrape (22.6-22.8 lat x 75.7-76.0 lon), Annapurna prasad center discovery channel. Position Indore as overnight base for Ujjain Mahakaleshwar Bhasm Aarti packages.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.
  2026-06-15 (R-Q4-G-003 batch): Engineering scaffold shipped — apps/web/lib/cities.ts entry added (6 temples / 3 deities / 4 pujas / Ahilyabai Holkar significance / Ujjain base callout). /city/indore now SSGs via citySlugs() auto-fan. Sales-tactics + founder-action handoff doc at docs/geo/R-Q4-G-003-indore-launch.md. Status stays in_progress — KPI #2-#5 require founder KYC + MoU + recruit cadence over Q4.

tags: ["geo","india","indore","tier2"]
created_at: 2026-06-09T22:09:24.241Z
updated_at: 2026-06-09T22:09:24.241Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
