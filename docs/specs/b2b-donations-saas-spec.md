# B2B Donations SaaS — Temple Dashboard + Donor CRM + Split Payout

> **Roadmap item**: R-Q3-P-002 (P0) · **Authored**: 2026-06-13 · **Extends**: B2B whitelabel (P-006) + Adopt-a-Temple (P-002-Q4)

## Goal

Sell donor management SaaS to verified temples. Temple gets: donor CRM + recurring donation tracking + 80G receipt automation + Razorpay split payout. Revenue: ₹999-4,999/mo per temple.

## Differentiation

Existing donor-management products (Tally NGO module, NGOBox) are batch-tool-based + manual. Bhaktisetu's offering: real-time + Razorpay-integrated + 80G-auto + multi-currency for NRI donors.

## Tiers

| Tier | Monthly | Features |
|---|---|---|
| **Basic** ₹999 | Up to 500 donors + 1 admin | Donor list + manual recording + basic 80G receipts |
| **Pro** ₹2,999 | Up to 5K donors + 5 admins | + Recurring donations + auto-debit + custom branding + analytics |
| **Enterprise** ₹4,999+ | Unlimited + API access | + B2B API + multi-temple management + white-label option |

## Core features

### Donor CRM

- Donor profile: name, PAN, phone, email, donation history, communication log
- Custom tags (e.g. "festival donor", "monthly", "VIP")
- Bulk import from CSV
- Donor segmentation for outreach

### Recurring donation tracking

- Razorpay subscription integration
- Failed-payment retry workflow
- Cancellation reason capture
- Lifetime donor value (LDV) per profile

### 80G receipt automation

- Auto-issue PDF receipt per donation (synced w/ Foundation 80G # via Bhaktisetu Foundation parent)
- Annual consolidated receipt at FY-end
- Email + WA delivery
- Form 10BD compliance (auto-aggregate per donor for IT department reporting)

### Razorpay split payout

- Donations flow into temple's Razorpay sub-account (Razorpay Route)
- Bhaktisetu platform fee auto-deducted (15-20% per tier)
- Daily payout to temple's bank account

### Analytics dashboard

- Monthly donation trend
- Donor acquisition + churn
- Average donation size
- Donor cohort retention
- Top 10 donors

## Data model

```prisma
model TempleDonorProfile {
  id            String   @id @default(uuid()) @db.Uuid
  templeId      String   @map("temple_id") @db.Uuid
  donorName     String
  donorPan      String?  @map("donor_pan")
  donorPhone    String?  @map("donor_phone")
  donorEmail    String?  @map("donor_email")
  tags          String[]
  totalDonatedInr Decimal @map("total_donated_inr") @db.Decimal(10, 2)
  lastDonatedAt DateTime? @map("last_donated_at")
  isRecurring   Boolean  @default(false) @map("is_recurring")
  notes         String?
  createdAt     DateTime @default(now()) @map("created_at")

  @@index([templeId, totalDonatedInr])
  @@index([templeId, lastDonatedAt])
}

model TempleSubscriptionTier {
  id          String   @id @default(uuid()) @db.Uuid
  templeId    String   @unique @map("temple_id") @db.Uuid
  tier        String   // "basic" | "pro" | "enterprise"
  monthlyInr  Int      @map("monthly_inr")
  status      String   @default("active")
  startedAt   DateTime @default(now()) @map("started_at")
  cancelledAt DateTime? @map("cancelled_at")
}
```

## Engineering tickets to file

- R-Q3-P-002b: donor CRM endpoints (CRUD)
- R-Q3-P-002c: Razorpay Route integration for split payout
- R-Q3-P-002d: 80G receipt auto-generator
- R-Q3-P-002e: analytics dashboard
- R-Q3-P-002f: bulk CSV import flow

## Revenue model

10 temples × ₹2,000 avg/mo = ₹20K MRR from B2B Donations alone (added to L4 lane in MRR tracking).

## Closes

R-Q3-P-002 — spec shipped.
