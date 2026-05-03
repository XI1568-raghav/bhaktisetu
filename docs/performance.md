# Web Performance (TD3)

## Targets

| Metric | Budget | How |
|---|---|---|
| LCP | < 2.5s | wikiThumb hero, fetchPriority=high, preconnect upload.wikimedia.org |
| CLS | < 0.1 | width/height on every img, font-display swap |
| TBT | < 200ms | optimizePackageImports, removeConsole prod, no Sentry browser bundle |
| First Load JS | < 170KB shared | next-intl on lang routes only, AdSense lazyOnload |

## Optimisations applied

1. **wikiThumb ladder snap** — every Commons URL goes through `wikiThumb(url, width)` to pick valid Commons thumbnail width (250/330/500/960/1280/1920). Reduces hero from 5MB raw → 200KB thumb.
2. **fetchPriority="high"** on above-fold hero image only.
3. **loading="lazy"** below-fold (default).
4. **width/height** on every `<img>` to prevent CLS jump.
5. **optimizePackageImports** for lucide-react, date-fns, @tanstack/react-query, lodash, react-icons, recharts, framer-motion, @radix-ui/react-icons.
6. **removeConsole** in prod (keeps `error`, `warn`).
7. **productionBrowserSourceMaps: false** — Sentry uses `@sentry/cli` to upload separately (TD7).
8. **CDN cache headers** per-route (TD8): hashed assets 1yr immutable, list pages 5min s-maxage + 24h SWR.
9. **Edge runtime** on dynamic temple/puja/yatra pages — cold start < 50ms vs 1-2s Node.
10. **next-intl middleware scoped** to `/hi /ta /te /kn` only — English routes bypass middleware overhead entirely.

## Pending (post-launch traffic data)

- Bundle analysis via `ANALYZE=true pnpm build` (add @next/bundle-analyzer when budget breached)
- Lighthouse CI in `.github/workflows/lighthouse.yml` once site stable
- Convert remaining `<img>` heroes to `next/image` with priority hints
- Subset Devanagari font to glyphs actually used (TD14 follow-up)

## How to measure locally

```bash
cd apps/web
pnpm build
pnpm start
# In another terminal:
npx lighthouse https://localhost:3000 --output=html --view
```

## Known regressions to watch

- Stripe.js + Razorpay.js inline scripts — only injected on /pujas/*/book + /upgrade
- Jitsi iframe — only on astrology/wellness session pages, not global
- AdSense script — premium-gated, doesn't load for paid users
