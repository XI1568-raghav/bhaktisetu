# Production Core Web Vitals re-measure, 2026-10-07 (after #330 / 25380ad)

Live https://darshya.online, mobile, Lighthouse 13.5.0 (performance only, default mobile emulation, simulated
Slow-4G / 4x CPU), 3 runs per page, 30 s apart, one page at a time. Same method as
`docs/perf/cwv-production-2026-10-06.md`. No 429 seen. Raw run JSON is scratchpad-only.

Pre-flight (cache freshness): first curl of `/temples` already had 21 `href="/temples/` links (needs >= 15) and
`/astrology` contained "Top Astrologers", so the new build was being served; no waiting was needed.

## Results (median of 3, each metric independently) vs 2026-10-06

| Page | Score (10-06 -> 10-07) | FCP | LCP | TBT | CLS | Speed Index | Weight |
|---|---|---|---|---|---|---|---|
| `/` | 67 -> 63 (-4) | 2.05 -> 4.95 s (+2.90) | 3.1 -> 6.97 s (+3.9) | 130 -> 161 ms (+31) | 0.018 -> 0.018 | 4.9 -> 5.6 s | 1.10 -> 1.06 MB |
| `/temples` | 66 -> 61 (-5) | 3.12 -> 4.75 s (+1.6) | 6.7 -> 8.04 s (+1.3) | 230 -> 255 ms (+25) | 0 -> 0 | 4.9 -> 5.4 s | 1.27 -> 1.20 MB |
| `/pujas` | 84 -> 83 (-1) | 1.80 -> 1.94 s (+0.14) | 3.8 -> 4.20 s (+0.4) | 174 -> 115 ms (-59) | 0 -> 0 | 3.6 -> 3.9 s | 1.33 -> 1.17 MB |
| `/astrology` | 65 -> 95 (+30) | 2.05 -> 1.79 s (-0.26) | 6.9 -> 2.39 s (-4.5) | 259 -> 87 ms (-172) | 0 -> 0.005 | 4.9 -> 3.4 s | 1.20 -> 1.17 MB |
| `/temples/badrinath` | 77 -> 63 (-14) | 1.94 -> 4.80 s (+2.9) | 3.8 -> 7.50 s (+3.7) | 283 -> 9 ms (-274) | 0.001 -> 0 | 6.1 -> 5.5 s | 1.24 -> 1.13 MB |

TTFB (lab, median): `/` 0.20 s, `/temples` 0.18 s, `/pujas` 0.97 s, `/astrology` 0.38 s, badrinath 0.18 s.

**Read this table with the noise in mind, see "Individual runs".** The medians for `/`, `/temples` and badrinath
are dominated by a slow mode of the sandbox (FCP ~4.8 to 5.0 s on every slow run) that is not a code effect.

## Individual runs (score / LCP s / TBT ms / CLS / FCP s)

- `/`: 88/1.9/161/0.171/1.9 | 63/7.0/0/0.018/4.9 | 59/7.5/166/0.018/5.0
- `/temples`: 61/8.0/93/0/4.8 | 91/2.6/255/0.058/1.7 | 56/8.0/304/0/4.8
- `/pujas`: 83/4.2/64/0/1.8 | 87/3.5/124/0/2.0 | 82/4.3/115/0/1.9
- `/astrology`: 95/2.4/99/0.005/1.8 | 62/7.4/0/0/5.1 | 97/2.0/87/0.008/1.7
- `/temples/badrinath`: 63/7.5/9/0/4.6 | 62/7.7/29/0/4.9 | 63/7.5/0/0/4.8

Pattern: runs fall into two clusters, a fast one (FCP 1.7 to 2.0 s, LCP 1.9 to 4.3 s, score 83 to 97) and a slow
one (FCP 4.6 to 5.1 s, LCP 7.0 to 8.0 s, score 56 to 63). The slow cluster has a near-constant FCP of ~4.8 s and
TBT near 0 (the main thread is idle waiting), which points at network/proxy stalls on the render-blocking CSS or
fonts, not at JS cost. All three badrinath runs and 2 of 3 `/temples` runs and 2 of 3 `/` runs landed in it, so
the medians for those pages say more about sandbox state at that minute than about the PR. The fast-cluster runs
are the better estimate of the code, the slow ones the better estimate of a bad network; neither is field data.

## Did #330 work?

- `/astrology`: yes. Initial HTML now has the content (`Top Astrologers` present); LCP 6.9 -> 2.39 s median
  (fast runs 2.4 and 2.0 s), TBT 259 -> 87 ms, score 65 -> 95. One slow-cluster run (7.4 s) shows the tail.
  Under the 2.5 s target on the median, but only 2 of 3 runs.
- `/temples`: HTML now carries the grid (21 temple links in the first HTML, vs the LCP image being absent last
  time). The single fast-cluster run measured LCP 2.6 s, score 91 (was 6.6 to 7.2 s), which is the right
  direction and slightly above 2.5 s. The median (8.04 s) is NOT under target because two of three runs hit the
  slow mode. Not proven under 2.5 s; needs a rerun on a quieter network or field data.
