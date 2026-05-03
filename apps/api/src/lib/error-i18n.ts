/**
 * Localized error messages for API responses.
 *
 * Why: API errors were English-only; Indian users on Hindi/Tamil/Telugu/Kannada
 * locales saw raw English in toasts. We expose 30 stable error codes and
 * translate them into the 5 supported languages. Anything not in the map
 * falls back to English; an unknown code falls back to a generic message.
 *
 * Usage:
 *   const lang = pickLang(req.headers['accept-language'], req.query.lang);
 *   reply.code(400).send({ error: { code: 'INVALID_BODY', message: localizedError('INVALID_BODY', lang) } });
 */

export type SupportedLang = 'en' | 'hi' | 'ta' | 'te' | 'kn';

export const SUPPORTED_LANGS: readonly SupportedLang[] = ['en', 'hi', 'ta', 'te', 'kn'] as const;

export type ErrorCode =
  | 'INVALID_BODY'
  | 'INVALID_QUERY'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  | 'BOOKING_NOT_FOUND'
  | 'BOOKING_ALREADY_CANCELLED'
  | 'BOOKING_LOCKED'
  | 'PUJA_UNAVAILABLE'
  | 'PUJA_NOT_FOUND'
  | 'TEMPLE_NOT_VERIFIED'
  | 'PAYMENT_FAILED'
  | 'PAYMENT_PENDING'
  | 'PAYMENT_SIGNATURE_INVALID'
  | 'REFUND_TOO_LATE'
  | 'REFUND_NOT_ALLOWED'
  | 'INVALID_OTP'
  | 'OTP_EXPIRED'
  | 'OTP_RATE_LIMITED'
  | 'EMAIL_TAKEN'
  | 'PHONE_TAKEN'
  | 'INVALID_CREDENTIALS'
  | 'ACCOUNT_DISABLED'
  | 'KYC_REQUIRED'
  | 'AADHAAR_NOT_VERIFIED'
  | 'CONSULTATION_FULL'
  | 'SLOT_UNAVAILABLE'
  | 'CART_EMPTY';

type Catalog = Record<ErrorCode, string>;

const en: Catalog = {
  INVALID_BODY: 'The request body is invalid.',
  INVALID_QUERY: 'One or more query parameters are invalid.',
  UNAUTHORIZED: 'Please sign in to continue.',
  FORBIDDEN: 'You do not have permission to do that.',
  NOT_FOUND: 'The requested resource was not found.',
  RATE_LIMITED: 'Too many requests. Please slow down and try again.',
  INTERNAL_ERROR: 'Something went wrong on our end.',
  BOOKING_NOT_FOUND: 'Booking not found.',
  BOOKING_ALREADY_CANCELLED: 'This booking has already been cancelled.',
  BOOKING_LOCKED: 'This booking can no longer be modified.',
  PUJA_UNAVAILABLE: 'This puja is not available right now.',
  PUJA_NOT_FOUND: 'Puja not found.',
  TEMPLE_NOT_VERIFIED: 'This temple has not been verified yet.',
  PAYMENT_FAILED: 'Payment failed. Please try again or use a different method.',
  PAYMENT_PENDING: 'Your payment is still being processed.',
  PAYMENT_SIGNATURE_INVALID: 'Payment verification failed.',
  REFUND_TOO_LATE: 'Refunds are only allowed up to 24 hours before the scheduled time.',
  REFUND_NOT_ALLOWED: 'This booking is not eligible for a refund.',
  INVALID_OTP: 'The OTP you entered is incorrect.',
  OTP_EXPIRED: 'This OTP has expired. Please request a new one.',
  OTP_RATE_LIMITED: 'Too many OTP requests. Try again in a few minutes.',
  EMAIL_TAKEN: 'An account with this email already exists.',
  PHONE_TAKEN: 'An account with this phone number already exists.',
  INVALID_CREDENTIALS: 'Invalid email or password.',
  ACCOUNT_DISABLED: 'This account has been disabled.',
  KYC_REQUIRED: 'KYC verification is required for this action.',
  AADHAAR_NOT_VERIFIED: 'Aadhaar verification pending — payouts are paused.',
  CONSULTATION_FULL: 'This consultation slot is full.',
  SLOT_UNAVAILABLE: 'The selected time slot is no longer available.',
  CART_EMPTY: 'Your cart is empty.',
};

