<!-- TC-08 (P1, trust audit): the "verified pandit" adjective was removed from the
copy below. Nothing in the codebase promotes a Priest to verified: the only
production writer of Priest.verificationStatus is apps/api/src/routes/priest.ts,
which writes 'pending'; isVerified: true appears only in apps/api/prisma/seed.ts
and apps/api/scripts/seed-demo-users.ts. There is no credential upload, no
reference workflow, no probation review and no per-pandit trust score column, and
Priest.aadhaarVerified is read as a PAYOUT gate (apps/api/src/routes/providers.ts),
not as a published credential. This is markdown a human copies into a real
message, so there is nothing to gate it on: restore the wording by hand the day
apps/api/src/lib/pandit-vetting.ts HAS_PANDIT_VETTING is true. -->

# Support Macros — Darshya CS (Tamil v1)

> **Doctrine source**: `docs/company/07-cs.md` — verbatim: _"A devotee complaint is not a UX bug — it is a disrupted spiritual experience. We respond to the emotion first, the ticket second."_
>
> **Authoring date**: 2026-06-12 · **Translates from**: `docs/cs/macros-v1.md` (English source) · **Coverage**: top 5 macros (#1, #2, #3, #4, #6) · **Script**: Tamil + roman transliteration in (parentheses) per sentence
>
> **🚩 FOUNDER ACTION REQUIRED**: native-Tamil-fluent speaker must review translations before customer send. Tamil grammar (sandhi, polite imperatives) is unforgiving — typo in honorific can read as insult.

---

## Macro 1 — SLA-breach apology + immediate refund offer

- **Trigger**: PujaBooking in `priest_assigned` status for ≥7 days past `scheduledDate` with `videoProofUrl IS NULL`.
- **Tone note**: முழு பொறுப்பு, மன்னிப்பு, ரிஃபண்ட் தானாக முன்வைப்பு.

**Reply text**:

> வணக்கம் {name},
>
> (Vanakkam {name},)
>
> உங்களின் பூஜை ({puja_name}, {scheduledDate}) வீடியோ ஆதாரம் எங்களுக்குக் கிடைக்கவில்லை — இது எங்கள் பொறுப்பு, தோல்வி எங்களுடையதே. மன்னிக்கவும்.
>
> (Ungalin pooja ({puja_name}, {scheduledDate}) video aatharam engalukku kidaikkavillai — idhu engal poruppu, tholvi engaludaiyathe. Mannikkavum.)
>
> உங்களுக்கு 3 வழிமுறைகள் உள்ளன:
>
> (Ungalukku 3 vazhi-muraikal ullana:)
>
> 1. **முழு ரிஃபண்ட்** ₹{amountInr} — Razorpay மூலம் 5-7 banking days இல் திரும்பும், அல்லது
>    (Muzhu refund ₹{amountInr} — Razorpay moolam 5-7 banking days il thirumbum, alladhu)
> 2. **இலவச மீள்-பூஜை** அதே பண்டிதரோடு அல்லது வேறு verified பண்டிதரோடு, அல்லது
>    (Ilavasa meel-pooja athe panditharodu alladhu vēru panditharodu, alladhu)
> 3. **Wallet credit** ₹{amountInr × 1.25} (25% bonus, 90 நாட்கள் செல்லும்)
>    (Wallet credit ₹{amountInr × 1.25} — 25% bonus, 90 naatkal sellum)
>
> 1/2/3 என பதில் அளிக்கவும். 24 மணி நேரத்தில் நடவடிக்கை எடுக்கப்படும்.
>
> (1/2/3 ena pathil alikkavum. 24 mani neraththil nadavadikkai eduppadum.)
>
> — Bhaktisetu CS

- **Follow-up SLA**: 24h to founder action. Default to option 1 if no reply in 48h.

---

## Macro 2 — Priest no-show + reassignment

- **Trigger**: Devotee reports priest didn't appear OR was >30min late.
- **Tone note**: doctrine §1.1 — ஆன்மீக அனுபவம் தடைபட்டது.

**Reply text**:

> வணக்கம் {name},
>
> (Vanakkam {name},)
>
> நீங்கள் காத்திருந்தீர்கள், ஆனால் பண்டிதர் வரவில்லை. இது உங்களின் நேரத்திற்கு செய்த அவமரியாதை — எங்கள் தவறு.
>
> (Neengal kaaththirundheergal, aanaal pandithar varavillai. Idhu ungalin neraththirku seydha avamariyaadhai — engal thavaru.)
>
> இன்றே (48 மணி நேரத்திற்குள்) **வேறு verified பண்டிதரை** ஒதுக்குகிறோம் — அதே தேதி/நேரம், கூடுதல் கட்டணம் இல்லை. பண்டிதர் ID + WhatsApp 2 மணி நேரத்தில் கிடைக்கும்.
>
> (Indre 48 mani neraththirkul vēru panditharai othukkugirom — athe thethi/neram, koodudal kattanam illai. Pandithar ID + WhatsApp 2 mani neraththil kidaikkum.)
>
> மீள்-பதிவு சாத்தியமில்லை எனில் → **முழு ரிஃபண்ட்** ₹{amountInr} 5-7 banking days இல்.
>
> (Meel-pathivu saaththiyamillai enil → muzhu refund ₹{amountInr} 5-7 banking days il.)
>
> உங்கள் wallet இல் **10% credit** (₹{amountInr × 0.10}) போடப்பட்டுள்ளது. அடுத்த booking இல் தானாக apply ஆகும்.
>
> (Ungal wallet il 10% credit ₹{amountInr × 0.10} podappattullathu. Aduththa booking il thaanaaga apply aagum.)
>
> — Bhaktisetu CS

- **Follow-up SLA**: 2h to identify replacement, 48h to re-book.

---

## Macro 3 — Video proof delay (>72h)

- **Trigger**: Booking `confirmed`, `scheduledDate` passed >72h ago, `videoProofUrl IS NULL`.

**Reply text**:

> வணக்கம் {name},
>
> (Vanakkam {name},)
>
> உங்கள் பூஜை நிச்சயமாக நடந்தது — பண்டிதர் உறுதிப்படுத்தியுள்ளார். ஆனால் video 72 மணி நேரத்தில் கிடைக்கவில்லை, அது உங்கள் உரிமை.
>
> (Ungal pooja nichchayamaaga nadandhathu — pandithar uruthi-paduththiyullaar. Aanaal video 72 mani neraththil kidaikkavillai, athu ungal urimai.)
>
> **இன்றிரவுக்குள்** video உங்கள் WhatsApp + email க்கு அனுப்புகிறோம்.
>
> (Indriravukkul video ungal WhatsApp + email ku anuppugirom.)
>
> 96 மணி நேரத்திலும் கிடைக்கவில்லை எனில் → 25% credit (₹{amountInr × 0.25}) wallet இல், அல்லது முழு ரிஃபண்ட் — நீங்கள் தேர்வு செய்யுங்கள்.
>
> (96 mani neraththilum kidaikkavillai enil → 25% credit ₹{amountInr × 0.25} wallet il, alladhu muzhu refund — neengal thervu seyyungal.)
>
> Booking ID: {BS-id}. பண்டிதர் ID: {priestId}.
>
> — Bhaktisetu CS

- **Follow-up SLA**: 24h to chase pandit. Day 4 → escalate + auto-credit.

---

## Macro 4 — Payment failed (Razorpay decline)

- **Trigger**: Payment `failed` status OR Razorpay `payment.failed` webhook.

**Reply text**:

> வணக்கம் {name},
>
> (Vanakkam {name},)
>
> உங்கள் payment நடைபெறவில்லை — bank-side issue என தோன்றுகிறது (network/limit/3DS).
>
> (Ungal payment nadaiperavillai — bank-side issue ena thondrugiradhu — network/limit/3DS.)
>
> **இரண்டு வழிகள்**:
>
> (Irandu vazhigal:)
>
> 1. **Retry link** (24h valid): {retry_link} — அதே Razorpay, வேறு method முயற்சி செய்யுங்கள்
>    (Retry link 24h valid: {retry_link} — athe Razorpay, vēru method muyatchi seyyungal)
> 2. **UPI direct**: `bhaktisetu@upi` க்கு ₹{amountInr} அனுப்பவும் + booking ID `{BS-id}` ஐ குறிப்பிடவும். நாங்கள் manually 1h இல் உறுதிப்படுத்துகிறோம்.
>    (UPI direct: bhaktisetu@upi ku ₹{amountInr} anuppavum + booking ID {BS-id} ai kurippidavum. Naangal manually 1h il uruthi-paduththugirom.)
>
> பணம் வெட்டப்பட்டு "failed" காட்டினால் → 2 மணி நேரம் காத்திருங்கள், auto-refund நடக்கும். வரவில்லை எனில் → இங்கேயே reply செய்யுங்கள்.
>
> (Panam vettappattu "failed" kaatinaal → 2 mani neram kaaththirungal, auto-refund nadakkum. Varavillai enil → ingeyē reply seyyungal.)
>
> — Bhaktisetu CS

- **Follow-up SLA**: monitor 4h. Manual reach-out T+24h if silent.

---

## Macro 5 — Refund processed (post-action confirmation)

- **Trigger**: Razorpay refund API success.

**Reply text**:

> வணக்கம் {name},
>
> (Vanakkam {name},)
>
> உங்கள் refund **process செய்யப்பட்டுவிட்டது**.
>
> (Ungal refund process seyyappattuvittadhu.)
>
> - தொகை: ₹{refundAmountInr}
> - Mode: {paymentMode} (UPI/Card/Netbanking)
> - Timeline: UPI → 1-3 நாட்கள், Card/Netbanking → 5-7 banking days (bank-side delay, எங்கள் கட்டுப்பாட்டில் இல்லை)
>   (Timeline: UPI → 1-3 naatkal, Card/Netbanking → 5-7 banking days bank-side delay, engal kattupaattil illai)
> - Razorpay reference: `{refundId}`
>
> 7 banking days இலும் வரவில்லை எனில் → இங்கேயே reply செய்யுங்கள், நாங்கள் bank-ஐ follow up செய்கிறோம்.
>
> (7 banking days ilum varavillai enil → ingeyē reply seyyungal, naangal bank ai follow up seygirom.)
>
> இந்த அனுபவத்திற்கு மன்னிக்கவும். மீண்டும் try செய்ய நினைத்தால் → support inbox எப்போதும் திறந்திருக்கும்.
>
> (Indha anubhavaththirku mannikkavum. Meendum try seyya ninaiththaal → support inbox eppodhum thirandhirukkum.)
>
> — Bhaktisetu CS

- **Follow-up SLA**: T+7d reminder to verify refund landed.

---

## Native-fluent review checklist (FOUNDER ACTION)

- [ ] Tamil script verified — sandhi (consonant-vowel joins) correct
- [ ] Polite imperatives use `-um` / `-avum` / `-ungal` correctly (informal vs respectful)
- [ ] `Pandithar` (பண்டிதர்) vs `Iyer` (ஐயர்) — Tamil-Brahmin context-sensitive
- [ ] No mixing of literary Tamil with spoken Tamil — keep all in `pesum thamizh` (spoken)
- [ ] Vanakkam (வணக்கம்) used consistently, NOT "Namaste"

## Out of scope

- Marathi / Gujarati / Punjabi (separate ticket)
- Hindi (`macros-v1-hi.md`)
- Telugu (`macros-v1-te.md`)
- Bengali / Malayalam / Kannada (next version)
- WhatsApp Business template approval (Meta-side, U7 gate)

## Closes

Q-C-20260612T0503-R-Q1-CS-004 (Tamil slice)
