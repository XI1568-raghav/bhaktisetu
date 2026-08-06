# Cross-Cutting Phase 2 — Batch 2 Report

**Date:** 2026-08-06
**Status:** Shipped + live on prod (PR #235) · migration applied
**Research basis:** 5-agent scan (temple partnership economics, recurring-payment India rails, push-notification persistence, astrologer-directory + store-catalog disconnects).

---

## What shipped (all verified live)

| Item | What | Verified on prod |
|---|---|---|
| **Temple revenue share** | `TemplePayout` model — on booking confirm, the temple administration gets a cut (default 5%, `TEMPLE_SHARE_RATE`). `GET /temple-portal/payouts` + rebuilt payouts page (was an empty stub — no Commission is ever keyed to a temple). Closes the Harvard "donation bypass" grievance. | `temple_payouts` table EXISTS; `/temple-portal/payouts` → 401 (live) |
| **Panchang push revival** | `PushSubscription` persisted table (was in-memory Map lost on restart — the daily panchang blast no-opped with "no push subscription model"). subscribe/unsubscribe/notifyUser now use the DB; `tickPanchangBlast` fans out today's tithi/nakshatra/festivals to opted-in subs at 5am IST. | `push_subscriptions` table EXISTS; `/notifications/subscribe` → 401 (live) |
| **Recurring devotional subscriptions** | `recurring.service` + `/recurring/plans|subscribe|my`. Plans priced ≤₹15,000 for UPI Autopay no-PIN: Gau feed ₹51/day, ₹3,000/mo; wellness batch ₹299/mo; temple seva ₹501/mo. Razorpay mandate + webhooks = Phase 2. | `/recurring/plans` → 200 with 4 plans; `/subscribe` → 401 (live) |
| **Live astrologer directory** | `GET /astrology/astrologers/live` — real approved `AstrologerProfile` rows + go-online presence badge (was a 15-row mock fixture). | 200, **3 live astrologers** (real, source:live) |
| **Live store catalog** | `GET /store/products/live` — store-owner `store_products` surfaced publicly (was seed-only). | 200 (0 products — no owner products seeded yet) |

## Why each is best (per research)

- **Temple share**: Sri Mandir pays temples 75-80% and sees 15-30% uplift; the #1 documented temple grievance (Harvard "Internet Pujas") is platforms paying priests directly and cutting out temple admins. Paying the temple administration directly is the temple-acquisition wedge.
- **Recurring ≤₹15,000**: UPI Autopay no-PIN cap is ₹15,000/txn (donations/wellness don't qualify for the ₹1L enhanced tier). Recurring donors retain 78-80%/yr (vs 32% one-time), ~2x LTV. Razorpay dunning = T+3 retry; RBI mandates ≥24h pre-debit notification.
- **Panchang push**: daily-content hooks are the devotional DAU engine (Sri Mandir virtual-temple streak, YouVersion 19M single-day opens). Was structurally dead (in-memory subs) — now persisted.

## Migration note
Applied via `prisma migrate deploy` to prod (TLS-verified Prisma driver). The API needed a redeploy to boot against the new schema (client regen); both API + web deployed green.

## Phase 2 (deferred)
- **Razorpay Subscriptions mandate + webhooks** (activate on `subscription.authenticated`, charge on `.charged`, T+3 dunning, `.halted` recovery) — turns the recurring intent into actual recurring charges.
- **Astrologer directory full swap** — bind the booking flow to real AstrologerProfile (slug↔UUID map) so a booked astrologer is a real one (currently `/live` is read-only directory; booking still uses fixture).
- **Store PDP + buy-flow polish** for owner products (`/store/[id]` page, cart).
- **TemplePriest roster management** (add/remove/list) — still seed-only.
