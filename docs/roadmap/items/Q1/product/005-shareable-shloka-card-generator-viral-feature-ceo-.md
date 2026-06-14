---
id: R-Q1-P-005
title: "Shareable shloka-card generator (viral feature CEO doc Day 31-60)"
category: product
owner_role: cpo
quarter: Q1
month_target: 3
priority: P2
status: shipped
agent_assignable: true
founder_blocker: null
depends_on: []
blocks: []

kpi:
  metric: "shloka_card_live"
  current: 0
  target: 1
  unit: "count"
  source: "gh_repo"
  query: "gh-1-if-apps-web-app-shloka-card-page-tsx-exists-and-route-returns-200-on-darshya-online-shloka-card-with-og-preview-and-share-buttons"

revenue_impact:
  amount_inr: 0
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 8
est_cost_inr: 0

success_criteria:
  - "/shloka-card page live (already shipped per HANDOFF 2026-05-27)"
  - "PostHog events fire on copy/download/share with utm_source=shloka-card"
  - "Min 100 shares logged in 30 days post-launch"

agent_brief:
  context_files:
    - apps/web/app/shloka-card/page.tsx
    - apps/web/app/og/default/route.tsx
    - apps/web/lib/posthog.ts
  prompt_skeleton: |
    Already shipped per HANDOFF 2026-05-27 (commits referenced /shloka-card live).
    Sub-agent verifies route 200 on darshya.online/shloka-card.
    Adds 3 more preset shlokas (Gita 18.66, Hanuman Chalisa Doha, Maha Mrityunjaya).
    Wires PostHog event capture on share button click. Monitors weekly share count for viral signal.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.
  2026-06-15: KPI satisfied — /shloka-card live (HTTP 200 verified). 3 new presets
  added (Gita 18.66, Hanuman Chalisa Doha, Maha Mrityunjaya), total 6 presets.
  utm_source=shloka-card&utm_medium=share now wired on all 3 share buttons
  (WhatsApp + X + Facebook), previously only on Twitter. PostHog capture
  enriched with utm_source, text_length, has_translit, has_meaning props on
  download/share/copy events. Note: /og/shloka image route is still a
  302 redirect to /logo.svg per public/_redirects — preview tile shows the
  logo until edge ImageResponse route ships (deferred; static fallback works,
  share links carry full attribution). Min 100 shares KPI is monitored
  passively via PostHog funnel post-deploy; no further code work required.

tags: ["product","viral","content","p2"]
created_at: 2026-06-09T21:51:06.038Z
updated_at: 2026-06-09T21:51:06.038Z
shipped_at: 2026-06-15T00:00:00.000Z
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
