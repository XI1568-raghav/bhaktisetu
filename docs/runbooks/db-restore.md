# DB Restore Runbook — Supabase Postgres from `db-backups` bucket

> R-Q2-IT-003 companion. Source of truth for restoring the production
> Postgres DB from a daily `pg_dump --format=custom` artifact.
>
> Targets: **RPO 24h** (daily backup), **RTO 4h** (manual restore + smoke).
> These are TARGETS, not measurements — see *DR drill history*, which is empty.
>
> **Founder must be able to follow this BLIND. Every step has a verbatim
> command.**

---

## STEP 0 — OWNER: there is nothing to restore until you do this (`OPS-02`)

**~10 minutes, once, and every other section of this runbook is inert until it
is done.** The daily backup has never produced an object, because the three
secrets it needs have never been set. It used to answer
`{"ok":true,"skipped":true}` and show a green tick; since 2026-08-21 a skip fails
the run instead, but a failing job is still not a backup.

### 0a. Set exactly three GitHub Actions secrets

GitHub → repo **Settings** → **Secrets and variables** → **Actions** →
**New repository secret**. The names must match **exactly**:

| Secret | Where to get it | Trap |
|---|---|---|
| `SUPABASE_DB_URL` | Supabase → Project Settings → **Database** → Connection string → **URI** | Take the **DIRECT** connection on port **5432**. NOT the pooled one on **6543** — `pg_dump` needs a direct session and fails against the transaction pooler. This is the most likely way for a first attempt to fail. |
| `SUPABASE_URL` | Supabase → Project Settings → **API** → Project URL | Shape is `https://<ref>.supabase.co`. No trailing slash. |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → **API** → `service_role` key | Server-side only. Never ship it to a client, never paste it into a PR. |

### 0a-ii. Those three are necessary and NOT sufficient — read this before dispatching

