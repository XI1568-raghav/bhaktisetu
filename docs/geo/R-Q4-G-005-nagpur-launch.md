# R-Q4-G-005 — Nagpur city-10 launch (handoff)

> Status: city page scaffold shipped; supply onboarding + activation gated on founder action. Engineering = complete; live KPI requires manual recruitment.

## Why Nagpur (central India, city 10/25)

- Geographic centre of India (Zero Mile Marker) — natural Vidarbha-region hub spanning Wardha, Amravati, Chandrapur, Gondia.
- 2.4M urban population; Tier-2 with rising HNI Hindi-Marathi devotee base.
- Ganesh Utsav is a city-wide economic event (Aug-Sep) — natural demand spike for puja booking and live-darshan supply.
- Ramtek (40km north) is a major Ramayana-trail pilgrimage anchor — cross-sells with R-Q1-G-002 Varanasi and Q1-Q2 Ayodhya circuits.
- Diksha Bhoomi adds Buddhist-Hindu syncretic positioning (avoid sect-coding the homepage; lead with universal devotional language).

## Success criteria

| # | Criterion | Status | Owner |
|---|---|---|---|
| 1 | ≥5 verified pandits in Nagpur (Priest table, city='Nagpur', aadhaar_verified=true) | ⏳ | Founder (KYC video calls + Aadhaar verify) |
| 2 | ≥5 verified temples in Nagpur (Temple table, city='Nagpur', verified=true) | ⏳ | Founder + ops (MoU sign-off) |
| 3 | ≥3 paid bookings completed via Nagpur pandits in last 30d | ⏳ | Demand activation (post supply ready) |
| 4 | /city/nagpur page lists ≥5 temples + ≥3 puja offerings | ✓ shipped | This batch |
| 5 | KPI source `city_active_users_nagpur` returning >0 in PostHog | ⏳ | Decision Agent (post launch) |

## What shipped this batch

- `apps/web/lib/cities.ts` — Nagpur entry added (city 26 in CITIES array; `slug: 'nagpur'`, `state: 'Maharashtra'`, 5 famous temples, 3 deities, 3 pujas, Ganesh Utsav + Marbat festival significance, Vidarbha catchment callout).
- Page auto-renders via `/city/[slug]` SSG (revalidate=3600). No new route file required.
- Sitemap auto-fans out next build via `citySlugs()` helper.
- Criterion #4 ✅ met by re-build.

## Sales/onboarding tactics (founder action)

1. **WhatsApp outreach (warm)** — Tekdi Ganesh + Poddareshwar Ram Mandir + Ramtek (existing founder Maharashtra contacts).
2. **Local Brahmin community boards** — Vidarbha Brahmin Sabha, Marathi Brahmin Maharashtra Mandal, Deshastha + Kokanastha groups WhatsApp/FB.
3. **Pandal organiser outreach** — pre-Ganesh-Utsav (Jun-Jul window) cold-call top-20 Sarvajanik Ganeshotsav Mandals; offer concierge pandit booking for pandal pratishthapana.
4. **Google Maps temple scrape** — top-30 by review count in Nagpur city bbox + Ramtek + Kamptee + Hingna.
5. **University outreach** — RTMNU Sanskrit dept + Kavi Kulguru Kalidas Sanskrit University (Ramtek) for young verified pandit talent pipeline.

Each verified pandit MUST have `aadhaar_verified=true` per business rule #4.

## Founder action (BLOCKING — agent cannot unblock)

1. KYC video calls with first 5 Nagpur pandits (2026-Q4 target).
2. Aadhaar verification (manual cross-check via official Aadhaar e-KYC portal — Darshya does NOT auto-verify).
3. Temple onboarding MoU (5 temples) — `verified=true` flip in `/admin` only after MoU signed.
4. After both: Decision Agent KPI scrape `city_active_users_nagpur` should flip from 0 → live.
5. Configure PostHog query for `city_active_users_nagpur` (TBD — see KPI block below) before orchestrator soak Day-8 go-live.

## Dependencies

- Depends on R-Q4-S-001 (supply onboarding pipeline batch — see roadmap frontmatter).
- Demand activation post supply: WhatsApp blast to Maharashtra waitlist + Nagpur city geo-targeted Google Ads ₹5k seed budget.

## KPI source (PostHog query TBD)

Populate `kpi.query` in `docs/roadmap/items/Q4/geo/005-onboard-new-india-city-nagpur-10-of-25-central.md` frontmatter before orchestrator go-live. Suggested PostHog HogQL:

```sql
SELECT count(DISTINCT person_id)
FROM events
WHERE event IN ('puja_booked', 'darshan_viewed', 'kundli_generated')
  AND properties.$geoip_city = 'Nagpur'
  AND timestamp > now() - INTERVAL 30 DAY;
```

Threshold for KPI=1: ≥100 active users/30d (scales to target=3000 over 6mo).

## Revenue model

- Target ₹1L (lakh) cumulative GMV in first 6 months (per roadmap `revenue_impact.amount_inr`).
- At ₹500 avg booking + 30% platform commission = 200 bookings = ~₹30k commission.
- Stretch: pandal-season concierge tier (₹2.5k-5k AOV) drives 60% of Q4 GMV.

## Cross-references

- `apps/web/lib/cities.ts` — Nagpur entry (this batch).
- `docs/roadmap/items/Q4/geo/005-onboard-new-india-city-nagpur-10-of-25-central.md` — roadmap item (status remains `in_progress` until founder gates clear).
- `docs/geo/R-Q1-G-001-bengaluru-launch.md` — template precedent.
- `docs/geo/R-Q1-G-003-mumbai-launch.md` — Maharashtra sister-city onboarding learnings.
