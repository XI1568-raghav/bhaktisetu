---
id: R-Q3-SA-005
title: "Corporate Diwali gifting — 5 pilot accounts signed (Infosys+TCS+Wipro+Tata+ICICI)"
category: sales
owner_role: sales
quarter: Q3
month_target: 9
priority: P1
status: planned
agent_assignable: true
founder_blocker: null
depends_on: ["R-Q2-SA-004"]
blocks: []

kpi:
  metric: "corporate_diwali_accounts"
  current: 0
  target: 5
  unit: "count"
  source: "manual"
  query: "docs/roadmap/_manual-kpis.yml key=corporate_diwali_accounts (founder updates weekly per signed MSA from Infosys/TCS/Wipro/Tata/ICICI; target 5)"

revenue_impact:
  amount_inr: 500000
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 40
est_cost_inr: 0

success_criteria:
  - "5 enterprise MSA signed (Infosys + TCS + Wipro + Tata + ICICI HR/CSR head)"
  - "Each pilot covers 200-500 employees x ₹500-2000 puja voucher = ₹1L-5L MSA per account"
  - "Gift-puja redemption flow live for corporate codes via apps/web/app/gift/page.tsx + apps/api/src/routes/gift-puja.ts"
  - "Sales pipeline tracked in admin-leads w/ source='corp_diwali_2026' for attribution"

agent_brief:
  context_files:
    - apps/api/src/routes/admin-leads.ts
    - apps/api/src/routes/gift-puja.ts
    - apps/web/app/gift/page.tsx
    - scripts/agents/cold-temple-outreach.mjs
    - docs/company/05-sales.md
  prompt_skeleton: |
    Sales sub-agent. P1 corporate Diwali gifting pilot — 5 enterprise MSA by Sep 30.
    Read docs/company/05-sales.md outbound playbook + scripts/agents/cold-temple-outreach.mjs for cold-email scaffolding.
    Draft 5 personalized outreach sequences (HR + CSR head per target) w/ ROI deck attached.
    Wire admin-leads w/ source='corp_diwali_2026' so funnel-drop-analyzer can attribute lift.
    Bulk gift-code generator endpoint (POST /api/v1/gift-puja/corporate-codes) needs scaffolding too.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.

tags: ["b2b","corporate","diwali","gifting"]
created_at: 2026-06-09T22:02:55.221Z
updated_at: 2026-06-09T22:02:55.221Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
