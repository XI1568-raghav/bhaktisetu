# CS-007 — Bulk-reset stale TEMPLE leads (script runbook)

> **Roadmap item**: R-Q1-CS-007 (P0) · **Companion to**: R-Q1-CS-005 · **Script**: `apps/api/scripts/ops/cs007-reset-stale-temple-leads.ts` · **Time required**: ~25 min · **Owner**: founder
>
> **What this runbook covers**: end-to-end execution of the cs007 script — pre-flight, dry-run, live run, post-run audit, rollback. The companion file `cs-007-bulk-reset-stale-leads-runbook.md` covers the underlying business process and manual SQL alternative.

## Pre-flight gate

Confirm ALL of the following before invoking the script:

- [ ] CS-005 day-3 send completed (script auto-aborts if not — see Step 1 guard)
- [ ] 14-day post-send reply triage done
- [ ] `pg_dump leads > leads-pre-cs007-$(date +%F).sql` taken (rollback insurance)
- [ ] `DATABASE_URL` exported and points at **prod** Supabase (NOT pooled — use `DIRECT_URL` for DDL-grade work)

## Step 1 — Dry-run (5 min)

```bash
DATABASE_URL=postgres://<...> pnpm tsx apps/api/scripts/ops/cs007-reset-stale-temple-leads.ts --dry-run
```

Expected output:
- `[cs007] mode=DRY-RUN limit=200 now=<ISO>`
- `[cs007] CS-005 collision guard PASS (0 unsent rows).`
- `[cs007] scanned N stale TEMPLE leads.`
- Sample of first 5 leads (id + status + contact_count + last_contacted_at)
- `[cs007] DRY-RUN — would reset N leads. No writes performed.`

If the guard FAILS (`ABORT: CS-005 still has X unsent EMAILED rows...`), exit 2. Wait for CS-005 to finish then re-run.

Eyeball the sample for sanity (correct role, sufficiently stale, no anomalies). If anything looks off, stop and investigate before live run.

## Step 2 — Live run (5 min)

```bash
DATABASE_URL=postgres://<...> pnpm tsx apps/api/scripts/ops/cs007-reset-stale-temple-leads.ts --limit=200
```

Expected output:
- `[cs007] mode=LIVE limit=200 now=<ISO>`
- `[cs007] CS-005 collision guard PASS (0 unsent rows).`
- `[cs007] scanned 200 stale TEMPLE leads.`
- `Scanned: 200`, `Reset: 200`, `Skipped: 0`
- If `ops_audit_log` table missing: `[cs007] ops_audit_log table missing — 200 audit entries written to docs/agent-reports/cs007-audit-<date>.jsonl`

Safety caps:
- `--limit` rejects values > 500 (script fails fast).
- Update statement re-checks `cs007_reset_at IS NULL` so concurrent runs don't double-reset.

## Step 3 — Post-run SQL audit (5 min)

```sql
-- Reset count matches target?
SELECT COUNT(*) FROM leads
 WHERE role = 'TEMPLE'
   AND (metadata->>'cs007_reset_at') IS NOT NULL;
-- expect: 200 (or whatever --limit was)

-- All reset leads now have status=NEW and contact_count=0?
SELECT status, contact_count, COUNT(*) FROM leads
 WHERE role = 'TEMPLE'
   AND (metadata->>'cs007_reset_at') IS NOT NULL
 GROUP BY status, contact_count;
-- expect: 1 row → NEW, 0, 200

-- Audit log entries (if ops_audit_log exists)
SELECT COUNT(*) FROM ops_audit_log
 WHERE action = 'cs007_reset'
   AND created_at > NOW() - INTERVAL '1 hour';
-- expect: 200 (else check docs/agent-reports/cs007-audit-<date>.jsonl)
```

## Step 4 — Rollback (only if disaster)

The script stamps each lead's prior state into `metadata.cs007_prior` so a one-line rollback is possible:

```sql
-- Rollback for a single lead
UPDATE leads
   SET status         = (metadata->'cs007_prior'->>'status')::"LeadStatus",
       contact_count  = (metadata->'cs007_prior'->>'contact_count')::int,
       last_contacted_at = (metadata->'cs007_prior'->>'last_contact_at')::timestamp,
       metadata = metadata - 'cs007_reset_at' - 'cs007_prior',
       updated_at = NOW()
 WHERE id = '<lead-uuid>';

-- Rollback ALL leads reset in the last hour (nuclear)
UPDATE leads
   SET status         = (metadata->'cs007_prior'->>'status')::"LeadStatus",
       contact_count  = (metadata->'cs007_prior'->>'contact_count')::int,
       last_contacted_at = (metadata->'cs007_prior'->>'last_contact_at')::timestamp,
       metadata = metadata - 'cs007_reset_at' - 'cs007_prior',
       updated_at = NOW()
 WHERE role = 'TEMPLE'
   AND (metadata->>'cs007_reset_at') IS NOT NULL
   AND (metadata->>'cs007_reset_at')::timestamp > NOW() - INTERVAL '1 hour';
```

## Step 5 — Notify (optional)

Drop a one-liner into the founder log / Slack: `CS-007 reset N TEMPLE leads (was EMAILED >30d, 0 reply). Next outreach cycle re-targets them as fresh NEW.`

## Test coverage

`apps/api/scripts/ops/__tests__/cs007-reset-stale-temple-leads.test.ts` covers:

- SQL shape: `role=TEMPLE`, `status=EMAILED`, `reply_count=0`, `last_contacted_at < now-30d`, `cs007_reset_at IS NULL`, `LIMIT`
- CS-005 collision guard SQL shape
- `UPDATE leads SET status=NEW, contact_count=0`, metadata snapshot with prior state, parameterized id (no string concat)
- `ops_audit_log` INSERT shape (action=cs007_reset)
- `--dry-run` flag + `--limit=N` parser w/ safety cap (>500 rejected)
- Summary aggregator

```bash
pnpm --filter @bhaktisetu/api test cs007-reset-stale-temple-leads
```
