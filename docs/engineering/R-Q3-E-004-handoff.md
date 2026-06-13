# R-Q3-E-004 — FCM Push Reminders + Aarti Live + Festival Nudges

> **Status**: Stub / founder-action-required
> **Authored**: 2026-06-14 (batch round-2 ship cycle)
> **Depends on**: R-Q2-E-009 (FCM backend — `docs/engineering/push-notifications-backend-spec.md`)

## Why this exists

The roadmap item file (`docs/roadmap/items/Q3/engineering/004-fcm-push-notifications-booking-reminders-aarti-liv.md`) was bulk-imported on 2026-06-09 and contains only placeholder fields:

- `success_criteria: ["Populate during first sub-agent emission cycle"]`
- `agent_brief.prompt_skeleton: "TBD — populated by first sub-agent cycle."`
- `kpi.query: "TBD-populate-before-orchestrator-go-live"`

Per the ship doctrine (`Spec too thin → stub doc + founder-action-required label`), this handoff documents what the agent **would** ship once the spec is fleshed out, so the next executing agent can resume without re-deriving context.

## Scope (proposed — pending founder ratification)

Three notification surfaces, all riding the FCM backend from R-Q2-E-009:

### 1. Booking reminders

| Trigger | Notification |
|---|---|
| T-24h before scheduled puja | "Tomorrow at {time}: {pujaName} at {temple}. Tap to view priest video preview." |
| T-2h before scheduled puja | "Your {pujaName} starts in 2 hours. Live video link ready." |
| T+30min after scheduled (no video uploaded) | (priest-side) "Reminder: upload video proof for booking {BS-…}" |
| Booking confirmed | "Confirmed! Pandit {name} accepted your {pujaName} for {date}." |
| Video uploaded | "Your puja video is ready. Tap to watch." |

### 2. Aarti live alerts

| Trigger | Notification |
|---|---|
| 5 min before live aarti starts at subscribed temple | "Live now in 5 min: {temple} {aartiName} aarti. Tap to join." |
| Live darshan stream goes online | "{temple} darshan is live now." |
| (Quiet-hours respected per `NotificationPreference.quietHours`) | |

### 3. Festival nudges

| Trigger | Notification |
|---|---|
| T-7d before major festival | "{festivalName} in 7 days — book your puja or yatra now." |
| T-1d before festival | "{festivalName} tomorrow. Last chance to book." |
| Day-of festival 6am IST | "Happy {festivalName}! Aarti schedule + recommended pujas." |

## Wiring outline

```
apps/api/src/services/notification-scheduler.ts
  scheduleBookingReminders(booking)     // called from /bookings POST + payment success
  scheduleAartiLiveAlert(stream)        // called from /darshan/streams when going_live
  scheduleFestivalNudges()              // daily cron, reads docs/festivals.json

apps/api/src/jobs/notification-tick.ts
  runs every 5min via existing scheduler (bullmq or pg-cron)
  pulls due reminders from notification_queue table
  calls push.ts sendToUser() per preferences

apps/api/src/routes/push.ts
  already shipped under R-Q2-E-009
```

## Schema additions (on top of R-Q2-E-009)

```prisma
model NotificationQueue {
  id          String   @id @default(cuid())
  userId      String   @map("user_id")
  type        NotifType
  payload     Json
  scheduledAt DateTime @map("scheduled_at")
  sentAt      DateTime? @map("sent_at")
  status      NotifStatus @default(pending)
  attempts    Int      @default(0)
  createdAt   DateTime @default(now()) @map("created_at")
  @@index([scheduledAt, status])
  @@index([userId])
  @@map("notification_queue")
}

enum NotifType {
  booking_t24
  booking_t2
  booking_confirmed
  booking_video_ready
  priest_video_overdue
  aarti_live_5min
  darshan_live
  festival_t7
  festival_t1
  festival_day
}

enum NotifStatus { pending sent failed cancelled }
```

## KPI

- `push_notifications_delivered_daily` — count of `notification_queue` rows where `status='sent'` and `sentAt::date = current_date`.
- Target: 5,000/day by Q3 end.
- Source query (once table exists):
  ```sql
  SELECT count(*) FROM notification_queue
  WHERE status='sent' AND sent_at::date = current_date;
  ```

## Founder actions required before next agent cycle

1. Confirm the 3-surface scope above (or trim).
2. Decide queue backend: `bullmq` + Redis (Upstash free tier ~10k cmds/day, fits) **or** Postgres-only via `pg_cron` extension (already on Supabase free tier).
3. Provide Firebase service account JSON for the API container (env var `FIREBASE_SERVICE_ACCOUNT_JSON`). Without this the push service is a noop — code can ship behind env-or-noop guard.
4. Confirm aarti schedule data source — currently 4 hardcoded IST slots in `StickyAartiCta.tsx` (Mangal 4:30am / Shringar 7:00am / Sandhya 6:00pm / Shayan 9:00pm). Per-temple override needed?
5. Approve `success_criteria` rewrite for the roadmap item file (currently placeholder).

## Free-tier impact (estimated)

- Postgres rows: ~50k/month at 5k notifs/day × 30 = 150k rows/mo. Supabase 500MB easily holds 1M+ rows of this shape. **OK**.
- FCM sends: free unlimited via Firebase. **OK**.
- Cron tick: 1 GH Actions minute every 5 min if hosted there = 288 min/day = **way over** 2000/mo budget. Must run inside the Render API container (which is always-on already) as a `setInterval` or pg_cron. **Render-only, no GH Actions cost.**
- Render compute: ~50ms per tick × 288 ticks/day = 14s/day extra. Trivial within 750hr/mo budget.

## Resume cheatsheet for next agent

1. Wait for founder to fill `success_criteria` + `agent_brief.prompt_skeleton` in `docs/roadmap/items/Q3/engineering/004-fcm-push-notifications-booking-reminders-aarti-liv.md`.
2. Verify R-Q2-E-009 (push backend) has shipped — check `apps/api/src/routes/push.ts` exists.
3. Implement `apps/api/src/services/notification-scheduler.ts` + `apps/api/src/jobs/notification-tick.ts` per outline above.
4. Migration for `notification_queue` table + 2 enums.
5. Hook scheduler calls into `/bookings` POST + payment success path + `/darshan/streams` going-live transition.
6. Daily cron for festival nudges (reads `docs/festivals.json` or `lib/festivals.ts`).
7. Tests: vitest for scheduler logic (quiet-hours respect, dedup, attempt cap). E2E via curl on staging.
8. Flip `kpi.query` to real SQL once table exists.

## Why this isn't shipped as code in this PR

The roadmap spec is a placeholder. Shipping notification-scheduler.ts + queue table + cron wiring against undefined `success_criteria` risks landing the wrong abstraction (e.g., picking bullmq when founder wants pg_cron, or hardcoding aarti slots that should be per-temple). Stub doc preserves the analysis and unblocks the next cycle the moment the spec is real.