const hi: Catalog = {
  INVALID_BODY: 'अनुरोध का डेटा अमान्य है।',
  INVALID_QUERY: 'एक या अधिक क्वेरी पैरामीटर अमान्य हैं।',
  UNAUTHORIZED: 'जारी रखने के लिए कृपया साइन इन करें।',
  FORBIDDEN: 'आपके पास यह करने की अनुमति नहीं है।',
  NOT_FOUND: 'अनुरोधित संसाधन नहीं मिला।',
  RATE_LIMITED: 'बहुत अधिक अनुरोध। कृपया कुछ देर बाद पुनः प्रयास करें।',
  INTERNAL_ERROR: 'हमारी ओर से कुछ गड़बड़ हुई है।',
  BOOKING_NOT_FOUND: 'बुकिंग नहीं मिली।',
  BOOKING_ALREADY_CANCELLED: 'यह बुकिंग पहले ही रद्द कर दी गई है।',
  BOOKING_LOCKED: 'यह बुकिंग अब बदली नहीं जा सकती।',
  PUJA_UNAVAILABLE: 'यह पूजा अभी उपलब्ध नहीं है।',
  PUJA_NOT_FOUND: 'पूजा नहीं मिली।',
  TEMPLE_NOT_VERIFIED: 'यह मंदिर अभी सत्यापित नहीं हुआ है।',
  PAYMENT_FAILED: 'भुगतान विफल रहा। कृपया दोबारा कोशिश करें।',
  PAYMENT_PENDING: 'आपका भुगतान अभी भी प्रसंस्करण में है।',
  PAYMENT_SIGNATURE_INVALID: 'भुगतान सत्यापन विफल।',
  REFUND_TOO_LATE: 'रिफंड केवल निर्धारित समय से 24 घंटे पहले तक संभव है।',
  REFUND_NOT_ALLOWED: 'यह बुकिंग रिफंड के योग्य नहीं है।',
  INVALID_OTP: 'आपने जो OTP दर्ज किया है वह गलत है।',
  OTP_EXPIRED: 'यह OTP समाप्त हो गया है। कृपया नया अनुरोध करें।',
  OTP_RATE_LIMITED: 'बहुत अधिक OTP अनुरोध। कुछ मिनटों में पुनः प्रयास करें।',
  EMAIL_TAKEN: 'इस ईमेल से पहले से ही खाता मौजूद है।',
  PHONE_TAKEN: 'इस फोन नंबर से पहले से ही खाता मौजूद है।',
  INVALID_CREDENTIALS: 'अमान्य ईमेल या पासवर्ड।',
  ACCOUNT_DISABLED: 'यह खाता निष्क्रिय कर दिया गया है।',
  KYC_REQUIRED: 'इस क्रिया के लिए KYC सत्यापन आवश्यक है।',
  AADHAAR_NOT_VERIFIED: 'आधार सत्यापन लंबित — भुगतान रोक दिए गए हैं।',
  CONSULTATION_FULL: 'यह परामर्श स्लॉट भरा हुआ है।',
  SLOT_UNAVAILABLE: 'चुना गया समय स्लॉट अब उपलब्ध नहीं है।',
  CART_EMPTY: 'आपकी कार्ट खाली है।',
};

