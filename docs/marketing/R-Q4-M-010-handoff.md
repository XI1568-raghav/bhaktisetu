# R-Q4-M-010 — Founder Podcast Circuit, 8 Episodes (Handoff)

> **Roadmap item**: R-Q4-M-010 (P1, marketing, Q4 month-11)
> **Branch**: marketing/R-Q4-M-010-batch-2026-06-15-r4
> **Status at ship**: PARTIAL — founder-action-required for recording + airing 8 podcast episodes

## Goal

Land founder (Sunil Kumar) as guest on 8 podcasts in Q4 (5 startup + 3 spirituality crossover) to drive top-of-funnel awareness, investor inbound, and ~5K Twitter follower spike. KPI `podcast_episodes_aired ≥ 8`, target 200K combined plays.

## Why PARTIAL not GREEN

KPI is `podcast_episodes_aired` — counted only after a host actually publishes the episode. The full chain — outreach → pitch acceptance → schedule → record → host edit → publish — is gated on:

1. **Host editorial calendars** — outside our control, typical lag 3-8 weeks from pitch to air.
2. **Founder availability** — Sunil personally records (no proxy possible for a founder podcast).
3. **Host audience fit** — some pitches will be declined; need a wider top-of-funnel than 8 to land 8.

Engineering can ship the outreach toolkit + tracker scaffold + pitch templates. Founder runs the pitch+record loop.

## What was already shipped (prior cycles)

✅ **Podcast circuit spec** — `docs/marketing/founder-podcast-circuit-q4-spec.md` lists all 8 targets (5 startup + 3 spirituality) with audience descriptions.

✅ **Pitch email templates** — `docs/marketing/founder-podcast-pitch-emails.md` ships 5 templates covering startup podcasts (general, niche India, Hindi-belt, YC-adjacent, spirituality crossover).

✅ **Founder podcast tour spec** — `docs/marketing/founder-podcast-tour-spec.md` (predecessor R-Q3-M-012 5-podcast tour).

## What this ship adds

### 1. Outreach tracker scaffold (`docs/marketing/R-Q4-M-010-outreach-tracker.md`)

Per-podcast row: target name, host contact, pitch sent date, status (queued / pitched / responded / scheduled / recorded / aired), episode URL, play count, UTM landing, follow-up date. Founder updates inline; agent CSV-ingests for KPI reporting (future).

### 2. Per-podcast pitch variant index

Maps each of the 8 podcast targets to the best-fit pitch template from `founder-podcast-pitch-emails.md` so the founder doesn't re-author.

### 3. Recording-prep checklist

Pre-record (3 days out): gear test, talking-points note, UTM URL ready, social-snippet pre-written. Post-record: clip-out 30s preview, social cross-post, episode UTM tracking.

### 4. Episode publishing tracker URL block

A pre-filled UTM scheme so each podcast referral gets attributed back: `https://bhaktisetu.com/?utm_source=podcast&utm_medium=audio&utm_campaign=q4-circuit&utm_content={{podcast-slug}}`.

## Targets (per spec)

| # | Type | Podcast | Audience | Pitch template |
|---|---|---|---|---|
| 1 | Startup | Mostly Sane Podcast | India consumer founders | Template 1 (general startup) |
| 2 | Startup | Spotify Founder's Inc | Early-stage India | Template 1 (general startup) |
| 3 | Startup | Pratha Podcast (Hindi) | Hindi-belt entrepreneur | Template 3 (Hindi-belt variant) |
| 4 | Startup | Bharatpe Founder Notes | India consumer business | Template 2 (niche India consumer) |
| 5 | Startup | The Founder's Journey | YC India connect | Template 4 (YC-adjacent) |
| 6 | Spirituality | Sounds True Podcast (Tami Simon) | Global spirituality | Template 5 (spirituality crossover) |
| 7 | Spirituality | On Being | NPR audience, NRI rich | Template 5 (spirituality crossover) |
| 8 | Spirituality | Daily Devotional Hindu Cast | India devotional niche | Template 5 (spirituality crossover) |

