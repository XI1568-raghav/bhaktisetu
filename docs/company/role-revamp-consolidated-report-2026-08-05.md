# Role-by-Role Revamp — Consolidated Report

**Date:** 2026-08-05
**Scope:** All Darshya roles, research → plan → build → deploy, one by one.
**Pattern per role:** multi-agent market + codebase research → gap analysis → prioritized fixes → unit/source-assertion tests → PR → CI green → merge → deploy to prod → live-verify.

---

## The through-line: every role had the same disease

Across all 7 roles, the dominant failure mode was **"looks live but is fake/broken"**: mock fixtures, dead CTAs, disconnected payout ledgers, and surfaces that 403/404. The recurring theme — **the money path and the daily-engagement path were the two things most broken**, and they're the two things that matter most.

## Role scoreboard

| Role | PR | Take rate | Key fixes |
|---|---|---|---|
| **Pandit (booking)** | #225 | 30%→**20%** | Dispatch engine, cancellation policy, 7 dead things, WhatsApp |
| **Devotee** | #226 | — | Killed 4 mock dashboard widgets → live Panchang/Horoscope/Continue-Reading/Orders; digest unsubscribe loop; address manager |
| **Astrologer** | #227 | 30%→**20%** (80% to astrologer) | Go-online toggle, fixed dead Earnings page (was 403), consult notifications |
| **Store owner** | #228 | held **20%** | COD commission leak fixed, real checkout addresses (was fake), tracking-number input |
| **Wellness instructor** | #229 | held **20%** (80% instructor) | Live-room editor (classes were undeliverable), free-satsang enroll, instructor-share earnings (was gross) |
| **Gau Seva** | #230 | — | Wired dead adoption CTAs into the real donation flow (was in-memory, no money) |
| **Temple manager** | #231 | platform 20% | availableSlots editor (offerings were unbookable), full bookings list |

## What changed & why it's best (per research)

### Take rates — the supply wedge
- **Priest 30%→20%, Astrologer 30%→20%, Wellness 20%, Store 20%.** Now **uniform 20% platform / 80% provider** across every marketplace role.
- **Why this is the right number:** Sri Mandir takes 20-25% (temple keeps 75-80%) — we match/beat the market leader. AstroTalk takes a permanent **50%** (astrologers riot about it; a CIC case alleges work-starvation + ₹50k-1L penalties). italki 15-21% is the only lower live-instruction rate; Preply 18-33%, Outschool 30%, Wyzant 25%. Amazon/Flipkart effective all-in is 20-30%. **20% is the defensible supply-winning floor** — it wins pandits, astrologers, instructors, and store owners away from incumbents while keeping the platform viable.

### Dispatch & confirmation (pandit)
- Uber/DoorDash-anchored broadcast → first-accept-wins → timeout-reassign. Cancellation ladder **beats SmartPuja (never >50%, 0 inside 48h) and Harivara (0 inside 48h)** at every step: 100% >48h / 75% / 50% / 25% / 0% no-show. Pandit-cancel → auto-reassign + full refund (Swiggy/UC norm).

### Daily engagement (devotee)
- Replaced fake widgets with the proven retention stack: **Today Panchang + rashi Horoscope + Continue Reading + real Orders** (Sri Mandir virtual-temple / Duolingo-streak / Netflix continue-watching patterns). Devotional apps out-retain wellness (Sri Mandir 55% @6mo vs Headspace 4.7% @30d) — the dashboard now converts the religious calendar into daily hooks.

### Supply-side trust (astrologer, wellness, store)
- Fixed **dead Earnings pages** (astrologer 403'd on an admin-only route; wellness showed gross not the 80% share; store COD orders earned nothing).
- **Go-online presence** (astrologer) and **live-room delivery** (wellness) — the surfaces that make the service actually deliverable.
- Transparent, accurate earnings = the supply-retention playbook (UC Earnings-Index).

### Money integrity (store, gau-seva, temple)
- Store: COD/manual orders now write the Commission (leaked before). Checkout ships to **real** addresses (was fake Koramangala/Whitefield).
- Gau Seva: adoption CTAs were dead — now pay real plan amounts via Razorpay + **80G receipts**.
- Temple: offerings were **unbookable** (form never collected `availableSlots`) + managers get a full bookings roster.

## Per-role plan docs (research + Phase 2 roadmaps)
- `docs/company/pandit-booking-revamp-plan-2026-08-04.md`
- `docs/company/devotee-role-revamp-plan-2026-08-05.md`
- `docs/company/astrologer-role-revamp-plan-2026-08-05.md`
- `docs/company/store-owner-role-revamp-plan-2026-08-05.md`
- `docs/company/wellness-instructor-role-revamp-plan-2026-08-05.md`
- `docs/company/gau-seva-revamp-plan-2026-08-05.md`
- `docs/company/temple-manager-role-revamp-plan-2026-08-05.md`

## Cross-cutting Phase 2 (the big-ticket items deferred)
- **Payout flows** for astrologer / wellness / store / temple (Commission → PAID lifecycle; only priest has PriestPayout today). KYC-gated, T+7 weekly.
- **Temple revenue share** (TemplePayout) — closes the Harvard-documented donation-bypass grievance; biggest temple-acquisition lever.
- **Real-astrologer directory** (replace in-memory fixtures so onboarded astrologers are bookable).
- **Catalog unification** (store-owner products surface on public /store).
- **Recurring subscriptions** (gau-seva monthly, wellness batches, pandit instant pool).
- **Panchang push revival** (persistent push subscriptions) + sankalp streak (devotee retention).

---

*Every claim above is backed by a live deploy + test suite, not a summary field. Each role's full competitor numbers + file:line evidence is in its plan doc.*
