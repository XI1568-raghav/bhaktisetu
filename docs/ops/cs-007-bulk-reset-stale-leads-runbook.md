# Bulk-Reset 200 Stale EMAILED Leads (TEMPLE role) — Ops Runbook

> **Roadmap item**: R-Q1-CS-007 (P0) · **Companion to**: R-Q1-CS-005 (re-send) · **Authored**: 2026-06-12 · **Time required**: ~30 min · **Owner**: founder
>
> **Goal**: clean stale outreach lifecycle. 200 leads stuck in `EMAILED` status w/ 0 replies for ≥30 days + `role=TEMPLE` should reset to `NEW` so the rolling-window outreach engine can pick them up fresh once IT-004 (Resend DNS) + CS-005 (re-send w/ new templates) cycle clears.

## Pre-flight gate

```markdown
- [ ] CS-005 re-send completed (200 stale leads got fresh warm-followup; non-responders identified)
- [ ] 14-day post-send reply triage already run (per CS-005 Step 8)
- [ ] Specifically: leads to bulk-reset = (still EMAILED + 0 reply 30+ days after CS-005 send + role=TEMPLE)
- [ ] Backup pg_dump of leads table taken (revert if disaster)
```

## Step 1 — Identify candidates (5 min)

```sql
-- Confirm count before action
SELECT COUNT(*)
FROM leads
WHERE status = 'EMAILED'
  AND role = 'TEMPLE_MANAGER'
  AND last_contacted_at < NOW() - INTERVAL '30 days'
  AND (metadata->>'cs005_resent_at') IS NOT NULL  -- already re-sent per CS-005
  AND NOT EXISTS (
    SELECT 1 FROM leads_replies lr  -- if you have a replies tracking table
    WHERE lr.lead_id = leads.id
      AND lr.received_at > (leads.metadata->>'cs005_resent_at')::timestamp
  );
-- Expected: ~200 rows
```

If no `leads_replies` table — proxy via `status` change (leads that didn't move from EMAILED → REPLIED/CONVERTED/BOUNCED post-CS-005).

## Step 2 — Backup (2 min)

```bash
pg_dump --table=leads $DATABASE_URL > /tmp/leads-pre-cs007-bulk-reset-2026-06-12.sql
```

## Step 3 — Bulk-reset transaction (5 min)

```sql
BEGIN;

UPDATE leads
SET
  status = 'NEW',
  contact_count = 0,
  notes = COALESCE(notes || E'\n', '') || 'cs007-bulk-reset 2026-06-12 (was EMAILED 30+ days, no reply post-cs005)',
  metadata = metadata || jsonb_build_object('cs007_bulk_reset_at', NOW()::text),
  updated_at = NOW()
WHERE id IN (
  SELECT id FROM leads
  WHERE status = 'EMAILED'
    AND role = 'TEMPLE_MANAGER'
    AND last_contacted_at < NOW() - INTERVAL '30 days'
    AND (metadata->>'cs005_resent_at') IS NOT NULL
);

-- Verify count matches Step 1
-- COMMIT only after sanity check
ROLLBACK;  -- replace w/ COMMIT after dry-run verify
```

Run as `ROLLBACK` first — verify affected rows count matches Step 1 (~200).

Then re-run w/ `COMMIT`.

## Step 4 — Post-reset audit (5 min)

```sql
-- Verify reset happened
SELECT status, role, COUNT(*) AS count
FROM leads
WHERE (metadata->>'cs007_bulk_reset_at') IS NOT NULL
GROUP BY status, role;
-- Expected: status='NEW', role='TEMPLE_MANAGER', count=~200

-- Confirm contactCount reset
SELECT COUNT(*) FILTER (WHERE contact_count = 0) AS reset_count,
       COUNT(*) AS total_reset
FROM leads
WHERE (metadata->>'cs007_bulk_reset_at') IS NOT NULL;
-- Expected: reset_count == total_reset

-- Spot-check 3 rows
SELECT id, name, status, contact_count, last_contacted_at, notes
FROM leads
WHERE (metadata->>'cs007_bulk_reset_at') IS NOT NULL
LIMIT 3;
-- Expected: notes contains 'cs007-bulk-reset 2026-06-12'
```

## Step 5 — Re-queue for outreach cron (3 min)

The outreach cron (per `apps/api/src/jobs/outreach-cron.ts`) picks leads w/ status=NEW. Post-reset, these 200 will flow into next cron tick automatically.

```bash
# Manually trigger cron if you don't want to wait
curl -X POST "$API_URL/api/v1/cron/outreach-tick?token=$CRON_TOKEN"
# OR wait for next scheduled tick (per existing cron schedule)
```

## Step 6 — Document + handoff (5 min)

Update `docs/agent-reports/cs007-bulk-reset-2026-06-12.md` w/:
- timestamp of run
- exact row count affected
- next-action note (these 200 will get fresh outreach with NEW templates per M-014 personalized v2)

## Pass criteria

- [ ] CS-005 reply triage shows clear 30-day non-responders identified
- [ ] Pre-flight backup taken
- [ ] Step 1 SQL count matches expected ~200
- [ ] Step 3 transaction reviewed as ROLLBACK first, then COMMIT
- [ ] Step 4 audit confirms status=NEW + contact_count=0 + notes annotated
- [ ] Step 5 next outreach cron tick verified picked these up
- [ ] Step 6 handoff doc filed

## What this unblocks

- **Rolling-window outreach engine** runs clean (no stale leads clogging)
- **R-Q1-M-014** (personalized outreach v2) gets a clean batch of 200 NEW leads to test new templates against
- **Lead-quality KPI** (% NEW / % EMAILED / % REPLIED / % CONVERTED) reads true post-reset

## Failure modes

| Failure | Cause | Fix |
|---|---|---|
| Step 1 count >> 200 | Filter too loose (e.g. role mismatch) | Tighten WHERE — verify role enum exact value via `SELECT DISTINCT role FROM leads` |
| Step 3 affects more rows than Step 1 | Race condition between count + update | Use SELECT FOR UPDATE in same transaction, OR add row-level lock |
| Step 4 audit shows status didn't change | UPDATE rolled back (forgot COMMIT) | Re-run UPDATE block w/ COMMIT |
| Outreach cron doesn't pick up | Cron schedule disabled OR queue gate filters | Verify cron schedule + queue filter logic |

## Out of scope

- Same operation for non-TEMPLE roles (pandit / gaushala / astrologer) — file CS-007b if needed
- Per-lead manual review before reset (200 too many for manual; this is bulk-reset by design)
- Outreach template assignment post-reset (handled by M-014 v2 templates)

## Closes

R-Q1-CS-007 — runbook shipped. Status flips to `shipped` after founder runs 6 steps + handoff doc filed.
