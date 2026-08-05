# Wellness Instructor Role Revamp — Research Report + Plan

**Role:** Wellness instructor + dashboard
**Date:** 2026-08-05
**Status:** Phase 1 built (this PR) · Phase 2+ planned
**Research basis:** 4-agent scan (2 codebase + 2 market) — preserved in session.

---

## 1. Current wellness-instructor state (from codebase scan)

**Decent CRUD:** `/wellness-portal` with session create/edit/delete (yoga/meditation/vipassana/pranayama), capacity enforcement, Razorpay enroll + HMAC verify, students list. Take rate = env `WELLNESS_PLATFORM_COMMISSION` default **0.20 (80% instructor)** — already competitive.

**The gaps (all with file:line):**
- **Live-room URL endpoint existed but NO UI** — `PATCH /sessions/:id/room` was curl-only; an instructor literally could not deliver the live class (no way to set the Jitsi room).
- **No free-satsang / donation model** — every session required payment; the research says free daily satsang is the #1 top-of-funnel (Isha/AoL model).
- **Dashboard showed GROSS earnings** (full session price) not the instructor's 80% share — overstated what they'd be paid; inconsistent with the Commission ledger.
- **Devotee-side booking flow not wired to UI** — the public instructor catalog is 8 hardcoded static instructors with a waitlist lead-capture form; the real `/wellness/sessions/:id/enroll` has no caller.
- **Attendance marking is a stub** — ATTENDED status + attendedAt column exist but nothing writes them (no mark-attendance endpoint/UI).
- **No recorded/video library, no recurrence (RRULE)** — every session is a one-shot live group class.
- No WellnessPayout model (Commission sits PENDING forever).

---

## 2. What the market does (from competitor scan)

**Take rates (the supply lever):**
- Preply: 33%→18% decaying; Wyzant 25% flat; Outschool 30% fixed; **italki 15-21% (supply favorite)**; UrbanPro/TeacherOn 0% (lead-fee); Udemy keeps 63-75% on recorded.
- **Supply-winning ceiling for 1:1 live instruction = 20-25% flat; sub-20% is the magnet.**
- Darshya at **20%** is already at the supply-favorable edge — keep it, advertise it.

**Pricing sweet spots (devotional wellness should undercut fitness-yoga):**
- Habuild ₹3,999/yr (~₹333/mo) live group; cult.fit ~₹1,499/yr street.
- India 1:1 online ₹400-800/session; group ₹1,500-3,000/mo per student.
- **Free daily satsang = top-of-funnel** (Isha/AoL donation-model); monetize structured courses ₹99-299/mo + 1:1 ₹200-500.
- **Live cohort > recorded** for India mass market (Habuild ₹100 Cr, live 3x attendance); group > 1:1 per instructor-hour (Outschool 6x at 6 students).

**Instructor onboarding:** RYT-200 / YCB Level-1 min, demo-class audition, verified reviews.

**Whitespace:** NO transparent-commission India wellness 1:1/group marketplace exists (Vedantu/Unacademy salaried, cult.fit employed, TeacherOn 0% lead-gen). Darshya's transparent 20% + instant UPI payout = the supply-attractive offer.

---

## 3. Shipped in Phase 1 (this PR)

| Change | Why (research) |
|---|---|
| **Live-room URL editor on sessions page** (wired `/sessions/:id/room`) | The endpoint existed but no UI — instructor couldn't deliver the live class. Critical fix. |
| **Free-satsang enroll** (`isFree` flag + price-0 instant-PAID enroll, no payment) | Free daily satsang = #1 top-of-funnel (Isha/AoL). Unblocks donation-model funnel. |
| **Dashboard shows instructor 80% share** (was gross) + "You keep 80%" label | Was overstating earnings vs the Commission ledger — trust + accuracy. |

**Tests:** 3 wellness-revamp web guards green; API + web tsc clean.

---

## 4. Phase 2+ (planned, not yet built)

| Priority | Feature | Research anchor |
|---|---|---|
| P1 | **Wire devotee booking UI** — replace the 8-static-instructor waitlist catalog with real sessions + enroll (the real enroll flow has no caller) | the core broken link |
| P1 | **Attendance marking** (mark-ATTENDED endpoint + instructor check-in UI) | status exists, nothing writes it |
| P1 | **WellnessPayout model + weekly UPI payout** (KYC-gated) | Preply fast self-serve payout = supply gold standard |
| P2 | **Recurring weekly batches (RRULE)** + group-class scheduling as first-class | Habuild/Sarva live-cohort wins India |
| P2 | **Per-session roster view** (who enrolled in session X) | portal gap |
| P2 | **1:1 session type** (capacity=1 sugar + premium pricing tier) | 1:1 ₹400-800/session premium |
| P3 | **Recorded library** + hybrid (3 live + 4 recorded/wk) | Sarva premium pattern |
| P3 | **Funnel analytics** (profile views → trials → enrollments, Preply Insights-style) | portal success driver |

---

## 5. Success metrics

- **Take rate**: 20% platform / 80% instructor — supply-favorable (italki 15-21% is the only lower)
- **Live-room deliverability**: 100% of sessions have a room set (was 0% — no UI)
- **Free-satsang funnel**: free → paid course conversion
- **Fill rate**: group-class enrollment fill (the controlling variable, not instructor availability)
- **Payout live**: Commission → PAID lifecycle working

---

*Pattern: research → plan → build → E2E, per role. Next: **Gau Seva**, then Temple manager.*
