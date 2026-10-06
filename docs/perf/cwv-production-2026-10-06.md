# Production Core Web Vitals, 2026-10-06 (ledger CWV-01 / TD-01)

Measured against live https://darshya.online, mobile, Lighthouse 13.5.0 (performance category only, default
mobile emulation + simulated Slow-4G/4x CPU throttling), 3 runs per page, 30 s apart, one page at a time.
No 429 was seen. Raw run JSON is not committed (scratchpad only).

## Results (median of 3 for each metric independently)

| Page | Score | FCP | LCP | TBT | CLS | Speed Index | TTFB (lab) | Page weight |
|---|---|---|---|---|---|---|---|---|
| `/` | 67 | 2.05 s | 3.1 s | 130 ms | 0.018 | 4.9 s | 0.27 s | 1.1 MB |
| `/temples` | 66 | 3.12 s | 6.7 s | 230 ms | 0.000 | 4.9 s | 0.22 s | 1.27 MB |
| `/pujas` | 84 | 1.80 s | 3.8 s | 174 ms | 0.000 | 3.6 s | 0.82 s | 1.33 MB |
| `/astrology` | 65 | 2.05 s | 6.9 s | 259 ms | 0.000 | 4.9 s | 0.31 s | 1.2 MB |
| `/temples/badrinath-uttarakhand` (308 -> `/temples/badrinath`) | 77 | 1.94 s | 3.8 s | 283 ms | 0.001 | 6.1 s | 0.19 s | 1.24 MB |

Individual runs (score / LCP s / TBT ms / CLS):
- `/`: 59/3.1/2916/0.018 | 67/6.0/130/0.018 | 95/2.1/103/0.090
- `/temples`: 66/6.7/140/0 | 69/7.2/230/0.034 | 55/6.6/501/0
- `/pujas`: 84/3.8/150/0 | 92/2.7/183/0.017 | 80/4.5/174/0 (a first attempt of 3 runs all failed with CHROME_INTERSTITIAL_ERROR, then loaded fine on direct and on retry; not reproduced, treated as a transient proxy/edge fault and re-run)
- `/astrology`: 63/7.9/259/0 | 65/6.9/379/0 | 67/5.8/203/0
- badrinath: 70/3.8/341/0.001 | 87/2.8/283/0.001 | 77/4.1/186/0

Variance is large (home 59 to 95, pujas 80 to 92). Treat single numbers as +/- 1.5 s on LCP.

Compared with the earlier local figures: home LCP 3.1 s (was ~5.0 s; the perf PR #322 worked and its
`reveal-pending` CSS is live in prod). `/temples` 6.7 s and `/astrology` 6.9 s match the earlier 6.7 to 7.7 s.
`/pujas` is much better than reported (3.8 s). CLS is fine everywhere. TBT is under 300 ms on medians (one
cold home run hit 2.9 s, an outlier).

## Top opportunities Lighthouse named (run 2 of each page; Lighthouse 13 "insights")

Common to every page: render-blocking CSS (2 files: `4fc52b78043377d8.css` 34 KB and `54e771bc2df2826e.css` 3 KB,
est. 300 to 600 ms FCP); main-thread work 3.9 to 4.9 s and bootup 1.7 to 1.9 s (top script: chunk `75920-...js`
and the page's own HTML parse/hydrate); 10 font files, 590 KB on every page (`/fonts/Satoshi-*.woff2`,
CabinetGrotesk, 4 `_next/static/media/*.woff2` of 107 to 123 KB, three arriving at 1.5 to 2.9 s); about 300 KB of
JS over 34 to 38 requests; including `app/ask-pandit/page-*.js` and a 55 KB shared chunk on every page.
`modern-http-insight` (1.7 to 1.9 s) is an artifact: this sandbox's proxy speaks HTTP/1.1; ignore it.

