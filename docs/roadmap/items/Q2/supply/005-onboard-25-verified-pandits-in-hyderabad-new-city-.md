---
id: R-Q2-S-005
title: "Onboard 25 verified pandits in Hyderabad (new city — south expansion)"
category: supply
owner_role: sales
quarter: Q2
month_target: 6
priority: P1
status: planned
agent_assignable: true
founder_blocker: null
depends_on: []
blocks: []

kpi:
  metric: "verified_pandits_count_hyderabad"
  current: 0
  target: 25
  unit: "count"
  source: "supabase"
  query: "SELECT COUNT(*) FROM \"Priest\" p JOIN \"User\" u ON p.user_id=u.id WHERE p.verified=true AND p.aadhaar_verified=true AND u.city ILIKE '%hyderabad%'"

revenue_impact:
  amount_inr: 75000
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 36
est_cost_inr: 0

success_criteria:
  - "25 pandits onboarded in Hyderabad — south India expansion"
  - "Each verified=true AND aadhaar_verified=true (Priest table — business rule #4 gate)"
  - "Each onboarded via /priest-onboarding flow w/ KYC + bank account for payouts"
  - "Telugu language proficiency required (south India market localization)"
  - "Cross-link: 5+ pandits active in /priest/bookings dashboard (Sprint 1 P0 wired)"

agent_brief:
  context_files:
    - apps/api/src/routes/priests-public.ts
    - apps/web/app/priest-onboarding/page.tsx
    - apps/web/app/priest/page.tsx
    - docs/company/05-sales.md
  prompt_skeleton: |
    Sales sub-agent. P1 Hyderabad pandit onboarding — south India expansion.
    Run pandit-acquisition agent for Hyderabad geo (cold outreach to Telugu-speaking pandits).
    Verify each onboarded via /priest-onboarding flow w/ KYC (Aadhaar gate per business rule #4).
    Track pipeline in docs/agent-reports/YYYY-MM-DD-pandit-pipeline-hyderabad.md.
    Coordinate w/ R-Q2-G-005 (Hyderabad geo soft launch) — pandits required for city activation.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.

tags: ["supply","pandit","hyderabad","south"]
created_at: 2026-06-09T21:55:22.029Z
updated_at: 2026-06-09T21:55:22.029Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
