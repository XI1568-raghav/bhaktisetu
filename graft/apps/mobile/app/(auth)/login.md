# apps\mobile\app\(auth)\login.tsx

- Tab · type · L20-L20 — Union type distinguishing the two login methods (email vs phone OTP) shown as tabs.
- LoginScreen · function · L33-L224 — Renders the login UI with tabbed email/password and phone-OTP forms, delegating actual authentication to the auth context and navigation to the root redirect.
- handleEmailLogin · function · L41-L58 — Validates non-empty credentials, performs email/password sign-in, and on success hands off to the root index which role-redirects the freshly authenticated user.
- handlePhoneSubmit · function · L60-L75 — Enforces the 10-digit Indian mobile format, normalizes it to E.164 with the +91 prefix, and sends the OTP before navigating to the code-verification screen.
- fillDemo · function · L77-L80 — Prefills the form with a selected demo account's email and the shared demo password for quick role-based testing.
