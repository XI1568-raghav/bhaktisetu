# R-Q1-G-001 — Bengaluru city-1 launch (handoff)

> Status: city page expanded; supply onboarding gated on founder KYC. Engineering scaffold complete; live KPI = 1 requires manual action.

## Success criteria

| # | Criterion | Status | Owner |
|---|---|---|---|
| 1 | ≥5 verified pandits in Bengaluru (Priest table, city='Bengaluru', aadhaar_verified=true) | ⏳ | Founder (KYC video calls + Aadhaar verify) |
| 2 | ≥5 verified temples in Bengaluru (Temple table, city='Bengaluru', verified=true) | ⏳ | Founder + ops (verify partnership MoU) |
| 3 | ≥3 paid bookings completed via Bengaluru pandits in last 30d | ⏳ | Demand activation (post supply ready) |
| 4 | /city/bengaluru page lists ≥5 temples + ≥10 puja offerings | ✓ shipped | This batch |

## What shipped this batch

- `apps/web/lib/cities.ts` — Bengaluru entry: `famousTemples` 4→7, `popularPujas` 3→12, `popularDeities` 3→5, expanded `description` + `significance` with Karaga festival + Chamundeshwari + Banashankari/Malleshwaram/Jayanagar belt callout.
- Page auto-rerenders via `/city/[slug]` SSG (revalidate=3600). No new route file.
- Criterion #4 ✅ met by re-build.

## Sales/onboarding tactics (per agent_brief)

1. **WhatsApp outreach** — ISKCON Bangalore + Banashankari Temple priests (founder warm contacts).
2. **Local Brahmin community FB groups** — Karnataka Brahmana Sabha, Smartha Iyer Bangalore, Madhwa community boards.
3. **Google Maps temple list scrape + cold call** — top-50 by review count in Bengaluru bbox.

Each verified pandit MUST have `aadhaar_verified=true` per business rule #4.

## Founder action (BLOCKING)

1. KYC video calls with first 5 pandits (Bengaluru, 2026-Q1).
2. Aadhaar verification (manual cross-check via official Aadhaar e-KYC portal — Darshya does NOT auto-verify).
3. Temple onboarding MoU (5 temples) — verified=true flip in `/admin` only after MoU signed.
4. After both: Decision Agent KPI scrape `city_active_bengaluru` should flip to 1.

## Dependencies

- Depends on R-Q1-S-002 (30 pandit onboarding pipeline). Founder coordinates same KYC funnel.

## KPI query (Supabase)

```sql
SELECT CASE
  WHEN (SELECT COUNT(*) FROM "Priest" WHERE city='Bengaluru' AND aadhaar_verified=true) >= 5
   AND (SELECT COUNT(*) FROM "Temple" WHERE city='Bengaluru' AND verified=true) >= 5
  THEN 1 ELSE 0 END;
```

Wired in `docs/roadmap/items/Q1/geo/001-open-bengaluru-market-5-pandits-5-temples-first-ci.md` frontmatter (kpi.query).
