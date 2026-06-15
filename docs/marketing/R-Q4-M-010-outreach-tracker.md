# R-Q4-M-010 — Podcast Outreach Tracker

> Per-podcast row tracker for the 8-podcast circuit. Founder updates manually until KPI scraper wired.

## KPI counter

`podcast_episodes_aired`: **0 / 8**

Increment after each host publishes. KPI flips `in_progress → shipped` at 8.

## UTM scheme

Per-podcast referral URL:

```
https://bhaktisetu.com/?utm_source=podcast&utm_medium=audio&utm_campaign=q4-circuit&utm_content={{podcast-slug}}
```

Replace `{{podcast-slug}}` with the kebab-case podcast name from the table below (e.g. `mostly-sane`, `founders-inc`).

## Tracker

| # | Podcast | Slug | Host email | Pitch template | Pitch sent | Status | Episode URL | Aired | 7d plays | Inbound DMs | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Mostly Sane Podcast | mostly-sane | TBD | T1 | — | queued | — | — | — | — | [VERIFY-FOUNDER show-still-active] |
| 2 | Spotify Founder's Inc | founders-inc | TBD | T1 | — | queued | — | — | — | — | [VERIFY-FOUNDER show-still-active] |
| 3 | Pratha Podcast (Hindi) | pratha | TBD | T3 | — | queued | — | — | — | — | [VERIFY-FOUNDER show-still-active] |
| 4 | Bharatpe Founder Notes | bharatpe-fn | TBD | T2 | — | queued | — | — | — | — | [CITATION-NEEDED] [VERIFY-FOUNDER show-still-active] — likely does not exist as named, confirm before pitching |
| 5 | The Founder's Journey | founders-journey | TBD | T4 | — | queued | — | — | — | — | [VERIFY-FOUNDER show-still-active] |
| 6 | Sounds True Podcast | sounds-true | TBD | T5 | — | queued | — | — | — | — | [VERIFY-FOUNDER show-still-active] |
| 7 | On Being | on-being | TBD | T5 | — | queued | — | — | — | — | [VERIFY-FOUNDER show-still-active] |
| 8 | Daily Devotional Hindu Cast | daily-devotional | TBD | T5 | — | queued | — | — | — | — | [VERIFY-FOUNDER show-still-active] |

### Status legend

- `queued` — not yet pitched
- `pitched` — pitch sent, awaiting response
- `followup-1` — 1st follow-up sent
- `followup-2` — 2nd follow-up sent (last touch)
- `declined` — host said no, drop
- `responded` — host engaged, scheduling
- `scheduled` — record date locked
- `recorded` — episode in the can, awaiting host edit
- `aired` — host published, counts toward KPI
- `dropped` — no response after 2 follow-ups

## Backup list (secondary 16)

Founder identifies + adds if primary 8 yields under 8 acceptances by start of month-11. Suggested seed list:

- Maed in India (music+culture crossover)
- The Seen and the Unseen (Amit Varma — long-form India intellectual)
- The Ranveer Show (Hindi)
- The Bombay Brunch
- Founder Stories India
- TFC Talks (The Founders Circle)
- Indian Startup Stories
- Paisa Vaisa (personal finance, NRI overlap)
- Cyrus Says (India culture)
- The Tim Ferriss Show (long-shot, global)
- Spirituality podcasts: Buddha at the Gas Pump, Mindrolling, Insights at the Edge

## Workflow

1. Pitch sent → fill `Pitch sent` column with YYYY-MM-DD, set `Status = pitched`.
2. No response after 7 days → send follow-up #1, set `Status = followup-1`.
3. No response after 14 days → send follow-up #2, set `Status = followup-2`.
4. No response after 21 days → set `Status = dropped`, move to secondary list.
5. Host responds → set `Status = responded`, begin scheduling.
6. Record date locked → set `Status = scheduled`.
7. Episode recorded → set `Status = recorded`.
8. Episode published → set `Status = aired`, fill `Episode URL` + `Aired` (YYYY-MM-DD).
9. 7 days post-air → fill `7d plays` + `Inbound DMs` counts.
10. Increment KPI counter at top.

## Closes

R-Q4-M-010 KPI source. Founder action loop.
