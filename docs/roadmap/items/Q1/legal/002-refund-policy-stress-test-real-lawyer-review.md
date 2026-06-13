---
id: R-Q1-L-002
title: "Refund-policy stress test + real lawyer review"
category: legal
owner_role: legal
quarter: Q1
month_target: 3
priority: P2
status: in_progress
agent_assignable: true
founder_blocker: null
depends_on: []
blocks: []

kpi:
  metric: "refund_policy_lawyer_reviewed"
  current: 0
  target: 1
  unit: "count"
  source: "manual"
  query: "manual-kpi-1-if-apps-web-app-refund-policy-page-tsx-content-reviewed-by-Indian-lawyer-with-signed-engagement-letter-on-file"

revenue_impact:
  amount_inr: 15000
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 4
est_cost_inr: 0

success_criteria:
  - "Refund policy reviewed by Indian lawyer (₹15k engagement)"
  - "5 edge cases stress-tested: video-not-delivered, priest-no-show, NRI dispute, partial-puja, force-majeure"
  - "Updated apps/web/app/refund-policy/page.tsx with lawyer-approved language"

agent_brief:
  context_files:
    - apps/web/app/refund-policy/page.tsx
    - docs/company/06-legal.md
    - apps/api/src/routes/consultation.ts
  prompt_skeleton: |
    Cannot agent-assign — founder action required to engage Indian lawyer.
    Sub-agent can: draft 5 stress-test scenarios + current policy gaps doc.
    Founder selects lawyer (LegalKart or local), sends docs + ₹15k engagement.
    Sub-agent integrates lawyer feedback into apps/web/app/refund-policy/page.tsx after review returns.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.
  2026-06-11: 4 deliverables shipped per R-Q1-L-002 prompt:
    - docs/legal/refund-policy-gap-analysis.md (12 stress-tested scenarios, 5 HIGH gaps)
    - docs/legal/refund-policy-v2-english.md (17-clause draft, all 12 scenarios covered)
    - docs/legal/refund-policy-v2-hindi.md (Hindi mirror, CPA 2019 regional-language compliance)
    - docs/legal/refund-policy-v2-lawyer-brief.md (1-page handoff for Bengaluru counsel)
  Status: drafts ready for lawyer review. NO prod code changes — apps/web/app/refunds/page.tsx (v1) unchanged until lawyer redlines applied.
  FOUNDER-BLOCKER: (1) find Bengaluru consumer-law counsel via LinkedIn / VakilSearch (~₹3-10K consult fee), (2) email refund-policy-v2-lawyer-brief.md + 3 supporting files, (3) apply redlines to apps/web/app/refunds/page.tsx via separate PR after counsel signoff.

tags: ["legal","refunds","p2"]
created_at: 2026-06-09T21:50:21.017Z
updated_at: 2026-06-09T21:50:21.017Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
