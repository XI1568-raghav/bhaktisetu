# Building this database from scratch

New environment, CI, or a disaster-recovery restore onto empty Postgres.

**`prisma migrate deploy` cannot do it.** Use `scripts/bootstrap-fresh-db.mjs`.

```bash
cd apps/api
node scripts/bootstrap-fresh-db.mjs --yes                     # empty local database
node scripts/bootstrap-fresh-db.mjs --yes --allow-remote --env-file .env.staging
node scripts/bootstrap-fresh-db.mjs --verify-only             # inspect any database
```

The script refuses any database whose `public` schema already has tables. That
refusal is also why it cannot hit production by accident: production is not empty.

---

## Why deploy cannot do it — two barriers, measured

Both measured 2026-09-02 against PostgreSQL 17.10, Prisma 6.19.3.

### Barrier 1 — there is no `0_init` (this is the one that fires first)

The first migration, `20260426_pgvector`, opens with
`alter table content_items add column ...`. Nothing in the migration history
ever creates `content_items`; the core tables came from an original
`prisma db push` and were never captured. Against an empty database **with
pgvector installed**:

```
Applying migration `20260426_pgvector`
Error: P3018   Database error code: 42P01
ERROR: relation "content_items" does not exist
```

It dies on the FIRST migration. This is environment-independent — it happens on Supabase too.

### Barrier 2 — `20260503_perf_indexes` uses CONCURRENTLY

Twelve migrations later. Ten `CREATE INDEX CONCURRENTLY IF NOT EXISTS`
statements; `migrate deploy` wraps each migration in a transaction and
PostgreSQL refuses:

```
SQLSTATE 25001: CREATE INDEX CONCURRENTLY cannot run inside a transaction block
```

The file's own header says *"prisma migrate deploy executes each statement
separately, which is fine"*. That sentence is false and is what cost this repo
two months of blocked migrations.

