# SLA Breach Action — 2026-06-14 (v2)

> **R-Q1-CS-003 v2 founder-action doc.** Re-runnable detector + ready-to-paste WhatsApp + Email drafts for the 5 overdue puja bookings (2026-05-04 batch). 4 of 5 share priest `821edbe5` → repeat-breach investigation required.
>
> **Total ₹ at risk**: ₹2,505 (₹501 × 5) for the 2026-05-04 batch. Refund-side cap.
> **Priest of concern**: `821edbe5` — repeat-breach (≥4 bookings, repeatBreachCount ≥ 2) → flagged for payout pause + GH issue.
>
> **Run script first** to refresh the CSV:
>
> ```bash
> ADMIN_OPS_TOKEN=$ADMIN_OPS_TOKEN API_URL=https://api.darshya.online \
>   pnpm tsx apps/api/scripts/ops/sla-breach-outreach.ts
> ```
>
> CSV will land at `docs/agent-reports/sla-breach-2026-06-14.csv`. Cross-reference bookingCode below before pasting drafts.
>
> **Hard rules**: no auto-sends. Founder pastes manually from WhatsApp Business app + Gmail. Drafts use placeholders `<name>` / `<phone>` / `<email>` — fill from admin panel before paste.
>
> **Endpoint status**: `/admin/ops/sla-overdue-bookings` exists at `apps/api/src/routes/admin-ops.ts:84` ✓. The script narrows the endpoint's broad 24h+status whitelist down to the strict spec filter (priest_assigned + >7d + null video).

---

## Section A — Per-booking outreach drafts (5 bookings)

All five blocks share the same template — replace `<name>`, `<phone>`, `<email>`, and per-booking fields from the CSV. **Hard rule**: no draft is sent without the founder eyeballing the filled-in version first.

Refund options are identical across all 5 (per Macro 11 `puja_sla_breach`):

- **(a)** Reschedule within 7 days with verified video proof (different pandit), OR
- **(b)** Full refund of ₹501 + ₹100 wallet credit for the disruption.

### Booking 1 — BS-20260427-K3HSD (priest 821edbe5)

```
Devotee: <name>
Phone (WA, E.164): <phone>
Email: <email>
Puja: <pujaName>
Amount: ₹501
Scheduled: 2026-05-04
Days overdue: ~41
Priest: 821edbe5 (REPEAT-BREACH — also assigned to BS-20260427-43U88, H5FSK, I3O05)
```

**--- WhatsApp (English) ---**

```
Namaste <name> ji, Bhaktisetu founder here. Your puja booking (BS-20260427-K3HSD) for 4 May was not completed and we owe you an apology. Two options:
(a) Reschedule within 7 days with verified video proof, OR
(b) Full refund of ₹501 + ₹100 wallet credit for the inconvenience.
Reply A or B. — Founder
```

**--- WhatsApp (Hindi, Devanagari) ---**

```
नमस्ते <name> जी, मैं Bhaktisetu का संस्थापक हूँ। आपकी पूजा बुकिंग (BS-20260427-K3HSD, 4 मई) पूरी नहीं हो सकी, इसके लिए क्षमा करें। दो विकल्प:
(a) 7 दिन में पुनर्निर्धारण + वीडियो प्रमाण, या
(b) पूरा रिफंड ₹501 + ₹100 क्रेडिट।
A या B लिखकर भेजें। — संस्थापक
```

**--- Email subject ---**

```
Apology + resolution for booking BS-20260427-K3HSD
```

**--- Email body (English long form) ---**

```
Dear <name>,

I am writing as the founder of Bhaktisetu.

On 4 May 2026 you booked a puja (booking BS-20260427-K3HSD, ₹501). The
pandit assigned to your booking did not complete it. 41 days have passed
and we have no video proof to offer you. This is our failure — not yours,
and not the deity's. I am sorry, fully and personally.

I am offering two paths and you choose:

  (a) Reschedule the puja within the next 7 days, with a different verified
      pandit, and we will provide video proof within 24 hours of completion
      — at no extra charge.

  (b) Full refund of ₹501 to your original payment method (5-7 banking days
      via Razorpay), plus ₹100 wallet credit for the disruption.

Please reply A or B. If I do not hear from you within 48 hours, I will
default to option (b) and process the refund automatically so you are not
waiting any longer.

I am also independently investigating the pandit assigned to your booking.
We will not let this pattern continue.

Pranam,
Founder
Bhaktisetu Foundation
support@bhaktisetu.com
```

