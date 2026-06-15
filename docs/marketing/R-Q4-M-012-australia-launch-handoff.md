# R-Q4-M-012 — Australia NRI Launch Campaign (Sydney + Melbourne + WA Broadcast)

> **Roadmap item**: R-Q4-M-012 (P1, marketing, 28h est)
> **Status**: in_progress — KPI (2000 AU signups) requires founder action
> **Sibling**: R-Q4-G-001 (AU geo launch), R-Q4-M-013 (Canada launch)
> **Predecessors**: R-Q2-G-007 (AU diaspora seed), R-Q2-M-006 (NRI ad split)
> **Authored**: 2026-06-15 (batch r4)

## Why this matters

Australia hosts ~720K Indian-origin residents (2021 ABS census) concentrated in Sydney (Parramatta / Harris Park / Wentworthville), Melbourne (Tarneit / Wyndham / Glen Waverley), and Brisbane. Median household income A$95K+, high disposable income for devotional services. Time-zone overlap with IST (3.5-5.5h) suits live darshan slots better than US NRIs. Direct flights via Singapore Airlines / Qantas to BLR/DEL/BOM make Yatra packages frictionless.

Sri Mandir does not currently run a localized AU funnel. First-mover window open through Q4 2026.

## KPI (target)

| Metric | Current | Target | Source |
|---|---|---|---|
| AU monthly signups | 0 | 2000 (target) | PostHog filter `geo_country=AU` |
| AU MRR | 0 | A$8K (target) | Stripe filter |
| Community partnerships | 0 | 3+ Hindu temple/cultural orgs | manual log |

> Numbers are **target / projection**, not committed forecast. Refine after first 30-day cycle review.

## Channel scaffold (5 lanes)

### Lane 1 — WhatsApp diaspora broadcast (founder-execution required)

- **Target groups**: Sydney Hindu Community, Melbourne Hindu Friends, Brisbane Indians, Perth Telugu Sangam, Adelaide Tamil Sangam — 5 groups across 3-5 cities.
- **Founder action required**:
  - {{FOUNDER_TASK}} Identify named admin contact per group (no fabricated names).
  - {{FOUNDER_TASK}} Request join permission, introduce Bhaktisetu personally.
  - {{FOUNDER_TASK}} Get explicit broadcast permission per group (DPDP §6 consent + WA Cloud API ToS).
- **Content cadence**: 1 community-value message per week (panchang, festival reminder, free puja guide), 1 soft product mention per month. Never spam.
- **Frequency cap**: enforced via `services/wa-broadcast-throttle.ts` (already exists per R-Q2-G-007).

### Lane 2 — Facebook community ads (founder-execution required)

- **Target groups** (organic post + paid boost):
  - "Sydney Hindu Community" (~40K members, public listing)
  - "Melbourne Indians" (~80K members)
  - "Brisbane Indians" (~25K)
  - "Perth Indians" + "Adelaide Indians" (secondary)
- **Founder action required**:
  - {{FOUNDER_TASK}} Request post permission from each group's admin (do not auto-post).
  - {{FOUNDER_TASK}} Paid boost: A$200/mo budget cap (within R-Q2-M-006 NRI ad split).
- **Creative**: 3 variants — live aarti reel / Yatra package carousel / festival countdown.

### Lane 3 — Google Ads AU

- **Budget**: A$30/mo (per R-Q2-M-006 NRI split allocation — verify with founder).
- **Keywords**:
  - "remote puja from australia"
  - "online aarti india"
  - "vedic astrologer sydney"
  - "online pandit booking nri"
- **Landing pages**: `/nri/au` (TBD — Q4 task, currently routes to `/nri`), `/yatra-packages?utm_source=googleads&utm_campaign=au-launch`.
- **Tracking**: UTM tags propagate to PostHog, attribution dashboard.

### Lane 4 — Influencer / creator partnerships (founder-execution required)

- **Targets** (research only — do not commit budget without founder approval):
  - {{FOUNDER_TASK}} Identify 2 Sydney-based NRI Hindu influencers (50K-500K followers, devotional/lifestyle niche).
  - {{FOUNDER_TASK}} Identify 1 Melbourne-based NRI creator (Tamil / Telugu / Gujarati community).
  - {{FOUNDER_TASK}} Reach out, negotiate rate (typical A$200-A$500 per sponsored post).
