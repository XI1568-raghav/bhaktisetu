# Runbook: run a reviewed SQL file against production (`prod-db-task`)

Agents and laptops have no production database credentials. This workflow is the
one sanctioned path: it reads the repository secret `SUPABASE_DIRECT_URL` (direct
Postgres URI, port 5432), runs **one** file from `ops/sql/` inside **one**
transaction, and reports what happened. Manual only; about 1 runner-minute per
run; nothing scheduled.

## Usage (maintainer)

```bash
# 1. Look at the state first (read-only SELECTs; always a dry-run)
gh workflow run prod-db-task.yml -f file=ops/sql/verify-commission-state.sql -f mode=dry-run
gh run watch

# 2. Rehearse the change. ROLLBACK at the end; the log shows every command tag
#    (UPDATE n, ALTER TABLE) and any NOTICE lines, and nothing persists.
gh workflow run prod-db-task.yml -f file=ops/sql/<name>.sql -f mode=dry-run
gh run watch

# 3. Apply. COMMIT at the end. Only runs from main.
gh workflow run prod-db-task.yml -f file=ops/sql/<name>.sql -f mode=apply
gh run watch

# 4. Re-run step 1 and compare.
```

`gh run view <id> --log` shows the output again. The job summary records the
file, its SHA-256, the target host and COMMITTED / ROLLED BACK.

Which code runs: the branch you pass as `--ref <branch>` (default `main`). Both
the workflow's guards and the SQL file come from that ref. A dry-run works from
any branch once the workflow exists on `main`; `apply` is refused anywhere but
`main`, so only merged, reviewed SQL reaches production.

## Guards

All enforced by `scripts/ops/prod-db-task.sh`, before a connection is opened, and
covered by `scripts/test/prod-db-task.test.mjs`.

| Guard | Behaviour |
|---|---|
| File path | Must match `^ops/sql/[a-z0-9._-]+\.sql$`, no `..`, not a symlink, non-empty, present in the checked-out ref. |
| Mode | `dry-run` (default) or `apply`; anything else is refused. |
| Transaction | The file runs between `BEGIN` and `ROLLBACK` (dry-run) or `COMMIT` (apply), with `ON_ERROR_STOP`, so the first error aborts and nothing commits. `lock_timeout` 15 s, `statement_timeout` 5 min. |
| Transaction control in the file | `BEGIN`/`COMMIT`/`ROLLBACK`/`SAVEPOINT`/`START TRANSACTION` are refused: a `COMMIT` would make a dry-run permanent. plpgsql `BEGIN ... END` inside `DO` blocks is fine. |
| psql meta-commands | Only `\echo` / `\qecho` are allowed. `\!`, `\i`, `\copy`, `\gexec` and the like are refused. Write `[0-9]` rather than `\d` in regexes. |
| Destructive SQL | `DROP TABLE`, `DROP DATABASE`, `DROP SCHEMA`, `TRUNCATE` (any case) are refused unless you also pass `-f allow_destructive=true`. The scan is of the raw text, comments included, so it fails closed. |
| Apply only from main | A separate first step fails the run if `mode=apply` and the ref is not `refs/heads/main`. |
| One at a time | Concurrency group `prod-db-task`, never cancelled mid-run. Timeout 10 minutes. |
| No secret echo | Only the host name is printed. The URL is passed through an environment variable; there is no `set -x`. |

Things it does not do: it cannot run `CREATE INDEX CONCURRENTLY` or `VACUUM`
(they cannot run in a transaction; the run fails and rolls back). It does not
record anything in `_prisma_migrations`. If a task file mirrors a Prisma
migration, finish with `prisma migrate resolve --applied <name>` from a trusted
machine, or the migration will run again at the next `migrate deploy` (all
current task files are idempotent, so that is harmless but untidy).

## Writing a task file

- Plain SQL, no transaction control. Make it idempotent (re-running changes zero rows).
- Add a guard `DO $$ ... RAISE EXCEPTION ... $$;` that fails if the table or column is not what you wrote the file against, and a post-condition check at the end.
- Update only rows you can identify as sitting on a stale value; never overwrite negotiated data.
- Pair every change with a read-only `verify-*.sql`.

## Task files

| File | Purpose |
|---|---|
| `ops/sql/verify-commission-state.sql` | Read-only: priest and store rates by value, commission ledger by rate, verdict counts. |
| `ops/sql/commission-default-80.sql` | Ledger PM-03: sets `priests.commission_rate` default to 0.80 and moves only rows still on the stale 0.70 to 0.80. Same two statements as migration `20260812000000_priest_commission_rate_80`, plus guard and post-check. |
