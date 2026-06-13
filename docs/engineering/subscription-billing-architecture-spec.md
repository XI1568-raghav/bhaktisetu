# Subscription Billing Architecture Spec

> Unified billing platform for all recurring products: AI Pandit ₹199/mo + Adopt-a-Cow ₹501/mo + Adopt-a-Temple ₹501-2,501/mo + Gurukul ₹999-3,999/mo + Recurring Donations.

## Why centralize

- 5 different recurring products = 5 different billing flows currently
- Each product has separate Razorpay subscription integration
- Customer manages multiple subscriptions independently
- Unified billing = better customer experience + simpler ops

## Architecture

```
User signs up for recurring product
  ↓
Subscription record created in DB (per R-Q1-E-017 schema)
  ↓
Razorpay subscription created (per product type)
  ↓
Monthly auto-charge by Razorpay
  ↓
Webhook → SubscriptionCharge recorded
  ↓
Trigger product fulfilment (puja/upload/lesson/etc.)
  ↓
Notification + receipt to customer
```

## Subscription product catalog

| Product | Tier | INR/mo | USD NRI |
|---|---|---|---|
| AI Pandit | Bhakti Pro | 199 | $3 |
| AI Pandit | Bhakti Bhagat (annual) | 1499 | $25 |
| Adopt-a-Cow | Basic | 501 | $7 |
| Adopt-a-Cow | Premium | 1001 | $14 |
| Adopt-a-Temple | Basic | 501 | $7 |
| Adopt-a-Temple | Standard | 1001 | $14 |
| Adopt-a-Temple | Premium | 2501 | $35 |
| Gurukul Basic | Basic | 999 | $14 |
| Gurukul Premium | Premium | 1999 | $28 |
| Gurukul Advanced | Advanced | 3999 | $55 |
| Recurring Donation | Basic | 501 | $7 |
| Recurring Donation | Premium | 1001 | $14 |
| Recurring Donation | Devotee | 2501 | $35 |

## Unified customer experience

### `/profile/subscriptions` (new)

```
┌────────────────────────────────────────────────┐
│ Your Subscriptions                              │
├────────────────────────────────────────────────┤
│ ✨ AI Pandit Pro                                │
│ ₹199/month • Active since: 3 months            │
│ Next billing: Sep 13, 2026                     │
│ Status: ACTIVE                                  │
│ [Pause] [Cancel] [Upgrade to Bhagat (yearly)]  │
├────────────────────────────────────────────────┤
│ 🐄 Adopt Cow "Krishna"                          │
│ ₹501/month • Active since: 6 months            │
│ Next billing: Sep 5, 2026                      │
│ Last photo update: Aug 28 (view)               │
│ Status: ACTIVE                                  │
│ [Pause vacation] [Cancel] [Change cow]         │
├────────────────────────────────────────────────┤
│ 🏛️ Adopt Temple "Kashi Vishwanath"             │
│ ₹1001/month • Active since: 4 months           │
│ Next billing: Sep 10, 2026                     │
│ Last impact PDF: Aug 1 (view)                  │
│ Status: ACTIVE                                  │
│ [Pause] [Upgrade to Premium tier] [Cancel]     │
├────────────────────────────────────────────────┤
│ Total monthly: ₹1,701                           │
│ Total annual projected: ₹20,412                │
│ 80G tax-deductible this year: ₹17,000         │
└────────────────────────────────────────────────┘
```

## Database schema (extends R-Q1-E-017)

```prisma
model Subscription {
  id                String   @id @default(cuid())
  userId            String   @map("user_id")
  productType       SubscriptionProduct @map("product_type")
  productId         String?  @map("product_id")
  tier              String  // basic / standard / premium
  monthlyInr        Int      @map("monthly_inr")
  monthlyUsd        Int?     @map("monthly_usd")
  currency          String   @default("INR")
  status            SubscriptionStatus @default(active)
  razorpaySubId     String?  @unique @map("razorpay_subscription_id")
  stripeSubId       String?  @unique @map("stripe_subscription_id")
  startedAt         DateTime @map("started_at")
  currentPeriodEnd  DateTime @map("current_period_end")
  pausedAt          DateTime? @map("paused_at")
  resumeAt          DateTime? @map("resume_at")
  cancelledAt       DateTime? @map("cancelled_at")
  cancellationReason String? @map("cancellation_reason")
  metadata          Json?  // tier-specific data, cow ID, temple ID, etc.
  user              User @relation(fields: [userId], references: [id])
  charges           SubscriptionCharge[]
  @@index([userId, status])
  @@map("subscriptions")
}

model SubscriptionCharge {
  id                  String   @id @default(cuid())
  subscriptionId      String   @map("subscription_id")
  amountInr           Int      @map("amount_inr")
  amountUsd           Int?     @map("amount_usd")
  status              ChargeStatus @default(pending)
  razorpayPaymentId   String?  @unique @map("razorpay_payment_id")
  stripeChargeId      String?  @unique @map("stripe_charge_id")
  chargedAt           DateTime? @map("charged_at")
  failureReason       String?  @map("failure_reason")
  refundedAt          DateTime? @map("refunded_at")
  subscription        Subscription @relation(fields: [subscriptionId], references: [id])
  @@index([subscriptionId, chargedAt])
  @@map("subscription_charges")
}

enum SubscriptionProduct { 
  ai_pandit 
  cow_adoption 
  temple_adoption 
  gurukul_basic 
  gurukul_premium 
  gurukul_advanced
  recurring_donation 
}

enum SubscriptionStatus { active paused cancelled past_due }
enum ChargeStatus { pending succeeded failed refunded }
```