const ta: Catalog = {
  INVALID_BODY: 'கோரிக்கை தரவு தவறானது.',
  INVALID_QUERY: 'ஒன்று அல்லது அதற்கு மேற்பட்ட வினவல் அளவுருக்கள் தவறானவை.',
  UNAUTHORIZED: 'தொடர உள்நுழையவும்.',
  FORBIDDEN: 'இதைச் செய்ய உங்களுக்கு அனுமதி இல்லை.',
  NOT_FOUND: 'கோரப்பட்ட வளம் கிடைக்கவில்லை.',
  RATE_LIMITED: 'அதிகமான கோரிக்கைகள். சிறிது நேரம் கழித்து முயற்சிக்கவும்.',
  INTERNAL_ERROR: 'எங்கள் பக்கத்தில் ஏதோ தவறு ஏற்பட்டது.',
  BOOKING_NOT_FOUND: 'முன்பதிவு கிடைக்கவில்லை.',
  BOOKING_ALREADY_CANCELLED: 'இந்த முன்பதிவு ஏற்கனவே ரத்து செய்யப்பட்டது.',
  BOOKING_LOCKED: 'இந்த முன்பதிவை இனி மாற்ற முடியாது.',
  PUJA_UNAVAILABLE: 'இந்த பூஜை இப்போது கிடைக்கவில்லை.',
  PUJA_NOT_FOUND: 'பூஜை கிடைக்கவில்லை.',
  TEMPLE_NOT_VERIFIED: 'இந்த கோவில் இன்னும் சரிபார்க்கப்படவில்லை.',
  PAYMENT_FAILED: 'கட்டணம் தோல்வியடைந்தது. மீண்டும் முயற்சிக்கவும்.',
  PAYMENT_PENDING: 'உங்கள் கட்டணம் இன்னும் செயலாக்கப்படுகிறது.',
  PAYMENT_SIGNATURE_INVALID: 'கட்டணம் சரிபார்ப்பு தோல்வியடைந்தது.',
  REFUND_TOO_LATE: 'திட்டமிடப்பட்ட நேரத்திற்கு 24 மணிநேரம் முன்பு வரை மட்டுமே பணத்தைத் திரும்பப் பெற முடியும்.',
  REFUND_NOT_ALLOWED: 'இந்த முன்பதிவுக்கு பணத்தைத் திரும்பப் பெற முடியாது.',
  INVALID_OTP: 'நீங்கள் உள்ளிட்ட OTP தவறானது.',
  OTP_EXPIRED: 'இந்த OTP காலாவதியானது. புதியதைக் கோரவும்.',
  OTP_RATE_LIMITED: 'அதிகமான OTP கோரிக்கைகள். சில நிமிடங்களில் மீண்டும் முயற்சிக்கவும்.',
  EMAIL_TAKEN: 'இந்த மின்னஞ்சலில் ஏற்கனவே ஒரு கணக்கு உள்ளது.',
  PHONE_TAKEN: 'இந்த தொலைபேசி எண்ணில் ஏற்கனவே ஒரு கணக்கு உள்ளது.',
  INVALID_CREDENTIALS: 'தவறான மின்னஞ்சல் அல்லது கடவுச்சொல்.',
  ACCOUNT_DISABLED: 'இந்த கணக்கு முடக்கப்பட்டுள்ளது.',
  KYC_REQUIRED: 'இந்த செயலுக்கு KYC சரிபார்ப்பு தேவை.',
  AADHAAR_NOT_VERIFIED: 'ஆதார் சரிபார்ப்பு நிலுவையில் உள்ளது — பணம் செலுத்துதல் இடைநிறுத்தப்பட்டுள்ளது.',
  CONSULTATION_FULL: 'இந்த ஆலோசனை இடம் நிரம்பியுள்ளது.',
  SLOT_UNAVAILABLE: 'தேர்ந்தெடுக்கப்பட்ட நேர இடம் இனி கிடைக்கவில்லை.',
  CART_EMPTY: 'உங்கள் கூடை காலியாக உள்ளது.',
};

