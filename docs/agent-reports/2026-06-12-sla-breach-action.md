# SLA Breach Action — 2026-06-12

> **R-Q1-CS-003 founder-action doc.** Ready-to-paste WhatsApp + Email drafts for 5 overdue puja bookings (2026-05-04 batch). 4 of 5 share priest `821edbe5` → repeat-breach investigation required.
>
> **Run script first** to refresh data:
> ```bash
> ADMIN_OPS_TOKEN=$ADMIN_OPS_TOKEN API_URL=https://api.darshya.online \
>   pnpm tsx apps/api/scripts/ops/sla-breach-outreach.ts
> ```
> CSV will land at `docs/agent-reports/sla-breach-2026-06-12.csv`. Cross-reference bookingCode below.
>
> **Hard rules**: no auto-sends. Founder pastes manually from WhatsApp Business app + Gmail. Drafts use placeholder `<name>` / `<e164>` / `<email>` — fill from admin panel before paste.

---

## Section A — Per-booking outreach drafts (5 bookings)

### Booking 1: BS-20260427-K3HSD (priest 821edbe5)

```
Devotee: <name>
Phone (WA): <e164>
Email: <email>
Amount: ₹501
Scheduled: 2026-05-04
Days overdue: 39
Priest: 821edbe5 (REPEAT BREACH — also assigned to bookings 2/3/4)
```

**--- WhatsApp (EN) ---**

```
Namaste <name> ji, Bhaktisetu founder here. Your puja booking (BS-20260427-K3HSD) for 4 May was not completed and we owe you an apology. Two options:
(a) Reschedule within 7 days with verified video proof, OR
(b) Full refund of ₹501 + ₹100 wallet credit for the inconvenience.
Reply A or B. — <founder name>
```

**--- WhatsApp (HI) ---**

```
नमस्ते <name> जी, मैं Bhaktisetu का संस्थापक हूँ। आपकी पूजा बुकिंग (BS-20260427-K3HSD, 4 मई) पूरी नहीं हो सकी, इसके लिए क्षमा करें। दो विकल्प:
(a) 7 दिन में पुनर्निर्धारण + वीडियो प्रमाण, या
(b) पूरा रिफंड ₹501 + ₹100 क्रेडिट।
A या B लिखकर भेजें। — <founder name>
```

**--- Email subject ---**

```
Apology + resolution for booking BS-20260427-K3HSD
```

**--- Email body (EN) ---**

```
Dear <name>,

I am the founder of Bhaktisetu, writing personally.

On 4 May 2026 you booked a puja (booking BS-20260427-K3HSD, ₹501).
The pandit assigned to your booking did not complete it. 39 days have
passed and we have no video proof to offer you. This is our failure
— not yours, and not the deity's.

I am offering two paths:

  (a) Reschedule the puja within the next 7 days, with a different
      verified pandit, and we will provide video proof within 24 hours
      of completion — at no extra charge.

  (b) Full refund of ₹501 to your original payment method (5-7 banking
      days via Razorpay), plus ₹100 wallet credit for the disruption.

Please reply A or B. If I do not hear from you within 48 hours, I will
default to option (b) and process the refund automatically.

I am also independently investigating the pandit assigned to your
booking. We will not let this pattern continue.

Pranam,
<founder name>
Bhaktisetu Foundation
```

---

### Booking 2: BS-20260427-43U88 (priest 821edbe5)

Same template as Booking 1, replace bookingCode + bookingDate. Priest 821edbe5 — flag as repeat-breach.

### Booking 3: BS-20260427-H5FSK (priest 821edbe5)

Same template as Booking 1, replace bookingCode. Priest 821edbe5 — flag as repeat-breach.

### Booking 4: BS-20260427-I3O05 (priest 821edbe5)

Same template as Booking 1, replace bookingCode. Priest 821edbe5 — flag as repeat-breach.

### Booking 5: BS-20260427-03BS5 (priest different)

Same template as Booking 1, replace bookingCode + priestId reference. Different priest — may not be a pattern; but priest still needs ping per Macro 3.

