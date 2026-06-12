# Referral Program v1 — ₹100 Credit Per Converted Referee

> **Roadmap item**: R-Q2-M-011 (P1) · **Authored**: 2026-06-13 · **Queue ref**: Q-C-20260611T2307-R-Q2-M-011

## Goal

Ship /refer page + claim API + ledger. Inviter gets ₹100 wallet credit when invitee completes first paid booking. Idempotent. KPI flip referral_active=1.

## 5 deliverables

### 1. Prisma migration

`apps/api/prisma/schema.prisma` append:

```prisma
model Referral {
  id          String   @id @default(cuid())
  inviterId   String   @map("inviter_id")
  inviteeId   String   @unique @map("invitee_id") // idempotent: one claim per invitee
  status      ReferralStatus @default(pending)
  bookingId   String?  @map("booking_id")
  creditInr   Int      @default(0) @map("credit_inr")
  createdAt   DateTime @default(now()) @map("created_at")
  claimedAt   DateTime? @map("claimed_at")
  inviter     User     @relation("ReferralInviter", fields: [inviterId], references: [id])
  invitee     User     @relation("ReferralInvitee", fields: [inviteeId], references: [id])
  booking     Booking? @relation(fields: [bookingId], references: [id])
  @@index([inviterId, status])
  @@map("referrals")
}
enum ReferralStatus { pending claimed }
```

User model gets `referralCode String @unique @default(cuid()) @map("referral_code")` + back-relations.

`pnpm --filter @poojly/api exec prisma migrate dev --name add_referrals`

### 2. API routes — `apps/api/src/routes/referrals.ts`

- `GET /api/v1/referrals/me` (auth) → `{ code, pendingCount, claimedCount, creditsEarnedInr }`
- `POST /api/v1/referrals/claim` body `{ refCode, bookingId }` → validates refCode≠self, booking paid+owned-by-invitee, no prior row. Creates row status=claimed, credits inviter wallet +10000 paise via wallet service. P2002 → return existing 200 (idempotent).

Wire in `apps/api/src/server.ts`.

### 3. Checkout hook

Extend `apps/api/src/services/booking-checkout.ts` on-paid hook. If `req.cookies.ref` present → internal `referrals.claim()`. Wrap try/catch — claim failure must NOT fail booking.

### 4. /refer page — `apps/web/app/refer/page.tsx` SSR

Sections: hero "Invite friends, earn ₹100 wallet credit" + 3-step how-it-works + ShareButtons client component (WhatsApp deep link + clipboard copy + code from GET /me) + leaderboard stub "Top inviters — coming soon".

Middleware `apps/web/middleware.ts`: `?ref=XXX` → set httpOnly `ref` cookie 30d → 302 clean URL.

### 5. KPI flip

`docs/roadmap/items/Q2/marketing/011-referral-program-formal-launch-w-100-credit-per-co.md` — kpi.query `SELECT count(*) FROM referrals WHERE status='claimed'`.

## TDD order

1. `apps/api/src/routes/__tests__/referrals.test.ts` — 6 cases (auth gate / GET me zero state / self-referral 400 / unpaid 400 / happy path +10000 paise / duplicate idempotent)
2. `apps/web/__tests__/refer-page.test.tsx` — 3 cases (hero / share buttons / code fetch mount)
3. `apps/web/__tests__/ref-cookie-middleware.test.ts` — 1 case (?ref=ABC sets cookie strips param)

## Verify

```bash
pnpm --filter @poojly/api exec vitest run referrals
pnpm --filter @poojly/web exec vitest run refer-page ref-cookie
pnpm --filter @poojly/api exec prisma migrate status
psql $DATABASE_URL -c "SELECT status, count(*), sum(credit_inr) FROM referrals GROUP BY status;"
curl http://localhost:3000/refer | grep "Invite friends"
```

## Acceptance

- [ ] Migration applied, Referral table exists
- [ ] 6/6 API + 3/3 web + 1/1 middleware tests green
- [ ] /refer SSR renders, share buttons functional
- [ ] Duplicate claim 200 idempotent (no double credit verified via SQL)
- [ ] KPI metadata updated w/ live SQL
- [ ] `NEXT_PUBLIC_FEATURE_REFERRAL=1` gates /refer nav link

## Hard rules

- No deploy. Dev-server + tests only.
- No Resend on /refer load — claim success only (transactional).
- Wallet credit through existing wallet service. No raw SQL on balances.
- Self-referral blocked at API.

## Out of scope

- Email notification to inviter on claim (next cycle)
- Tiered/multi-level rewards
- Live leaderboard data (stub only)

## Closes

R-Q2-M-011 — spec shipped. Closes: Q-C-20260611T2307-R-Q2-M-011
