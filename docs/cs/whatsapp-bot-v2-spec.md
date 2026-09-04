# WhatsApp Bot v2 — Auto-Resolve Top 10 Intents

> **Roadmap item**: R-Q3-CS-003 (P1) · **Authored**: 2026-06-13

## Goal

Q3 ship WhatsApp bot v2 auto-resolving top 10 customer intents. Reduces founder T1 load 70%.

## Top 10 intents (per Q1+Q2 macro analysis)

> **Correction 2026-09-02 (`OPS-10`).** This document is a Q3 build spec and is left as
> a proposal, with one exception: intent **5** presumed a fact that is not true. Its
> auto-resolve method used to read *"Auto-reply pricing table for user's geo"*, which
> assumes a geo-varying USD price list exists to reply with. It does not. **Stripe was
> removed from the codebase on 2026-08-11** (`apps/api/src/lib/env.ts:45-46`,
> `services/payment.service.ts:2506-2517`); Razorpay is the only live rail and it
> settles INR only (`apps/api/src/routes/bookings.ts:2283`, an unconditional
> `const currency = 'INR'`), and no replacement international processor has been
> chosen. The 9-10x NRI multiplier was also removed from the booking path on 2026-08-10
> after it billed a ₹1,100 puja as $9,900 (`RV-01`,
> `apps/api/src/routes/bookings.ts:2239-2251`). Building this handler as specified would
> ship a bot that quotes prices nobody can be charged, automatically, at WhatsApp
> volume — so the row is marked `[verify]` rather than left as an implementable ticket.
> The other nine intents are unaffected.

| # | Intent | Auto-resolve method |
|---|---|---|
| 1 | Booking status query | Fetch BS-id from DB → reply w/ status + video proof link |
| 2 | Refund request (eligible) | Auto-issue refund via Razorpay API + confirm reply |
| 3 | Pandit no-show | Auto-escalate to ops + WA temple liaison |
| 4 | Reschedule booking | Generate reschedule link → user picks slot |
| 5 | NRI pricing question | [verify — Stripe was removed; the NRI rail is undecided] · no USD or geo-varying price list exists to auto-reply with; escalate to founder until one does |
| 6 | 80G receipt clarification | Auto-reply stating Darshya holds no Section 80G registration, so the numbered receipt PDF is proof of payment and not a tax-exemption certificate (copy: apps/api/src/lib/eighty-g.ts NO_80G_DISCLOSURE) |
| 7 | Festival booking waitlist | Add to PujaInterest table |
| 8 | Wallet credit balance | Fetch wallet → reply balance |
| 9 | Referral code share | Generate user's code → reply |
| 10 | "How do I X" generic | Route to AI Pandit Q&A |

## Tech stack

- WhatsApp Cloud API (per R-Q1-M-010)
- LLM intent classifier (Groq llama-3.1-70b)
- Lookup against DB tables (Bookings + Wallet + Referrals)
- Reply within 5 sec via async webhook

## Fallback

- Intent confidence <0.6 → escalate to founder WA
- Failed auto-action → escalate to founder
- User asks for human → escalate w/ "Founder will respond within 4hr"

## Q3 success

- Top 10 intents auto-resolve >70% accuracy
- Founder T1 load drops from 50/day to 15/day
- Avg response time <30 sec

## Engineering tickets

- R-Q3-CS-003a: Intent classifier prompt
- R-Q3-CS-003b: 10 auto-action handlers
- R-Q3-CS-003c: Fallback escalation logic
- R-Q3-CS-003d: Accuracy monitoring dashboard

## Closes

R-Q3-CS-003 — spec shipped.
