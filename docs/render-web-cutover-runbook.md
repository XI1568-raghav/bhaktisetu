# Render Web Cutover Runbook — `darshya.online` off Cloudflare Pages → Render Node

> **Status:** code + CI smoke ready (branch `worktree-cf-opennext-migration`). The three manual steps below require dashboard access — no Render/CF API token is available locally. Do them in order after the CI smoke workflow is green.
>
> **Latest commits:** `9087da37` (consultation `[id]`/`[room]` slug-conflict fix — was 500-ing every route), `f85718a9` (removed dead `@opennextjs/cloudflare`+`wrangler`+`cf:*` scripts — was spawning `workerd` at build time, ENOENT on alpine).
>
> **✅ CI smoke GREEN (e2e-hardened)** — authoritative run `28913304398`, all 9 checks PASS (verified from runtime stdout): server boots in 4s, `/` → 200, `/sitemap.xml` → 200, `/robots.txt` → 200, `/api/orchestrator-status` → 200, **`/jyotirlinga/somnath` → 200 (real prerendered HTML, 'somnath' marker in body)**, **`/nava-graha/surya` → 200 (real prerendered HTML, 'surya' marker)**, `/kundli` → 308 `/astrology/kundli`, `/_next/static/chunks/webpack-*.js` → 200. The two `[slug]` checks prove the 1792-page prerender pipeline — the exact thing that broke under CF — serves real HTML from standalone, not a stub/404. The Dockerfile's standalone-copy guards (static + public + server.js) all passed; a partial standalone now fails the build, not runtime. The artifact is proven before any Render push.
>
> **Why:** OpenNext→Workers deploy is blocked (bundle 5.3 MiB gzip > free 3 MiB limit). The app uses no CF bindings in prod, so it self-hosts on Render Node free tier via Next `output: 'standalone'`. The API already runs on Render.

---

## 🟡 Autonomous cutover attempt — 2026-07-08 (PAUSED per user)

The cutover was wired as an autonomous `workflow_dispatch` workflow `.github/workflows/render-cutover.yml` (Steps 0/A1/A2/B1/B2/B3 — all API-driven, no dashboard). **Three attempts ran; A1/A2/B1 now pass; B2 (DNS) is blocked on a CF token scope gap; a separate 502 runtime bug was found + fixed.** Prod is unchanged (still on CF, 200). Resume turnkey once the one blocker is cleared.

**Verified live state (independent curl, 2026-07-08 ~09:56 UTC):**
- Render service `darshya-web` (`srv-d970l2ks728c738fc33g`) — **LIVE + serving 200** at `https://darshya-web.onrender.com` (`x-render-origin-server: Render`). Deploy `dep-d971r037uimc73e6u4hg`, branch `main`. `/jyotirlinga/somnath` → 200 (prerendered), `/sitemap.xml` → 200, `/api/orchestrator-status` → 200.
- Custom domains `darshya.online` + `www.darshya.online` — **registered on the Render service** (Step B1 passed).
- Prod `https://darshya.online` — **unchanged, still on CF** (`server: cloudflare`, 200). No DNS record was modified (B2 failed before any write).

**The ONE remaining blocker — CF token lacks DNS:Edit:**
- Step B2's `GET /zones/{zone}/dns_records` returned **CF error 10000 "Authentication error"** (verified via `render-diag` run `28931418264`). The `CLOUDFLARE_API_TOKEN` GH secret has Pages + Zone:Read scopes but **NOT `Zone → DNS → Edit`** on the `darshya.online` zone. Token itself is valid (`/user/tokens/verify` → active).
- **To resume autonomously:** Cloudflare dashboard → My Profile → API Tokens → edit the token backing `CLOUDFLARE_API_TOKEN` → add permission **Zone · DNS · Edit** (zone: `darshya.online`) → save. No need to re-issue the secret unless the token value changes. Then re-fire `gh workflow run "Render prod cutover" -f branch=main` — A1 reuses the live service, A2 sees live, B1 is idempotent, B2 writes the apex + www CNAMEs (DNS-only), B3 runs the 9 prod checks. End-to-end.
- **Alternative (no token change):** manually add the 2 CNAMEs in the CF dashboard (apex `darshya.online` → `darshya-web.onrender.com`, DNS-only/grey-cloud; `www.darshya.online` → `darshya-web.onrender.com`, DNS-only), then run the B3 verification standalone (`render-diag` `deploy` mode curls the 9 routes, or `deploy-web-render.yml` smoke).

