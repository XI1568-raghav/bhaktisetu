---
name: Gaushala Manager Portal
slug: gaushala-manager-portal
type: system
sources:
  - path: apps\web\app\gaushala-portal\layout.tsx
    hash: 589b2d27c0a4bac34e3e15caa3899c2c31e2cf187f07aa9031552a7252164720
  - path: apps\web\app\gaushala-portal\messages\page.tsx
    hash: 3d5a1ae05a992d4c4e2656e4ffa15532e1deb36ba5c872715e9d98e4f2106674
  - path: apps\web\app\gaushala-portal\page.tsx
    hash: 8f01a5574b786844f4699242fa8609c7b94d75a33c7855122fa7c596152dc754
  - path: apps\web\app\gaushala-portal\profile\page.tsx
    hash: d42ce243671c64f8b0de43eb4f816ed3ffd2a6af8736826b7cdcf2a6486ea360
  - path: apps\web\app\gaushala-portal\volunteers\page.tsx
    hash: f6b82621af846e3d8ab2865771bc23202976f48fd657b029caa5119402fbfdcf
sources_digest: 48f54eaa615fb4a88c7ba5b843bca9af6116af5f0565964997a469618a6fe2fc
links:
  - to: client-side-auth-api-base-url-resolution
    relation: uses
    description: >-
      AuthGuard role gate plus useAuth session token sent as Bearer to
      API_BASE_URL from lib/api-config on every endpoint call
  - to: graceful-degradation-in-portal-data-fetching
    relation: implements
    description: >-
      Failed dashboard/profile/volunteer fetches are silently swallowed leaving
      zeroed stats or blank forms; demo tokens are fetched anyway per P0 #AP-07
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
  - symbol: GaushalaMessagesPage
    kind: function
    at: 'apps\web\app\gaushala-portal\messages\page.tsx:L5-L13'
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
  - symbol: Profile
    kind: type
    at: 'apps\web\app\gaushala-portal\profile\page.tsx:L9-L17'
  - symbol: GaushalProfilePage
    kind: function
    at: 'apps\web\app\gaushala-portal\profile\page.tsx:L19-L25'
  - symbol: Content
    kind: function
    at: 'apps\web\app\gaushala-portal\profile\page.tsx:L27-L213'
  - symbol: handleSave
    kind: function
    at: 'apps\web\app\gaushala-portal\profile\page.tsx:L80-L108'
  - symbol: ReadOnly
    kind: function
    at: 'apps\web\app\gaushala-portal\profile\page.tsx:L215-L225'
  - symbol: Editable
    kind: function
    at: 'apps\web\app\gaushala-portal\profile\page.tsx:L227-L238'
  - symbol: DocRow
    kind: function
    at: 'apps\web\app\gaushala-portal\profile\page.tsx:L240-L254'
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
---
<!-- context:generated:start -->
## Summary

Role-gated dashboard shell for cow-shelter managers: the layout wraps every child page in a client-side AuthGuard (allowedRoles=['gaushala_manager']) and an off-canvas-below-lg sidebar whose CowIcon is still an empty placeholder span. The dashboard fetches /gaushala-portal/dashboard and /provider-kyc and deliberately does NOT skip demo tokens (P0 #AP-07 — skipping left demo managers on zeroed stats and masked backend bugs); the profile page reuses the dashboard payload instead of a dedicated profile GET, converts empty strings to undefined on PATCH, and sends users to /provider/kyc (a provider-portal route) for documents. Volunteers does full refetch after every mutation and relies on browser confirm(); messages is a thin wrapper over the shared Inbox component with role="provider".

## Related

- uses [[client-side-auth-api-base-url-resolution]] — AuthGuard role gate plus useAuth session token sent as Bearer to API_BASE_URL from lib/api-config on every endpoint call
- implements [[graceful-degradation-in-portal-data-fetching]] — Failed dashboard/profile/volunteer fetches are silently swallowed leaving zeroed stats or blank forms; demo tokens are fetched anyway per P0 #AP-07
<!-- context:generated:end -->

## Notes

_Anything written below the generated block is preserved when the graph is regenerated._
