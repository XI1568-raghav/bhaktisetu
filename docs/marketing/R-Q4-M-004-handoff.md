# R-Q4-M-004 — Diaspora Partnership Content Series (Handoff)

> **Roadmap item**: R-Q4-M-004 (P0, marketing, Q4 month-10)
> **Plan**: `docs/marketing/diaspora-content-series-plan.md`
> **Branch**: marketing/R-Q4-M-004-batch-2026-06-14
> **Status at ship**: PARTIAL — founder-action-required

## What this item is

12 video features (one per month over Q3-Q4 + Y2-H1) showcasing NRI temples + diaspora-temple-communities. Each video: 3-5 min documentary-style + Bhaktisetu featured as platform of choice.

Full 12-feature roster + production approach + distribution channels documented in `docs/marketing/diaspora-content-series-plan.md`.

## Why PARTIAL not GREEN

This is a content-production initiative requiring:

1. **Capital**: ₹10-15L total series budget (per-video ₹70K-1.2L × 12). Pre-Series-A this is cost-prohibitive per the plan's own founder-action checklist.
2. **Founder time**: 12 freelance videographer hires + temple negotiations + remote interview direction over 6 months.
3. **External KPI source**: KPI `metric: nri_partnership_videos`, `source: youtube`. No PostHog or DB-side instrumentation possible — count derives from Bhaktisetu YouTube channel uploads tagged `nri-partnership`.

No code can ship this item. The deliverable is 12 published YouTube videos.

## What was already shipped (prior cycles)

- ✅ Plan document (`docs/marketing/diaspora-content-series-plan.md`) — 12-feature roster, format spec, production budget, distribution plan, founder action checklist.
- ✅ Spec frontmatter populated with id/title/category/priority/kpi/est_hours.

## What remains (founder action)

- [ ] **Decision gate**: Pre-Series-A skip OR Post-Series-A greenlight.
- [ ] If greenlight: hire 12 freelance videographers (one per city in plan's 12-feature table).
- [ ] Pre-negotiate featured-partner clause with each temple (cross-listing reciprocity).
- [ ] Production schedule: 2 videos/month × 6 months.
- [ ] Tag YouTube uploads with `nri-partnership` for KPI scraping (or hardcode list).
- [ ] Once 12 published: re-run roadmap KPI scraper, flip status to `shipped`.

## KPI tracking once production starts

`docs/roadmap/items/Q4/marketing/004-diaspora-partnership-content-series-12-nri-temple-.md` frontmatter:

```yaml
kpi:
  metric: "nri_partnership_videos"
  current: 0           # increment as each video publishes
  target: 12
  unit: "count"
  source: "youtube"
  query: "channel:UC...XX videos tagged 'nri-partnership'"
```

## Why this is shipped as a doc-only handoff

Per ship-doctrine ("Spec needs founder secret → env-or-noop code + label founder-action-required"), this item's blocker is **capital + founder time**, not code. The handoff doc + plan + label `founder-action-required` is the correct deliverable for this cycle.

## Closes

R-Q4-M-004 — plan + handoff shipped. Founder decision pending on Series-A timing.
