# Devotee Role Revamp — Research Report + Plan

**Role:** Devotee + dashboard
**Date:** 2026-08-05
**Status:** Phase 1 shipped (PR #226) · Phase 2+ planned
**Research basis:** 4-agent scan (1 codebase + 2 market + 1 codebase-gaps partially stalled) — preserved in session.

---

## 1. Current devotee state (from codebase scan)

**Real / API-backed:** greeting header, Total Bookings stat, Subscription card, Recent Bookings list, `PujaRecommendationWidget` (POST /ai/recommend-puja). Features puja booking, astrology consult, store, wellness, gau seva, donations, books/sanskrit, messages, referrals, subscription all exist and mostly functional.

**MOCK / broken (the problems):**
- **4 dashboard widgets are hardcoded demo arrays** that look live: Darshan History, Saved Temples, Chat History, Store Orders (`dashboard/page.tsx:390-510`).
- **Digest unsubscribe link 404s** (`/account/digest/unsubscribe` referenced in every weekly digest email, no page) AND nothing wrote opt-outs to `WeeklyDigestOptOut` (cron reads it, nothing wrote) → unsubscribing did nothing.
- **Address management**: backend GET/POST/PATCH/DELETE `/users/me/addresses` exists but **no UI** on /profile.
- **Daily panchang push no-ops** (`tickPanchangBlast` — push subs stored in-memory `subsByUser` Map, lost on restart; no persistent pushSubscription table).
- **No first-run personalization wizard** — gotra/rashi collected only at booking (which research says is correct), but dashboard doesn't use rashi for anything until profile is filled.
- Profile gaps: avatar upload stub, no WhatsApp opt-in toggle, no notification prefs, sub-pages (yatra-bookings, consultations) not linked.

---

## 2. What the market does (from competitor scan)

**Sri Mandir** (the leader): home = your OWN virtual temple (daily ritual loop: diya, flowers, aarti) + Punya Mudras loyalty currency + daily streak. Daily bhajans, full panchang, rashifal, library. **55% six-month retention, 3.5M MAU.** No devotee subscription — transactional + loyalty.
**VAMA**: festival-contextual home (reskins for Sawan), recommended puja/chadhava carousels with social proof, WhatsApp video delivery.
**AstroTalk**: live astrologer roster + free daily horoscope by rashi + wallet. First-chat-free activation.
**Engagement research (Duolingo/Netflix/Headspace):**
- **7-day streak users 2.4x more likely to return**; streak wager +14% D7. **Sankalp/vrat pledge is a culturally-native streak wager** — productize it.
- **Honest streak** (increments only on completed practice, not app-open).
- **Netflix rows**: Continue Watching (sunk progress, highest CTR) → panchang → because-you → festival countdown → discovery.
- **Push**: 1/day cap, morning puja-time anchor, streak-at-risk loss-protection is highest-converting. WhatsApp for big moments (98% open rate India).
- **Devotional apps out-retain wellness apps** (Sri Mandir 55% @6mo vs Headspace 4.7% @30d) because rituals recur through the religious calendar.

---

## 3. Shipped in Phase 1 (PR #226)

| Change | Why (research) |
|---|---|
| **DevoteeTodaySection** replaces 4 mock widgets | Mock data erodes trust; live data drives the daily-open habit |
| → Today's Panchang strip (city-aware) | Table stakes in every leading app; zero-friction daily glance |
| → Rashi daily horoscope card | Free daily-open hook; personalization by moon sign |
| → Continue Reading resume card | Netflix "Continue Watching" = highest-CTR row; sunk progress |
| → Real store orders | Replaces mock; real transaction loop |
| **Digest unsubscribe endpoint + page** | Email link 404'd + opt-outs never recorded — legal/trust fix |
| **AddressManager on /profile** | Backend existed, no UI; needed for prasad/at-home delivery |

**Tests:** devotee-today-section guards (mocks gone + live fetches + rashi personalization). Web + API tsc clean.

---

## 4. Phase 2+ (planned, not yet built)

| Priority | Feature | Research anchor |
|---|---|---|
| P1 | **Sankalp streak** (honest, completed-practice-gated) + milestone celebrations (7/21/40/108) + 1-2 grace days | Duolingo 2.4x @7-day, wager +14%, freeze research |
| P1 | **Persistent push subscriptions** (DB table) → revive daily panchang push at user's puja time | panchang blast currently no-ops; morning-anchor push data |
| P2 | **WhatsApp opt-in toggle** on /profile + use for festival-eve/booking moments | 98% open rate; WhatsApp-first India |
| P2 | **Festival countdown card** on dashboard | time-bound return trigger before every festival |
| P2 | **"Because you…" recommendation rows** with explanation labels | Netflix trust-building |
| P3 | **Punya-style loyalty currency** for daily attendance/rituals + referrals | Sri Mandir Punya Mudras (retention engine) |
| P3 | First-run deity personalization (ishta devta → artwork/content) | Sri Mandir virtual temple + Netflix artwork personalization |
| P3 | Notification prefs center (1/day cap, deep-links) | 46% disable after irrelevant pushes |

---

## 5. Success metrics

- **D7 retention** lift (target: streak users 2.4x return, Duolingo anchor)
- **DAU/MAU ratio** (Duolingo 44% is world-class; devotional should beat wellness ~5% D30)
- **Dashboard daily-open** via panchang/horoscope glance
- **Push opt-in rate** (target ≥60% with after-first-ritual soft-ask)
- Digest unsubscribe loop functional (0 404s)

---

*Next role: **Astrologer + dashboard** (research already running), then Store owner, Wellness instructor, Gau Seva, Temple manager — same research→plan→build→E2E pattern each.*
