# Temple Manager Role Revamp — Research Report + Plan

**Role:** Temple manager + dashboard
**Date:** 2026-08-05
**Status:** Phase 1 built (this PR) · Phase 2+ planned
**Research basis:** 4-agent scan (2 codebase + 2 market) — preserved in session.

---

## 1. Current temple-manager state (from codebase scan)

**Has working CRUD:** `/temple-portal` (Dashboard + Pujas CRUD + Donations + Darshan + Subscription). Puja offering CRUD is fully wired (priceOverride, nriPrice, assignedPriestId, maxBookingsPerSlot).

**The gaps (all with file:line):**
- **`availableSlots` editor MISSING from the form** — API accepted it, form omitted it → every offering created with an **empty slot list → nothing bookable**. The single most damaging bug (offerings can't be booked).
- **No bookings list** — manager only sees dashboard top-10; no list/filter/status/roster for their temple's seva calendar.
- **No temple revenue share** — split is priest (80%) vs platform (20%) only; **temple gets nothing** (no `TemplePayout` model, donations have no commission ledger).
- **Payouts page is an empty stub** — `CommissionsPanel mode='me'` returns rows keyed `providerId=user.id`, but the writer keys `providerId=priestId` → temple manager sees an empty list.
- **TemplePriest is seed-only** — no route to add/remove/list the temple's priest roster; priest picker is global, not roster-scoped.
- **No Temple↔User FK** — manager resolved by string-matching `TempleProfile.templeName == Temple.name` (fragile).
- Recent Donations card is hardcoded stub.

---

## 2. What the market does (from competitor scan)

**Temple ERPs (3ioSetu 450+ temples incl. Siddhivinayak/Puri, Sankalpa 58+ temples/₹100Cr+/yr):** seva/puja booking with sankalp capture, donation mgmt with instant 80G/WhatsApp receipts + **Form 10BD/10BE one-click export** (now table stakes), devotee CRM, priest scheduling with panchangam/muhurat, samagri/prasad inventory with stock deduction, double-entry accounting + Tally sync, payment-gateway reconciliation. **Center of gravity = the booking roster.**

**Big-temple pricing (reference for the seva catalog):**
- Siddhivinayak: ₹501 (20min) → ₹5,001 Satyanarayan → ₹1,00,000 Atharvashirsha Havan (5hrs, 25-30 persons), each with duration/persons/prasad/reporting-time.
- Kashi: ₹300 Sugam Darshan, ₹450-2,100 Rudrabhishek incl. video-conference remote.
- TTD: ₹300 Special Entry (sells out in minutes), ₹10,500 SRIVANI VIP, Electronic Dip lottery for high-demand sevas.

**Partnership economics (the temple value prop):**
- **Sri Mandir takes 20-25%, temple keeps 75-80%**; temples see **15-30% revenue uplift**; diaspora ARPU ₹7,000 vs ₹600-800 domestic (10x); 70+ temples → 500 via Project Heritage.
- **What convinces temples:** incremental year-round income, 15-30% uplift, NRI reach, zero capex, video-proof transparency.
- **The #1 documented grievance (Harvard): donation bypass** — platform pays priests directly, cutting out temple admins (some unaware online pujas happen at their temple). **A dashboard that pays BOTH priest AND temple administration directly answers this.**

---

## 3. Shipped in Phase 1 (this PR)

| Change | Why (research) |
|---|---|
| **`availableSlots` editor on the puja form** (create + edit, comma-separated daily slots) | Offerings were created with empty slots → **nothing bookable**. Most damaging bug fixed. |
| **GET /temple-portal/bookings** (all bookings, status/date filters) + **Bookings page + sidebar link** | Manager had top-10 only; the booking roster is the center of every temple ERP. |

**Tests:** 4 temple-revamp web guards green; API + web tsc clean.

---

## 4. Phase 2+ (planned, not yet built)

| Priority | Feature | Research anchor |
|---|---|---|
| P1 | **Temple revenue share** — `TemplePayout`/commission model so the temple (not just priest+platform) gets a cut; closes the donation-bypass grievance | Sri Mandir pays temple 75-80%; Harvard donation-bypass |
| P1 | **TemplePriest roster management** (add/remove/list, roster-scoped priest picker) | seed-only today; priest scheduling is a core ERP module |
| P2 | **Donations with temple 80G + Form 10BD/10BE export** | table stakes in every temple ERP |
| P2 | **Seva catalog fields** (duration, persons, prasad, reporting-time) like Siddhivinayak | the clean seva-catalogue schema |
| P2 | **Real Temple↔User FK** (replace string name-match) + org-gating on all writes | fragile identity today |
| P3 | **Slot/quota engine** (release windows, blackout days, lottery for high-demand) | TTD/Kashi patterns |
| P3 | **Temple analytics** (footfall, donation income, seva popularity) + accounting/Tally export + reconciliation | ERP dashboards |

---

## 5. Success metrics

- **Offerings bookable**: 100% of offerings have ≥1 available slot (was ~0% — the form never collected slots)
- **Booking roster usable**: manager can list/filter all their temple's bookings
- **Temple share modeled**: temple gets a transparent cut (donation-bypass grievance closed)
- **Priest roster self-service**: manager adds/removes priests without admin

---

*Pattern: research → plan → build → E2E, per role. This completes the role sweep.*
