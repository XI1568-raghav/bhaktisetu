# Gurukul Payment Escrow Backend — 3-Way + Dispute Resolution

> **Roadmap item**: R-Q4-E-013 (P2) · **Authored**: 2026-06-13 · **Sibling**: R-Q4-P-005 UX

## Goal

Q4 ship gurukul escrow backend. 3-way (guru/student/parent) + dispute resolution.

## Schema

```prisma
model GurukulEscrow {
  id              String   @id @default(cuid())
  lessonId        String   @unique @map("lesson_id")
  parentUserId    String   @map("parent_user_id")
  guruUserId      String   @map("guru_user_id")
  amountInr       Int      @map("amount_inr")
  status          EscrowStatus @default(held)
  releasedAt      DateTime? @map("released_at")
  disputedAt      DateTime? @map("disputed_at")
  disputeReason   String?  @map("dispute_reason")
  resolvedAt      DateTime? @map("resolved_at")
  resolution      EscrowResolution?
  @@map("gurukul_escrows")
}

enum EscrowStatus { held released disputed refunded }
enum EscrowResolution { full_release partial_release full_refund }
```

## Lifecycle

1. Lesson booked + parent pays → row created `status=held`
2. Lesson conducted via Jitsi
3. Auto-confirm 24hr or both-confirm → `status=released`
4. Weekly Razorpay batch payout to guru
5. Parent disputes 48hr window → `status=disputed`
6. Founder/admin reviews recording + resolves

## Engineering tickets

- R-Q4-E-013a: Prisma migration
- R-Q4-E-013b: Auto-confirm 24hr cron
- R-Q4-E-013c: Weekly payout batch
- R-Q4-E-013d: Dispute resolution admin UI

## Closes

R-Q4-E-013 — spec shipped.
