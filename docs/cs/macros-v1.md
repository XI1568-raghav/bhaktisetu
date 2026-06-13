# Support Macros — Darshya CS (English v1)

> **Doctrine source**: `docs/company/07-cs.md` — verbatim: _"A devotee complaint is not a UX bug — it is a disrupted spiritual experience. We respond to the emotion first, the ticket second."_
>
> **Authoring date**: 2026-06-12 · **Owner**: Founder (until CS hire) · **Target inbox**: support@bhaktisetu.com + WhatsApp Business
>
> **Use rule**: copy-paste verbatim, fill `{tokens}` from booking row, NEVER alter the refund-rule lines. Translation (Hindi + 5 regional) → next ticket (R-Q1-CS-001b).

---

## Macro 1 — SLA-breach apology + immediate refund offer

- **Trigger**: PujaBooking in `priest_assigned` status for ≥7 days past `scheduledDate` with `videoProofUrl IS NULL`. **Live example**: BS-20260427-K3HSD + 4 siblings (₹501 each, 38+ days overdue, no video).
- **Tone note**: full ownership, no excuses, refund offered BEFORE customer demands it. Per `docs/company/07-cs.md` §1.2 — _"the policy is only as strong as the cron that nags the priest. The gap is real."_
- **Reply text**:

> Pranam {name} ji,
>
> Aapki puja ({puja_name}, {scheduledDate}) ka video proof humein nahi mila — yeh humari zimmedari thi aur hum failed hue. Maafi.
>
> Aapke paas 3 vikalp hain:
> 1. **Full refund** ₹{amountInr} — Razorpay rails par 5-7 banking days mein wapas, ya
> 2. **Free re-do** same pandit ji ke saath OR doosre verified pandit ji ke saath, OR
> 3. **Wallet credit** ₹{amountInr × 1.25} (25% bonus, valid 90 din)
>
> Reply karein 1/2/3. 24 ghante mein action lenge.
>
> — Bhaktisetu CS

- **Follow-up SLA**: 24h to founder action. If no reply in 48h → default to option 1 (full refund auto-issued). Log to `docs/agent-reports/sla-breach-<date>.csv`.

---

## Macro 2 — Priest no-show + reassignment

- **Trigger**: Devotee reports priest didn't appear OR was >30min late. PujaBooking still in `confirmed` status, no `videoProofUrl`.
- **Tone note**: per doctrine §1.1 — _"a disrupted spiritual experience"_ is the framing, not "we missed an SLA."
- **Reply text**:

> Pranam {name} ji,
>
> Aapne intezaar kiya, aur pandit ji nahi aaye. Yeh aapke samay ka anadar tha — humari taraf se galti hai.
>
> Aaj hi (within 48h) aapko **doosre verified pandit ji** assign kar rahe hain — same date/time slot, no extra charge. Pandit ID + WhatsApp aapko 2 ghante mein milega.
>
> Agar reschedule sambhav nahi → **full refund** ₹{amountInr} 5-7 banking days mein.
>
> Aapke wallet mein **10% credit** (₹{amountInr × 0.10}) bhi daal diya hai. Yeh next booking par auto-apply hoga.
>
> — Bhaktisetu CS

- **Follow-up SLA**: 2h to identify replacement pandit, 48h to complete re-booking. Update priest profile `noShowCount += 1`.

---

## Macro 3 — Video proof delay (>72h)

- **Trigger**: PujaBooking `confirmed`, `scheduledDate` passed >72h ago, `videoProofUrl IS NULL`. Devotee asking "where is video?"
- **Tone note**: doctrine §1.2 — _"Aapki puja zaroor hui — humare paas pandit ji ki confirmation hai."_ Affirm puja happened. Don't make devotee doubt.
- **Reply text**:

