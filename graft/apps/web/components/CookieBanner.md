# apps\web\components\CookieBanner.tsx

- ConsentCategory · type · L5-L5 — type ConsentCategory = "essential" | "analytics" | "marketing";
- ConsentState · type · L7-L13 — type ConsentState = { essential: true; analytics: boolean; marketing: boolean; acceptedAt: string; version: number; };
- loadConsent · function · L19-L33 — function loadConsent(): ConsentState | null
- persistConsent · function · L35-L45 — function persistConsent(state: ConsentState)
- getStoredConsent · function · L47-L49 — function getStoredConsent(): ConsentState | null
- hasConsent · function · L51-L55 — function hasConsent(category: ConsentCategory): boolean
- CookieBanner · function · L57-L190 — function CookieBanner()
- save · function · L73-L86 — save = (next: { analytics: boolean; marketing: boolean })
