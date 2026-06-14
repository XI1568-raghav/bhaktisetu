# R-Q4-M-003 — 200K MAU Milestone Push (Handoff)

> **Roadmap item**: R-Q4-M-003 (P0, marketing, Q4 month-11)
> **Plan**: `docs/marketing/200k-mau-flywheel-plan.md`
> **Branch**: marketing/R-Q4-M-003-batch-2026-06-15
> **Status at ship**: PARTIAL — founder-action-required

## What this item is

Scale Bhaktisetu from current baseline to **200K MAU** by end of Q4 (month-11 target).
Combines 8 channels (SEO + organic social + referral + paid Meta + Google ads + influencer + press/PH + WhatsApp). Authorized first paid-spend budget (~₹19L across Q4 — Nov ₹5.5L / Dec ₹7L / Jan ₹6.5L).

Full channel mix, budget breakdown, organic flywheel math, weekly cadence, KPI dashboard schema, risks + mitigations all documented in `docs/marketing/200k-mau-flywheel-plan.md`.

## Why PARTIAL not GREEN

This is a 40-hour, cross-channel scale-up initiative that requires:

1. **Capital authorization**: ₹19L paid-ads spend across Q4. Pre-Series-A this is gated on founder confirmation that bank balance + projected MRR support the burn. Per `docs/free-tier-budgets.md` and project-wide $0-budget constraint, NO paid spend may be initiated by an agent.
2. **Founder execution**: Channel onboarding (Meta Business Manager, Google Ads account, influencer outreach, WhatsApp Business verification post-U7) — all require founder identity, KYC, payment method linkage.
3. **External KPI source**: KPI `metric: mau_total`, `source: posthog`. PostHog cloud project must be live + identify events firing site-wide before MAU can be tracked. Currently U8 (PostHog key paste) is open per `docs/activation-gates.md`.
4. **Sequencing dependencies**: Depends on `R-Q3-M-005` (organic flywheel maturity) which must hit its KPI before paid amplification ROI is justified.

No code can ship this item alone. The deliverable is a coordinated 8-channel campaign running over 90 days.

## What was already shipped (prior cycles)

- ✅ Flywheel plan (`docs/marketing/200k-mau-flywheel-plan.md`) — channel mix table, paid budget grid, organic loop math, weekly cadence, risks.
- ✅ Per-channel sub-specs (existing files in `docs/marketing/`):
  - `nri-facebook-ads-q1-spec.md` — Meta ads playbook
  - `nri-google-ads-scale-q2-spec.md` — Google ads playbook
  - `influencer-outreach-10-micro-spec.md` + `influencer-wave-2-30-creators-spec.md`
  - `referral-cash-program-q1-spec.md` + `referral-v2-leaderboard-spec.md`
  - `retargeting-engine-spec.md`
  - `seo-keyword-strategy-spec.md` + `programmatic-seo-50-templates-q2-spec.md`
  - `whatsapp-cloud-business-verify-spec.md` + `whatsapp-daily-devotional-broadcast-spec.md`
- ✅ Spec frontmatter populated this cycle with success_criteria + agent_brief + handoff_notes.

## What remains (founder action)

### Pre-launch (week before Nov 1)

1. **U8 PostHog key paste** (Cloudflare Pages env `NEXT_PUBLIC_POSTHOG_KEY`) — rebuild → identify/track events start firing. Without this `mau_total` cannot be measured.
2. **Meta Business Manager** — create + verify business + link payment method + create ad account (₹3L Nov budget).
3. **Google Ads** — same: create account + verify + payment method + ₹2.5L Nov budget.
4. **WhatsApp Cloud Business** (U7) — Meta verification + template approval (devotional templates per `whatsapp-daily-devotional-broadcast-spec.md`).
5. **Influencer outreach list** — 20 micro-influencers (10K-100K, devotional niche) per `influencer-outreach-10-micro-spec.md`. Honorarium budget ₹1L/mo authorized.
6. **PostHog MAU dashboard** — single chart, definition locked = unique users with ≥1 event in trailing 30d.

### Launch (Nov 1 — Q4 month-11 start)

| Week | Channels active | Owner |
|---|---|---|
| W1 | SEO+organic social baseline, referral live | founder |
| W2-3 | Meta + Google ads on, influencer wave-1 (5 creators) | founder + ads ops |
| W4 | Weekly KPI review, paid optimization | founder |
| W5-8 | Influencer wave-2 (15 more), WhatsApp broadcast (post-U7) | founder |
| W9-12 | Press cycle 2 (R-Q4-M-006), scale winning creatives | founder |

### KPI tracking (PostHog)

- **Primary**: `mau_total` — unique users active in trailing 30d. Target: 200,000.
- **Per-channel attribution**: `utm_source` breakdown on signup event. Tracked: organic-seo, organic-social, referral, meta-ads, google-ads, influencer, press, whatsapp.
- **Cohort retention**: D1/D7/D30 by acquisition channel.
- **CAC by channel**: paid spend / new signups, weekly rollup.
- **MRR contribution**: paid bookings × commission, by acquisition channel.

### Tripwires (auto-pause channel if breached)

- Paid CAC > ₹400 sustained 14d → pause that channel
- Day-7 retention < 15% on paid cohort → pause + creative refresh
- Total monthly burn > ₹8L → founder review before continuing
- See `docs/roadmap/_tripwires.yml` (NRI Day-30 retention < 25% by week 8 → fold to NRI-only)

## Why agent-assignable: true but status: in_progress

The roadmap orchestrator (R-ARE) marked this item `agent_assignable: true` because:

- The spec/handoff/plan-doc work IS agentic (this commit).
- Per-week status sync (PostHog MAU number → spec frontmatter `kpi.current`) IS agentic.
- Channel-specific deliverables (ad creatives, blog posts, influencer DMs) are covered by sister roadmap items — each agent-assignable on its own.

But the meta-orchestration of "ship 8 channels in coordinated 90-day push" is founder-led. Status stays `in_progress` until `kpi.current` hits 200K from PostHog scrape, at which point auto-flip to `shipped` per orchestrator rules.

## Verification checklist

- [x] `200k-mau-flywheel-plan.md` exists and references this item
- [x] Spec frontmatter populated (success_criteria + handoff_notes + agent_brief)
- [x] All 8 channel sub-specs exist in `docs/marketing/`
- [x] Tripwires referenced (`docs/roadmap/_tripwires.yml`)
- [x] PR opened on this branch
- [ ] U8 PostHog key paste DONE (founder)
- [ ] Meta Business Manager + ad account live (founder)
- [ ] Google Ads account live (founder)
- [ ] 20 influencer DMs sent wave-1 (founder)
- [ ] First weekly KPI snapshot recorded after Nov 1 launch (founder + orchestrator)

## Files touched this cycle

- `docs/roadmap/items/Q4/marketing/003-200k-mau-milestone-push-paid-ads-organic-influence.md` — spec populated (success_criteria + handoff_notes + agent_brief.context_files).
- `docs/marketing/R-Q4-M-003-handoff.md` — this file.
- `docs/roadmap/_ship-log-2026-06-15.md` — ship-log row appended.
