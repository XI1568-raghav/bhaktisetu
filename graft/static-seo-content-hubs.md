---
name: Static SEO Content Hubs
slug: static-seo-content-hubs
type: system
sources:
  - path: 'apps\web\app\gita\[chapter]\page.tsx'
    hash: c3611d4c0c2cb08ba8848deeaf4eda77cb8fca2de1013e499c3ae11d506d30e8
  - path: apps\web\app\gita\page.tsx
    hash: 82f8548824c710cfb5690179a22a37902f6f67666bfbc6b018f2f743e0e6d055
  - path: 'apps\web\app\hindu-philosophies\[slug]\page.tsx'
    hash: 192b0941b799ebbeac10d004368d4439ac6974225a378230cd6de53f310435cb
  - path: apps\web\app\hindu-philosophies\page.tsx
    hash: 9b7db5e1567825effb68c36e3d66eb3df975e4a87639cef833040974336410d4
  - path: 'apps\web\app\hindu-symbols\[slug]\page.tsx'
    hash: f357e426b2bf405a6df097cd2bfd7908d0e5674459b482f3275feae14a95a79c
  - path: apps\web\app\hindu-symbols\page.tsx
    hash: 440ebce8fd5bf6875e0e81853ccef30b89efac5e98be2fc8933a4e90438f441c
  - path: 'apps\web\app\jyotirlinga\[slug]\page.tsx'
    hash: b031b3b3cf22d335c76d1e01f4bb24ce4c5da25c05818d02ba5c1a36166b2e8e
  - path: apps\web\app\jyotirlinga\page.tsx
    hash: 665b8a8670fbb06cf6f54820652c82ebd8c73da9cd0712abea484b457d82cb3d
sources_digest: 5ec994d03de520e02ff01e8d887a8663b300228ab207b7f507b1fff155a11b48
links:
  - to: isr-json-ld-seo-architecture
    relation: implements
    description: >-
      revalidate=86400, hardcoded BASE_URL https://darshya.online, schema.org
      JSON-LD blobs, prev/next derived from data-array position
generator:
  version: 1
covers:
  - symbol: generateStaticParams
    kind: function
    at: 'apps\web\app\gita\[chapter]\page.tsx:L11-L13'
  - symbol: generateMetadata
    kind: function
    at: 'apps\web\app\gita\[chapter]\page.tsx:L15-L30'
  - symbol: GitaChapterPage
    kind: function
    at: 'apps\web\app\gita\[chapter]\page.tsx:L32-L146'
  - symbol: GitaIndexPage
    kind: function
    at: 'apps\web\app\gita\page.tsx:L27-L125'
  - symbol: generateMetadata
    kind: function
    at: 'apps\web\app\hindu-philosophies\[slug]\page.tsx:L15-L40'
  - symbol: HinduPhilosophyDetailPage
    kind: function
    at: 'apps\web\app\hindu-philosophies\[slug]\page.tsx:L42-L185'
  - symbol: HinduPhilosophiesIndexPage
    kind: function
    at: 'apps\web\app\hindu-philosophies\page.tsx:L23-L140'
  - symbol: Props
    kind: interface
    at: 'apps\web\app\hindu-symbols\[slug]\page.tsx:L10-L10'
  - symbol: generateMetadata
    kind: function
    at: 'apps\web\app\hindu-symbols\[slug]\page.tsx:L20-L35'
  - symbol: HinduSymbolDetailPage
    kind: function
    at: 'apps\web\app\hindu-symbols\[slug]\page.tsx:L37-L184'
  - symbol: HinduSymbolsIndexPage
    kind: function
    at: 'apps\web\app\hindu-symbols\page.tsx:L40-L144'
  - symbol: generateStaticParams
    kind: function
    at: 'apps\web\app\jyotirlinga\[slug]\page.tsx:L11-L13'
  - symbol: Props
    kind: interface
    at: 'apps\web\app\jyotirlinga\[slug]\page.tsx:L15-L15'
  - symbol: generateMetadata
    kind: function
    at: 'apps\web\app\jyotirlinga\[slug]\page.tsx:L17-L32'
  - symbol: JyotirlingaPage
    kind: function
    at: 'apps\web\app\jyotirlinga\[slug]\page.tsx:L34-L209'
  - symbol: JyotirlingaIndexPage
    kind: function
    at: 'apps\web\app\jyotirlinga\page.tsx:L22-L104'
---
<!-- context:generated:start -->
## Summary

Four content hubs (Gita's 18 chapters, 10 Hindu philosophies, 12 Hindu symbols, 12 Jyotirlingas) sharing one architecture: a lib/* data module is the single source of truth, rendered as index + [slug] pages with daily ISR and JSON-LD injected via dangerouslySetInnerHTML. Inconsistency to know: gita and jyotirlinga use generateStaticParams + dynamicParams=false (route set locked at build, unknown slugs 404), while philosophies and symbols omit generateStaticParams and render on demand. Gotchas: the gita index builds Tailwind classes by dynamic interpolation (border-${sec.color}-200) which static extraction will purge, and gita's JSON-LD datePublished is a hardcoded '2026-05-27' string that never tracks content changes.

## Related

- implements [[isr-json-ld-seo-architecture]] — revalidate=86400, hardcoded BASE_URL https://darshya.online, schema.org JSON-LD blobs, prev/next derived from data-array position
<!-- context:generated:end -->

## Notes

_Anything written below the generated block is preserved when the graph is regenerated._
