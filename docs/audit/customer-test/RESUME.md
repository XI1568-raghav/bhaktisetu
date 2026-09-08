# Customer Test — RESUME

Last updated: 2026-09-08. Read this first after a compaction or `/clear`.

## Established facts (verified, do not re-derive)

### Prod is NOT stale — deploy is a no-op

| Service | Deployed commit | Status | When |
|---|---|---|---|
| Web `srv-d970l2ks728c738fc33g` | `fc84b155` | `live` | 2026-09-04 21:10 UTC |
| API `srv-d7mc2n8sfn5c73dfce0g` | `80ae1c8f` (= `origin/main` HEAD) | `live` | 2026-09-07 |

`git diff --stat fc84b155 origin/main -- apps/ packages/ prisma/` is **empty**. The 11 commits
since the web deploy are all agent chores / `[skip ci]` roadmap dryruns. PR #250 fixed the
"stale since 2026-08-16" web image build and it deployed successfully on 2026-09-04.

Smoke: `/ /pujas /temples /auth/login /dashboard /store /astrology` all 200. Home = 277,921 bytes.

### Route inventory

`docs/audit/customer-test/routes.txt` — **391 routes** (293 static, 98 dynamic).
Gated: admin 24, priest 12, temple-portal 9, astrologer-portal 7, wellness-portal 7,
store-admin 6, gaushala-portal 6, auth 7, account 3, bookings 3, checkout 2,
gurukul-portal 2, dashboard 1. Public remainder: 302.

Regenerate with:

```
cd apps/web && find app -name "page.tsx" | sed 's|^app||; s|/page.tsx$||; s|^$|/|' | grep -v "^/api" | sed 's|([^)]*)/||g' | sort -u
```

## Open blockers

### B1 — Test accounts (BLOCKS all 8-role testing)

Demo tokens are **hard-rejected in prod by design**: `apps/api/src/middlewares/auth.ts:21`
`shouldRejectDemoTokensInProd` returns true when `ALLOW_DEMO_TOKENS=true && NODE_ENV=production`,
with `auth.demo-guard.test.ts` asserting it. So the 8 accounts in
`apps/api/scripts/seed-demo-users.ts` (`devotee@demo.com` … `admin@demo.com`) are useless against prod.

Real accounts are needed. Self-serve path exists for 5 provider roles via the onboarding route
(`ONBOARDING_ROLES`: PANDIT, STORE_OWNER, ASTROLOGER, WELLNESS_INSTRUCTOR, GAUSHALA_MANAGER).
**ADMIN has no self-serve path and no promote script** — owner must provision it.

### B2 — Razorpay test mode (BLOCKS money paths)

Owner action on Render API service env: `RAZORPAY_KEY_ID` → `rzp_test_*`, plus
`RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`. Mechanism is
`apps/api/src/lib/payment-mode.ts` → `isRazorpayDemoMode()`.
No staging service exists (`render.yaml` has only the two above), so this puts **prod** in test mode.
Owner chose to accept that window and swap live keys back after.

## Shipped this session

PR #252 merged as `cd9d0b1a`. API deploy `dep-dafj2non74is73a8c5ig` → **status `live`**,
finished 2026-09-07T21:52:48Z. Migration `20260902000000_store_product_soft_delete` applied
(API start runs `prisma migrate deploy`; service is up and `/health` returns `db:ok`, and a
failed migration would crash-loop instead). That was the only unshipped application code.

## Test progress

Deterministic coverage floor is DONE — see `FINDINGS.md`.
- `sweep.mjs` → static routes. **219 PASS / 74 REVIEW / 0 FAIL.** Run at conc=2 delay=400
  (conc=6 triggers edge 429s; the script now backs off on 429).
- `resolve-dynamic.mjs` → dynamic patterns via prod sitemap (1,576 live URLs in
  `sitemap-urls.txt`). **58 PASS / 7 FAIL / 33 UNRESOLVED.**
- Ledgers: `LEDGER.json` (static, re-probe folded in), `LEDGER-dynamic.json`.

NEXT: interactive phase — every CTA, form, empty state, double-submit, back/refresh per role.
Needs B1 and B2 below.

## Local working tree

`git stash@{0}` = `CT-SAFETY-2026-09-08-preserve-120-wip` — 93 tracked + 30 untracked files
(mostly `apps/mobile`, does not deploy to Render). Stashed off branch
`fix/render-web-image-build` at `3d49c97e`. **Restore before doing any mobile work.**

## Findings so far

| ID | Severity | Finding |
|---|---|---|
| CT-DOC-1 | P2 | `docs/razorpay-live-activation.md` lists legal URLs as `/legal/privacy`, `/legal/terms`, `/legal/refund`, `/legal/shipping` — all **404**. Live pages are `/privacy`, `/terms`, `/refund`, `/shipping` (all 200). Copy-pasting the doc's URLs into Razorpay KYC would get the application rejected. |
| CT-SEO-1 | P2 | Soft-404: 7 dynamic patterns return **HTTP 200** for a nonexistent slug, with a broken `<title>` (`Temple — , `). Visible UI is a correct "Page not found" screen — the bug is machine-facing (indexable garbage URLs). Full detail in `FINDINGS.md`. |

**Do NOT re-file these as failures** (verified deliberate/transient): `/csr-match` 404 is the
`ENABLE_CSR_MATCH` compliance gate (LEG-14). The 9 5xx in the first sweep were the API restarting
mid-deploy — re-probed clean.
