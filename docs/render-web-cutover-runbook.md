# Render Web Cutover Runbook — `darshya.online` off Cloudflare Pages → Render Node

> **Status:** code + CI smoke ready (branch `worktree-cf-opennext-migration`). The three manual steps below require dashboard access — no Render/CF API token is available locally. Do them in order after the CI smoke workflow is green.
>
> **Latest commits:** `9087da37` (consultation `[id]`/`[room]` slug-conflict fix — was 500-ing every route), `f85718a9` (removed dead `@opennextjs/cloudflare`+`wrangler`+`cf:*` scripts — was spawning `workerd` at build time, ENOENT on alpine).
>
> **✅ CI smoke GREEN (e2e-hardened)** — authoritative run `28913304398`, all 9 checks PASS (verified from runtime stdout): server boots in 4s, `/` → 200, `/sitemap.xml` → 200, `/robots.txt` → 200, `/api/orchestrator-status` → 200, **`/jyotirlinga/somnath` → 200 (real prerendered HTML, 'somnath' marker in body)**, **`/nava-graha/surya` → 200 (real prerendered HTML, 'surya' marker)**, `/kundli` → 308 `/astrology/kundli`, `/_next/static/chunks/webpack-*.js` → 200. The two `[slug]` checks prove the 1792-page prerender pipeline — the exact thing that broke under CF — serves real HTML from standalone, not a stub/404. The Dockerfile's standalone-copy guards (static + public + server.js) all passed; a partial standalone now fails the build, not runtime. The artifact is proven before any Render push.
>
> **Why:** OpenNext→Workers deploy is blocked (bundle 5.3 MiB gzip > free 3 MiB limit). The app uses no CF bindings in prod, so it self-hosts on Render Node free tier via Next `output: 'standalone'`. The API already runs on Render.

---

## 🟢 CUTOVER COMPLETE — 2026-07-08 (prod on Render, verified)

The autonomous cutover workflow `.github/workflows/render-cutover.yml` ran to **success** on 2026-07-08 (run `28957245665`). All steps passed: 0 (CF Pages zombie kill) → A1 (service reuse) → A2 (live) → B1 (custom domains) → **B2 (DNS CNAMEs written)** → B3 (9 prod checks). End-to-end green.

**Final verified live state (independent curl, 2026-07-08 ~16:08 UTC):**
- Render service `darshya-web` (`srv-d970l2ks728c738fc33g`) — LIVE + serving 200 at `https://darshya-web.onrender.com`.
- CF DNS: `darshya.online` + `www.darshya.online` → CNAME `darshya-web.onrender.com` (orange-cloud proxy; `server: cloudflare` + `x-render-origin-server: Render` in prod headers — CF edge in front, Render origin).
- Prod `https://darshya.online` — **200**, `<title>Darshya, India's Devotional Super App</title>`, `/jyotirlinga/somnath` → 200 with `Somnath` body marker, `/kundli` → 308 `/astrology/kundli`, `www` → 301 apex. All 9 B3 checks PASS.
- CF Pages project `darshya` auto-deploy still KILLED — no build pipeline, last frozen deploy preserved as rollback.

**The blocker that was resolved — CF token DNS:Edit scope:**
- The original `CLOUDFLARE_API_TOKEN` GH secret (token ID `f5fbb661c60a9767c8f45d9c2cef07fb`) had Pages + Zone:Read but NOT Zone·DNS·Edit → B2 failed HTTP 403 / CF error 10000 across three attempts.
- **Fix applied 2026-07-08:** minted a fresh CF token with **Account·Pages·Edit + Zone·DNS·Edit + Zone·Zone·Read** scoped to `darshya.online`, pasted into the `CLOUDFLARE_API_TOKEN` GH secret via `gh secret set`. New token ID `a890cf5fe88921d35a270fe46e05be09`. Verified via `render-diag.yml` `cftoken` mode (DNS GET → 200).
- **Token cleanup (dashboard action, founder):** the old token `f5fbb661c60a9767c8f45d9c2cef07fb` ("bhaktisetu build token") is no longer used by any secret — **revoke it in the CF dashboard** (My Profile → API Tokens → ⋯ → Delete/Roll). Optionally rename the active token `a890cf5fe88921d35a270fe46e05be09` (currently `darshya-probe-test`) to `darshya-ci-deploy` for clarity — cosmetic only, no secret change.

**Diagnostic workflow:** `.github/workflows/render-diag.yml` (`workflow_dispatch`) — modes: `deploy` (trigger deploy + poll live + curl 9 routes), `logs2` (fetch `/v1/logs` app/request/build logs), `cftoken` (verify the GH-secret CF token's ID + DNS-records GET 200 vs 403). Keep it; it's the operational telescope for the Render service.

**Rollback — CORRECTED 2026-08-20 (`OPS-06`):** the DNS-repoint route below was only ever valid during the cutover window. Use **`docs/runbooks/prod-rollback.md`**: redeploy the last known-good commit with `gh workflow run render-diag.yml -f mode=deploy -f sid=srv-d970l2ks728c738fc33g -f commit=<sha>`. Repointing DNS back to `darshya.pages.dev` would serve the CF Pages build frozen on 2026-07-08 — months of missing pages and no guarantee it still matches the current API contract — and the project may have been deleted in post-cutover cleanup (Step B3 said keep it 7 days, then delete). Treat it as gone unless you have verified otherwise in the CF dashboard.

## 🟡 Historical: autonomous cutover attempts — 2026-07-08 (prior to completion)

The cutover was wired as an autonomous `workflow_dispatch` workflow `.github/workflows/render-cutover.yml` (Steps 0/A1/A2/B1/B2/B3 — all API-driven, no dashboard). **Three attempts ran; A1/A2/B1 passed; B2 (DNS) was blocked on a CF token scope gap; a separate 502 runtime bug was found + fixed.** The fourth attempt (after token scope fix) completed green — see the 🟢 block above. The notes below are retained for the bug-fix history.

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

> **CORRECTED 2026-08-20 (`OPS-06`).** The DNS-repoint procedure below was written
> for the cutover window, when the CF Pages deploy was hours old. It is no longer a
> rollback path and following it today would serve a site frozen on 2026-07-08.
>
> **The current procedure is `docs/runbooks/prod-rollback.md`.** Short version:
>
> ```bash
> gh workflow run render-diag.yml -f mode=deploys -f sid=srv-d970l2ks728c738fc33g   # find last good sha
> gh workflow run render-diag.yml -f mode=deploy  -f sid=srv-d970l2ks728c738fc33g -f commit=<sha>
> ```
>
> Note also that `autoDeploy: false` on both services means **pushing a revert
> deploys nothing** — only the dispatch above changes what is serving.

*Historical, cutover-window only — do not follow:*
- ~~Cloudflare DNS → repoint apex + `www` CNAMEs back to `darshya.pages.dev`.~~ The CF Pages project's auto-deploy was killed on 2026-07-08 (`cf-kill-zombie.yml`) and Step B3 scheduled its deletion after 7 days.
- Render service can stay (free, sleeps when idle) — no cost.

## Post-cutover cleanup (after prod verified green for ~1 day)
I'll handle (autonomous): remove the dead OpenNext coupling from `next.config.ts` (`initOpenNextCloudflareForDev`), delete `apps/web/wrangler.jsonc` + `open-next.config.ts` + `cloudflare-env.d.ts` + the `cf:*` scripts, disable/delete the old `.github/workflows/deploy-web.yml` (CF Pages), update `docs/cf-worker-budget.md` + this runbook + memory to record the Render cutover.
