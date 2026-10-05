-- ops/sql/verify-commission-state.sql
--
-- READ-ONLY. Run in dry-run mode before and after commission-default-80.sql.
-- Contains SELECTs only, so the transaction is harmless under either mode.
--
-- Doctrine: platform 20% / provider 80%.
--   priests.commission_rate   = PROVIDER share -> expect 0.80
--   store_profiles.commission = PLATFORM take  -> expect 0.20
--   commissions.percentage    = PLATFORM take at booking time (history, not edited)

\echo '== 1. priests.commission_rate column default (expect 0.8) =='
SELECT column_default AS priests_commission_rate_default
  FROM information_schema.columns
 WHERE table_schema = 'public' AND table_name = 'priests' AND column_name = 'commission_rate';

\echo '== 2. priests by provider share (stale default = 0.7) =='
SELECT "commission_rate" AS provider_share, count(*) AS priests
  FROM "priests"
 GROUP BY 1
 ORDER BY 1;

\echo '== 3. store_profiles.commission column default (expect 0.20) =='
SELECT column_default AS store_commission_default
  FROM information_schema.columns
 WHERE table_schema = 'public' AND table_name = 'store_profiles' AND column_name = 'commission';

\echo '== 4. store_profiles by platform take (expect 0.2000) =='
SELECT "commission" AS platform_take, count(*) AS stores
  FROM "store_profiles"
 GROUP BY 1
 ORDER BY 1;

\echo '== 5. commissions ledger by platform take and status (history, never rewritten) =='
SELECT "percentage" AS platform_take, "status", count(*) AS row_count, sum("amount") AS provider_amount
  FROM "commissions"
 GROUP BY 1, 2
 ORDER BY 1, 2;

\echo '== 6. verdict =='
SELECT
  (SELECT count(*) FROM "priests" WHERE "commission_rate" = 0.70)  AS priests_on_stale_070,
  (SELECT count(*) FROM "priests" WHERE "commission_rate" <> 0.80) AS priests_not_080,
  (SELECT count(*) FROM "priests")                                 AS priests_total;
