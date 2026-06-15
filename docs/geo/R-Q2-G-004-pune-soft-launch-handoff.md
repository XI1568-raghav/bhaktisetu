# R-Q2-G-004 — Pune soft launch (handoff)

> Status: Engineering surface for /city/pune live (anchor temples + popular pujas + Ashtavinayak yatra cross-link + NRI flag). Supply onboarding (25 pandits) + temple verification (5 MoUs) + 1K MAU marketing = founder-action-required. Item stays `in_progress` per known pitfall (KPI requires founder pandit/temple onboarding + marketing spend).

## KPI

- Metric: `pune_mau` (30-day rolling, sessions table city ILIKE '%pune%')
- Target: 1000 MAU by end-Q2 2026 (month_target=5)
- Current: 0
- Source: Supabase — `SELECT COUNT(DISTINCT u.id) FROM "User" u JOIN "UserSession" s ON s.user_id=u.id WHERE u.city ILIKE '%pune%' AND s.created_at >= NOW() - INTERVAL '30 days';`

## Success criteria

| # | Criterion | Status | Owner |
|---|---|---|---|
| 1 | R-Q2-S-004 — 25 verified Pune pandits onboarded | ⏳ | Founder (KYC video calls + Aadhaar verify) |
| 2 | R-Q2-S-007 — 5 verified Pune temples (Dagdusheth + Chaturshringi + Parvati + Sarasbaug + Kasba Ganpati) | ⏳ | Founder + ops (MoU + temple-portal verified=true flip) |
| 3 | 1000 Pune MAU (30d rolling) | ⏳ | Demand activation (post supply-ready) |
| 4 | /city/pune live w/ temples + pujas + pandits real data | ✓ shipped (this batch enriched lib/cities.ts Pune entry) | This batch |
| 5 | Sales pipeline: 3+ leads/week from /city/pune PostHog cohort | ⏳ | PostHog cohort wiring (post first live sessions) |

## What shipped this batch (R-Q2-G-004)

- `apps/web/lib/cities.ts` — Pune entry enriched:
  - `famousTemples` 4 → 7 (Dagdusheth Halwai + Chaturshringi + Parvati Hill + Rangari Ganpati + Kasba Ganpati (gramadevta) + Sarasbaug Siddhi Vinayak + Pataleshwar Cave Shiva). Covers the 5 anchor temples requested in spec + 2 culturally-essential additions.
  - `popularDeities` +datta (Datta sampradaya strong in Maharashtra).
  - `popularPujas` 3 → 8 (+navgraha + griha-pravesh + navaratri + sundarkand + datta-jayanti).
  - `nearbyYatra` added (ashtavinayak + shirdi-sai — both anchor circuits accessible from Pune).
  - `description` extended (Oxford of the East + Wai-Pune-Sangli Vedic gurukul belt + Marathi pandit sabha catchment).
  - `significance` extended (Kasba Ganpati gramadevta + Chaturshringi as Devi peetha + Ashtavinayak yatra anchor).
  - `isNriMagnet: true` — Marathi diaspora in US/UK/Gulf + Ganesh Chaturthi NRI gift-puja anchor lane.
- `docs/geo/R-Q2-G-004-pune-soft-launch-handoff.md` — this handoff (created).

The /city/pune route auto-fans from `apps/web/app/city/[slug]/page.tsx` (already runtime='edge' + revalidate=86400). No new route file needed. Sitemap includes /city/pune via `CITIES.map` flatten.

## Anchor temples for outreach (public-domain handles)

These are public institutional contacts — listed for cold-outreach scripting only. NO personal pandit names fabricated. All MoU negotiations require founder direct contact.

| # | Temple | Area | Public contact | Notes |
|---|---|---|---|---|
| 1 | Shrimant Dagdusheth Halwai Ganpati | Budhwar Peth | https://www.dagdushethganpati.com / +91 20 2447 8222 | Largest Ganpati trust in Pune. Trust contact via official website only. |
| 2 | Shri Chaturshringi Devi | Senapati Bapat Rd, Gokhalenagar | https://chaturshringitempletrust.com | Navratri 9-day mela; Devi peetha. |
| 3 | Parvati Hill Temple | Parvati, Pune-Satara Rd | Hill-top temple complex, devasthan trust | Shiva + Vishnu + Kartikeya + Ganesha shrines on one hill. |
| 4 | Sarasbaug Shri Siddhi Vinayak | Sarasbaug, Sadashiv Peth | Pune Municipal heritage trust | Visarjan staging temple — high-traffic. |
| 5 | Kasba Ganpati | Kasba Peth | Gramadevta trust | Pune city deity — first invitation in any city procession. |

