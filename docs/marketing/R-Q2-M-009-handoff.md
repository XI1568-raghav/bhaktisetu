# R-Q2-M-009 — YouTube Channel Launch Handoff

> **Roadmap item**: R-Q2-M-009 (P1, Q2 2026, marketing)
> **Status**: in_progress — channel setup + content production require founder action
> **KPI**: 500 subscribers (target), 0 (current)
> **Source spec**: `docs/marketing/youtube-channel-q2-spec.md`

## Why this matters

YouTube is the highest-leverage SEO + brand surface for a devotional super-app in India.
- Captures "how to do X puja" + "live aarti" long-tail search traffic
- Builds trust via face-on-camera pandit content (vs. faceless app brands)
- Cross-pollinates Instagram/Shorts inventory at zero marginal cost
- Sets up YouTube Partner Program (post-1k subs + 4k watch-hours) as Q3+ revenue lane

## What ships in this PR (engineering scaffold)

1. This handoff doc (founder action checklist + acceptance criteria)
2. `scripts/agents/marketing/youtube-content-planner.mjs` — deterministic weekly content calendar generator
3. Acceptance: agent produces 4-week content slate w/ titles, descriptions, tags, scriptural hooks

## What the founder must do (cannot be agent-automated)

### Week 1 — channel setup (est. 4-6 hours)

- [ ] Create channel at youtube.com/@bhaktisetu (founder Google account)
- [ ] Upload banner (2560×1440, brand saffron + Devanagari ॐ + tagline)
- [ ] Upload logo (800×800 PNG, transparent bg)
- [ ] About section copy:
  > "Bhaktisetu is India's devotional super-app. Live darshan from 100+ verified temples, video-proof pujas, NRI gift puja, 80G receipts. Watch authentic aartis, learn how to perform pujas at home with verified pandits."
- [ ] Verified link: founder's LinkedIn profile
- [ ] Channel keywords: live aarti, darshan online, how to do puja, vedic rituals, sanatan dharma
- [ ] Enable monetization-prep (custom thumbnails, end screens, cards)
- [ ] Link bhaktisetu.com in description + banner CTA

### Week 1-4 — first 4 videos (cannot be skipped)

YouTube needs 4 videos minimum before algorithm starts surfacing the channel.

- [ ] Video 1: "How to do Rudrabhishek at home — step-by-step" (10-15 min)
  - Pandit-led, 4K, scripted intro + 3 chapter markers
  - Cross-link to /pujas/rudrabhishek
- [ ] Video 2: "Live Aarti from Kashi Vishwanath — 14 June 2026 highlights" (15-30 min curated)
- [ ] Video 3: "What is Pitra Paksha? Complete ritual guide" (10-15 min)
- [ ] Video 4: "Bhaktisetu Q&A — founder + pandit panel" (30 min)

### Ongoing — weekly cadence (per spec)

- Tuesday 12:00 IST — live darshan recording (15-30 min)
- Saturday 12:00 IST — how-to-puja explainer (10-15 min)
- Daily Mon-Fri — 60-sec aarti reels → Shorts shelf
- Monthly — Q&A panel (30 min)

## Founder action items — verifiable

| # | Item | Owner | Verify via |
|---|------|-------|------------|
| 1 | Channel created @bhaktisetu | founder | `curl -s "https://www.youtube.com/@bhaktisetu" \| grep -c "Bhaktisetu"` returns ≥1 |
| 2 | Banner + logo + about live | founder | manual visual check |
| 3 | First 4 videos uploaded | founder | YouTube channel page shows 4 entries |
| 4 | Weekly cadence (Tue + Sat) held 4 consecutive weeks | founder | content-planner agent log diff |
| 5 | 500 subscriber KPI hit | algorithm + organic | YouTube Studio analytics + manual snapshot |

## Why status stays `in_progress` not `shipped`

Per round-4 known pitfalls:
> DO NOT auto-claim status=shipped on items where KPI requires founder action (25 pandits onboard, $$$ raised, intl launches).

KPI is `youtube_subscribers: target 500`. 500 subscribers cannot be reached by shipping code — it requires:
1. Channel exists (founder)
2. Content produced + uploaded (founder + pandit recording sessions)
3. SEO + algorithm distribution (organic, multi-week)

Status flips to `shipped` only when:
- Channel live with banner + 4 videos
- Subscriber count ≥ 500 (verified via YouTube Studio screenshot in handoff log)

## Engineering scaffold (this PR)

### `scripts/agents/marketing/youtube-content-planner.mjs`

Deterministic weekly content slate generator.
- Reads festival calendar from `apps/web/lib/festival-calendar.ts` (if exists)
- Outputs 4-week slate to `docs/agent-reports/YYYY-MM-DD-youtube-content-plan.md`
- Per video: title, 250-word description (scriptural hooks), 15 tags, thumbnail brief, cross-link to /pujas/{slug}
- Deterministic (no LLM call) — same input = same output
- Run weekly: `node scripts/agents/marketing/youtube-content-planner.mjs`

### Free-tier check

- Zero external API calls (no YouTube Data API quota burn)
- Zero LLM tokens
- Runs in <1s
- Adds 0 cron min/mo (manual trigger; founder runs after Sunday review)

## References

- Primary spec: `docs/marketing/youtube-channel-q2-spec.md`
- Q3 follow-up: `docs/marketing/youtube-channel-q3-launch-spec.md`
- Companion roadmap items: R-Q2-M-004 (Instagram reels — feeds Shorts), R-Q2-M-007 (build-in-public)

## Closes

Engineering scaffold for R-Q2-M-009. Subscriber KPI tracking remains founder-owned.
