-- DI-06 (F367) — the three money guards that a PLAIN unique index cannot express.
--
-- WHY A FOURTH MIGRATION EXISTS
--
-- Three migrations have already worked this finding:
--   20260824000000_di0607_money_key_indexes          4 keys (commissions ×3, temple_payouts)
--   20260902000000_di06_priest_payout_booking_key    1 key  (priest_payouts)
--   20260904000000_di0607_payment_gateway_key_indexes 2 keys (payments gateway ids)
-- All seven are `CREATE UNIQUE INDEX ... ON t (col)` over a WHOLE table, and all
-- seven are applied in production (verified 2026-09-08, below).
--
-- Whole-table uniqueness is the only shape those migrations could use, and
-- `scripts/check-money-key-duplicates.mjs` says so in its closing note: the
-- per-booking payment guard "is not expressible as a plain UNIQUE (it is
-- state-scoped: a captured payment legitimately coexists with a later one on the
-- same booking)". That sentence is correct. The conclusion drawn from it — that
-- the guard therefore cannot have a constraint — is not. A STATE-SCOPED
-- invariant is exactly what a PARTIAL unique index is for.
--
-- Re-enumerating every findFirst/updateMany-then-create guard over a money table
-- against HEAD on 2026-09-08 found three that survived all three earlier passes,
-- because none of them is whole-table:
--
--   1. payments                 at most one LIVE payment per booking
--   2. referral_claims          at most one claim per (referrer, referee) PAIR
--   3. marketplace_subscriptions at most one ACTIVE subscription per (user, role)
--
-- Each is named below with the file:line of the application guard it replaces.
-- Nothing speculative is added: every index here has a guard behind it, and
-- guards that turned out NOT to encode an invariant were deliberately left
-- alone (see THE ONES DELIBERATELY NOT CONSTRAINED at the foot of this file).
--
-- WHAT WAS MEASURED, NOT ASSUMED
--
-- Production was read through DIRECT_URL (aws-1-ap-northeast-1.pooler.supabase.com)
-- on 2026-09-08. It is reachable and it is nearly empty:
--
--   payments                    6 rows   (4 initiated, 2 failed; 6 distinct bookings)
--   marketplace_subscriptions   6 rows   (6 distinct users, 6 distinct roles, all FREE/ACTIVE)
--   referral_claims             0 rows
--   commissions                 0 rows
--   temple_payouts              0 rows
--   priest_payouts              0 rows
--   payout_requests             0 rows
--
-- Duplicate counts for the three keys created below, measured with the SAME
-- predicate each index uses:
--
--   payments live-per-booking            0 duplicate keys
--   referral_claims (referrer, referee)  0 duplicate keys
--   marketplace_subs ACTIVE (user, role) 0 duplicate keys
--
-- So all three statements below WILL succeed on production as written. They are
-- still written conditionally, because production is not the only database this
-- runs against — every developer machine, every CI database and any future
-- restore-from-backup executes it too, and migrations auto-apply on API boot
-- (render.yaml -> apps/api/package.json `prisma migrate deploy && node
-- dist/server.js`). A UNIQUE index over existing duplicates aborts the
-- migration, and an aborted migration on this project is an outage, not a
-- failed constraint.
--
-- REPO INVARIANTS RESPECTED (the same set all three earlier migrations list)
--   * PLAIN `CREATE UNIQUE INDEX`, never CONCURRENTLY. `prisma migrate deploy`
--     wraps each migration in a transaction; CONCURRENTLY inside one fails with
--     25001 and then blocks every LATER migration. This repo lost two months to
--     exactly that. Measured 2026-09-02: it raises 25001 in a transaction even
--     when the index already exists, so it cannot be defused by pre-creating.
--     If one of these ever needs to be concurrent it goes in
--     `apps/api/scripts/apply-perf-indexes.mjs` via $executeRawUnsafe, OUTSIDE
--     migrate deploy. These three tables hold 6, 6 and 0 rows; a plain CREATE
--     takes a brief lock and returns in milliseconds.
--   * ADDITIVE ONLY. No table altered, no column retyped, no row deleted or
--     rewritten. In particular this migration does NOT de-duplicate anything:
--     choosing which of two live payments or two active subscriptions is the
--     real one is a human decision with the gateway dashboard open, never an
--     unattended boot script's.
--   * Every statement is IF NOT EXISTS, so a partially applied run re-runs.
--   * NONE of these is declared in schema.prisma as `@@unique`. Two of the
--     three are PARTIAL indexes, which Prisma's schema language cannot express
--     at all; the third is conditional, and schema.prisma must describe what is
--     guaranteed rather than what is hoped for. All three are documented in
--     comments on their models so the next reader finds them. Because they are
--     absent from the schema, `prisma migrate dev` on a developer machine will
--     want to drop them — that is the same trade the three earlier migrations
--     made, and `prisma migrate deploy` (the production path) never does.
--
-- To see what landed:  node apps/api/scripts/check-money-key-duplicates.mjs
-- NOTE: that checker's KEYS array does NOT yet include these three. Extending
-- it is a one-file follow-up outside this change's scope; see the report.

