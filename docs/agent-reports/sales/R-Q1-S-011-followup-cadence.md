# R-Q1-S-011 — Follow-up Cadence

> Standard cadence after first WhatsApp / email / walk-in opener.
> D0 = day of first contact. All times IST.

## Cadence grid

| Touchpoint | Channel | Trigger | Asset |
|---|---|---|---|
| **D0** | WA / email / walk-in | First opener | Outreach template (category-specific) |
| **D2** | WhatsApp follow-up | No reply to D0 | Soft nudge + 1-line value re-state |
| **D5** | Phone call | No reply to D2 | Direct ask: "kya 5 min baat ho sakti hai?" |
| **D10** | Email w/ commission table | No call confirmed | Detailed commission slabs + 3 testimonials (when available) |
| **D20** | Final WA + "park" | No engagement | Polite close, "Q2 mein wapas contact karenge" |

## Touchpoint scripts

### D2 — WhatsApp nudge

> Namaste {contact_name} ji 🙏
>
> Pichhle hafte aapko Darshya.online partnership ke baare mein message kiya tha. Bas yaad dilane ke liye —
>
> {category-specific 1-liner}:
> - Prasad: "Pan-India devotee + NRI demand aapki signature {sweet} ke liye access"
> - Brass: "NRI export-ready buyers + custom-order premium SKUs"
> - Texts: "Devotee subscriber recurring model, low-effort high-volume"
>
> 15 min ka call kar lete hain is hafte? Aap convenient time bata dijiye.

### D5 — Phone call script (60 sec)

> "Namaste {contact_name} ji, main {founder_name} bol raha hoon, Darshya.online se. Maine 5 din pehle aapko WhatsApp pe partnership ka message bheja tha.
>
> Bas confirm karna chahta tha — aapne dekha message? Koi questions ya concerns?
>
> {If yes, sounds interested}: Aaj ya kal 15 min call set kar lete hain. Aap free kab ho?
>
> {If hesitant}: Koi baat nahin. Aap chahein toh main ek detailed email bhej dunga — commission slabs + onboarding checklist + sample testimonials. Aap dekh ke decide kar lijiyega."

### D10 — Detailed email (subject: "Re: Darshya partnership — commission details + testimonials")

> Dear {contact_name},
>
> Following up on our prior outreach. Here is the detailed partnership document you can review at your pace:
>
> **Commission slabs (volume-tiered)**
>
> | Monthly GMV | Prasad | Brass | Texts |
> |---|---|---|---|
> | < ₹50K | 12% | 15% | 10% |
> | ₹50K-2L | 10% | 13% | 9% |
> | ₹2L+ | 8% | 11% | 8% |
>
> **Settlement**: T+7 default, T+14 optional (your choice at signup).
>
> **Returns policy**:
> - Prasad — non-returnable (FSSAI hygiene)
> - Brass — 7-day return for unused items
> - Texts — damage-only return
>
> **Onboarding checklist** (post-signup):
> 1. GST + FSSAI {if prasad} verification (3-5 working days)
> 2. Product photography support (we send a photographer, no charge)
> 3. Inventory upload (CSV or manual, our ops team helps)
> 4. Test order + payment flow (1-2 days)
> 5. Go-live + first marketing push (week 2)
>
> **Testimonials** (early partners): {add 2-3 lines once available; currently founder-verify}
>
> If interested, please reply with a 15-min call slot. If not the right fit currently, we'd appreciate a short note so we can revisit in Q2.
>
> Regards,
> {founder_name}

### D20 — Polite close

> Namaste {contact_name} ji 🙏
>
> Pichhle 3 hafte se aapko Darshya.online partnership ke baare mein contact kar raha tha. Lagta hai abhi sahi time nahin hai — koi baat nahin.
>
> Hum Q2 (Apr-Jun 2026) mein wapas contact karenge. Tab tak agar aapko ya aapke kisi parichit ko interest ho, toh aap WhatsApp ya {founder_email} pe message kar sakte hain.
>
> Aapka business shubh ho. Dhanyavaad 🙏

## Cadence tracking

Maintain in CRM or spreadsheet:

| Field | Format |
|---|---|
| prospect_id | from CSV |
| d0_date | YYYY-MM-DD |
| d0_channel | WA / email / walkin |
| d0_response | none / soft-interest / call-booked / dropped |
| d2_sent_at | YYYY-MM-DD or null |
| d5_call_outcome | reached / voicemail / no-answer / declined |
| d10_sent_at | YYYY-MM-DD or null |
| d20_close_status | parked-q2 / dropped / converted |
| qualification_score | int 0-21 (after discovery call) |
| decision | T1 / T2 / hold / drop |

## Re-engagement (Q2 wave)

- D20-parked prospects auto-flow into Q2 outreach list (separate file `R-Q2-S-011-reengagement.csv`).
- Add note: "Last contact {date}. Reason: {timing/inventory/season/no-interest}."
- D0 of Q2 wave uses different opener — reference prior outreach + new offering ("3 partners now live in {city}, here's what they say").

## Volume targets

- Outreach: 30 prospects (CSV size)
- Discovery calls booked: 12-15 (40-50% reply rate target)
- Qualified (score ≥14): 10-12
- Onboarded (signed agreement + go-live): 10 (item target)

## SLA per touchpoint

| Action | SLA |
|---|---|
| Reply to inbound message | Same business day, < 4h |
| Reply to email | < 24h |
| Schedule call after interest | < 48h |
| Send post-call follow-up | Same day, by EOD |
| Onboarding kickoff after signup | < 7 days |
