# GSC + Bing Webmaster Monthly Snapshots

> **Roadmap item**: R-Q1-M-002 (P0) · **Owner**: founder (CMO role) · **Cadence**: 1st of each month, ~10 min

After completing the one-time verification runbook (`docs/seo/gsc-bing-verification-runbook.md`), founder captures a monthly snapshot of GSC + BWT data so we have a longitudinal organic-traffic baseline. Required to flip `R-Q1-M-002.status` from `in_progress` → `shipped` AND ongoing thereafter.

## Why this matters

- Monthly delta = first real KPI for `_manual-kpis.yml :: gsc_verified` (1 = first snapshot landed)
- Feeds the `/admin/roadmap` dashboard organic-traffic chart (manual KPI source until GSC API wired)
- Unblocks downstream items: SIDE-FIX-SEO-404 (broken-slug list source), R-Q3-M-014 (real keyword data for title-fix audit), monthly competitor delta vs Sri Mandir / Utsav / VAMA
- Founder catches indexing regressions (Pages: Excluded spike) within 30 days vs silently losing organic traffic

## Cadence

| When | Action |
|---|---|
| 1st of each month, 8-10am IST | 10 min — open both consoles, screenshot dashboards, fill template, commit + push |
| Same day | Update `docs/roadmap/_manual-kpis.yml :: gsc_verified` to 1 (first time only); add `organic_clicks_30d` + `indexed_pages` if not present |

## Template

Copy `_template.md` → `YYYY-MM.md` (e.g. `2026-06.md`), fill in the 5 sections, commit `docs(seo): YYYY-MM monthly GSC snapshot`.

## Files

- `_template.md` — copy this for each month
- `2026-06.md` — June 2026 (first snapshot — closes R-Q1-M-002 ship gate)
- `YYYY-MM.md` — every month thereafter

## Pass criteria (per snapshot)

- [ ] GSC Performance: clicks + impressions + CTR + avg position (30d) captured
- [ ] GSC Coverage: indexed / excluded / errors counts captured
- [ ] BWT: same 4 perf metrics (clicks + impressions + CTR + avg position)
- [ ] Top 10 queries listed (drives content prioritization for next sprint)
- [ ] Top 5 broken / excluded URLs flagged (feeds SIDE-FIX-SEO-404 queue)

## Failure modes

| Symptom | Fix |
|---|---|
| GSC shows 0 clicks | Normal for first 14d after sitemap submission. Re-snapshot end of month. |
| BWT shows different impression count than GSC | Expected — Bing crawl lags Google by 7-14d. Document delta in `notes`. |
| Indexed count drops MoM | Check Coverage → Excluded for new reasons. Most common: noindex header on edge-runtime'd pages. |
| Avg position drops 5+ ranks MoM | Algorithm update OR core-web-vitals regression. Cross-ref `docs/seo/seo-audit-*.md` + lighthouse-weekly report. |
