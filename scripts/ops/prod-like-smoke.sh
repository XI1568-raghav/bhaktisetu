#!/usr/bin/env bash
# Pre-deploy prod-like smoke for the API.
#
# Boots the API from THIS checkout with NODE_ENV=production and a dummy SENTRY_DSN (so @fastify/otel
# wraps every hook, as on Render), against a LOCAL database, then asserts the denied paths still
# answer 401 and the server log is free of otel / TypeError / FST_ERR lines. Born from 2026-10-07:
# a guard wrapper dropped Fastify's `this`, every denied request answered 500 for 6 minutes, and
# the local tests passed because they ran without Sentry.
#
# Usage:  SMOKE_DATABASE_URL=postgresql://user:pw@127.0.0.1:55432/db bash scripts/ops/prod-like-smoke.sh
# Env:    SMOKE_PORT (default 4020), SMOKE_DATABASE_URL (required, host must be 127.0.0.1/localhost).
set -u

DB_URL="${SMOKE_DATABASE_URL:-}"
PORT="${SMOKE_PORT:-4020}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

if [ -z "$DB_URL" ]; then echo "FAIL refusing to run: SMOKE_DATABASE_URL is empty" >&2; exit 2; fi
DB_HOST="$(printf '%s' "$DB_URL" | sed -E 's#^[a-z]+://([^@/]*@)?([^:/?]+).*#\2#')"
case "$DB_HOST" in
  127.0.0.1|localhost) ;;
  *) echo "FAIL refusing to run: database host is not 127.0.0.1/localhost" >&2; exit 2 ;;
esac
case "$PORT" in ''|*[!0-9]*) echo "FAIL SMOKE_PORT must be numeric" >&2; exit 2 ;; esac

LOG="$(mktemp)"
STARTED=0
cleanup() {
  if [ -n "${SMOKE_KEEP_LOG:-}" ]; then cp "$LOG" "$SMOKE_KEEP_LOG"; fi
  if [ "$STARTED" = 1 ]; then fuser -k "${PORT}/tcp" >/dev/null 2>&1 || true; fi
  rm -f "$LOG"
}
trap cleanup EXIT INT TERM

if fuser "${PORT}/tcp" >/dev/null 2>&1; then
  echo "FAIL port $PORT is already in use; set SMOKE_PORT" >&2; exit 2
fi

# A clean environment: only what is listed here reaches the server (nothing from the caller's
# shell, and no .env file, leaks in).
env -i PATH="$PATH" HOME="${HOME:-/tmp}" \
  NODE_ENV=production PORT="$PORT" HOST=127.0.0.1 \
  DATABASE_URL="$DB_URL" DIRECT_URL="$DB_URL" \
  SENTRY_DSN="https://abc123@o1.ingest.sentry.io/1" \
  ALLOW_DEMO_PAYMENTS=true JWT_SECRET="smoke-dummy-jwt-secret-not-real-0123456789" \
  CORS_ORIGIN="http://localhost:3010" \
  RAZORPAY_KEY_ID=rzp_test_demo RAZORPAY_KEY_SECRET=demo RAZORPAY_WEBHOOK_SECRET=demo \
  SUPABASE_URL=http://127.0.0.1:1 SUPABASE_ANON_KEY=x SUPABASE_SERVICE_ROLE_KEY=x SUPABASE_JWT_SECRET= \
  RESEND_API_KEY= GROQ_API_KEY= ANTHROPIC_API_KEY= WHATSAPP_TOKEN= WHATSAPP_PHONE_ID= \
  VAPID_PUBLIC_KEY= VAPID_PRIVATE_KEY= SMTP_HOST= \
  bash -c "cd '$ROOT/apps/api' && exec pnpm exec tsx src/server.ts" >"$LOG" 2>&1 &
STARTED=1

BASE="http://127.0.0.1:${PORT}"
FAILS=0
pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; FAILS=$((FAILS + 1)); }

ready=0
for _ in $(seq 1 90); do
  if curl -fsS -m 2 "$BASE/health" >/dev/null 2>&1; then ready=1; break; fi
  sleep 1
done
if [ "$ready" = 1 ]; then
  pass "GET /health answers 200"
else
  fail "GET /health never answered within 90s"
  echo "--- server log tail ---"
  tail -30 "$LOG"
  exit 1
fi

code() { curl -s -o /dev/null -m 10 -w '%{http_code}' "$@"; }
expect() { # label expected actual
  if [ "$3" = "$2" ]; then pass "$1 -> $3"; else fail "$1 -> $3 (expected $2)"; fi
}

PROTECTED="/auth/me /admin/dashboard /admin/users /bookings/my /payouts/my /temple-portal/dashboard /astrologer-portal/dashboard /wellness-portal/dashboard /gaushala-portal/dashboard /store-admin/products"
for p in $PROTECTED; do
  expect "no token  GET $p" 401 "$(code "$BASE/api/v1$p")"
done
for p in /auth/me /admin/dashboard /bookings/my; do
  expect "bad token GET $p" 401 "$(code -H 'Authorization: Bearer garbage.not.a.token' "$BASE/api/v1$p")"
done
for p in /temples /store/products /ai/health; do
  expect "public    GET $p" 200 "$(code "$BASE/api/v1$p")"
done

sleep 1
# "TypeError: fetch failed" is the dummy SUPABASE_URL (127.0.0.1:1) refusing the token lookup, which
# is expected for a garbage bearer token; every other TypeError is a real fault.
BAD_RE='fastify otel instance|TypeError|FST_ERR'
bad_lines() { grep -E "$BAD_RE" "$LOG" | grep -v 'TypeError: fetch failed'; }
if [ -n "$(bad_lines)" ]; then
  fail "server log contains otel / TypeError / FST_ERR lines:"
  bad_lines | cut -c1-220 | sort | uniq -c | head -5
else
  pass "server log has no otel / TypeError / FST_ERR lines"
fi

if [ "$FAILS" -gt 0 ]; then echo "SMOKE FAILED: $FAILS check(s)"; exit 1; fi
echo "SMOKE PASSED"