**Bugs found + fixed during the attempts (all merged to `main`):**
1. `.service.url` → `.service.serviceDetails.url` (Render create-response has no top-level `.url`; webServiceDetails.url is the public URL) — commit `9e99c458`.
2. Deploy-list status path `.[0].status` → `.[0].deploy.status` (deploys list wraps each entry `{"deploy":{...}}`); A2 now polls the specific deployId (`.status` at root) — commit `02a407bf`.
3. Services-list lookup `.name`/`.ownerId` → `.service.name`/`.service.ownerId` (services list wraps `{"cursor":..,"service":{..}}`); A1 now paginates + is 409-tolerant — commit `29fcde28`.
4. **502 Bad Gateway on the live service** — Next standalone `server.js` bound to `process.env.HOSTNAME` (Render sets it to the pod hostname) instead of `0.0.0.0`, so Render's port scan found no open port on `0.0.0.0` → 502 despite "Ready". Fixed: `ENV HOSTNAME=0.0.0.0` in `apps/web/Dockerfile` — commit `c40d4bc6`. Verified: post-fix deploy `dep-d971r037uimc73e6u4hg` → live, `warm 1: 200`, all routes 200.

**Diagnostic workflow:** `.github/workflows/render-diag.yml` (`workflow_dispatch`) — modes: `deploy` (trigger deploy + poll live + curl 9 routes), `logs2` (fetch `/v1/logs` app/request/build logs), `cfdns`/`cferrors` (CF token/record probes). Keep it; it's the operational telescope for the Render service.

## Current state (verified)
| Thing | Value |
|---|---|
| Web build artifact | Next standalone `server.js` (`apps/web/Dockerfile`) |
| CI smoke workflow | `.github/workflows/deploy-web-render.yml` (builds image, boots, curls `/` + sitemap + robots + API route + `/kundli` redirect + a `/_next/static` asset) |
| Render Blueprint | `render.yaml` — second service `darshya-web` (docker, free, oregon, repo-root context) |
| **CF Pages zombie** | ✅ **KILLED 2026-07-08** (workflow `cf-kill-zombie.yml`, run `28926701272`). The `darshya` Pages project was repo-connected + auto-deploying on every push via `pnpm --filter @poojly/web pages:build` (deleted in `f85718a9`) → `ERR_PNPM_RECURSIVE_RUN_NO_SCRIPT` each push. Disabled via CF API PATCH (`source.config.deployments_enabled` + `production_deployments_enabled` → false). Verified: post-disable GET shows both flags `n/a` (no longer `true`); `https://darshya.online` still `200` on `server: cloudflare` (last deploy preserved — disabling auto-deploy does NOT delete existing deployments). `poojly-web` project already absent. Reversible: re-enable via same workflow (flip flags true) or dashboard. |

---

## Step 0 — Disconnect the CF Pages zombie auto-deploy ✅ DONE 2026-07-08

> **Completed autonomously** via `.github/workflows/cf-kill-zombie.yml` (run `28926701272`, live; `28926559483` dry-run). No dashboard access needed — the workflow uses the `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` GH secrets to PATCH `source.config.deployments_enabled` + `production_deployments_enabled` → false on the `darshya` project. Verified prod still live (`200`, `server: cloudflare`). The manual dashboard steps below are the **rollback / re-enable** path if ever needed.

Every push to the branch triggers a failing CF Pages dashboard build (log: `ERR_PNPM_RECURSIVE_RUN_NO_SCRIPT: None of the selected packages has a "pages:build" script`). The CF/Workers path is abandoned, so stop it from building:

1. Cloudflare dashboard → **Workers & Pages** → the **`darshya`** project (the live one; `poojly-web` is the already-unused legacy).
2. **Settings** → **Build & deployments** (or **Build settings**) → disconnect the GitHub integration: either set **Build command** to a no-op (`echo skip`) + **Deployments** → **Disable** automatic deployments, or fully remove the Git integration under **Settings → Git**.
3. Verify: push a trivial change (or just watch the next push) — no new CF Pages build should kick off. The legacy `poojly-web` project likewise — disable it too if still connected.
4. Keep the project + custom domain live until **Step B** DNS cutover is verified (rollback safety). Delete only in post-cutover cleanup.

> Optional later cleanup: delete `.github/workflows/deploy-web.yml` (CF, `workflow_dispatch`-only, dead) + `apps/web/CLOUDFLARE.md` + `apps/web/wrangler.jsonc` + `apps/web/open-next.config.ts` + `apps/web/cloudflare-env.d.ts`. I'll handle these in the post-cutover pass; they're inert now.
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
4. **Environment tab** — the `render.yaml` already sets the publishable `NEXT_PUBLIC_*` (Render bakes them as build args). Add these **secret** runtime env vars (set as *Secret*, not plaintext) — the server reads them at runtime (verified by grepping `process.env.` in `apps/web/app` + `apps/web/lib`):
   - `API_URL=https://api.darshya.online` (server-side fetch base — used by `/pujas/[slug]`, `/yatra-packages`, etc.)
   - `GITHUB_TOKEN` (used by `/api/orchestrator-status` route)
   - `IVS_REPLAY_BUCKET_BASE` (used by `/darshan/[id]/replay`)
   - `INDEXNOW_KEY` (used by the IndexNow ping route, if you want search-engine submission active — optional for first deploy)
   - Any others from `apps/web/.env.example`. The `cf:*` scripts and `@opennextjs/cloudflare`/`wrangler` deps were removed (commit `f85718a9`) — there is nothing Cloudflare left to configure.
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
