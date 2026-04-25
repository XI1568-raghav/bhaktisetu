# Darshya API Deployment

Fastify + Prisma require Node.js — deploys to Railway (primary) or Fly.io (alternative).

## Railway (primary)

1. Go to [railway.app](https://railway.app) -> New Project -> Deploy from GitHub repo.
2. Select the `Bhaktisetu` repo, set root to repo root (not `apps/api`). Railway reads `apps/api/railway.json`.
3. Add environment variables from `apps/api/.env.example` (fill real values):
   - `DATABASE_URL`, `DIRECT_URL` (Supabase pooled + direct)
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `ANTHROPIC_API_KEY`
   - `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`
   - `CORS_ORIGIN` (comma-separated list, e.g. `https://poojly.pages.dev,https://admin.darshya.online`)
   - `NODE_ENV=production`
   - `PORT=4000`
   - `JWT_SECRET`
4. Railway auto-detects `apps/api/Dockerfile` via `railway.json` and deploys.
5. Start command runs `prisma migrate deploy` before boot — migrations apply automatically.
6. Health check at `/health` (timeout 30s).

## Fly.io (alternative)

From `apps/api/`:

```bash
fly launch           # first time only — reads fly.toml
fly secrets set DATABASE_URL=... DIRECT_URL=... # etc.
fly deploy
```

Region: `bom` (Mumbai). VM: shared 1 CPU / 512 MB. Health check at `/health`.

## Local Docker test

From repo root:

```bash
docker build -t poojly-api -f apps/api/Dockerfile .
docker run -p 4000:4000 --env-file apps/api/.env poojly-api
```

## Notes

- Prisma migrations run on every boot via `migrate deploy` — safe, only applies pending migrations.
- CORS reads from `CORS_ORIGIN` (comma-separated). Falls back to localhost in dev.
- Health endpoint is unauthenticated.
