# R-Q4-G-003 — Indore city-8 launch (handoff)

> Status: city page scaffold shipped; supply onboarding gated on founder KYC. 25 pandit / 5 temple recruit = founder action. status stays in_progress.

## Why Indore (8 of 25 cities target)

- Population 3.5M (15th-largest India metro)
- Gateway to Ujjain Mahakaleshwar (55km) — Indore is the recommended overnight base for Bhasm Aarti (3-4am temple entry requires pre-dawn pickup from Indore)
- Khajrana Ganesh draws 1L+ Wednesday devotees — established weekly retention loop
- MP central-India footprint: bridges existing Q1-Q3 launches (Bengaluru / Mumbai / Varanasi / Delhi) without overlap
- Lower CAC than Tier-1 metros (per Y1 plan: ~₹40 vs ₹120 for Mumbai)

## Success criteria

| # | Criterion | Status | Owner |
|---|---|---|---|
| 1 | ≥5 verified pandits in Indore (Priest table, city='Indore', aadhaar_verified=true) | ⏳ | Founder (KYC video calls + Aadhaar verify) |
| 2 | ≥5 verified temples in Indore (Temple table, city='Indore', verified=true) | ⏳ | Founder + ops (verify partnership MoU) |
| 3 | ≥3 paid bookings completed via Indore pandits in last 30d | ⏳ | Demand activation (post supply ready) |
| 4 | /city/indore page lists ≥5 temples + ≥4 puja offerings | ✓ shipped | This batch |
| 5 | 3000 active users (PostHog city_active_users_indore) | ⏳ | 90d post-launch |

## What shipped this batch

- `apps/web/lib/cities.ts` — Indore entry added: 6 famous temples (Khajrana Ganesh / Annapurna / Bijasan Mata / Bada Ganpati / Gomatgiri Jain / Kanch Mandir Jain), 3 deities, 4 popular pujas, Ahilyabai Holkar + Wednesday-Ganesh significance, Ujjain-base callout, pinPrefix 452.
- Page auto-rerenders via `/city/[slug]` SSG (revalidate=3600). No new route file.
- Sitemap auto-fans via `citySlugs()`.
- Criterion #4 ✅ met by re-build.

## Sales / onboarding tactics (per agent_brief)

1. **Khajrana Ganesh / Annapurna Temple priests** — founder warm contact via Indore Brahmin Mahasabha (MP unit).
2. **Ujjain pandit overflow** — Mahakaleshwar Bhasm Aarti pandits often live in Indore. Recruit 5-8 via existing Ujjain channels (R-Q3 launch).
3. **Madhya Pradesh Brahmana Sabha** — state-level Brahmin federation, registered in Bhopal. Mass WhatsApp outreach with referral code.
4. **Google Maps temple list scrape + cold call** — top-30 temples in Indore bbox (22.6°-22.8° lat × 75.7°-76.0° lon).
5. **Annapurna prasad distribution centers** — 2 active centers double as devotee discovery channel.

Each verified pandit MUST have `aadhaar_verified=true` per business rule #4.

## Founder action (BLOCKING — KPI #1, #2, #5)

1. KYC video calls with first 5 pandits (Indore, 2026-Q4).
2. Aadhaar verification (manual cross-check via official Aadhaar e-KYC portal — Darshya does NOT auto-verify).
3. Temple onboarding MoU (5 temples) — verified=true flip in `/admin` only after MoU signed.
4. After both: Decision Agent KPI scrape `city_active_users_indore` (PostHog) should begin ramp toward 3000 target.
5. 25-pandit recruit target = founder coordinates over Q4 (sub-batches of 5).

## Dependencies

- Depends on R-Q4-S-001 (next-quarter pandit onboarding pipeline). Founder coordinates same KYC funnel.
- Soft-coupled to Ujjain (R-Q3-G-00X) — Indore is the operational base for Mahakaleshwar packages.

## KPI query (Supabase)

```sql
SELECT CASE
  WHEN (SELECT COUNT(*) FROM "Priest" WHERE city='Indore' AND aadhaar_verified=true) >= 5
   AND (SELECT COUNT(*) FROM "Temple" WHERE city='Indore' AND verified=true) >= 5
  THEN 1 ELSE 0 END;
```

Active-user KPI lives in PostHog (`city_active_users_indore`); query TBD-populate per item frontmatter.

## Why status stays in_progress (NOT shipped)

This batch ships engineering scaffold (city page + sales-tactics playbook). Live KPI = supply recruited + active users on prod. Founder must execute KYC calls + MoU signing before status flips to shipped. Per project pitfall doctrine: "DO NOT auto-claim shipped status on items where the KPI requires founder action (onboarding 25 pandits/city = founder recruits, not agent)."