1. `/`: render-blocking CSS 1.74 s est.; (modern-http, ignore); main-thread work 4.7 s; bootup 1.8 s; LCP is a hero `<p data-reveal="up">` with 2.19 s "element render delay" after a 0.30 s TTFB.
2. `/temples`: root document 950 ms (document-latency est. 850 ms); LCP image (`Shri Kashi Vishwanath`, `fetchpriority=high`) is NOT in the initial HTML: 2.05 s resource load delay + 1.1 s TTFB; image delivery 19 KiB (omkareshwar/mahakaleshwar `-500.webp` oversized); render-blocking CSS 0.5 s; main-thread 4.9 s; forced reflow.
3. `/pujas`: server response 710 ms (est. 610 ms); image delivery 87 KiB + cache 114 KiB (one hotlinked Wikimedia `Abhisheka_To_Panchamrutha.jpg/500px`, short cache TTL, third-party); legacy JS 12 KiB in chunk `75920-...js`; render-blocking CSS 0.31 s; main-thread 3.9 s.
4. `/astrology`: LCP is a hero `<p class="prose-lead">` with 2.11 s element render delay; TBT 259 to 379 ms (bootup 1.7 s, TBT share 300 ms); render-blocking CSS 0.48 s; main-thread 4.5 s.
5. badrinath: redirect 308 `/temples/badrinath-uttarakhand` -> `/temples/badrinath` costs ~0.9 s on LCP/FCP; image delivery 24 KiB (`/images/temples/badrinath.webp`, 1280x560 file served at 100vw; the srcset has 500w and a larger step); LCP resource load duration 0.55 s; document latency 480 ms; render-blocking CSS 0.6 s; TBT 283 ms.

Not flagged by Lighthouse on any page: unused-javascript, font-display (all `swap`), legacy JS (except /pujas).

## Method and limits

Method that worked: (a)/(b) hybrid, simpler than the briefing's SPKI pin. Lighthouse (node API, `lighthouse@13.5.0`
installed in the scratchpad, outside the repo) drove Playwright's Chromium launched via `chrome-launcher` with
`--headless=new --no-sandbox --proxy-server=http://127.0.0.1:46123`, i.e. an EXPLICIT proxy flag. The earlier failure
was not the CA: Chrome launched by Lighthouse without `--proxy-server` ignored `HTTPS_PROXY` and did not use the
proxy. With the explicit flag the proxy-served chain validated against the existing NSS db entries. The origin
chain seen through the proxy was the genuine Google Trust Services chain (leaf CN=darshya.online, issuer WE1), so
no SPKI pin was needed. No certificate verification was disabled anywhere (no ignore-certificate-errors, no
NODE_TLS_REJECT_UNAUTHORIZED, no curl -k). PSI/CrUX were not needed or tried.

