# apps\api\src\lib\error-i18n.ts

- SupportedLang · type · L14-L14 — type SupportedLang = 'en' | 'hi' | 'ta' | 'te' | 'kn';
- ErrorCode · type · L18-L48 — type ErrorCode = | 'INVALID_BODY' | 'INVALID_QUERY' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'RATE_LIMITED' | 'INTERNAL_ERROR' | 'BOOKING_NOT_FOUND' | 'BOOKING_ALREADY_CANCELLED' | 'BOOKING_LOCKED' | 'PUJA_UNAVAILABLE' | 'PUJA_NOT_FOUND' | 'TEMPLE_NOT_VERIFIED' | 'PAYMENT_FAILED' | 'PAYMENT_PENDING' | 'PAYMENT_SIGNATURE_INVALID' | 'REFUND_TOO_LATE' | 'REFUND_NOT_ALLOWED' | 'INVALID_OTP' | 'OTP_EXPIRED' | 'OTP_RATE_LIMITED' | 'EMAIL_TAKEN' | 'PHONE_TAKEN' | 'INVALID_CREDENTIALS' | 'ACCOUNT_DISABLED' | 'KYC_REQUIRED' | 'AADHAAR_NOT_VERIFIED' | 'CONSULTATION_FULL' | 'SLOT_UNAVAILABLE' | 'CART_EMPTY';
- Catalog · type · L50-L50 — type Catalog = Record<ErrorCode, string>;
- pickLang · function · L226-L253 — function pickLang( acceptLanguage: string | string[] | undefined, override?: string | string[] | undefined ): SupportedLang
- isSupported · function · L255-L257 — function isSupported(s: string): s is SupportedLang
- localizedError · function · L264-L270 — function localizedError(code: ErrorCode | string, lang: SupportedLang | string = 'en'): string
- buildErrorResponse · function · L276-L287 — function buildErrorResponse( code: ErrorCode | string, lang: SupportedLang | string = 'en', details?: unknown )
