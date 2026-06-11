# First Contractor Hire — Trigger Metric

> Roadmap item: R-Q1-H-001. Owner: founder. Reviewed weekly by founder (Sunday 8pm IST).

## 1. Purpose

Tell future-self **when** to hire the first contractor — not whether, not who. Whether and who are settled in `docs/company/06-talent.md` §5 (Operations Associate, ₹25k/mo, contractor not FT). Triggers are quant, OR-logic: any one fires, the hire starts.

## 2. Trigger thresholds (OR logic — any one fires)

| ID | Trigger | Source |
|---|---|---|
| **T1** | ≥ 50 paid bookings/week sustained 2 consecutive weeks | Prisma `PujaBooking` |
| **T2** | Support inbox first-response time > 2h/day for 5 consecutive days | Prisma `SupportTicket` (when populated) OR Gmail manual count until then |
| **T3** | Supply-side moderation queue > 15h/week founder-time | Manual time-tracking ledger |

OR logic: any single trigger firing is sufficient to start the hire. No two-of-three requirement. Reasoning: 06-talent.md §1 capacity math shows founder breaks at 400–500 active users; each trigger individually predicts that ceiling has been crossed in its lane.

## 3. Calculation queries (verified against current Prisma schema)

### T1 — Paid bookings per week

**Real schema reference**: `PujaBooking` (line 415 of `apps/api/prisma/schema.prisma`), table `puja_bookings`. Booking status enum at line 71 — **lowercase** values: `pending_payment | confirmed | priest_assigned | in_progress | completed | video_uploaded | delivered | cancelled | refunded`. There is NO `PAID` status; "paid" semantically = any status past `pending_payment`. Query treats `status IN ('confirmed', 'priest_assigned', 'in_progress', 'completed', 'video_uploaded', 'delivered')` as paid bookings.

```sql
-- Weekly paid-booking count for last 8 weeks
SELECT
  date_trunc('week', created_at) AS week_start,
  COUNT(*) AS paid_bookings
FROM puja_bookings
WHERE status IN ('confirmed','priest_assigned','in_progress','completed','video_uploaded','delivered')
  AND created_at >= NOW() - INTERVAL '8 weeks'
GROUP BY 1
ORDER BY 1 DESC;
```

Run with:

```bash
psql "$SUPABASE_DIRECT_URL" -c "..." \
  # OR
pnpm --filter @poojly/api exec prisma studio
# then filter PujaBooking by status NOT IN ('pending_payment','cancelled','refunded')
# group by created_at week
```

**Trigger fires** when the two most recent COMPLETE weeks (excluding current partial week) each show `paid_bookings >= 50`. Partial week excluded to avoid false-positive at week start.

### T2 — Support inbox first-response time

**Real schema reference**: `SupportTicket` (line 1247), table `support_tickets`. Fields: `createdAt`, `assignedToId`, `resolvedAt`. There is no `firstResponseAt` field today. Proxy = time-of-first-message via `SupportTicketMessage` (line 1271).

```sql
-- Median first-response time (minutes) per day for last 7 days
-- Requires SupportTicketMessage to be populated; otherwise count is 0 and proxy via Gmail
WITH first_response AS (
  SELECT
    t.id,
    t.created_at AS ticket_created_at,
    MIN(m.created_at) FILTER (WHERE m.user_id != t.user_id) AS first_response_at
  FROM support_tickets t
  LEFT JOIN support_ticket_messages m ON m.ticket_id = t.id
  WHERE t.created_at >= NOW() - INTERVAL '7 days'
  GROUP BY t.id, t.created_at
)
SELECT
  date_trunc('day', ticket_created_at) AS day,
  COUNT(*) AS tickets_opened,
  COUNT(first_response_at) AS tickets_responded,
  PERCENTILE_CONT(0.5) WITHIN GROUP (
    ORDER BY EXTRACT(EPOCH FROM (first_response_at - ticket_created_at))/60
  ) AS median_response_minutes
FROM first_response
GROUP BY 1
ORDER BY 1 DESC;
```

