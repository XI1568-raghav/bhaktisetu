# R-Q1-E-016 — Inline-style → Tailwind home refactor (handoff)

> **Status**: in_progress — spec body was placeholder TBD. This handoff document specifies the refactor scope, exact file/line surface, the four categories of inline styles found in `apps/web/`, and a phased execution plan. Implementation deferred to a dedicated session because of CSS-variable coupling + animation/gradient risk flagged in prior HANDOFFs (see `TASKS.md` 2026-06-05 #4 / #9 / #14).
>
> **Roadmap item**: `docs/roadmap/items/Q1/engineering/016-inline-style-to-tailwind-home-refactor-198-occurre.md`
> **Category**: engineering · **Priority**: P3 · **Est hours**: 8

## Real surface (verified 2026-06-15 — count is 203, not 198)

| File | Inline-style count |
|---|---|
| `apps/web/app/page.tsx` | 134 |
| `apps/web/components/home/WisdomStrip.tsx` | 9 |
| `apps/web/components/home/WorshipStrip.tsx` | 9 |
| `apps/web/components/home/ShopStrip.tsx` | 9 |
| `apps/web/components/home/YatraStrip.tsx` | 8 |
| `apps/web/components/home/NriLaneAbTest.tsx` | 7 |
| `apps/web/components/home/ConsultStrip.tsx` | 7 |
| `apps/web/components/home/IntentTrio.tsx` | 6 |
| `apps/web/components/home/ContinueJourneyCard.tsx` | 5 |
| `apps/web/components/home/TrustStrip.tsx` | 4 |
| `apps/web/components/home/HeroCopyVariant.tsx` | 3 |
| `apps/web/components/home/NextFestivalStrip.tsx` | 1 |
| `apps/web/components/home/StickyAartiCta.tsx` | 1 |
| **Total** | **203** |

Spec said 198. Off by 5 — drift since import. Use 203 as the real number.

## Why this was deferred 3 prior sessions

1. **CSS-variable coupling** — most styles reference brand tokens declared in `apps/web/app/globals.css` `@theme` block: `var(--color-primary)`, `var(--color-art-1)`, `var(--color-art-2)`, `var(--color-art-3)`, `var(--color-surface-offset)`, `var(--color-text)`, `var(--color-text-muted)`, `var(--color-border)`, `var(--color-divider)`, `var(--color-bg)`. Tailwind v4 supports CSS variables in `@theme` directly, but the design tokens are decoupled from the saffron-* / surface-* palette already in Tailwind config — they are intentionally separate semantic layers.
2. **Animation-delay risk** — several styles set `animationDelay: 'Ns'` to stagger `scroll-float` entries; converting to arbitrary-value Tailwind classes (`[animation-delay:1.5s]`) is mechanical but error-prone if `s` vs `ms` is dropped.
3. **Min-height risk** — `minHeight: '90px'` is used to keep bento cards uniform; arbitrary-value swap (`min-h-[90px]`) is fine but must be hand-verified per card.
4. **Gradient backgrounds** — a handful of inline gradients (`linear-gradient(135deg, ...)`) can be lifted to Tailwind `bg-gradient-to-br from-* to-*` only if the stops match an existing Tailwind palette — otherwise they must stay inline or move to globals.css utility classes.

## Categorization of the 203 occurrences (sampled 2026-06-15)

| Category | Approx count | Example | Refactor mechanic |
|---|---|---|---|
| Single brand color var | 110 | `style={{ color: 'var(--color-text)' }}` | Add Tailwind utility classes mapped to CSS vars in `globals.css` `@theme` block (`--color-text` → `text-color-text`) then sed-replace |
| Brand background var | 55 | `style={{ background: 'var(--color-art-2)' }}` | Same — add `bg-color-art-2` via `@theme` mapping |
| Composite (bg + color + border) | 20 | `style={{ background: '#FFFBEB', color: '#92400E', border: '1px solid #FDE68A' }}` | Hand-pick — use `bg-amber-50 text-amber-900 border border-amber-200` (verify hex matches Tailwind amber scale within ΔE < 3) |
| Animation/min-height/gradient | 18 | `style={{ animationDelay: '1.5s', minHeight: '90px' }}` | Arbitrary-value Tailwind: `[animation-delay:1.5s] min-h-[90px]` |

## Phased execution plan (8 hours, dedicated session)

### Phase A — Token bridge (1 hour)

1. In `apps/web/app/globals.css` `@theme inline` block, expose the brand CSS vars as Tailwind utilities (Tailwind v4 native syntax):
   ```css
   @theme inline {
     --color-brand-text: var(--color-text);
     --color-brand-text-muted: var(--color-text-muted);
     --color-brand-primary: var(--color-primary);
     --color-brand-bg: var(--color-bg);
     --color-brand-surface-offset: var(--color-surface-offset);
     --color-brand-border: var(--color-border);
     --color-brand-divider: var(--color-divider);
     --color-brand-art-1: var(--color-art-1);
     --color-brand-art-2: var(--color-art-2);
     --color-brand-art-3: var(--color-art-3);
   }
   ```
2. Verify in browser DevTools that `text-brand-text` resolves to the same computed color as the existing inline `style={{ color: 'var(--color-text)' }}`.

### Phase B — Single-prop sed sweep (2 hours)

For each of the 10 token names, run a controlled sed on every home file:

| Before | After |
|---|---|
| `style={{ color: 'var(--color-text)' }}` | `className=" + ... + " text-brand-text"` (manual className splice) |
| `style={{ color: 'var(--color-text-muted)' }}` | `text-brand-text-muted` |
| `style={{ color: 'var(--color-primary)' }}` | `text-brand-primary` |
| `style={{ background: 'var(--color-art-1)' }}` | `bg-brand-art-1` |
| `style={{ background: 'var(--color-art-2)' }}` | `bg-brand-art-2` |
| etc. | |

**WARNING**: blind sed is forbidden — every replacement must be hand-verified because `style={{ color }}` may sit alongside `className="..."` requiring careful splice. Use a small Node codemod (`jscodeshift` or AST-based) instead of regex if doing > 50 replacements.

### Phase C — Composite hex → Tailwind palette match (2 hours)

For the ~20 composite occurrences with literal hex codes (e.g. `#FFFBEB`, `#92400E`, `#FDE68A`), look up the closest Tailwind 8.x palette stop. The amber set used in `page.tsx` L118 is exactly Tailwind `amber-50` / `amber-900` / `amber-200` — verify with the [Tailwind palette reference](https://tailwindcss.com/docs/colors) before replacing.

### Phase D — Animation + min-height + gradient (2 hours)

Convert the 18 inline `animationDelay` / `minHeight` / `linear-gradient` occurrences to arbitrary-value Tailwind utilities. Hand-test in browser at each replacement because a missing `s` (vs `ms`) silently breaks the stagger.

### Phase E — Verify + commit (1 hour)

1. `pnpm next build` (apps/web) must exit 0.
2. Browser smoke: load `https://localhost:3000/` and screenshot-compare hero + 7 strips side-by-side with pre-refactor screenshots.
3. Single commit per phase, `refactor(web): R-Q1-E-016 phase X — inline-style → Tailwind`.

## What this handoff PR ships

- This document, `docs/engineering/R-Q1-E-016-handoff.md`, with the refactor plan.
- No code change to home files — refactor remains deferred until a dedicated 8-hour session.
- Roadmap item stays `status: in_progress`.

## Acceptance criteria for the eventual implementation PR

- `grep -rc "style={{" apps/web/app/page.tsx apps/web/components/home/` returns 0 or only intentionally retained gradient occurrences (documented inline with a code comment).
- `pnpm next build` (apps/web) clean.
- Visual diff between before/after on `https://localhost:3000/` shows no regression in hero, IntentTrio, Trust Strip, all four strips (Worship / Wisdom / Shop / Yatra), Continue Journey card, Consult Strip, sticky aarti CTA, NRI lane A/B variant.
- Lighthouse mobile score unchanged ±3 points.

## Why NOT shipped this batch

- 20-minute wall cap per round 5 protocol.
- Spec body was placeholder TBD with no acceptance criteria — risk of premature scope lock.
- Prior 3 sessions explicitly deferred this with the same reasoning (TASKS.md 2026-06-05 #4 / #9 / #14).
- Refactor needs a dedicated 8-hour session with screenshot diffing — not a side-batch task.