const te: Catalog = {
  INVALID_BODY: 'అభ్యర్థన డేటా చెల్లదు.',
  INVALID_QUERY: 'ఒకటి లేదా అంతకంటే ఎక్కువ క్వెరీ పారామితులు చెల్లవు.',
  UNAUTHORIZED: 'కొనసాగించడానికి దయచేసి సైన్ ఇన్ చేయండి.',
  FORBIDDEN: 'దీన్ని చేయడానికి మీకు అనుమతి లేదు.',
  NOT_FOUND: 'అభ్యర్థించిన వనరు కనుగొనబడలేదు.',
  RATE_LIMITED: 'చాలా అభ్యర్థనలు. దయచేసి కొద్దిసేపటి తర్వాత మళ్లీ ప్రయత్నించండి.',
  INTERNAL_ERROR: 'మా వైపు ఏదో తప్పు జరిగింది.',
  BOOKING_NOT_FOUND: 'బుకింగ్ కనుగొనబడలేదు.',
  BOOKING_ALREADY_CANCELLED: 'ఈ బుకింగ్ ఇప్పటికే రద్దు చేయబడింది.',
  BOOKING_LOCKED: 'ఈ బుకింగ్‌ను ఇకపై మార్చలేరు.',
  PUJA_UNAVAILABLE: 'ఈ పూజ ప్రస్తుతం అందుబాటులో లేదు.',
  PUJA_NOT_FOUND: 'పూజ కనుగొనబడలేదు.',
  TEMPLE_NOT_VERIFIED: 'ఈ ఆలయం ఇంకా ధృవీకరించబడలేదు.',
  PAYMENT_FAILED: 'చెల్లింపు విఫలమైంది. దయచేసి మళ్లీ ప్రయత్నించండి.',
  PAYMENT_PENDING: 'మీ చెల్లింపు ఇంకా ప్రాసెస్ అవుతోంది.',
  PAYMENT_SIGNATURE_INVALID: 'చెల్లింపు ధృవీకరణ విఫలమైంది.',
  REFUND_TOO_LATE: 'షెడ్యూల్ చేసిన సమయానికి 24 గంటల ముందు వరకు మాత్రమే రీఫండ్‌లు అనుమతించబడతాయి.',
  REFUND_NOT_ALLOWED: 'ఈ బుకింగ్ రీఫండ్‌కు అర్హత లేదు.',
  INVALID_OTP: 'మీరు నమోదు చేసిన OTP తప్పు.',
  OTP_EXPIRED: 'ఈ OTP గడువు ముగిసింది. దయచేసి కొత్తదాన్ని అభ్యర్థించండి.',
  OTP_RATE_LIMITED: 'చాలా OTP అభ్యర్థనలు. కొన్ని నిమిషాల్లో మళ్లీ ప్రయత్నించండి.',
  EMAIL_TAKEN: 'ఈ ఇమెయిల్‌తో ఇప్పటికే ఖాతా ఉంది.',
  PHONE_TAKEN: 'ఈ ఫోన్ నంబర్‌తో ఇప్పటికే ఖాతా ఉంది.',
  INVALID_CREDENTIALS: 'చెల్లని ఇమెయిల్ లేదా పాస్‌వర్డ్.',
  ACCOUNT_DISABLED: 'ఈ ఖాతా నిలిపివేయబడింది.',
  KYC_REQUIRED: 'ఈ చర్యకు KYC ధృవీకరణ అవసరం.',
  AADHAAR_NOT_VERIFIED: 'ఆధార్ ధృవీకరణ పెండింగ్‌లో ఉంది — చెల్లింపులు నిలిపివేయబడ్డాయి.',
  CONSULTATION_FULL: 'ఈ సంప్రదింపు స్లాట్ నిండి ఉంది.',
  SLOT_UNAVAILABLE: 'ఎంచుకున్న సమయ స్లాట్ ఇకపై అందుబాటులో లేదు.',
  CART_EMPTY: 'మీ కార్ట్ ఖాళీగా ఉంది.',
};

