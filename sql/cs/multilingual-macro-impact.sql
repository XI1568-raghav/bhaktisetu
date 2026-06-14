-- R-Q2-CS-003 — Multilingual macros impact KPIs
-- Assumes warehouse table `cs_tickets` with columns:
--   ticket_id (uuid), created_at (timestamptz), first_response_at (timestamptz),
--   language (text, ISO 639-1: en/hi/ta/te/bn/mr), macro_id_used (text, nullable, e.g. M001),
--   csat_score (smallint 1-5, nullable), nps_score (smallint 0-10, nullable)
--
-- Run baseline BEFORE rollout; re-run T+14d and T+28d to measure lift.
-- Pin all 4 queries in Metabase as "Multilingual Macros — Impact".

-- ============================================================
-- Q1. p50 / p90 first-response by language, weekly (last 12w)
-- ============================================================
SELECT
  date_trunc('week', created_at)::date AS week,
  language,
  count(*) AS tickets,
  percentile_cont(0.5) WITHIN GROUP (
    ORDER BY EXTRACT(EPOCH FROM (first_response_at - created_at)) / 60.0
  ) AS p50_first_response_min,
  percentile_cont(0.9) WITHIN GROUP (
    ORDER BY EXTRACT(EPOCH FROM (first_response_at - created_at)) / 60.0
  ) AS p90_first_response_min
FROM cs_tickets
WHERE created_at >= now() - INTERVAL '12 weeks'
  AND first_response_at IS NOT NULL
  AND language IN ('en','hi','ta','te','bn','mr')
GROUP BY 1, 2
ORDER BY 1 DESC, 2;

-- ============================================================
-- Q2. Macro usage rate by language, weekly
-- Target: regional langs >60% by T+30d
-- ============================================================
SELECT
  date_trunc('week', created_at)::date AS week,
  language,
  count(*) AS total_tickets,
  count(macro_id_used) AS tickets_with_macro,
  ROUND(100.0 * count(macro_id_used) / NULLIF(count(*), 0), 1) AS macro_usage_pct
FROM cs_tickets
WHERE created_at >= now() - INTERVAL '12 weeks'
  AND language IN ('en','hi','ta','te','bn','mr')
GROUP BY 1, 2
ORDER BY 1 DESC, 2;

-- ============================================================
-- Q3. CSAT delta: tickets-with-macro vs without, per language
-- Target: with-macro CSAT >= +0.5 pt vs without
-- ============================================================
SELECT
  language,
  CASE WHEN macro_id_used IS NOT NULL THEN 'with_macro' ELSE 'no_macro' END AS macro_segment,
  count(csat_score) AS responses,
  ROUND(avg(csat_score)::numeric, 2) AS avg_csat,
  ROUND(stddev_samp(csat_score)::numeric, 2) AS stddev_csat
FROM cs_tickets
WHERE created_at >= now() - INTERVAL '30 days'
  AND csat_score IS NOT NULL
  AND language IN ('en','hi','ta','te','bn','mr')
GROUP BY 1, 2
ORDER BY 1, 2;

-- ============================================================
-- Q4. Regional NPS trend (4-week rolling), Ta/Te/Bn/Mr cohort
-- Target: regional NPS from ~32 → >40
-- NPS = %promoters (9-10) - %detractors (0-6)
-- ============================================================
WITH weekly AS (
  SELECT
    date_trunc('week', created_at)::date AS week,
    language,
    count(*) FILTER (WHERE nps_score >= 9) AS promoters,
    count(*) FILTER (WHERE nps_score <= 6) AS detractors,
    count(nps_score) AS total_responses
  FROM cs_tickets
  WHERE created_at >= now() - INTERVAL '16 weeks'
    AND nps_score IS NOT NULL
    AND language IN ('ta','te','bn','mr')
  GROUP BY 1, 2
)
SELECT
  week,
  language,
  total_responses,
  ROUND(100.0 * (promoters - detractors) / NULLIF(total_responses, 0), 1) AS nps
FROM weekly
ORDER BY 1 DESC, 2;
