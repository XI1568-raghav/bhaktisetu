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
