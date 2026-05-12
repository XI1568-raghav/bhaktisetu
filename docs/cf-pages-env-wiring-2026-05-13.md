# Cloudflare Pages env wiring — Sentry + PostHog

> 5-min user task. Copy/paste keys from Sentry + PostHog dashboards into Cloudflare Pages env, redeploy. Code is already env-or-noop, so missing keys = silent skip; once pasted, observability flips on at next deploy.

## Why now

- **Sentry web**: zero error capture in prod right now. Every white-screen, hydration mismatch, payment-flow exception is invisible. Risk highest immediately after `2fe686b` (Suspense fix), `aa0c027` (Razorpay store-checkout), and `4244ced` (Zod boundary sweep).
- **PostHog**: zero funnel data. Cannot measure NRI Day-30 retention (<25% tripwire), CAC ($40 ceiling), or NRI annual:per-puja ratio (<1:3 by week 12). Growth flying blind.

Code paths verified env-or-noop:
- `apps/web/lib/sentry.ts:14-17` — `if (!dsn) return;`
- `apps/web/components/Analytics.tsx:30-31` — `if (!key || window.posthog) return;`

## Step 1 — Get Sentry DSN (~3 min)

1. Open https://sentry.io → **Create Project** (skip if `darshya-web` exists)
2. Platform: **Browser JavaScript** (NOT Next.js — we use the standalone `@sentry/browser` CDN bundle, not `@sentry/nextjs` which breaks `@cloudflare/next-on-pages`)
3. Project name: `darshya-web`, alert frequency: default
4. Skip the SDK install wizard — already done
5. Settings → **Client Keys (DSN)** → copy the DSN. Format: `https://<hash>@o<org>.ingest.sentry.io/<project>`

## Step 2 — Get PostHog project key (~2 min)

1. Open https://us.posthog.com → **Project Settings** (or create project `darshya-web`)
2. **Project API Key** section → copy the key. Format: `phc_<48 chars>`
3. Note the host: `https://us.i.posthog.com` (default in code, no need to override unless using EU)

## Step 3 — Paste into Cloudflare Pages (~2 min)

1. Open https://dash.cloudflare.com → **Workers & Pages** → project `poojly-web`
2. **Settings → Environment variables**
3. Add **Production** vars:
   - `NEXT_PUBLIC_SENTRY_DSN` = `<DSN from Step 1>`
   - `NEXT_PUBLIC_POSTHOG_KEY` = `<key from Step 2>`
   - (optional) `NEXT_PUBLIC_SENTRY_RELEASE` = `2026-05-13` — useful for Sentry release tracking; bump per deploy
4. **Save**
5. Trigger redeploy: **Deployments** tab → latest deploy → **Retry deployment**, OR push an empty commit:
   ```bash
   cd E:/NewClaude/bhaktisetu
   git commit --allow-empty -m "ops: trigger CF Pages redeploy with Sentry+PostHog envs"
   git push
   ```

## Step 4 — Verify in prod (~3 min)

**Sentry verify:**
1. Open https://darshya.online in browser → DevTools → **Network** tab
2. Filter `sentry-cdn` → should see `bundle.min.js` 200
3. In console: `window.Sentry.captureException(new Error('test from prod'))`
4. Sentry dashboard → **Issues** → see "test from prod" within ~30 sec

**PostHog verify:**
1. Same browser session → DevTools → **Network** → filter `posthog`
2. Should see `array.js` 200, then `decide/?v=*` POST (feature flags fetch), then `e/?ip=*` (event capture)
3. PostHog dashboard → **Activity → Live events** → see `$pageview` with `$current_url: https://darshya.online/`
4. Click around → see `home_view`, `temple_view`, etc fire (per layer G PostHog event firing)

## Step 5 — Update API server side too (~1 min)

API already has `SENTRY_DSN` env support (`apps/api/src/lib/sentry.ts`). On Render:
1. Render dashboard → service `bhaktisetu` → **Environment**
2. Add `SENTRY_DSN` (NOT `NEXT_PUBLIC_` prefix — server-side) = same DSN as web (or create separate Sentry project `darshya-api`)
3. Save → Render auto-redeploys

## Done criteria

- [ ] Sentry project `darshya-web` exists
- [ ] PostHog project key copied
- [ ] Both vars added to Cloudflare Pages production env
- [ ] CF Pages redeploy green
- [ ] DevTools Network shows `bundle.min.js` + `array.js` loading on darshya.online
- [ ] Test exception appears in Sentry Issues
- [ ] `$pageview` event appears in PostHog Live events
- [ ] (optional) `SENTRY_DSN` also pasted on Render for API errors

## Rollback

Delete the env vars in Cloudflare Pages → next deploy goes back to no-op state. No code change required.
