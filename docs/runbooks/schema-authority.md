# Schema authority — which mechanism owns the production database shape

> `OPS-07`. Written 2026-08-21. Read this before adding DDL anywhere.

## The one-line answer

**`prisma migrate deploy` is the authority.** `apps/api/src/lib/ensure-schema.ts`
is a backstop and is **inert in production**.

---

## What actually runs at boot, in order

`render.yaml` (API service `bhaktisetu`):

```yaml
startCommand: pnpm --filter @poojly/api start
```

`apps/api/package.json`:

```json
"start": "prisma migrate deploy && node dist/server.js"
```

So a deploy runs, strictly in this order:

1. **`prisma migrate deploy`** — applies every migration in
   `apps/api/prisma/migrations/` that is not yet recorded in `_prisma_migrations`.
   This happens **before the Node process exists**.
2. **`node dist/server.js`** → `bootstrap()` → `ensureSchemaInvariants()`
   (`apps/api/src/server.ts:133`).

Nothing else applies schema. There is no manual step and no dashboard override;
do not add one.

## What was wrong

`ensure-schema.ts` opened with:

> "Render's start command bypasses our `pnpm start` wrapper that runs
> `prisma migrate deploy`, which means pending migrations never apply in prod."

That premise is false and `render.yaml` disproves it on its face. On that
premise the file replayed ~95 hand-written `IF NOT EXISTS` DDL statements on
every boot, against a database that `prisma migrate deploy` had just finished
shaping. Two mechanisms, no declared winner.

### Why that is dangerous, not merely redundant

Prisma writes **plain, non-idempotent** DDL. `20260511_user_blocked/migration.sql`:

```sql
ALTER TABLE "users"
  ADD COLUMN "blocked" BOOLEAN NOT NULL DEFAULT false, ...;
CREATE INDEX "users_blocked_idx" ON "users" ("blocked") WHERE "blocked" = true;
```

`ensure-schema.ts` creates those same four objects with `IF NOT EXISTS`. **16
objects overlap in total** across four migrations — the frozen list lives in
`apps/api/src/lib/ensure-schema.ops07.test.ts` (`KNOWN_OVERLAP`), and a new
collision fails that test.

On any database where the boot-time replay reached one of those objects before
Prisma had recorded the owning migration, the next deploy does this:

- `prisma migrate deploy` aborts — `42701 duplicate_column` / `42P07 duplicate_table`.
- The migration is written to `_prisma_migrations` as **failed**.
- `&&` short-circuits, so `node dist/server.js` **never starts**.
- Render restarts the container, which re-runs the same failing migration:
  **crash-loop**.
- Every *later* migration is blocked until someone runs
  `prisma migrate resolve` by hand.

## What happens when a migration fails at boot — crash-loop, not stale serving

This is the question people get wrong, so state it plainly:

| | Behaviour |
|---|---|
| `prisma migrate deploy` fails | `&&` short-circuits. The API **does not start**. Render's health check never passes, Render restarts, the migration fails again. **Crash-loop.** The old container is already gone, so the service is **down**, not serving an old schema. |
| `prisma migrate deploy` succeeds | The API starts against exactly the migrated schema. |
| `ensureSchemaInvariants` hits a DDL error | Logs at `error` and continues serving. Acceptable **only because it is a backstop and is off in production** — it can no longer be the thing that decided your schema. |

The crash-loop is the *correct* failure mode: it is loud, and it never serves
traffic against a schema the code does not expect. Do not "fix" it by moving
`prisma migrate deploy` off the start command or by changing `&&` to `;`.

Recovery from a crash-loop, on the operator's machine (not in CI):

```bash
cd apps/api
export DIRECT_URL='...'          # DIRECT_URL, never the pooled URL
pnpm exec prisma migrate status --schema=prisma/schema.prisma
# For a migration whose objects already exist (42701/42P07):
pnpm exec prisma migrate resolve --applied <migration_name>
# For one that genuinely did not apply:
pnpm exec prisma migrate resolve --rolled-back <migration_name>
```

Then trigger a fresh deploy from the Render dashboard (`autoDeploy: false` — a
push alone does nothing).

## Current behaviour of `ensureSchemaInvariants`

`schemaReplayDecision()` in `ensure-schema.ts` is the whole rule, and it is
exported so it can be asserted rather than inferred:

| Condition | Replay? | Reason |
|---|---|---|
| `DATABASE_URL` unset | no | `no-database-url` |
| `SCHEMA_INVARIANTS_FORCE=true` | **yes** | `forced` |
| `NODE_ENV=production` | **no** | `authority-owns-production` |
| anything else (dev, CI, scripts) | yes | `non-production` |

The production skip logs a line naming the authority and the override, so the
next person reading a boot log learns the rule instead of re-deriving it.

### Deliberate recovery replay

If a production database has genuinely drifted and you want the backstop:

1. Render dashboard → service `bhaktisetu` → Environment → add
   `SCHEMA_INVARIANTS_FORCE=true`.
2. Manual Deploy. Watch the log for
   `ensureSchemaInvariants: N/M statements ran cleanly`.
3. **Remove the variable again** and redeploy. Leaving it set reinstates exactly
   the crash-loop hazard above.

## The gap neither mechanism covers: there is no baseline migration

`apps/api/prisma/migrations/` starts at `20260426_pgvector`, whose first
statement is `alter table content_items add column ...`. There is **no `0_init`**.
The core tables (`users`, `temples`, `content_items`, `puja_bookings`, the
`*_profiles` tables) were created by an original `prisma db push` and were never
captured as a migration.

Consequences, both of which matter for disaster recovery:

- `prisma migrate deploy` **cannot build this database from scratch**. Pointed at
  an empty Postgres it fails on the first migration.
- The only in-repo description of those never-migrated tables is the
  `STATEMENTS` array in `ensure-schema.ts` — and it is partial.

So a restore must come from a `pg_dump` (see `docs/runbooks/db-restore.md`), not
from replaying migrations. Baselining the history
(`prisma migrate diff --from-empty --to-schema-datamodel` into a `0_init`
migration, then `prisma migrate resolve --applied 0_init` against prod) is the
fix and is **not done**. It is the prerequisite for ever provisioning a second
environment.

## Rules for adding DDL

1. **Write a migration.** That is the authority; everything else is a workaround.
2. Prefer `IF NOT EXISTS` / guarded `DO $$ … EXCEPTION WHEN duplicate_object …`
   in migration SQL. Prisma does not generate it; add it by hand. It costs
   nothing and removes a whole class of crash-loop.
3. **Never** `CREATE INDEX CONCURRENTLY` in a migration — Prisma wraps each
   migration in a transaction, so it raises `25001` and blocks every later
   migration. Plain `CREATE INDEX IF NOT EXISTS` only.
4. Do **not** add statements to `ensure-schema.ts` as a substitute for a
   migration. If you must add one, the migration that owns the same object must
   be idempotent, or `ensure-schema.ops07.test.ts` will fail — which is the
   point.

## Related

- `docs/runbooks/db-restore.md` — restoring from a dump.
- `docs/runbooks/disaster-recovery.md` — the wider recovery path.
- `apps/api/src/lib/ensure-schema.ops07.test.ts` — the executable half of this document.
