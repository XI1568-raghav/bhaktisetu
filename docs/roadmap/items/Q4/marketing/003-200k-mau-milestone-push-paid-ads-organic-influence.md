---
id: R-Q4-M-003
title: "200K MAU milestone push — paid ads + organic + influencer flywheel"
category: marketing
owner_role: cmo
quarter: Q4
month_target: 11
priority: P0
status: in_progress
agent_assignable: true
founder_blocker: true
depends_on: ["R-Q3-M-005"]
blocks: []

kpi:
  metric: "mau_total"
  current: 0
  target: 200000
  unit: "users"
  source: "posthog"
  query: "SELECT count(DISTINCT distinct_id) FROM events WHERE timestamp >= now() - INTERVAL 30 DAY"

revenue_impact:
  amount_inr: 30000000
  confidence: medium
  basis: "200K MAU x 1.5% paid conversion x ₹500 avg booking x 20% commission x 12mo = ₹3.6Cr ARR. Compounded by referral and adopt-a-temple recurring."

est_hours: 40
est_cost_inr: 1900000

success_criteria:
  - "PostHog mau_total >= 200,000 sustained 30d by Q4 month-11 close"
  - "Paid CAC blended <= ₹250 across Meta + Google ads"
  - "Organic share of new signups >= 50% (proves flywheel not just buying users)"
  - "Day-30 retention >= 25% on paid cohort (tripwire threshold)"
  - "8 channels live and instrumented with utm_source on every signup event"
  - "Weekly KPI snapshot recorded in docs/marketing/200k-mau-flywheel-plan.md status row"

agent_brief:
  context_files:
    - "docs/marketing/200k-mau-flywheel-plan.md"
    - "docs/marketing/nri-facebook-ads-q1-spec.md"
    - "docs/marketing/nri-google-ads-scale-q2-spec.md"
    - "docs/marketing/influencer-outreach-10-micro-spec.md"
    - "docs/marketing/influencer-wave-2-30-creators-spec.md"
    - "docs/marketing/referral-cash-program-q1-spec.md"
    - "docs/marketing/referral-v2-leaderboard-spec.md"
    - "docs/marketing/retargeting-engine-spec.md"
    - "docs/marketing/seo-keyword-strategy-spec.md"
    - "docs/marketing/programmatic-seo-50-templates-q2-spec.md"
    - "docs/marketing/whatsapp-cloud-business-verify-spec.md"
    - "docs/marketing/whatsapp-daily-devotional-broadcast-spec.md"
    - "docs/marketing/R-Q4-M-003-handoff.md"
    - "docs/roadmap/_tripwires.yml"
  prompt_skeleton: |
    Weekly cadence (every Monday 09:00 IST):
    1. Scrape PostHog mau_total via _kpi-posthog.mjs scraper. Write to kpi.current here.
    2. Compute weekly delta + 4-week trailing avg. Surface to docs/agent-reports/ as weekly-mau-snapshot-YYYY-MM-DD.md.
    3. Check tripwires (CAC > ₹400 sustained 14d, D7 retention < 15%, monthly burn > ₹8L). If any breached, file P0 GH issue via agent-issue-filer.
    4. If kpi.current >= 200000 AND sustained >= 30d, propose status flip to shipped. Decision agent reviews and auto-flips with shipped_at.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.
  2026-06-15: cycle 1 — populated success_criteria, agent_brief context_files (14 sub-specs), KPI query (PostHog SQL), revenue_impact basis. Authored docs/marketing/R-Q4-M-003-handoff.md. Status stays in_progress; founder_blocker flipped true because U8 PostHog paste + Meta/Google ad account creation + ₹19L paid budget authorization are all founder-side. Agent role on this item is per-week KPI scrape + tripwire monitoring + status auto-flip on KPI hit. All 8 channel sub-specs already exist in docs/marketing/.

tags: ["growth","mau","200k","scale","paid-ads","organic","influencer","referral","posthog","founder-action-required"]
created_at: 2026-06-09T22:09:25.579Z
updated_at: 2026-06-15T00:00:00.000Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters

200K MAU is the gateway scale for:

1. **Series-A defensibility** — investors benchmark devotional/community apps at this MAU as the threshold from "promising" to "fundable at meaningful round size".
2. **Paid economics validation** — at scale, blended CAC stabilizes and CAC:LTV ratio becomes the leading metric for Series-A.
3. **Network effects unlock** — referral flywheel only compounds materially past 100K MAU. The 200K push is the first big paid amplification on top of organic.
4. **Supply-side leverage** — temples and pandits negotiate harder when supply meets 200K demand-side users. Commission % opens up.

This item is the meta-orchestration of 8 marketing sub-items (each shipped separately) coordinated as a single 90-day push during Q4 month-11 (Nov 2026).

# Reference material

- Full plan: `docs/marketing/200k-mau-flywheel-plan.md`
- Handoff doc: `docs/marketing/R-Q4-M-003-handoff.md`
- Channel sub-specs: see `agent_brief.context_files` above (14 docs)
- Tripwires: `docs/roadmap/_tripwires.yml`
- Activation gates blocking launch: U7 (WhatsApp Cloud), U8 (PostHog key) — `docs/activation-gates.md`