---

### Booking 2 — BS-20260427-43U88 (priest 821edbe5)

```
Devotee: <name>
Phone (WA, E.164): <phone>
Email: <email>
Puja: <pujaName>
Amount: ₹501
Scheduled: 2026-05-04
Days overdue: ~41
Priest: 821edbe5 (REPEAT-BREACH)
```

**--- WhatsApp (English) ---**

```
Namaste <name> ji, Bhaktisetu founder here. Your puja booking (BS-20260427-43U88) for 4 May was not completed and we owe you an apology. Two options:
(a) Reschedule within 7 days with verified video proof, OR
(b) Full refund of ₹501 + ₹100 wallet credit for the inconvenience.
Reply A or B. — Founder
```

**--- WhatsApp (Hindi, Devanagari) ---**

```
नमस्ते <name> जी, मैं Bhaktisetu का संस्थापक हूँ। आपकी पूजा बुकिंग (BS-20260427-43U88, 4 मई) पूरी नहीं हो सकी, इसके लिए क्षमा करें। दो विकल्प:
(a) 7 दिन में पुनर्निर्धारण + वीडियो प्रमाण, या
(b) पूरा रिफंड ₹501 + ₹100 क्रेडिट।
A या B लिखकर भेजें। — संस्थापक
```

**--- Email subject ---**

```
Apology + resolution for booking BS-20260427-43U88
```

**--- Email body (English long form) ---**

Same long-form text as Booking 1, replace bookingCode `BS-20260427-K3HSD` → `BS-20260427-43U88` throughout.

---

### Booking 3 — BS-20260427-H5FSK (priest 821edbe5)

```
Devotee: <name>
Phone (WA, E.164): <phone>
Email: <email>
Puja: <pujaName>
Amount: ₹501
Scheduled: 2026-05-04
Days overdue: ~41
Priest: 821edbe5 (REPEAT-BREACH)
```

**--- WhatsApp (English) ---**

```
Namaste <name> ji, Bhaktisetu founder here. Your puja booking (BS-20260427-H5FSK) for 4 May was not completed and we owe you an apology. Two options:
(a) Reschedule within 7 days with verified video proof, OR
(b) Full refund of ₹501 + ₹100 wallet credit for the inconvenience.
Reply A or B. — Founder
```

**--- WhatsApp (Hindi, Devanagari) ---**

```
नमस्ते <name> जी, मैं Bhaktisetu का संस्थापक हूँ। आपकी पूजा बुकिंग (BS-20260427-H5FSK, 4 मई) पूरी नहीं हो सकी, इसके लिए क्षमा करें। दो विकल्प:
(a) 7 दिन में पुनर्निर्धारण + वीडियो प्रमाण, या
(b) पूरा रिफंड ₹501 + ₹100 क्रेडिट।
A या B लिखकर भेजें। — संस्थापक
```

**--- Email subject ---**

```
Apology + resolution for booking BS-20260427-H5FSK
```

**--- Email body (English long form) ---**

Same long-form text as Booking 1, replace bookingCode → `BS-20260427-H5FSK`.

---

### Booking 4 — BS-20260427-I3O05 (priest 821edbe5)

```
Devotee: <name>
Phone (WA, E.164): <phone>
Email: <email>
Puja: <pujaName>
Amount: ₹501
Scheduled: 2026-05-04
Days overdue: ~41
Priest: 821edbe5 (REPEAT-BREACH)
```

**--- WhatsApp (English) ---**

```
Namaste <name> ji, Bhaktisetu founder here. Your puja booking (BS-20260427-I3O05) for 4 May was not completed and we owe you an apology. Two options:
(a) Reschedule within 7 days with verified video proof, OR
(b) Full refund of ₹501 + ₹100 wallet credit for the inconvenience.
Reply A or B. — Founder
```

**--- WhatsApp (Hindi, Devanagari) ---**

