---
name: Gaushala Cow Adoption Pages
slug: gaushala-cow-adoption-pages
type: system
sources:
  - path: 'apps\web\app\gaushala\[id]\page.tsx'
    hash: 02e5832447f98cffcd99d5f9db4f3fa1d4f54916baf3fb33a0dc745a24d6acda
  - path: apps\web\app\gaushala\page.tsx
    hash: 88ec9700d4a58dabaaf64eb1675b67797e7cc629992ff6879160497ac495fc3d
sources_digest: f2620fa7eefafd86eff960d920b30b6080238698f8d97e3ebbfc55989ed5b3fc
links:
  - to: hardcoded-fixture-data-as-api-stand-in
    relation: implements
    description: >-
      allCows/adoptionPlans/gaushalaInfo fixtures; dynamicParams=false
      prerenders only 8 IDs making the defaultCow fallback unreachable dead code
generator:
  version: 1
covers:
  - symbol: generateStaticParams
    kind: function
    at: 'apps\web\app\gaushala\[id]\page.tsx:L4-L6'
  - symbol: healthBadge
    kind: function
    at: 'apps\web\app\gaushala\[id]\page.tsx:L383-L409'
  - symbol: formatDate
    kind: function
    at: 'apps\web\app\gaushala\[id]\page.tsx:L411-L418'
  - symbol: CowDetailPage
    kind: function
    at: 'apps\web\app\gaushala\[id]\page.tsx:L422-L731'
  - symbol: healthBadge
    kind: function
    at: 'apps\web\app\gaushala\page.tsx:L250-L276'
  - symbol: GaushalaPage
    kind: function
    at: 'apps\web\app\gaushala\page.tsx:L280-L692'
---
<!-- context:generated:start -->
## Summary

Public marketing + cow-detail pages for the Gau Seva adoption feature, rendered entirely from in-file fixture data (8 cows, 4 adoption tiers, gaushala contact map) with a comment claiming it 'matches API'. Because /gaushala/[gsId] does not exist (ticket P1 #214), each gaushala card links to one of its cows' detail pages to avoid 404s. Donate/plan CTAs are Links into /donations carrying causeId, causeKind=gaushala, causeName and planId query params (they replaced dead buttons so users pay real amounts via Razorpay with 80G receipts), while Share and Gift buttons remain non-functional.

## Related

- implements [[hardcoded-fixture-data-as-api-stand-in]] — allCows/adoptionPlans/gaushalaInfo fixtures; dynamicParams=false prerenders only 8 IDs making the defaultCow fallback unreachable dead code
<!-- context:generated:end -->

## Notes

_Anything written below the generated block is preserved when the graph is regenerated._
