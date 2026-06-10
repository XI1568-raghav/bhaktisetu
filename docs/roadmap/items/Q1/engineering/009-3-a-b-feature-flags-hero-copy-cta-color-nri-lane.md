---
id: R-Q1-E-009
title: 3 A/B feature flags hero_copy/cta_color/nri_lane
category: engineering
owner_role: cpo
quarter: Q1
month_target: 2
priority: P2
status: planned
agent_assignable: true
founder_blocker: 'U8'
depends_on: ["R-Q1-E-008"]
blocks: []

kpi:
  metric: ab_flags_active
  current: 0
  target: 3
  unit: count
  source: posthog
  query: "posthog-insight-TBD-create-via-ui-count-active-feature-flags-named-hero-copy-v2-cta-color-test-nri-lane-above-fold-with-min-100-exposures-each"

revenue_impact:
  amount_inr: 0
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 5
est_cost_inr: 0

success_criteria:
  - "3 PostHog feature flags created: hero_copy_v2, cta_color_test, nri_lane_above_fold"
  - "Each flag wired into apps/web/app/page.tsx with default + variant code path"
  - "Min 100 exposures per variant captured before declaring winner"

agent_brief:
  context_files:
    - apps/web/app/page.tsx
    - apps/web/lib/posthog.ts
    - docs/company/02-product.md
  prompt_skeleton: |
    Founder owns U8 PostHog key paste. Sub-agent drafts 3 flag specs.
    hero_copy_v2 = test current Sanskrit-anchored hero vs benefit-led copy.
    cta_color_test = saffron-600 vs indigo-600 primary CTA.
    nri_lane_above_fold = NRI gift-puja card above vs below first scroll.
    Wire useFeatureFlag hook in apps/web/app/page.tsx. Track exposure + conversion event.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.

tags: ["growth","ab","flags"]
created_at: 2026-06-09T21:28:52.338Z
updated_at: 2026-06-09T21:28:52.338Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
