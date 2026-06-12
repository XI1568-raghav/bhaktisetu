# Antim Sanskar Coordination v1 — Engineering Spec

> **Roadmap item**: R-Q4-E-001 (P0) · **Authored**: 2026-06-13 · **Depends on**: docs/product/specs/antim-sanskar-v1.md (R-Q4-P-001 product spec already shipped)

## Goal

Build engineering layer for antim sanskar (last-rites) coordination: pandit dispatch + ghat booking + 24h SLA + grief-sensitive UX.

## Per spec key constraints (cross-ref R-Q4-P-001)

- Dignity-first UX (no marketing language)
- Pandit dispatch within 30 min of booking
- Senior-pandit-reviewer signoff before any copy change
- DPDPA Section 11 deceased-data handling (90-day retention then anonymize)
- 5% bad-debt tolerance accepted
- City coverage v1: Mumbai + Delhi + Bengaluru only

## Data model

```prisma
model AntyeshtiBooking {
  id                  String   @id @default(uuid()) @db.Uuid
  bookingNumber       String   @unique @map("booking_number")
  primaryContactUserId String  @map("primary_contact_user_id") @db.Uuid
  deceasedNameMasked  String   @map("deceased_name_masked") // First-name + first-initial-of-last
  deceasedGotra       String?  @map("deceased_gotra")
  deceasedAge         Int?     @map("deceased_age")
  city                String
  ghatId              String?  @map("ghat_id") @db.Uuid
  tier                String   // "5100" | "11000" | "21000"
  panditId            String?  @map("pandit_id") @db.Uuid
  scheduledAt         DateTime @map("scheduled_at")
  completedAt         DateTime? @map("completed_at")
  status              String   @default("dispatch_pending")
  videoProofUrl       String?  @map("video_proof_url")
  paymentStatus       String   @default("pending") @map("payment_status")
  createdAt           DateTime @default(now()) @map("created_at")
  anonymizedAt        DateTime? @map("anonymized_at") // 90d post-completion

  @@index([city, status, scheduledAt])
  @@map("antyeshti_bookings")
}

model AntyeshtiGhat {
  id          String   @id @default(uuid()) @db.Uuid
  name        String
  city        String
  address     String
  contactPhone String  @map("contact_phone")
  bookingSlotsPerDay Int @default(24) @map("booking_slots_per_day")
  active      Boolean  @default(true)

  @@index([city, active])
  @@map("antyeshti_ghats")
}
```

## API surface

- `POST /api/v1/antyeshti/booking` — create booking (auth required for primary contact)
- `GET /api/v1/antyeshti/booking/:id` — booking status
- `PATCH /api/v1/antyeshti/booking/:id/dispatch` — admin assigns pandit (30min SLA)
- `PATCH /api/v1/antyeshti/booking/:id/complete` — pandit marks complete + uploads video proof
- `GET /api/v1/antyeshti/ghats?city=mumbai` — available ghats in city

## Pandit dispatch logic

30-min SLA: cron polls `dispatch_pending` bookings every 2 min. Tries:
1. Available pandit in same city + sampradaya match
2. Available pandit in same city (any sampradaya)
3. Senior on-call founder gets WA alert if no match within 25 min

## 90-day anonymization cron

Daily cron: anonymize bookings completed >90 days ago. Replace PII w/ `<anonymized>`, retain structural fields (city, tier, pandit_id, completion_status).

## Tickets

- R-Q4-E-001a: Prisma migration
- R-Q4-E-001b: API endpoints
- R-Q4-E-001c: Pandit dispatch cron
- R-Q4-E-001d: Anonymization cron
- R-Q4-E-001e: Grief-sensitive copy review tooling (forbidden-word lint per R-Q4-P-001 spec)

## Closes

R-Q4-E-001 — engineering spec shipped.