**Trigger fires** when `median_response_minutes > 120` on 5 consecutive days. Days with `tickets_opened = 0` are skipped (don't break the streak; reset only on a faster day).

**MANUAL FALLBACK (until `SupportTicket` table has > 30 rows in last 30 days)**: Count WhatsApp + email threads in Gmail label `support` per day. Manually log to `docs/hr/_first-hire-tracking.md` (founder weekly review). Trigger fires on same threshold (>2h median first-response for 5 days).

### T3 — Supply-side moderation queue (founder-time)

**Real schema reference**: NO dedicated moderation queue table in current schema. Closest proxies:

- `PanditProfile.kycVerified` boolean (line 715) — review queue = `kycVerified = false AND created_at < NOW() - 24h`
- `Lead.status` (line 1381) — outbound prospects awaiting human review
- `TempleProfile`, `AstrologerProfile`, etc — similar verified-flag pattern

Founder time on moderation is **not directly measurable from the DB**. Mark as MANUAL until a `ModerationAction` audit table is added (recommend in roadmap as a new item).

```sql
-- Indicative pending-review count (proxy, not founder-hours)
SELECT
  'pandit' AS lane,
  COUNT(*) AS pending_review_count
FROM pandit_profiles
WHERE kyc_verified = FALSE
  AND created_at < NOW() - INTERVAL '24 hours'
UNION ALL
SELECT 'astrologer', COUNT(*) FROM astrologer_profiles
  WHERE kyc_verified = FALSE AND created_at < NOW() - INTERVAL '24 hours'
UNION ALL
SELECT 'gaushala', COUNT(*) FROM gaushala_profiles
  WHERE kyc_verified = FALSE AND created_at < NOW() - INTERVAL '24 hours'
UNION ALL
SELECT 'temple', COUNT(*) FROM temple_profiles
  WHERE kyc_verified = FALSE AND created_at < NOW() - INTERVAL '24 hours';
```

```
-- BLOCKED: No ModerationAction audit table in schema yet.
-- Founder must self-report moderation time weekly in docs/hr/_first-hire-tracking.md.
-- Recommend new roadmap item: R-Q1-E-XXX "Add ModerationAction audit table for founder-hour KPI".
```

**Trigger fires** when founder self-reported moderation time in any rolling 7-day window > 15 hours. Self-report goes in `docs/hr/_first-hire-tracking.md` (founder creates on first weekly review).

## 4. Trigger = ANY (OR logic)

Explicit decision rule:

```
fire_first_hire = T1 OR T2 OR T3
```

NOT AND. NOT majority. ANY one trigger fires the hire process. Reason: each trigger individually indicates a single workstream has crossed the 400–500 user breakpoint identified in `docs/company/06-talent.md` §1 line 22. Waiting for two triggers would mean two simultaneous workstream collapses — burnout territory.

## 5. Role spec on trigger fire

| Field | Value |
|---|---|
| Title | Operations Associate (Contractor) |
| Source | `docs/company/06-talent.md` §5 line 55-59 |
| Budget cap | ₹25,000/month |
| Duration | 6-month renewable contract, NOT full-time employment |
| Hours | 4 hours/day weekday cap |
| Skills | Hindi + English mandatory, basic Sheets, no code |
| Scope | Triage support inbox, run priest verification queue against AI summaries, weekly content scheduling, payments reconciliation in Razorpay dashboard |
| Cannot decide | Refund policy, payout terms, take-rate changes, KYC sign-off (founder retains all money + policy decisions per `06-talent.md` §2) |
| Job description | `TODO: docs/hr/ops-associate-jd.md` (next roadmap item R-Q1-H-002) |
| Onboarding doc | `TODO: docs/hr/onboarding-cs.md` (R-Q1-H-003) |
| Sourcing | Apna / WorkIndia for part-time bilingual support agents, Bengaluru / Pune preferred |

## 6. Review cadence

| When | Who | What |
|---|---|---|
| Every Sunday 8pm IST | Founder | Run T1 + T2 queries against prod, log results in `docs/hr/_first-hire-tracking.md` (one row per week). Self-report T3 hours. |
| End of each month | Founder | Trend check — even if no trigger fires, are we approaching threshold? If T1 hit 35-40/week, prepare sourcing. |
| First trigger fire | Founder | (a) sanity check by re-running queries from a different terminal, (b) post to Apna + WorkIndia within 48h, (c) interview cadence: 5 candidates within 7d, (d) signed contract within 14d. |

Tracking file `docs/hr/_first-hire-tracking.md` to be created by founder on first review. Suggested format:

```markdown
# First-Hire Tracking Ledger

| ISO week | T1 paid bookings | T2 median response min | T3 mod hours | Triggers fired | Action |
|---|---|---|---|---|---|
| 2026-W24 | 0 | n/a (no tickets) | 4 | none | continue |
```

## 7. Source of numbers

| Number | Source |
|---|---|
| 50 paid bookings/week trigger | `docs/company/06-talent.md` §5 line 51 |
| 2h support response trigger | `docs/company/06-talent.md` §5 line 52 |
| 15h/wk moderation trigger | `docs/company/06-talent.md` §5 line 53 |
| ₹25k/mo budget cap | `docs/company/06-talent.md` §5 line 58 |
| 4hr/day, 6-month contract | `docs/company/06-talent.md` §5 line 58 |
| 400-500 user breakpoint | `docs/company/06-talent.md` §1 line 22 |
| Burnout tripwire (alt fire condition) | `docs/company/06-talent.md` §6 line 64 |

## 8. Alternate fire condition (qualitative)

From `docs/company/06-talent.md` §6 line 64: "Code commits < 1/day for 4 weekdays AND open tickets rising → I am underwater on ops, not lazy. Trigger the first hire even if metrics in §5 haven't fully fired."

This qualitative tripwire OVERRIDES the OR-logic above. Founder fires the hire on this condition even if T1, T2, T3 all sit below threshold. Reason: if founder is doing zero code AND tickets are climbing, the founder's time is already 100% absorbed by ops — the hire is overdue regardless of dashboard.

## 9. Verify

```bash
# Doc exists
test -f docs/hr/first-hire-trigger.md && echo OK

# All 3 thresholds named
grep -c "50" docs/hr/first-hire-trigger.md   # ≥1
grep -c "2h" docs/hr/first-hire-trigger.md   # ≥1
grep -c "15h" docs/hr/first-hire-trigger.md  # ≥1

# Budget cap cited
grep -c "25" docs/hr/first-hire-trigger.md   # ≥1

# Cross-link bidirectional
grep -c "First Hire Trigger" docs/company/06-talent.md  # ≥1 after step 10

# Prisma queries don't reference invented models
grep -E "model PujaBooking|model SupportTicket" apps/api/prisma/schema.prisma  # both confirmed live
```

Each Prisma/SQL snippet was authored against `apps/api/prisma/schema.prisma` HEAD `48289af`. Run live:

```bash
psql "$SUPABASE_DIRECT_URL" -f - <<'SQL'
-- T1 query body from §3
SQL
```

## 10. Cross-link to 06-talent.md

After this doc commits, append the following block to `docs/company/06-talent.md` §5:

```markdown
> **First Hire Trigger doc**: `docs/hr/first-hire-trigger.md`
> 3 quant triggers (any one fires): 50 paid bookings/wk (2 consecutive weeks) OR 2h support response (5 consecutive days) OR 15h/wk founder moderation time. Detailed queries, fallbacks, and review cadence in the linked doc.
```

(This file will perform that append on commit.)

## Closes
Q-C-20260610T1623-R-Q1-H-001
