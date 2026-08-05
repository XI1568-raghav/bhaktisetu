# Store Owner Role Revamp — Research Report + Plan

**Role:** Store owner + dashboard
**Date:** 2026-08-05
**Status:** Phase 1 built (this PR) · Phase 2+ planned
**Research basis:** 4-agent scan (2 codebase + 2 market) — preserved in session.

---

## 1. Current store-owner state (from codebase scan)

**Surprisingly solid portal:** `/store-admin` with Dashboard (revenue cards + stats + recent orders + top products), Products CRUD, Orders (7-state status flow + history), Reviews, Revenue, Messages. Order API has server-authoritative pricing, atomic stock decrement, transition table, status history, idempotency.

**The gaps (all with file:line):**
- **Take rate**: `StoreProfile.commission` default **0.20 (20% platform / 80% owner)** — but THREE conflicting stories: schema 20%, `pricing.ts` advertises 25/15/12/8% by plan (never read), `store-economics.md` promises category-tiered 15-30% (code doesn't exist). Runtime = flat 20%.
- **COD + manual-confirm orders leaked commissions** — commission only wrote on Razorpay-verify; COD and admin manual payment-confirm flipped to CONFIRMED with NO Commission row.
- **Checkout shipped to FAKE addresses** — `SAVED_ADDRESSES` = 2 hardcoded fake rows (Koramangala/Whitefield); every order went to a fake address. "Add New Address" = dead button.
- **"Load More Products" dead button** — full catalog already fetched, button had nothing to load.
- **Tracking number**: backend `trackingNumber` field exists but the orders UI never collected it → customers never got a tracking ref.
- **Medusa NOT wired** — public `/store` reads seed data; store-owner CRUD writes to `store_products` table but those products never surface on `/store`. Two disconnected catalogs: customers can only SEE seed, only BUY owner products.
- **No store payout** — Commission sits PENDING forever; no payout job, no Razorpay Route. Docs promise T+7 UPI payouts that don't exist.
- `settings/earnings` page fully mock (not linked from /store-admin).

---

## 2. What the market does (from competitor scan)

**KEY STRUCTURAL FINDING:** None of the 6 spiritual players (Sri Mandir, VAMA Mall, AstroMall, PujaNPujari, Isha Life) run a third-party seller marketplace — **all are first-party inventory.** Darshya's seller marketplace is **differentiated**; take-rate comparables are Amazon/Flipkart.

- **Amazon India**: referral 5-20% (Home/Kitchen 10-15%, Grocery 5%) + closing fee ₹1+ + shipping ₹37/item + 18% GST on fees + 1% TCS → **effective ~20-30% all-in**. Weekly T+7 payout.
- **Flipkart**: commission 2-25% (fashion jewelry 15-25% — where spiritual jewelry sits) + fixed ₹5-30 + 2% collection + shipping + GST. T+7 payout.
- **AstroTalk Store** (first-party): ₹1 Cr DAILY GMV, ₹140 Cr revenue 2025, lab-cert gemstones + energization as premium trust signals.
- **Trust signals drive premium**: lab certs (IGI-GTL, GIA), rudraksha X-ray, "Nepal Origin" → ₹699→₹65,999 ladder; "Temple Blessed/Siddh/Consecrated" energization = 2-3x without per-unit lab cost.
- **COD universal**, returns restrictive-by-default (7-day damage-only, seal-open exempt).

**Verdict for Darshya's 20% take:** competitive — below fashion-jewelry's 25%, within Home/Kitchen 10-15% + the closing/shipping/GST stack that pushes effective take to 20-30%. **Keep 20%, add payout + trust signals + COD commission integrity to win sellers.**

---

## 3. Shipped in Phase 1 (this PR)

| Change | Why (research) |
|---|---|
| **Fixed COD/manual commission leak** (`store-commission.service` + write on CONFIRMED) | COD + manual orders earned nothing before — seller trust + revenue integrity |
| **Checkout loads real addresses** (`/users/me/addresses`) + empty-state → /profile | Orders were shipping to fake Koramangala/Whitefield addresses |
| **"Add New Address" → /profile** | Was a dead button |
| **Removed dead "Load More Products"** → honest catalog-count note | Dead CTA erodes trust |
| **Tracking number input on SHIPPED** | Backend field existed, UI never collected — customers get tracking ref now |

**Tests:** 4 store-revamp web guards green; API + web tsc clean.

---

## 4. Phase 2+ (planned, not yet built)

| Priority | Feature | Research anchor |
|---|---|---|
| P1 | **Unify the two catalogs** — surface store-owner `store_products` on public `/store` (currently seed-only; owner products invisible) | the core broken link |
| P1 | **`StorePayout` model + T+7 weekly payout job** (KYC/GSTIN-gated) | Amazon/Flipkart T+7 is table stakes; docs promise it |
| P2 | **Certification/energization badges** (lab cert upload, X-ray flag, "Temple Blessed" video proof) on product + PDP | 2-3x premium lever across all players |
| P2 | **Multi-image gallery + image upload** (single URL string today) | standard e-comm |
| P2 | **Festival-combo/kit tooling** (Sawan/Diwali/Navratri spikes) | combos are the best-sellers |
| P3 | **Courier integration** (Shiprocket/Delhivery) — AWB, label, rate quote, pickup | "shipping" is just a status flip today |
| P3 | **Item-level settlement report** (commission/fixed/collection/shipping/GST/TCS line items) | sellers expect fee transparency |
| P3 | Reconcile take-rate stories: surface the 20% flat rate honestly, or implement plan/category tiers | 3 conflicting stories today |

---

## 5. Success metrics

- **Catalog unification**: store-owner products visible + buyable on `/store`
- **Payout live**: T+7 weekly, Commission → PAID lifecycle working
- **COD commission integrity**: 100% of confirmed orders have a Commission row
- **Take-rate competitiveness**: 20% (below fashion-jewelry 25%, within category norm)
- **Seller NPS**: no work-starvation (vs AstroTalk grievances), transparent earnings

---

*Pattern: research → plan → build → E2E, per role. Next: **Wellness instructor**, then Gau Seva, Temple manager.*
