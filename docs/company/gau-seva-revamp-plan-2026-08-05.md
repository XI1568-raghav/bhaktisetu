# Gau Seva Revamp — Research Report + Plan

**Role:** Gau Seva (cow adoption / gau daan)
**Date:** 2026-08-05
**Status:** Phase 1 built (this PR) · Phase 2+ planned
**Research basis:** competitor norms (ISKCON/GoSeva/Sri Mandir gau-seva, animal-sponsorship patterns) + codebase scan. The parallel research workflow (wf_b062ef09) stalled — synthesized inline from codebase findings + established market norms instead.

---

## 1. Current gau-seva state (from codebase scan)

**Has a working foundation:**
- `/gaushala` landing + `/gaushala/[id]` cow detail (cow data, health, monthly updates) — but **in-memory fixture cows** (`GAUSHALAS`/`COWS`/`ADOPTION_PLANS` arrays), not DB.
- `POST /gaushala/adopt` — writes to an **in-memory `adoptionStore` Map**, dies on redeploy, **NO payment**.
- `/gaushala-portal` manager dashboard + cows + donations + volunteers + profile (real).
- **Working Razorpay donations flow** (`/donations` → `/donations/create-order` + verify + **80G PDF receipt**) — this is the real money path.
- Cow adoption plans: Gau Seva ₹51/day, Gau Palan ₹3,000/mo, Gau Raksha ₹30,000/yr, Gau Daan ₹2,25,000 lifetime.

**The gaps:**
- **Adoption plan CTAs are DEAD** — plan buttons on `/gaushala` and `/gaushala/[id]` are `<button>` with **no onClick**. A devotee literally cannot start an adoption.
- **Adoption ≠ payment** — the `adopt` endpoint just flips an in-memory flag; no money moves, no Razorpay, no 80G.
- **Fixture data** — cows/gaushalas are hardcoded arrays, not the real `cows`/`volunteers`/`cow_health_records` DB tables (which exist but aren't surfaced publicly).
- No recurring/monthly billing (the ₹51/day, ₹3,000/mo plans imply recurrence that doesn't exist).

---

## 2. Market norms (gau daan / animal sponsorship)

- **Cow adoption pricing**: ₹51-101/day feeding, ₹2,500-3,500/month full care, ₹25,000-50,000/year, ₹1-2.5L lifetime — Darshya's grid matches market.
- **What sponsors expect**: monthly photo/video updates, adoption certificate, visit-anytime, name on donor wall, health reports — Darshya's plan copy already promises these.
- **Trust = recurring revenue**: the recurring donor keeps giving when they SEE their cow (photo/video/certificate). Sri Mandir/VAMA sell Gau Seva as a puja-checkout add-on.
- **80G tax exemption** is the India donation driver — Darshya's donation flow already issues 80G receipts.
- **Recurring monthly** is the retention model (animal-sponsorship: monthly feed sponsorship beats one-time).

**Verdict:** the highest-leverage fix is to make adoption actually take payment via the existing working donations flow (with planId-prefilled amounts + 80G), rather than build a parallel adoption-payment system.

---

## 3. Shipped in Phase 1 (this PR)

| Change | Why (research) |
|---|---|
| **Cow detail plan buttons → Links into `/donations` with `planId`** (were dead `<button>`) | A devotee can now actually start an adoption — the dead CTA was the #1 blocker |
| **`/donations` maps `planId` → plan amount + `DonationForm` accepts `planAmount` prefill** | Devotee pays the real plan price (₹51/₹3,000/₹30,000/₹2,25,000) via Razorpay + gets 80G — the working money path |

**Tests:** 3 gau-seva-revamp web guards green; full web suite 219 green; web tsc clean.

---

## 4. Phase 2+ (planned, not yet built)

| Priority | Feature | Research anchor |
|---|---|---|
| P1 | **Surface real DB cows publicly** — `/gaushala` + `/gaushala/[id]` read the real `cows` table (manager-added) instead of fixture arrays | the fixture/DB disconnect |
| P1 | **Recurring monthly subscription** for ₹51/day + ₹3,000/mo plans (Razorpay subscriptions / mandate) | monthly feed = retention model |
| P2 | **Adoption records in DB** (`cow_adoptions` table) linking donation → cow → sponsor, so `/my-adoptions` + monthly updates are real | adoption is in-memory today |
| P2 | **Adoption certificate PDF** (like 80G receipt) + donor wall | sponsors expect it |
| P2 | **Monthly update cadence** (photo/video per adopted cow) — manager upload → sponsor notification | the recurring-retention hook |
| P3 | **Live cow cam / "watch your cow"** stream | top trust signal for remote sponsors |
| P3 | **Gau Seva as puja-checkout add-on** (like Sri Mandir's Gau Seva/Deep Daan add-ons) | incremental donation attach |

---

## 5. Success metrics

- **Adoption funnel works end-to-end**: plan click → donation payment → 80G receipt (was: dead button)
- **Recurring donors**: % of adoptions that are monthly vs one-time (target: monthly feed model)
- **Update engagement**: monthly photo/video opens drive renewal
- **80G issuance**: 100% of donations get receipts

---

*Pattern: research → plan → build → E2E, per role. Last role: **Temple manager**.*
