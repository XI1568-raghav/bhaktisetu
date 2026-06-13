# Affiliate Tracking System — UTM Links + Referral Codes + Payouts

> **Roadmap item**: R-Q3-E-009 (P1) · **Authored**: 2026-06-13

## Goal

Q3 ship affiliate tracking system. UTM-based + per-affiliate referral codes + monthly payouts.

## Affiliate types

| Type | Commission | Examples |
|---|---|---|
| Influencer | 15% lifetime | 30+ creators per R-Q4-M-009 |
| Community lead | 10% per booking | WA group admins per R-Q2-G-007 |
| Power user | 5% per booking | Top 100 users w/ 20+ bookings |
| Press | One-time bonus ₹5K | Coverage in tier-1 pubs |

## Schema

```prisma
model Affiliate {
  id              String   @id @default(cuid())
  userId          String   @map("user_id")
  code            String   @unique
  type            AffiliateType
  commissionPct   Decimal  @db.Decimal(5,2) @map("commission_pct")
  status          AffiliateStatus @default(active)
  totalCommissionInr Int   @default(0) @map("total_commission_inr")
  pendingPayoutInr Int     @default(0) @map("pending_payout_inr")
  bankAccount     Json?    @map("bank_account")
  user            User @relation(fields: [userId], references: [id])
  attributions    AffiliateAttribution[]
  @@map("affiliates")
}

model AffiliateAttribution {
  id              String   @id @default(cuid())
  affiliateId     String   @map("affiliate_id")
  bookingId       String   @map("booking_id")
  commissionInr   Int      @map("commission_inr")
  status          AttributionStatus @default(pending)
  paidAt          DateTime? @map("paid_at")
  @@unique([affiliateId, bookingId])
  @@map("affiliate_attributions")
}

enum AffiliateType { influencer community_lead power_user press }
enum AffiliateStatus { active paused terminated }
enum AttributionStatus { pending paid refunded }
```

## Attribution logic

- User clicks affiliate-link (UTM utm_source=aff&utm_term={code}) → cookie 30d
- User signs up + first booking → trigger affiliate-claim hook
- Auto-create AffiliateAttribution row pending
- Monthly cron: marks paid + Razorpay payout if >₹500 threshold

## Engineering tickets

- R-Q3-E-009a: Prisma migration
- R-Q3-E-009b: Affiliate signup + dashboard
- R-Q3-E-009c: Attribution cookie + claim hook
- R-Q3-E-009d: Monthly payout cron
- R-Q3-E-009e: 1099/TDS compliance (post-Q3 once volume >₹50K/mo per affiliate)

## Closes

R-Q3-E-009 — spec shipped.