-- ─── 1. payments — at most one LIVE payment per booking ─────────────────────
--
-- GUARD REPLACED
--   CHECK  src/services/payment.service.ts:702
--            prisma.payment.findFirst({
--              where: { bookingId: booking.id, status: { in: ['initiated','authorized'] } } })
--   WRITE  src/services/payment.service.ts:738
--            prisma.payment.create({ ... status: 'initiated' })
--
-- WHY THAT GUARD IS A TOCTOU
-- The check and the write are two separate statements on the module-level
-- `prisma` client with NO surrounding $transaction, NO `SELECT ... FOR UPDATE`
-- and no advisory lock, and between them sits a NETWORK CALL to Razorpay
-- (`razorpay.orders.create`, :724) that widens the window to hundreds of
-- milliseconds. Two concurrent `POST /payments/create-order` for one booking —
-- a double-tapped Pay button is enough — both read "no live payment", both open
-- a REAL Razorpay order, and both insert an `initiated` Payment row. The devotee
-- is then holding two live checkout sessions for one puja, and both can be paid.
-- Neither existing constraint stops this: the two rows carry DIFFERENT
-- gateway_order_ids, so `payments_gateway_order_id_key` is satisfied by both.
--
-- WHY PARTIAL, AND WHY THE PREDICATE IS EXACTLY THIS
-- Whole-table uniqueness on booking_id would be WRONG and would break real
-- flows: a payment that fails and is retried, or a captured payment on a
-- rebooked slot, legitimately leaves several rows on one booking. Only the LIVE
-- states are exclusive, and the predicate below is a character-for-character
-- match for the guard's `status: { in: ['initiated','authorized'] }` — if the
-- guard's state list ever changes, this predicate must change with it.
--
-- `AND booking_id IS NOT NULL` is not required for correctness (Postgres treats
-- NULLs as distinct in a unique index by default, so store-order payments, whose
-- booking_id is NULL, would never collide) but it keeps the index off every such
-- row. Store-order payments have their own guard at payment.service.ts:1058,
-- keyed on the store order rather than on a booking; it is not this index.
DO $di06$
DECLARE
  dupes bigint;
BEGIN
  SELECT count(*) INTO dupes FROM (
    SELECT "booking_id" FROM "payments"
    WHERE "booking_id" IS NOT NULL
      AND "status" IN ('initiated'::"PaymentStatus", 'authorized'::"PaymentStatus")
    GROUP BY "booking_id" HAVING count(*) > 1
  ) d;

  IF dupes > 0 THEN
    RAISE WARNING 'DI-06: payments holds % booking(s) with more than one live (initiated/authorized) payment; UNIQUE index payments_booking_id_inflight_key SKIPPED so the API can still boot. Resolve them by hand, then create the index.', dupes;
  ELSE
    BEGIN
      CREATE UNIQUE INDEX IF NOT EXISTS "payments_booking_id_inflight_key"
        ON "payments" ("booking_id")
        WHERE "booking_id" IS NOT NULL
          AND "status" IN ('initiated'::"PaymentStatus", 'authorized'::"PaymentStatus");
    EXCEPTION WHEN OTHERS THEN
      -- Reached only if a concurrent writer committed a duplicate between the
      -- count above and this statement taking its lock. The subtransaction rolls
      -- back just this CREATE; the migration still commits, the API still boots,
      -- and the warning says the constraint is absent.
      RAISE WARNING 'DI-06: UNIQUE index payments_booking_id_inflight_key could not be created (%); SKIPPED so the API can still boot.', SQLERRM;
    END;
  END IF;
END;
$di06$;