Cold outreach to these MUST use partnerships@darshya.online + reference public temple websites only. NO claims of pre-existing MoU until founder closes.

## Pandit onboarding (BLOCKING)

Per R-Q2-S-004 (25 Pune pandits). Zones recommended (rough split — adjust by KYC actual):

| Zone | Target pandits | Anchor neighborhoods |
|---|---|---|
| Central Pune (Peth area) | 8 | Budhwar / Sadashiv / Shaniwar / Kasba / Narayan Peth |
| West Pune (Karve Rd + Kothrud + Senapati Bapat) | 6 | Kothrud / Erandwane / Karve Rd / Senapati Bapat |
| East Pune (Koregaon Park + Viman Nagar + Kharadi) | 5 | Koregaon Park / Viman Nagar / Kharadi (IT corridor, NRI catchment) |
| South Pune (Sinhagad Rd + Katraj + Dhankawadi) | 6 | Sinhagad Rd / Katraj / Dhankawadi / Bibwewadi |

Each verified pandit MUST have `aadhaar_verified=true` per business rule #4. Use existing `/list-pandit` funnel + `/admin/leads` admin moderation.

## Sales/marketing tactics (post supply ready)

1. **Marathi diaspora WhatsApp groups** — Pune Maharashtra Mandal (US East/West/UK), Marathi Mandal Bay Area, Marathi-NRI Telegram. Anchor message: "Send your Pune family puja booking from abroad — video proof + 24hr delivery."
2. **Ganesh Chaturthi pre-festival surge** — Aug-Sep 2026 ad budget. Geo-target Pune metro (bbox 18.4-18.6°N, 73.7-74.0°E). Budget allocation post supply ready (don't drive traffic to empty inventory).
3. **Local Brahmin / Deshastha / Konkanastha / Karhade community FB + WhatsApp groups** — Pune Brahman Sabha, Wai-Pune Vaidik mailing lists.
4. **Google Maps temple list scrape + WhatsApp outreach** — top-50 Pune temples by review count, prioritize 5 anchor temples first.
5. **Pune blogger collabs** — Pune Mirror lifestyle desk + InsightsPune YouTube + Marathi devotional channels (founder warm contacts or DM outreach).

## Free-tier budget impact

- 0 new agents created. Reuses existing `cold-temple-outreach.mjs` (25/day cap, env-or-noop on Resend).
- 0 new CF builds beyond this single PR (lib/cities.ts edit triggers 1 build).
- 0 new Render endpoints (uses existing /admin/temples + /admin/leads).
- Marketing budget = founder discretion (₹15-25K test Meta + WhatsApp blast cost = founder credit card).

## Founder action (BLOCKING — status stays in_progress)

1. KYC video calls with first 25 Pune pandits (Q2 2026). Aim 4 zones balanced per roster table above.
2. Aadhaar verification (manual cross-check via official Aadhaar e-KYC portal — Darshya does NOT auto-verify).
3. Temple onboarding MoU (5 anchor temples) — verified=true flip in `/admin/temples` only after MoU signed.
4. Coordinate with R-Q2-S-004 (Pune 25 pandits) + R-Q2-S-007 (Pune temples) — same KYC funnel, different metric scrape.
5. Marketing activation post-supply-ready: Marathi influencer DMs + Ganesh Chaturthi pre-festival ad surge (Aug-Sep 2026).
6. Decision Agent KPI scrape `pune_mau` flips to live count after `UserSession` table populates from first Pune logins.
7. Flip `status: shipped` + `shipped_at` on this item ONLY after pune_mau ≥ 1000 sustained 30 days.

## Dependencies (HARD BLOCK)

- **R-Q2-S-004** — 25 Pune pandits onboarded (must ship first).
- **R-Q2-S-007** — 5 Pune temples verified live (must ship first).

This item stays `in_progress` until both pre-reqs flip `shipped` AND `pune_mau` ≥ 1000.

## Verify

- `curl -s -o /dev/null -w "%{http_code}\n" https://darshya.online/city/pune` → expect 200.
- After CF deploy: `curl -s https://darshya.online/city/pune | grep -c "Dagdusheth"` → expect ≥1.
- After CF deploy: `curl -s https://darshya.online/city/pune | grep -c "Chaturshringi"` → expect ≥1.

<!-- Closes: Q-C-2026-06-15-R-Q2-G-004 -->
