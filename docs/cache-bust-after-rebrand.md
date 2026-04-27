# Clearing the BhaktiSetu ghost from already-installed clients

After the Darshya rebrand, the live code in production carries no
"BhaktiSetu" / "Bhaktisetu" / `bhaktisetu.onrender.com` references at
all. If a user still sees the old name, it means **their browser or
phone is rendering a cached old build**, not the current one.

The cache-bust playbook depends on which surface is showing the ghost:

## A. Web — browser cache

1. **Hard reload** with cache bypass:
   - Windows / Linux: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`
2. If that doesn't help, open DevTools → Network → tick **"Disable cache"** while DevTools is open, then reload.
3. Last resort: **Application → Storage → Clear site data** for `darshya.online`.

## B. Web — installed PWA (Add to Home Screen)

PWAs cache aggressively via the service worker. Currently Darshya does
NOT register a service worker (`apps/web/public/manifest.json` has no
`serviceWorker` reference). So the only caching surface is the same
browser cache as section A — handled the same way.

If a user *did* install the PWA before any service worker existed,
removing the home-screen icon and re-adding it will fully reset.

## C. Cloudflare edge cache

Even after a successful CF Pages deploy, an edge node may serve a stale
HTML for ~30 seconds. To force-purge:

1. Cloudflare Dashboard → `darshya.online` zone → **Caching → Configuration → Purge Cache → Purge everything**.
2. Wait 10 seconds for global propagation.
3. Smoke: `curl -I https://darshya.online/auth/signup` — should return 200 with `cf-cache-status: DYNAMIC` or `MISS` for the first request.

## D. Mobile app (Expo Go / built APK)

- **Expo Go**: shake-to-reload, then "Reload" from the dev menu. Or kill and reopen the app.
- **Built APK with the old `bhaktisetu.onrender.com` baked in**: that's a build-time constant. Old APKs will keep talking to the old host. Push a new build via `eas build --profile production` after `c7a9c1c` (the rebrand sweep commit) and have testers reinstall.

## How to know it's actually the cache, not a real bug

Run this from any machine:

```bash
curl -s https://darshya.online/auth/signup | grep -oiE "bhaktisetu|poojly" | sort -u
```

- Returns nothing → live HTML is clean → user is seeing cache.
- Returns `bhaktisetu` → real bug; reopen and tell me what shows.
