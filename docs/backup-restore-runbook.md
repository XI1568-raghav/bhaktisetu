# Backup & Restore Runbook (TD9)

> **Last refreshed**: 2026-05-02
> **Owner**: Sunil (Packer Speed proprietorship)
> **Scope**: Postgres database (Supabase) + R2 weekly dump
>
> Read alongside `docs/data-retention-policy.md`.
>
> ---
>
> **CURRENT BACKUP MECHANISM — see
> [`docs/db-backup-runbook-2026-07-07.md`](./db-backup-runbook-2026-07-07.md).**
>
> The activation / secrets / mechanism sections below describe the **older
> weekly R2 dump** (`apps/api/scripts/backup.mjs` + `R2_*` env vars), which
> has been superseded by the **daily GitHub Actions Supabase Storage
> backup** at `.github/workflows/db-backup.yml` + `scripts/backup/supabase-backup.mjs`.
>
> - For **activating the live backup** (which secrets to set, where to get
>   them, how to verify a dump actually lands): use the 2026-07-07 runbook.
> - The **"Required env vars"** table and **"Manual backup"** command in
>   this doc reference the R2 mechanism and are **stale** for the GH
>   Actions backup.
> - The **restore procedure** (Steps 1-5), **DR drill checklist**, and
>   **known caveats** below remain valid — for a `--format=custom` dump
>   swap `psql -f pg-restore.sql` for
>   `pg_restore -d "$STAGING_DATABASE_URL" --no-owner --no-privileges pg-restore.dump`.
> - **RPO gap**: the live workflow runs daily (24h RPO) while this doc
>   targets 1h. See the 2026-07-07 runbook's RPO section for the
>   reconciliation options.

## Targets

| Metric | Target | Rationale |
|---|---|---|
| **RPO** (max data loss) | **1 hour** | Bookings + payments require near-current state. Acceptable to lose ≤1h on catastrophic failure. |
| **RTO** (max downtime) | **4 hours** | Allows time to spin up staging, verify dump, swap `DATABASE_URL`, and warm caches. |
| **Backup retention** | 30 days (R2) + 7 days (Supabase auto) | Tax/legal: bookings retained 7 years (see retention policy) but **operational** rollback window is 30d. |
| **DR drill** | **Annually** | Restore latest dump into a fresh Supabase project, run smoke tests, document elapsed. |

## Backup layers (defence in depth)

### 1. Supabase automatic backups (free tier)

- **What**: Daily logical backups, 7-day retention.
- **Restore path**: Supabase dashboard → Project → Database → Backups → Restore.
- **Limits**: Free tier has **no PITR** (Point-in-Time Recovery). The latest restore is "last night, ~UTC".
- **Coverage**: Full DB, all schemas including `auth`, `storage`, `public`.

### 2. Supabase PITR (Pro tier — recommended at 1K+ users)

- **Cost**: $25/mo Pro plan unlocks 7-day PITR. **Upgrade trigger**: cross 1,000 active users **or** ₹10L cumulative GMV, whichever first. Below that, weekly R2 dumps + nightly auto are sufficient.
- **What you get**: Restore to any second within retention window (7d on Pro, up to 30d with add-ons).
- **Action when triggered**: Toggle PITR in Supabase dashboard → Settings → Add-ons.

### 3. Weekly R2 dump (this runbook's main artifact)

- **What**: `pg_dump --format=p` of the public schema, gzipped, uploaded to Cloudflare R2.
- **When**: Sundays 02:00 IST (low traffic — overlap with daily ops cron tick).
- **Where**: `r2://${R2_BACKUP_BUCKET}/pg-YYYY-MM-DD.sql.gz`
- **Why R2**: Zero egress, 10 GB free, geographically separate from Supabase. A Supabase account compromise cannot wipe R2.
- **How invoked**: `apps/api/src/jobs/backup-cron.ts` → `apps/api/scripts/backup.mjs` (spawned subprocess).
- **Retention**: 30-day R2 lifecycle rule. **Set this manually once** in the Cloudflare dashboard:
  - R2 → Bucket `darshya-backups` → Settings → Object lifecycle rules → Add rule:
    - Prefix: `pg-`
    - Action: **Delete** after 30 days
- **Monitoring**: Failures alert via `SLACK_WEBHOOK_URL` (or `ADMIN_EMAILS` fallback).

## Required env vars

Set on Render (production) and your local `.env` (DR drills only):

| Var | Purpose | Required? |
|---|---|---|
| `DATABASE_URL` | Postgres connection string for `pg_dump` | yes |
| `R2_ACCOUNT_ID` | Cloudflare account | yes |
| `R2_ACCESS_KEY_ID` | R2 API token (read+write) | yes |
| `R2_SECRET_ACCESS_KEY` | R2 API token secret | yes |
| `R2_BACKUP_BUCKET` | Backup bucket name. **Recommended**: separate from media bucket. Falls back to `R2_BUCKET`, then `darshya-backups` | recommended |
| `SLACK_WEBHOOK_URL` | Failure alerts | recommended |
| `ADMIN_EMAILS` | Email fallback if Slack absent | recommended |
| `BACKUP_FORCE=1` | Bypass Sunday-02:00-IST gate (one-shot manual) | optional |

If any of the four required vars are missing, the job no-ops (`{ skipped: true, reason: 'missing env' }`).

## System binaries

The Render base image already has `pg_dump` and `gzip`. If you migrate to a slimmer image, install:

```sh
# Alpine
apk add --no-cache postgresql16-client gzip

# Debian/Ubuntu
apt-get install -y postgresql-client-16 gzip
```

## Manual backup (ad hoc)

