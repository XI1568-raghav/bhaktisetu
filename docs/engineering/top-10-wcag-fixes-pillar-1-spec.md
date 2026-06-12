# Top 10 WCAG 2.2 Fixes — Pillar 1 Per Audit

> **Roadmap item**: R-Q1-E-015 (P1) · **Authored**: 2026-06-13 · **Extends**: HANDOFF 2026-06-08 #20 footer landmark + Today chip dedup shipped e500fef

## Goal

Implement top 10 WCAG 2.2 fixes per audit Pillar 1. Targets WCAG 2.2 Level AA compliance + Lighthouse a11y score >95.

## Top 10 fixes

| # | Fix | File | Pattern |
|---|---|---|---|
| 1 | Home page h1 (currently empty) | apps/web/app/page.tsx | Add `<h1 className="sr-only">Bhaktisetu — India devotional super-app</h1>` |
| 2 | aria-current on nav active link | apps/web/app/layout.tsx | Add `aria-current={pathname===href ? 'page' : undefined}` per nav item |
| 3 | Focus-ring offset bump | apps/web/app/globals.css | Outline 2px → 3px offset 2px on `:focus-visible` |
| 4 | Skip-to-content link | apps/web/app/layout.tsx | Add `<a className="sr-only focus:not-sr-only" href="#main">Skip to content</a>` |
| 5 | Form labels (where missing) | apps/web/app/auth/login/page.tsx | All inputs need associated `<label htmlFor>` |
| 6 | Color contrast on hero buttons | apps/web/components/home/IntentTrio.tsx | Saffron-600 on white: 4.5:1 (currently 3.8:1). Bump to saffron-700 |
| 7 | Alt text on hero deity images | apps/web/components/home/WorshipStrip.tsx | All `<img>` need alt="{deity name} at {temple name}" |
| 8 | Mobile touch target ≥44px | apps/web/components/MobileBottomTabs.tsx | Some tabs 40px h. Bump h-11 → h-12 |
| 9 | Form error association | apps/web/components/forms/*.tsx | Use `aria-describedby` linking input to error message |
| 10 | Video captions on aarti streams | apps/web/components/DarshanLivePlayer.tsx | Add `<track kind="captions">` even if just placeholder |

## Verify steps

1. `pnpm next dev` → run axe-core via browser DevTools on each fix
2. Lighthouse on staging → A11y score ≥95
3. Manual keyboard nav test: Tab through home → Profile in <40 keystrokes

## Engineering tickets

R-Q1-E-015a: 10 fixes
R-Q1-E-015b: axe-core integration test in CI
R-Q1-E-015c: Lighthouse a11y baseline >95 enforcement

## Closes

R-Q1-E-015 — spec shipped.