> Pranam {name} ji,
>
> Aapki puja zaroor hui — humare paas pandit ji ki confirmation hai. Lekin video humein 72 ghante mein nahi mila, jo aapka haq tha.
>
> **Aaj raat tak** video aapke WhatsApp + email par bhejenge.
>
> Agar 96 ghante mein bhi nahi mila → 25% credit (₹{amountInr × 0.25}) aapke wallet mein, OR full refund — aap chunein.
>
> Booking ID: {BS-id}. Pandit ID: {priestId}.
>
> — Bhaktisetu CS

- **Follow-up SLA**: 24h to chase pandit. Day 4 → escalate to founder + auto-credit.

---

## Macro 4 — Payment failed (Razorpay decline)

- **Trigger**: Payment row exists with `status='failed'` OR Razorpay webhook returned `payment.failed` event.
- **Tone note**: doctrine §1.3 — _"hum samajh sakte hain yeh kitna pareshan karne wala hai... koi documentation nahi maangenge."_ Friction-free retry.
- **Reply text**:

> Pranam {name} ji,
>
> Aapka payment process nahi ho paaya — bank-side issue lagta hai (network/limit/3DS).
>
> **Do tareeke hain**:
> 1. **Retry link** (24h valid): {retry_link} — same Razorpay, doosra method try karein
> 2. **UPI direct**: aap `bhaktisetu@upi` par ₹{amountInr} bhej dein + booking ID `{BS-id}` ka mention karein. Hum manually confirm kar denge 1h mein.
>
> Agar paisa kat gaya lekin "failed" dikha → 2 ghante intezaar karein, auto-refund process hota hai. Nahi aaye → yahin reply karein.
>
> — Bhaktisetu CS

- **Follow-up SLA**: monitor Razorpay order for 4h. If retry success → confirm booking. If silent → manual reach-out at T+24h.

---

## Macro 5 — Booking date confusion (tithi vs Gregorian / NRI timezone)

- **Trigger**: Devotee says "I thought puja was on {date X}, why did it happen on {date Y}?" Common with NRI users (timezone math) + tithi-named pujas (Ekadashi/Sankashti shift annually).
- **Tone note**: empathy first, then patient explain. NEVER "we already told you in the email" — that's a UX failure on our side.
- **Reply text**:

> Pranam {name} ji,
>
> Aapka confusion bilkul samajh aata hai — tithi (Hindu calendar date) aur Gregorian date alag hote hain, aur agar aap India ke bahar hain toh timezone aur jod jaata hai.
>
> Aapki booking: **{puja_name}** for **{tithi_name}**, jo {scheduledDate_local} ko padti hai (India time = IST UTC+5:30). Aap {detected_user_city} mein hain → wahaan ka local time **{scheduledDate_user_tz}** tha.
>
> Agar yeh aapki intent nahi thi → **free reschedule** to next tithi occurrence ({next_tithi_date}), ya full refund. Aap chunein.
>
> Aage se: booking confirmation email mein donon dates (IST + your local) show karenge — yeh humari taraf se UX miss tha.
>
> — Bhaktisetu CS

- **Follow-up SLA**: 12h reply. File UX bug ticket to add dual-timezone display in booking confirmation emails.

---

## Macro 6 — Refund processed (post-action confirmation)

- **Trigger**: Razorpay refund API returned success, `refundId` exists in Payment row.
- **Tone note**: doctrine §2 tier-1 macro #2 — direct, no fluff. Reference number front-and-center.
- **Reply text**:

> Pranam {name} ji,
>
> Aapka refund **process ho gaya hai**.
>
> - Amount: ₹{refundAmountInr}
> - Mode: {paymentMode} ({UPI/Card/Netbanking})
> - Timeline: UPI → 1-3 din, Card/Netbanking → 5-7 banking days (bank-side delay, humare control mein nahi)
> - Razorpay reference: `{refundId}`
>
> Agar 7 banking days mein bhi nahi aaye → yahin reply karein, hum bank par follow up karenge.
>
> Iss baar ki experience ke liye maafi. Aage agar aap dobara try karna chahein → support inbox hamesha open hai.
>
> — Bhaktisetu CS

