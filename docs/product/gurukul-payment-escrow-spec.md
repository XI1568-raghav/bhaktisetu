# Gurukul Payment Escrow Spec — Guru/Student/Parent Trust

> **Roadmap item**: R-Q4-P-005 (P1) · **Authored**: 2026-06-13 · **Sibling**: R-Q4-E-013 backend

## Goal

Q4 ship gurukul payment escrow UX. Guru/student/parent 3-way trust + dispute-resolution flow.

## Trust model

- Parent pays Bhaktisetu (escrow holds funds)
- Lesson happens (verified via attendance + parent confirmation)
- Bhaktisetu releases funds to guru post-lesson (weekly batch)
- Dispute window 48hr — if parent disputes, hold in escrow until founder review

## Per-lesson flow

1. Lesson booked (per R-Q3-P-004 subscription)
2. ₹X charged to parent, held in escrow
3. Lesson conducted (Jitsi attendance auto-tracked)
4. Both guru + parent confirm "lesson complete" (or auto-confirm after 24hr)
5. Funds released to guru wallet
6. Weekly Razorpay batch payout to guru bank

## Dispute flow

- Parent files dispute within 48hr
- Bhaktisetu reviews recording (if Jitsi recording enabled w/ consent)
- Outcome: full refund / partial / no-refund
- Repeated disputes by guru → suspension

## Engineering tickets

- R-Q4-P-005a: Escrow Prisma model
- R-Q4-P-005b: Lesson-complete confirmation flow
- R-Q4-P-005c: Weekly batch payout
- R-Q4-P-005d: Dispute UI + admin review

## Closes

R-Q4-P-005 — spec shipped.