**It cannot be neutralised by pre-creating the indexes.** Measured: the
statement fails with 25001 inside a transaction *even when the index already
exists*, because PostgreSQL's transaction-block check runs before `IF NOT
EXISTS` is considered:

| case | result |
|---|---|
| CONCURRENTLY, autocommit, new index | OK |
| CONCURRENTLY, in transaction, **index already exists** | **25001** |
| CONCURRENTLY, in transaction, new index | 25001 |
| plain `CREATE INDEX IF NOT EXISTS`, in transaction | OK |

A migration containing CONCURRENTLY can only be **not executed**. That is
precisely what the bootstrap does with it, and what was done by hand on
production.

---

## What the bootstrap does

1. `CREATE EXTENSION` — `vector` (required; three tables have `vector(1024)`
   columns) and `pg_trgm` (optional, warns).
2. Applies `prisma/baseline/0_init.sql`, the whole schema rendered from
   `schema.prisma`.
3. Replays **every** migration except the CONCURRENTLY one, letting
   "already exists" errors (`42P07`, `42701`, `42710`, …) pass.

   This is not belt-and-braces. `schema.prisma` is not a full description of
   this database, so the baseline alone is genuinely incomplete — it is missing
   three whole tables (`DonationExportAuditLog`, `WeeklyDigestOptOut`,
   `WeeklyDigestRun`), every partial index, every opclass index, the money-key
   UNIQUE indexes, the append-only trigger, and assorted indexes added in SQL
   and never back-ported. A curated "replay just these" list was tried first and
   rejected: three migrations landed in this repo on the day the script was
   written, so the list would have been stale before it was committed.

   Replaying everything is safe because no migration here is destructive (only
   `DROP INDEX`, `DROP NOT NULL`, one `DROP TRIGGER`) and every backfill
   `UPDATE` matches zero rows on an empty database. A test enforces that.
4. Creates the ten TD8 perf indexes out of band, reading the statements **out of
   `20260503_perf_indexes/migration.sql` itself** so there is never a second copy.
5. Records all migrations in `_prisma_migrations` with
   `applied_steps_count = 0` — i.e. baselined, not executed.
6. Verifies: money keys, the append-only trigger, the ten perf indexes, and the
   recorded-migration count.

Afterwards `prisma migrate deploy` reports *"No pending migrations to apply."*
and every FUTURE migration applies normally.

### Warnings you should expect, and what they mean

The bootstrap exits 0 with warnings rather than failing for a short, named list
of cases. Read them — they are not noise.

| Warning | Meaning |
|---|---|
| `20260426_pgvector` — `access method "ivfflat" does not exist` | Only on a Postgres without real pgvector. On Supabase this does not appear. The extension and the `vector(1024)` columns are already in place; only the three embedding indexes are skipped. |
| `20260824010000_scal09…` — pg_trgm | Same shape. The migration itself already treats `pg_trgm` as optional. |

A third warning used to sit in that table:
`20260709020000_store_order_store_profile` failing with
`42P01 missing FROM-clause entry for table "sp"`. **Fixed 2026-09-02** — its
backfill set `store_profile_id = sp.id` while the derived table is aliased
`resolved`, so PostgreSQL rejected it at parse-analysis time regardless of
data and it had never executed anywhere. `sp.id` → `resolved.store_id`;
the `TOLERATED_FAILURES` entry is gone with it. Verified against production
with `EXPLAIN` (which plans without executing): the committed form raised
42P01, the fixed form plans. Nothing was lost to it — production's
`store_orders` was empty, so there was never anything to backfill. Its
remaining sharp edge is documented in the migration file itself:
`(item ->> 'productId')::uuid` raises 22P02 on a catalogue handle like
`prod_015`, which older checkout code accepted.

---

## Production: what the unexecuted migrations actually left behind

Six of production's 35 recorded migrations carry `applied_steps_count = 0` —
recorded with `prisma migrate resolve --applied`, never executed by
`migrate deploy`. **A zero there does not mean the objects are missing.** In
every one of these cases someone applied the DDL by hand and then resolved the
row. Checked object by object on 2026-09-02, read-only:

```bash
cd apps/api
node scripts/verify-migration-objects.mjs --unexecuted --env-file .env.production
```

| migration | result |
|---|---|
| `20260503_perf_indexes` | all 10 indexes present and valid |
| `20260511_user_blocked` | 3 columns + the partial index present |
| `20260514000000_reading_progress` | table, PK and both indexes present; **FK missing** |
| `20260519000000_gaushala_cows_volunteers` | all 11 objects present |
| `20260520000000_priest_puja_offerings` | all 5 objects present |
| `20260709020000_store_order_store_profile` | column, index and FK present |

**37 of 38 objects exist.** That script parses the expected objects out of each
migration's own SQL rather than carrying a checklist, so it cannot drift.

### The perf indexes are NOT missing — this document used to say they were

This section previously stated that the ten TD8 indexes "were most likely never
created", and `scripts/apply-perf-indexes.mjs` said the same in its header.
Both were inference from `applied_steps_count = 0`, and both were wrong: all
ten exist and are `indisvalid`. Someone created them out of band. The
`--check` mode remains the right way to confirm that on any database, and is
still the thing to run before assuming anything about an index:

```bash
node scripts/apply-perf-indexes.mjs --check --env-file .env.production
```

**If `--check` reports `INVALID`:** a previous CONCURRENTLY build failed
part-way and left a dead index. The planner ignores it and `IF NOT EXISTS`
will not repair it — the name is taken. Drop it and re-run:

```sql
DROP INDEX CONCURRENTLY IF EXISTS "<name>";
```

### The one real gap, and why it is not worth a lone fix

`reading_progress_user_id_fkey` — `reading_progress.user_id` → `users.id`
ON DELETE CASCADE — does not exist in production. Measured cost so far: none.
`reading_progress` holds **0 rows**, there are no orphans, and
`account-deletion.service.ts` does not rely on the cascade — it issues an
explicit `readingProgress.deleteMany({ where: { userId } })`.

More to the point, it is not an anomaly of that migration. **20 of the 40 tables
with a `user_id` column have no foreign key to `users` at all**:
`WeeklyDigestOptOut`, `astrologer_consultations`, `astrologer_profiles`,
`fcm_device_tokens`, `gaushala_profiles`, `marketplace_subscriptions`,
`notification_log`, `onboarding_steps`, `org_members`, `pandit_profiles`,
`provider_kyc`, `reading_progress`, `reviews`, `store_profiles`,
`temple_follows`, `temple_profiles`, `transactions`,
`user_role_assignments`, `wellness_profiles`, `yatra_bookings`. That is the
same story as the missing `0_init` above — this database came from
`prisma db push` and was baselined over, so `schema.prisma` relations and
actual Postgres constraints are not the same set.

Adding one FK back would make production marginally less consistent with itself,
not more. The question worth answering is whether the whole set should be
reconciled, and that is a decision plus a maintenance window, not a patch. It
needs the owner's approval either way — the statement is a write:

```sql
ALTER TABLE "reading_progress"
  ADD CONSTRAINT "reading_progress_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
