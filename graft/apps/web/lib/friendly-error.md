# apps\web\lib\friendly-error.ts

- isAuthError · function · L9-L13 — Detects whether an error message indicates an auth/session failure (401/403-style) so the UI can prompt re-authentication.
- isRateLimitError · function · L16-L18 — Detects whether an error message indicates rate limiting (429-style) so the UI can tell the user to wait and retry.
- friendlyApiError · function · L25-L57 — Classifies any thrown API/HTTP error into a friendly message plus a reauth flag, with auth failures checked first so expired sessions trigger a sign-in prompt.
