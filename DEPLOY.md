# Poojly — Production Deployment Guide

Step-by-step, all **free tier**. ~15 minutes end-to-end.

---

## What you're deploying

```
┌─────────────────────┐         ┌─────────────────────┐
│  Cloudflare Pages   │────────▶│   Railway (API)     │────────▶ Neon Postgres
│  apps/web (Next.js) │   HTTPS │   apps/api (Fastify)│   SSL   (serverless, 500MB free)
│  poojly.pages.dev   │         │  xxx.up.railway.app │         Singapore region
└─────────────────────┘         └─────────────────────┘
```

---

## Step 1 — Database (Neon, 3 min)

1. Go to **https://neon.tech** → Sign up with GitHub
2. Click **"Create new project"**
   - Name: `poojly`
   - Region: **Singapore** (closest to India)
   - Postgres version: 16
3. On the project dashboard, click **"Connection string"**
   - Copy the **Pooled connection** (URL ends with `.pooler.neon.tech`) → this is `DATABASE_URL`
   - Click the toggle → copy the **Direct connection** (URL without `-pooler`) → this is `DIRECT_URL`
4. Save both — you'll paste them in Railway in the next step

**Optional:** Run migrations now from your local machine:
```bash
cd apps/api
echo "DATABASE_URL=<pooled>\nDIRECT_URL=<direct>" > .env
npx prisma migrate deploy
npx prisma db seed   # creates 8 demo accounts + 5 temples + 25 pujas
```

---

## Step 2 — Backend API (Railway, 5 min)

1. Go to **https://railway.app** → Login with GitHub
2. Click **"New Project"** → **"Deploy from GitHub repo"** → select `bhaktisetu` (will be public or add Railway to repo access)
3. Railway auto-detects the Dockerfile at `apps/api/Dockerfile` ✓
4. Go to **Settings** → **Root Directory** → leave empty (monorepo, Dockerfile references paths from root)
5. Under **Variables**, paste:
   ```
   DATABASE_URL=<from Neon step 1, pooled>
   DIRECT_URL=<from Neon step 1, direct>
   NODE_ENV=production
   PORT=4000
   CORS_ORIGIN=https://poojly.pages.dev
   JWT_SECRET=<generate random 32-char string>
   ANTHROPIC_API_KEY=<optional, get from console.anthropic.com>
   ```
6. Click **Deploy**. Railway builds Docker image + runs `prisma migrate deploy` on start
7. Once deployed, Railway assigns a URL like `poojly-api-production.up.railway.app` — copy it
8. Go to **Settings** → **Networking** → click **"Generate Domain"** if no URL shown yet

Verify: `curl https://<your-railway-url>/health` should return `{"status":"ok"}`

---

## Step 3 — Frontend (Cloudflare Pages, 5 min)

1. Go to **https://dash.cloudflare.com** → Sign up / login (free tier, no credit card)
2. In sidebar: **Workers & Pages** → **Create** → **Pages** tab → **Connect to Git**
3. Select GitHub → authorize → pick `bhaktisetu` repo
4. Build settings:
   - **Project name:** `poojly-web`
   - **Production branch:** `main`
   - **Framework preset:** Next.js
   - **Build command:** `cd apps/web && pnpm install && pnpm run pages:build`
   - **Build output directory:** `apps/web/.vercel/output/static`
   - **Root directory:** `/` (leave as root — monorepo)
5. **Environment variables** (click "Add variable"):
   ```
   NODE_VERSION=20
   NEXT_PUBLIC_API_URL=https://<your-railway-url>
   NEXT_PUBLIC_SUPABASE_URL=        # optional
   NEXT_PUBLIC_SUPABASE_ANON_KEY=   # optional
   ```
6. Click **Save and Deploy**. First build takes ~5 min.
7. Once deployed → URL will be `https://poojly-web.pages.dev`

**Update Railway's CORS_ORIGIN** to the actual Pages URL:
- Go to Railway → your API project → Variables → set `CORS_ORIGIN=https://poojly-web.pages.dev`
- Railway auto-redeploys

---

## Step 4 — Custom Domain (optional, 3 min)

If you bought `poojly.in` or similar:

**For web (Cloudflare Pages):**
1. In Cloudflare Pages → your project → **Custom domains** → **Set up a custom domain**
2. Enter `poojly.in` → Cloudflare adds CNAME automatically if domain is on Cloudflare DNS
3. If domain is elsewhere (Namecheap etc.) → add CNAME record:
   - Name: `@` (or `www`)
   - Target: `poojly-web.pages.dev`

**For API (Railway):**
1. Railway → Settings → **Networking** → **Custom Domain** → enter `api.poojly.in`
2. Add CNAME in your DNS:
   - Name: `api`
   - Target: whatever Railway shows

Update env vars:
- Railway: `CORS_ORIGIN=https://poojly.in`
- Cloudflare: `NEXT_PUBLIC_API_URL=https://api.poojly.in`

---

## Step 5 — Mobile APK (optional, Expo EAS)

```bash
cd apps/mobile
npx expo login               # create free account at expo.dev
npx eas init                 # links project to Expo
pnpm run build:android:preview
```

Cloud build takes ~10 min. EAS returns a download URL — install APK on any Android device or share link.

**For iOS:** requires Apple Developer account ($99/yr). Same flow: `pnpm run build:ios:prod`.

---

## Demo Credentials (seeded in DB)

All passwords: `demo123`

| Email | Role | Dashboard |
|-------|------|-----------|
| devotee@demo.com | Devotee | `/dashboard` |
| pandit@demo.com | Pandit | `/priest` |
| store@demo.com | Store Owner | `/store-admin` |
| astro@demo.com | Astrologer | `/astrologer-portal` |
| wellness@demo.com | Wellness | `/wellness-portal` |
| gaushala@demo.com | Gaushala | `/temple-portal` |
| temple@demo.com | Temple Manager | `/temple-portal` |
| admin@demo.com | Admin | `/admin` |

---

## Cost breakdown (free tier)

| Service | Free tier | Ceiling |
|---------|-----------|---------|
| Cloudflare Pages | Unlimited bandwidth, 500 builds/mo | Free forever |
| Railway | $5/mo credit (~500 compute-hours) | Upgrade $5/mo after |
| Neon Postgres | 500MB storage, 1 compute unit | Upgrade $19/mo after |
| Expo EAS | 30 builds/mo | Upgrade $19/mo after |
| Anthropic API | Pay-as-you-go | Free credits on signup |
| **Total to launch** | **₹0** | — |

---

## Redeploying

- **Web**: `git push` to main → Cloudflare auto-builds & deploys
- **API**: `git push` to main → Railway auto-builds & deploys
- **DB schema changes**: Update `apps/api/prisma/schema.prisma` → `npx prisma migrate dev --name describe_change` → commit → Railway runs `prisma migrate deploy` on next boot

---

## Troubleshooting

- **API 500 on first hit** → Railway's first boot is slow after auto-sleep. Second request works.
- **CORS error** → Check `CORS_ORIGIN` in Railway matches your frontend URL exactly
- **DB connection timeout** → Neon free tier sleeps after 5 min inactivity. First query wakes it (~2s). Upgrade $19/mo for always-on.
- **Cloudflare build fails** → Make sure `NODE_VERSION=20` env var is set

---

## Local dev

```bash
git clone https://github.com/XI1568-raghav/bhaktisetu
cd bhaktisetu && pnpm install
cp apps/api/.env.example apps/api/.env    # fill in
cp apps/web/.env.example apps/web/.env.local   # fill in
bash scripts/dev.sh   # starts both api (4000) + web (3000)
```
