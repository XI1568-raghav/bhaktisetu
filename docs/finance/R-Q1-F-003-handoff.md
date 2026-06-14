# R-Q1-F-003 — Razorpay Live KYC Handoff

**Status**: founder-action-required
**Spec**: `docs/finance/razorpay-live-kyc-spec.md`
**Roadmap item**: `docs/roadmap/items/Q1/finance/003-razorpay-live-kyc-submission-for-domestic-real-pay.md`
**Founder gate**: U1 (per `docs/activation-gates.md`)

## Why this is open

KPI `razorpay_live_active` requires `target: 1` count. Threshold flips only after Razorpay verification team approves Section 8 NPO KYC and toggles live mode on the merchant dashboard. Agent cannot self-submit — needs founder Aadhaar/PAN/director-signed docs and inside-Razorpay verification flow.

## Founder action (sequence)

1. Read spec `docs/finance/razorpay-live-kyc-spec.md` — covers 8 pre-req docs + submission steps + risk + mitigation.
2. Gather doc bundle (Section 8 CoI + PAN + bank proof + MoA/AoA + director KYC + address proof + 80G if available + 10 site screenshots).
3. Login Razorpay Dashboard → Settings → KYC → "Section 8 (Non-Profit)" → upload + submit.
4. Track verification team contact (phone verify + video KYC if requested).
5. On approval: flip live mode env vars in Render — `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET` from `rzp_test_*` to `rzp_live_*`.
6. Update `docs/roadmap/_manual-kpis.yml` — set `razorpay_live_active: 1`.
7. Flip frontmatter `status: shipped` + add `shipped_at: <ISO>` to `docs/roadmap/items/Q1/finance/003-razorpay-live-kyc-submission-for-domestic-real-pay.md`.

## Engineering already in place (no founder code work)

- Razorpay client wired in `apps/api/src/routes/payment.ts` — env-or-noop when keys absent.
- Webhook handler `/api/v1/payment/webhook` validates HMAC signature.
- Booking record creates `pending_payment` → `paid` on webhook event.
- Demo-fallback path active (`ALLOW_DEMO_PAYMENTS=true`) for current test-mode bookings — must be unset post live-flip per `docs/auth-model.md`.

## Engineering tickets (post-approval)

- R-Q1-F-003a — doc bundle preparation (founder, no code)
- R-Q1-F-003b — Razorpay submission (founder, dashboard)
- R-Q1-F-003c — env flip + verify in Render (founder paste, agent verifies via `apps/api/scripts/probe-razorpay-mode.mjs` — see below)

## Tracking

- This item stays `status: in_progress` until KPI flips to 1.
- Founder updates `docs/roadmap/_manual-kpis.yml` `razorpay_live_active` when approval lands.
- Orchestrator polls KPI each cycle; once 1, item auto-eligible for shipped flip.

## Probe script

`apps/api/scripts/probe-razorpay-mode.mjs` — env-or-noop helper. Reads `RAZORPAY_KEY_ID` from env. Returns `test` | `live` | `unset`. Run via `node apps/api/scripts/probe-razorpay-mode.mjs` post env flip to confirm live mode toggle landed.

## Risk + mitigation (carried from spec)

- Risk: Section 8 KYC slower (15-30d vs 7d for for-profit). Mitigation: continue test-mode bookings + cash-on-fulfilment for high-trust temples until approval.
- Risk: KYC rejected on NPO-restrictions. Mitigation: provide 80G + MoA showing devotional + welfare scope.

## Closes

R-Q1-F-003 agent portion. Founder action closes item end-to-end via KPI flip.
