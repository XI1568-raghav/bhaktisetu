# apps\web\lib\sentry.ts

Lazily loads the Sentry browser SDK from the CDN and initializes it with the app's DSN so client-side errors can be reported without bundling the SDK.

- Window · interface · L2-L7 — Declares the minimal shape of the Sentry browser SDK global so TypeScript can safely use the CDN-injected window.Sentry object.
- initSentryBrowser · function · L12-L33 — Ensures the Sentry browser SDK is injected and initialized exactly once, only in the browser and only when a DSN is configured, with privacy-conscious defaults (5% trace sampling, no PII).
- captureBrowserException · function · L35-L38 — Forwards an error to the CDN-loaded Sentry SDK if present, attaching optional context as Sentry 'extra' data.
