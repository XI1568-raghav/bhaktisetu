# R-Q2-G-005 — Hyderabad soft launch (handoff)

> Status: Telugu-language Hyderabad landing + cities.ts anchor temples shipped (scaffold). Supply onboarding (25 pandits) + temple verification (5 MoUs) + 800 MAU marketing = founder-action-required. Engineering surface complete; live KPI = 0 until founder unblocks supply.

## KPI

- Metric: `hyderabad_mau` (30-day rolling, UserSession join)
- Target: 800 MAU by end-Q2 2026
- Current: 0
- Source: Supabase — `SELECT COUNT(DISTINCT u.id) FROM "User" u JOIN "UserSession" s ON s.user_id=u.id WHERE u.city ILIKE '%hyderabad%' AND s.created_at >= NOW() - INTERVAL '30 days';`

## Success criteria

| # | Criterion | Status | Owner |
|---|---|---|---|
| 1 | Hyderabad MAU ≥ 800 by end-Q2 | ⏳ | Demand activation (post supply ready) |
| 2 | R-Q2-S-005 — 25 verified Hyderabad pandits onboarded | ⏳ | Founder (KYC video calls + Aadhaar verify) |
| 3 | R-Q2-S-008 — 5 verified Hyderabad temples (Birla Mandir + Chilkur Balaji + Bhagyalakshmi + Jagannath Banjara Hills + ISKCON) | ⏳ | Founder + ops (MoU + temple-portal verified=true flip) |
| 4 | Telugu UI surface w/ Hyderabad-local CTAs + anchor temples + pandit roster | ✓ shipped | This batch |
| 5 | Sales pipeline: 2+ leads/week from /city/hyderabad PostHog cohort | ⏳ | Post-supply-ready marketing activation |

## What shipped this batch

- `apps/web/app/te/hyderabad/page.tsx` — NEW Telugu-language Hyderabad landing.
  - 5 anchor-temple cards (Birla Mandir Naubat Pahad, Chilkur Balaji Moinabad, Bhagyalakshmi Charminar, Jagannath Banjara Hills, ISKCON Abids/HKL) in Telugu w/ area + deity + highlight (Vaikuntha Ekadashi / Visa Balaji 108 pradakshina / Varalakshmi Vrat / Ratha Yatra / Janmashtami).
  - 25-pandit roster table split across 4 zones (Secunderabad+Tank Bund 6 / Banjara+Jubilee Hills 6 / HITEC City+Gachibowli+Kondapur 7 / Old City+LB Nagar+Uppal 6) — all `recruiting` until founder KYC.
  - Hyderabad-localized CTAs (`/pujas?city=hyderabad`, `/darshan?city=hyderabad`).
  - NRI Telugus section (USA NJ/Bay Area/Texas, UK, AU, Singapore diaspora) — annual subscription ₹5000/$60.
  - `LocalBusiness` schema.org JSON-LD (areaServed: Hyderabad, inLanguage: te+en).
  - Edge runtime, revalidate 86400.
  - hreflang alternates → `/city/hyderabad` English canonical.
- `apps/web/lib/cities.ts` — Hyderabad entry expanded: `famousTemples` 4→6 with exact spec names (Birla Mandir / Chilkur Balaji / Bhagyalakshmi / Jagannath Banjara Hills / ISKCON Hyderabad / Sanghi Temple), `popularDeities` +krishna, `popularPujas` 3→5 (+venkateshwara-puja +rudrabhishek), `nearbyYatra` added (yadagirigutta + srisailam-bhramaramba + bhadrachalam), `significance` extended w/ Birla Mandir + Bhagyalakshmi + Telugu/Hindi/Urdu trilingual culture + HITEC City NRI corridor + Yadagirigutta/Bhadrachalam/Srisailam circuit callout.
- `apps/web/app/sitemap.ts` — `/te/hyderabad` priority 0.85 entry added.

## Sales/onboarding tactics (per agent_brief)