- `/` and badrinath: no code change targeted them; deltas are noise (the fast `/` run, 1.9 s LCP and score 88,
  is better than any run last time). TBT dropped sharply on badrinath (283 -> 9 ms) and astrology, consistent
  with analytics/Sentry/AdSense deferral past `load`, but TBT in slow-mode runs is near zero partly because the
  page finished late; do not over-credit it. `/pujas` TBT 174 -> 115 ms.

## Font requests (Lighthouse network-requests audit, font resources per page)

| Page | 2026-10-06 | 2026-10-07 |
|---|---|---|
| all pages (3 runs each) | 10 files, ~590 KB | `/`, `/temples`, `/pujas`, badrinath: 9 in every run; `/astrology`: 10 in every run |

Fonts did NOT stop downloading on Latin pages. Count dropped by one (10 -> 9; `/astrology` still 10 because it
also loads `crimsonPro`). Still requested on every page: `notoSans` latin (38 KB, preloaded), `Satoshi-Regular/
Medium/Bold` + `CabinetGrotesk-Bold` (4 files, 22 to 28 KB each, preloaded or CSS-discovered), and the four Indic
files `notoSansDevanagari` 123 KB, `notoSansTelugu` 126 KB, `notoSansBengali` 110 KB, `notoSansTamil` 52 KB
(~411 KB). Cause, verified from the live CSS and HTML: `unicode-range` IS present on those four faces
(`u+0900-097f`, `u+0b80-0bff`, `u+0c00-0c7f`, `u+0980-09ff`), but the first HTML contains native-script labels
(`हिन्दी`, `मराठी`, `বাংলা`, `தமிழ்`, `తెలుగు`) from the language switcher, and a browser downloads a
unicode-range face as soon as any matching character is rendered. So unicode-range works as designed; the
switcher labels defeat it. Fix: render those labels in the system font stack / a `font-family` that is not the
Indic faces, or lazy-render the switcher menu (`apps/web/components/LanguageSwitcher.tsx`, the `lang` label map
in `apps/web/app/layout.tsx`), or subset those labels into one tiny font. Expected: -410 KB on every Latin page.
(Hindi/Marathi page copy in `/temples` HTML, 234 Devanagari characters, would still need the Devanagari file.)

## What still dominates LCP / TBT

1. Slow-mode FCP ~4.8 s: render-blocking CSS (`4fc52b78043377d8.css` + `6516368051a8ef9b.css`) plus ~9 font files
   competing on an HTTP/1.1 proxy. Inline critical CSS or enable `experimental.optimizeCss` in
   `apps/web/next.config.ts`; split `apps/web/app/globals.css`. This is the biggest lever left for the median.
2. The ~411 KB of Indic font files above (`apps/web/components/LanguageSwitcher.tsx`, `apps/web/app/layout.tsx`
   font setup); also preload only `Satoshi-Regular` and `CabinetGrotesk-Bold`, not Medium/Bold.
3. `/pujas` TTFB 0.97 s median (others 0.2 to 0.4 s): `export const revalidate = 600` in
   `apps/web/app/pujas/(index)/page.tsx`; check edge caching of its HTML (Cloudflare does not cache HTML by
   default). Its LCP image is a hotlinked Wikimedia photo; self-host under `apps/web/public/images/pujas`.
4. `/temples/badrinath` redirect (308 from the long slug) is no longer in play here since the short slug was
   measured directly; keep internal links and `lib/temple-slug.ts` emitting the short slug. Hero image
   `apps/web/public/images/temples/badrinath.webp` still needs a 750w srcset step.
5. TBT is now low on medians (9 to 255 ms); remaining JS: `/` and `/temples` 160 to 255 ms. Candidates: shared
   chunk `75920-*.js`, `app/ask-pandit/page-*.js` prefetched from `components/MobileNavV2.tsx`.

## Method and limits

Lighthouse Node API (`lighthouse@13.5.0` + `chrome-launcher`, installed in the scratchpad, outside the repo)
driving Playwright Chromium (`/opt/pw-browsers/chromium-1194/chrome-linux/chrome`, `--headless=new --no-sandbox`)
with an explicit `--proxy-server=http://127.0.0.1:44157` (the sandbox proxy; port from `/root/.ccr/README.md`
and `__agentproxy/status`). Certificate verification was never disabled. 15 Lighthouse runs, 30 s apart, plus
2 curl probes, to darshya.online only; api.darshya.online was not called directly.

Limits: lab data, simulated throttling, noisy sandbox (non-India IP via a proxy that speaks HTTP/1.1; ignore the
`modern-http` insight), +/- 1.5 s on LCP and visibly bimodal this time (see above). Medians of n=3 are
independent per metric. Warm services (TTFB 0.2 to 0.4 s except `/pujas`); cold-start cost not measured. No
CrUX. To confirm the 2.5 s target for `/temples`, rerun when the sandbox is in fast mode or check PageSpeed
Insights from a normal network.
