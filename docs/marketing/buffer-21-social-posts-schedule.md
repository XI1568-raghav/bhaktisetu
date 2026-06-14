# Buffer Free — Schedule First 21 Social Posts from social-queue agent

> **Roadmap item**: R-Q1-M-005 (P1) · **Authored**: 2026-06-13 · **Refreshed**: 2026-06-14 · **Depends on**: R-Q1-M-004 social accounts created

> This file is the high-level spec. The production-ready handoff + bulk-import CSV + posting tracker live alongside:
> - **Handoff**: `docs/marketing/R-Q1-M-005-handoff.md`
> - **Pre-generated Buffer CSV**: `docs/marketing/buffer-21-social-posts.csv` (39 channel-rows from 21 source posts)
> - **Tracker**: `docs/marketing/R-Q1-M-005-posting-tracker.md`
> - **CSV generator**: `scripts/agents/social-queue-buffer-csv.mjs`

## Goal

Use Buffer free tier (1 user, 3 channels, 10 scheduled posts) → schedule first 21 social posts spread over week 1. Posts auto-generated from `scripts/agents/social-queue.mjs` (already in daily fleet).

## Buffer setup

1. Buffer free account (free for 1 user + 3 channels)
2. Connect: Twitter + LinkedIn + Instagram (3 of 4 — YouTube separately via Studio)
3. Free tier: 10 scheduled posts/channel × 3 channels = 30 scheduled total
4. Time slots: 9:00 / 13:00 / 19:00 IST per `social-queue.mjs` SLOTS const

## 21 posts source

The `social-queue` agent emits 21 posts per run (7 days × 3 slots), spanning 7 hook types: shloka / practice / temple / NRI / gurukul / gaushala / founder. Re-runnable any day; the CSV exporter always picks the latest report.

Per-platform routing (encoded in `social-queue-buffer-csv.mjs`):
- Twitter: all 21 (cheap real estate, 280-char auto-truncate w/ hashtag-tail preserved)
- LinkedIn: NRI / gurukul / founder types only (9 posts, expanded with founder-voice intro + Darshya footer)
- Instagram: shloka / temple / gaushala types only (9 posts, appended with Reel-CTA)

## Founder action

- [ ] Buffer account + 3-channel connect (~10 min) — see handoff doc step 1-3
- [ ] Bulk-import `docs/marketing/buffer-21-social-posts.csv` into Buffer queue (~5 min) — handoff step 4
- [ ] Verify Devanagari + hashtags + IST timezone in first 7 scheduled posts (~5 min) — handoff step 5
- [ ] Reply to engagement within 6h (Buffer doesn't auto-reply) — ongoing
- [ ] Log each post in `R-Q1-M-005-posting-tracker.md` — week 1 review prompt embedded

## Closes (partial)

R-Q1-M-005 — runbook + CSV + tracker shipped. Status stays `in_progress` until founder posts all 21 and KPI `social_posts_scheduled` flips 0 → 21.
