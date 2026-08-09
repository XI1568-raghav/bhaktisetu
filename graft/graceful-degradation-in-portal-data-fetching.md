---
name: Graceful degradation in portal data fetching
slug: graceful-degradation-in-portal-data-fetching
type: concept
sources:
  - path: apps\web\app\gaushala-portal\page.tsx
    hash: 8f01a5574b786844f4699242fa8609c7b94d75a33c7855122fa7c596152dc754
  - path: apps\web\app\gaushala-portal\profile\page.tsx
    hash: d42ce243671c64f8b0de43eb4f816ed3ffd2a6af8736826b7cdcf2a6486ea360
  - path: apps\web\app\gaushala-portal\volunteers\page.tsx
    hash: f6b82621af846e3d8ab2865771bc23202976f48fd657b029caa5119402fbfdcf
sources_digest: 52bad477c397b033fea07ccc66561d620f9ce47463624cefb101d0f532445145
links: []
generator:
  version: 1
covers:
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

Portal screens intentionally swallow fetch failures: non-OK responses or exceptions leave zeroed stats, blank forms, or stale lists rather than surfacing errors, and mutations trigger a full refetch instead of optimistic updates. The one deliberate counter-move is P0 #AP-07: demo-session tokens are still sent to the API (accepted in non-production) because the old startsWith('demo-') skip left demo managers on zeroed stats and hid real backend bugs.
<!-- context:generated:end -->

## Notes

_Anything written below the generated block is preserved when the graph is regenerated._