- **Follow-up SLA**: no action needed unless devotee replies. Set reminder T+7d to check if refund landed.

---

## Macro 7 — Reschedule request

- **Trigger**: Devotee requests new date/time for confirmed booking.
- **Tone note**: clear rule, not negotiable. ≥48h notice = free, <48h = pandit discretion (because pandit has already blocked time + prepped samagri).
- **Reply text**:

> Pranam {name} ji,
>
> Reschedule ki request mil gayi.
>
> **Niyam**:
> - ≥48 ghante pehle: **free reschedule** to any available date in next 90 din
> - <48 ghante pehle: pandit ji ki marzi par depend karta hai (kyunki samagri pre-arranged hai). 90% cases mein ho jaata hai, lekin guarantee nahi.
>
> Aapki current booking: **{puja_name}**, {scheduledDate}. Aap kab move karna chahte hain?
>
> Reply mein 3 preferred dates bhejein → hum pandit ji ke saath lock karenge.
>
> — Bhaktisetu CS

- **Follow-up SLA**: 6h to pandit ping. 12h reply to devotee with confirmed new slot or refund-fallback.

---

## Macro 8 — NRI USD billing question (FX rate transparency)

- **Trigger**: NRI user asks "why am I charged $X when puja shows ₹Y? rate is wrong."
- **Tone note**: transparent math, not defensive. NRI pricing is 9-10x domestic (business rule, immutable per `PROJECT_CONTEXT.md`). Don't apologize for the markup — explain the spread.
- **Reply text**:

> Pranam {name} ji,
>
> USD vs INR ke beech ka antar samjhata hoon:
>
> 1. **Service price** (USD-listed): $${USD_price} — yeh aapne dekha tha.
> 2. **Live FX rate** (sample today, 1 INR = $0.012): aapki puja India mein ₹{INR_equiv} ko equivalent hai.
> 3. **Stripe processing fee**: 2.9% + $0.30 (NRI rails, charged to us, included in your $${USD_price}).
> 4. **NRI service tier**: Bhaktisetu NRI pricing 9-10x domestic — kyun? remote pujas need pandit travel + dedicated video crew + USD payouts to family receivers + GST 18% on cross-border services. Yeh humari business rule hai, har NRI booking par same.
>
> Agar aap ka concern aur kuch hai (charge double dikha, foreign-transaction bank fee, GST refund) → batayein, exact line-item dispatch karenge.
>
> Receipt PDF (80G eligible if Foundation donation) aapko email kar diya: {invoice_url}
>
> — Bhaktisetu CS

- **Follow-up SLA**: 24h reply. If escalation → loop in founder (USD billing is sensitive trust point).

---

## Macro 9 — Festival booking waitlist (Diwali/Navratri sold out)

- **Trigger**: User tries to book major-festival puja, slot count = 0 OR pandit roster exhausted.
- **Tone note**: don't hide that we sold out. Offer concrete alternatives. Festival demand is inelastic — empathy + waitlist is the play.
- **Reply text**:

> Pranam {name} ji,
>
> {festival_name} ke liye aapne jo puja chuni ({puja_name}, {requested_date}) — uss specific date par hamare verified pandit ji ka roster full ho gaya hai. Aap akele nahi hain — yeh festival hi sabse zyada demand-driven hota hai.
>
> **Aapke options**:
>
> 1. **Waitlist par add** karein — agar koi cancel kare, aapko 2 ghante ka first-claim window milega. Aap waitlist position **#{position}** par hain.
> 2. **Alternative dates** ({festival_name} ki shubh dates same week mein):
>    - {alt_date_1} — {muhurat_window_1}
>    - {alt_date_2} — {muhurat_window_2}
>    - {alt_date_3} — {muhurat_window_3}
> 3. **Live darshan + sankalp** ({festival_name} ki main puja kisi famous temple se live stream + aapka sankalp pandit ji padh denge) — ₹{alt_price}, slot guaranteed.
>
> Aap 1/2/3 mein se chunein. Reply mein date + option likh dein.
>
> — Bhaktisetu CS

