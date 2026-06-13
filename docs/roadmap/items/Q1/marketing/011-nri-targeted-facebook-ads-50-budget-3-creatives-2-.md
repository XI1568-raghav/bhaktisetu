---
id: R-Q1-M-011
title: "NRI-targeted Facebook ads $50 budget 3 creatives × 2 audiences"
category: marketing
owner_role: cmo
quarter: Q1
month_target: 3
priority: P2
status: in_progress
agent_assignable: true
founder_blocker: null
depends_on: []
blocks: []

kpi:
  metric: "nri_ads_live"
  current: 0
  target: 1
  unit: "count"
  source: "manual"
  query: "manual-kpi-1-if-fb-ads-manager-shows-1-active-campaign-budget-50-USD-with-3-creatives-and-2-audience-sets-US-NRI-and-UK-NRI"

revenue_impact:
  amount_inr: 0
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 6
est_cost_inr: 0

success_criteria:
  - "FB Ads Manager campaign live with $50 budget"
  - "3 creatives shipped: gift-puja-NRI, live-darshan-NRI, 80G-receipt-NRI"
  - "2 audience segments: US Hindu diaspora 25-45, UK Hindu diaspora 25-45"
  - "UTM params tracked to PostHog conversion funnel"

agent_brief:
  context_files:
    - apps/web/app/nri/page.tsx
    - apps/web/app/gift/page.tsx
    - docs/company/03-marketing.md
  prompt_skeleton: |
    Draft 3 ad creatives: (1) gift-puja NRI son-to-parent, (2) live darshan IST timezone NRI angle, (3) 80G tax-receipt NRI.
    Specs: 1080x1080 + 1080x1920 reels. Sub-agent provides copy + asset spec.
    Founder uploads to FB Ads Manager, sets $50 budget over 7 days.
    UTM tag fb_nri_q1_gift / fb_nri_q1_darshan / fb_nri_q1_80g. Track in PostHog conversion funnel.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.

tags: ["ads","nri","experiment","p2"]
created_at: 2026-06-09T21:47:07.357Z
updated_at: 2026-06-09T21:47:07.357Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
