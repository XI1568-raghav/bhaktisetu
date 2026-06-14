// Multilingual self-serve help center article registry.
// Spec: docs/roadmap/items/Q3/cs/002-multilingual-self-serve-help-center-en-hi-ta-te-bn.md
// Handoff: docs/cs/R-Q3-CS-002-handoff.md
//
// Target: 50 articles × 6 languages (en/hi/ta/te/bn/mr) = 300 total.
// This file scaffolds the schema + seed articles. Remaining articles are
// authored incrementally by the content sub-agent cycle per the handoff doc.

export type HelpLang = "en" | "hi" | "ta" | "te" | "bn" | "mr";

export const HELP_LANGS: { code: HelpLang; label: string; native: string }[] = [
 { code: "en", label: "English", native: "English" },
 { code: "hi", label: "Hindi", native: "हिन्दी" },
 { code: "ta", label: "Tamil", native: "தமிழ்" },
 { code: "te", label: "Telugu", native: "తెలుగు" },
 { code: "bn", label: "Bengali", native: "বাংলা" },
 { code: "mr", label: "Marathi", native: "मराठी" },
];

export type HelpCategory =
 | "puja-bookings"
 | "live-darshan"
 | "store-orders"
 | "payments-refunds"
 | "account-profile"
 | "general";

export const HELP_CATEGORIES: { id: HelpCategory; en: string }[] = [
 { id: "puja-bookings", en: "Puja Bookings" },
 { id: "live-darshan", en: "Live Darshan" },
 { id: "store-orders", en: "Store & Orders" },
 { id: "payments-refunds", en: "Payments & Refunds" },
 { id: "account-profile", en: "Account & Profile" },
 { id: "general", en: "General" },
];

export interface HelpArticle {
 slug: string;
 lang: HelpLang;
 category: HelpCategory;
 title: string;
 // 30-80 word answer — Google rich-snippet eligibility.
 summary: string;
 // Full markdown body (lazy: pulled when reader opens article).
 body: string;
 updatedAt: string;
 // Native-speaker review attestation. null = pending review (non-en seed translations).
 reviewed_by?: string | null;
}

