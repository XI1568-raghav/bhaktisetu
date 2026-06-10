---
id: R-Q3-M-006
title: "Diwali festival mega-campaign — 7-day push + paid + influencer (target 30K bookings)"
category: marketing
owner_role: cmo
quarter: Q3
month_target: 9
priority: P0
status: planned
agent_assignable: true
founder_blocker: 'U5'
depends_on: []
blocks: []

kpi:
  metric: "diwali_bookings"
  current: 0
  target: 30000
  unit: "count"
  source: "supabase"
  query: "SELECT COUNT(*)::int AS value FROM bookings WHERE created_at >= '2026-11-08' AND created_at <= '2026-11-15' AND payment_status = 'PAID' AND (utm_campaign ILIKE 'diwali%' OR meta->>'campaign' = 'diwali-2026') -- 7-day Diwali window paid bookings; target 30000"

revenue_impact:
  amount_inr: 1500000
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 40
est_cost_inr: 0

success_criteria:
  - "7-day Diwali campaign live Nov 8-15 across web + WA + paid Meta/Google + 5 influencers (≥100k followers each)"
  - "30000 paid bookings logged with utm_campaign='diwali-2026' attribution (Supabase query above)"
  - "Push notif fan-out via FCM 4 days pre-Diwali to all installed app users (founder-blocked on U5 FCM)"
  - "ROAS ≥3x on paid Meta/Google spend (revenue tracked via PostHog payment_success event)"
  - "Influencer UGC content drives ≥5K organic referral signups via affiliate codes (R-Q3-E-009)"

agent_brief:
  context_files:
    - apps/api/src/routes/payments.ts
    - apps/web/lib/posthog.ts
    - apps/web/app/pujas/[slug]/book/page.tsx
    - scripts/agents/content-publisher.mjs
    - docs/company/02-cmo.md
    - docs/ceo-roadmap-2026-05-27.md
  prompt_skeleton: |
    CMO sub-agent. P0 Diwali mega-campaign 7-day window Nov 8-15 (target 30K bookings + ₹1.5L direct revenue).
    Read docs/company/02-cmo.md festival-campaign playbook + content-publisher.mjs for daily-devotional cadence.
    Draft 14 social posts (twice/day x 7 days) + 5 influencer brief packs + 3 paid Meta ad variants per language (en/hi).
    Stamp every booking link with utm_campaign='diwali-2026' so Supabase query above attributes correctly.
    Note: FCM push fan-out blocked until U5 paste lands — coordinate with founder on launch day.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.

tags: ["festival","diwali","campaign","mega"]
created_at: 2026-06-09T22:02:53.908Z
updated_at: 2026-06-09T22:02:53.908Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
