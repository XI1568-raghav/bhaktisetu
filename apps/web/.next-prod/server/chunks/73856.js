"use strict";exports.id=73856,exports.ids=[73856],exports.modules={73856:(a,b,c)=>{c.d(b,{BJ:()=>g,GA:()=>f,M4:()=>i,Sd:()=>r,Sv:()=>p,W$:()=>q,Xb:()=>s,eC:()=>o,hB:()=>h});var d=c(34362),e=c(57053);let f=[{code:"en",label:"English",native:"English"},{code:"hi",label:"Hindi",native:"हिन्दी"},{code:"ta",label:"Tamil",native:"தமிழ்"},{code:"te",label:"Telugu",native:"తెలుగు"},{code:"bn",label:"Bengali",native:"বাংলা"},{code:"mr",label:"Marathi",native:"मराठी"}],g="en",h=[{id:"puja-bookings",en:"Puja Bookings"},{id:"live-darshan",en:"Live Darshan"},{id:"store-orders",en:"Store & Orders"},{id:"payments-refunds",en:"Payments & Refunds"},{id:"account-profile",en:"Account & Profile"},{id:"general",en:"General"}];function i(a){return a.lang!==g&&!a.reviewed_by}let j=d.Kq.refunds.videoProofTargetLabel.replace(/\s*hours?$/i,"").trim(),k=d.Kq.refunds.missingVideoEscalationHours,l=`₹${d.Kq.store.freeDeliveryAboveInr}`,m=`₹${d.Kq.store.flatDeliveryFeeInr}`,n=d.Kq.supportEmail,o=[{slug:"how-to-book-a-puja",lang:"en",category:"puja-bookings",title:"How do I book a puja?",summary:"Open the puja page, pick a temple and date, fill in the sankalp form (your name, gotra, and intent), and pay. You'll receive a booking confirmation, and a pandit performs the ritual with video proof shared within "+d.Kq.refunds.videoProofTargetLabel+".",body:`## Steps

1. **Browse pujas** at [darshya.online/pujas](/pujas).
2. **Pick a temple** from the list — every temple shows its trust score and location. We do not publish pandit credentials: no credential verification, reference check or probation runs today, and a pandit is paid only once Aadhaar-based KYC is on file, which is a payout gate rather than a public credential check.
3. **Choose date & time** that fits the auspicious window for your puja (we show muhurat suggestions).
4. **Fill sankalp** — your full name, gotra (lineage), and the intent (e.g., health, prosperity, ancestral blessing).
5. **Pay securely** via Razorpay. Pay in INR with UPI, an Indian card or net banking; cards issued outside India and PayPal are coming soon.
6. **Receive confirmation** by email and WhatsApp with your booking number (format: BS-YYYYMMDD-XXXXX).
7. **Video proof** is uploaded within ${j} hours of the ritual completing.

## What's included

- Pandit performance
- Full ritual recording (video proof)
- Prasad delivery (where temple offers it)

## Before you pay

Cancellation is free ${e.Pw} hours or more before your slot, and ${e.lp}% between ${e.qz} and ${e.Pw} hours. Inside ${e.qz} hours the pandit is assigned and samagri is being bought, so a booking can no longer be cancelled — see [Cancelling or rescheduling a puja](/help/articles/en/cancel-or-reschedule-a-puja).

## Need help?

Email ${n} or chat with us on WhatsApp.`,updatedAt:"2026-08-16"},{slug:"how-to-book-a-puja",lang:"hi",category:"puja-bookings",title:"मैं पूजा कैसे बुक करूं?",summary:"पूजा पेज खोलें, मंदिर और तारीख चुनें, संकल्प फॉर्म भरें (अपना नाम, गोत्र, और मनोकामना), और भुगतान करें। आपको बुकिंग पुष्टि मिलेगी, और एक सत्यापित पंडित अनुष्ठान करेगा। "+j+" घंटे के भीतर वीडियो प्रमाण साझा किया जाएगा।",body:`## चरण

1. **पूजा देखें** [darshya.online/pujas](/pujas) पर।
2. **मंदिर चुनें** सत्यापित सूची से — हर मंदिर का विश्वास स्कोर, स्थान और पंडित प्रमाण-पत्र दिखाया जाता है।
3. **तारीख और समय** चुनें जो आपकी पूजा के शुभ मुहूर्त में हो।
4. **संकल्प भरें** — पूरा नाम, गोत्र, और मनोकामना (जैसे स्वास्थ्य, समृद्धि, पितृ-आशीर्वाद)।
5. **सुरक्षित भुगतान** Razorpay के माध्यम से करें।
6. **पुष्टि प्राप्त करें** ईमेल और WhatsApp पर बुकिंग संख्या (BS-YYYYMMDD-XXXXX) के साथ।
7. **वीडियो प्रमाण** अनुष्ठान पूरा होने के ${j} घंटे के भीतर अपलोड किया जाता है।

## क्या शामिल है

- सत्यापित पंडित द्वारा अनुष्ठान
- पूरा अनुष्ठान वीडियो (वीडियो प्रमाण)
- प्रसाद वितरण (जहां मंदिर प्रदान करे)

## भुगतान से पहले

निर्धारित समय से ${e.Pw} घंटे या अधिक पहले रद्द करने पर पूरा धन वापस मिलता है, और ${e.qz} से ${e.Pw} घंटे के बीच ${e.lp}%। ${e.qz} घंटे के भीतर पंडित नियुक्त हो चुका होता है और सामग्री खरीदी जा रही होती है, इसलिए बुकिंग रद्द नहीं की जा सकती।

## सहायता चाहिए?

${n} पर ईमेल करें या WhatsApp पर हमसे बात करें।`,updatedAt:"2026-08-16",reviewed_by:null},{slug:"how-to-book-a-puja",lang:"ta",category:"puja-bookings",title:"பூஜையை எவ்வாறு பதிவு செய்வது?",summary:"பூஜை பக்கத்தை திறந்து, கோயில் மற்றும் தேதியை தேர்வுசெய்து, சங்கல்ப படிவத்தை நிரப்பி (உங்கள் பெயர், கோத்திரம், எண்ணம்), மற்றும் கட்டணம் செலுத்துங்கள். நீங்கள் பதிவு உறுதியை பெறுவீர்கள், சரிபார்க்கப்பட்ட பண்டிட் சடங்கை செய்து "+j+" மணி நேரத்திற்குள் வீடியோ ஆதாரம் வழங்குவார்.",body:`## படிகள்

1. **பூஜைகளை பார்க்கவும்** [darshya.online/pujas](/pujas) இல்.
2. **கோயிலை தேர்வுசெய்யவும்** சரிபார்க்கப்பட்ட பட்டியலில் இருந்து.
3. **தேதி மற்றும் நேரத்தை** தேர்வுசெய்யவும் — முகூர்த்த ஆலோசனைகள் காட்டப்படும்.
4. **சங்கல்பத்தை நிரப்பவும்** — முழுப் பெயர், கோத்திரம், எண்ணம் (உதா: ஆரோக்கியம், செழிப்பு).
5. **பாதுகாப்பாக கட்டணம் செலுத்தவும்** Razorpay வழியாக.
6. **உறுதியை பெறவும்** மின்னஞ்சல் மற்றும் WhatsApp மூலம் BS-YYYYMMDD-XXXXX எண்ணுடன்.
7. **வீடியோ ஆதாரம்** சடங்கு முடிந்த ${j} மணி நேரத்திற்குள் பதிவேற்றப்படும்.

## கட்டணம் செலுத்தும் முன்

நிகழ்வுக்கு ${e.Pw} மணி நேரம் அல்லது அதற்கு முன் ரத்து செய்தால் முழுத் தொகையும் திரும்பக் கிடைக்கும், ${e.qz}-${e.Pw} மணி நேரத்திற்குள் ${e.lp}%. ${e.qz} மணி நேரத்திற்குள் ரத்து செய்ய முடியாது.

## உதவி தேவையா?

${n} க்கு மின்னஞ்சல் அனுப்பவும் அல்லது WhatsApp இல் எங்களைத் தொடர்பு கொள்ளவும்.`,updatedAt:"2026-08-16",reviewed_by:null},{slug:"how-to-book-a-puja",lang:"te",category:"puja-bookings",title:"పూజను ఎలా బుక్ చేయాలి?",summary:"పూజ పేజీని తెరిచి, దేవాలయం మరియు తేదీని ఎంచుకుని, సంకల్ప ఫారమ్‌ను నింపి (మీ పేరు, గోత్రం, మరియు ఉద్దేశ్యం), మరియు చెల్లించండి. మీరు బుకింగ్ నిర్ధారణను అందుకుంటారు, మరియు ధృవీకరించబడిన పండిట్ ఆచారాన్ని నిర్వహించి "+j+" గంటలలోపు వీడియో రుజువును పంచుకుంటారు.",body:`## దశలు

1. **పూజలను బ్రౌజ్ చేయండి** [darshya.online/pujas](/pujas) వద్ద.
2. **దేవాలయాన్ని ఎంచుకోండి** ధృవీకరించబడిన జాబితా నుండి.
3. **తేదీ & సమయాన్ని** ఎంచుకోండి — ముహూర్త సూచనలు చూపబడతాయి.
4. **సంకల్పాన్ని పూరించండి** — పూర్తి పేరు, గోత్రం, మరియు ఉద్దేశ్యం.
5. **సురక్షితంగా చెల్లించండి** Razorpay ద్వారా.
6. **నిర్ధారణను అందుకోండి** ఇమెయిల్ మరియు WhatsApp ద్వారా BS-YYYYMMDD-XXXXX నంబర్‌తో.
7. **వీడియో రుజువు** ఆచారం పూర్తయిన ${j} గంటలలోపు అప్‌లోడ్ చేయబడుతుంది.

## చెల్లించే ముందు

నిర్ణీత సమయానికి ${e.Pw} గంటలు లేదా అంతకు ముందు రద్దు చేస్తే పూర్తి మొత్తం తిరిగి వస్తుంది, ${e.qz}-${e.Pw} గంటల మధ్య ${e.lp}%. ${e.qz} గంటలలోపు రద్దు సాధ్యం కాదు.

## సహాయం కావాలా?

${n} కి ఇమెయిల్ చేయండి లేదా WhatsApp లో మమ్మల్ని సంప్రదించండి.`,updatedAt:"2026-08-16",reviewed_by:null},{slug:"how-to-book-a-puja",lang:"bn",category:"puja-bookings",title:"আমি কীভাবে একটি পূজা বুক করব?",summary:"পূজা পৃষ্ঠাটি খুলুন, একটি মন্দির এবং তারিখ নির্বাচন করুন, সংকল্প ফর্মটি পূরণ করুন (আপনার নাম, গোত্র, এবং অভিপ্রায়), এবং অর্থপ্রদান করুন। আপনি একটি বুকিং নিশ্চিতকরণ পাবেন, এবং একজন যাচাইকৃত পন্ডিত আচার সম্পাদন করবেন এবং "+j+" ঘন্টার মধ্যে ভিডিও প্রমাণ শেয়ার করবেন।",body:`## ধাপ

1. **পূজা ব্রাউজ করুন** [darshya.online/pujas](/pujas) এ।
2. **মন্দির নির্বাচন করুন** যাচাইকৃত তালিকা থেকে।
3. **তারিখ ও সময়** নির্বাচন করুন — মুহূর্ত পরামর্শ দেখানো হবে।
4. **সংকল্প পূরণ করুন** — পুরো নাম, গোত্র, এবং অভিপ্রায়।
5. **নিরাপদে অর্থপ্রদান করুন** Razorpay এর মাধ্যমে।
6. **নিশ্চিতকরণ পান** ইমেল এবং WhatsApp এ BS-YYYYMMDD-XXXXX নম্বর সহ।
7. **ভিডিও প্রমাণ** আচার সম্পন্ন হওয়ার ${j} ঘন্টার মধ্যে আপলোড করা হবে।

## অর্থপ্রদানের আগে

নির্ধারিত সময়ের ${e.Pw} ঘন্টা বা তার আগে বাতিল করলে সম্পূর্ণ অর্থ ফেরত, ${e.qz}-${e.Pw} ঘন্টার মধ্যে ${e.lp}%। ${e.qz} ঘন্টার মধ্যে বাতিল করা যায় না।

## সাহায্য প্রয়োজন?

${n} এ ইমেল করুন বা WhatsApp এ আমাদের সাথে চ্যাট করুন।`,updatedAt:"2026-08-16",reviewed_by:null},{slug:"how-to-book-a-puja",lang:"mr",category:"puja-bookings",title:"मी पूजा कशी बुक करू?",summary:"पूजा पृष्ठ उघडा, मंदिर आणि तारीख निवडा, संकल्प फॉर्म भरा (तुमचे नाव, गोत्र, आणि हेतू), आणि पैसे द्या. तुम्हाला बुकिंग पुष्टीकरण मिळेल, आणि सत्यापित पंडित विधी करतील आणि "+j+" तासांच्या आत व्हिडिओ पुरावा शेअर करतील.",body:`## पायऱ्या

1. **पूजा पहा** [darshya.online/pujas](/pujas) येथे.
2. **मंदिर निवडा** सत्यापित यादीतून.
3. **तारीख आणि वेळ** निवडा — मुहूर्त सूचना दाखवल्या जातील.
4. **संकल्प भरा** — पूर्ण नाव, गोत्र, आणि हेतू.
5. **सुरक्षितपणे पैसे द्या** Razorpay द्वारे.
6. **पुष्टीकरण मिळवा** ईमेल आणि WhatsApp वर BS-YYYYMMDD-XXXXX क्रमांकासह.
7. **व्हिडिओ पुरावा** विधी पूर्ण झाल्यानंतर ${j} तासांच्या आत अपलोड केला जाईल.

## पैसे देण्यापूर्वी

नियोजित वेळेच्या ${e.Pw} तास किंवा त्याआधी रद्द केल्यास पूर्ण परतावा, ${e.qz}-${e.Pw} तासांदरम्यान ${e.lp}%. ${e.qz} तासांच्या आत रद्द करता येत नाही.

## मदत हवी आहे?

${n} वर ईमेल करा किंवा WhatsApp वर आमच्याशी संपर्क साधा.`,updatedAt:"2026-08-16",reviewed_by:null},{slug:"cancel-or-reschedule-a-puja",lang:"en",category:"payments-refunds",title:"Can I cancel or reschedule my puja?",summary:`Cancel ${e.Pw} hours or more before your slot for a full refund, or between ${e.qz} and ${e.Pw} hours before for ${e.lp}%. Within ${e.qz} hours the pandit is already assigned and samagri is being bought, so cancellation is not possible. If the pandit or temple cancels, you are refunded in full.`,body:`## How to cancel

1. Open **[your bookings](/bookings)** and select the puja.
2. Choose **Cancel**. The refund amount for your booking's timing is shown before you confirm.
3. If you cannot reach the page, email ${n} with your booking number (BS-YYYYMMDD-XXXXX).

## What you get back

- **${e.Pw} hours or more** before the scheduled time — 100% refund.
- **${e.qz} to ${e.Pw} hours** before — ${e.lp}% refund.
- **Within ${e.qz} hours** — cancellation is not possible. The pandit is assigned and samagri is being prepared, so the cost has already been incurred on your behalf.
- **Cancelled by the pandit or the temple** — 100% refund, whenever it happens.

A booking that has not been paid for yet can be abandoned at any time; nothing is charged.

## Rescheduling

Rescheduling is a request rather than a guarantee — it depends on the pandit's and the temple's availability for the slot you want. Ask from the booking in [your bookings](/bookings), or by email. If no suitable slot exists, cancel under the rules above instead.

## When the money arrives

Refunds go back to the method you paid with and take ${e.m7} to settle. See [When will my refund arrive?](/help/articles/en/when-will-my-refund-arrive) for the per-method bands, and the full [refund policy](/refunds) for store orders, donations and consultations.`,updatedAt:"2026-08-16"},{slug:"when-will-my-refund-arrive",lang:"en",category:"payments-refunds",title:"When will my refund arrive?",summary:`Once a refund is issued it returns to the method you paid with. ${e.Cg.map(a=>`${a.method}: ${a.label}`).join("; ")}. The clock starts when the refund is issued, not when you asked for it.`,body:`## By payment method

${e.Cg.map(a=>`- **${a.method}** — ${a.label}`).join("\n")}

These are settlement windows set by your bank, card issuer and the payment gateway, not promises from Darshya. Once the refund is issued, the wait after that is the card network or bank posting it back to you; an international card can take up to 14 business days.

## What "issued" means

A refund is issued when the cancellation is accepted — see [Can I cancel or reschedule my puja?](/help/articles/en/cancel-or-reschedule-a-puja) for what each cancellation window pays back. Until then, nothing has been sent, so there is nothing for your bank to post.

## If it has not arrived

1. Check the statement for the account or card the payment left from, not the one you use most.
2. Wait out the full band above — international cards are the slowest.
3. Still missing? Email ${n} with your booking or order number and the date you cancelled, and we will trace it with the payment gateway.`,updatedAt:"2026-08-16"},{slug:"video-proof-what-to-expect",lang:"en",category:"puja-bookings",title:"What is video proof, and when do I get it?",summary:`Every puja booking includes a recording of your ritual. The target is ${d.Kq.refunds.videoProofTargetLabel} after the ceremony, and it appears on the booking itself. If ${k} hours pass with no video and the booking is still waiting on its pandit, it is cancelled and sent for manual review.`,body:`## What arrives

A recording of your puja being performed, with your sankalp read out. It is attached to the booking in [your bookings](/bookings) and stays there — you do not have to download it the day it lands.

## When

The delivery target is **${d.Kq.refunds.videoProofTargetLabel}** after the scheduled time. This is a target, not a guarantee with money behind it: temples upload from the premises, and a large festival day or a poor connection can push it out.

## If no video arrives

- After **${k} hours**, a booking that is still waiting on its assigned pandit is automatically cancelled and routed to our team for review. That review decides the refund; the sweep itself does not pay one out.
- A booking in any other state — one already marked completed, for example — needs a message from you. Email ${n} with the booking number.
- Where the pandit is at fault, the refund is 100% of everything you paid.

## Why it exists

Video proof is mandatory on every puja booking. It is the only way to show a devotee who cannot be present that the ritual named in their sankalp actually happened.`,updatedAt:"2026-08-16"},{slug:"payment-failed-money-deducted",lang:"en",category:"payments-refunds",title:"My payment failed but the money left my account",summary:`Almost always the amount was authorised, not captured — your bank is holding it and releases it on its own, typically within ${e.m7}. No booking is created and nothing is owed. If the amount was genuinely captured and no booking exists, email support with the payment reference and we return it.`,body:`## First, check whether a booking exists

Open [your bookings](/bookings). If the puja is listed and confirmed, the payment succeeded and the failure message was cosmetic — nothing further is needed.

## If there is no booking

The money is almost certainly an **authorisation**, not a charge: your bank has set the amount aside but we never collected it, so it is released automatically. That usually takes ${e.m7} and needs nothing from you. On a bank statement it often shows as pending rather than posted.

## Do not pay twice

Retrying is safe, but retry only once and check [your bookings](/bookings) between attempts — a second successful payment creates a second booking, which then has to be cancelled under the [cancellation rules](/help/articles/en/cancel-or-reschedule-a-puja).

## If it is still gone

After ${e.m7}, email ${n} with the date, the amount, the last four digits of the card or the UPI ID used, and the payment reference from your bank. We match it against the gateway and return anything that was actually captured.

## Common causes

Bank declined the transaction, two-factor authentication timed out, insufficient balance, an expired card, or an international card blocked for online use. Switching method — UPI instead of card, or the reverse — resolves most of them.`,updatedAt:"2026-08-16"},{slug:"track-your-store-order",lang:"en",category:"store-orders",title:"Where is my store order?",summary:`Every order and its current status lives in your orders page. Delivery is free on domestic orders of ${l} and above; below that a flat ${m}. Once an order is marked shipped, the tracking number is on the order itself.`,body:`## Find the order

Open **[your orders](/store/orders)**. Each row shows what stage the order is at.

## What the statuses mean

- **Pending** — the order is placed and payment is being confirmed.
- **Paid** — payment confirmed; the seller is preparing the parcel.
- **Shipped** — the parcel has left, and a tracking number is shown on the order.
- **Delivered** — the courier has marked it delivered.
- **Cancelled** — the order was cancelled; any refund follows the [refund timelines](/help/articles/en/when-will-my-refund-arrive).

## Delivery charges

Domestic orders of ${l} and above ship free. Below that a flat ${m} is added at checkout. Duties and taxes on international parcels are charged separately by the carrier and are not collected here.

## If it is late or has not moved

Check the tracking number first — most delays are with the courier rather than the seller. If tracking has not updated for several days, or the parcel arrived damaged or wrong, [raise a ticket](/support/ticket/new) with the order number and photographs where relevant.`,updatedAt:"2026-08-16"},{slug:"donation-receipts-and-tax-exemption",lang:"en",category:"general",title:"Do I get a receipt for my donation, and is it tax exempt?",summary:"You receive a receipt for every donation, with a receipt number and the date, sent to your registered email. It is proof of payment. It is not a tax-exemption certificate: the 80G registration is not on file yet, so no donation made today can be claimed as an 80G deduction.",body:`## The receipt

Every donation generates a receipt carrying a receipt number (format DR-YYYYMMDD-XXXX), the amount, the date, and what the donation was for. It is emailed to the address on your account and stays available from your donation history.

## What the receipt is not

It is **not** a tax-exemption certificate, and it does not carry an 80G registration number, because that registration is not yet on file. A receipt that named an exemption we cannot evidence would be worse than useless to you at assessment time, so we do not issue one.

Practically: treat a donation made today as a donation, not as a deduction. If your reason for giving is the tax benefit, wait — this page changes the day the registration is granted, and receipts will carry the number from that date onward.

## Corporate and CSR giving

CSR-1 registration is likewise not on file, so donations cannot currently be routed as CSR spend. Write to ${n} before planning any corporate contribution around a compliance requirement.

## Where the money goes

Gaushala and temple contributions are passed to the receiving institution. Ask at ${n} for a breakdown on any specific cause.`,updatedAt:"2026-08-16"}];function p(a,b){return o.find(c=>c.lang===a&&c.slug===b)}function q(a){return o.filter(b=>b.lang===a)}function r(a,b){return o.filter(c=>c.lang===a&&c.category===b)}function s(){let a={en:0,hi:0,ta:0,te:0,bn:0,mr:0};for(let b of o)a[b.lang]++;return{total:o.length,topics:new Set(o.map(a=>a.slug)).size,byLang:a}}}};