# Astrologer Role Revamp — Research Report + Plan

**Role:** Astrologer + dashboard
**Date:** 2026-08-05
**Status:** Phase 1 built (this PR) · Phase 2+ planned
**Research basis:** 4-agent scan (2 codebase + 2 market) — preserved in session.

---

## 1. Current astrologer state (from codebase scan)

**The brutal finding:** Darshya's astrologer stack is **half-built on mock fixtures**, and the astrologer-facing surfaces are largely dead ends.

**Billing:** per-session prepaid minutes (₹50 floor), **30% platform / 70% astrologer** (hardcoded `COMMISSION_RATE = 0.3` in `consultation.ts:397`). Priest bookings already moved to 20/80 — astrologers were left at 30%.

**Critical gaps (all with file:line):**
- **No online/offline toggle** — `AstrologerProfile` has no `isOnline`; the only online flag is a hardcoded mock (`astrology.service.ts:17`). Devotees can't see who's available.
- **Devotees book MOCK astrologers** — the directory is an in-memory fixture (`astro_001…`), real onboarded `AstrologerProfile`s aren't bookable. Slug↔UUID mapping is a "deferred design pass."
- **Earnings page is DEAD** — it calls admin-only `/admin/commissions?providerId=me` → 403 for every real astrologer.
- **No astrologer notification on new consult** — zero `notifyUser`/push/WhatsApp on the consult lifecycle; they only find out by refreshing the portal.
- **Availability is decorative** — weekly JSON blob stored but never consulted by booking.
- **No payout flow** — no `AstrologerPayout` model, Commission sits PENDING forever, admin payout math is wrong (double-counts the cut → shows 21% of gross as "payout").
- **No queue/busy handling** — no overlap check; two devotees can prepay the same slot.
- **Consult list reads the broken in-memory sessions map**, not the paid Razorpay table (two disconnected systems).

---

## 2. What the market does (from competitor scan)

**AstroTalk (the incumbent, 85% share, ₹1,182cr FY25, IPO 2026):**
- **50% permanent cut** — the single biggest supply grievance.
- Rates: chat ₹10-20/min, call ₹20-35/min, video ₹40-60/min; astrologers rise from ₹0.10/min to ₹100+/min by rating.
- Astrologer keeps ₹12-28/min by tier → ₹15k-4L/month.
- **Rented visibility**: going offline a week collapses ranking/income. Alleged work-starvation (15-18hrs online for <₹100/day), arbitrary ₹50k-1L penalties, rating manipulation, CIC case. **No regulator/grievance framework exists.**
- First-5-min-free is the #1 conversion lever; prepaid wallet with real-time debit.

**AstroSage Varta**: astrologers **self-set 4 separate prices**, 45% cut (best incumbent split). **AstroYogi**: ₹12-400/min, ~45-55% cut.

**Supply-winning playbook (Urban Company)**: transparent earnings index, capped penalties, 100% of cancel fees to partner.

**The wedge for Darshya:** offer the **best split in the category (80% to astrologer vs AstroTalk's 50%)** + real earnings transparency + no work-starvation, to win supply from an incumbent with zero regulation and mounting grievances.

---

## 3. Shipped in Phase 1 (this PR)

| Change | Why (research) |
|---|---|
| **Take rate 30% → 20%** (`ASTROLOGER_PLATFORM_RATE = 0.2`, astrologer keeps **80%**) | Align with priest cut; **best major-platform split in India** (AstroTalk 50%, AstroSage 45%) — the supply wedge |
| **`/astrologer-portal/online` (POST+GET) + dashboard go-online toggle** | No presence existed; devotees couldn't see who's available. Uber/AstroTalk "go online" pattern. |
| **`/astrologer-portal/earnings` + rebuilt Earnings page** | The old page hit an admin-only route and 403'd — dead. Now shows real gross/cut/earnings + pending/paid. |
| **Astrologer + devotee notification on consult confirm** | There was zero astrologer ping before; they only saw bookings by refreshing. |
| `computeAstrologerSplit` + presence helpers + tests | Money math + presence must be exact |

**Tests:** 7 astrologer.service + 2 astrologer-revamp web guards. API + web tsc clean.

---

## 4. Phase 2+ (planned, not yet built)

| Priority | Feature | Research anchor |
|---|---|---|
| P1 | **Persist `isOnline`** (migration) + gate booking on presence + show Online/Busy on the devotee browse card with wait-ETA | AstroTalk card conversion drivers |
| P1 | **Real-astrologer directory** (replace in-memory fixture; slug↔UUID mapping) so onboarded astrologers are bookable | the core broken link |
| P1 | **`AstrologerPayout` model + payout flow** (KYC-gated, like priest) + fix admin double-count math | no payout exists end-to-end |
| P2 | **Consult busy/overlap guard + queue/waitlist** with notify-when-free | AstroYogi queue + ETA |
| P2 | **Free first-5-min** trial wired into the paid flow (proven #1 conversion lever) | AstroTalk founder-attributed |
| P2 | **Wire consult billing to read the astrologer's DB rate** (currently reads mock rate) + per-mode pricing (chat/call/video like AstroSage) | self-set pricing wins supply |
| P3 | **Prepaid wallet + real-time per-minute debit + low-balance recharge prompt** | universal category pattern |
| P3 | **Earnings transparency page** (UC Earnings-Index style) + festival bonuses + featured-profile rewards | supply retention playbook |
| P3 | Fix the two disconnected consult systems (portal list reads paid table, not in-memory sessions) | data integrity |

---

## 5. Success metrics

- **Astrologer supply**: onboarded approved astrologers (target: win from AstroTalk's 45k pool via 80% split)
- **Online utilization**: % of online time in paid consults (beginner 40-60%, expert 70-90% anchors)
- **Earnings page live** (was 403-dead → now functional)
- **Take-rate competitiveness**: 80% astrologer share = best in category

---

*Pattern: research → plan → build → E2E, per role. Next: **Store owner**, then Wellness instructor, Gau Seva, Temple manager.*