- **Brief template**: see `docs/marketing/influencer-brief-template.md` (if not present, reuse R-Q2-M-012 Canada brief structure).
- **Compliance**: AU ACMA disclosure required (#ad #sponsored).

### Lane 5 — Local SEO / temple partnerships

- **Target temples** (public-domain institutional contacts):
  - Hindu Council of Australia (Sydney) — https://hinducouncil.com.au/
  - Sri Mandir Sydney — https://srimandir.com.au/
  - Shri Shiva Vishnu Temple Carrum Downs (Melbourne) — https://hindutemple.org.au/
  - BAPS Swaminarayan Sandhya (Sydney / Melbourne) — https://baps.org/
- **Founder action required**:
  - {{FOUNDER_TASK}} Email each temple's public contact requesting partnership listing (cross-promotion: their events on our calendar in exchange for Bhaktisetu link on their site).

## Launch sequence (12-week plan)

| Week | Lane(s) | Owner | Deliverable |
|---|---|---|---|
| 1 | All | Founder | Secure 3-5 WA group admin contacts |
| 2 | 1 + 5 | Founder | First community value WA post; first temple email |
| 3 | 2 | Founder | First FB group organic post (Sydney) |
| 4 | 3 | Engineering | Launch Google Ads AU (A$30/mo cap) |
| 5 | 4 | Founder | First influencer outreach round |
| 6 | All | Founder + Eng | Mid-funnel review — PostHog AU dashboard |
| 7-8 | Iterate | Founder | Double down on best-performing lane |
| 9 | 1 + 2 | Founder | Festival tie-in (Diwali / Navratri timing) |
| 10 | 4 | Founder | First paid influencer post live |
| 11 | All | Founder | Survey first 100 AU signups for retention drivers |
| 12 | All | Founder + Eng | Quarter review, fold into R-Q1-2027 plan |

## Compliance checklist (mandatory before launch)

- [ ] AU Spam Act 2003 — explicit consent before adding to email/WA broadcast list
- [ ] AU Privacy Act 1988 + APP 7 — direct marketing opt-out in every message
- [ ] WhatsApp Business API ToS — opt-in capture stored, opt-out honored within 24h
- [ ] ACMA influencer disclosure — #ad / #sponsored on all paid creator posts
- [ ] AU Consumer Law — no misleading claims about puja outcomes ("guaranteed prosperity" etc. banned)
- [ ] DPDP §6 (India side) — explicit consent stored for AU residents in PostHog/Mixpanel
- [ ] GST registration check — if AU revenue exceeds A$75K/yr threshold, register for AU GST

## Engineering scaffold (already shipped)

| Component | Path | Status |
|---|---|---|
| WA broadcast throttle | `apps/api/src/services/wa-broadcast-throttle.ts` | Exists (R-Q2-G-007) |
| NRI landing page | `apps/web/app/nri/page.tsx` | Exists |
| Yatra packages page | `apps/web/app/yatra-packages/page.tsx` | Exists |
| PostHog geo filter | dashboard pre-config | TBD per founder |
| UTM tracking | `lib/utm.ts` | Exists |

## Engineering work pending (this item)

| Task | Owner | Est | Status |
|---|---|---|---|
| `/nri/au` localized landing page (AUD pricing, AU testimonials [VERIFY-FOUNDER]) | Eng | 6h | Future batch |
| AU timezone-aware live darshan slot picker | Eng | 4h | Future batch |
| Stripe AUD currency support verify (existing NRI infra) | Eng | 2h | Future batch |
| PostHog AU dashboard config | Founder + Eng | 2h | Founder gated |

## Founder action checklist (sequenced)

1. {{FOUNDER_TASK}} Approve budget: A$30/mo Google Ads + A$200/mo FB boost + A$1000 influencer pool for Q4
2. {{FOUNDER_TASK}} Identify and contact 5 WA group admins (Sydney/Melbourne/Brisbane)
3. {{FOUNDER_TASK}} Identify and contact 4 FB group admins
4. {{FOUNDER_TASK}} Identify and contact 4 temple partnership leads
5. {{FOUNDER_TASK}} Identify and contact 3 NRI creators
6. {{FOUNDER_TASK}} Set Stripe to accept AUD (verify with existing NRI Stripe account)
7. {{FOUNDER_TASK}} Configure PostHog AU geo dashboard
8. {{FOUNDER_TASK}} Confirm DPDP §6 + AU Privacy Act compliance with legal advisor

## Risks

- **AU community gatekeeping**: Hindu groups skeptical of for-profit ventures; community-value-first cadence is non-negotiable.
- **Time-zone live darshan UX**: Sydney AEST is IST+5.5h, Perth AWST is IST+2.5h; need slot picker that surfaces feasible windows or risk low engagement.
- **Stripe AUD onboarding**: if not already enabled, Stripe AU onboarding takes 2-4 weeks (founder action).
- **Festival timing risk**: if launch slips past Diwali 2026 (Oct/Nov), retention may halve — Q4 is the seasonal peak window.

## Verification (post-launch, 30 days)

- PostHog AU signups dashboard >= 500 (intermediate target before 2000 quarterly)
- Stripe AU revenue >= A$1500/mo by week 8
- WA broadcast open rate >= 35% (industry benchmark)
- FB organic post engagement rate >= 3% (above 1.5% AU baseline)
- Zero ACMA / DPDP complaints

## Closes

R-Q4-M-012 — scaffold + handoff doc shipped. **Status remains `in_progress` until founder executes lanes 1, 2, 4, 5 and 2000 AU signup KPI hits.** Engineering work (lanes 3, AU landing page, timezone picker) deferred to future batches per founder budget approval.
