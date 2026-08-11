-- RV-02 (2026-08-10): add reversal states so a refund can unwind the ledger.
--
-- WHY: a refunded booking had no way to unwind the provider's earning. The
-- Commission row minted at confirm-time stayed PENDING and fully withdrawable
-- after the devotee was refunded, so the platform paid a provider on a booking
-- that earned Rs 0 — on a Rs 5,000 refunded booking, Rs 1,000 stayed withdrawable
-- to the priest and Rs 250 to the temple, ~Rs 6,250 out in total. Neither enum
-- had a terminal state to move to.
--
-- Additive only: no existing row changes meaning.
--
-- KEPT IN ITS OWN MIGRATION ON PURPOSE. `prisma migrate deploy` wraps each
-- migration in a transaction. Postgres allows ALTER TYPE ... ADD VALUE inside a
-- transaction (PG12+) only if the new value is not USED in that same
-- transaction — which is why nothing here references the new values. Isolating
-- it means that if this ever fails on a given PG version it cannot block the
-- unrelated index migration behind it. (This repo lost 2 months to exactly that
-- failure mode with CREATE INDEX CONCURRENTLY — see docs/caveats.md.)
ALTER TYPE "CommissionStatus" ADD VALUE IF NOT EXISTS 'REVERSED';
ALTER TYPE "ProviderPayoutStatus" ADD VALUE IF NOT EXISTS 'reversed';
