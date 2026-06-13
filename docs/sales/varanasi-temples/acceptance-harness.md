# Acceptance harness — how to prove 10 verified at month-end

Goal: prove 10 Varanasi temples have status `verified` AND `live` in `temple_partners` table by end of month-1.

## Hard acceptance criteria

A temple counts toward the "10 verified" goal only if ALL of the following are true at the cutoff timestamp:

1. Row exists in `temple_partners` with `city = 'Varanasi'`.
2. Status = `live` (passed `verified` and surface-enabled).
3. All 8 verification gates from `verification-checklist.md` documented with evidence URLs.
4. At least 1 darshan slot OR 1 bookable pooja published in `temple_offerings` (or analogous) table linked by `temple_partners.id`.
5. Live-stream test recording stored at `temple-partners/{temple_id}/livestream-test.mp4` ≥30 sec, bandwidth log ≥4 Mbps up.
6. MOU PDF counter-signed and stored at `temple-partners/{temple_id}/mou.pdf` with `mou_signed_at` timestamp set.

## Query to verify (Supabase SQL)

```sql
SELECT
  id,
  name,
  status,
  verified_at,
  live_at,
  mou_signed_at,
  EXTRACT(EPOCH FROM (live_at - created_at)) / 86400.0 AS days_from_lead_to_live
FROM temple_partners
WHERE city = 'Varanasi'
  AND status = 'live'
  AND mou_signed_at IS NOT NULL
ORDER BY live_at;
```

Expected result at month-end: ≥10 rows.

## Pipeline visibility query (intermediate states)

```sql
SELECT status, COUNT(*)
FROM temple_partners
WHERE city = 'Varanasi'
GROUP BY status
ORDER BY ARRAY_POSITION(
  ARRAY['lead','contacted','meeting_set','docs_received','verifying','verified','live','dropped'],
  status
);
```

Healthy funnel at week 2: lead 15 / contacted 10 / meeting_set 6 / docs_received 4 / verifying 3 / verified 1 / live 0 / dropped 2.
Healthy funnel at week 4: lead 5 / contacted 5 / meeting_set 4 / docs_received 5 / verifying 4 / verified 4 / live 10 / dropped 8.

## CSV → DB sync check

CRM CSV `crm-tracking.csv` is founder's working ledger. Source of truth for booked status flips = Supabase `temple_partners.status`. To detect drift:

```bash
# from repo root
awk -F, 'NR>1 && $3=="live"{print $1}' docs/sales/varanasi-temples/crm-tracking.csv | sort > /tmp/csv_live.txt
psql "$DATABASE_URL" -tAc "SELECT id FROM temple_partners WHERE city='Varanasi' AND status='live'" | sort > /tmp/db_live.txt
diff /tmp/csv_live.txt /tmp/db_live.txt
```

Expected: empty diff. Any difference → founder reconciles within 24 hours.

## Risk-adjusted target

Funnel math: 25 targets, expected drop:
- 25 → 18 (after initial outreach; 7 unreachable / not interested) — 28% drop
- 18 → 12 (after first meeting; 6 deferred to Q2 due to board approval lag) — 33% drop
- 12 → 10 (after verification; 2 fail Gate 1/6) — 17% drop

If at week-3 verified count < 5: trigger contingency — onboard 5 more Tier-3 warm-intros, run parallel B2B-corporate-Diwali-partnership pitch as supplementary funnel.

## Sign-off

Cutoff: 30 days after first push of this batch lands prod. Founder signs off in `_ship-log` row for R-Q1-S-004 with the SQL query output and the 10 row IDs.

If <10 verified at cutoff: file follow-up ROADMAP item `R-Q1-S-004-RETRY` with funnel analysis and revised targets list. Do not silently extend deadline.
