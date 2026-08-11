---
name: Marketing Landing Pages
slug: marketing-landing-pages
type: system
sources:
  - path: apps\web\app\hi\page.tsx
    hash: 53cc5be753bd4bcffd53108c88435131d77e83b446931f6f50d08b430de9b253
  - path: apps\web\app\launch\page.tsx
    hash: 62672911581f4d25958603a43c079a512cfbb3b81b73cfef4f19569e265e8430
sources_digest: cbccfffcf5a68a145ea6fe5d1ccc1153be28ae61c2d2235a818988e8f7a8db91
links: []
generator:
  version: 1
covers:
  - symbol: HindiLanding
    kind: function
    at: 'apps\web\app\hi\page.tsx:L42-L109'
  - symbol: LaunchPage
    kind: function
    at: 'apps\web\app\launch\page.tsx:L68-L226'
---
<!-- context:generated:start -->
## Summary

Standalone conversion pages. /hi is the Hindi landing page whose feature cards deliberately link to canonical English routes (/darshan, /pujas, ...) rather than fabricating untranslated /hi/* paths — an explicit SEO decision — with hreflang alternates to sibling locales. /launch supports a Product Hunt launch; its only interactivity is the shared EmailCapture component rendered with source='launch-nri' for lead attribution.
<!-- context:generated:end -->

## Notes

_Anything written below the generated block is preserved when the graph is regenerated._