1. **Telugu influencer collabs** — Sumantv Devotional, BhakthiTV Telugu, Telugu BhakthiTube channels (founder warm contacts or DM outreach via R-Q2-S-005 supply funnel).
2. **Cantonal saturation Meta ads** — geo-targeted Hyderabad metro (bbox 17.3-17.6°N, 78.3-78.6°E). Budget allocation post supply ready (don't drive traffic to empty inventory).
3. **Local Brahmin / Smartha / Madhwa community FB + WhatsApp groups** — Telangana Brahmana Sangam, Andhra Brahmin Welfare Assoc, Madhwa Sangha Hyderabad, Vaishnava forums.
4. **Google Maps temple list scrape + WhatsApp outreach** — top-50 Hyderabad temples by review count, prioritize 5 anchor temples first.
5. **HITEC City IT-park lunchtime stalls** — Microsoft / Amazon / Google / Wipro / Infosys / DBS Hyderabad campuses — leverage NRI Telugu remittance "send puja home" sender persona.

Each verified pandit MUST have `aadhaar_verified=true` per business rule #4.

## Founder action (BLOCKING)

1. KYC video calls with first 25 Hyderabad pandits (Q2 2026). Aim 4 zones balanced per roster table.
2. Aadhaar verification (manual cross-check via official Aadhaar e-KYC portal — Darshya does NOT auto-verify).
3. Temple onboarding MoU (5 anchor temples) — verified=true flip in `/admin/temples` only after MoU signed. Note: Chilkur Balaji is a free temple with no VIP/hundi; offline coordination only — may require alternate pandit-on-site model rather than direct temple revenue share.
4. Coordinate with R-Q2-S-005 (25 pandits) + R-Q2-S-008 (5 temples) — same KYC funnel, different metric scrape.
5. Marketing activation post-supply-ready: Telugu influencer DMs + geo-targeted Meta ads (₹15-25K test budget) + HITEC City IT-park stalls.
6. Decision Agent KPI scrape `hyderabad_mau` flips to live count after `UserSession` table populates from first Hyderabad logins.

## Dependencies (HARD BLOCK)

- **R-Q2-S-005** — 25 Hyderabad pandits onboarded (must ship first).
- **R-Q2-S-008** — 5 Hyderabad temples verified live (must ship first).

This item stays `in_progress` until both pre-reqs flip `shipped`. Engineering surface is ready to receive traffic; cannot drive traffic until pandits + temples live.

## KPI query (Supabase)

```sql
SELECT COUNT(DISTINCT u.id) AS hyderabad_mau
FROM "User" u
JOIN "UserSession" s ON s.user_id = u.id
WHERE u.city ILIKE '%hyderabad%'
  AND s.created_at >= NOW() - INTERVAL '30 days';
-- target: 800 by end-Q2 2026
```

## Verify (post-deploy)

1. `curl -s -o /dev/null -w "%{http_code}" https://darshya.online/te/hyderabad` — expect 200
2. `curl -s https://darshya.online/te/hyderabad | grep -c "బిర్లా"` — expect ≥1 (Telugu anchor temple name fragment)
3. `curl -s https://darshya.online/te/hyderabad | grep -c "Chilkur"` — expect ≥1
4. `curl -s https://darshya.online/city/hyderabad | grep -c "Birla Mandir"` — expect ≥1 (English cities.ts expansion)
5. `curl -s https://darshya.online/sitemap.xml | grep -c "/te/hyderabad"` — expect ≥1

## South India expansion context

Hyderabad (Q2) is the second south-India anchor after Bengaluru (Q1) and pairs with Chennai (Q3) for cross-state Telugu+Tamil coverage. NRI Telugu diaspora is the highest-ARPU south-Indian segment (US H1B concentration). Birla Mandir + Chilkur Balaji + ISKCON give us cross-tradition coverage (Vaishnavism + Smartha + ISKCON Gaudiya) in a single metro. Onward expansion: Visakhapatnam + Tirupati (already R-Q1-G-* dependency) tie into this anchor.
