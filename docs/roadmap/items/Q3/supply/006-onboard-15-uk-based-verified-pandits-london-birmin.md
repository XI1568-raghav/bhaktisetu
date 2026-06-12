---
id: R-Q3-S-006
title: "Onboard 15 UK-based verified pandits (London + Birmingham + Leicester)"
category: supply
owner_role: sales
quarter: Q3
month_target: 7
priority: P0
status: in_progress
agent_assignable: true
founder_blocker: null
depends_on: ["R-Q2-G-006"]
blocks: ["R-Q3-G-001"]

kpi:
  metric: "verified_pandits_count_uk"
  current: 0
  target: 15
  unit: "count"
  source: "supabase"
  query: "SELECT COUNT(*) FROM priests p JOIN users u ON p.user_id = u.id WHERE p.aadhaar_verified = true AND p.kyc_status = 'approved' AND u.location_country = 'UK' AND u.location_city IN ('London','Birmingham','Leicester'); target 15"

revenue_impact:
  amount_inr: 180000
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 48
est_cost_inr: 0

success_criteria:
  - "15 UK-based pandits onboarded across London (10) + Birmingham (3) + Leicester (2) by end-Q3"
  - "Each pandit aadhaar_verified=true (or UK equivalent KYC) + 3+ puja SKUs live + GBP pricing (NRI 9-10× domestic per business rule #2)"
  - "Pre-req R-Q2-G-006 UK NRI launch landing page + Stripe GBP rail live (U2 unblock)"
  - "Onboarding cycle time p50 ≤ 14 days (KYC + onboarding email drip + first paid booking)"

agent_brief:
  context_files:
    - apps/api/src/routes/admin-leads.ts
    - scripts/agents/cold-temple-outreach.mjs
    - apps/web/app/become-pandit/page.tsx
    - apps/api/src/routes/priests.ts
    - docs/company/06-supply.md
  prompt_skeleton: |
    Supply sub-agent. P0 UK pandit onboarding — 15 verified across London/Birmingham/Leicester.
    Source via UK Hindu Council + ISKCON UK chapters + BAPS Neasden + cold-outreach to Mandir networks (Hindu temple databases in Leicester/Birmingham).
    Pipeline: lead in admin-leads source='uk_pandit_outreach' → KYC (UK equivalent doc: passport + UK address proof + Hindu Council membership) → Stripe GBP onboarding (founder-blocker U2) → 3 puja SKUs live → first booking.
    Pricing: NRI 9-10× domestic rate per business rule #2 (e.g. ₹500 INR puja = £45-50 GBP).
    Blocks R-Q3-G-001 UK soft launch — cannot launch UK NRI city w/o 15+ local pandits live.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.

tags: ["supply","pandit","uk","nri"]
created_at: 2026-06-09T22:02:56.063Z
updated_at: 2026-06-09T22:02:56.063Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