// Seed articles — one per language, all covering the highest-volume support
// ticket topic: "How do I book a puja?" Validates the schema across all 6
// languages + scripts (Latin, Devanagari, Tamil, Telugu, Bengali, Marathi).
export const HELP_ARTICLES: HelpArticle[] = [
 {
 slug: "how-to-book-a-puja",
 lang: "en",
 category: "puja-bookings",
 title: "How do I book a puja?",
 summary:
 "Open the puja page, pick a temple and date, fill in the sankalp form (your name, gotra, and intent), and pay. You'll receive a booking confirmation, and a verified pandit performs the ritual with video proof shared within 24 hours.",
 body: `## Steps

1. **Browse pujas** at [darshya.online/pujas](/pujas).
2. **Pick a temple** from the verified list — every temple shows trust score, location, and pandit credentials.
3. **Choose date & time** that fits the auspicious window for your puja (we show muhurat suggestions).
4. **Fill sankalp** — your full name, gotra (lineage), and the intent (e.g., health, prosperity, ancestral blessing).
5. **Pay securely** via Razorpay (India) or Stripe (NRI). Indian and dual-currency pricing both supported.
6. **Receive confirmation** by email and WhatsApp with your booking number (format: BS-YYYYMMDD-XXXXX).
7. **Video proof** is uploaded within 24 hours of the ritual completing.

## What's included

- Verified pandit performance
- Full ritual recording (video proof)
- Prasad delivery (where temple offers it)
- 80G receipt (eligible donations)

## Need help?

Email support@darshya.online or chat with us on WhatsApp.`,
 updatedAt: "2026-06-14",
 },
 {
 slug: "how-to-book-a-puja",
 lang: "hi",
 category: "puja-bookings",
 title: "मैं पूजा कैसे बुक करूं?",
 summary:
 "पूजा पेज खोलें, मंदिर और तारीख चुनें, संकल्प फॉर्म भरें (अपना नाम, गोत्र, और मनोकामना), और भुगतान करें। आपको बुकिंग पुष्टि मिलेगी, और एक सत्यापित पंडित अनुष्ठान करेगा। 24 घंटे के भीतर वीडियो प्रमाण साझा किया जाएगा।",
 body: `## चरण

1. **पूजा देखें** [darshya.online/pujas](/pujas) पर।
2. **मंदिर चुनें** सत्यापित सूची से — हर मंदिर का विश्वास स्कोर, स्थान और पंडित प्रमाण-पत्र दिखाया जाता है।
3. **तारीख और समय** चुनें जो आपकी पूजा के शुभ मुहूर्त में हो।
4. **संकल्प भरें** — पूरा नाम, गोत्र, और मनोकामना (जैसे स्वास्थ्य, समृद्धि, पितृ-आशीर्वाद)।
5. **सुरक्षित भुगतान** Razorpay (भारत) या Stripe (NRI) के माध्यम से करें।
6. **पुष्टि प्राप्त करें** ईमेल और WhatsApp पर बुकिंग संख्या (BS-YYYYMMDD-XXXXX) के साथ।
7. **वीडियो प्रमाण** अनुष्ठान पूरा होने के 24 घंटे के भीतर अपलोड किया जाता है।

## क्या शामिल है

- सत्यापित पंडित द्वारा अनुष्ठान
- पूरा अनुष्ठान वीडियो (वीडियो प्रमाण)
- प्रसाद वितरण (जहां मंदिर प्रदान करे)
- 80G रसीद (पात्र दान)

## सहायता चाहिए?

support@darshya.online पर ईमेल करें या WhatsApp पर हमसे बात करें।`,
 updatedAt: "2026-06-14",
 reviewed_by: null,
 },
 {
 slug: "how-to-book-a-puja",
 lang: "ta",
 category: "puja-bookings",
 title: "பூஜையை எவ்வாறு பதிவு செய்வது?",
 summary:
 "பூஜை பக்கத்தை திறந்து, கோயில் மற்றும் தேதியை தேர்வுசெய்து, சங்கல்ப படிவத்தை நிரப்பி (உங்கள் பெயர், கோத்திரம், எண்ணம்), மற்றும் கட்டணம் செலுத்துங்கள். நீங்கள் பதிவு உறுதியை பெறுவீர்கள், சரிபார்க்கப்பட்ட பண்டிட் சடங்கை செய்து 24 மணி நேரத்திற்குள் வீடியோ ஆதாரம் வழங்குவார்.",
 body: `## படிகள்

1. **பூஜைகளை பார்க்கவும்** [darshya.online/pujas](/pujas) இல்.
2. **கோயிலை தேர்வுசெய்யவும்** சரிபார்க்கப்பட்ட பட்டியலில் இருந்து.
3. **தேதி மற்றும் நேரத்தை** தேர்வுசெய்யவும் — முகூர்த்த ஆலோசனைகள் காட்டப்படும்.
4. **சங்கல்பத்தை நிரப்பவும்** — முழுப் பெயர், கோத்திரம், எண்ணம் (உதா: ஆரோக்கியம், செழிப்பு).
5. **பாதுகாப்பாக கட்டணம் செலுத்தவும்** Razorpay (இந்தியா) அல்லது Stripe (NRI) வழியாக.
6. **உறுதியை பெறவும்** மின்னஞ்சல் மற்றும் WhatsApp மூலம் BS-YYYYMMDD-XXXXX எண்ணுடன்.
7. **வீடியோ ஆதாரம்** சடங்கு முடிந்த 24 மணி நேரத்திற்குள் பதிவேற்றப்படும்.

## உதவி தேவையா?

support@darshya.online க்கு மின்னஞ்சல் அனுப்பவும் அல்லது WhatsApp இல் எங்களைத் தொடர்பு கொள்ளவும்.`,
 updatedAt: "2026-06-14",
 reviewed_by: null,
 },
 {
 slug: "how-to-book-a-puja",
 lang: "te",
 category: "puja-bookings",
 title: "పూజను ఎలా బుక్ చేయాలి?",
 summary:
 "పూజ పేజీని తెరిచి, దేవాలయం మరియు తేదీని ఎంచుకుని, సంకల్ప ఫారమ్‌ను నింపి (మీ పేరు, గోత్రం, మరియు ఉద్దేశ్యం), మరియు చెల్లించండి. మీరు బుకింగ్ నిర్ధారణను అందుకుంటారు, మరియు ధృవీకరించబడిన పండిట్ ఆచారాన్ని నిర్వహించి 24 గంటలలోపు వీడియో రుజువును పంచుకుంటారు.",
 body: `## దశలు

1. **పూజలను బ్రౌజ్ చేయండి** [darshya.online/pujas](/pujas) వద్ద.
2. **దేవాలయాన్ని ఎంచుకోండి** ధృవీకరించబడిన జాబితా నుండి.
3. **తేదీ & సమయాన్ని** ఎంచుకోండి — ముహూర్త సూచనలు చూపబడతాయి.
4. **సంకల్పాన్ని పూరించండి** — పూర్తి పేరు, గోత్రం, మరియు ఉద్దేశ్యం.
5. **సురక్షితంగా చెల్లించండి** Razorpay (భారతదేశం) లేదా Stripe (NRI) ద్వారా.
6. **నిర్ధారణను అందుకోండి** ఇమెయిల్ మరియు WhatsApp ద్వారా BS-YYYYMMDD-XXXXX నంబర్‌తో.
7. **వీడియో రుజువు** ఆచారం పూర్తయిన 24 గంటలలోపు అప్‌లోడ్ చేయబడుతుంది.

## సహాయం కావాలా?

support@darshya.online కి ఇమెయిల్ చేయండి లేదా WhatsApp లో మమ్మల్ని సంప్రదించండి.`,
 updatedAt: "2026-06-14",
 reviewed_by: null,
 },
 {
 slug: "how-to-book-a-puja",
 lang: "bn",
 category: "puja-bookings",
 title: "আমি কীভাবে একটি পূজা বুক করব?",
 summary:
 "পূজা পৃষ্ঠাটি খুলুন, একটি মন্দির এবং তারিখ নির্বাচন করুন, সংকল্প ফর্মটি পূরণ করুন (আপনার নাম, গোত্র, এবং অভিপ্রায়), এবং অর্থপ্রদান করুন। আপনি একটি বুকিং নিশ্চিতকরণ পাবেন, এবং একজন যাচাইকৃত পন্ডিত আচার সম্পাদন করবেন এবং 24 ঘন্টার মধ্যে ভিডিও প্রমাণ শেয়ার করবেন।",
 body: `## ধাপ

1. **পূজা ব্রাউজ করুন** [darshya.online/pujas](/pujas) এ।
2. **মন্দির নির্বাচন করুন** যাচাইকৃত তালিকা থেকে।
3. **তারিখ ও সময়** নির্বাচন করুন — মুহূর্ত পরামর্শ দেখানো হবে।
4. **সংকল্প পূরণ করুন** — পুরো নাম, গোত্র, এবং অভিপ্রায়।
5. **নিরাপদে অর্থপ্রদান করুন** Razorpay (ভারত) বা Stripe (NRI) এর মাধ্যমে।
6. **নিশ্চিতকরণ পান** ইমেল এবং WhatsApp এ BS-YYYYMMDD-XXXXX নম্বর সহ।
7. **ভিডিও প্রমাণ** আচার সম্পন্ন হওয়ার 24 ঘন্টার মধ্যে আপলোড করা হবে।

## সাহায্য প্রয়োজন?

support@darshya.online এ ইমেল করুন বা WhatsApp এ আমাদের সাথে চ্যাট করুন।`,
 updatedAt: "2026-06-14",
 reviewed_by: null,
 },
 {
 slug: "how-to-book-a-puja",
 lang: "mr",
 category: "puja-bookings",
 title: "मी पूजा कशी बुक करू?",
 summary:
 "पूजा पृष्ठ उघडा, मंदिर आणि तारीख निवडा, संकल्प फॉर्म भरा (तुमचे नाव, गोत्र, आणि हेतू), आणि पैसे द्या. तुम्हाला बुकिंग पुष्टीकरण मिळेल, आणि सत्यापित पंडित विधी करतील आणि 24 तासांच्या आत व्हिडिओ पुरावा शेअर करतील.",
 body: `## पायऱ्या

1. **पूजा पहा** [darshya.online/pujas](/pujas) येथे.
2. **मंदिर निवडा** सत्यापित यादीतून.
3. **तारीख आणि वेळ** निवडा — मुहूर्त सूचना दाखवल्या जातील.
4. **संकल्प भरा** — पूर्ण नाव, गोत्र, आणि हेतू.
5. **सुरक्षितपणे पैसे द्या** Razorpay (भारत) किंवा Stripe (NRI) द्वारे.
6. **पुष्टीकरण मिळवा** ईमेल आणि WhatsApp वर BS-YYYYMMDD-XXXXX क्रमांकासह.
7. **व्हिडिओ पुरावा** विधी पूर्ण झाल्यानंतर 24 तासांच्या आत अपलोड केला जाईल.

## मदत हवी आहे?

support@darshya.online वर ईमेल करा किंवा WhatsApp वर आमच्याशी संपर्क साधा.`,
 updatedAt: "2026-06-14",
 reviewed_by: null,
 },
];

export function getHelpArticle(
 lang: HelpLang,
 slug: string,
): HelpArticle | undefined {
 return HELP_ARTICLES.find((a) => a.lang === lang && a.slug === slug);
}

export function getHelpArticlesByLang(lang: HelpLang): HelpArticle[] {
 return HELP_ARTICLES.filter((a) => a.lang === lang);
}

export function getHelpArticlesByCategory(
 lang: HelpLang,
 category: HelpCategory,
): HelpArticle[] {
 return HELP_ARTICLES.filter(
 (a) => a.lang === lang && a.category === category,
 );
}

export function getHelpArticleCount(): {
 total: number;
 byLang: Record<HelpLang, number>;
} {
 const byLang: Record<HelpLang, number> = {
 en: 0,
 hi: 0,
 ta: 0,
 te: 0,
 bn: 0,
 mr: 0,
 };
 for (const a of HELP_ARTICLES) byLang[a.lang]++;
 return { total: HELP_ARTICLES.length, byLang };
}
