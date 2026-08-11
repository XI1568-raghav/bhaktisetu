# apps\web\components\ReferralCapture.tsx

- readCookie · function · L11-L17 — Safely reads a named browser cookie value, handling SSR environments where document is unavailable.
- writeCookie · function · L19-L24 — Writes a cookie with expiry, SameSite=Lax, and Secure-on-HTTPS so referral codes persist across pages for the attribution window.
- ReferralCapture · function · L30-L93 — Invisible component that captures ?ref=CODE into a cookie on landing and, once the user authenticates, idempotently posts it to /referrals/claim with localStorage dedupe.
