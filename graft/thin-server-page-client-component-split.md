---
name: Thin server page / client component split
slug: thin-server-page-client-component-split
type: concept
sources:
  - path: apps\web\app\gurukul-portal\applications\page.tsx
    hash: 448afcab6b81400ea0fd83a3763a365ec8874dcc689a307d9a61ae7f978aede5
  - path: apps\web\app\gurukul-portal\page.tsx
    hash: 7a946fcc4d5dabda34738dd23e1f9fdf1c41676fc6bb6d92e472d16b23d59176
  - path: 'apps\web\app\gurukuls\[slug]\page.tsx'
    hash: 338ec93266be77071005e735633fe025d494a0f930470e936fa3deb1f89f9de9
  - path: 'apps\web\app\gurukuls\apply\[programId]\page.tsx'
    hash: a1b121aca1eaf13ede811f9300cbac8f6a6f0700b9f37ad43a919c12292ec788
  - path: apps\web\app\gurukuls\page.tsx
    hash: 61dd6b73e2e80dfe1751ee0b40eec377b6ec20c6897345c12ba2ff5c3ad9d2a8
sources_digest: 1d6f7fedbd310b097fab99d0e6c1bb44d81dcd497c138615f834f7704a8b22bd
links: []
generator:
  version: 1
covers:
  - symbol: ApplicationsPage
    kind: function
    at: 'apps\web\app\gurukul-portal\applications\page.tsx:L10-L12'
  - symbol: GurukulPortalPage
    kind: function
    at: 'apps\web\app\gurukul-portal\page.tsx:L10-L12'
  - symbol: Params
    kind: interface
    at: 'apps\web\app\gurukuls\[slug]\page.tsx:L5-L5'
  - symbol: generateMetadata
    kind: function
    at: 'apps\web\app\gurukuls\[slug]\page.tsx:L7-L10'
  - symbol: GurukulDetailPage
    kind: function
    at: 'apps\web\app\gurukuls\[slug]\page.tsx:L12-L15'
  - symbol: Params
    kind: interface
    at: 'apps\web\app\gurukuls\apply\[programId]\page.tsx:L5-L5'
  - symbol: ApplyPage
    kind: function
    at: 'apps\web\app\gurukuls\apply\[programId]\page.tsx:L12-L15'
  - symbol: GurukulsPage
    kind: function
    at: 'apps\web\app\gurukuls\page.tsx:L10-L22'
---
<!-- context:generated:start -->
## Summary

Convention across the gurukul routes: page.tsx stays a server component solely because client components cannot export metadata, awaits the params Promise (Next.js 15 style), and delegates every bit of interactivity to a sibling *Client.tsx. When looking for behavior, always read the Client file — the page.tsx files contain no logic by design.
<!-- context:generated:end -->

## Notes

_Anything written below the generated block is preserved when the graph is regenerated._
