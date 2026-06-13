# Inline-Style → Tailwind Home Refactor — 198 Occurrences

> **Roadmap item**: R-Q1-E-016 (P3) · **Authored**: 2026-06-13

## Goal

Q1 refactor 198 inline `style={{...}}` usages on home page components to Tailwind classes. Reduces bundle + improves caching.

## Scope

`apps/web/components/home/*` (9 files): WorshipStrip, YatraStrip, WisdomStrip, ShopStrip, ConsultStrip, IntentTrio, NextFestivalStrip, StickyAartiCta, MobileBottomTabs.

Plus `apps/web/app/page.tsx` 50+ inline style usages.

## Migration pattern

```typescript
// BEFORE
<div style={{ background: 'linear-gradient(135deg, #E16318, #F99A48)' }}>

// AFTER (Tailwind)
<div className="bg-gradient-to-br from-saffron-600 to-saffron-400">

// BEFORE
<span style={{ color: 'var(--color-primary)' }}>

// AFTER
<span className="text-saffron-600">
```

## Risk

- Gradient + custom CSS variable cases require token addition to globals.css
- 198 manual edits — chunked PRs to limit blast radius
- Smoke test prod home page each PR

## Engineering tickets

- R-Q1-E-016a: Audit 198 occurrences + classify (simple/gradient/custom)
- R-Q1-E-016b: 9-file chunked PRs
- R-Q1-E-016c: Custom Tailwind tokens for non-standard gradients
- R-Q1-E-016d: Smoke test post-refactor

## Closes

R-Q1-E-016 — spec shipped.
