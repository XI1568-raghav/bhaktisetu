# Darshya — Going Live on darshya.online

> ⚠️ **CUTOVER COMPLETE 2026-07-08 — web now ships from Render, NOT Cloudflare Pages.**
> This doc's original Phase E (CF Pages deploy) + Phase F (CF Pages custom domain) are **OBSOLETE**.
> Current web deploy = Render `darshya-web` (Next standalone docker) + CF DNS proxy edge.
> Authoritative current runbook: `docs/render-web-cutover-runbook.md`. Operational telescope: `.github/workflows/render-diag.yml` (modes `deploy`/`logs2`/`cftoken`).
> The Phase C (API on Render) + Phase D (api.darshya.custom domain) + Phase B (Supabase) sections below remain accurate and are kept as historical/backup reference.

---

This is the step-by-step runbook to take darshya.online from "domain purchased at Hostinger" to "live website + working API". Free tier on every layer.

---

## Architecture (free-tier stack — CURRENT post-2026-07-08 cutover)

```
[ User ]
    │
    ▼
darshya.online + www       ──CF DNS proxy──►  Render `darshya-web`     (apps/web — Next.js standalone docker)
api.darshya.online         ───────────────►  Render `bhaktisetu-api`   (apps/api — Fastify)
                                       │
                                       ▼
                                  Supabase Postgres       (managed DB)
```

| Layer    | Provider          | Free tier                                          |
|----------|-------------------|----------------------------------------------------|
| Web      | Render            | 750 hr/mo, sleeps 15 min idle, ~30–50s cold start, Next standalone docker |
| API      | Render            | 750 hr/mo, sleeps after 15 min idle, ~30 s cold start |
| Database | Supabase          | 500 MB Postgres, 50,000 monthly active users      |
| DNS+edge | Cloudflare        | darshya.online zone DNS, orange-cloud proxy, edge SSL (CF Pages build pipeline KILLED) |

**Honest cost note**: Both web + API sleep on the free tier. First request after 15 min of inactivity takes ~30 s while they spin up. For a real production launch you'll want $7/mo Render Starter ($0 cold start) once you have users.

### Why Render for web (not Cloudflare Pages)
Cloudflare Pages + `@cloudflare/next-on-pages` was the original plan but hit three dead-ends (verified 2026-07-08):
1. `next-on-pages` adapter abandoned/dead for our Next version.
2. OpenNext Workers bundle 5.3 MiB gzip > free-tier 3 MiB worker limit.
3. `apps/web/middleware.ts` build-breaker on the Pages adapter.
Render Node free tier via Next standalone avoids all three. Full rationale + cutover evidence in memory `reference_darshya_cf_pages_next_on_pages_dead`.

---

## Prerequisites — what I need from you

Before I can finish deployment I need each of the following. None of them require sharing passwords; all I need is for you to create the account and paste me the indicated value.

### 1. GitHub repo URL
You said the bhaktisetu repo is already on GitHub. Paste the URL like:
```
https://github.com/<your-username>/bhaktisetu
```

If the repo is private, also do this once:
- Go to https://github.com/settings/tokens?type=beta → **Generate new token (Fine-grained)**
- Repo access: only `bhaktisetu`
- Permissions: Contents = Read & Write, Pull requests = Read & Write
- Paste the token to me. (I will only use it to push the rebrand branch.)

### 2. Cloudflare account
- Sign up free: https://dash.cloudflare.com/sign-up
- Verify email
- Tell me the email you used (no password needed — you'll click the deploy buttons yourself, I'll guide you)

### 3. Render account
- Sign up free: https://render.com/register (use **Sign in with GitHub** — easiest)
- Tell me your Render username

### 4. Supabase account
- Sign up free: https://supabase.com/dashboard/sign-up (also "Sign in with GitHub" works)
- Create project named `darshya-prod`. **Region: [verify] — the region of the existing production Supabase project is not recorded anywhere in this repository, so do not assume India.** If you are rebuilding to match production, read it out of the Supabase dashboard first. (Corrected 2026-09-02, `OPS-10`: this line used to say Mumbai or Singapore, which was never verified.)
- After it provisions (~2 min), grab these from **Project Settings → Database → Connection string → URI**:
  - `DATABASE_URL` (looks like `postgresql://postgres.xxx:PASSWORD@aws-0-...supabase.com:5432/postgres`)
  - Save the password somewhere; you'll paste it into Render later
- Also from **Project Settings → API**:
  - Project URL
  - `anon` public key

