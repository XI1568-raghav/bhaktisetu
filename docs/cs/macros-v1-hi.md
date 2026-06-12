# Support Macros — Darshya CS (Hindi v1, Devanagari)

> **Doctrine source**: `docs/company/07-cs.md` — verbatim: _"A devotee complaint is not a UX bug — it is a disrupted spiritual experience. We respond to the emotion first, the ticket second."_
>
> **Authoring date**: 2026-06-12 · **Translates from**: `docs/cs/macros-v1.md` (English source) · **Coverage**: top 5 macros (#1, #2, #3, #4, #6) · **Script**: Devanagari + roman transliteration in (parentheses) per sentence
>
> **🚩 FOUNDER ACTION REQUIRED**: native-Hindi-fluent speaker must review translations before customer send. Tokens `{name}`, `{amountInr}`, `{scheduledDate}`, `{puja_name}`, `{BS-id}`, `{priestId}` to be filled from booking row.

---

## Macro 1 — SLA-breach apology + immediate refund offer

- **Trigger**: PujaBooking in `priest_assigned` status for ≥7 days past `scheduledDate` with `videoProofUrl IS NULL`. **Live example**: BS-20260427-K3HSD + 4 siblings.
- **Tone note**: पूर्ण ज़िम्मेदारी, कोई बहाना नहीं, ग्राहक की मांग से पहले रिफंड का प्रस्ताव।

**Reply text**:

> प्रणाम {name} जी,
>
> (Pranam {name} ji,)
>
> आपकी पूजा ({puja_name}, {scheduledDate}) का वीडियो प्रमाण हमें नहीं मिला — यह हमारी ज़िम्मेदारी थी और हम विफल हुए। क्षमा करें।
>
> (Aapki puja ({puja_name}, {scheduledDate}) ka video proof humein nahi mila — yeh humari zimmedari thi aur hum vifal hue. Kshama karein.)
>
> आपके पास 3 विकल्प हैं:
>
> (Aapke paas 3 vikalp hain:)
>
> 1. **पूरा रिफंड** ₹{amountInr} — Razorpay rails पर 5-7 banking days में वापस, या
>    (Poora refund ₹{amountInr} — Razorpay rails par 5-7 banking days mein wapas, ya)
> 2. **मुफ्त पुनः पूजा** उसी पंडित जी के साथ या किसी अन्य verified पंडित जी के साथ, या
>    (Muft punah-puja usi pandit ji ke saath ya kisi anya verified pandit ji ke saath, ya)
> 3. **वॉलेट क्रेडिट** ₹{amountInr × 1.25} (25% बोनस, 90 दिन वैध)
>    (Wallet credit ₹{amountInr × 1.25} — 25% bonus, 90 din valid)
>
> 1/2/3 में से उत्तर दें। 24 घंटे में कार्रवाई होगी।
>
> (1/2/3 mein se uttar dein. 24 ghante mein karyavayi hogi.)
>
> — Bhaktisetu CS

- **Follow-up SLA**: 24h to founder action. Default to option 1 (full refund auto-issued) if no reply in 48h.

---

## Macro 2 — Priest no-show + reassignment

- **Trigger**: Devotee reports priest didn't appear OR was >30min late. Booking `confirmed`, no `videoProofUrl`.
- **Tone note**: doctrine §1.1 — एक बाधित आध्यात्मिक अनुभव।

**Reply text**:

> प्रणाम {name} जी,
>
> (Pranam {name} ji,)
>
> आपने इंतज़ार किया, और पंडित जी नहीं आए। यह आपके समय का अनादर था — हमारी तरफ से ग़लती है।
>
> (Aapne intezaar kiya, aur pandit ji nahi aaye. Yeh aapke samay ka anaadar tha — humari taraf se galti hai.)
>
> आज ही (48 घंटे के अंदर) आपको **किसी अन्य verified पंडित जी** से जोड़ रहे हैं — उसी date/time slot पर, कोई अतिरिक्त शुल्क नहीं। पंडित ID + WhatsApp 2 घंटे में मिलेगा।
>
> (Aaj hi 48 ghante ke andar aapko doosre verified pandit ji se assign kar rahe hain — same date/time slot, no extra charge. Pandit ID + WhatsApp 2 ghante mein milega.)
>
> अगर पुनर्निर्धारण संभव नहीं → **पूरा रिफंड** ₹{amountInr} 5-7 banking days में।
>
> (Agar reschedule sambhav nahi → poora refund ₹{amountInr} 5-7 banking days mein.)
>
> आपके wallet में **10% क्रेडिट** (₹{amountInr × 0.10}) भी डाल दिया है। यह अगली booking पर auto-apply होगा।
>
> (Aapke wallet mein 10% credit ₹{amountInr × 0.10} bhi daal diya hai. Yeh next booking par auto-apply hoga.)
>
> — Bhaktisetu CS

- **Follow-up SLA**: 2h to identify replacement pandit, 48h to complete re-booking. Update priest profile `noShowCount += 1`.

---

## Macro 3 — Video proof delay (>72h)

- **Trigger**: Booking `confirmed`, `scheduledDate` passed >72h ago, `videoProofUrl IS NULL`.
- **Tone note**: doctrine §1.2 — आपकी पूजा ज़रूर हुई।

**Reply text**:

> प्रणाम {name} जी,
>
> (Pranam {name} ji,)
>
> आपकी पूजा ज़रूर हुई — हमारे पास पंडित जी की पुष्टि है। लेकिन video हमें 72 घंटे में नहीं मिला, जो आपका अधिकार था।
>
> (Aapki puja zaroor hui — humare paas pandit ji ki confirmation hai. Lekin video humein 72 ghante mein nahi mila, jo aapka haq tha.)
>
> **आज रात तक** video आपके WhatsApp + email पर भेजेंगे।
>
> (Aaj raat tak video aapke WhatsApp + email par bhejenge.)
>
> अगर 96 घंटे में भी नहीं मिला → 25% क्रेडिट (₹{amountInr × 0.25}) आपके wallet में, OR पूरा रिफंड — आप चुनें।
>
> (Agar 96 ghante mein bhi nahi mila → 25% credit ₹{amountInr × 0.25} aapke wallet mein, OR poora refund — aap chunein.)
>
> Booking ID: {BS-id}. पंडित ID: {priestId}.
>
> — Bhaktisetu CS

- **Follow-up SLA**: 24h to chase pandit. Day 4 → escalate to founder + auto-credit.

---

## Macro 4 — Payment failed (Razorpay decline)

- **Trigger**: Payment row exists with `status='failed'` OR Razorpay webhook returned `payment.failed`.
- **Tone note**: doctrine §1.3 — कोई documentation नहीं माँगेंगे।

**Reply text**:

> प्रणाम {name} जी,
>
> (Pranam {name} ji,)
>
> आपका payment process नहीं हो पाया — bank-side issue लगता है (network/limit/3DS)।
>
> (Aapka payment process nahi ho paaya — bank-side issue lagta hai network/limit/3DS.)
>
> **दो तरीके हैं**:
>
> (Do tareeke hain:)
>
> 1. **Retry link** (24h मान्य): {retry_link} — वही Razorpay, दूसरा method आज़माएँ
>    (Retry link 24h valid: {retry_link} — same Razorpay, doosra method try karein)
> 2. **UPI direct**: आप `bhaktisetu@upi` पर ₹{amountInr} भेज दें + booking ID `{BS-id}` का उल्लेख करें। हम manually 1h में confirm कर देंगे।
>    (UPI direct: aap bhaktisetu@upi par ₹{amountInr} bhej dein + booking ID {BS-id} ka mention karein. Hum manually confirm kar denge 1h mein.)
>
> अगर पैसा कट गया लेकिन "failed" दिखा → 2 घंटे इंतज़ार करें, auto-refund process होता है। नहीं आए → यहीं reply करें।
>
> (Agar paisa kat gaya lekin "failed" dikha → 2 ghante intezaar karein, auto-refund process hota hai. Nahi aaye → yahin reply karein.)
>
> — Bhaktisetu CS

- **Follow-up SLA**: monitor Razorpay order for 4h. If silent → manual reach-out at T+24h.

---

## Macro 5 — Refund processed (post-action confirmation)

- **Trigger**: Razorpay refund API returned success, `refundId` exists in Payment row.
- **Tone note**: doctrine §2 tier-1 macro #2 — direct, no fluff.

**Reply text**:

> प्रणाम {name} जी,
>
> (Pranam {name} ji,)
>
> आपका refund **process हो गया है**।
>
> (Aapka refund process ho gaya hai.)
>
> - Amount: ₹{refundAmountInr}
> - Mode: {paymentMode} (UPI/Card/Netbanking)
> - Timeline: UPI → 1-3 दिन, Card/Netbanking → 5-7 banking days (bank-side delay, हमारे control में नहीं)
>   (Timeline: UPI → 1-3 din, Card/Netbanking → 5-7 banking days bank-side delay, humare control mein nahi)
> - Razorpay reference: `{refundId}`
>
> अगर 7 banking days में भी नहीं आए → यहीं reply करें, हम bank पर follow up करेंगे।
>
> (Agar 7 banking days mein bhi nahi aaye → yahin reply karein, hum bank par follow up karenge.)
>
> इस बार की experience के लिए क्षमा। आगे अगर आप फिर से try करना चाहें → support inbox हमेशा खुला है।
>
> (Iss baar ki experience ke liye kshama. Aage agar aap dobara try karna chahein → support inbox hamesha open hai.)
>
> — Bhaktisetu CS

- **Follow-up SLA**: no action needed. Set reminder T+7d to check refund landed.

---

## Native-fluent review checklist (FOUNDER ACTION before customer send)

- [ ] Devanagari script verified — no spelling errors, correct conjuncts (matra-sanyukt akshar)
- [ ] Transliteration matches Roman convention used by Hindi-speakers in informal WhatsApp
- [ ] Tone is `namra` (humble) not `formal` (over-formal will read sarcastic in apology context)
- [ ] No mixing of Sanskrit-tatsama words where common Hindi-tadbhava is more natural
- [ ] Pandit honorifics ("ji", "pandit ji") consistent throughout

## Out of scope (this version)

- Marathi / Gujarati / Punjabi (R-Q1-CS-001b, separate ticket)
- Tamil (separate file: `macros-v1-ta.md`)
- Telugu (separate file: `macros-v1-te.md`)
- Bengali (next version of cs translation work)
- WhatsApp Business template approval (Meta-side, needs U7 gate per `docs/activation-gates.md`)

## Closes

Q-C-20260612T0503-R-Q1-CS-004 (Hindi slice)
