# Customer Test — Findings

Base: `https://darshya.online` · Deployed commit at test time: web `fc84b155`, API `cd9d0b1a`.
Phase: deterministic coverage floor complete. Interactive (CTA/form/role) testing pending on blockers.

## Coverage

| Surface | Count | Result |
|---|---|---|
| Static routes | 293 | 292 correct, 1 deliberate compliance gate. **0 defects.** |
| Dynamic route patterns | 98 | 58 PASS, 7 FAIL (soft-404), 33 UNRESOLVED (no sitemap sample) |
| Total app routes | 391 | 358 probed, 33 need real ids |

Of the 293 static: 217 → 200, 65 → correct `307 /auth/login?redirect=…` auth gate,
1 → correct `308 /live → /darshan`, 1 → `404 /csr-match` (intentional, see below).

## Confirmed findings

### CT-SEO-1 · P2 · soft-404 on 7 dynamic route patterns

A nonexistent slug returns **HTTP 200** instead of 404, with a broken `<title>`.

| Pattern | Bogus-slug status |
|---|---|
| `/temples/[slug]` | 200 |
| `/temples/[slug]/pujas` | 200 |
| `/pujas/[slug]` | 200 |
| `/pujas/[slug]/temples` | 200 |
| `/astrology/[id]` | 200 |
| `/astrology/pancha-pakshi/[slug]` | 200 |

Repro: `curl -sI https://darshya.online/temples/__ct_does_not_exist_zzz` → `200`, 115,279 bytes,
`<title>Temple — , | Darshya</title>`.

**Scope correction from first read.** The rendered page is *not* broken for a human: it shows a proper
"Page not found" screen with a search box and popular puja/temple links (confirmed visually in-browser).
Saved response body: `shots/soft-404-temples.html`. The defect is confined to two machine-facing things:

1. **Status code.** Google treats 200 as "this page exists", so unlimited fabricated URLs are indexable
   as valid pages — the textbook soft-404 duplicate/thin-content problem. `next/navigation`'s `notFound()`
   would emit a real 404.
2. **Title tag.** `Temple — , ` is unguarded interpolation over an empty record — the comma and dash
   separators survive with nothing between them. This is what shows in a SERP and a browser tab.

Not a UX-blocking bug. It is an indexing bug, and it silently inflates the indexed surface.

### CT-DOC-1 · P2 · Razorpay activation doc points at 404 URLs

`docs/razorpay-live-activation.md` §2 instructs the owner to give Razorpay's KYC reviewer:
`/legal/privacy`, `/legal/terms`, `/legal/refund`, `/legal/shipping`. **All four 404.**
The live pages are `/privacy`, `/terms`, `/refund`, `/shipping` (all 200, verified).

The doc says the reviewer opens each URL manually and that a bad URL adds 1–3 days or a rejection.
Anyone following this doc submits four dead links.

## Non-findings (verified, deliberately correct)

- **`/csr-match` 404 is intentional.** Gated behind `ENABLE_CSR_MATCH`, because the page told corporate
  CSR buyers in writing that the platform is "80G certified + CSR-1 registered" while `lib/company.ts`
  has `HAS_80G_VERIFIED false`, `pan null`, `eightyGNumber null`. The gate is the fix (LEG-14). Working.
- **The 9 apparent 5xx failures in the first sweep were self-inflicted.** `/te`, `/te/hyderabad` and 7
  `/temple-portal/*` returned 502/503 because the API service was mid-restart from the deploy I had just
  triggered. Re-probed after: `/te` and `/te/hyderabad` → 200, all 7 temple-portal → correct 307. Zero real
  failures. Recorded so a future run does not re-file them.
- **429s at concurrency 6.** The edge throttles a 6-way parallel sweep. Not a product defect; the sweep
  now paces at conc=2 + 400ms with exponential backoff on 429.

## Blocked — not yet tested

| Area | Routes | Blocker |
|---|---|---|
| Admin portal | 24 | No ADMIN account. Demo tokens hard-rejected in prod (`auth.ts:21`), no self-serve path, no promote script. |
| Temple portal | 9 | TEMPLE_MANAGER not in `ONBOARDING_ROLES`. |
| Money paths | booking→pay→commission→payout→refund | Razorpay test keys not yet set on the API service. |
| 33 dynamic patterns | 33 | Need real ids; most are auth-gated so they need B1 resolved first. |
| Every CTA / form / interaction | all | Deterministic sweep proves reachability only. Click-level testing is the next phase. |
