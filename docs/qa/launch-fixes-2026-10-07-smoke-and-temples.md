# Launch fixes 2026-10-07: prod-like smoke and /temples speed

## Task 7: pre-deploy prod-like smoke

`scripts/ops/prod-like-smoke.sh` boots the API from the checkout with `NODE_ENV=production` and
`SENTRY_DSN=https://abc123@o1.ingest.sentry.io/1` (this is what activates `@fastify/otel`), from an empty
environment (`env -i`, so nothing from the shell or any `.env` leaks in; `apps/api/.env` is never read), against a
database passed as `SMOKE_DATABASE_URL`. It refuses any host other than 127.0.0.1/localhost (exit 2), uses
`SMOKE_PORT` (default 4020), stops its server with `fuser -k` in a trap, and prints PASS/FAIL per check.
Checks: `/health`; 10 protected routes without a token -> 401; 3 with a garbage bearer -> 401; `/temples`,
`/store/products`, `/ai/health` -> 200; no `fastify otel instance` / `TypeError` / `FST_ERR` in the log.
`TypeError: fetch failed` is excluded: it is the dummy `SUPABASE_URL` (127.0.0.1:1) refusing the garbage token's
lookup, expected by design. Static guards: `scripts/test/prod-like-smoke.test.mjs`. Runbook:
`docs/runbooks/prod-deploy-checklist.md`.

Current checkout: SMOKE PASSED (17 PASS, 0 FAIL).
Deliberately broken (`stopWhenAnswered` calling `hook(request, reply)` without `this`): 14 FAIL, every protected
route answers 500, log shows `Cannot read properties of undefined (reading 'Symbol(fastify otel instance)')`,
exit 1. The file was restored with `git checkout`.

## Task 8: /temples

Method: local `pnpm build && pnpm start -p 3100`, Lighthouse 13.5 mobile preset (simulated Slow 4G / 4x CPU),
Playwright chromium, 3 runs each, images and API reached through the sandbox proxy. Lab, noisy.

| | Before (3 runs) | After (3 runs) |
|---|---|---|
| Score | 77, 77, 79 (one extra run 70) | 80, 78, 72 |
| FCP | 1.69, 1.22, 1.69 s | 1.55, 1.56, 1.56 s |
| LCP | 4.92, 4.51, 4.87 s | 4.60, 4.59, 4.55 s |
| TBT | 230, 312, 153 ms | 193, 249, 439 ms |
| Weight / JS | 756 KB / 286 KB, 62 req | 753 KB / 286 KB, 61 req |
| HTML (uncompressed) | 222,371 B | 221,501 B |

Findings: the LCP element is the first card image (already preloaded, 25 ms load, 55 ms download); the LCP
breakdown is almost all element render delay (about 1.2 s observed, x4 under CPU throttling). So the wait is
main-thread work before paint, not the network: Style & Layout 1.1 s and Script Evaluation 1.5 s (shared chunks
`75920-*` 802 ms scripting and the webpack runtime 351 ms, both site-wide, not /temples code). The card payload
itself is small (about 13 KB of RSC, 69 KB of card HTML out of 221 KB; the rest is the shared layout RSC).

Changed: (1) cards after the first row get `content-visibility:auto` with `contain-intrinsic-size:auto 420px`
(less first layout/paint); (2) only the first card has `fetchPriority=high` (was three), the first three stay
eager; (3) card descriptions clipped to 180 chars at a word boundary (the card shows two clamped lines), saving
about 1 KB raw. Filters, search, links and SEO text are unchanged.

Result: LCP about -0.3 s (4.9 -> 4.6 s, consistent in all 3 runs), FCP about -0.15 s. TBT is within run-to-run
noise (no improvement claimed). Weight did not change. Not under 2.5 s in the lab here; the larger levers are
site-wide and out of this change: the 75920 shared chunk, the webpack runtime/inline RSC scripts, render-blocking
CSS (`docs/perf/cwv-production-2026-10-07.md` items 1 to 2, 5). A bigger /temples-only step would be rendering
the grid as server markup with a small client island for filters; it needs a rewrite of `TemplesBrowser` and its
test files, so it was not attempted here.
