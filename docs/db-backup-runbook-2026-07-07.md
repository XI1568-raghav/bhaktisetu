# DB Backup Runbook — GitHub Actions `db-backup.yml` (P0-13)

> **Created**: 2026-07-07
> **Owner**: Sunil (founder)
> **Scope**: Activating the daily Supabase Postgres backup workflow
> `.github/workflows/db-backup.yml` so it actually produces dumps.
> **Supersedes** the backup *mechanism* section of
> `docs/backup-restore-runbook.md` (2026-05-02) — see
> [“Relationship to the existing runbook”](#relationship-to-the-existing-runbook)
> below. The restore procedure in that doc stays valid.

## TL;DR — the problem

`db-backup.yml` is **green but produces zero dumps.** The workflow's own
header (lines 8-20) says it plainly:

> Until secrets land, both scripts no-op and exit 0 (skipped: missing-env).
> Workflow stays green so it doesn't spam the founder with failure emails.

`scripts/backup/supabase-backup.mjs` has an `envGate()` that checks three
env vars and silently exits 0 if any are missing. So GitHub shows a green
check every night at 19:00 UTC, but no `.dump` file is created and no
bytes land in any bucket. **There is currently no working off-Supabase
backup.** This runbook fixes that by setting the four secrets the workflow
reads.

## Exact secrets to set (GitHub repo secrets)

| # | Secret name | Required? | Where the workflow reads it | What it is |
|---|---|---|---|---|
| 1 | `SUPABASE_DB_URL` | **yes** | `db-backup.yml` line 60 → `supabase-backup.mjs` `envGate()` | Postgres **direct** connection string (NOT the pooled/Pooler URL) with `sslmode=require`. `pg_dump` needs a direct session. |
| 2 | `SUPABASE_URL` | **yes** | `db-backup.yml` line 61 → `envGate()` + upload URL host | Your project base URL, e.g. `https://<project-ref>.supabase.co` |
| 3 | `SUPABASE_SERVICE_ROLE_KEY` | **yes** | `db-backup.yml` line 62 → `Authorization: Bearer` + `apikey` header for Storage upload | The service-role JWT. **NEVER expose to client / web / .env.example.** |
| 4 | `SUPABASE_BACKUP_BUCKET` | recommended | `db-backup.yml` lines 63 + 71 | Storage bucket name. Defaults to `db-backups` if unset, but you must **create that bucket in Supabase Storage first** (see step 2). Set explicitly to avoid surprises. |
| 5 | `HEARTBEAT_URL` | optional | `db-backup.yml` line 64 | healthchecks.io URL. GET on success. Lets you get an alert when the backup *stops* running (not just when it fails). |

> The `envGate()` in `supabase-backup.mjs` only hard-requires the first
> three (`SUPABASE_DB_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`).
> If `SUPABASE_BACKUP_BUCKET` is unset the script falls back to the
> literal string `db-backups` — but that bucket must already exist in
> your Supabase project or the upload 404s. Set it explicitly.

## Step 1 — Gather the values (Supabase dashboard)

All four come from the Supabase dashboard for your **production** project.

### `SUPABASE_URL`
- Dashboard → **Project Settings** (gear, bottom left) → **API**
- Field: **Project URL** → copy. Shape: `https://<project-ref>.supabase.co`

### `SUPABASE_DB_URL` (the direct, non-pooled connection string)
- Dashboard → **Project Settings** → **Database** → **Connection string**
- Select the **Session pooler / Direct connection** tab — **NOT** the
  Transaction pooler. The URL must point at port `5432` (direct), not
  `6543` (pooled). `pg_dump` opens one long-lived session; the pooler
  (PgBouncer transaction mode) breaks it.
- Shape:
  `postgresql://postgres.<project-ref>:***REMOVED***@db.<project-ref>.supabase.co:5432/postgres`
- Append `?sslmode=require` if not already present (Supabase requires TLS).
- Use the **database password** you set when creating the project. If you
  lost it, Dashboard → Database → **Reset database password** first.

### `SUPABASE_SERVICE_ROLE_KEY`
- Dashboard → **Project Settings** → **API** → **Project API keys**
- Field: **service_role** (the `secret` row, NOT the `anon` public row).
- Treat this like a root credential — it bypasses Row Level Security.

### `SUPABASE_BACKUP_BUCKET` (create it first, then use the name)
- Dashboard → **Storage** → **New bucket**
- Name: `db-backups` (or pick your own; set the secret to match)
- **Private** bucket (the service-role key authenticates uploads; public
  is unnecessary and unsafe for DB dumps).
- Note the bucket name exactly — it becomes the secret value.

### `HEARTBEAT_URL` (optional)
- Create a check at https://healthchecks.io (free tier).
- Copy the **Ping URL**. Set the check to expect a ping **daily** with a
  2-day grace period, so you get alerted if a run is silently skipped.

## Step 2 — Set the secrets via `gh` CLI

Run these from a checkout of the `bhaktisetu` repo on your laptop. `gh`
must be authenticated (`gh auth login`) with scope `repo` + `workflow`.
Replace each `<placeholder>` with the real value gathered in step 1.
**Do not commit these values anywhere** — they go straight to GitHub's
encrypted secret store and never touch the repo.

```powershell
# 1. Direct (non-pooled) Postgres connection string, sslmode=require.
gh secret set SUPABASE_DB_URL `
  --repo <owner/bhaktisetu> `
  --body "postgresql://postgres.<project-ref>:***REMOVED***@db.<project-ref>.supabase.co:5432/postgres?sslmode=require"

# 2. Project base URL.
gh secret set SUPABASE_URL `
  --repo <owner/bhaktisetu> `
  --body "https://<project-ref>.supabase.co"

# 3. service_role JWT — the secret API key, NOT anon. Never ship to client.
gh secret set SUPABASE_SERVICE_ROLE_KEY `
  --repo <owner/bhaktisetu> `
  --body "<service-role-jwt>"

# 4. Storage bucket name (must already exist in Supabase Storage).
gh secret set SUPABASE_BACKUP_BUCKET `
  --repo <owner/bhaktisetu> `
  --body "db-backups"

# 5. Optional — healthchecks.io ping URL.
gh secret set HEARTBEAT_URL `
  --repo <owner/bhaktisetu> `
  --body "https://hc-ping.com/<uuid>"
```

> **PowerShell note**: the backtick `` ` `` is the line continuation.
> If you prefer one-liners, drop the backticks and put each `gh secret set`
> on a single line. You can also pipe a value without echoing it to
> terminal: `gh secret set SUPABASE_DB_URL --repo <owner/bhaktisetu> < .env-db-url`
> is **not** supported (gh reads stdin only for some commands) — prefer
> `--body` or, for sensitive values, `--body-file` pointing at a
> temp file you delete after: `gh secret set SUPABASE_DB_URL --repo <r> --body-file ./tmp-secret.txt ; Remove-Item ./tmp-secret.txt`.

Verify all five landed:

```powershell
gh secret list --repo <owner/bhaktisetu>
# Expect to see: SUPABASE_DB_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
#                SUPABASE_BACKUP_BUCKET, HEARTBEAT_URL
```

## Step 3 — Verify the workflow actually produces a dump

Do NOT trust the green check. The whole bug is that the workflow is green
while producing nothing. Verify three things:

### 3a. Manually trigger the workflow
```powershell
gh workflow run db-backup.yml --repo <owner/bhaktisetu>
# Wait ~5-10 min, then watch the run:
gh run watch --repo <owner/bhaktisetu> --exit-status
```
Or via UI: repo → **Actions** → **db-backup** → **Run workflow**.

### 3b. Check the workflow log shows a real byte count
Open the run → **backup** job → **"Run daily backup"** step. The script
prints a single-line JSON to stdout. **Before secrets** it printed
something like `{"skipped":true,"reason":"missing env"}`. **After
secrets** it MUST print a line containing `sizeBytes` and a `key`:

```json
{"ok":true,"bucket":"db-backups","key":"backups/2026/07/07/bhaktisetu-2026-07-07T19-00-12-000Z.dump","sizeBytes":41235678,"sha256":"...","elapsedMs":9421}
```

If `sizeBytes` is present and > 0, the dump was created and uploaded. If
you still see `skipped: true, reason: "missing env"`, a required secret
name is wrong (typo) or empty — re-run `gh secret list` and compare.

### 3c. Check the destination bucket
- Dashboard → **Storage** → bucket `db-backups`
- You should see a new object at `backups/YYYY/MM/DD/bhaktisetu-<ISO>.dump`
  with a non-zero size.
- Cross-check the size in the bucket matches the `sizeBytes` in the log
  line from 3b.

### 3d. Check the prune step
The next step in the job, **"Prune backups older than 30 days"**, lists
+ deletes objects older than 30d. On a fresh bucket it logs `0` deletions
— that's fine. It only matters once you have >30d of history.

## RPO target vs. current schedule (the 24-hour gap)

`docs/backup-restore-runbook.md` sets **RPO = 1 hour** (max acceptable
data loss). The workflow as written runs **once a day** at 19:00 UTC:

```yaml
on:
  schedule:
    - cron: '0 19 * * *'   # daily 19:00 UTC = 00:30 IST
```

That is a **24-hour RPO**, not 1-hour. To meet the documented 1h RPO you
have two options — pick one and update the cron:

### Option A — hourly GH Actions run (simplest, free-tier OK)
Change the cron to every hour at an off-minute (avoid `0` to dodge the
fleet-wide GH Actions clock skew):

```yaml
on:
  schedule:
    - cron: '7 * * * *'   # hourly at :07 UTC
```

Cost check (workflow header line 22-23 quotes 5 min/run × 30 runs/mo =
150 min/mo on the daily schedule): hourly = ~720 runs/mo × ~5 min =
**~3600 GH Actions minutes/mo**. The free tier is **2000 min/mo** for
private repos; **unlimited for public repos**. If `bhaktisetu` is
private, hourly will blow the free budget — go with Option B or make the
repo public. Confirm the repo visibility (`gh repo view --json
visibility`) before choosing.

### Option B — Supabase PITR (Pro, $25/mo) — recommended at 1h RPO
The existing runbook already names this: upgrade to Supabase **Pro** for
7-day Point-in-Time Recovery. PITR gives true ~second-granularity restore
within the retention window and removes the dependency on the GH Actions
dump for the 1h RPO. Keep the daily `db-backup.yml` dump as the
**off-platform** copy (Supabase account compromise can't wipe it) and use
PITR for the short-RPO restores. **Upgrade trigger** per the existing
runbook: 1,000 active users OR ₹10L cumulative GMV, whichever first.

### Recommendation
Until GMV/user thresholds trip Pro, run **Option A at 4-hour intervals**
(`cron: '17 */4 * * *'` → 6 runs/day × 5 min = 150 min/mo, inside the
free tier for private repos) as a pragmatic 4-hour RPO, and document the
deviation from the 1h target in `docs/data-retention-policy.md`. Revisit
at the Pro trigger. **Update the cron in the same PR that lands these
secrets** so the schedule matches the RPO you actually chose.

> Free-tier discipline: read `docs/free-tier-budgets.md` before changing
> the cron interval. The workflow header already accounts for the daily
> cadence under the 1900-min/mo baseline cited in TASKS.md.

## Relationship to the existing runbook

`docs/backup-restore-runbook.md` (last refreshed 2026-05-02) documents a
**different, older** backup mechanism that does **not** match what is
shipped:

| Aspect | Old runbook (2026-05-02) | Actual shipped (`db-backup.yml`) |
|---|---|---|
| Frequency | Weekly, Sundays 02:00 IST | Daily, 19:00 UTC |
| Destination | Cloudflare **R2** (`r2://darshya-backups/`) | **Supabase Storage** bucket `db-backups` |
| Secrets | `DATABASE_URL`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BACKUP_BUCKET` | `SUPABASE_DB_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_BACKUP_BUCKET`, `HEARTBEAT_URL` |
| Dump format | `pg_dump --format=p` (plain SQL, gzipped) | `pg_dump --format=custom` (binary, pg_restore-friendly) |
| Trigger | `apps/api/src/jobs/backup-cron.ts` → `apps/api/scripts/backup.mjs` (Render/cron-job.org) | GitHub Actions scheduled workflow + `scripts/backup/supabase-backup.mjs` |
| RPO claim | 1 hour | 24 hours as-shipped (see [RPO section](#rpo-target-vs-current-schedule-the-24-hour-gap)) |

**What to do with the old runbook:**
- Its **restore procedure** (Steps 1-5, DR drill checklist, known caveats
  about `auth.*`/`storage.*`) is still valid in principle — `pg_restore`
  of a `--format=custom` dump works the same way as the plain-SQL path it
  describes, just swap `psql -f pg-restore.sql` for
  `pg_restore -d "$STAGING_DATABASE_URL" --no-owner --no-privileges pg-restore.dump`.
- Its **“Required env vars”** table and **“Manual backup”** command
  (`node apps/api/scripts/backup.mjs`) reference the old R2 mechanism and
  are **stale** — do not follow them for the GH Actions backup. Use this
  runbook for activation; use the old one for restore topology.
- Recommended follow-up (out of scope here, founder-gated): reconcile the
  two docs — either fold this runbook's activation steps into
  `backup-restore-runbook.md` and delete the R2 section, or add a clear
  “CURRENT BACKUP MECHANISM” banner at the top of the old runbook
  pointing here. The 2026-05-02 “Last refreshed” date should be bumped
  and the R2-only env-var table struck through.

## Quick troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Log shows `{"skipped":true,"reason":"missing env"}` | One of the 3 required secrets is unset or mistyped | `gh secret list`, compare names; re-set the bad one |
| `pg_dump exited 1: ... server closed the connection unexpectedly` | Used the **pooled** URL (port 6543) | Re-copy the **direct** URL (port 5432) from Supabase → Database → Connection string |
| `pg_dump: connection requires sslmode=require` | Forgot `?sslmode=require` | Append it to `SUPABASE_DB_URL` |
| Upload step 404s / `bucket not found` | Bucket `db-backups` not created, or `SUPABASE_BACKUP_BUCKET` secret name ≠ actual bucket | Create the bucket in Supabase Storage; align the secret value |
| Upload 401/403 | `SUPABASE_SERVICE_ROLE_KEY` is actually the `anon` key, or expired | Re-copy the **service_role** secret key |
| Workflow still green but bucket empty after a day | `envGate` no-op + you didn't re-verify after setting secrets | Re-run step 3a-3c; the log line is the source of truth, not the green check |
