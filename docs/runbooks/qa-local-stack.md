# QA local stack (no production, no real gateways)

Used for the 2026-10-13/14 end-to-end QA. Extends `local-e2e-stack.md` (demo tokens, payment-confirm HMAC, pandit start gate). Local only: never call `api.darshya.online`, `darshya.online` or the production Supabase. Dummy keys only; do not copy any `.env*` content into docs or chat.

## 1. Postgres with pgvector (under /var/tmp)

```
apt-get install -y postgresql-16-pgvector
mkdir -p /var/tmp/pgqa && chown postgres /var/tmp/pgqa
su postgres -c "/usr/lib/postgresql/16/bin/initdb -D /var/tmp/pgqa/data -E UTF8"
su postgres -c "/usr/lib/postgresql/16/bin/pg_ctl -D /var/tmp/pgqa/data -o '-p 55432 -c listen_addresses=127.0.0.1' -l /var/tmp/pgqa/pg.log start"
# create superuser role + db (local-only password), e.g. role darshya, db darshya_utf8
```

Then bootstrap the schema (`prisma migrate deploy` cannot build a fresh DB; see `fresh-database-bootstrap.md`):

```
node scripts/bootstrap-fresh-db.mjs --yes --env-file <file with DATABASE_URL and DIRECT_URL pointing at 127.0.0.1:55432>
```

## 2. Stand-ins

Supabase auth, Razorpay and Resend stand-ins are tiny local HTTP servers kept in `/var/tmp` (not in the repo). Rebuild: one server per service answering only the endpoints the API calls (Supabase auth user/token, Razorpay orders/payments/refunds, Resend send), returning canned JSON, and point `SUPABASE_URL`, the Razorpay and Resend base URLs at them in the API start script. Absent a stand-in, leave the key unset: every integration is env-or-noop.

## 3. API

Start script runs `cd apps/api && pnpm exec tsx src/server.ts` with `NODE_ENV=development`, the local `DATABASE_URL`/`DIRECT_URL`, dummy `RAZORPAY_KEY_ID/SECRET`, stand-in URLs, and `RATE_LIMIT_MAX=<large, e.g. 100000>` so sequential test scripts do not trip the limiter (the per-IP ceiling is `RATE_LIMIT_MAX * 12`). Check `curl localhost:4000/health`. Restart after each finished edit; serialise restarts with `flock` if several agents share one API.

## 4. Web

```
cd apps/web && NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1 setsid nohup pnpm exec next dev -p 3000 > /var/tmp/pgqa/web.log 2>&1 &
```

## 5. Prod-like smoke (before any API deploy)

`scripts/ops/prod-like-smoke.sh` (production mode, dummy `SENTRY_DSN`, local DB only). See `prod-deploy-checklist.md`.

## 6. Workflow checks when GitHub Actions is blocked

Run locally what the workflows run, and say so in the PR:
- `ci.yml`: `pnpm install --frozen-lockfile`; `pnpm --filter @poojly/api exec prisma generate`; `pnpm turbo lint type-check test build --filter=!@poojly/remotion-pitch` (each task; build is a forced `next build`); the "Ops guards" vitest list in `ci.yml`; `pnpm mcp:smoke`.
- `pr-checks.yml`: `node scripts/agents/fleet-integrity-check.mjs` and the agent-script syntax loop (`node --check scripts/agents/*.mjs`).
- `commitlint.yml`: install commitlint into a temp dir (`npm install --prefix <tmpdir> @commitlint/cli @commitlint/config-conventional`), then run it against `commitlint.config.js` over each commit message (`git log --format=%B -n1 <sha> | <tmpdir>/node_modules/.bin/commitlint --config commitlint.config.js`).
- Also verify merged `main` in `apps/api`, `apps/web` AND `apps/mobile` (tsc + vitest) before any deploy.

## 7. Gotchas

- Background processes are reaped between turns: re-check `pg_isready -h 127.0.0.1 -p 55432`, the API and the web server at the start of each turn and restart what is down.
- Never commit `apps/web/.next-prod` (forced-build output); delete it after a build.
- `next dev` rewrites `apps/web/tsconfig.json` and `next-env.d.ts`: `git checkout` them before committing.
- `pkill -f <pattern>` can kill your own shell when the pattern appears in your command line; kill by PID or use a bracket trick (`pkill -f "[t]sx src/server.ts"`).
- Demo roles have no provider profile until created via the portal route; approve with `PATCH /api/v1/admin/users/:userId {"approved":true}` (TC-08).