```

---

## Do not edit `20260503_perf_indexes/migration.sql`

It is recorded as applied in production, and `src/lib/fresh-db-bootstrap.test.ts`
pins its content hash.

**Measured checksum facts** (Prisma 6.19.3):

- Prisma stores `sha256` of the **raw file bytes**. Confirmed by applying a
  migration with CRLF endings and reading back `_prisma_migrations.checksum`:
  the stored value matched the raw hash, not the LF-normalised one.
- Therefore checksums are **line-ending sensitive**. This repo has no
  `.gitattributes` and its migration files are CRLF in a Windows working copy.
  Adding `* text=auto` would rewrite every migration's checksum at once.
- For this file: raw-CRLF `8e02665faa4739644f0cd30c18f6a1768da57baeea5b67511549b84d3834195f`,
  LF-normalised `6ccc35b2c53219568e2401314860217e26267ebea734d3384dfd510ea028bbc0`.
  The test pins the LF-normalised value so it is stable on both Windows and
  Linux CI.

**Measured deploy behaviour, which contradicts the folklore — including the
version of this warning that used to be in the tests.** Prisma 6.19.3 does
**not** police the checksum of an already-applied migration. Tested on the
production-shaped case (an applied migration edited to a no-op, *plus* a
genuinely pending migration behind it):

| command | result |
|---|---|
| `migrate status` | lists only the unapplied migration. No drift warning at all. |
| `migrate deploy` | *"Applying migration `20260202_b` … All migrations have been successfully applied."* exit 0. |
| stored checksum of the edited migration | **unchanged** — deploy never re-read the file. |

So the premise that "editing it is an outage" is false on this version, and the
one-year-old fear attached to this file is larger than the actual risk.

**It is still not worth editing**, and this is a judgement call rather than a
hard constraint — the owner can overrule it:

- The bootstrap already means the file is never executed when building a
  database from scratch, so the edit buys nothing operationally. It is pure
  cosmetics on a file nothing runs.
- The safety depends on undocumented behaviour. Prisma 7 is already signposted
  (the CLI warns about `package.json#prisma`), and the start command is
  `prisma migrate deploy && node dist/server.js` — if a future version starts
  enforcing checksums, that is a **crash-loop**, not a failed command.
- Production's row would then carry a checksum for content that no longer
  exists anywhere, which is a worse trap for whoever hits the enforcing version
  than the current honest mismatch between the file and reality.

If a future maintainer decides to do it anyway: update the production row's
checksum in the same maintenance window as the deploy, and re-run
`migrate status` against production afterwards.

---

## Related

- `apps/api/prisma/baseline/README.md` — what the baseline covers and how to regenerate it
- `docs/runbooks/schema-authority.md` — how schema reaches production at all
- `docs/runbooks/disaster-recovery.md` — the wider recovery path
- `apps/api/src/lib/fresh-db-bootstrap.test.ts` — the executable half of this document