Limits:
- Lab, not field data. Simulated throttling; a sandbox IP outside India reaching Cloudflare via a proxy. FCP/TTFB include proxy latency, so absolute values are likely pessimistic for Indian users and optimistic for none. TTFB here (0.2 to 0.8 s) means the Render services were warm during these runs: **cold-start cost (TD-01's 37.5 s) was not measured**; a cold first hit was not provoked.
- HTTP/1.1 through the proxy exaggerates request-queue effects and produces the false `modern-http` finding.
- n=3 with large spread; medians per metric are independent (not one run's values).
- No CrUX/field data; this does not answer which URLs fail the real-user CWV assessment.
- The request count to darshya.online: 15 Lighthouse runs + 3 re-runs of /pujas + 3 failed /pujas, plus 4 curl probes; api.darshya.online was not called directly.

## Code-level fixes (prioritised, impact estimated)

1. `/temples` LCP 6.7 s: the card grid streams behind `<Suspense>` after `getTemples()` (`apps/web/app/temples/(index)/page.tsx`, lines ~150 to 236; fetch in `apps/web/lib/api.ts`), so the LCP `<img>` is absent from the initial HTML (Lighthouse: "Request is discoverable in initial document: false", 2.05 s load delay). Render the curated first 3 to 6 cards (`TEMPLE_DETAILS`, already local) outside Suspense, or make the page ISR with the API merge at revalidation so the full grid is in the first HTML. Est. LCP -2 to -3 s (to roughly 3.5 to 4.5 s). Also set `eager`+`fetchpriority` only on the first card and use a real `-500.webp` for it.
2. Element-render-delay of 2.1 s on text LCPs (`/`, `/astrology`; also `/pujas` 0.86 s): the LCP is a hero paragraph, not an image, so the delay is paint blocking, not data: two render-blocking stylesheets (est. 0.5 to 1.7 s FCP/LCP; `app/globals.css` plus a 3 KB sheet) and webfont swaps. Inline critical CSS or enable `experimental.optimizeCss` (beasties) in `apps/web/next.config.ts`; split `globals.css` (34 KB, ~1,200 lines of which reveal/animation and per-route styles). Verify the hero paragraphs in `components/home/HeroCopyVariant.tsx` (lines 63/72) and `app/astrology/(index)` no longer carry `data-reveal` on first-viewport text (the #322 `reveal-pending` marking is live, but the paragraph still has the attribute, so confirm with a post-fix paint trace). Est. LCP -1 to -1.7 s on `/` and `/astrology`.
3. Fonts: 10 font files and 590 KB on every page, 3 of them (107 to 123 KB each, `_next/static/media/*.woff2`) landing at 1.5 to 2.9 s. In `apps/web/app/layout.tsx` (lines ~98 to 200) trim weights/axes of the root-layout `next/font` faces to what first paint needs, and drop `Satoshi-Medium/Bold` + `CabinetGrotesk-Bold` preload on routes that do not use them (they are fetched late, at 1.26 s, indicating they are CSS-discovered, not preloaded). Est. FCP -0.3 to -0.6 s, data -250 KB.
4. TBT/main thread (3.9 to 4.9 s main-thread work; TBT 230 to 380 ms): `ask-pandit/page-*.js`, a 55 KB shared chunk and chunk `75920-*.js` (47 KB, with 12 KiB legacy polyfills on /pujas) load on every page. Defer `DeferredClientWidgets`, `NotificationPrompt`, `Analytics`/GA4/Meta/PostHog/AdSense scripts in `app/layout.tsx` until after `load`/idle; set `browserslist` to modern targets to drop the legacy-JS bytes; stop `<Link>` prefetch for `/ask-pandit` from the nav (`components/MobileNavV2.tsx:344`). Est. TBT -100 to -200 ms, score +3 to +6.
5. Temple detail redirect: `/temples/badrinath-uttarakhand` 308s to `/temples/badrinath` (+0.9 s). Make internal links, the sitemap and `lib/temple-slug.ts` canonicalisation emit the short slug everywhere so users and Google never hit the redirect. Est. -0.9 s on affected entries.
6. Image sizing: hero image on temple pages (`/images/temples/badrinath.webp`, 1280x560, 25 KiB over) needs a 750w step in its srcset for phones (the `sizes="100vw"` picks the large file); regenerate with `scripts/self-host-images.mjs`; `/temples` card thumbs 500w are 10 KB oversize each. `/pujas`: self-host the Wikimedia `Abhisheka_To_Panchamrutha` photo (87 KiB over, 114 KiB uncached, third-party host) under `apps/web/public/images/pujas`. Est. LCP -0.15 s on temple pages, -114 KB on /pujas.
7. `/pujas` TTFB (0.71 to 0.82 s, `export const revalidate = 600` in `app/pujas/(index)/page.tsx:50`): confirm the HTML is cacheable at the edge (see below); no code reason found.

## Non-code causes

- Render free-tier cold start (TD-01): 37.5 s first hit was previously measured and was NOT reproduced here because both services were warm. An uptime pinger or paid instance (owner cost decision, per ledger) is the only fix. Keep `TD-01` state `owner`.
- Cloudflare caching: `/pujas` TTFB (0.7 to 0.8 s) vs 0.2 s elsewhere suggests that route's HTML is not edge-cached or revalidates on each hit; HTML for ISR routes is typically served `cache-control: s-maxage` by Next but Cloudflare does not cache HTML by default (needs a Cache Rule "Cache Everything" for the public routes, with bypass on cookies). Est. TTFB -0.3 to -0.6 s everywhere. Not verified by header inspection in this task.
- Cloudflare serves darshya.online over HTTP/2 or 3 to real users; the 1.8 s `modern-http` saving is a sandbox artifact.
- The owner `images.unoptimized` decision (sharp on a 512 MB container) is unchanged; self-hosted WebP is the workaround.
- Field verification: submit the URL set to Search Console / PageSpeed Insights from a normal network, since CrUX was not available here.
