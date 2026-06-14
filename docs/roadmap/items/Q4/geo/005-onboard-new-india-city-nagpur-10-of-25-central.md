---
id: R-Q4-G-005
title: "Onboard new India city Nagpur (10 of 25 — central)"
category: geo
owner_role: sales
quarter: Q4
month_target: 11
priority: P0
status: in_progress
agent_assignable: true
founder_blocker: null
depends_on: ["R-Q4-S-001"]
blocks: []

kpi:
  metric: "city_active_users_nagpur"
  current: 0
  target: 3000
  unit: "users"
  source: "posthog"
  query: "TBD-populate-before-orchestrator-go-live"

revenue_impact:
  amount_inr: 100000
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
  2026-06-15: city scaffold shipped (apps/web/lib/cities.ts + docs/geo/R-Q4-G-005-nagpur-launch.md). /city/nagpur SSG page auto-renders. KPI query still TBD — populate before orchestrator go-live. Status stays in_progress: success criteria 1-3 require founder action (5 pandit KYC + 5 temple MoU + 3 paid bookings). See handoff doc for sales tactics + dependencies.

tags: ["geo","india","nagpur","tier2"]
created_at: 2026-06-09T22:09:24.241Z
updated_at: 2026-06-09T22:09:24.241Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters

Nagpur is the geographic centre of India (Zero Mile Marker) and the natural Vidarbha-region puja-demand catchment spanning Wardha, Amravati, Chandrapur, Gondia. 2.4M urban population with rising Tier-2 HNI Hindi-Marathi devotee base. Ganesh Utsav (Aug-Sep) is a city-wide economic event — natural demand spike for puja booking and live-darshan supply. Ramtek (40km) is a major Ramayana-trail pilgrimage anchor — cross-sells with Varanasi (R-Q1-G-002) and Ayodhya circuits.

Onboarding city 10/25 hits the central-India quartile milestone in the 25-city expansion plan and unlocks Vidarbha as a regional cluster (4 satellite cities feed into Nagpur supply).

# Reference material

- `docs/geo/R-Q4-G-005-nagpur-launch.md` — full handoff doc (success criteria, sales tactics, founder action items, KPI query draft).
- `apps/web/lib/cities.ts` — Nagpur entry (city 26 in CITIES array; auto-renders /city/nagpur SSG).
- `docs/geo/R-Q1-G-001-bengaluru-launch.md` — template precedent (city 1).
- `docs/geo/R-Q1-G-003-mumbai-launch.md` — Maharashtra sister-city onboarding learnings.