```
नमस्ते <name> जी, मैं Bhaktisetu का संस्थापक हूँ। आपकी पूजा बुकिंग (BS-20260427-I3O05, 4 मई) पूरी नहीं हो सकी, इसके लिए क्षमा करें। दो विकल्प:
(a) 7 दिन में पुनर्निर्धारण + वीडियो प्रमाण, या
(b) पूरा रिफंड ₹501 + ₹100 क्रेडिट।
A या B लिखकर भेजें। — संस्थापक
```

**--- Email subject ---**

```
Apology + resolution for booking BS-20260427-I3O05
```

**--- Email body (English long form) ---**

Same long-form text as Booking 1, replace bookingCode → `BS-20260427-I3O05`.

---

### Booking 5 — BS-20260427-03BS5 (priest unknown / different)

```
Devotee: <name>
Phone (WA, E.164): <phone>
Email: <email>
Puja: <pujaName>
Amount: ₹501
Scheduled: 2026-05-04
Days overdue: ~41
Priest: <verify in admin panel — may NOT be 821edbe5>
```

**--- WhatsApp (English) ---**

```
Namaste <name> ji, Bhaktisetu founder here. Your puja booking (BS-20260427-03BS5) for 4 May was not completed and we owe you an apology. Two options:
(a) Reschedule within 7 days with verified video proof, OR
(b) Full refund of ₹501 + ₹100 wallet credit for the inconvenience.
Reply A or B. — Founder
```

**--- WhatsApp (Hindi, Devanagari) ---**

```
नमस्ते <name> जी, मैं Bhaktisetu का संस्थापक हूँ। आपकी पूजा बुकिंग (BS-20260427-03BS5, 4 मई) पूरी नहीं हो सकी, इसके लिए क्षमा करें। दो विकल्प:
(a) 7 दिन में पुनर्निर्धारण + वीडियो प्रमाण, या
(b) पूरा रिफंड ₹501 + ₹100 क्रेडिट।
A या B लिखकर भेजें। — संस्थापक
```

**--- Email subject ---**

```
Apology + resolution for booking BS-20260427-03BS5
```

**--- Email body (English long form) ---**

Same long-form text as Booking 1, replace bookingCode → `BS-20260427-03BS5`. **Verify priest assignment before claiming any "repeat-breach" wording** — this booking may have a different pandit, in which case skip the priest-investigation paragraph.

---

## Section B — GitHub Issue body: investigate priest 821edbe5

Open a new issue in this repo with the following body. Severity P0. Owner: founder (until first ops hire).

```
Title: [PRIEST-OPS] Investigate 821edbe5 — 4 SLA breaches on 2026-05-04 batch

Labels: ops, priest-quality, P0

Body:

Priest 821edbe5 is the assigned pandit on 4 (possibly 5) of the overdue
bookings from the 2026-05-04 batch:

  - BS-20260427-K3HSD
  - BS-20260427-43U88
  - BS-20260427-H5FSK
  - BS-20260427-I3O05
  - BS-20260427-03BS5  (VERIFY priestId in admin panel before claiming this)

Zero videoProofUrl submissions, ~41 days elapsed. Total refund exposure:
₹501 × 4 = ₹2,004, or ₹2,505 if the 5th is also this priest.

Founder + future cs-agent checklist (do these in order):

- [ ] Verify priest record in admin panel — KYC status active? Aadhaar verified?
- [ ] Last contactable date on file (WhatsApp + phone log)
- [ ] **PAUSE all pending payouts for this priest** in admin panel — do not
      wait for the rest of this triage. Block the cash first.
- [ ] Pull the priest's full booking history from PujaBooking table — how
      many other bookings? How many also missing video proof?
- [ ] Send written reach-out via WhatsApp + email — give 48h to respond
      with an explanation of all 4-5 missed bookings
- [ ] Decision: warn (1st offence threshold) / suspend (2nd) / deboard (3rd)
- [ ] If deboard → reassign any future bookings to other verified priests +
      flip priest_availability to inactive
- [ ] Post-mortem in `docs/incidents/2026-06-priest-821edbe5-rca.md`:
  - How did 4 bookings clear without a video-proof gate before scheduledDate?
  - Why did no priest-side reminder cron catch this? (Known gap: Render
    free-tier has no cron — documented in docs/company/07-cs.md §1.2)
  - Mitigation tier: manual T-2h ping? booking-side auto-cancel at T+72h?
    video-proof-required-before-payout gate (already a business rule per
    PROJECT_CONTEXT.md §6 #4 but evidently not enforced)?

Severity: P0
  - Reputation: ₹2,505 refund exposure + 5 disappointed devotees + risk of
    public review (Google, X, WhatsApp groups)
  - Trust: video proof is THE non-negotiable business rule (rule #1) and we
    just shipped 4-5 violations on a single priest

Owner: founder (until first CS/ops hire — see R-Q1-CS-005 hire roadmap).
```

