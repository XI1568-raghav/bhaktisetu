# apps\web\lib\posthog.ts

- Window · interface · L17-L28 — Type-only declaration of the minimal window.posthog API surface this app relies on; pure typing with no runtime logic.
- PostHogScript · function · L31-L49 — Injects the PostHog js-lite loader after page interactive only when the public key exists, defaulting to the EU host for GDPR-friendly data storage and staying inert otherwise.
- capture · function · L51-L54 — Sends a custom analytics event only when PostHog actually loaded, silently no-oping on the server or when analytics is disabled.
- identify · function · L56-L59 — Associates subsequent events with a known user id only when PostHog is available, no-op otherwise.
- reset · function · L61-L64 — Clears the PostHog identity (e.g. on logout) only when the tracker is loaded, no-op otherwise.
