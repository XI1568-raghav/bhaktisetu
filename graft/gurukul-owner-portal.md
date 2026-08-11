---
name: Gurukul Owner Portal
slug: gurukul-owner-portal
type: system
sources:
  - path: apps\web\app\gurukul-portal\applications\ApplicationsClient.tsx
    hash: 15ab04b67c6d29f3344ea6f38f479828c2e9bcfda93c8f2353eebc7bab5b2e01
  - path: apps\web\app\gurukul-portal\applications\page.tsx
    hash: 448afcab6b81400ea0fd83a3763a365ec8874dcc689a307d9a61ae7f978aede5
  - path: apps\web\app\gurukul-portal\GurukulPortalClient.tsx
    hash: 508861fbe0b6b47a2341c4bd32e872aca3b8ec83d83611d274dc8fae9d1403d1
  - path: apps\web\app\gurukul-portal\page.tsx
    hash: 7a946fcc4d5dabda34738dd23e1f9fdf1c41676fc6bb6d92e472d16b23d59176
sources_digest: 75b8c32b1b21587000b5fab621c1d10393f35cb1fc225c871d1c1245199578cf
links:
  - to: client-side-auth-api-base-url-resolution
    relation: uses
    description: >-
      Bearer accessToken from useAuth against NEXT_PUBLIC_API_URL with
      production fallback
  - to: thin-server-page-client-component-split
    relation: implements
    description: >-
      page.tsx files exist only to export metadata; all behavior lives in
      GurukulPortalClient/ApplicationsClient
generator:
  version: 1
covers:
  - symbol: Gurukul
    kind: interface
    at: 'apps\web\app\gurukul-portal\GurukulPortalClient.tsx:L8-L12'
  - symbol: apiBase
    kind: function
    at: 'apps\web\app\gurukul-portal\GurukulPortalClient.tsx:L14-L17'
  - symbol: GurukulPortalClient
    kind: function
    at: 'apps\web\app\gurukul-portal\GurukulPortalClient.tsx:L19-L93'
  - symbol: Application
    kind: interface
    at: 'apps\web\app\gurukul-portal\applications\ApplicationsClient.tsx:L8-L23'
  - symbol: Decision
    kind: type
    at: 'apps\web\app\gurukul-portal\applications\ApplicationsClient.tsx:L25-L25'
  - symbol: apiBase
    kind: function
    at: 'apps\web\app\gurukul-portal\applications\ApplicationsClient.tsx:L27-L30'
  - symbol: ApplicationsClient
    kind: function
    at: 'apps\web\app\gurukul-portal\applications\ApplicationsClient.tsx:L40-L191'
  - symbol: decide
    kind: function
    at: 'apps\web\app\gurukul-portal\applications\ApplicationsClient.tsx:L60-L77'
  - symbol: ApplicationsPage
    kind: function
    at: 'apps\web\app\gurukul-portal\applications\page.tsx:L10-L12'
  - symbol: GurukulPortalPage
    kind: function
    at: 'apps\web\app\gurukul-portal\page.tsx:L10-L12'
---
<!-- context:generated:start -->
## Summary

Staff-side portal: a dashboard listing the caller's gurukuls from /api/v1/gurukuls/mine/list (fetch gated on session?.accessToken so no request fires before auth resolves) and an applications inbox. The applications review enforces the lifecycle in the UI — only 'submitted' applications can be forwarded, and action buttons disappear entirely once accepted/rejected/withdrawn; decide() merges the PATCH response into local state instead of refetching. Unauthenticated users get a sign-in prompt linking to /auth/login rather than a redirect, and decision notes are collected via browser prompt() with errors shown via alert().

## Related

- uses [[client-side-auth-api-base-url-resolution]] — Bearer accessToken from useAuth against NEXT_PUBLIC_API_URL with production fallback
- implements [[thin-server-page-client-component-split]] — page.tsx files exist only to export metadata; all behavior lives in GurukulPortalClient/ApplicationsClient
<!-- context:generated:end -->

## Notes

_Anything written below the generated block is preserved when the graph is regenerated._
