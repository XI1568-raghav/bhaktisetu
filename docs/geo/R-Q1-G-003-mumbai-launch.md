# R-Q1-G-003 — Mumbai city-3 launch (handoff)

> Status: city page expanded; supply onboarding gated on founder Mumbai trip + KYC video calls. Engineering scaffold complete; live KPI = 1 requires manual sales action.

## Why Mumbai (city-3)

- **Highest disposable income per devotee** in India (Mumbai metro = 20M, financial capital).
- **NRI gift-puja anchor** — Gujarati + Marathi diaspora in US/UK/Canada/Australia are the single largest "send puja to relatives in India" lane. Mumbai is the canonical source city for that flow.
- **Siddhivinayak halo** — one of the most-visited Hindu temples globally (Bollywood/cricketer pilgrimage anchor) drives organic SEO + word-of-mouth pull.
- **ISKCON Juhu density** — Krishna-bhakt audience already mobilized; warm intro pathway via R-Q1-S-006.

## Success criteria

| # | Criterion | Status | Owner |
|---|---|---|---|
| 1 | ≥25 verified pandits in Mumbai (Priest table, city='Mumbai', aadhaar_verified=true) | ⏳ | Founder (Mumbai trip Q1 M2 + KYC video calls) |
| 2 | ≥5 verified temples in Mumbai (Temple table, city='Mumbai', verified=true) | ⏳ | Founder + ops (Siddhivinayak + ISKCON Juhu + 3 others MoU) |
| 3 | ≥5 paid bookings completed via Mumbai pandits in last 30d | ⏳ | Demand activation (post supply ready) |
| 4 | Mumbai NRI gift-puja conversion (USD payment) lights up | ⏳ | NRI lane GTM (post supply ready) |
| 5 | /city/mumbai page lists ≥7 temples + ≥12 puja offerings | ✓ shipped | This batch |

## What shipped this batch

- `apps/web/lib/cities.ts` — Mumbai entry expanded:
  - `famousTemples` 4 → 7 (added Babulnath, Walkeshwar/Banganga, Shree Swaminarayan Bhuleshwar)
  - `popularPujas` 3 → 12 (added griha-pravesh, rudrabhishek, navgraha-puja, gift-puja-nri, janmashtami-puja, diwali-lakshmi-puja, ganesh-chaturthi-puja, mangalwar-vrat, shani-puja)
  - `popularDeities` 3 → 5 (added shiva, devi)
  - `description` expanded — NRI anchor + diaspora ties + temple density signal
  - `significance` extended — NRI LTV positioning
- Page auto-rerenders via `/city/[slug]` SSG (revalidate=3600). No new route file.
- Criterion #5 ✅ met by re-build.

## Sales/onboarding tactics (per agent_brief)

1. **Siddhivinayak + ISKCON Juhu priest outreach** — founder warm contacts via existing temple network (R-Q1-S-006).
2. **Gujarati pandit network** — high commission willingness, dense supply pool in Mumbai metro.
3. **Marathi local-news PR** — Loksatta + Maharashtra Times angle on "online puja booking for NRI relatives."
4. **WhatsApp outreach** — Maharashtra Brahmana Sabha + Gujarati Samaj boards.
5. **Existing prospects** — `docs/sales/mumbai-pandit-prospects-2026-06.md` + `docs/sales/mumbai-pandit-q2-expansion.md` + `docs/sales/mumbai-temples-5-prospects.md` lists already populated.

Each verified pandit MUST have `aadhaar_verified=true` per business rule #4 (Aadhaar gate on priest payout).

## Founder action (BLOCKING)

1. **3-day Mumbai trip Q1 month 2** (per agent_brief).
2. KYC video calls with first 25 pandits (Mumbai, 2026-Q1).
3. Aadhaar verification (manual cross-check via official Aadhaar e-KYC portal — Darshya does NOT auto-verify).
4. Temple onboarding MoU (5 temples — Siddhivinayak + ISKCON Juhu + 3 others) — verified=true flip in `/admin` only after MoU signed.
5. After both: Decision Agent KPI scrape `city_active_mumbai` should flip to 1.

## Dependencies

- Depends on **R-Q1-S-003** (25 Mumbai pandits) + **R-Q1-S-006** (5 Mumbai temples) — coordinate same KYC funnel.

## KPI query (Supabase)

```sql
SELECT CASE
  WHEN (SELECT COUNT(*) FROM "Priest" WHERE city='Mumbai' AND aadhaar_verified=true) >= 25
   AND (SELECT COUNT(*) FROM "Temple" WHERE city='Mumbai' AND verified=true) >= 5
  THEN 1 ELSE 0 END;
```

Wired in `docs/roadmap/items/Q1/geo/003-open-mumbai-market-third-city.md` frontmatter (kpi.query).