---

## Section C — Linkage to CS macro library

This action uses **Macro #11 `puja_sla_breach`** from `docs/cs/macros-v1.md` (parameterized bilingual EN+HI template — added by this batch). The drafts in Section A above are the manually-personalized variant of that macro (founder voice + per-booking context).

For future SLA breaches detected by the script (re-runs), default to Macro #11 verbatim from the macros doc unless the booking warrants founder-direct outreach (high-LTV devotee, NRI billing, prior complaint history).

Cross-references:

- Script: `apps/api/scripts/ops/sla-breach-outreach.ts`
- Test: `apps/api/scripts/ops/__tests__/sla-breach-outreach.test.ts`
- CSV emit path: `docs/agent-reports/sla-breach-2026-06-14.csv`
- Macros library: `docs/cs/macros-v1.md` (Macro 1 = hand-written; Macro 11 = parameterized template)
- User interview log: `docs/agent-reports/user-interviews.md` (recruits from these 5 devotees post-resolution)

---

## Section D — Founder runbook (execute this week)

```
- [ ] Run script: ADMIN_OPS_TOKEN=$ADMIN_OPS_TOKEN pnpm tsx apps/api/scripts/ops/sla-breach-outreach.ts
- [ ] Verify CSV contents match the 5 bookings above (bookingCode column)
- [ ] Fill <name>/<phone>/<email>/<pujaName> placeholders from admin panel
      → /admin/users (cross-ref by booking.userId)
- [ ] Paste WhatsApp draft into WhatsApp Business app (NOT bulk-sender tool)
      for each of the 5 devotees. Hindi version to devotees with Indian phone
      numbers; English for NRI (verify country code).
- [ ] Send 5 emails manually via founder Gmail (Resend not wired — manual).
      Use the per-booking subject line + the long-form body.
- [ ] Open GitHub issue with Section B body → label P0, assign to founder.
- [ ] In admin panel: PAUSE all pending payouts for priest 821edbe5.
- [ ] Schedule a 48h calendar reminder ("default to refund (B) if no reply").
- [ ] Log devotee responses (A/B/no-reply) back into this doc, Section A
      per-booking, w/ resolution date.
- [ ] Process refunds + ₹100 credits per Razorpay refund SOP for everyone
      who chose (B) or defaulted.
- [ ] After resolution sent: invite each devotee to a 30-min phone interview
      (groundwork for R-Q1-CS-003 user-interviews log — see
      docs/agent-reports/user-interviews.md).
```

---

## Section E — Post-mortem hook

After all 5 bookings resolved, file a 1-page RCA at `docs/incidents/2026-06-sla-breach-rca.md` covering:

1. **Root cause**: missing T-2h priest reminder + no T+72h auto-cancel + video-proof-before-payout gate (rule exists, enforcement does not)
2. **Impact**: 5 devotees waited 41+ days, ₹2,505 refund risk, brand damage on the single most-important business rule (video proof)
3. **Mitigations shipped this cycle**: Macro #11 (refund SOP), CSV script v2 (re-runnable detection with strict filter), priest investigation issue
4. **Mitigations needed next cycle**: priest-side T-2h reminder cron, T+72h booking auto-cancel gate, video-proof-required-before-payout gate enforcement (this is the ROOT — the rule is on paper but the code does not block payouts)
5. **KPI to track**: `sla_overdue_bookings` weekly count (target < 1 within 30 days)

---

## Closes

Q-C-20260612T0503-R-Q1-CS-003 (script + tests + macro + action doc).

Item stays `in_progress` on the roadmap until the 5 phone interviews actually complete per the R-Q1-CS-003 success criteria (see `docs/agent-reports/user-interviews.md`).