-- ─── 2. referral_claims — at most one claim per (referrer, referee) pair ────
--
-- GUARD REPLACED
--   CHECK  src/routes/referrals.ts:166
--            referralClaim.findFirst({ where: { referrerId: codeRow.userId, refereeId: referee.id } })
--   WRITE  src/routes/referrals.ts:177
--            referralClaim.create({ ... status: 'signed_up' })
--   The intent is stated in the code itself at referrals.ts:161 —
--            "// De-dupe: one signed_up claim per (referrer, referee) pair."
--
-- WHY THAT GUARD IS A TOCTOU
-- Check and write are two statements on a bare client, no transaction, no lock.
-- Two concurrent `POST /referrals/claim` with the same code from the same new
-- user both read "no existing claim" and both insert. This is a MONEY table:
-- ReferralClaim carries `reward_amount Decimal(10,2)`, and the reward rail
-- (services/payment.service.ts:112 -> :138) walks claims and credits the
-- referrer's wallet. Two claim rows for one referee is one referee paid for
-- twice — and the reward rail's own idempotency key is
-- `referral-reward-${claim.id}`, which is DIFFERENT for the two rows, so the
-- wallet's `(userId, idempotencyKey)` unique does not catch it either. The
-- duplicate has to be stopped here or it is not stopped at all.
--
-- WHY A PLAIN (non-partial) UNIQUE IS CORRECT HERE
-- `referee_id` is nullable (schema.prisma: `refereeId String? @db.Uuid`, and the
-- relation is onDelete: SetNull, so a deleted referee leaves the claim behind
-- with a NULL). Postgres treats NULLs as distinct in a unique index by default
-- (NULLS DISTINCT), so those orphaned rows never collide with each other and
-- need no `WHERE referee_id IS NOT NULL` predicate. The plain form behaves
-- identically here and is the one that could later be promoted to a Prisma
-- `@@unique([refereeId, referrerId])`, so the index name below already follows
-- Prisma's own naming convention for that promotion.
--
-- The pair is deliberately (referrer, referee) and NOT (code_id, referee): one
-- referrer may hold several referral codes over time, and the invariant the code
-- states is per PERSON, not per code.
DO $di06$
DECLARE
  dupes bigint;
BEGIN
  SELECT count(*) INTO dupes FROM (
    SELECT "referrer_id", "referee_id" FROM "referral_claims"
    WHERE "referee_id" IS NOT NULL
    GROUP BY "referrer_id", "referee_id" HAVING count(*) > 1
  ) d;

  IF dupes > 0 THEN
    RAISE WARNING 'DI-06: referral_claims holds % duplicated (referrer_id, referee_id) pair(s); UNIQUE index referral_claims_referrer_id_referee_id_key SKIPPED so the API can still boot. Resolve them by hand, then create the index.', dupes;
  ELSE
    BEGIN
      CREATE UNIQUE INDEX IF NOT EXISTS "referral_claims_referrer_id_referee_id_key"
        ON "referral_claims" ("referrer_id", "referee_id");
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'DI-06: UNIQUE index referral_claims_referrer_id_referee_id_key could not be created (%); SKIPPED so the API can still boot.', SQLERRM;
    END;
  END IF;
END;
$di06$;

-- ─── 3. marketplace_subscriptions — one ACTIVE subscription per (user, role) ─
--
-- GUARD REPLACED
--   CHECK/CLAIM  src/services/subscription.service.ts:457
--                  prisma.marketplaceSubscription.updateMany({
--                    where: { userId, role, status: 'ACTIVE' },
--                    data: { status: 'CANCELLED' } })
--   WRITE        src/services/subscription.service.ts:462
--                  prisma.marketplaceSubscription.create({ ... status: 'ACTIVE' })
--
-- WHY THAT GUARD IS A TOCTOU
-- This is the cancel-then-create shape, and the two statements are NOT in a
-- $transaction — they are independent module-level `prisma` calls inside one
-- `try` (subscription.service.ts:455). Under READ COMMITTED, two concurrent
-- activations for the same (user, role) each run their `updateMany` before
-- either `create` commits, so neither sees the other's new row: both cancel
-- nothing relevant and both insert an ACTIVE row. The user ends up holding two
-- ACTIVE subscriptions for one role.
--
-- That is a money bug, not a tidiness one. `amount Decimal(10,2)` sits on this
-- row, `subscribe()` writes a COMPLETED Transaction beside it (:478), and three
-- entitlement readers resolve the subscription with `findFirst` — getMySubscription
-- (:518), isPremium (:680) and cancel (:859). `findFirst` given two matching rows
-- picks an arbitrary one, so `cancel()` can revoke one row while `isPremium()`
-- keeps returning true from the other: a cancelled, unpaid subscriber who still
-- passes the paywall.
--
-- WHY PARTIAL
-- A user legitimately accumulates many CANCELLED and EXPIRED rows per role —
-- that history is the billing record and must not be constrained. Only ACTIVE is
-- exclusive. The predicate matches the guard's `status: 'ACTIVE'` exactly.
-- (Roles do not interfere: one user may hold one ACTIVE subscription per role
-- simultaneously, which is why `role` is in the key.)
DO $di06$
DECLARE
  dupes bigint;
