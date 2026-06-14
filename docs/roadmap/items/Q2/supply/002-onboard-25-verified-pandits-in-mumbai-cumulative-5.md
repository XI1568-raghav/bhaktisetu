---
id: R-Q2-S-002
title: "Onboard +25 verified pandits in Mumbai (cumulative 50)"
category: supply
owner_role: sales
quarter: Q2
month_target: 4
priority: P0
status: in_progress
agent_assignable: true
founder_blocker: null
depends_on: ["R-Q1-S-003"]
blocks: []

kpi:
  metric: "verified_pandits_count_mumbai"
  current: 0
  target: 50
  unit: "count"
  source: "supabase"
  query: "SELECT COUNT(*) FROM \"Priest\" p JOIN \"User\" u ON p.user_id=u.id WHERE p.verified=true AND p.aadhaar_verified=true AND u.city ILIKE '%mumbai%'"

revenue_impact:
  amount_inr: 75000
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 32
est_cost_inr: 0

success_criteria:
  - "50 pandits cumulative in Mumbai (Q1 25 from R-Q1-S-003 + Q2 +25)"
  - "Each verified=true AND aadhaar_verified=true (Priest table — business rule #4 gate)"
  - "Each onboarded via /priest-onboarding flow w/ KYC + bank account for payouts"
  - "Marathi + Hindi proficiency required (Maharashtra market)"
  - "Cross-link: 10+ pandits active in /priest/bookings dashboard (Sprint 1 P0 wired)"

agent_brief:
  context_files:
    - apps/api/src/routes/priests-public.ts
    - apps/web/app/priest-onboarding/page.tsx
    - apps/web/app/priest/page.tsx
    - docs/company/05-sales.md
  prompt_skeleton: |
    Sales sub-agent. P0 Mumbai pandit onboarding scale — cumulative 50 target.
    Depends on R-Q1-S-003 (Q1 25 Mumbai pandits base).
    Run pandit-acquisition agent for Mumbai geo (cold outreach to Marathi/Hindi pandits).
    Verify each onboarded via /priest-onboarding flow w/ KYC (Aadhaar gate per business rule #4).
    Coordinate w/ R-Q2-G-002 (Mumbai 80% scale milestone) — pandits required for 2K MAU activation.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.
  2026-06-14: PARTIAL ship — structured handoff doc at docs/supply/R-Q2-S-002-handoff.md (5-stage onboarding pipeline, 5 sub-segment targeting, KPI SQL, founder action checklist). Execution is sales/recruitment — agent-uncodeable. Label founder-action-required.

tags: ["supply","pandit","mumbai","scale"]
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
