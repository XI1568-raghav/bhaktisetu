---
name: Client-side auth & API base URL resolution
slug: client-side-auth-api-base-url-resolution
type: concept
sources:
  - path: apps\web\app\gaushala-portal\layout.tsx
    hash: 589b2d27c0a4bac34e3e15caa3899c2c31e2cf187f07aa9031552a7252164720
  - path: apps\web\app\gaushala-portal\page.tsx
    hash: 8f01a5574b786844f4699242fa8609c7b94d75a33c7855122fa7c596152dc754
  - path: apps\web\app\gaushala-portal\volunteers\page.tsx
    hash: f6b82621af846e3d8ab2865771bc23202976f48fd657b029caa5119402fbfdcf
  - path: apps\web\app\gift\GiftPujaForm.tsx
    hash: ef02b21b4d0d17168375b1a58f128504162e4f9bb10b7dd299d4ed681744b1de
  - path: apps\web\app\gurukul-portal\applications\ApplicationsClient.tsx
    hash: 15ab04b67c6d29f3344ea6f38f479828c2e9bcfda93c8f2353eebc7bab5b2e01
  - path: apps\web\app\gurukul-portal\GurukulPortalClient.tsx
    hash: 508861fbe0b6b47a2341c4bd32e872aca3b8ec83d83611d274dc8fae9d1403d1
  - path: 'apps\web\app\gurukuls\apply\[programId]\ApplyClient.tsx'
    hash: eedb4b5eb4e785d635a161e8bc2ab56166031c2156f759a610d9a571d31aa574
  - path: apps\web\app\gurukuls\GurukulsListClient.tsx
    hash: 06f13d37c671b7645cf34d05be56a8138f2b44fe1ca6781ef34d4c2b56b76d7f
sources_digest: 894c933b26e1afac1537c2c2f3d423ed2df0ed0a4b119cd2abae96ada78907f9
links: []
generator:
  version: 1
covers:
  - symbol: CowIcon
    kind: function
    at: 'apps\web\app\gaushala-portal\layout.tsx:L20-L24'
  - symbol: GaushalaSidebar
    kind: function
    at: 'apps\web\app\gaushala-portal\layout.tsx:L35-L124'
  - symbol: isActive
    kind: function
    at: 'apps\web\app\gaushala-portal\layout.tsx:L45-L46'
  - symbol: GaushalPortalShell
    kind: function
    at: 'apps\web\app\gaushala-portal\layout.tsx:L126-L151'
  - symbol: GaushalPortalLayout
    kind: function
    at: 'apps\web\app\gaushala-portal\layout.tsx:L153-L159'
  - symbol: DashboardStats
    kind: type
    at: 'apps\web\app\gaushala-portal\page.tsx:L11-L16'
  - symbol: DashboardDonation
    kind: type
    at: 'apps\web\app\gaushala-portal\page.tsx:L18-L23'
  - symbol: DashboardCow
    kind: type
    at: 'apps\web\app\gaushala-portal\page.tsx:L25-L31'
  - symbol: formatInr
    kind: function
    at: 'apps\web\app\gaushala-portal\page.tsx:L33-L37'
  - symbol: relativeTime
    kind: function
    at: 'apps\web\app\gaushala-portal\page.tsx:L39-L47'
  - symbol: GaushalaDashboard
    kind: function
    at: 'apps\web\app\gaushala-portal\page.tsx:L56-L235'
  - symbol: Volunteer
    kind: type
    at: 'apps\web\app\gaushala-portal\volunteers\page.tsx:L9-L18'
  - symbol: VolunteersPage
    kind: function
    at: 'apps\web\app\gaushala-portal\volunteers\page.tsx:L27-L33'
  - symbol: VolunteersContent
    kind: function
    at: 'apps\web\app\gaushala-portal\volunteers\page.tsx:L35-L328'
  - symbol: load
    kind: function
    at: 'apps\web\app\gaushala-portal\volunteers\page.tsx:L54-L72'
  - symbol: handleAdd
    kind: function
    at: 'apps\web\app\gaushala-portal\volunteers\page.tsx:L79-L111'
  - symbol: toggleActive
    kind: function
    at: 'apps\web\app\gaushala-portal\volunteers\page.tsx:L113-L125'
  - symbol: remove
    kind: function
    at: 'apps\web\app\gaushala-portal\volunteers\page.tsx:L127-L139'
  - symbol: StatCard
    kind: function
    at: 'apps\web\app\gaushala-portal\volunteers\page.tsx:L330-L338'
  - symbol: Field
    kind: function
    at: 'apps\web\app\gaushala-portal\volunteers\page.tsx:L340-L352'
  - symbol: countNewThisMonth
    kind: function
    at: 'apps\web\app\gaushala-portal\volunteers\page.tsx:L354-L358'
  - symbol: Status
    kind: type
    at: 'apps\web\app\gift\GiftPujaForm.tsx:L8-L8'
  - symbol: GiftConfig
    kind: type
    at: 'apps\web\app\gift\GiftPujaForm.tsx:L10-L14'
  - symbol: CreateOrderResponse
    kind: type
    at: 'apps\web\app\gift\GiftPujaForm.tsx:L16-L26'
  - symbol: GiftPujaForm
    kind: function
    at: 'apps\web\app\gift\GiftPujaForm.tsx:L59-L343'
  - symbol: handleSubmit
    kind: function
    at: 'apps\web\app\gift\GiftPujaForm.tsx:L85-L166'
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
  - symbol: Gurukul
    kind: interface
    at: 'apps\web\app\gurukuls\GurukulsListClient.tsx:L7-L13'
  - symbol: apiBase
    kind: function
    at: 'apps\web\app\gurukuls\GurukulsListClient.tsx:L15-L18'
  - symbol: GurukulsListClient
    kind: function
    at: 'apps\web\app\gurukuls\GurukulsListClient.tsx:L20-L96'
  - symbol: apiBase
    kind: function
    at: 'apps\web\app\gurukuls\apply\[programId]\ApplyClient.tsx:L7-L10'
  - symbol: ApplyClient
    kind: function
    at: 'apps\web\app\gurukuls\apply\[programId]\ApplyClient.tsx:L12-L171'
  - symbol: handleSubmit
    kind: function
    at: 'apps\web\app\gurukuls\apply\[programId]\ApplyClient.tsx:L32-L80'
---
<!-- context:generated:start -->
## Summary

All authenticated browser code pulls session.accessToken from useAuth (lib/auth-context) and sends it as a Bearer token; route protection (AuthGuard allowedRoles) runs client-side, never as a server check, and unauthenticated users see a sign-in prompt rather than a redirect. Two competing base-URL strategies coexist: API_BASE_URL imported from lib/api-config (gaushala-portal, gift) versus reading NEXT_PUBLIC_API_URL with a hardcoded https://api.darshya.online fallback and trailing-slash strip (gurukuls, gurukul-portal) — changing one does not affect the other.
<!-- context:generated:end -->

## Notes

_Anything written below the generated block is preserved when the graph is regenerated._
