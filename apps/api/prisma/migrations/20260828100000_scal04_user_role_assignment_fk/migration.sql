-- SCAL-04 — the foreign key behind `UserRoleAssignment.user`.
--
-- WHAT THIS UNBLOCKS
--
-- `admin.service.getUsers` answers `?role=PANDIT`. Until now that could not be
-- written as a Prisma relation predicate, because `UserRoleAssignment` had no
-- `@relation` to `User`, so the endpoint had two workarounds in a row: first it
-- read EVERY `user_role_assignment` row holding the role and sent the resulting
-- uuid list BACK to Postgres as an `IN (...)` in both the page query and the
-- count (~7 MB per statement, twice, at 200k holders — the one read in that
-- service that scaled with the whole user base); then a hand-written $queryRaw
-- JOIN, with that scan retained behind a logged catch as a fallback because no
-- statement in this repo could be executed against a database to prove its
-- identifiers. Declaring the relation replaces both with
-- `where: { roleAssignments: { some: { role } } }`, which Postgres resolves and
-- which contains no hand-written identifier that could be wrong.
--
-- WHY THIS MIGRATION CANNOT TAKE THE API DOWN
--
-- Migrations auto-apply at boot (apps/api/package.json:
-- `prisma migrate deploy && node dist/server.js`; the `&&` means a failed
-- migration is also a failed boot, with the migration recorded FAILED and every
-- later migration blocked). Three previous passes refused this change on
-- exactly that ground: no migration in this repo mentions
-- `user_role_assignments` at all — the table predates the tracked history — so
-- whether the constraint already exists, and whether the table holds rows whose
-- `user_id` has no `users` row, is genuinely unknowable from here. Production
-- has been suspended since 2026-08-17, so it cannot be asked.
--
-- Three properties make the question moot rather than answered:
--
--   1. NOT VALID. `ADD CONSTRAINT ... NOT VALID` does not read a single
--      existing row — Postgres skips the verification scan entirely and
--      enforces the constraint on new and updated rows only. So no amount of
--      pre-existing orphaned data can abort it, and it takes its lock for
--      milliseconds rather than for a full table scan. This is the whole reason
--      the DI-06 money migration's count-then-create dance is not needed here:
--      there is nothing to count.
--   2. An existence check against `pg_constraint`. If the foreign key is
--      already there — which it may well be, since the table predates the
--      tracked history — this is a no-op. `ADD CONSTRAINT` has no
--      `IF NOT EXISTS` form, so the check has to be explicit.
--   3. `EXCEPTION WHEN OTHERS`. Belt and braces for the unforeseen: the
--      subtransaction rolls back just this statement, the migration still
--      commits, the API still boots, and the skip is announced with
--      RAISE WARNING rather than swallowed.
--
-- AND IF IT IS SKIPPED, NOTHING BREAKS. Prisma Client builds the join for
-- `roleAssignments: { some: { … } }` from schema.prisma, never from the
-- database's constraint catalogue. The constraint buys referential integrity
-- going forward; the query does not depend on it. Worst case is today's
-- behaviour, which is what the code has run with since launch.
--
-- DELIBERATELY NOT VALIDATED HERE. `VALIDATE CONSTRAINT` is the step that reads
-- every row, and it is the step that fails if orphans exist. Running it inside
-- the boot migration would put back exactly the failure mode the NOT VALID
-- avoids. It is a one-line manual follow-up for whoever next has a live
-- database, and it needs no code change:
--
--   ALTER TABLE "user_role_assignments"
--     VALIDATE CONSTRAINT "user_role_assignments_user_id_fkey";
--
-- Until then the constraint is enforced for every new and updated row, which is
-- the half that actually prevents new corruption.
--
-- OTHER REPO INVARIANTS RESPECTED
--   * No CONCURRENTLY anywhere (25001 inside `migrate deploy`'s transaction
--     blocked this repo's migrations for two months).
--   * Additive only: no table created or dropped, no column added, dropped or
--     retyped, no row read, deleted or rewritten.
--   * The constraint name is Prisma's own convention
--     (`<table>_<column>_fkey`), so a later `prisma migrate dev` reports no
--     drift against the `@relation` added to schema.prisma in this change.
--   * `@@index([userId])` already exists on this model, so the referencing side
--     of the key is indexed — Postgres does not create that index for you.

DO $scal04$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_role_assignments_user_id_fkey'
  ) THEN
    RAISE NOTICE 'SCAL-04: constraint user_role_assignments_user_id_fkey already exists; nothing to do.';
  ELSE
    BEGIN
      ALTER TABLE "user_role_assignments"
        ADD CONSTRAINT "user_role_assignments_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
        NOT VALID;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'SCAL-04: foreign key user_role_assignments_user_id_fkey could not be added (%); SKIPPED so the API can still boot. The role filter does not depend on it — Prisma builds the join from schema.prisma.', SQLERRM;
    END;
  END IF;
END;
$scal04$;