**With only the three secrets above, the run goes RED and takes no backup.** That
is deliberate, and it is not a misconfiguration on your part. Since the `OPS-03`
change, `planDestinations()` in `scripts/backup/supabase-backup.mjs` refuses to
run when the only destination is the *same Supabase project* named in
`SUPABASE_DB_URL` — because a copy inside the account it insures is a second
copy, not a backup, and one suspension takes both. (Exactly what Render did to
this product's two services on 2026-08-17.) The failure message says so.

Pick one before you dispatch:

**Recommended — a real second destination.** Add four more secrets, same place,
~15 minutes, free: `BACKUP_S3_ENDPOINT`, `BACKUP_S3_BUCKET`,
`BACKUP_S3_ACCESS_KEY_ID`, `BACKUP_S3_SECRET_ACCESS_KEY`. Leave
`BACKUP_S3_REGION` unset — it defaults to `auto`, which is what Cloudflare R2
wants. Bucket and token steps are in `docs/runbooks/disaster-recovery.md` →
*What is missing* → item 2. This is the only path that produces `"offsite":true`.

**Stopgap — accept the risk knowingly.** Set `ALLOW_SAME_PROJECT_BACKUP` to the
literal string `true`. The run then succeeds with a loud warning and
`"offsite":false`. Use this only to get *some* restore point today while the R2
bucket is being created, and do not let it become the permanent state: a backup
in the same account is not a backup against the failure that has actually
happened to this product.

### 0b. Take one backup by hand and read the output

```bash
gh workflow run db-backup.yml
gh run watch
```

Dispatch `main`'s copy; do **not** pass a `--ref` naming the old feature branch.
The guards (skip check, size and read-back checks, the `restore_drill` input)
merged to `main` in #249 and were extended on 2026-09-04, so that branch is now an
*older, weaker* copy of the workflow. Earlier revisions of this page told you to
use it; they are retired.

### 0c. Confirm the backup is real

The run must be **green**, and the `Run daily backup` step must print a single
JSON line containing all of:

- `"ok":true`
- **no** `"skipped"`
- `sizeBytes` in the **millions**
- `tocEntries` in the **hundreds**
- `"offsite":true` — **or** `"offsite":false` plus the same-project warning, if
  you took the `ALLOW_SAME_PROJECT_BACKUP` stopgap in 0a-ii. `false` is not a
  pass; it is a restore point that dies with the account.

The job summary repeats `sizeBytes` and `tocEntries` as a table. Then open
Supabase → **Storage** → bucket `db-backups` → `backups/YYYY/MM/DD/` and confirm
the object is listed at a **non-zero size matching `sizeBytes`**. A green tick
with `sizeBytes` 0 is now impossible — but check the object anyway, because it is
the only evidence that does not come from the thing being tested.

If the run is red with `NO BACKUP WAS TAKEN`, the secrets are still unset. The
error names which ones are missing.

### 0d. Then prove the restore, which has never been done

```bash
gh workflow run db-backup.yml -f restore_drill=true
gh run watch
```

Record the printed numbers in *DR drill history* at the bottom of this file.
Until that table has a row, RPO 24h / RTO 4h at the top of this page are targets
and **must not be quoted to a counterparty, an investor, an insurer or a user.**

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

## Steps 1–2, ALTERNATE — when Supabase itself is what you lost (`OPS-03`)

**Read this before assuming steps 1 and 2 are available.** Both of them call the
Supabase Storage REST API using `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` —
i.e. they read the backup out of *the same Supabase project the database lives
in*. In the failure mode that most needs a backup (account suspended, project
deleted, credentials revoked — precisely what Render did to this product's two
services on 2026-08-17) that project is gone and **steps 1 and 2 have no endpoint
to call.**

The second destination exists for exactly this. `scripts/backup/supabase-backup.mjs`
uploads the same object, under the same key, to any S3-compatible store
configured through `BACKUP_S3_*`, and the backup run's JSON reports `"offsite":true`
with a `destinations` array of two entries when it did. If that was never
configured, there is no second copy and this section has no input — say so out
loud immediately rather than spending the recovery window looking.

Same key shape in both stores: `backups/YYYY/MM/DD/bhaktisetu-<ISO>.dump`.

```bash
# Credentials are the same four values held as GitHub Actions secrets.
export AWS_ACCESS_KEY_ID="$BACKUP_S3_ACCESS_KEY_ID"
export AWS_SECRET_ACCESS_KEY="$BACKUP_S3_SECRET_ACCESS_KEY"
export AWS_DEFAULT_REGION="${BACKUP_S3_REGION:-auto}"   # R2 wants "auto"
EP="$BACKUP_S3_ENDPOINT"                                # https://<acct>.r2.cloudflarestorage.com

# 1-ALT — list what is actually there, newest last.
aws s3 ls --endpoint-url "$EP" "s3://$BACKUP_S3_BUCKET/backups/" --recursive | sort | tail -20

# 2-ALT — pull one down. Expect MB-to-GB, never bytes.
KEY="backups/2026/06/13/bhaktisetu-2026-06-13T19-00-00-000Z.dump"
aws s3 cp --endpoint-url "$EP" "s3://$BACKUP_S3_BUCKET/$KEY" "/tmp/$(basename "$KEY")"
ls -lh "/tmp/$(basename "$KEY")"
```

No `aws` CLI to hand? `rclone` or any S3 client works — the object is a plain
`pg_dump --format=custom` file and nothing about it is Supabase-specific. From
there, **steps 3 onward are unchanged**: the dump restores identically whichever
store it came from, which is the whole point of keeping the two byte-identical.

If you are restoring because the Supabase project is gone, you are also
provisioning a fresh one — do that first so `$RESTORE_DB_URL` in step 4 points
somewhere, and finish with step 6 (swap traffic).

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

## DR drill — the automated one (do this first)

> `OPS-02`. Added 2026-08-21. This exists because the manual checklist below has
> been in this file since 2026-06-14 and **has never been performed** — the
> history table underneath it is empty, and an empty drill history means every
> claim in this runbook is untested.

One command, ~6 minutes, zero scheduled CI cost:

```bash
gh workflow run db-backup.yml -f restore_drill=true
gh run watch
```

(`--ref` for the reason in step 0b: `main`'s copy of `db-backup.yml` has no
`restore_drill` input at all and rejects the flag. Drop it after the merge.)

What it does, in the `restore-drill` job of `.github/workflows/db-backup.yml`:

1. Downloads the **newest** object from the backup bucket
   (`scripts/backup/fetch-latest-backup.mjs` — read-only; it cannot write to or
   delete from the bucket).
2. `pg_restore`s it into a **throwaway Postgres service container inside the
   GitHub runner**. It cannot reach production, staging, or any Supabase
   project, and the container is destroyed with the runner.
3. Asserts the restored database actually holds data: it counts `public` tables
   and rows in `users`, prints both in the job summary, and **fails the run if
   fewer than 50 tables restored**.

Run it once as soon as the first real backup exists, then quarterly. Record each
run in the history table below — the automated job prints exactly the numbers
that table wants.

It does **not** replace the full manual drill for RTO measurement: the runner
restores into a local container, which is faster than restoring into a fresh
Supabase project over the network. Use the manual checklist when you need a
real RTO figure.

## DR drill checklist (annual, manual — for a real RTO number)

- [ ] Pick a recent dump (≤7 days old)
- [ ] Provision a throwaway Supabase project (free tier)
- [ ] Walk steps 1-5 against that project
- [ ] Capture elapsed time (target ≤4h)
- [ ] File PR adding `## DR drill 20XX-MM-DD` entry below
- [ ] Delete the throwaway project

## DR drill history

> **AS OF 2026-08-21 THIS TABLE IS EMPTY, AND THAT IS THE FINDING.** No restore
> of this database has ever been performed or recorded. RPO 24h / RTO 4h at the
> top of this file are targets, not measurements. Do not quote them to anyone —
> a counterparty, an investor, a user — as if they had been demonstrated.
>
> There is also nothing to drill against yet: the daily backup has never
> produced an object, because its secrets have never been set. See the owner
> setup block at the top of `.github/workflows/db-backup.yml`.

| Date | Source dump | Target | Elapsed | Notes |
|---|---|---|---|---|

## Failure modes

| Symptom | Diagnosis | Fix |
|---|---|---|
| `pg_restore: input file ... is not a valid archive` | Corrupt dump | Use prior day |
| `permission denied for schema public` | Service role missing | Reset role via Supabase SQL editor: `grant all on schema public to service_role;` |
| `FATAL: too many connections` | Pool exhausted | Use DIRECT_URL, not pooled; restart Render service |
| Restore hangs >2h | Parallel jobs deadlock | Re-run with `--jobs 1` |
| No backups in bucket | Workflow never ran with creds | The three secrets in **step 0a** are unset — `SUPABASE_DB_URL` (direct, 5432), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. Set them, then re-run per step 0b. |
| Backup run green but bucket empty | Should be impossible on `main`'s copy (a zero-byte or skipped run now fails). If you see it, you dispatched a stale ref | Re-dispatch with no `--ref` (step 0b) and read the JSON line |
| Supabase project gone, no dump reachable | Steps 1–2 read from the project that was lost | Use *Steps 1–2, ALTERNATE* above. If `BACKUP_S3_*` was never configured there is no second copy — `OPS-03` |
| `SignatureDoesNotMatch` (403) from R2/S3 | `content-length` is a signed header; a Node release overriding it breaks the signature | Drop `'content-length'` from the signed set in `buildS3Authorization` (`scripts/backup/supabase-backup.mjs`) and from the test's `SignedHeaders` assertion. A comment sits at that exact line. |

## Related

- `scripts/backup/supabase-backup.mjs` — daily backup script
- `scripts/backup/prune-old-backups.mjs` — 30-day retention pruner
- `.github/workflows/db-backup.yml` — daily cron (19:00 UTC)
- `docs/backup-restore-runbook.md` — legacy R2-based runbook (kept for the
  weekly secondary dump path; do not confuse with this primary path)
- `docs/data-retention-policy.md` — legal/tax retention requirements