- **Follow-up SLA**: instant auto-reply for option 1 (waitlist confirmation). 6h reply for option 2/3 booking.

---

## Macro 10 — General escalation to founder WhatsApp (final tier)

- **Trigger**: 3+ back-and-forth replies without resolution, OR explicit "I want to speak to a manager", OR refund dispute >₹5000, OR LinkedIn-public complaint, OR press / influencer inbound.
- **Tone note**: founder takes over. No promises in this macro beyond "founder will call/WA within 4h". Don't quote refund rules — founder may override.
- **Reply text**:

> Pranam {name} ji,
>
> Aapki situation humari standard process se aage hai. Main aapko **founder se directly connect** kar raha hoon.
>
> **Founder WhatsApp**: `+91-XXXXX-XXXXX` (founder fills before macro goes live)
>
> Founder aapko **4 ghante ke andar** call ya WhatsApp karenge — aap convenient time bata dein, ya hum aapko surprise call nahi karenge.
>
> Iss beech ke liye: jo aapne abhi tak share kiya hai (BS-id, transcripts, screenshots) sab founder ko forward kar diye hain. Aapko dobara dohrana nahi padega.
>
> Maafi taklif ke liye. Bhaktisetu ka aim devotional experience hai — agar wahaan kami hui hai, founder personally fix karenge.
>
> — Bhaktisetu CS

- **Follow-up SLA**: founder pings within 4h (founder responsibility, NOT macro author). Log escalation row in `docs/agent-reports/cs-escalations-<month>.md`.

---

## Founder review checklist (before macros go live in support inbox)

- [ ] Fill `+91-XXXXX-XXXXX` placeholder in Macro 10 with real founder WhatsApp
- [ ] Confirm `bhaktisetu@upi` handle in Macro 4 is the live UPI (or replace)
- [ ] Verify all 10 macros render correctly when paste into Razorpay support widget (no markdown leakage)
- [ ] Train any future CS hire on doctrine: emotion first, ticket second
- [ ] File Hindi + 5 regional translations as R-Q1-CS-001b ticket (separate cycle)

## Macro 11 — `puja_sla_breach` (parameterized bilingual EN+HI)

- **ID**: `puja_sla_breach`
- **Trigger**: PujaBooking still `priest_assigned`, >7 days past `{{scheduledDate}}`, `videoProofUrl IS NULL`. Auto-detected via `apps/api/scripts/ops/sla-breach-outreach.ts` → CSV at `docs/agent-reports/sla-breach-<date>.csv`.
- **Tokens**: `{{devoteeName}}`, `{{bookingCode}}`, `{{pujaName}}`, `{{scheduledDate}}`, `{{amountInr}}`, `{{founderName}}`
- **Distinct from Macro 1**: Macro 1 is the broader hand-written reply text; Macro 11 is the strict parameterized template emitted by the SLA-breach script + bilingual founder action doc (matches drafts in `docs/agent-reports/2026-06-14-sla-breach-action.md`).

### WhatsApp — English

> Namaste {{devoteeName}} ji, Bhaktisetu founder here. Your {{pujaName}} booking ({{bookingCode}}) for {{scheduledDate}} was not completed and we owe you an apology. Two options:
> (a) Reschedule within 7 days with verified video proof, OR
> (b) Full refund of ₹{{amountInr}} + ₹100 credit for the inconvenience.
> Reply A or B. — {{founderName}}

### WhatsApp — Hindi

