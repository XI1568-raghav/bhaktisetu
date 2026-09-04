# `0_init.sql` — the baseline this repo never had

`prisma/migrations/` has no `0_init`. Its first migration, `20260426_pgvector`,
starts with `alter table content_items add column ...` against a table that
nothing in the migration history creates: the core tables came from an original
`prisma db push` and were never captured as a migration.

Measured 2026-09-02, PostgreSQL 17.10, pgvector present, empty database:

```
Applying migration `20260426_pgvector`
Error: P3018   Database error code: 42P01
ERROR: relation "content_items" does not exist
```

So `prisma migrate deploy` **cannot build this database from scratch** — it dies
on its FIRST migration. This file is the missing first step.

## What it is

`0_init.sql` is the whole current schema rendered from `schema.prisma`. It is
**not** a migration and deliberately does not live in `prisma/migrations/`: if it
did, `migrate deploy` would try to run it against production, where every one of
those objects already exists.

It is applied only by `scripts/bootstrap-fresh-db.mjs`.

## What it does NOT cover — `schema.prisma` is not a full description of this database

A baseline generated from the datamodel contains exactly what the datamodel can
express, and that turns out to be materially less than what production has.
Audited against all migrations on 2026-09-02, the baseline is missing:

| Missing from the baseline | Why |
|---|---|
| `DonationExportAuditLog`, `WeeklyDigestOptOut`, `WeeklyDigestRun` | **whole tables** that were never added to `schema.prisma` |
| `users_blocked_idx` + 4 account-deletion indexes | partial indexes — Prisma has no `WHERE` syntax for `@@index` |
| 3 ivfflat, 3 gin/trgm indexes | operator-class indexes |
| the money-key UNIQUE indexes | none of them are `@@unique` in `schema.prisma` |
| `money_audit_events_append_only()` + no-mutate trigger | functions and triggers |
| `orgs_owner_user_id_idx`, `donations_temple_id_idx`, … | added in SQL, never back-ported to the datamodel |
| `vector`, `pg_trgm` extensions | not part of a datamodel render |
| the 10 TD8 perf indexes | `20260503_perf_indexes`, applied out of band |

Because of that, the bootstrap does **not** try to pick which migrations matter.
It replays *all* of them onto the baseline and lets "already exists" errors
(`42P07`, `42701`, `42710`, …) pass. A curated list was tried first and rejected:
three migrations landed in this repo on the day the script was written, so such a
list would have been stale before it was committed.

Replaying everything is safe here because no migration in this tree is
destructive — the only `DROP`s are `DROP INDEX`, `DROP NOT NULL` and one
`DROP TRIGGER` — and every backfill `UPDATE` matches zero rows on an empty
database. `src/lib/fresh-db-bootstrap.test.ts` enforces that invariant: add a
migration that drops a table or deletes rows and it fails.

The one migration never replayed is `20260503_perf_indexes` — its
`CREATE INDEX CONCURRENTLY` statements cannot run inside a transaction, so
`scripts/apply-perf-indexes.mjs` applies them separately, reading them out of the
migration file itself.

## Regenerating

Whenever `schema.prisma` changes, regenerate:

```bash
pnpm --filter @poojly/api exec prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/baseline/0_init.sql
```

No database connection is needed — it is a pure render of the datamodel.
`fresh-db-bootstrap.test.ts` fails when this file drifts from `schema.prisma`,
so CI tells you when you have forgotten.

## Using it

```bash
cd apps/api
node scripts/bootstrap-fresh-db.mjs --yes            # empty local database
node scripts/bootstrap-fresh-db.mjs --verify-only    # inspect any database
```

The script refuses to run against a database whose `public` schema already has
tables, which is also why it cannot hit production by accident.

See `docs/runbooks/fresh-database-bootstrap.md`.
