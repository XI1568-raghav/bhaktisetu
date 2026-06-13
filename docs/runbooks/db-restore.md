# DB Restore Runbook — Supabase Postgres from `db-backups` bucket

> R-Q2-IT-003 companion. Source of truth for restoring the production
> Postgres DB from a daily `pg_dump --format=custom` artifact.
>
> Targets: **RPO 24h** (daily backup), **RTO 4h** (manual restore + smoke).
>
> **Founder must be able to follow this BLIND. Every step has a verbatim
> command.**

---

## When to run this

| Trigger | First action |
|---|---|
| Data corruption / accidental delete | Notify ops Slack → freeze writes via Supabase dashboard → start here |
| Supabase project lost / suspended | Provision fresh project → here |
| DR drill (annual) | Restore to **staging**, never prod |
| Pre-migration safety net | Snapshot pre-deploy, restore only if migration breaks |

## Inputs

- **Source dump**: `db-backups/backups/YYYY/MM/DD/bhaktisetu-<ISO>.dump` in Supabase Storage.
- **Target DB URL**: the database you want to restore INTO. Usually a fresh
  Supabase project (DR) or staging. **Never restore into prod unless prod is
  already broken** — the dump will overwrite live rows.

## Prerequisites

Local machine needs:

- `pg_restore` (matches Supabase Postgres major; install via
  `apt-get install postgresql-client` on Ubuntu, `brew install libpq`
  on macOS, or use the Supabase Docker image which ships psql tools).
- `curl` and `jq` for the Storage REST download.
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` env vars set locally (NEVER
  commit these — read from `~/.bhaktisetu-secrets` or paste once into shell).
- `STAGING_DB_URL` or `RESTORE_DB_URL` env var = the target DB URL.

## Step 1 — Pick the dump to restore

List recent backups:

```bash
curl -s -X POST \
  "$SUPABASE_URL/storage/v1/object/list/db-backups" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"prefix":"backups","limit":1000,"sortBy":{"column":"name","order":"desc"}}' \
  | jq -r '.[].name'
```

Then drill into the day folder:

```bash
DATE="2026-06-13"   # pick desired
Y=$(echo $DATE | cut -d- -f1); M=$(echo $DATE | cut -d- -f2); D=$(echo $DATE | cut -d- -f3)
curl -s -X POST \
  "$SUPABASE_URL/storage/v1/object/list/db-backups" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"prefix\":\"backups/$Y/$M/$D\",\"limit\":100}" \
  | jq -r '.[].name'
```

Pick the latest file name (e.g. `bhaktisetu-2026-06-13T19-00-00-000Z.dump`).

## Step 2 — Download the dump

```bash
DUMP="bhaktisetu-2026-06-13T19-00-00-000Z.dump"
curl -s -L \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -o /tmp/$DUMP \
  "$SUPABASE_URL/storage/v1/object/db-backups/backups/$Y/$M/$D/$DUMP"

ls -lh /tmp/$DUMP   # sanity: expect MB-to-GB scale, not bytes
```

## Step 3 — Verify dump integrity

```bash
pg_restore --list /tmp/$DUMP | head -30
```

Should print a table-of-contents listing schemas, tables, indexes. If it
errors "input file does not appear to be a valid archive" → the dump is
corrupt; try the prior day's file.

## Step 4 — Restore to target

**DRY RUN FIRST** — outputs the SQL pg_restore would execute, doesn't run:

```bash
pg_restore --no-owner --no-privileges --list /tmp/$DUMP | wc -l
```

**Live restore** (irreversible — make sure `$RESTORE_DB_URL` points where you
intend):

```bash
pg_restore \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  --jobs 4 \
  --dbname "$RESTORE_DB_URL" \
  /tmp/$DUMP
```

Flags:
- `--no-owner --no-privileges` — matches backup flags; portable across tiers
- `--clean --if-exists` — drop objects before recreate (avoids "already exists" errors)
- `--jobs 4` — parallel restore, ~2-3× faster on multi-core

Expect a few `WARNING` lines for extensions/roles owned by `supabase_admin` —
those are harmless. **FATAL** or **ERROR** lines need attention.

## Step 5 — Smoke verify

```bash
psql "$RESTORE_DB_URL" -c '\dt' | head -20
psql "$RESTORE_DB_URL" -c 'SELECT count(*) FROM "User";'
psql "$RESTORE_DB_URL" -c 'SELECT count(*) FROM "Booking";'
psql "$RESTORE_DB_URL" -c 'SELECT max("createdAt") FROM "User";'
```

The last query should return a timestamp close to the backup date.

## Step 6 — Swap traffic (only if restoring to a fresh project)

1. Update Render env `DATABASE_URL` to the new restored DB URL.
2. Manual deploy on Render service `bhaktisetu-api`.
3. Verify `https://api.darshya.online/health` returns 200.
4. Curl 3 critical endpoints:
   ```bash
   curl -s -o /dev/null -w "%{http_code}\n" https://api.darshya.online/api/v1/pujas/types
   curl -s -o /dev/null -w "%{http_code}\n" https://api.darshya.online/api/v1/temples
   curl -s -o /dev/null -w "%{http_code}\n" https://api.darshya.online/api/v1/auth/me
   ```
5. Update PostHog + Sentry release tags with restore note.
6. Post in #ops: "Restore complete from $DATE backup; RTO Xh Ymin".

## DR drill checklist (annual)

- [ ] Pick a recent dump (≤7 days old)
- [ ] Provision a throwaway Supabase project (free tier)
- [ ] Walk steps 1-5 against that project
- [ ] Capture elapsed time (target ≤4h)
- [ ] File PR adding `## DR drill 20XX-MM-DD` entry below
- [ ] Delete the throwaway project

## DR drill history

_(append entries as drills complete)_

| Date | Source dump | Target | Elapsed | Notes |
|---|---|---|---|---|

## Failure modes

| Symptom | Diagnosis | Fix |
|---|---|---|
| `pg_restore: input file ... is not a valid archive` | Corrupt dump | Use prior day |
| `permission denied for schema public` | Service role missing | Reset role via Supabase SQL editor: `grant all on schema public to service_role;` |
| `FATAL: too many connections` | Pool exhausted | Use DIRECT_URL, not pooled; restart Render service |
| Restore hangs >2h | Parallel jobs deadlock | Re-run with `--jobs 1` |
| No backups in bucket | Workflow never ran with creds | Check `secrets.SUPABASE_*` in GH Actions → re-run `db-backup.yml` manually |

## Related

- `scripts/backup/supabase-backup.mjs` — daily backup script
- `scripts/backup/prune-old-backups.mjs` — 30-day retention pruner
- `.github/workflows/db-backup.yml` — daily cron (19:00 UTC)
- `docs/backup-restore-runbook.md` — legacy R2-based runbook (kept for the
  weekly secondary dump path; do not confuse with this primary path)
- `docs/data-retention-policy.md` — legal/tax retention requirements
