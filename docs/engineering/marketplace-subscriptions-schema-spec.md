# Marketplace Subscriptions Schema + Razorpay Subscription Wiring

> **Roadmap item**: R-Q1-E-017 (P0) · **Authored**: 2026-06-13

## Goal

Schema + Razorpay subscription wiring for recurring marketplace SKUs (AI Pandit ₹199/mo + Cow Adoption ₹501/mo + Premium membership). Targets recurring revenue layer Q2.

## Prisma model

```prisma
model Subscription {
  id              String   @id @default(cuid())
  userId          String   @map("user_id")
  productType     SubscriptionProduct @map("product_type")
  productId       String?  @map("product_id")  // cow_id for cow-adopt, null for ai-pandit
  monthlyInr      Int      @map("monthly_inr")
  status          SubscriptionStatus @default(active)
  razorpaySubId   String?  @unique @map("razorpay_subscription_id")
  startedAt       DateTime @map("started_at")
  currentPeriodEnd DateTime @map("current_period_end")
  cancelledAt     DateTime? @map("cancelled_at")
  pausedAt        DateTime? @map("paused_at")
  resumeAt        DateTime? @map("resume_at")
  user            User @relation(fields: [userId], references: [id])
  charges         SubscriptionCharge[]
  @@index([userId, status])
  @@map("subscriptions")
}

model SubscriptionCharge {
  id              String   @id @default(cuid())
  subscriptionId  String   @map("subscription_id")
  amountInr       Int      @map("amount_inr")
  status          ChargeStatus @default(pending)
  razorpayPaymentId String? @unique @map("razorpay_payment_id")
  chargedAt       DateTime? @map("charged_at")
  failureReason   String?  @map("failure_reason")
  subscription    Subscription @relation(fields: [subscriptionId], references: [id])
  @@index([subscriptionId, chargedAt])
  @@map("subscription_charges")
}

enum SubscriptionProduct { ai_pandit cow_adoption premium }
enum SubscriptionStatus { active paused cancelled past_due }
enum ChargeStatus { pending succeeded failed refunded }
```

## Razorpay subscription wiring

```typescript
// apps/api/src/services/razorpay-subscription.ts
export async function createSubscription(opts: {
  userId: string
  productType: SubscriptionProduct
  monthlyInr: number
  productId?: string
}) {
  const planId = process.env[`RAZORPAY_PLAN_${opts.productType.toUpperCase()}`]
  const sub = await razorpay.subscriptions.create({
    plan_id: planId,
    customer_notify: 1,
    quantity: 1,
    total_count: 12,  // 1 year auto-renew
  })
  
  const dbRow = await prisma.subscription.create({ data: {
    userId: opts.userId, productType: opts.productType,
    productId: opts.productId, monthlyInr: opts.monthlyInr,
    razorpaySubId: sub.id, startedAt: new Date(),
    currentPeriodEnd: addMonths(new Date(), 1),
  }})
  return { subscription: dbRow, paymentLink: sub.short_url }
}
```

## Webhook handler

`subscription.charged` → mark SubscriptionCharge succeeded + extend period
`subscription.cancelled` → mark Subscription cancelled
`subscription.paused` → mark paused
`subscription.activated` → resume

## Engineering tickets

- R-Q1-E-017a: Prisma migration
- R-Q1-E-017b: Razorpay subscription service
- R-Q1-E-017c: Webhook handler for sub events
- R-Q1-E-017d: Admin subscriptions dashboard

## Closes

R-Q1-E-017 — spec shipped.
