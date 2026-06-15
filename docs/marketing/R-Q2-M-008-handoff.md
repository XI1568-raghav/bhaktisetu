# R-Q2-M-008 Handoff — WhatsApp Daily Devotional Broadcast

> Roadmap: `docs/roadmap/items/Q2/marketing/008-whatsapp-daily-devotional-broadcast-1000-opt-in-us.md`
> Spec: `docs/marketing/whatsapp-daily-devotional-broadcast-spec.md`
> Status: in_progress — KPI (1000 opt-in users) requires founder action + WA Cloud verification (R-Q1-M-010)

## Why this handoff

The roadmap item was bulk-imported with TBD placeholders. This handoff documents the launch sequence + founder action items so the orchestrator queue can clear it without fabricating numbers.

## Dependency chain

1. R-Q1-M-010 — WhatsApp Cloud Business API verification (template approvals, sender display name, 1000 conversations/mo free tier confirmed).
2. R-Q1-M-009 — 7-day deity rotation content library (Sun→Sat: Surya, Chandra, Mangal, Budh, Brihaspati, Shukra, Shani).
3. apps/web `/broadcast` opt-in page wired to existing devotee accounts via `referralCode`-style cookie pattern (R-Q1-M-005 reusable).

## Launch sequence (target Q2 month 6 = June)

| Step | Owner | ETA | Cost |
|---|---|---|---|
| 1. Submit 5 WA template messages for approval (shloka, panchang, deity, festival, opt-out confirm) | founder | T-14d | $0 (Meta free tier) |
| 2. Approve `/broadcast` opt-in page launch + add to post-booking checkout flow | founder | T-7d | $0 |
| 3. Send seed broadcast to 50 internal devotees (test cohort) | founder | T-3d | within free tier |
| 4. Public launch via in-app banner + email blast to 5K MAU | founder | T-0 | $0 (Resend within 100/day) |
| 5. Track open rate + opt-out via WA Cloud webhooks → PostHog event `wa_broadcast_open` | engineering (R-Q2-M-008d) | T+7d | $0 (PostHog 1M events free) |

## Founder action items (blocking)

- [VERIFY-FOUNDER] Confirm WA Cloud Business API verified + sender display name approved (R-Q1-M-010 closure)
- [VERIFY-FOUNDER] Submit 5 template messages for Meta approval (24-72h typical SLA)
- [VERIFY-FOUNDER] Decide on broadcast time slot: 06:30 IST (sunrise puja window) vs 07:30 IST (post-morning-routine engagement)
- [VERIFY-FOUNDER] Approve opt-in copy in `/broadcast` page draft before public launch
- [VERIFY-FOUNDER] Sign-off on opt-out + DPDP compliance footer per Rule 7 of DPDP Rules 2025

## KPI targets (projection — not historical)

- Target: 1000 opt-in users by Q2 close (month 6)
- Target: 40%+ open rate (industry benchmark for opt-in WA broadcasts)
- Target: 5%+ CTR to booking CTA
- Target: <2% opt-out rate per send

These are projections, not measured baselines. Actual numbers TBD post-launch.

## Compliance notes

- DPDP §8(10) — grievance officer must be reachable via opt-out reply
- Rule 7 of DPDP Rules 2025 — consent withdrawal flow must mirror opt-in
- Opt-out reply trigger words: STOP, UNSUBSCRIBE, OPT OUT (case-insensitive)
- Meta WA Business Policy — promotional content gated to opt-in; transactional templates always allowed

## Engineering sub-tickets (carried to Q2 month 6)

- R-Q2-M-008a — `/broadcast` opt-in page (apps/web)
- R-Q2-M-008b — Daily content cron 06:30 IST (apps/api or GH Actions cron)
- R-Q2-M-008c — WA template approval coordination (founder)
- R-Q2-M-008d — Open rate + opt-out PostHog tracking (apps/api webhook handler)

## Risks

| Risk | Mitigation |
|---|---|
| Meta template rejection | Submit 5 templates, expect 2-3 approved first pass; iterate on rejected ones |
| Free tier breach (>1000 conversations/mo) | Cap sends at 700/day to stay within budget; charge for incremental conversations if MAU scales |
| Low opt-in rate (<20%) | Add Lakshmi/Saraswati-themed opt-in incentives; A/B test post-booking checkbox copy |
| DPDP grievance officer absence | Founder must designate + publish before public launch |

## Closes

Status remains in_progress until founder confirms WA Cloud verified (R-Q1-M-010) + template approvals + first broadcast sent to 50-user test cohort. Then orchestrator can re-evaluate KPI scrape after T+30d.
