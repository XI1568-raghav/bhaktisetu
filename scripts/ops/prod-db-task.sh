#!/usr/bin/env bash
# Runs ONE reviewed SQL file from ops/sql/ against the database in DATABASE_URL,
# inside a single transaction. Called by the prod-db-task workflow; kept as a
# script so every guard below can be exercised by tests and against a throwaway
# local Postgres instead of being YAML nobody runs.
#
# Env:   DATABASE_URL        connection URI (never printed)
#        TASK_FILE           ops/sql/<name>.sql
#        TASK_MODE           dry-run (default) | apply
#        ALLOW_DESTRUCTIVE   "true" to allow DROP TABLE/DATABASE/SCHEMA, TRUNCATE
#
# Every validation happens BEFORE a connection is opened.
set -euo pipefail

FILE="${TASK_FILE:-}"
MODE="${TASK_MODE:-dry-run}"
ALLOW="${ALLOW_DESTRUCTIVE:-false}"

fail() { echo "::error::$*"; exit 1; }

# ---- 1. inputs -------------------------------------------------------------
[[ "$FILE" =~ ^ops/sql/[a-z0-9._-]+\.sql$ ]] \
  || fail "file must match ^ops/sql/[a-z0-9._-]+\\.sql\$ (got '${FILE}')"
[[ "$FILE" != *..* ]] || fail "file path may not contain '..'"
[ -f "$FILE" ] && [ ! -L "$FILE" ] || fail "$FILE does not exist in the checked-out ref (or is a symlink)"
[ -s "$FILE" ] || fail "$FILE is empty"
case "$MODE" in dry-run|apply) ;; *) fail "mode must be dry-run or apply (got '${MODE}')";; esac

# ---- 2. content guards (raw text, comments included: fail closed) -----------
# The workflow owns the transaction. A COMMIT inside the file would make a
# dry-run permanent, so transaction control is refused outright.
if grep -Eiq '^[[:space:]]*(COMMIT|ROLLBACK|ABORT|SAVEPOINT|PREPARE[[:space:]]+TRANSACTION|START[[:space:]]+TRANSACTION|BEGIN[[:space:]]*(TRANSACTION|WORK)?[[:space:]]*;|END[[:space:]]+(TRANSACTION|WORK))' "$FILE"; then
  fail "$FILE contains transaction control (BEGIN/COMMIT/ROLLBACK/...). The workflow wraps the file in its own transaction; remove it."
fi
# psql meta-commands can shell out (\!), read files (\i), or run generated SQL
# (\gexec). Only \echo / \qecho are allowed, and only as the first token.
if grep -Eq '\\' "$FILE"; then
  if grep -E '\\' "$FILE" | grep -Evq '^[[:space:]]*\\(echo|qecho)([[:space:]]|$)'; then
    fail "$FILE uses a backslash outside \\echo/\\qecho (psql meta-command, or a regex escape; write [0-9] instead of \\d)."
  fi
fi
if grep -Eiq '(^|[^a-z0-9_])(DROP[[:space:]]+(TABLE|DATABASE|SCHEMA)|TRUNCATE)([^a-z0-9_]|$)' "$FILE"; then
  if [ "$ALLOW" != "true" ]; then
    fail "$FILE contains DROP TABLE / DROP DATABASE / DROP SCHEMA / TRUNCATE. Re-dispatch with allow_destructive=true if that is intended."
  fi
  echo "::warning::allow_destructive=true: destructive statement accepted for $FILE"
fi

# ---- 3. connection ---------------------------------------------------------
[ -n "${DATABASE_URL:-}" ] || fail "DATABASE_URL is empty (repository secret SUPABASE_DIRECT_URL is not set)"
# Host only. Strip scheme, then userinfo (up to the LAST @), then port/path/query.
rest="${DATABASE_URL#*://}"
rest="${rest##*@}"
host="${rest%%[:/?]*}"
echo "Target host : ${host}  (user and password masked)"
echo "Mode        : ${MODE}"
echo "File        : ${FILE}"
if command -v shasum >/dev/null 2>&1; then sum=$(shasum -a 256 "$FILE" | cut -d' ' -f1); else sum=$(sha256sum "$FILE" | cut -d' ' -f1); fi
echo "SHA-256     : ${sum}"

END_STMT="ROLLBACK;"
[ "$MODE" = "apply" ] && END_STMT="COMMIT;"

WORK="$(mktemp)"
trap 'rm -f "$WORK"' EXIT
{
  echo '\set ON_ERROR_STOP on'
  echo 'BEGIN;'
  echo "SET LOCAL lock_timeout = '15s';"
  echo "SET LOCAL statement_timeout = '5min';"
  echo '\echo --- begin file ---'
  cat "$FILE"
  printf '\n;\n'
  echo '\echo --- end file ---'
  echo "$END_STMT"
} > "$WORK"

export PGCONNECT_TIMEOUT=15 PGAPPNAME=prod-db-task
set +e
psql "$DATABASE_URL" -X -a -f "$WORK" 2>&1
code=$?
set -e

if [ "$code" -ne 0 ]; then
  echo "::error::psql exited ${code}. The transaction was NOT committed."
  [ -n "${GITHUB_STEP_SUMMARY:-}" ] && printf '### prod-db-task FAILED\n\n`%s` (%s) on `%s`: psql exit %s, nothing committed.\n' "$FILE" "$MODE" "$host" "$code" >> "$GITHUB_STEP_SUMMARY"
  exit "$code"
fi

if [ "$MODE" = "apply" ]; then
  verdict="COMMITTED"
else
  verdict="ROLLED BACK (dry-run, nothing persisted)"
fi
echo "Result      : ${verdict}"
[ -n "${GITHUB_STEP_SUMMARY:-}" ] && printf '### prod-db-task\n\n| | |\n|---|---|\n| file | `%s` |\n| sha256 | `%s` |\n| host | `%s` |\n| mode | %s |\n| result | **%s** |\n' "$FILE" "$sum" "$host" "$MODE" "$verdict" >> "$GITHUB_STEP_SUMMARY"
exit 0