BEGIN
  SELECT count(*) INTO dupes FROM (
    SELECT "user_id", "role" FROM "marketplace_subscriptions"
    WHERE "status" = 'ACTIVE'::"MarketplaceSubscriptionStatus"
    GROUP BY "user_id", "role" HAVING count(*) > 1
  ) d;

  IF dupes > 0 THEN
    RAISE WARNING 'DI-06: marketplace_subscriptions holds % (user_id, role) pair(s) with more than one ACTIVE row; UNIQUE index marketplace_subscriptions_user_id_role_active_key SKIPPED so the API can still boot. Resolve them by hand, then create the index.', dupes;
  ELSE
    BEGIN
      CREATE UNIQUE INDEX IF NOT EXISTS "marketplace_subscriptions_user_id_role_active_key"
        ON "marketplace_subscriptions" ("user_id", "role")
        WHERE "status" = 'ACTIVE'::"MarketplaceSubscriptionStatus";
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'DI-06: UNIQUE index marketplace_subscriptions_user_id_role_active_key could not be created (%); SKIPPED so the API can still boot.', SQLERRM;
    END;
  END IF;
END;
$di06$;

-- ─── THE ONES DELIBERATELY NOT CONSTRAINED ─────────────────────────────────
--
-- Recorded here so the next pass does not re-derive them, and so that "no
-- constraint" is a decision on the record rather than an omission.
--
--   payout_requests — "at most one in-flight PayoutRequest per provider"
--     (services/payout.service.ts:782). NOT an invariant. The comment at :780
--     says so explicitly: the dedupe is CRON-ONLY, and "self-serve requestPayout
--     keeps no floor and no dedupe, so a provider can still pull their balance
--     whenever they like". A unique index here would break the documented
--     product behaviour. What actually protects the money is the conditional
--     `commission.updateMany({ ..., payoutRequestId: null })` at :409, which
--     throws when it matches fewer rows than it selected — a correct optimistic
--     guard that needs no constraint.
--
--   wellness_enrollments — "at most session.capacity enrolments"
--     (routes/wellness-sessions.ts:436 count -> :449 create). A real, unguarded
--     TOCTOU that can oversell a session, but a COUNT ceiling is not a
--     uniqueness property and no unique index can express it. It needs a lock or
--     a trigger, which is a behaviour change rather than an integrity
--     constraint. Left for its own change. The other invariant on this table,
--     one enrolment per (session, user), already has
--     `wellness_enrollments_session_id_user_id_key` behind it.
--
--   donations — "one receipt-number mint per donation" (routes/donations.ts:135
--     -> :175). The bug here is not a missing constraint: `donations` already
--     has `donations_receipt_number_key`. It is that the UPDATE at :175 carries
--     no `AND status <> 'paid'` predicate, so two concurrent calls both mint a
--     receipt number and the second OVERWRITES the first on the same row. No
--     index can stop a row overwriting its own column. This is a one-line code
--     fix in a file outside this change's lane; see the report.
--
--   commissions.booking_id type change (DI-07 second half) — NOT done, on
--     purpose. See the note on `Commission.bookingId` in schema.prisma and the
--     report: the column is polymorphic across `puja_bookings` and
--     `astrologer_consultations`, so no foreign key is possible without first
--     adding a discriminator, and `ALTER COLUMN ... USING booking_id::uuid`
--     would abort API boot on the first non-uuid legacy value in ANY database
--     this ever runs against. The index half of DI-07 was already delivered by
--     20260824000000_di0607_money_key_indexes.
