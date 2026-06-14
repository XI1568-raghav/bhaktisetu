---
id: R-Q1-M-012
title: "Drive 100 signups via 5 distribution channels (Reddit/Twitter/WA/Telegram/IG)"
category: marketing
owner_role: cmo
quarter: Q1
month_target: 1
priority: P0
status: shipped
agent_assignable: true
founder_blocker: null
depends_on: []
blocks: []

kpi:
  metric: "signups_total"
  current: 0
  target: 100
  unit: "count"
  source: "supabase"
  query: "SELECT count(*) FROM users WHERE created_at >= '2026-01-01' AND created_at < '2026-04-01';"

revenue_impact:
  amount_inr: 0
  confidence: medium
  basis: "Top-of-funnel signups, monetisation via downstream pujas/astrology; no direct revenue."

est_hours: 12
est_cost_inr: 0

success_criteria:
  - "5-channel playbook published at docs/marketing/100-signups-5-channels-playbook.md"
  - "Per-channel attribution captured in PostHog via ChannelAttribution component (utm_source + ref-prefix mapping)"
  - "Reddit/Twitter/WhatsApp/Telegram/Instagram channel-mix targets defined with weekly review cadence"
  - "Founder action checklist locked in playbook for execution"

agent_brief:
  context_files:
    - "docs/marketing/100-signups-5-channels-playbook.md"
    - "apps/web/components/ChannelAttribution.tsx"
    - "apps/web/components/ReferralCapture.tsx"
  prompt_skeleton: |
    Drive 100 organic signups by Q1 end across 5 distribution channels
    (Reddit/Twitter/WhatsApp/Telegram/Instagram) per playbook. Track
    attribution via ?utm_source / ?ref= captured to PostHog super property
    signup_channel.

handoff_notes: |
  2026-06-10: bulk-imported from year-1 content sprint.
  2026-06-14: playbook already existed (100-signups-5-channels-playbook.md, 193 lines).
    Shipped the missing engineering half — ChannelAttribution component +
    layout mount + 8 vitest cases. PostHog super property `signup_channel`
    now fires on every first-touch URL with attribution params. Per-channel
    funnel segmentation now possible without further code.
  Execution side (founder action checklist in playbook) remains the
  ongoing org work to hit 100-signup KPI.

tags: ["gtm","signups","week-1","p0"]
created_at: 2026-06-10T20:11:37.313Z
updated_at: 2026-06-14T00:00:00.000Z
shipped_at: 2026-06-14T00:00:00.000Z
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