## Razorpay subscription wiring (extends spec)

```typescript
// apps/api/src/services/subscription-service.ts
import Razorpay from 'razorpay'

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!
})

export async function createUnifiedSubscription(opts: {
  userId: string
  productType: SubscriptionProduct
  tier: string
  productId?: string
  currency?: 'INR' | 'USD' | 'GBP' | 'CAD' | 'AUD'
}) {
  const planId = process.env[`RAZORPAY_PLAN_${opts.productType.toUpperCase()}_${opts.tier.toUpperCase()}`]
  if (!planId) throw new Error(`No plan ID for ${opts.productType}/${opts.tier}`)
  
  const rzpSub = await razorpay.subscriptions.create({
    plan_id: planId,
    customer_notify: 1,
    quantity: 1,
    total_count: 12, // 1 year auto-renew
    notes: {
      bhaktisetu_user_id: opts.userId,
      product_type: opts.productType,
      tier: opts.tier
    }
  })
  
  const subscription = await prisma.subscription.create({
    data: {
      userId: opts.userId,
      productType: opts.productType,
      productId: opts.productId,
      tier: opts.tier,
      monthlyInr: getPriceForTier(opts.productType, opts.tier).inr,
      monthlyUsd: getPriceForTier(opts.productType, opts.tier).usd,
      currency: opts.currency ?? 'INR',
      razorpaySubId: rzpSub.id,
      startedAt: new Date(),
      currentPeriodEnd: addMonths(new Date(), 1)
    }
  })
  
  return { subscription, paymentLink: rzpSub.short_url }
}
```

## Pause + cancel + upgrade flows

### Pause subscription
- User initiates from /profile/subscriptions
- Razorpay subscription paused
- DB status updated to 'paused'
- Resume date scheduled (1-3 months)
- Cron auto-resumes on date

### Cancel subscription
- User initiates from /profile/subscriptions
- Razorpay subscription cancelled
- DB status updated to 'cancelled'
- Refund eligible for unused month pro-rata
- Confirmation email sent

### Upgrade subscription
- User selects new tier
- Razorpay subscription cancelled
- New subscription created at new tier
- Prorated charge applied
- Effective immediately

## Webhook handler

```typescript
// apps/api/src/routes/webhooks/razorpay-subscription.ts
fastify.post('/webhooks/razorpay-sub', { config: { rawBody: true } }, async (req, reply) => {
  // Signature verification (per webhook handler spec)
  const event = parseEvent(req)
  
  switch (event.event) {
    case 'subscription.charged':
      await onSubscriptionCharged(event.payload.subscription.entity, event.payload.payment.entity)
      break
    case 'subscription.cancelled':
      await onSubscriptionCancelled(event.payload.subscription.entity)
      break
    case 'subscription.paused':
      await onSubscriptionPaused(event.payload.subscription.entity)
      break
    case 'subscription.activated':
      await onSubscriptionActivated(event.payload.subscription.entity)
      break
    case 'subscription.charge.failed':
      await onChargeFailed(event.payload.payment.entity)
      break
  }
  
  return reply.send({ ok: true })
})
```

## Engineering tickets

- Week 1: Unified schema + Prisma migration
- Week 2: createUnifiedSubscription service
- Week 3: /profile/subscriptions UI
- Week 4: Pause + cancel + upgrade flows
- Week 5: Webhook handler integration
- Week 6: Admin /admin/subscriptions dashboard
- Week 7: Customer email + notification templates
- Week 8: Production deploy