### 5. Optional but recommended
- A throwaway Gmail for `support@darshya.online` forwarding (Hostinger lets you set up free email forwarding — not full mailbox)

---

## Step-by-step deployment

### Phase A — Push the rebrand to GitHub (5 min)

I've made all the rebrand changes locally. Once you give me the repo URL, I run:
```bash
git checkout -b rebrand/darshya
git add -A
git commit -m "feat: rebrand Poojly → Darshya, new shikhara logo, darshya.online domain"
git push -u origin rebrand/darshya
```
Then you merge the PR on GitHub, or I can push directly to `main` if you prefer.

### Phase B — Database (Supabase) (10 min)

1. Open your Supabase project → **SQL Editor** → **New query**
2. Paste and run the contents of `apps/api/prisma/schema.prisma` migration (I'll generate the SQL — `pnpm --filter @poojly/api prisma migrate deploy` once `DATABASE_URL` is set)
3. Run the seed: `pnpm --filter @poojly/api prisma db seed` (loads demo accounts, temples, pujas, content)

I'll do this step locally once you give me the `DATABASE_URL`.

### Phase C — API (Render) (15 min)

1. Render dashboard → **New +** → **Web Service**
2. Connect your GitHub → pick `bhaktisetu` repo → branch `main` (or `rebrand/darshya` if not merged yet)
3. Settings:
   - **Name**: `darshya-api`
   - **Region**: `Oregon` — production runs there, `render.yaml:15` (API) and `:56` (web). (Corrected 2026-09-02, `OPS-10`: this said Singapore, which no service has ever used.)
   - **Branch**: `main`
   - **Root Directory**: `apps/api`
   - **Runtime**: Node
   - **Build Command**: `cd ../.. && pnpm install --frozen-lockfile && pnpm --filter @poojly/api build`
   - **Start Command**: `pnpm --filter @poojly/api start`
   - **Plan**: Free
4. **Environment** tab → add:
   - `DATABASE_URL` = (from Supabase)
   - `JWT_SECRET` = (generate random 32-char string)
   - `NODE_ENV` = `production`
   - `PORT` = `4000`
5. Click **Create Web Service**. First build takes ~5 min.
6. Once green, your API is at `https://darshya-api.onrender.com`. Test: `curl https://darshya-api.onrender.com/api/v1/health`

### Phase D — Custom domain api.darshya.online (10 min)

1. In Render → your service → **Settings** → **Custom Domains** → **Add Custom Domain** → `api.darshya.online`
2. Render shows you a CNAME target like `darshya-api.onrender.com`
3. Open Hostinger → **Domains** → darshya.online → **DNS / Nameservers**
4. Add record:
   - Type: `CNAME`
   - Name: `api`
   - Target: `darshya-api.onrender.com`
   - TTL: `14400`
5. Wait 2–10 min for DNS propagation. Render auto-provisions SSL.

### Phase E — Web (Cloudflare Pages) (15 min) — ❌ OBSOLETE post-2026-07-08

> **Do NOT follow this phase.** Web now ships from Render `darshya-web`.
> **CORRECTED 2026-09-02 (OPS-06).** This banner used to say the web service
> ships when you push to `main`. It does not. `render.yaml` sets
> `autoDeploy: false` on both services (`:28` API, `:60` web) and no workflow
> here deploys from `main`, so a merge changes the repo and leaves the same
> bytes serving traffic. Deploying is an explicit dispatch
> (`docs/runbooks/prod-rollback.md`):
> `gh workflow run render-diag.yml -f mode=deploy -f sid=srv-d970l2ks728c738fc33g`
> — add `-f commit=<SHA>` to go back to a specific commit.
> The CF Pages steps below are historical reference ONLY. Pages is **not** a
> hosting layer and **not** a rollback target: its auto-deploy was killed
> 2026-07-08 (`cf-kill-zombie.yml`), its last build is frozen on that day, and
> the project may since have been deleted.

### Phase E (historical) — Web on Cloudflare Pages

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. Select GitHub → authorize → pick `bhaktisetu` repo → branch `main`
3. Settings:
   - **Project name**: `darshya`
   - **Production branch**: `main`
   - **Framework preset**: Next.js
   - **Build command**: `pnpm install --frozen-lockfile && pnpm --filter @poojly/web build`
   - **Build output directory**: `apps/web/.next`
   - **Root directory**: `/` (monorepo root)
4. **Environment variables**:
   - `NEXT_PUBLIC_API_URL` = `https://api.darshya.online`
   - `NODE_VERSION` = `20`
5. Click **Save and Deploy**. First build takes ~3–5 min.
6. Once live, your site is at `https://darshya.pages.dev`.

### Phase F — Custom domain darshya.online (10 min) — ❌ OBSOLETE post-2026-07-08

> **Do NOT follow this phase.** Domain wiring now done by `render-cutover.yml` Step B2 (CNAME apex + www → `darshya-web.onrender.com`, CF DNS) + Step B1 (Render custom domains). Already executed 2026-07-08 (PROD GREEN, all 9 B3 checks pass).
>
> **CORRECTED 2026-09-02 (OPS-06): rolling back is NOT a DNS repoint.** This
> line used to name the `darshya.pages.dev` CNAME as the rollback. Sending the
> CNAMEs there would serve the Cloudflare Pages build frozen on 2026-07-08 —
> months of missing pages, no guarantee it matches the current API contract,
> and the project may have been deleted in post-cutover cleanup. Roll back by
> redeploying a known-good commit instead — `docs/runbooks/prod-rollback.md`,
> `gh workflow run render-diag.yml -f mode=deploy -f sid=<SID> -f commit=<SHA>`.

### Phase F (historical) — CF Pages custom domain

1. In Cloudflare Pages → your project → **Custom domains** → **Set up a custom domain** → `darshya.online`
2. Cloudflare gives you DNS records (usually CNAME `@` → `darshya.pages.dev` or specific IPs for apex)
3. Open Hostinger → DNS for darshya.online → add the records Cloudflare specified
4. Also add: `CNAME` `www` → `darshya.pages.dev`
5. Wait 5–15 min. Cloudflare auto-provisions SSL.
6. Done. https://darshya.online is live.

---

## Verification checklist

- [ ] `https://darshya.online` loads the homepage (served by Render — header `x-render-origin-server: Render`)
- [ ] `https://api.darshya.online/api/v1/health` returns `{ "ok": true }`
- [ ] Login at `https://darshya.online/auth/login` with `devotee@demo.com` / `demo123` works
- [ ] Browse `/temples`, `/pujas`, `/darshan` — data renders
- [ ] Web (`darshya-web`) was deployed by an explicit dispatch: `gh workflow run render-diag.yml -f mode=deploy -f sid=srv-d970l2ks728c738fc33g`
- [ ] API (`bhaktisetu-api`) was deployed the same way, with `-f sid=srv-d7mc2n8sfn5c73dfce0g`
- [ ] Confirmed merging alone shipped nothing — `render.yaml` carries `autoDeploy: false` for both services (`:28` API, `:60` web)
- [ ] **CF Pages does NOT build** on push (auto-deploy killed 2026-07-08 — verify no new `darshya` Pages deploy appears)

---

## What's NOT covered by free tier

| Feature | Why not free | Cost when you need it |
|---|---|---|
| Mobile app on Play Store | Google charges $25 one-time | $25 |
| Mobile app on App Store | Apple charges $99/year | $99/yr |
| API never-sleeps | Render free tier sleeps 15 min idle | $7/mo Starter |
| Email sending (real) | Need transactional provider | Free tier on Resend/Brevo OK initially |
| Razorpay payments | Need merchant account, KYC | 2% + GST per transaction |
| AWS IVS streaming | $0.20/min ingest, $0.075/min view | Pay as you go |
| Custom branded email | Need email host | Free with Hostinger if domain there |

---

## When something breaks

- **Cloudflare build fails on monorepo paths** (HISTORICAL — CF Pages no longer builds web post-2026-07-08): was `NODE_VERSION=20` env var issue under `@cloudflare/next-on-pages`. If you re-enable CF Pages for any reason, see `docs/cf-pages-env-wiring-2026-05-13.md`. Web now builds on Render via `apps/web/Dockerfile`.
- **Render build OOMs**: Free tier has 512 MB RAM during build. If pnpm install crashes, switch build command to use `--prefer-offline --no-frozen-lockfile`.
- **API returns 502 after wake**: Cold start. Wait 30 s and retry. Upgrade to Starter to eliminate.
- **DNS not resolving**: Use https://dnschecker.org/#CNAME/api.darshya.online to verify global propagation. Can take up to 1 hour.

---

## Next steps after live

1. Set up Hostinger email forwarding `support@darshya.online` → your real inbox (Hostinger control panel → Email Forwarders)
2. Add Google Search Console + submit sitemap (`/sitemap.xml`)
3. Add basic privacy/terms (already exist at `/privacy`, `/terms` — review for accuracy)
4. Generate the PNG app icons (see `apps/mobile/assets/README.md`)
5. Submit mobile app for internal testing on Expo Go (no store needed)
