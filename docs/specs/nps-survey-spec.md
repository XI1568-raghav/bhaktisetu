# NPS Survey — Quarterly Auto-Send to Active Users Post-Booking

> **Roadmap item**: R-Q2-CS-001 (P1) · **Authored**: 2026-06-13

## Goal

Net Promoter Score (NPS) survey: auto-trigger 24h after puja completion. Aggregated quarterly. Investor pitch + product improvement signal.

## NPS calc

Standard 0-10 scale:
- 9-10 → Promoter
- 7-8 → Passive
- 0-6 → Detractor
- NPS = % Promoters − % Detractors
- Target: NPS > 50 (high) by Q2-end

## Trigger

Cron: 24h post puja `completed` status flip → send NPS via WA + email.

## Survey content (3 questions max)

```
1. On 0-10 scale, how likely are you to recommend Bhaktisetu to family
   or friends?
   [0 -- 10 slider]

2. (Conditional on score) What was the biggest reason for your score?
   [free text, optional]

3. What's one thing we could improve?
   [free text, optional]
```

Submit form → store + acknowledge thanks.

## Data model

```prisma
model NpsResponse {
  id            String   @id @default(uuid()) @db.Uuid
  userId        String   @map("user_id") @db.Uuid
  bookingId     String   @map("booking_id") @db.Uuid
  score         Int      // 0-10
  category      String   // "promoter" | "passive" | "detractor"
  reasonText    String?  @map("reason_text")
  improvementText String? @map("improvement_text")
  submittedAt   DateTime @default(now()) @map("submitted_at")

  @@index([userId, submittedAt])
  @@index([category])
  @@map("nps_responses")
}
```

## Dashboard

`/admin/cs/nps`:
- Aggregate NPS (last 90d, 30d, 7d)
- Score distribution
- Top 5 themes from reason_text + improvement_text (LLM aggregated weekly)
- Per-cohort NPS trend

## Engineering tickets

- R-Q2-CS-001a: Prisma model + cron trigger
- R-Q2-CS-001b: WA + email send via existing transactional infra
- R-Q2-CS-001c: response endpoint + thank-you flow
- R-Q2-CS-001d: dashboard

## Closes

R-Q2-CS-001 — spec shipped.