Top-of-funnel: pitch ~24 podcasts to land 8 (rough 3:1 conversion assumption). Founder identifies 16 additional secondary targets if primary 8 yields under 8 acceptances by month-11 mid-point.

## Per-podcast workflow

```
Week 0   Pitch email sent (template + UTM URL embedded)
Week 1-2 Follow-up #1 if no response (3-line nudge)
Week 3   Follow-up #2 if still no response (last touch, then drop)
Week 0-6 Booking confirmed → schedule recording
Week N   Record 45-60min episode
Week N+2 Host publishes → tracker updated → social cross-post
Week N+3 Play-count check, inbound DM tally, follow-up thank-you to host
```

## Recording-prep checklist (founder side)

**3 days before record**:
- [ ] Confirm gear (Rode NT-USB, Krisp noise cancellation, wired headphones)
- [ ] Test internet (≥10 Mbps upload, hardwire if possible)
- [ ] Pre-write 5-bullet talking-points: (1) bootstrap arc / (2) why Section 8 / (3) NRI moat / (4) agent fleet / (5) ask (investors/customers/pandits)
- [ ] Generate per-podcast UTM URL (see scheme above)
- [ ] Pre-write 280-char Twitter snippet for post-publish

**Day of record**:
- [ ] Quiet room, do-not-disturb sign, phone on DND
- [ ] Glass of water, no caffeine within 2hr
- [ ] Open one-page talking-points note (not full script)
- [ ] Mention bhaktisetu.com once early + once at close

**After record**:
- [ ] Send thank-you to host within 2hr
- [ ] Ask host for ETA on publish
- [ ] Update tracker row: status = recorded

**After publish**:
- [ ] Tweet episode link with 30s clip preview (host typically provides)
- [ ] LinkedIn post with full takeaways
- [ ] Update tracker row: status = aired + episode URL + 7d play count

## Success criteria (re-stated from spec)

- 8 episodes recorded + published in Q4 (target month-11)
- 200K combined plays (target — measured 30 days post-air per episode)
- 5K Twitter follower spike (measured cumulative across Q4)
- 50+ inbound DMs (investors + customers + pandit onboard interest)

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Host calendar slip (3-month booking lag) | Pitch all 8 by start of month-10; backup list of 16 |
| Founder bandwidth — 8 records in 3 months | Cluster recording days (2/week × 4 weeks) |
| Audience mismatch (spirituality pods skew older) | Spirituality crossover counted toward NRI awareness, not direct conversion |
| Plays don't materialize | Top-of-funnel KPI is `episodes_aired`, not plays — plays is a stretch metric |

## What founder does next (action checklist)

1. **Week 1 (now)**: Send all 8 pitch emails using templates 1-5 mapped above. Use UTM URL per row.
2. **Week 2**: Send follow-up #1 to non-responders.
3. **Week 3**: Send follow-up #2 to remaining non-responders.
4. **Month 10**: Identify secondary 16 targets if primary 8 hasn't yielded ≥8 acceptances.
5. **Month 11**: Execute recording loop (2 per week × 4 weeks = 8 records).
6. **Month 11-12**: Track airing dates, update tracker, run cross-post loop.

## KPI flip path

Status flips `in_progress → shipped` when `podcast_episodes_aired ≥ 8`. Tracker doc has a counter at top — founder updates manually until ARE KPI scraper for podcast/manual source is wired.

## Files this ship adds

- `docs/marketing/R-Q4-M-010-handoff.md` (this file)
- `docs/marketing/R-Q4-M-010-outreach-tracker.md` (per-podcast row tracker)

## Files this ship references (pre-existing, no edit)

- `docs/marketing/founder-podcast-circuit-q4-spec.md`
- `docs/marketing/founder-podcast-pitch-emails.md`
- `docs/marketing/founder-podcast-tour-spec.md`
- `docs/roadmap/items/Q4/marketing/010-founder-podcast-circuit-8-startup-spirituality-pod.md`

## Status

`in_progress` — flips to `shipped` after founder records + 8 hosts publish. No code touched; pure marketing-execution handoff.