> नमस्ते {{devoteeName}} जी, मैं Bhaktisetu का संस्थापक हूँ। आपकी {{pujaName}} बुकिंग ({{bookingCode}}, {{scheduledDate}}) पूरी नहीं हो सकी, इसके लिए क्षमा करें। दो विकल्प:
> (a) 7 दिन में पुनर्निर्धारण + वीडियो प्रमाण, या
> (b) पूरा रिफंड ₹{{amountInr}} + ₹100 क्रेडिट।
> A या B लिखकर भेजें। — {{founderName}}

### Email subject

> Apology + resolution for booking {{bookingCode}}

### Email body — English

> Dear {{devoteeName}},
>
> I am writing as the founder of Bhaktisetu. Your {{pujaName}} booking ({{bookingCode}}) scheduled for {{scheduledDate}} was not completed, and I take full responsibility for the failure of our pandit-verification and video-proof process. There is no excuse — your trust was misplaced and I am sorry.
>
> Two resolutions are available, and you choose:
>
> 1. **Reschedule within 7 days** — a verified pandit (different from the original assignee) will conduct the puja with mandatory video proof delivered to you within 24 hours of completion.
> 2. **Full refund of ₹{{amountInr}}** — credited to your original payment method within 5-7 business days, plus a ₹100 inconvenience credit on your Bhaktisetu wallet.
>
> Please reply A or B. If I do not hear back within 48 hours, I will default to option B (full refund) to ensure you are not waiting any longer.
>
> Yours in seva,
> {{founderName}}
> Founder, Bhaktisetu
> support@bhaktisetu.com

### Email body — Hindi

> {{devoteeName}} जी,
>
> मैं Bhaktisetu का संस्थापक हूँ। आपकी {{pujaName}} बुकिंग ({{bookingCode}}, {{scheduledDate}}) पूरी नहीं हो सकी। हमारी पंडित-सत्यापन एवं वीडियो-प्रमाण प्रक्रिया विफल रही — इसकी पूरी जिम्मेदारी मेरी है। कोई बहाना नहीं — आपने भरोसा किया और हम विफल रहे। क्षमा करें।
>
> दो विकल्प, आप चुनें:
>
> 1. **7 दिन में पुनर्निर्धारण** — एक सत्यापित पंडित (पहले वाले से अलग) पूजा करेंगे और 24 घंटे में वीडियो प्रमाण आपको भेजा जाएगा।
> 2. **पूरा रिफंड ₹{{amountInr}}** — मूल पेमेंट मेथड पर 5-7 कार्य दिवसों में, साथ ही ₹100 असुविधा क्रेडिट Bhaktisetu वॉलेट में।
>
> कृपया A या B लिखकर भेजें। 48 घंटे में उत्तर न मिलने पर हम विकल्प B (पूरा रिफंड) डिफ़ॉल्ट करेंगे ताकि आपको और इंतज़ार न करना पड़े।
>
> सेवा में,
> {{founderName}}
> संस्थापक, Bhaktisetu
> support@bhaktisetu.com

- **Follow-up SLA**: founder action within 24h of detection. Auto-default to refund at 48h silence. Log row to `docs/agent-reports/sla-breach-<date>.csv` with `suggestedAction`, `repeatBreachCount`, and `resolution` (A/B/auto-refund).
- **Repeat-breach escalation**: If same `priestId` shows `repeatBreachCount >= 2` in the script output → ALSO open a GH issue per the priest investigation template in `docs/agent-reports/2026-06-14-sla-breach-action.md` (Section B). Pause priest payouts in admin panel immediately, do not wait for the issue triage.

---

## Out of scope (this version)

- Tamil + Telugu + Bengali + Marathi + Gujarati translations (Hindi covered by Macro 11)
- Macro 12+ (B2B temple manager escalations — separate doc TBD)
- Automated dispatch via support tool (manual paste only, this version)
- WhatsApp template approvals (Meta-side, needs U7 gate per `docs/activation-gates.md`)

## Closes

Q-C-20260611T2307-R-Q1-CS-001 (macros 1-10)
Q-C-20260612T0503-R-Q1-CS-003 (macro 11 `puja_sla_breach`)
