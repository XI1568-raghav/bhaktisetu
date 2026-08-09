---
name: Gurukul Directory & Admission Application
slug: gurukul-directory-admission-application
type: system
sources:
  - path: 'apps\web\app\gurukuls\[slug]\GurukulDetailClient.tsx'
    hash: 06c5fad936600bc247ab68ac8aa3132314adc94615dfa42975ada0a92a50d5fd
  - path: 'apps\web\app\gurukuls\[slug]\page.tsx'
    hash: 338ec93266be77071005e735633fe025d494a0f930470e936fa3deb1f89f9de9
  - path: 'apps\web\app\gurukuls\apply\[programId]\ApplyClient.tsx'
    hash: eedb4b5eb4e785d635a161e8bc2ab56166031c2156f759a610d9a571d31aa574
  - path: 'apps\web\app\gurukuls\apply\[programId]\page.tsx'
    hash: a1b121aca1eaf13ede811f9300cbac8f6a6f0700b9f37ad43a919c12292ec788
  - path: apps\web\app\gurukuls\GurukulsListClient.tsx
    hash: 06f13d37c671b7645cf34d05be56a8138f2b44fe1ca6781ef34d4c2b56b76d7f
  - path: apps\web\app\gurukuls\page.tsx
    hash: 61dd6b73e2e80dfe1751ee0b40eec377b6ec20c6897345c12ba2ff5c3ad9d2a8
sources_digest: 1d57aa1c454f21e6773a0e0f448c91492938fcfa1ed4c1cf57113765bdad6ccf
links:
  - to: client-side-auth-api-base-url-resolution
    relation: uses
    description: >-
      apiBase() resolves NEXT_PUBLIC_API_URL with hardcoded
      https://api.darshya.online fallback; apply POSTs with Bearer accessToken
      from useAuth
  - to: thin-server-page-client-component-split
    relation: implements
    description: >-
      Each page.tsx is a metadata-only server wrapper delegating to a sibling
      *Client.tsx
generator:
  version: 1
covers:
  - symbol: Gurukul
    kind: interface
    at: 'apps\web\app\gurukuls\GurukulsListClient.tsx:L7-L13'
  - symbol: apiBase
    kind: function
    at: 'apps\web\app\gurukuls\GurukulsListClient.tsx:L15-L18'
  - symbol: GurukulsListClient
    kind: function
    at: 'apps\web\app\gurukuls\GurukulsListClient.tsx:L20-L96'
  - symbol: Program
    kind: interface
    at: 'apps\web\app\gurukuls\[slug]\GurukulDetailClient.tsx:L7-L10'
  - symbol: GurukulDetail
    kind: interface
    at: 'apps\web\app\gurukuls\[slug]\GurukulDetailClient.tsx:L12-L20'
  - symbol: apiBase
    kind: function
    at: 'apps\web\app\gurukuls\[slug]\GurukulDetailClient.tsx:L22-L25'
  - symbol: GurukulDetailClient
    kind: function
    at: 'apps\web\app\gurukuls\[slug]\GurukulDetailClient.tsx:L27-L96'
  - symbol: Params
    kind: interface
    at: 'apps\web\app\gurukuls\[slug]\page.tsx:L5-L5'
  - symbol: generateMetadata
    kind: function
    at: 'apps\web\app\gurukuls\[slug]\page.tsx:L7-L10'
  - symbol: GurukulDetailPage
    kind: function
    at: 'apps\web\app\gurukuls\[slug]\page.tsx:L12-L15'
  - symbol: apiBase
    kind: function
    at: 'apps\web\app\gurukuls\apply\[programId]\ApplyClient.tsx:L7-L10'
  - symbol: ApplyClient
    kind: function
    at: 'apps\web\app\gurukuls\apply\[programId]\ApplyClient.tsx:L12-L171'
  - symbol: handleSubmit
    kind: function
    at: 'apps\web\app\gurukuls\apply\[programId]\ApplyClient.tsx:L32-L80'
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

Public gurukul browsing plus the application form. The list refetches /api/v1/gurukuls on every keystroke (no debounce) and encodes boolean filters as the strings 'true'/''; detail pages fetch client-side only (no SSR) and special-case 404 as 'Not found'. The apply form's key logic is minor handling: isMinor = age<18 OR applicantType==='parent', which reveals a guardian fieldset, collects only the last 4 Aadhaar digits (full Aadhaar explicitly never stored), and gates submit on a DPDP Act 2023 consent checkbox; server error bodies are surfaced verbatim in the UI.

## Related

- uses [[client-side-auth-api-base-url-resolution]] — apiBase() resolves NEXT_PUBLIC_API_URL with hardcoded https://api.darshya.online fallback; apply POSTs with Bearer accessToken from useAuth
- implements [[thin-server-page-client-component-split]] — Each page.tsx is a metadata-only server wrapper delegating to a sibling *Client.tsx
<!-- context:generated:end -->

## Notes

_Anything written below the generated block is preserved when the graph is regenerated._
