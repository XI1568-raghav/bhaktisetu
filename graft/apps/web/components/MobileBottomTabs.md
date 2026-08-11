# apps\web\components\MobileBottomTabs.tsx

- Tab · type · L13-L23 — Declarative config shape for one bottom tab, bundling its route, icon, primary-CTA styling flag, the URL prefixes that count as active, and its brand-lane active color.
- isActive · function · L34-L37 — Decides whether a tab is active by exact-matching the home route and prefix-matching all other routes so nested library/booking pages light up their parent tab.
- MobileBottomTabs · function · L46-L96 — Renders the safe-area-aware 4-tab mobile bottom bar, suppressing it entirely on auth and checkout pages so it never competes with those flows' primary form CTAs.
