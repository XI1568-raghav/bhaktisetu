# Prod API deploy checklist

Short. Written 2026-10-07 after a deploy answered every denied request 500 for 6 minutes (a guard wrapper
dropped Fastify's `this`, which `@fastify/otel` reads whenever `SENTRY_DSN` is set; local tests had no Sentry).

## Before the deploy

1. Local checks on the merged tree: tsc + vitest in `apps/api`, `apps/web`, `apps/mobile`.
2. Run the prod-like smoke against a LOCAL database (never production; it refuses any non-local host and
   never reads `apps/api/.env`):
   ```
   SMOKE_DATABASE_URL=postgresql://<user>:***REMOVED***@127.0.0.1:55432/<db> bash scripts/ops/prod-like-smoke.sh
   ```
   It boots the API in production mode with a dummy `SENTRY_DSN` on `SMOKE_PORT` (default 4020), checks 10
   protected routes answer 401 with no token, 3 with a garbage token, 3 public routes answer 200, and that the
   log has no `fastify otel instance` / `TypeError` / `FST_ERR`. It exits non-zero on any FAIL and always stops
   its server. Do not deploy on a FAIL. Local DB recipe: `docs/runbooks/local-e2e-stack.md`.
3. Note the currently live commit (`gh workflow run render-diag.yml -f mode=detail -f sid=<SID>`), it is the
   rollback target.

## Deploy

`gh workflow run render-diag.yml -f mode=deploy -f sid=<SID> -f commit=<SHA>` (API `srv-d7mc2n8sfn5c73dfce0g`).
Apply pending migrations by hand first if any (`docs/runbooks/prod-rollback.md` section 4 and TASKS.md).

## After the deploy (at most 1 request per second)

```
for p in /auth/me /admin/dashboard /admin/users /bookings/my /payouts/my /temple-portal/dashboard \
  /astrologer-portal/dashboard /wellness-portal/dashboard /gaushala-portal/dashboard /store-admin/products; do
  curl -s -o /dev/null -w "$p %{http_code}\n" "https://api.darshya.online/api/v1$p"; sleep 1
done
```
Every line must say 401. Any 500 means roll back now.

## Roll back

`gh workflow run render-diag.yml -f mode=deploy -f sid=<SID> -f commit=<previous sha>`, then `gh run watch`.
Details and the reasons a `git revert` alone does nothing: `docs/runbooks/prod-rollback.md`.
