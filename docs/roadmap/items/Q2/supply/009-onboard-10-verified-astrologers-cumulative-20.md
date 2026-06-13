---
id: R-Q2-S-009
title: "Onboard +10 verified astrologers (cumulative 20)"
category: supply
owner_role: sales
quarter: Q2
month_target: 4
priority: P1
status: in_progress
agent_assignable: true
founder_blocker: null
depends_on: ["R-Q1-S-007"]
blocks: []

kpi:
  metric: "verified_astrologers_count"
  current: 0
  target: 20
  unit: "count"
  source: "supabase"
  query: "SELECT COUNT(*) FROM \"UserRoleAssignment\" WHERE role='astrologer' AND verified=true AND created_at >= '2026-04-01'"

revenue_impact:
  amount_inr: 80000
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 20
est_cost_inr: 0

success_criteria:
  - "20 verified astrologers cumulative (Q1 10 from R-Q1-S-007 + Q2 +10)"
  - "Each onboarded via admin-leads PATCH /leads/:id/status flow (P18 HANDOFF 2026-05-27)"
  - "Verified flag requires KYC + sample horoscope review by admin"
  - "Cross-link: at least 5 astrologers active in AstrologerConsultation table (POST /consultation/book)"
  - "Astrologer profile pages live at /astrology/[id]/view + /astrology/[id]/book"

agent_brief:
  context_files:
    - apps/api/src/routes/admin-leads.ts
    - apps/web/app/admin/leads/page.tsx
    - apps/api/src/routes/consultation.ts
    - docs/company/05-sales.md
  prompt_skeleton: |
    Sales sub-agent. P1 astrologer onboarding — depends on R-Q1-S-007 (Q1 10 astrologers).
    Use admin-leads PATCH /leads/:id/status workflow (P18 shipped) — Approve+welcome / Reject+note flow.
    KYC checklist: govt ID + sample horoscope + 3 references + bank account (for payouts post Aadhaar gate).
    Track pipeline in docs/agent-reports/YYYY-MM-DD-astrologer-pipeline.md.
    Coordinate w/ consultation lifecycle: each onboarded astrologer must light up in /astrology/[id]/view + AstrologerConsultation flow.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.

tags: ["supply","astrology","scale"]
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
