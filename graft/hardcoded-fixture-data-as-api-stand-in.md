---
name: Hardcoded fixture data as API stand-in
slug: hardcoded-fixture-data-as-api-stand-in
type: concept
sources:
  - path: 'apps\web\app\gaushala\[id]\page.tsx'
    hash: 02e5832447f98cffcd99d5f9db4f3fa1d4f54916baf3fb33a0dc745a24d6acda
  - path: apps\web\app\gaushala\page.tsx
    hash: 88ec9700d4a58dabaaf64eb1675b67797e7cc629992ff6879160497ac495fc3d
sources_digest: f2620fa7eefafd86eff960d920b30b6080238698f8d97e3ebbfc55989ed5b3fc
links: []
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

Several public pages ship in-file fixture arrays annotated 'matches API' instead of fetching, so the frontend can drift from the backend without any type checking catching it. Combined with dynamicParams=false this produces real dead code (the defaultCow fallback can never render) and missing routes are papered over by linking to existing ones (gaushala cards point at cow detail pages because /gaushala/[gsId] was never built, ticket P1 #214).
<!-- context:generated:end -->

## Notes

_Anything written below the generated block is preserved when the graph is regenerated._
