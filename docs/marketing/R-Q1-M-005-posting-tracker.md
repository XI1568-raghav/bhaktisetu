# R-Q1-M-005 — Per-post posting tracker (21 source posts)

> Founder fills in as posts go live. Source CSV: `docs/marketing/buffer-21-social-posts.csv`. Refresh source: `node scripts/agents/social-queue.mjs && node scripts/agents/social-queue-buffer-csv.mjs`.

## How to use

1. Buffer publishes per the scheduled time → copy the live URL into the relevant row.
2. After ~24h, log impressions + engagement % + DMs from each platform's native analytics (Buffer free analytics is shallow).
3. When `scheduled_count` ≥ 21 AND `posted_count` ≥ 21, flip the KPI in `docs/roadmap/_manual-kpis.yml`:
   ```yaml
   social_posts_scheduled: 21
   ```
4. Mark the item shipped: edit `docs/roadmap/items/Q1/marketing/005-buffer-free-schedule-first-21-social-posts-from-so.md` → `status: shipped` + `shipped_at: <ISO>`.

## Posting log

> Default source: 2026-06-08 social-queue report. If you re-generate, dates shift — update the "Source date" column.

| # | Day | Slot (IST) | Type | Scheduled in Buffer? | Twitter URL | LinkedIn URL | Instagram URL | Impressions | Engagement % | DMs |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Day 1 | 9:00 | shloka | ☐ | | n/a | | | | |
| 2 | Day 1 | 13:00 | practice | ☐ | n/a | n/a | n/a | | | |
| 3 | Day 1 | 19:00 | temple | ☐ | | n/a | | | | |
| 4 | Day 2 | 9:00 | NRI | ☐ | | | n/a | | | |
| 5 | Day 2 | 13:00 | gurukul | ☐ | | | n/a | | | |
| 6 | Day 2 | 19:00 | gaushala | ☐ | | n/a | | | | |
| 7 | Day 3 | 9:00 | founder | ☐ | | | n/a | | | |
| 8 | Day 3 | 13:00 | shloka | ☐ | | n/a | | | | |
| 9 | Day 3 | 19:00 | practice | ☐ | n/a | n/a | n/a | | | |
| 10 | Day 4 | 9:00 | temple | ☐ | | n/a | | | | |
| 11 | Day 4 | 13:00 | NRI | ☐ | | | n/a | | | |
| 12 | Day 4 | 19:00 | gurukul | ☐ | | | n/a | | | |
| 13 | Day 5 | 9:00 | gaushala | ☐ | | n/a | | | | |
| 14 | Day 5 | 13:00 | founder | ☐ | | | n/a | | | |
| 15 | Day 5 | 19:00 | shloka | ☐ | | n/a | | | | |
| 16 | Day 6 | 9:00 | practice | ☐ | n/a | n/a | n/a | | | |
| 17 | Day 6 | 13:00 | temple | ☐ | | n/a | | | | |
| 18 | Day 6 | 19:00 | NRI | ☐ | | | n/a | | | |
| 19 | Day 7 | 9:00 | gurukul | ☐ | | | n/a | | | |
| 20 | Day 7 | 13:00 | gaushala | ☐ | | n/a | | | | |
| 21 | Day 7 | 19:00 | founder | ☐ | | | n/a | | | |

## Aggregate

| Metric | Value | Source |
|---|---|---|
| `scheduled_count` (out of 21) | 0 | Buffer queue page |
| `posted_count` (out of 21) | 0 | Live URLs above |
| `avg_engagement_pct` (Twitter) | TBD | Twitter analytics |
| `total_impressions_week_1` | TBD | sum across platforms |
| `total_DMs` | TBD | inbox sweep |

## Week-1 review prompts (founder, end of day 7)

1. Which post type drove highest engagement? Double down for week 2.
2. Which post type drove lowest? Kill or rewrite.
3. Did any post drive a real conversion (signup, booking, NRI inquiry)? Log it.
4. Re-generate CSV for week 2: `node scripts/agents/social-queue.mjs && node scripts/agents/social-queue-buffer-csv.mjs`.

## Closes (partial)

R-Q1-M-005 — tracker scaffold in place. Status flips to `shipped` when posted_count = 21 AND week-1 review is logged above.
