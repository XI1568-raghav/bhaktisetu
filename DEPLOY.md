# Darshya — Production Deployment

Production deploy = **Render** (API as a Node service + Web as a Docker service, both free tier, Oregon region), **Supabase Postgres**, and **Upstash Redis**.

- The single source of truth for service topology and env vars is [`render.yaml`](./render.yaml).
- Full step-by-step runbook: [`DARSHYA_DEPLOYMENT.md`](./DARSHYA_DEPLOYMENT.md) and [`docs/render-web-cutover-runbook.md`](./docs/render-web-cutover-runbook.md).

> The legacy `apps/api/railway.json.legacy` and `apps/api/fly.toml.legacy` configs (owned by A1) are retained as untested alternative deploy targets. Neon Postgres and Cloudflare Pages (Next-on-Pages / OpenNext) were abandoned — see the runbook for the rationale.

## Quick reference

| Surface | Platform | Service |
|---------|----------|---------|
| API (`apps/api`, Fastify) | Render (Node free, Oregon) | `render.yaml` `bhaktisetu` web service, env `node`, healthCheckPath `/health` |
| Web (`apps/web`, Next.js) | Render (Docker free, Oregon) | `render.yaml` docker service, standalone Next output |
| Postgres | Supabase | pooled `DATABASE_URL` + direct `DIRECT_URL` |
| Redis (BullMQ) | Upstash | `REDIS_URL` (optional; API degrades to in-process noop queue when unset) |

## Local dev

```bash
git clone https://github.com/XI1568-raghav/bhaktisetu
cd bhaktisetu && pnpm install
cp apps/api/.env.example apps/api/.env        # fill in
cp apps/web/.env.example apps/web/.env.local   # fill in
bash scripts/dev.sh   # starts api (4000) + web (3000)
```

## Redeploying

- **Web / API**: push to `main` → Render rebuilds and deploys the affected service(s).
- **DB schema changes**: edit `apps/api/prisma/schema.prisma` → `npx prisma migrate dev --name describe_change` → commit → API runs `prisma migrate deploy` on next boot (or apply manually via `prisma db execute` with `DIRECT_URL`).
