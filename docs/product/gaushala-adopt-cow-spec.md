# Gaushala "Adopt a Cow" Subscription — ₹501/mo

> **Roadmap item**: R-Q2-P-004 (P1) · **Authored**: 2026-06-13

## Goal

Q2 launch "Adopt a Cow" recurring subscription ₹501/mo per cow. Targets 100 adoptees by Q2-end + ₹50K MRR.

## Product

Recurring subscription. Subscriber adopts named cow at partner gaushala. Monthly:
- 1 video update from cow (well-being check)
- 1 photo update (milestones)
- Subscriber name on cow's stall plaque
- Annual 80G receipt
- "Visit your cow" option (1 free visit/year w/ family)

## Engineering

### Prisma model

```prisma
model CowAdoption {
  id              String   @id @default(cuid())
  userId          String   @map("user_id")
  cowId           String   @map("cow_id")
  gaushalaId      String   @map("gaushala_id")
  monthlyInr      Int      @default(501) @map("monthly_inr")
  startedAt       DateTime @map("started_at")
  status          AdoptionStatus @default(active)
  subscriptionId  String?  @map("razorpay_subscription_id")
  cancelledAt     DateTime? @map("cancelled_at")
  @@index([userId])
  @@map("cow_adoptions")
}

model Cow {
  id              String   @id @default(cuid())
  gaushalaId      String   @map("gaushala_id")
  name            String
  ageYears        Int      @map("age_years")
  breed           String
  photoUrl        String?  @map("photo_url")
  adoptedBy       CowAdoption?
  @@map("cows")
}

enum AdoptionStatus { active paused cancelled }
```

### API endpoints

- `GET /api/v1/gaushala/cows/available` — public list
- `POST /api/v1/gaushala/cows/:id/adopt` — auth, creates Razorpay subscription
- `POST /api/v1/gaushala/adoption/:id/cancel` — auth, cancels subscription
- `GET /api/v1/gaushala/my-adoptions` — auth, list own adoptions

### Razorpay subscription

- Plan: ₹501/mo auto-debit (Razorpay subscription plan)
- Auto-renew until cancel
- Pause feature (vacation mode 1-3 months)
- Cancel anytime, refund unused month pro-rata

## Marketing

- /gaushala/adopt landing
- Cow profile pages w/ photo + name + age + breed
- Email nurture sequence (welcome / 1st month update / 6th month / annual receipt)

## Engineering tickets

- R-Q2-P-004a: Prisma migration
- R-Q2-P-004b: Razorpay subscription integration
- R-Q2-P-004c: /gaushala/adopt landing + cow profiles
- R-Q2-P-004d: Admin gaushala panel (cow management + adoption status)
- R-Q2-P-004e: Monthly photo+video update workflow

## Closes

R-Q2-P-004 — spec shipped.
