# Multilingual Macros — Tamil + Telugu + Bengali + Marathi

> **Roadmap item**: R-Q2-CS-003 (P1) · **Authored**: 2026-06-13 · **Extends**: R-Q1-CS-001 v1 (10 P0 macros English+Hindi)

## Goal

Translate 10 v1 macros + add 15 net-new macros (25 total per R-Q2-HR-002) into Tamil + Telugu + Bengali + Marathi for regional support.

## Translation pipeline

1. Master English v1 in `docs/cs/macros-v1.md` (shipped R-Q1-CS-001)
2. Hindi translation v1.5 (founder reviewed): `docs/cs/macros-hi.md`
3. Tamil: contracted native speaker review (₹500/macro × 25 = ₹12.5K)
4. Telugu: same (₹12.5K)
5. Bengali: same (₹12.5K)
6. Marathi: same (₹12.5K)

Total Q2 spend: ₹50K (one-time).

## 25-macro list (10 from v1 + 15 new)

> **Correction 2026-09-02 (`OPS-10`).** Item 23 used to read *"NRI Stripe payment
> confirmation"*. **Stripe was removed from the codebase on 2026-08-11**
> (`apps/api/src/lib/env.ts:45-46`, `services/payment.service.ts:2506-2517`); Razorpay
> is the only live rail and it settles INR only (`apps/api/src/routes/bookings.ts:2283`,
> an unconditional `const currency = 'INR'`), and no replacement international processor
> has been chosen. The item is left in place so the list stays 25 items — the ₹50K
> budget above is priced at ₹500/macro × 25 — but it is marked **blocked**: it is a
> work order to pay four native speakers to translate a confirmation message for a rail
> that does not exist, and the copy cannot be written until the rail and its wording are
> known. Item **8 ("NRI USD pricing question")** is the existing Macro 8 in
> `docs/cs/macros-v1.md`, which is now marked **DO-NOT-SEND** for the same reason — do
> not commission translations of it either until it is rewritten. The other 23 items in
> this list are unaffected and can proceed.

### v1 (R-Q1-CS-001)
1. SLA-breach apology
2. Priest no-show
3. Video proof delayed
4. Payment failed (Razorpay)
5. Booking date confusion
6. Refund processed confirmation
7. Reschedule booking
8. NRI USD pricing question
9. Festival booking waitlist
10. Founder escalation

### New v2 (R-Q2-CS-003)
11. Live darshan stream offline
12. Pandit profile not loading
13. Gift puja to recipient
14. 80G receipt clarification
15. Wallet credit / referral
16. Yatra package inquiry
17. AI Pandit error
18. Gaushala adoption inquiry
19. Astrology consultation booking
20. Wedding muhurat inquiry
21. Account deletion request (DPDP)
22. Data export request (DPDP)
23. NRI payment confirmation — **BLOCKED**, do not commission: [verify — Stripe was removed; the NRI rail is undecided]
24. WhatsApp opt-in/out
25. App crash report

## Per-macro structure

Each macro file: trigger / tone / English text / Hindi / Tamil / Telugu / Bengali / Marathi / SLA / follow-up note.

## Engineering tickets

- R-Q2-CS-003a: Translation contracts w/ 4 native speakers
- R-Q2-CS-003b: Macro repo restructure (1 file per macro, multi-lang)
- R-Q2-CS-003c: Admin support tool lang switcher

## Closes

R-Q2-CS-003 — spec shipped.
