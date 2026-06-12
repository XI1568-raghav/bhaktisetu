---
id: R-Q1-E-008
title: 5 funnel events instrumentation via PostHog
category: engineering
owner_role: cto
quarter: Q1
month_target: 1
priority: P0
status: shipped
agent_assignable: true
founder_blocker: 'U8'
depends_on: []
blocks: []

kpi:
  metric: funnel_events_wired
  current: 0
  target: 5
  unit: count
  source: posthog
  query: "posthog-insight-TBD-create-via-ui (insight counting distinct event names from puja_card_click,book_clicked,payment_initiated,payment_success,video_proof_viewed in last 7d)"

revenue_impact:
  amount_inr: 0
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 4
est_cost_inr: 0

success_criteria:
  - "5 posthog.capture() calls in source: puja_card_click, book_clicked, payment_initiated, payment_success, video_proof_viewed"
  - "PostHog UI funnel insight shows all 5 events firing within 24h of deploy"
  - "Drop-off ratios visible per step (booked / payment-initiated, etc)"
  - "Per-event properties captured: pujaSlug, templeId, amount_inr, nri_flag"

agent_brief:
  context_files:
    - apps/web/lib/posthog.ts
    - apps/web/components/Analytics.tsx
    - apps/web/app/pujas/book/page.tsx
    - apps/web/components/home/IntentTrio.tsx
    - docs/company/02-cmo.md
  prompt_skeleton: |
    CTO + CMO sub-agent. P0 analytics — currently no funnel events captured, blind to drop-off.
    Read apps/web/lib/posthog.ts for capture wrapper pattern. Wire 5 events:
    1. puja_card_click — IntentTrio/WorshipStrip card onClick handlers
    2. book_clicked — pujas/book/page.tsx Book Now button
    3. payment_initiated — Razorpay/Stripe order creation success
    4. payment_success — webhook OR client-side success redirect
    5. video_proof_viewed — DarshanLivePlayer + video proof page mount
    Each capture sends pujaSlug, templeId, amount_inr, nri_flag. Founder must create PostHog Funnel insight from these 5 events (manual UI step) — agent_brief notes this.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.

tags: ["analytics","funnel","posthog"]
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