const kn: Catalog = {
  INVALID_BODY: 'ವಿನಂತಿಯ ಡೇಟಾ ಅಮಾನ್ಯವಾಗಿದೆ.',
  INVALID_QUERY: 'ಒಂದು ಅಥವಾ ಹೆಚ್ಚಿನ ಪ್ರಶ್ನೆ ನಿಯತಾಂಕಗಳು ಅಮಾನ್ಯವಾಗಿವೆ.',
  UNAUTHORIZED: 'ಮುಂದುವರಿಸಲು ದಯವಿಟ್ಟು ಸೈನ್ ಇನ್ ಮಾಡಿ.',
  FORBIDDEN: 'ಇದನ್ನು ಮಾಡಲು ನಿಮಗೆ ಅನುಮತಿ ಇಲ್ಲ.',
  NOT_FOUND: 'ವಿನಂತಿಸಿದ ಸಂಪನ್ಮೂಲ ಸಿಗಲಿಲ್ಲ.',
  RATE_LIMITED: 'ಹಲವಾರು ವಿನಂತಿಗಳು. ದಯವಿಟ್ಟು ಸ್ವಲ್ಪ ಸಮಯದ ನಂತರ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
  INTERNAL_ERROR: 'ನಮ್ಮ ಕಡೆ ಏನೋ ತಪ್ಪಾಗಿದೆ.',
  BOOKING_NOT_FOUND: 'ಬುಕಿಂಗ್ ಸಿಗಲಿಲ್ಲ.',
  BOOKING_ALREADY_CANCELLED: 'ಈ ಬುಕಿಂಗ್ ಈಗಾಗಲೇ ರದ್ದುಗೊಳಿಸಲಾಗಿದೆ.',
  BOOKING_LOCKED: 'ಈ ಬುಕಿಂಗ್ ಅನ್ನು ಇನ್ನು ಮಾರ್ಪಡಿಸಲಾಗುವುದಿಲ್ಲ.',
  PUJA_UNAVAILABLE: 'ಈ ಪೂಜೆ ಈಗ ಲಭ್ಯವಿಲ್ಲ.',
  PUJA_NOT_FOUND: 'ಪೂಜೆ ಸಿಗಲಿಲ್ಲ.',
  TEMPLE_NOT_VERIFIED: 'ಈ ದೇವಸ್ಥಾನವನ್ನು ಇನ್ನೂ ಪರಿಶೀಲಿಸಲಾಗಿಲ್ಲ.',
  PAYMENT_FAILED: 'ಪಾವತಿ ವಿಫಲವಾಯಿತು. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
  PAYMENT_PENDING: 'ನಿಮ್ಮ ಪಾವತಿ ಇನ್ನೂ ಪ್ರಕ್ರಿಯೆಗೊಳ್ಳುತ್ತಿದೆ.',
  PAYMENT_SIGNATURE_INVALID: 'ಪಾವತಿ ಪರಿಶೀಲನೆ ವಿಫಲವಾಯಿತು.',
  REFUND_TOO_LATE: 'ನಿಗದಿತ ಸಮಯಕ್ಕೆ 24 ಗಂಟೆಗಳ ಮೊದಲು ಮಾತ್ರ ಮರುಪಾವತಿಗಳನ್ನು ಅನುಮತಿಸಲಾಗಿದೆ.',
  REFUND_NOT_ALLOWED: 'ಈ ಬುಕಿಂಗ್ ಮರುಪಾವತಿಗೆ ಅರ್ಹವಾಗಿಲ್ಲ.',
  INVALID_OTP: 'ನೀವು ನಮೂದಿಸಿದ OTP ತಪ್ಪಾಗಿದೆ.',
  OTP_EXPIRED: 'ಈ OTP ಅವಧಿ ಮೀರಿದೆ. ದಯವಿಟ್ಟು ಹೊಸದನ್ನು ವಿನಂತಿಸಿ.',
  OTP_RATE_LIMITED: 'ಹಲವಾರು OTP ವಿನಂತಿಗಳು. ಕೆಲವು ನಿಮಿಷಗಳಲ್ಲಿ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
  EMAIL_TAKEN: 'ಈ ಇಮೇಲ್‌ನೊಂದಿಗೆ ಈಗಾಗಲೇ ಖಾತೆ ಅಸ್ತಿತ್ವದಲ್ಲಿದೆ.',
  PHONE_TAKEN: 'ಈ ಫೋನ್ ಸಂಖ್ಯೆಯೊಂದಿಗೆ ಈಗಾಗಲೇ ಖಾತೆ ಅಸ್ತಿತ್ವದಲ್ಲಿದೆ.',
  INVALID_CREDENTIALS: 'ಅಮಾನ್ಯ ಇಮೇಲ್ ಅಥವಾ ಪಾಸ್‌ವರ್ಡ್.',
  ACCOUNT_DISABLED: 'ಈ ಖಾತೆಯನ್ನು ನಿಷ್ಕ್ರಿಯಗೊಳಿಸಲಾಗಿದೆ.',
  KYC_REQUIRED: 'ಈ ಕ್ರಿಯೆಗೆ KYC ಪರಿಶೀಲನೆ ಅಗತ್ಯವಿದೆ.',
  AADHAAR_NOT_VERIFIED: 'ಆಧಾರ್ ಪರಿಶೀಲನೆ ಬಾಕಿ — ಪಾವತಿಗಳನ್ನು ತಡೆಹಿಡಿಯಲಾಗಿದೆ.',
  CONSULTATION_FULL: 'ಈ ಸಮಾಲೋಚನಾ ಸ್ಲಾಟ್ ಭರ್ತಿಯಾಗಿದೆ.',
  SLOT_UNAVAILABLE: 'ಆಯ್ಕೆ ಮಾಡಿದ ಸಮಯ ಸ್ಲಾಟ್ ಇನ್ನು ಲಭ್ಯವಿಲ್ಲ.',
  CART_EMPTY: 'ನಿಮ್ಮ ಕಾರ್ಟ್ ಖಾಲಿಯಾಗಿದೆ.',
};

