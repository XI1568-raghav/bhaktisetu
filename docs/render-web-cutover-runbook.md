# Render Web Cutover Runbook — `darshya.online` off Cloudflare Pages → Render Node

> **Status:** code + CI smoke ready (commit `f063b2a9`, branch `worktree-cf-opennext-migration`). The two manual steps below (Render service creation + DNS cutover) require dashboard access — no Render/CF API token is available locally. Do them in order after the CI smoke workflow is green.
>
> **Why:** OpenNext→Workers deploy is blocked (bundle 5.3 MiB gzip > free 3 MiB limit). The app uses no CF bindings in prod, so it self-hosts on Render Node free tier via Next `output: 'standalone'`. The API already runs on Render.

## Current state (verified)
| Thing | Value |
|---|---|
| Web build artifact | Next standalone `server.js` (`apps/web/Dockerfile`) |
| CI smoke workflow | `.github/workflows/deploy-web-render.yml` (builds image, boots, curls `/` + sitemap + robots + API route + `/kundli` redirect + a `/_next/static` asset) |
| Render Blueprint | `render.yaml` — second service `darshya-web` (docker, free, oregon, repo-root context) |
| Current prod | `darshya.online` apex → CNAME-flattened to `darshya.pages.dev` (CF Pages project `darshya`) |
| API (unchanged) | Render, `api.darshya.online` |

---

## Step A — Create the Render web service (manual, ~5 min)

1. Render dashboard → **New +** → **Web Service** → connect the GitHub repo `XI1568-raghav/bhaktisetu`.
2. Branch: `worktree-cf-opennext-migration` (merge to main later once verified).
3. Render should detect the `render.yaml` Blueprint — pick the **`darshya-web`** service (NOT `bhaktisetu`, that's the API). If it doesn't auto-detect, configure manually:
   - **Name:** `darshya-web`
   - **Environment:** Docker
   - **Plan:** Free
   - **Region:** Oregon
   - **Docker Build Context Directory:** `.` (repo root — **not** `apps/web`)
   - **Dockerfile Path:** `apps/web/Dockerfile`
4. **Environment tab** — the `render.yaml` already sets the publishable `NEXT_PUBLIC_*` (Render bakes them as build args). Add these **secret** runtime env vars (set as *Secret*, not plaintext) — the server reads them at runtime:
   - `GITHUB_TOKEN` (server-side GitHub fetches, if used in prod routes)
   - `IVS_REPLAY_BUCKET_BASE` (if used in prod)
   - `API_URL=https://api.darshya.online`
   - Any other server-side keys the app needs (check `apps/web/.env.example` + grep `process.env.` in `apps/web/app` / `apps/web/lib`).
5. **Create Web Service** → first build kicks off. Watch the deploy log for `node server.js` to start + the health check (`/`) to pass.
6. Once live, Render gives a URL like `https://darshya-web.onrender.com`. **Copy it** — that's the pre-cutover verification target.

### Step A verification (do this before DNS cutover)
Send me the `*.onrender.com` URL and I'll curl-verify it end-to-end (home, a `[slug]` SSG page, `/api/orchestrator-status`, `/sitemap.xml`, `/feed.xml`, `/robots.txt`, the `/kundli` redirect, a static asset). Expect a ~1-min cold start on the first hit (free tier sleeps after 15 min idle) — hit it twice if the first is slow.

---

## Step B — Cutover `darshya.online` DNS to Render (manual, ~10 min, reversible)

> Do this **only after Step A verification passes.** This is the outward-facing/irreversible-ish step. It's reversible: repoint DNS back to `darshya.pages.dev`.

### B1. Add the custom domain in Render
1. Render dashboard → `darshya-web` service → **Settings** → **Custom Domains** → **Add Custom Domain**.
2. Add `darshya.online` and `www.darshya.online`.
3. Render shows the CNAME target it expects (e.g. `darshya-web.onrender.com`) and will issue a TLS cert after DNS resolves.

### B2. Repoint DNS in Cloudflare
1. Cloudflare dashboard → the zone for `darshya.online` → **DNS**.
2. Find the apex (`@`) record currently CNAME-flattened to `darshya.pages.dev`. Change target to `darshya-web.onrender.com` (keep CNAME flatten / orange-cloud **off** for the apex during cutover — Render must validate the cert; you can re-enable proxying after the cert is issued if desired, but Render recommends unproxied for the validation).
3. Find/add `www` CNAME → `darshya-web.onrender.com`.
4. Save. DNS propagation usually minutes (Cloudflare is fast).

### B3. Verify the cert + prod
1. Render → Custom Domains: status should go **Available** (cert issued) within a few minutes.
2. Send me confirmation and I'll verify prod end-to-end:
   - `curl -sI https://darshya.online` — expect `server: Render` (NOT Cloudflare-Pages), 200.
   - Re-run the route set above on the real domain.
   - Confirm `https://www.darshya.online` redirects to or serves the apex.
3. Keep the legacy CF Pages project `darshya` (and `poojly-web`) for 7 days as rollback, then delete.

---

## Rollback (if prod breaks)
- Cloudflare DNS → repoint apex + `www` CNAMEs back to `darshya.pages.dev`. Propagation in minutes. The old Pages deploy is still live during the rollback window.
- Render service can stay (free, sleeps when idle) — no cost.

## Post-cutover cleanup (after prod verified green for ~1 day)
I'll handle (autonomous): remove the dead OpenNext coupling from `next.config.ts` (`initOpenNextCloudflareForDev`), delete `apps/web/wrangler.jsonc` + `open-next.config.ts` + `cloudflare-env.d.ts` + the `cf:*` scripts, disable/delete the old `.github/workflows/deploy-web.yml` (CF Pages), update `docs/cf-worker-budget.md` + this runbook + memory to record the Render cutover.
