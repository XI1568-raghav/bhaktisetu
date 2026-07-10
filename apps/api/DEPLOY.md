# Darshya API Deployment

Production = Render (see repo-root `render.yaml` + `docs/render-web-cutover-runbook.md`).
Railway/Fly configs retained as untested legacy alternates.

The API Render web service builds via `pnpm --filter @poojly/api build` (tsc →
`dist/`) and starts via `pnpm --filter @poojly/api start`
(`prisma migrate deploy && node dist/server.js`). Health/liveness probe stays
`/health` (static); readiness is `/ready` (DB + Redis check). The
`apps/api/Dockerfile` is hardened (non-root `USER node`, `HEALTHCHECK`) for any
Docker-based alternate deploy but is NOT the Render path — Render uses the
package scripts above, not the Dockerfile.

`railway.json.legacy` and `fly.toml.legacy` are retained for reference only and
are not tested or maintained.
