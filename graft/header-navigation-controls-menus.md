---
name: Header navigation controls & menus
slug: header-navigation-controls-menus
type: system
sources:
  - path: apps\web\components\LanguageSwitcher.tsx
    hash: d0ffde6b437134f26b65035ccd8064e01583db6edf3909c86541e2515d5af2d6
  - path: apps\web\components\LibraryMegaPanel.tsx
    hash: 8c9bb15c78160fcfaca23f88f65608e0630022b113cdfa2d5c8497d3d308997f
  - path: apps\web\components\ListYourBusinessDropdown.tsx
    hash: 4677e083a67664205e232ec03afb9c6e8a3d58a1ae5481a3fb069642d9c87253
  - path: apps\web\components\MoreDropdown.tsx
    hash: c56f7d74a164e9b9b87caa15c3d9441677c58510101f4fe05e2e073ce7ffba0a
  - path: apps\web\components\NavAuthButton.tsx
    hash: 0dc2668659b369c5fbbd7c832f3c40eef86edb1eaf3d0df4ade1db2eff121c51
  - path: apps\web\components\NavCartButton.tsx
    hash: d9534d8452137f2a98863e13ee6f7855a0605d475b9aae4cd264b0c5ac3ccddf
sources_digest: d0d55163f4759d7587192962fea5287e1af457dff8d679ffca3aec08cf30dd4b
links: []
generator:
  version: 1
covers:
  - symbol: SupportedLanguage
    kind: type
    at: 'apps\web\components\LanguageSwitcher.tsx:L8-L8'
  - symbol: LanguageSwitcherProps
    kind: interface
    at: 'apps\web\components\LanguageSwitcher.tsx:L10-L15'
  - symbol: LanguageSwitcher
    kind: function
    at: 'apps\web\components\LanguageSwitcher.tsx:L28-L146'
  - symbol: handleClickOutside
    kind: function
    at: 'apps\web\components\LanguageSwitcher.tsx:L56-L60'
  - symbol: handleKeyDown
    kind: function
    at: 'apps\web\components\LanguageSwitcher.tsx:L67-L69'
  - symbol: handleSelect
    kind: function
    at: 'apps\web\components\LanguageSwitcher.tsx:L76-L81'
  - symbol: Props
    kind: type
    at: 'apps\web\components\LibraryMegaPanel.tsx:L5-L8'
  - symbol: LibraryMegaPanel
    kind: function
    at: 'apps\web\components\LibraryMegaPanel.tsx:L17-L72'
  - symbol: ListYourBusinessDropdown
    kind: function
    at: 'apps\web\components\ListYourBusinessDropdown.tsx:L15-L71'
  - symbol: onClick
    kind: function
    at: 'apps\web\components\ListYourBusinessDropdown.tsx:L21-L25'
  - symbol: onEsc
    kind: function
    at: 'apps\web\components\ListYourBusinessDropdown.tsx:L26-L28'
  - symbol: MoreDropdown
    kind: function
    at: 'apps\web\components\MoreDropdown.tsx:L30-L91'
  - symbol: onClick
    kind: function
    at: 'apps\web\components\MoreDropdown.tsx:L36-L40'
  - symbol: onEsc
    kind: function
    at: 'apps\web\components\MoreDropdown.tsx:L41-L43'
  - symbol: NavAuthButton
    kind: function
    at: 'apps\web\components\NavAuthButton.tsx:L7-L207'
  - symbol: handleClick
    kind: function
    at: 'apps\web\components\NavAuthButton.tsx:L14-L18'
  - symbol: NavCartButton
    kind: function
    at: 'apps\web\components\NavCartButton.tsx:L6-L23'
---
<!-- context:generated:start -->
## Summary

Desktop header chrome: overflow/business/library dropdowns plus auth, cart, and language buttons. All dropdowns share one dismissal pattern — window mousedown/keydown listeners attached only while open (chosen over CSS :hover so touch devices work) — and NavAuthButton personalizes its menu by role and hard-navigates on sign-out. Non-obvious gotchas: LanguageSwitcher doubles as the content library's i18n dictionary (CONTENT_LABELS) and writes localStorage even in controlled mode; LibraryMegaPanel's documented flat-items fallback doesn't exist (a category without subGroups renders an empty grid); ListYourBusinessDropdown is hidden below lg, so mobile must surface those onboarding links elsewhere.
<!-- context:generated:end -->

## Notes

_Anything written below the generated block is preserved when the graph is regenerated._
