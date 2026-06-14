# R-Q3-G-003 — Chennai soft launch (handoff)

> Status: Tamil-language Chennai landing + cities.ts anchor temples shipped (scaffold). Supply onboarding (25 pandits) + temple verification (5 MoUs) + 1.2K MAU marketing = founder-action-required. Engineering surface complete; live KPI = 0 until founder unblocks supply.

## KPI

- Metric: `chennai_mau` (30-day rolling, sessions table city='Chennai')
- Target: 1200 MAU by end-Q3 2026
- Current: 0
- Source: Supabase — `SELECT COUNT(DISTINCT user_id) FROM user_sessions s JOIN users u ON s.user_id = u.id WHERE u.location_city = 'Chennai' AND s.last_active_at >= NOW() - INTERVAL '30 days';`

## Success criteria

| # | Criterion | Status | Owner |
|---|---|---|---|
| 1 | Chennai MAU ≥ 1200 by end-Q3 | ⏳ | Demand activation (post supply ready) |
| 2 | R-Q3-S-001 — 25 verified Chennai pandits onboarded | ⏳ | Founder (KYC video calls + Aadhaar verify) |
| 3 | R-Q3-S-009 — 5 verified Chennai temples (Kapaleeshwarar + Parthasarathy + Vadapalani + Marundeeshwarar + ISKCON) | ⏳ | Founder + ops (MoU + temple-portal verified=true flip) |
| 4 | Tamil UI surface w/ Chennai-local CTAs + anchor temples + pandit roster | ✓ shipped | This batch |

## What shipped this batch

- `apps/web/app/ta/chennai/page.tsx` — NEW Tamil-language Chennai landing.
  - 5 anchor-temple cards (Kapaleeshwarar Mylapore, Parthasarathy Triplicane, Vadapalani Murugan, Marundeeshwarar Thiruvanmiyur, ISKCON Injambakkam) in Tamil w/ area + deity + highlight (Brahmotsavam / Vaikunta Ekadashi / Thaipusam / Janmashtami).
  - 25-pandit roster table split across 4 zones (Mylapore+Triplicane 7 / Vadapalani+T.Nagar 6 / Thiruvanmiyur+Adyar+Besant Nagar 6 / ECR+OMR 6) — all `recruiting` until founder KYC.
  - Chennai-localized CTAs (`/pujas?city=chennai`, `/darshan?city=chennai`).
  - NRI Tamils section (Singapore/Malaysia/US/UK diaspora) — annual subscription ₹5000/$60.
  - `LocalBusiness` schema.org JSON-LD (areaServed: Chennai, inLanguage: ta+en).
  - Edge runtime, revalidate 86400.
  - hreflang alternates → `/city/chennai` English canonical.
- `apps/web/lib/cities.ts` — Chennai entry expanded: `famousTemples` 4→6 with exact spec names (Kapaleeshwarar Mylapore / Parthasarathy Triplicane / Vadapalani Murugan / Marundeeshwarar Thiruvanmiyur / ISKCON Chennai / Ashtalakshmi Besant Nagar), `popularDeities` +murugan +krishna, `popularPujas` 3→5 (+satyanarayan-katha +kartikeya-puja), `significance` extended with Margazhi music season + Vaikunta Ekadashi + Thaipusam diaspora callout.
- `apps/web/app/sitemap.ts` — `/ta/chennai` priority 0.85 entry added.

## Sales/onboarding tactics (per agent_brief)

1. **Tamil influencer collabs** — Spirit of Madras, Madras Inherited, Tamil Bhakti YouTube channels (founder warm contacts or DM outreach via R-Q3-S-001 supply funnel).
2. **Cantonal saturation Meta ads** — geo-targeted Chennai metro (bbox 12.8-13.2°N, 80.1-80.3°E). Budget allocation post supply ready (don't drive traffic to empty inventory).
3. **Local Brahmin / Iyengar / Iyer community FB + WhatsApp groups** — Tamil Brahmana Sabha, Iyengar Madurai+Chennai groups, Sri Vaishnava forums.
4. **Google Maps temple list scrape + WhatsApp outreach** — top-50 Chennai temples by review count, prioritize 5 anchor temples first.

Each verified pandit MUST have `aadhaar_verified=true` per business rule #4.

## Founder action (BLOCKING)

1. KYC video calls with first 25 Chennai pandits (Q3 2026). Aim 4 zones balanced per roster table.
2. Aadhaar verification (manual cross-check via official Aadhaar e-KYC portal — Darshya does NOT auto-verify).
3. Temple onboarding MoU (5 anchor temples) — verified=true flip in `/admin/temples` only after MoU signed.
4. Coordinate with R-Q3-S-001 (25 pandits) + R-Q3-S-009 (5 temples) — same KYC funnel, different metric scrape.
5. Marketing activation post-supply-ready: Tamil influencer DMs + geo-targeted Meta ads (₹15-25K test budget).
6. Decision Agent KPI scrape `chennai_mau` flips to live count after `user_sessions` table populates from first Chennai logins.

## Dependencies (HARD BLOCK)

- **R-Q3-S-001** — 25 Chennai pandits onboarded (must ship first).
- **R-Q3-S-009** — 5 Chennai temples verified live (must ship first).

This item stays `in_progress` until both pre-reqs flip `shipped`. Engineering surface is ready to receive traffic; cannot drive traffic until pandits + temples live.

## KPI query (Supabase)

```sql
SELECT COUNT(DISTINCT user_id) AS chennai_mau
FROM user_sessions s
JOIN users u ON s.user_id = u.id
WHERE u.location_city = 'Chennai'
  AND s.last_active_at >= NOW() - INTERVAL '30 days';
-- target: 1200 by end-Q3 2026
```

## Verify (post-deploy)

1. `curl -s -o /dev/null -w "%{http_code}" https://darshya.online/ta/chennai` — expect 200
2. `curl -s https://darshya.online/ta/chennai | grep -c "கபாலீஸ்வரர்"` — expect ≥1 (Tamil anchor temple name)
3. `curl -s https://darshya.online/ta/chennai | grep -c "ISKCON"` — expect ≥1
4. `curl -s https://darshya.online/city/chennai | grep -c "Vadapalani Murugan"` — expect ≥1 (English cities.ts expansion)
5. `curl -s https://darshya.online/sitemap.xml | grep -c "/ta/chennai"` — expect ≥1