const CATALOGS: Record<SupportedLang, Catalog> = { en, hi, ta, te, kn };

export const ERROR_CODES = Object.keys(en) as ErrorCode[];

/**
 * Pick the best supported language from an Accept-Language header value
 * and/or an explicit `?lang=` override. Explicit wins; otherwise we walk
 * the q-weighted list and return the first hit. Defaults to 'en'.
 */
export function pickLang(
  acceptLanguage: string | string[] | undefined,
  override?: string | string[] | undefined
): SupportedLang {
  const ov = Array.isArray(override) ? override[0] : override;
  if (ov && isSupported(ov.toLowerCase())) {
    return ov.toLowerCase() as SupportedLang;
  }
  const header = Array.isArray(acceptLanguage) ? acceptLanguage[0] : acceptLanguage;
  if (!header) return 'en';
  // Parse "hi-IN,hi;q=0.9,en;q=0.8" → [{tag:'hi-in',q:1},...]
  const parts = header.split(',').map((raw) => {
    const [tag, ...params] = raw.trim().split(';');
    let q = 1;
    for (const p of params) {
      const m = p.trim().match(/^q=([0-9.]+)$/i);
      if (m && m[1]) q = parseFloat(m[1]);
    }
    return { tag: (tag ?? '').trim().toLowerCase(), q };
  });
  parts.sort((a, b) => b.q - a.q);
  for (const { tag } of parts) {
    if (!tag) continue;
    const primary = tag.split('-')[0];
    if (primary && isSupported(primary)) return primary as SupportedLang;
  }
  return 'en';
}

function isSupported(s: string): s is SupportedLang {
  return (SUPPORTED_LANGS as readonly string[]).includes(s);
}

/**
 * Translate an error code into the requested language. Falls back to
 * English for any code/lang we don't know about, so callers never get
 * an empty string.
 */
export function localizedError(code: ErrorCode | string, lang: SupportedLang | string = 'en'): string {
  const lng = (isSupported(String(lang).toLowerCase()) ? String(lang).toLowerCase() : 'en') as SupportedLang;
  const cat = CATALOGS[lng] ?? en;
  const enCat = en;
  const c = code as ErrorCode;
  return cat[c] ?? enCat[c] ?? 'Something went wrong.';
}

/**
 * Build the standardized error envelope. Use this in route handlers:
 *   reply.code(400).send(buildErrorResponse('INVALID_BODY', lang, { fields }));
 */
export function buildErrorResponse(
  code: ErrorCode | string,
  lang: SupportedLang | string = 'en',
  details?: unknown
) {
  const message = localizedError(code, lang);
  const body: { error: { code: string; message: string; details?: unknown } } = {
    error: { code: String(code), message },
  };
  if (details !== undefined) body.error.details = details;
  return body;
}
