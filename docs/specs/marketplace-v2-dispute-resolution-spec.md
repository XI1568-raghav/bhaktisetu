# Marketplace v2 Dispute Resolution — Devotee/Temple/Pandit 3-way + Admin Mediation

> **Roadmap item**: R-Q4-E-002 (P0) · **Authored**: 2026-06-13

## Goal

3-way dispute resolution flow: devotee complains, temple/pandit respond, admin mediates. Hard SLA: resolution within 7 days.

## Dispute types

| Type | Examples | Auto-route |
|---|---|---|
| no_show | pandit didn't appear | temple + pandit respond, admin mediates |
| video_proof_missing | proof not delivered in 72h | pandit responds, admin gates refund |
| quality | sankalp incorrect, sastra error | senior-pandit-reviewer adjudicates |
| payment | charged but no service | finance specialist + admin |
| custom | other | admin manual triage |

## State machine

```
[opened] → [responses_collected] → [mediation] → [resolution_proposed] → [resolved | escalated_to_founder]
                ↑ T+24h auto-nudge        ↑ T+48h escalate          ↑ T+7d hard SLA breach → auto-refund
```

## Data model

```prisma
model MarketplaceDispute {
  id            String   @id @default(uuid()) @db.Uuid
  bookingId     String   @map("booking_id") @db.Uuid
  openedByUserId String  @map("opened_by_user_id") @db.Uuid
  disputeType   String   @map("dispute_type")
  description   String
  state         String   @default("opened")
  resolution    String?
  refundAmountInr Int?   @map("refund_amount_inr")
  resolvedAt    DateTime? @map("resolved_at")
  escalatedToFounder Boolean @default(false) @map("escalated_to_founder")
  createdAt     DateTime @default(now()) @map("created_at")

  @@index([bookingId])
  @@index([state, createdAt])
  @@map("marketplace_disputes")
}

model DisputeResponse {
  id          String   @id @default(uuid()) @db.Uuid
  disputeId   String   @map("dispute_id") @db.Uuid
  respondentUserId String @map("respondent_user_id") @db.Uuid
  respondentRole String @map("respondent_role") // "devotee" | "temple" | "pandit" | "admin"
  responseText String  @map("response_text")
  attachments Json    @default("[]")
  createdAt   DateTime @default(now()) @map("created_at")

  @@index([disputeId, createdAt])
}
```

## API

- `POST /api/v1/disputes` — devotee opens dispute
- `POST /api/v1/disputes/:id/respond` — auth role-checked respondent adds response
- `POST /api/v1/admin/disputes/:id/mediate` — admin proposes resolution
- `POST /api/v1/admin/disputes/:id/escalate` — escalate to founder

## SLA cron

- T+24h: auto-nudge responding party (WA + email)
- T+48h: escalate to admin queue
- T+7d: auto-refund devotee if unresolved (per refund-policy-v2)

## Tickets

- R-Q4-E-002a-e per state-machine + endpoints + cron + UI

## Closes

R-Q4-E-002 — spec shipped.
