# TALENT Advisory — 2026-W40

> Auto-generated weekly. Decision Agent reads this. Founder override OK.

## Owned items snapshot
- Total: 4
- Planned: 0
- In progress: 1
- Shipped: 3
- Verified: 0
- Blocked: 0

## Top 5 ready-to-ship (revenue/hour desc)
_None ready (DAG blocked or all in progress)_

## Founder-blocked
- R-Q4-H-001 blocked by U7: 3rd contractor hire — full-stack engineer for scale workstream

## Live KPIs (this role)
_No matching KPIs cached yet — run orchestrator first cycle_

## Dept doctrine (top 30 lines of 06-talent.md)
```
# 06 — Talent: A Solo Founder's Capacity Plan

Author: Head of Talent (which is also the founder, which is also me)
Date: 2026-04-27
Reality: 1 person, $0 hiring budget, 6-month runway of sweat.

This is not an org chart. It is a triage plan.

## 1. The brutal time math

A two-sided spiritual marketplace has five non-negotiable workstreams. Hours/week, honestly:

| Workstream | At 100 users | At 1,000 users |
|---|---|---|
| Supply moderation (priest KYC, listing review, fraud) | 4 | 18 |
| Customer support (refunds, "my pooja didn't happen", WhatsApp) | 3 | 20 |
| Content (livestream curation, festival calendar, blog/SEO) | 5 | 12 |
| Product + engineering (code, bugs, releases, infra) | 30 | 28 |
| Ops + growth (payments reconcile, analytics, marketing, partnerships) | 8 | 14 |
| **Total** | **50** | **92** |

A 60-hour week is the ceiling I'll admit to. At 100 users I am 10 hours under and brittle. At 1,000 users I am 32 hours **over** and the marketplace will eat me. The breaking point is roughly 400-500 active users — that's where unbundling stops being optional.

## 2. What MUST stay solo for the first 6 months

**Code, security calls, money decisions.** Every line of payment, auth, and KYC code touches my Razorpay merchant account, RBI-classified user data, and the founder's personal liability under the Packer Speed proprietorship. A contractor making a careless commit that exposes Aadhaar fragments or breaks a webhook signature check is a regulatory problem I cannot delegate. Until there is a co-founder with equity skin, the production deploy key, the Razorpay dashboard password, and the Firebase service account stay on one laptop.

Money decisions — refund policy, priest payout terms, take-rate changes, anything that touches the unit economics — also stay solo. Not because I'm precious, but because at this stage these decisions are the product. A support contractor approving a ₹5,000 refund without context can wipe a week of margin. The rule for the first 6 months: anyone external can *recommend*, the founder *decides*.

## 3. What can be unbundled cheaply
```

## Recommended next-cycle prompts for Decision Agent
_Defer to founder — all TALENT items either in flight or blocked_