```sh
# From repo root, with .env loaded:
node --env-file=apps/api/.env apps/api/scripts/backup.mjs

# Or force-run inside a deployed Render shell:
BACKUP_FORCE=1 node apps/api/scripts/backup.mjs
```

Output is one JSON line on stdout:

```json
{"ok":true,"bucket":"darshya-backups","key":"pg-2026-05-02.sql.gz","sizeBytes":45821934,"elapsedMs":18450,"date":"2026-05-02"}
```

## Restore procedure

> **NEVER restore directly to production.** Always restore to a staging Supabase project, verify, then swap.

### Step 1 — Identify the dump

Either pull the latest R2 dump:

```sh
aws s3 cp \
  --endpoint-url "https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com" \
  "s3://${R2_BACKUP_BUCKET}/pg-2026-05-02.sql.gz" ./pg-restore.sql.gz

gunzip pg-restore.sql.gz
```

…or use the Supabase auto-backup (dashboard → Restore → Download).

### Step 2 — Spin up staging

1. Create a fresh Supabase project (`darshya-staging-restore`).
2. Capture its connection string as `STAGING_DATABASE_URL`.

### Step 3 — Apply schema, then data

```sh
# Apply Prisma migrations to staging first (idempotent).
DATABASE_URL="$STAGING_DATABASE_URL" pnpm --filter @poojly/api exec prisma migrate deploy

# Then load the dump (pg_dump --format=p emits INSERTs that overlap with
# Prisma migrations on auth/storage rows — use --single-transaction so a
# conflict rolls back cleanly).
psql "$STAGING_DATABASE_URL" --single-transaction -f pg-restore.sql
```

If the dump conflicts with `auth.*` or `storage.*` tables already populated by Supabase project setup, restore only the `public` schema:

```sh
# Filter out auth/storage from the dump before applying.
grep -vE '^(INSERT INTO "auth"\.|INSERT INTO "storage"\.|CREATE.*"auth"\.|CREATE.*"storage"\.)' \
  pg-restore.sql > pg-restore-public.sql
psql "$STAGING_DATABASE_URL" --single-transaction -f pg-restore-public.sql
```

### Step 4 — Verify on staging

Run smoke tests against staging:

```sh
DATABASE_URL="$STAGING_DATABASE_URL" pnpm --filter @poojly/api test

# Manual verification — counts should roughly match production at backup time:
psql "$STAGING_DATABASE_URL" -c '
  SELECT
    (SELECT count(*) FROM "User"),
    (SELECT count(*) FROM "Booking"),
    (SELECT count(*) FROM "Lead"),
    (SELECT count(*) FROM "Temple")
'
```

Boot the API + web pointed at staging. Verify:

- Login works for at least one demo account.
- Existing bookings render in `/profile`.
- Razorpay test webhook still validates against the staging DB.
- 80G receipts download without 500.

### Step 5 — Cutover

1. **Put production into read-only mode**: comment out write routes in Fastify, redeploy. (Or drop API replicas to zero.)
2. Run a final manual backup (`BACKUP_FORCE=1`) to capture the gap since the dump.
3. Apply the gap manually (cherry-pick rows from final backup, if any).
4. Swap `DATABASE_URL` on Render → staging connection string.
5. Redeploy API. Verify `/health` green.
6. Re-enable write routes.
7. Post-mortem within 48h.

**Estimated wall-clock for full restore**: 2-4h depending on dump size + manual gap reconciliation. Within the 4h RTO.

## DR drill checklist (annual)

Run on Q4 quiet weekend. Allocate 4h.

- [ ] Pull latest R2 dump, confirm checksum & size sane (~1.5x last week's size max).
- [ ] Provision throwaway Supabase project.
- [ ] Run full restore (steps 1-3 above) end-to-end.
- [ ] Run `pnpm test` against restored DB — must pass.
- [ ] Boot API + web pointed at restored DB.
- [ ] Run E2E smoke (Playwright `e2e/smoke.spec.ts`).
- [ ] Record elapsed wall-clock + any blockers in `docs/dr-drill-YYYY.md`.
- [ ] Tear down throwaway Supabase project.
- [ ] If elapsed > 3h, file follow-up TD ticket to streamline.

## Known caveats

- `auth.users` and `storage.objects` are **NOT** in the dump's `public` schema. Supabase manages those internally. For a full DR you must also restore the Supabase auth/storage state — easiest path is to use Supabase's own auto-backup for those tables, weekly R2 dump for everything else.
- `pg_dump --format=p` (plain SQL) is human-inspectable but slower to restore than `--format=c` (custom). At >5 GB DB size, switch to `--format=c` + `pg_restore -j 4`.
- R2 lifecycle rule **must be set in the Cloudflare dashboard manually** — `backup.mjs` does not delete old objects (S3 LISTs cost money on R2 free tier; lifecycle is server-side and free).
- Render free tier has **no native cron**. The Sunday 02:00 IST gate runs inside the master-cron tick triggered by `cron-job.org` or QStash. If the external trigger is down, the backup is missed — Slack alert fires next tick when it eventually runs.

## Failure runbook

| Alert subject | Likely cause | Action |
|---|---|---|
| `Weekly DB backup failed` stage=pg_dump | `pg_dump` not on PATH or DB unreachable | SSH to Render, `which pg_dump`. Check Supabase status page. |
| stage=gzip | Disk full on Render | Restart Render instance (clears /tmp). |
| stage=r2 | R2 token rotated, bucket deleted, or hit storage quota | Cloudflare dashboard → R2 → check tokens + bucket. |
| stage=unhandled | Bug in `backup.mjs` or env var corruption | Check Render logs for the JSON line. |

If three consecutive weekly backups fail, treat as **P1 incident** — manually run from your laptop (`BACKUP_FORCE=1 node apps/api/scripts/backup.mjs`) until root-caused.
