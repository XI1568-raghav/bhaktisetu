---
name: Global Error Boundary
slug: global-error-boundary
type: file
sources:
  - path: apps\web\app\global-error.tsx
    hash: 94dcef6d7674986e7be410c8d07e81911e9b91b7f1f4c913cef9e995a2d8ebb3
sources_digest: 6d2428332c975e7cc258beaf74319b100fc6cdb42bf86735944ed48af62a0e38
links: []
generator:
  version: 1
covers:
  - symbol: GlobalError
    kind: function
    at: 'apps\web\app\global-error.tsx:L6-L67'
---
<!-- context:generated:start -->
## Summary

App Router global-error.tsx: because it replaces the root layout during a fatal crash it must render its own <html> and <body>, so ALL styling is inline — Tailwind/global CSS cannot be trusted to load in this state. On mount it reports the error to Sentry (initSentryBrowser + captureBrowserException from lib/sentry) tagged with the Next.js digest, which is also shown in monospace for support. Kept deliberately dependency-light so the error page itself is unlikely to fail.
<!-- context:generated:end -->

## Notes

_Anything written below the generated block is preserved when the graph is regenerated._
