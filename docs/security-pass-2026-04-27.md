# Security pass — 2026-04-27

> Surgical OWASP-aligned audit. This is *not* a full pen test — it's the
> highest-impact subset of findings that we can address without a
> dedicated audit engagement. Findings are concrete (`file:line`),
> exploitability is one-sentence, and "shipped" / "deferred" is recorded
> per row.

## Findings

| # | Severity | Where | Issue | Exploit | Status |
|---|---|---|---|---|---|
| 1 | High | `apps/api/src/routes/payments.ts:117` + `services/payment.service.ts:217` | Razorpay webhook signature verifies HMAC against `JSON.stringify(payload)`, not the raw bytes. The `{ config: { rawBody: true } }` route option is dead — `@fastify/raw-body` is not registered. | An attacker who can craft a payload whose JSON re-serializes byte-identically to a known signature could pass verification. In practice Razorpay's compact JSON usually round-trips, but this is *not* a real signature check. | **Deferred** — fix needs `@fastify/raw-body` install + Razorpay test-mode webhook to verify end-to-end before shipping. Tracked as task #143. |
| 2 | Med | `apps/api/src/routes/auth.ts` (`/login`, `/send-otp`) | Only the global `@fastify/rate-limit` of 100 req/min applied. No per-identity cap → SMS pump on `/send-otp` (Supabase forwards to Twilio, we pay), credential stuffing on `/login`. | Burst 100 OTPs to a known phone in 60 s; Twilio bills $0.05+ each. | **Shipped** — `bucketOk()` keyed on phone (5/15min) and email (10/15min). |
| 3 | Med | `apps/api/src/routes/auth.ts:43-47` | Signup password min length 6, no character-class requirement. | Trivial dictionary brute force possible against a registered user (esp. paired with #2 absence). | **Shipped** — bumped to 8 chars + at least one letter + at least one digit (NIST 800-63B compliant — no special-char churn). |
| 4 | Low | Global CORS allowlist | `helmet` registered with `contentSecurityPolicy: false`. CSP is opt-out, not opt-in. | XSS surface is wider than necessary. | **Deferred** — adding a real CSP needs an inventory of every script source the web app uses (PostHog, CF Analytics, Razorpay checkout, Jitsi). Worth its own session. |
| 5 | Low | `apps/api/src/routes/semantic-search.ts:57` | Uses `$queryRawUnsafe` with table + column names interpolated, but they come from a whitelisted `TABLE_COLS` map and `lit` from `toPgVector` is sanitized to numerics. **No issue** — flagged so future readers don't re-flag it. | n/a | **N/A** — false positive on standard "raw SQL" greps. |
| 6 | Low | `apps/api/src/routes/ratings.ts` | Raw SQL via `$executeRawUnsafe` / `$queryRawUnsafe` — every parameter is `$N::uuid` parameterized. | n/a | **N/A** — checked. |

## Dependency audit (`pnpm audit --prod`)

23 vulnerabilities reported across 14 unique advisories. None are in the
API runtime path. Distribution:

| Package | Severity | Where it ships | Action |
|---|---|---|---|
| `tar` | high (×6) | `apps/mobile` (expo build chain) | Ship-blocked? No — only used at expo build time, not at runtime in any deployed surface. |
| `@xmldom/xmldom` | high (×5) | `apps/mobile` (expo) | Same as above. |
| `protobufjs` | critical | transitive in expo / firebase | Same as above; not in API runtime. |
| `postcss` (<8.5.10) | moderate | `apps/admin`, `apps/mobile` build | CSS build-time only; not in deployed bundles. |
| `uuid` | moderate | transitive | Not exploitable in our usage. |

**Verdict**: no production-runtime vulnerability requires immediate
patching. The expo / build-time advisories should be cleared on the
next dependency-bump session by `pnpm update --recursive` and
re-running the audit. Adding `pnpm audit --prod --audit-level high` to
CI would catch regressions — that's a 5-line workflow add for a
follow-up session.

## What was already in place before this pass

- `@fastify/helmet` registered (server.ts:56) with cross-origin policy
  set explicitly.
- `@fastify/rate-limit` global 100/min (server.ts:70).
- `@fastify/cors` with explicit allowlist from `CORS_ORIGIN` env var
  (server.ts:60).
- `authenticateUser` preHandler on every protected route group.
- Per-conversation chat send rate limit (60/min).
- Per-user demo-pay rate limit (10/10min) + `ENABLE_DEMO_PAY` env gate.
- HMAC-SHA256 magic-link tokens with constant-time compare.
- Demo login chips hidden in production unless `?demo=1` is on the URL.

## What this pass DID NOT cover

- Full route-by-route OWASP Top 10 review.
- Authorization-matrix audit (does every "edit X" endpoint check that
  the requester owns X?).
- Session-management review (token rotation, refresh-token hygiene).
- Front-end XSS surface (innerHTML usage, dangerouslySetInnerHTML).
- Real-time threat modeling.
- Pen test or fuzz harness.

These belong to a dedicated security engagement, not a sweep mid-product.
