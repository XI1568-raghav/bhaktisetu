---
id: R-Q4-G-006
title: "Onboard new India city Patna (11 of 25 — east)"
category: geo
owner_role: sales
quarter: Q4
month_target: 11
priority: P0
status: in_progress
agent_assignable: true
founder_blocker: null
depends_on: ["R-Q4-S-002"]
blocks: []

kpi:
  metric: "city_active_users_patna"
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
  context_files:
    - apps/web/lib/cities.ts
    - docs/geo/R-Q4-G-006-patna-launch.md
    - docs/geo/R-Q1-G-002-varanasi-launch.md
  prompt_skeleton: |
    Patna (east zone, city 11 of 25). Bihar capital; ancient Pataliputra.
    Supply: 25 pandits + 5 temples gated on founder Patna trip + Mahavir Mandir trust intro.
    Anchor temples: Mahavir Mandir (India #2 income after Tirupati), Bari + Choti Patan Devi (Shakti Peetha), Hanuman Mandir Patna Junction, Takht Sri Patna Sahib (Sikh, optional interfaith).
    Festival levers: Chhath puja (Oct-Nov, signature Bihar festival, weak on Sri Mandir) + pitru-paksha (Sep-Oct, Patna airport = Gaya gateway).
    NRI lever: Bihari girmitiya diaspora (Mauritius/Trinidad/Guyana/Surinam/Fiji) + Gulf/US/UK current-gen.
    Engineering scaffold shipped batch 2026-06-15. Founder physical recce blocking real KPI movement.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.
  2026-06-15 batch: engineering scaffold shipped — cities.ts Patna entry (6 temples, 3 deities, 5 pujas, 4 yatra) + /city/patna SSG route via fan-out + full handoff doc at docs/geo/R-Q4-G-006-patna-launch.md. Status stays in_progress per founder-action-required gate (25 pandits + 5 temples need founder Patna trip + Mahavir Mandir trust intro). KPI query placeholder in spec — supply-readiness companion SQL provided in handoff doc; PostHog insight ID for city_active_users_patna still TBD until insight created in PostHog UI.

tags: ["geo","india","patna","tier2"]
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
