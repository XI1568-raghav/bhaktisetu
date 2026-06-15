# 3 A/B Feature Flags — hero_copy + cta_color + nri_lane

> **Roadmap item**: R-Q1-E-009 (P2) · **Authored**: 2026-06-13

## Goal

Q1 ship 3 A/B test feature flags via PostHog (per R-Q1-E-008).

## 3 flags

| Flag | Variant A (control) | Variant B (test) | Metric |
|---|---|---|---|
| `hero_copy_v2` | "Live darshan + verified pujas" | "Verified pandits, video proof in 24hr" | book_clicked rate |
| `cta_color_test` | saffron-600 | amber-600 | book_clicked rate |
| `nri_lane_above_fold` | hidden for geo=US | visible USD pricing | NRI signup rate |

## PostHog setup

- Feature flag UI in PostHog dashboard
- 50/50 split per flag
- Run 4 weeks minimum
- Significance: chi-square p<0.05
- Winner auto-rollout 100% post-test

## Engineering tickets

- R-Q1-E-009a: PostHog feature flag SDK in apps/web
- R-Q1-E-009b: Variant rendering per flag
- R-Q1-E-009c: Conversion event tracking
- R-Q1-E-009d: Decision SOP doc

## Closes

R-Q1-E-009 — spec shipped.

## Implementation (2026-06-15, R4)

- `apps/web/lib/experiments.ts` — `useExperiment(experiment, defaultValue)` hook
  wraps `useFeatureFlag` and fires one `experiment_exposure` event per page
  view via `capture()`. PostHog insight on this event powers the
  `ab_flags_active` KPI (R-Q1-E-009 requires min 100 exposures/variant).
- `ACTIVE_EXPERIMENTS` const — single source of truth listing the 3 flag
  keys + variants. Tested in `apps/web/__tests__/experiments.test.ts`.
- Wiring:
  - `hero_copy_v2` → `apps/web/components/home/HeroCopyVariant.tsx`
    (variants: `control` Sanskrit-anchored, `benefit` benefit-led)
  - `cta_color_test` → `apps/web/components/HomeHeroCta.tsx`
    (variants: `saffron` = saffron-600, `indigo` = indigo-600)
  - `nri_lane_above_fold` → `apps/web/components/home/NriLaneAbTest.tsx`
    mounted twice on `app/page.tsx` (slots `above` and `below`); only the
    slot matching the resolved variant renders content.
- Defaults: every flag renders the control variant when PostHog is
  unconfigured, the SDK hasn't loaded, or the flag is unknown — page never
  blanks.
- Founder action remaining (U8 paste): create the 3 flags in PostHog UI
  with 50/50 rollout, create the `experiment_exposure` insight grouped by
  `variant` and filtered per `experiment`, wait until ≥100 exposures per
  variant before calling a winner.
