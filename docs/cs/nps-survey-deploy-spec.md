# NPS Survey Deployed — Quarterly Auto-Send

> **Roadmap item**: R-Q2-CS-001 (P1) · **Authored**: 2026-06-13

## Goal

Auto-send NPS (Net Promoter Score) survey quarterly to active users. Targets NPS >50 by Q4. Industry benchmark devotional apps NPS 60-70.

## Schema

```prisma
model NpsResponse {
  id        String   @id @default(cuid())
  userId    String   @map("user_id")
  score     Int      // 0-10
  feedback  String?  @db.Text
  category  String?  // promoter (9-10) / passive (7-8) / detractor (0-6)
  channel   String   // email / in-app / sms
  sentAt    DateTime @map("sent_at")
  respondedAt DateTime? @map("responded_at")
  surveyVersion String @default("v1") @map("survey_version")
  user      User @relation(fields: [userId], references: [id])
  @@index([userId, sentAt])
  @@index([category, sentAt])
  @@map("nps_responses")
}
```

## Trigger logic

Quarterly cron `apps/api/src/jobs/nps-survey-cron.ts`:

- Fires 1st of Jan/Apr/Jul/Oct at 09:00 IST
- SELECT users WHERE last_active_at > now() - 30d AND last_nps > 90d ago (or NULL)
- For each: create NpsResponse row sentAt=now() + send email via Resend + push notif

## Survey template

Email subject: "Quick question — how likely are you to recommend Bhaktisetu?"

Body:
```
On a scale of 0-10, how likely are you to recommend Bhaktisetu to a friend or family member?

[0-10 buttons → /nps/respond?token={jwt}&score={n}]

If you'd like to share specific feedback:
[Open feedback link → /nps/feedback?token={jwt}]

Takes <30 sec. Thanks!
```

## Endpoints

- `GET /nps/respond?token=&score=` (public, JWT-validated) → save score → thanks page
- `POST /nps/feedback` body `{ token, feedback }` → save text

## Admin dashboard

`/admin/nps` — current NPS score (promoter % − detractor %), trend chart, top detractor reasons (LLM-classified).

## Q2 success metric

- 200+ responses Q2
- NPS baseline established
- Top-3 detractor themes identified for ops backlog

## Closes

R-Q2-CS-001 — spec shipped.
