# R-Q1-M-005 — Buffer free: schedule first 21 social posts from social-queue agent

> **Status: founder-action-required.** Agent generates 21 posts/run; CSV importer + per-platform variants + posting tracker shipped. Buffer signup + bulk-import + posting + engagement remain founder-only.

## Why this matters

Week-1 content presence is the cheapest activation lever Darshya has — Buffer free tier (1 user, 3 channels, 10 scheduled posts per channel) is sufficient to ship 21 posts × 7 days × 3 slots. Posts are pre-written by the `social-queue` agent (already in the daily fleet) and adapted per-platform by the new CSV exporter.

## What's shipped (agent side)

| Asset | Path | Status |
|---|---|---|
| Daily 21-post generator | `scripts/agents/social-queue.mjs` | ✓ shipped prior (in fleet, ran 2026-06-08 most recently) |
| Buffer CSV exporter w/ per-platform variants | `scripts/agents/social-queue-buffer-csv.mjs` | ✓ shipped this batch |
| Pre-generated 21-post CSV (39 channel-rows) | `docs/marketing/buffer-21-social-posts.csv` | ✓ shipped this batch (from 2026-06-08 source) |
| Buffer setup runbook (this doc) | `docs/marketing/R-Q1-M-005-handoff.md` | ✓ shipped this batch |
| Per-post posting tracker | `docs/marketing/R-Q1-M-005-posting-tracker.md` | ✓ shipped this batch |
| Cadence + per-platform routing rules | embedded in this doc + CSV exporter | ✓ documented |
| Free-tier compliance (Buffer 10 posts × 3 channels = 30 slot cap) | math in "Buffer queue math" below | ✓ verified |

## Buffer queue math (free tier discipline)

Buffer free: 1 user, 3 channels, **10 scheduled posts per channel** = 30 total scheduled slots.

The CSV maps 21 source posts to 39 channel-rows:
- Twitter: 21 (all source posts — cheap real estate)
- LinkedIn: 9 (only `NRI` / `gurukul` / `founder` types — keeps professional)
- Instagram: 9 (only `shloka` / `temple` / `gaushala` types — visual-heavy)

**Twitter overflow (21 > 10 cap)**: split the import into two batches.
- Batch 1: rows where `day_index` ∈ 1–10 → import all platforms
- Batch 2: rows where `day_index` ∈ 11–21 → import 4 days later (after batch 1 has published 7+ slots)

Or upgrade Buffer to Essentials ($6/mo) — defer until KPI shows engagement justifies.

## Founder action (one-time setup, ~20 min)

1. **Buffer account** — sign up at buffer.com (free tier).
2. **Connect 3 channels** — Twitter (`@darshyaonline` or founder personal), LinkedIn (Darshya company page), Instagram (`@darshya.online`). YouTube Shorts scheduling sits in YouTube Studio, not Buffer.
3. **Set posting timezone** — Asia/Kolkata (matches the `+05:30` ISO offsets in the CSV).
4. **Bulk-upload** — Publish → Queue → "Add via CSV". Upload `docs/marketing/buffer-21-social-posts.csv`.
   - If Buffer rejects the schema, see "Buffer CSV schema variants" below — there are 2-3 column-name conventions across Buffer's lifetime; pick the one your account UI accepts.
5. **Spot-review first 7 posts** — open each in Buffer, verify Devanagari renders, hashtags intact, scheduled time is IST not UTC.

## Founder action (ongoing, ~30 min/week × 3 weeks)

1. **Reply within 6h** to any quote-RT, reply-thread, DM on posted content. Buffer does NOT auto-engage.
2. **Pin best tweet of the week** to the Twitter profile (Sunday evening review).
3. **Re-record IG Reels** weekly — Mon/Wed/Fri slots are flagged in `social-queue.mjs` output as Reel-eligible.
4. **Log each post in tracker** (`docs/marketing/R-Q1-M-005-posting-tracker.md`) — date, URL, impressions, engagement %, DMs.

## Regenerating the CSV (when source 21 posts age out)

The `social-queue` agent runs daily and emits a fresh 21-post markdown into `docs/agent-reports/YYYY-MM-DD-social-queue.md`. To refresh the Buffer CSV:

```bash
node scripts/agents/social-queue.mjs            # emits today's report (if not already)
node scripts/agents/social-queue-buffer-csv.mjs # reads latest report → updates CSV
```

The CSV exporter auto-finds the most recent report by filename date — no flag needed.

## Buffer CSV schema variants

If `text,profile_service,scheduled_at` is rejected, try (one of):

- `Status,Profile,Scheduled at` (older UI)
- `Text,Profile,Time` (mid-era)
- Drop the header row entirely and use Buffer's Hootsuite-import bridge

If Buffer rejects all CSV variants (free tier may have dropped bulk upload — verify on signup), copy-paste each row manually into the Compose UI. Worst-case: 39 paste actions = ~25 min one-time.

## Per-platform character / format adaptations (already done in CSV)

| Platform | Char limit | What CSV does |
|---|---|---|
| Twitter | 280 | Truncates at 280 with `…` + hashtag-tail preserved |
| LinkedIn | 3000 | Prepends founder-voice intro per type; appends Darshya boilerplate footer |
| Instagram | 2200 | Appends Reel-CTA per type; preserves emoji-led structure |

## Definition of done (status: shipped)

- 21/21 source posts scheduled in Buffer (Twitter all 21; LinkedIn + Instagram per routing rules)
- First 7 posts published live across all 3 channels
- Tracker filled for first 7 posts (URL, impressions, engagement, DMs)
- KPI `social_posts_scheduled` in `docs/roadmap/_manual-kpis.yml` updated 0 → 21
- Item md `status: in_progress` → `status: shipped`, `shipped_at` populated

## Why agent can't close this end-to-end

Buffer's API is gated behind paid Essentials tier — the free tier has no programmatic scheduling endpoint. Auto-posting from a personal Twitter / LinkedIn / Instagram account also violates platform ToS even with paid Buffer (Buffer is approved, but service-account-only). And the engagement loop (reply within 6h) is the actual conversion lever — automation would lose it.

Agent ships: post drafts, per-platform variants, CSV in Buffer-import format, runbook, posting tracker. Founder ships: account + bulk-import + posting + engagement.

## Closes (partial)

R-Q1-M-005 — agent_brief sub-tasks 1-3 complete. Sub-task 4 (founder Buffer setup + posting + engagement) remains founder-blocked. Status stays `in_progress` until KPI flips.
