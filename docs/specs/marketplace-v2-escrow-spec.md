# Marketplace v2 Escrow — 7-day Payout Hold + Auto-release on Video Proof

> **Roadmap item**: R-Q4-E-007 (P0) · **Authored**: 2026-06-13

## Goal

Hold pandit/temple payout for 7 days post-booking. Auto-release if (a) video proof uploaded + (b) no dispute opened. Manual hold if dispute pending.

## State machine for payout

```
[pending] (T+0 to T+7) → [released] (video proof + no dispute) OR [held] (dispute) → resolve → [released | reversed]
```

## Data model

```prisma
model PayoutEscrow {
  id              String   @id @default(uuid()) @db.Uuid
  bookingId       String   @map("booking_id") @db.Uuid
  recipientType   String   @map("recipient_type") // "pandit" | "temple"
  recipientId     String   @map("recipient_id") @db.Uuid
  amountPaise     Int      @map("amount_paise")
  state           String   @default("pending")
  scheduledReleaseAt DateTime @map("scheduled_release_at")
  releasedAt      DateTime? @map("released_at")
  reversedAt      DateTime? @map("reversed_at")
  reversalReason  String?  @map("reversal_reason")
  createdAt       DateTime @default(now()) @map("created_at")

  @@index([state, scheduledReleaseAt])
  @@map("payout_escrows")
}
```

## Release cron

Daily cron checks:
- All `pending` escrows w/ scheduledReleaseAt < NOW
- For each: verify video proof uploaded + no open dispute
- If yes → flip to `released` + queue Razorpay payout
- If no → flip to `held` + alert admin

## Razorpay Route integration

Use Razorpay Route to split + hold payouts. Bhaktisetu Foundation = primary merchant, pandits/temples = sub-merchants.

## Tickets

- R-Q4-E-007a: Razorpay Route setup
- R-Q4-E-007b: Escrow Prisma model + state machine
- R-Q4-E-007c: Release cron
- R-Q4-E-007d: Admin manual-release UI

## Closes

R-Q4-E-007 — spec shipped.
