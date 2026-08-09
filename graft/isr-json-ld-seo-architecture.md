---
name: ISR + JSON-LD SEO architecture
slug: isr-json-ld-seo-architecture
type: concept
sources:
  - path: apps\web\app\gift\page.tsx
    hash: 146bd8d93e4913905ccfda4d731ec82bc3a45276ca5833aacafb7dff90bdce49
  - path: 'apps\web\app\gita\[chapter]\page.tsx'
    hash: c3611d4c0c2cb08ba8848deeaf4eda77cb8fca2de1013e499c3ae11d506d30e8
  - path: apps\web\app\gita\page.tsx
    hash: 82f8548824c710cfb5690179a22a37902f6f67666bfbc6b018f2f743e0e6d055
  - path: 'apps\web\app\help\articles\[lang]\[slug]\page.tsx'
    hash: 86c789436f17b3b62837ba75f7ef552ca1ee3df4231609e6cade84b3755f0a44
  - path: apps\web\app\hindu-philosophies\page.tsx
    hash: 9b7db5e1567825effb68c36e3d66eb3df975e4a87639cef833040974336410d4
  - path: 'apps\web\app\hindu-symbols\[slug]\page.tsx'
    hash: f357e426b2bf405a6df097cd2bfd7908d0e5674459b482f3275feae14a95a79c
  - path: 'apps\web\app\jyotirlinga\[slug]\page.tsx'
    hash: b031b3b3cf22d335c76d1e01f4bb24ce4c5da25c05818d02ba5c1a36166b2e8e
  - path: apps\web\app\jyotirlinga\page.tsx
    hash: 665b8a8670fbb06cf6f54820652c82ebd8c73da9cd0712abea484b457d82cb3d
sources_digest: 2c541275e620a45420d97de58cae32e616a2ecac72df8d3a72a63218e09b4fc3
links: []
generator:
  version: 1
covers:
  - symbol: GiftPujaPage
    kind: function
    at: 'apps\web\app\gift\page.tsx:L60-L155'
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
  - symbol: Params
    kind: type
    at: 'apps\web\app\help\articles\[lang]\[slug]\page.tsx:L20-L20'
  - symbol: generateMetadata
    kind: function
    at: 'apps\web\app\help\articles\[lang]\[slug]\page.tsx:L22-L58'
  - symbol: generateStaticParams
    kind: function
    at: 'apps\web\app\help\articles\[lang]\[slug]\page.tsx:L60-L62'
  - symbol: renderMarkdown
    kind: function
    at: 'apps\web\app\help\articles\[lang]\[slug]\page.tsx:L64-L138'
  - symbol: closeList
    kind: function
    at: 'apps\web\app\help\articles\[lang]\[slug]\page.tsx:L71-L80'
  - symbol: escapeHtml
    kind: function
    at: 'apps\web\app\help\articles\[lang]\[slug]\page.tsx:L140-L145'
  - symbol: renderInline
    kind: function
    at: 'apps\web\app\help\articles\[lang]\[slug]\page.tsx:L147-L156'
  - symbol: HelpArticlePage
    kind: function
    at: 'apps\web\app\help\articles\[lang]\[slug]\page.tsx:L158-L268'
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

Content pages share a fixed SEO recipe: revalidate=86400 (daily ISR), a hardcoded BASE_URL of https://darshya.online baked into canonical/OG/JSON-LD URLs (must be edited everywhere if the domain changes), schema.org blobs injected via dangerouslySetInnerHTML, and cross-links between hubs as a deliberate internal-linking strategy. Where generateStaticParams is combined with dynamicParams=false the route set is locked at build time, which silently turns runtime fallbacks into dead code.
<!-- context:generated:end -->

## Notes

_Anything written below the generated block is preserved when the graph is regenerated._
