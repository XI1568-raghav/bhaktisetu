# Launch fixes 2026-10-07: URL schemes and admin revenue

Local stack only (Postgres on 127.0.0.1:55432, database `darshya_b`, API on port 4002). Nothing touched production.

## 4. User-supplied URLs are http(s) only

`z.string().url()` accepts any scheme, so `javascript:`, `data:`, `file:` and `vbscript:` values could be stored and later
rendered as links. New shared helper `apps/api/src/lib/http-url.ts` (`isHttpUrl`, `httpUrl(field, max)`); a bad value is a
400 with `<field> must be a full URL starting with http:// or https://`. The priest video URL keeps its own inline refine
(owned by another agent; same rule).

Fields changed:

| Field | Route file |
|---|---|
| `imageUrl` (create and PATCH) | `routes/store-admin.ts` |
| `playbackUrl` (create and PATCH) | `routes/temple-portal.ts` |
| `websiteUrl` (create and PATCH) | `routes/admin.ts` (temple) |
| `websiteUrl` | `routes/gurukuls.ts` |
| `postedUrl` | `routes/admin-content-queue.ts` |
| `sourceUrl` (lead import) | `routes/admin-leads.ts` |

Not changed, with reason:
- `roomUrl` in `routes/wellness-sessions.ts`: owned by the wellness agent; still `z.string().url()`, needs the same one-line swap.
- `avatarUrl`: no API input exists (`PATCH /users/me` does not accept it; `priest.ts` already restricts its own).
- Env URLs (`SUPABASE_URL` etc.), `youtubeVideoId` (an id, not a URL), media upload `publicUrl` (server generated).
- Gaushala, content, profile, social/outreach routes have no user-supplied URL field.

Local proof (before, original code): `POST /store-admin/products {"imageUrl":"javascript:alert(1)"}` answered 201 and stored it;
PATCH with `data:text/html,x` answered 200 and stored it. After: `javascript:`, `data:`, `file:`, `vbscript:` all 400 on POST;
PATCH `javascript:` 400; `https://` and `http://` accepted (201 / 200).

## 5. Admin revenue includes consultations and wellness

Cause: paid astrologer consultations (raw SQL table `astrologer_consultations`) and wellness enrolments never write a
`Payment` row, so every revenue number built on `REVENUE_PAYMENT_WHERE` missed them.

Formula (also in the comment of `apps/api/src/lib/off-payment-revenue.ts`):

```
revenue = SUM(Payment.amount, captured, booking not cancelled)            (existing)
        + SUM(astrologer_consultations.amount_inr
              WHERE status IN ('confirmed','completed') AND paid_at IS NOT NULL
              AND no payments row has its razorpay order/payment id)
        + SUM(wellness_sessions.price_inr over wellness_enrollments
              WHERE status IN ('PAID','ATTENDED') AND payment_id IS NULL
              AND no payments row has its razorpay order id)
```

- No double counting: a row is excluded from the added terms when a Payment row exists for it.
- Refunds out: `cancelled` consultations and `CANCELLED`/`REFUNDED`/`PENDING_PAYMENT` enrolments never match.
  A consultation cancelled outside the refund window is also excluded (the table does not record whether a refund was issued).
- Absent table: `to_regclass('public.astrologer_consultations')` is probed first; a missing table or any failing statement
  makes that term 0, never a 500.
- Time basis: `paid_at` for consultations, `enrolled_at` for wellness (the enrolment has no separate paid time).

Applied to: `/admin/dashboard` `totalRevenue` (month to date), `/admin/metrics/dashboard` (`today.gmvPaise`, `mrrPaise`,
`gmvCumulativePaise`) and `/admin/metrics/investor` (`mrrPaise`, `gmvCumulativePaise`).
`successfulPayments` is still a count of Payment rows. Unchanged: `/admin/revenue` (commissions) and `lineBreakdown`.

Local reproduction (the DB already held two captured Rs 1,152 puja payments): puja 2 x 1152 = 2304, then a prepaid Rs 500
store order, a Rs 300 consultation (12 min at Rs 25, `verify-payment`) and a Rs 500 wellness enrolment (demo verify).

| | before fix | after fix |
|---|---|---|
| `/admin/dashboard` `totalRevenue` | 2804 | 3604 |
| `/admin/metrics/dashboard` `mrrPaise` / `gmvCumulativePaise` | 280400 / 280400 | 360400 / 360400 |
| `/admin/metrics/dashboard` `today.gmvPaise` | 50000 | 130000 |

Expected 2304 + 500 + 300 + 500 = 3604 (the role-pass figures give 1151 + 500 + 300 + 500 = 2451). With the consultation
table renamed away: 3304 (consultation term dropped, nothing breaks); renamed back: 3604.

## Production-mode smoke

`NODE_ENV=production ALLOW_DEMO_PAYMENTS=true` plus the Sentry DSN from the brief, port 4002: no-token `GET /api/v1/auth/me`,
`/admin/dashboard`, `/admin/metrics/dashboard`, `/admin/metrics/investor`, `/admin/reports` all 401 (also with a demo token);
the log has no `fastify otel instance` line. Note `/api/v1/admin/metrics` itself has no route (404); the metrics endpoints
live under `/admin/metrics/*`.

## Tests

New: `lib/http-url.test.ts`, `routes/url-schemes.test.ts`, `services/admin.service.off-payment-revenue.test.ts` (mixed scenario,
no-double-count, refund exclusion, absent table, failing statements). `tsc --noEmit` clean; full suite 366 files / 3673 tests green.

## Owner notes

- `wellness-sessions.ts` `roomUrl` still needs the http(s) refine (other agent's file).
- Existing rows already holding a non-http(s) URL are not cleaned; a one-off SQL check on `store_products.image_url`,
  `temples.website_url`, `live_darshan_streams.playback_url`, `gurukuls.website_url` is worth running on prod.
