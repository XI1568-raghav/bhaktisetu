# R-Q1-E-001 — CSP nonce middleware completion handoff

> **Status**: BLOCKED — founder-action required (architectural decision)
> **Authored**: 2026-06-15 (ship-log batch)
> **Roadmap**: R-Q1-E-001 (P1)
> **Spec**: docs/roadmap/items/Q1/engineering/001-csp-nonce-middleware.md

## TL;DR

CSP nonce middleware was shipped in `7adbd87` (2026-06-08) and immediately reverted in `9c71e60` (same day) because `@cloudflare/next-on-pages` requires EVERY non-static route to declare `export const runtime = 'edge'` when middleware.ts is present at the project root. Adding middleware.ts back today would block CF Pages prod builds across ~292 of 370 routes that are not yet edge-runtime declared.

This item cannot be completed end-to-end by an agent without:
1. Founder decision on architecture (see Section 3), AND
2. Coordinated migration of ~292 routes to edge runtime, OR
3. Move off CF Pages free-tier to a host that allows middleware without forcing edge on every route.

## 1 — Current state

- `apps/web/middleware.ts` — **DOES NOT EXIST** (deleted in 9c71e60).
- `apps/web/public/_headers` — `script-src` includes `'unsafe-inline'` (restored in 9c71e60). 2 `unsafe-inline` occurrences total (script-src + style-src).
- `apps/web/app/layout.tsx` — nonce wiring removed. No `headers()` import for nonce extraction.
- Edge-runtime routes: 78 / 370 = 21%. Migration gap: 292 routes.
- CSP currently shipped is `unsafe-inline`-permissive. Inline XSS via 3rd-party loaders is NOT mitigated.

## 2 — Why the simple fix doesn't work

The naive plan ("add middleware.ts back, run jscodeshift to add `nonce={nonce}` to 147 JSON-LD scripts") fails at the CF Pages build step:

```
@cloudflare/next-on-pages: Found middleware but the following routes
do not declare runtime='edge': /pujas/[slug], /temples/[slug], /astrology/kundli, ...
[292 more]
```

The build refuses to ship. The pre-push hook (`bash scripts/preflight-cf-pages.sh`, see CLAUDE.md) catches this before push, so this is enforced not aspirational.

Even if we forced the push, the deploy would land on the 3 MiB CF Worker bundle cap with edge runtime cascaded across 292 more routes — see `docs/cf-worker-budget.md`. Several routes already approach the cap individually.

## 3 — Founder-decision required

Pick one path. Each has cost trade-offs:

| Path | Engineering cost | Free-tier impact | Security gain | Risk |
|---|---|---|---|---|
| **A. Full edge migration** — add `export const runtime = 'edge'` to all 292 routes, re-ship middleware, codemod 147 JSON-LD nonces | ~3-4 days (mechanical + per-route verification) | Risks 3 MiB Worker cap breach on heavy pages; need per-route bundle audit | Full CSP nonce + strict-dynamic, no `unsafe-inline` | High — could brick prod if any route exceeds Worker cap |
| **B. Move to Vercel** | Migration spike + DNS cutover ~1 day | $0 hobby tier covers current traffic; loses CF analytics | Same as A | Medium — Vercel free-tier has bandwidth cap that may be hit on viral days |
| **C. Static-only CSP** — keep `_headers`, never nonce, but tighten via `script-src 'self' https://checkout.razorpay.com https://js.stripe.com https://app.posthog.com https://www.googletagmanager.com` (allow-list, drop `unsafe-inline`) | ~4 hr — audit all inline scripts, refactor to external | $0 | Partial — kills generic inline XSS; 3rd-party allow-list grows with each new integration | Low — staged rollback if violations spike |
| **D. Accept current state** — defer indefinitely | $0 | $0 | None — `unsafe-inline` stays | Low security, indefinite tech debt |

**Recommendation**: Path C as a stop-gap to close the most common XSS vectors, then Path B (Vercel migration) when ready for full nonce-based CSP. Path A is the highest-risk path and not recommended on CF Pages free-tier.

## 4 — What can ship today without founder input

This handoff doc + a no-op middleware shim that, when enabled by env flag, generates a per-request nonce. Until middleware.ts is allowed to exist (after Path A/B/C resolution), the shim is dormant.

We do NOT add `apps/web/middleware.ts` to the working tree, because its mere presence triggers the CF Pages edge-runtime enforcement at build time. Instead we add a documented template at `docs/engineering/templates/middleware.csp-nonce.ts.txt` that the founder copies into place when ready.

## 5 — Acceptance criteria (when path chosen)

Per spec success_criteria:

- [ ] `curl -sI https://darshya.online/ | grep -i content-security-policy` returns CSP with `nonce-{base64}` + `strict-dynamic`, NO `unsafe-inline` in script-src
- [ ] Browser DevTools console on home shows zero CSP violations across Razorpay / Stripe / PostHog / GTM / CF Insights / AdSense
- [ ] ≥ 100 pages have inline `<script>` tags with `nonce` attr (codemod from R-Q1-E-006 covers 147)
- [ ] CF Pages free-tier build passes preflight: `bash scripts/preflight-cf-pages.sh`
- [ ] Per-route Worker bundle audit shows all routes < 3 MiB compressed

## 6 — Pending dependencies

- R-Q1-E-006 (jscodeshift codemod for 147 JSON-LD nonce attrs) is **specced + ready to run** but blocked on this item.
- R-Q1-E-002 is `blocks: [R-Q1-E-002]` per frontmatter — needs to be unblocked downstream.

## 7 — Related artifacts

- `7adbd87` — original middleware ship (reverted)
- `9c71e60` — revert commit w/ full context
- `docs/engineering/147-jsonld-nonce-codemod-spec.md` — R-Q1-E-006 codemod
- `docs/cf-worker-budget.md` — 3 MiB Worker cap constraints
- `apps/web/public/_headers` — current static CSP w/ unsafe-inline
- `CLAUDE.md` — edge-runtime triggers + preflight enforcement

## Next action

Founder to pick Path A / B / C / D in Section 3, then either:
- Path A/B → re-open R-Q1-E-001 with the chosen migration plan,
- Path C → spec new tighter `_headers` allow-list, ship without middleware,
- Path D → close R-Q1-E-001 as KILLED with `killed_reason: 'deferred to post-MVP1 when traffic justifies Vercel paid tier'`.

This item's roadmap `status` stays `in_progress` pending that decision.
