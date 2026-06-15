---
id: R-Q2-M-008
title: "WhatsApp daily devotional broadcast — 1000 opt-in users (under free tier)"
category: marketing
owner_role: cmo
quarter: Q2
month_target: 6
priority: P2
status: in_progress
agent_assignable: true
founder_blocker: 'U7'
depends_on: ["R-Q1-M-010"]
blocks: []

kpi:
  metric: "wa_broadcast_subscribers"
  current: 0
  target: 1000
  unit: "count"
  source: "manual"
  query: "founder reports opt-in count from WA Cloud Business dashboard weekly"

revenue_impact:
  amount_inr: 0
  confidence: medium
  basis: "Retention play, not direct revenue. Daily-return signal feeds puja booking funnel at 5% projected CTR."

est_hours: 12
est_cost_inr: 0

success_criteria:
  - "WA Cloud Business verified (R-Q1-M-010 closed) per [VERIFY-FOUNDER]"
  - "5 broadcast templates approved by Meta (shloka, panchang, deity, festival, opt-out)"
  - "/broadcast opt-in page live + linked from post-booking checkout flow"
  - "Daily cron 06:30 IST send active (GH Actions cron or apps/api scheduler)"
  - "1000 opt-in users (projection, measured by manual founder weekly check until KPI scraper wired)"
  - "<2% opt-out rate per send"
  - "DPDP Rule 7 consent withdrawal flow audited"

agent_brief:
  context_files:
    - "docs/marketing/whatsapp-daily-devotional-broadcast-spec.md"
    - "docs/marketing/R-Q2-M-008-handoff.md"
    - "docs/marketing/whatsapp-cloud-business-verify-spec.md"
  prompt_skeleton: |
    Implement R-Q2-M-008 WhatsApp daily devotional broadcast.

    Constraints:
    - DO NOT auto-claim status=shipped. KPI requires founder action (Meta template approval + first 1000 opt-ins).
    - Use env-or-noop pattern for WA Cloud API key (WA_CLOUD_TOKEN). If absent, log + skip send.
    - Rate-limit broadcast send by phone-hash to avoid duplicate dispatches.
    - All opt-in/opt-out events emit PostHog `wa_broadcast_*` for funnel tracking.
    - Cap daily sends at 700 to stay within 1000 conversations/mo free tier.

    Sub-tickets:
    - R-Q2-M-008a — /broadcast opt-in page (apps/web)
    - R-Q2-M-008b — Daily content cron 06:30 IST
    - R-Q2-M-008c — WA template approval coordination (founder-blocking)
    - R-Q2-M-008d — Open rate + opt-out webhook handler

    Reference handoff doc for launch sequence + compliance notes.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.
  2026-06-15: populated success_criteria + agent_brief via R5 ship cycle. Handoff doc shipped at docs/marketing/R-Q2-M-008-handoff.md. Status stays in_progress — KPI requires founder action (Meta template approval + WA Cloud verify + first cohort send). Spec body remains as authored 2026-06-13.

tags: ["wa","broadcast","retention","dpdp","opt-in"]
created_at: 2026-06-09T21:55:19.892Z
updated_at: 2026-06-15T00:00:00.000Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters

Daily WhatsApp broadcast is the highest-leverage retention lever pre-mobile-app launch. Sri Mandir, Utsav, and Vama all rely on daily WA push as their #1 daily-return hook. Without it, the puja booking funnel relies on cold organic-search returns (~5% weekly return rate) vs daily WA push (35-45% weekly return rate for opt-in cohorts).

Target: 1000 opt-in users by Q2 close. Funnel hypothesis: 5K MAU × 20% opt-in rate = 1000.

# Reference material

- Spec: `docs/marketing/whatsapp-daily-devotional-broadcast-spec.md`
- Handoff (this cycle): `docs/marketing/R-Q2-M-008-handoff.md`
- Upstream dependency: `docs/marketing/whatsapp-cloud-business-verify-spec.md` (R-Q1-M-010)
- Compliance: DPDP §8(10) grievance officer + Rule 7 consent withdrawal