---

## Section B — GitHub Issue body: investigate priest 821edbe5

```
Title: [PRIEST-OPS] Investigate 821edbe5 — 4 SLA breaches on 2026-05-04 batch
Labels: ops, priest-quality, P0

Body:

Priest 821edbe5 assigned to 4 of 5 overdue bookings from 2026-05-04
(BS-20260427-43U88, H5FSK, I3O05, 03BS5). Plus BS-20260427-K3HSD on
this priest as well = 4 of 5 actually = 5 of 5 if K3HSD's priestId
matches in admin panel — VERIFY before pasting.

Zero videoProofUrl submissions, 38+ days elapsed.

Total refund exposure: ₹501 × 4 = ₹2,004 (or ₹2,505 if all 5 are this priest).

Checklist (founder + future cs-agent):

- [ ] KYC status active? (query priests table via /admin)
- [ ] Last contactable date (WA + phone log)
- [ ] Pending payouts → HOLD immediately (block via admin panel)
- [ ] Reach out — written explanation within 48h
- [ ] Decision: warn / suspend / deboard
- [ ] If deboard → reassign any future bookings + update priest_availability
- [ ] Post-mortem in docs/incidents/2026-06-priest-821edbe5-rca.md:
  - How did 4 bookings clear without proof gate?
  - Why didn't priest-side reminder cron catch this? (Render free-tier has no cron — gap is known per docs/company/07-cs.md §1.2)
  - What's the next-tier mitigation (manual T-2h ping? booking-side auto-cancel at T+72h?)

Severity: P0 (reputation + refund risk ₹2,004 to ₹2,505)
Owner: founder (until first CS/ops hire)
```

---

## Section C — Linkage to CS macro library

This action uses **Macro 1 (SLA-breach apology + immediate refund offer)** from `docs/cs/macros-v1.md`. The drafts above are slightly more personalized (founder voice + per-booking detail) because of the founder-direct nature of these 5 outreach attempts.

For future SLA breach detected by the script, use Macro 1 verbatim from `docs/cs/macros-v1.md` unless the booking specifically warrants founder-direct outreach.

---

## Section D — Founder runbook (execute this week)

```markdown
- [ ] Run script: ADMIN_OPS_TOKEN=$ADMIN_OPS_TOKEN pnpm tsx apps/api/scripts/ops/sla-breach-outreach.ts
- [ ] Verify CSV contents match the 5 bookings above
- [ ] Fill <name>/<e164>/<email> placeholders from admin panel /admin/users (cross-ref by booking userId)
- [ ] Paste WhatsApp draft into WhatsApp Business app (NOT bulk tool) for each of 5 devotees
- [ ] Send 5 emails from founder Gmail (Resend not wired — manual)
- [ ] Open GitHub issue (Section B body) → label P0
- [ ] Block priest 821edbe5 payouts in admin panel
- [ ] Schedule 48h check-in calendar reminder
- [ ] Log devotee responses (A/B choice) back into this doc, Section A per-booking
- [ ] After resolution sent: invite each to 30-min phone interview (groundwork for R-Q1-CS-003 user-interviews log — see docs/agent-reports/user-interviews.md)
```

---

## Section E — Post-mortem hook

After all 5 bookings resolved, file a 1-page RCA at `docs/incidents/2026-06-sla-breach-rca.md` covering:

1. Root cause: missing T-2h priest reminder + no T+72h auto-cancel
2. Impact: 5 devotees waited 38+ days, ₹2.5K refund risk, brand damage
3. Mitigations shipped this cycle: Macro 1 (refund SOP), CSV script (re-runnable detection), priest investigation issue
4. Mitigations needed next cycle: priest-side T-2h reminder cron, T+72h booking auto-cancel gate, video-proof enforcement before payout
5. KPI to track: `sla_overdue_bookings` weekly count (target < 1 within 30 days)

## Closes

Q-C-20260611T2307-R-Q1-CS-003 — partial. Interview log + macro #11 (now Macro 1 in v1 doc) shipped. Founder execution pending (Section D checklist).
