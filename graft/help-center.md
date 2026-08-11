---
name: Help Center
slug: help-center
type: system
sources:
  - path: 'apps\web\app\help\articles\[lang]\[slug]\page.tsx'
    hash: 86c789436f17b3b62837ba75f7ef552ca1ee3df4231609e6cade84b3755f0a44
  - path: apps\web\app\help\page.tsx
    hash: 3696409a39d074e435e2a83c8199533fecb8552bdba4d275e362f949664d499b
sources_digest: 37f6c1fe31c9d8510c70c1d6c7645bbed794173a1fc67c290eaa39b70cc2caea
links:
  - to: isr-json-ld-seo-architecture
    relation: implements
    description: >-
      generateStaticParams + revalidate=86400 + Article/BreadcrumbList JSON-LD
      with canonical URLs
generator:
  version: 1
covers:
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
  - symbol: HelpPage
    kind: function
    at: 'apps\web\app\help\page.tsx:L96-L255'
---
<!-- context:generated:start -->
## Summary

Static support directory plus prerendered multilingual articles. The /help search input is purely decorative — as a server component with no handlers, typing does nothing, and category links just route to /support/faq?q=<question>. The articles page prerenders one route per entry from lib/help-articles with hreflang alternates matched by slug across languages, and renders content through a hand-rolled minimal markdown pipeline (escape HTML first, then only headings/lists/bold/links) injected via dangerouslySetInnerHTML — safe only for trusted in-repo content. Edge runtime is deliberately avoided because @opennextjs/cloudflare needs the Node runtime via nodejs_compat.

## Related

- implements [[isr-json-ld-seo-architecture]] — generateStaticParams + revalidate=86400 + Article/BreadcrumbList JSON-LD with canonical URLs
<!-- context:generated:end -->

## Notes

_Anything written below the generated block is preserved when the graph is regenerated._
