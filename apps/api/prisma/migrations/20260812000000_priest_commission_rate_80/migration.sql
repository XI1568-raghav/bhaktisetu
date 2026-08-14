-- Pandit revenue share: correct the stale 0.70 default to the 80/20 doctrine.
--
-- The 2026-08-04 booking revamp cut the platform take from 30% to 20% "to win
-- pandit supply" and set DEFAULT_PRIEST_SHARE = 0.8 in booking.service.ts. It
-- never changed this column's default. resolvePriestShare() accepts any stored
-- value in (0,1] as authoritative and only falls back to the constant OUTSIDE
-- that range -- and 0.70 is inside it. So the constant never fired, and every
-- pandit onboarded through the normal flow was paid 70%, not the 80% the supply
-- pitch, the GTM plan and the take-rate doctrine all promise. On a Rs 10,000
-- booking that is a Rs 1,000 shortfall, silently, on every booking.
--
-- Two statements, both additive and non-destructive:

-- 1. New pandits get the correct share.
ALTER TABLE "priests" ALTER COLUMN "commission_rate" SET DEFAULT 0.80;

-- 2. Existing rows sitting on the STALE DEFAULT are corrected. Scoped to
--    exactly 0.70 on purpose: a pandit genuinely negotiated onto some other
--    rate keeps it. This direction of error also favours the provider, which is
--    the right way to be wrong while building supply trust.
UPDATE "priests" SET "commission_rate" = 0.80 WHERE "commission_rate" = 0.70;
