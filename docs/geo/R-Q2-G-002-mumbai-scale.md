# R-Q2-G-002 — Mumbai scaled to 80% target (handoff)

> Status: engineering scaffold shipped; supply scale + MAU activation blocked on sales execution.
> Parent: builds on R-Q1-G-003 Mumbai city-3 base (5 pandits + 5 temples planned as Q1 close).

## Success criteria

| # | Criterion | Status | Owner |
|---|---|---|---|
| 1 | 50 verified pandits in Mumbai (cumulative — Q1 25 from R-Q1-S-003 + Q2 25 from R-Q2-S-002) | ⏳ blocked-on-sales | Founder (KYC) + sales drip |
| 2 | 10 verified temples in Mumbai (cumulative — Q1 5 + Q2 5) | ⏳ blocked-on-sales | Founder + ops |
| 3 | 2000 Mumbai MAU (distinct UserSession 30d where User.city=Mumbai) | ⏳ blocked-on-supply | Demand activation post supply ready |
| 4 | /city/mumbai landing live with real temples + pujas + pandits data | ✓ shipped Q1 (R-Q1-G-003) | This batch verified |
| 5 | Sales pipeline: 5+ leads/week from /city/mumbai PostHog cohort | ⏳ post launch | Sales (after PostHog cohort cuts) |

## What shipped this batch (engineering side)

- **Scale handoff doc** (this file) — sales playbook + KPI tracking + dependency map for the 80% Mumbai target.
- **Mumbai page already live** in `apps/web/lib/cities.ts` (line 40-54) — Siddhivinayak, Mahalaxmi, Mumba Devi, ISKCON Juhu listed; popular pujas (ganesh-puja, lakshmi-puja, satyanarayan-puja); isNriMagnet=true (Gujarati/Marathi diaspora anchor). No code change needed — page renders; scaling is a supply + demand problem.
- **KPI tracked in frontmatter** via `kpi.query` SQL — Decision Agent scrapes nightly into `_kpi-state.json`. When pandit + temple + MAU all hit thresholds, status flips to `shipped`.

## Verification: /city/mumbai live

```bash
curl -s -o /dev/null -w "%{http_code}" https://darshya.online/city/mumbai
# expect 200

curl -s https://darshya.online/city/mumbai | grep -c "Siddhivinayak"
# expect >=1 (page renders famous temples list)

curl -s "https://api.darshya.online/api/v1/temples?city=Mumbai&limit=12" | jq '.data | length'
# expect: starts 0-2 in early Q2, target 10 by end-Q2
```

## Sales/onboarding tactics (per agent_brief)

### Pandit acquisition (25 new in Q2 → 50 cumulative)

1. **Weekly `scripts/agents/cold-temple-outreach.mjs` Mumbai segment** — automated WhatsApp drip to verified phone numbers in Mumbai bbox (Greater Mumbai + Navi Mumbai + Thane).
2. **Siddhivinayak + ISKCON Juhu priest networks** — founder warm intro; high-trust referral chain expected.
3. **Gujarati pandit network** (Walkeshwar, Khar, Vile Parle belt) — high commission willingness, NRI gift-puja anchor.
4. **Marathi Brahman Mahasabha + Konkanastha Brahman Sabha** — community FB groups, paid post w/ referral incentive (₹500 per onboarded priest).
5. **Mumbai temple priest WhatsApp groups** (founder warm contacts post Q1) — direct WA broadcast w/ onboarding deck.

### Temple acquisition (5 new in Q2 → 10 cumulative)

1. Top-50 Google Maps Mumbai temples by review count → cold call → MoU pitch.
2. Mahalaxmi, Mumba Devi, Babulnath, Banganga (founder warm contacts).
3. ISKCON Juhu + ISKCON Chowpatty (Vaishnava lane, faster MoU).
4. Walkeshwar Mandir + Vajreshwari (smaller, faster MoU close).
5. Shree Siddhivinayak Trust — multi-temple MoU possible if founder pitches devotee-acquisition value.

### MAU activation (target 2000 distinct/30d)

1. Google Ads geo-targeted Mumbai → /city/mumbai landing (post supply ready).
2. PostHog cohort `mumbai_visitor` filter → retargeting.
3. WhatsApp broadcast to Mumbai phone leads after each pandit goes live.
4. Marathi/Gujarati local-news PR (Lokmat Times, Mid-day weekend supplement).
5. Mumbai-specific Ganesh Chaturthi campaign (Q2 Aug-Sep window) — highest demand spike.

## Founder action items (BLOCKING)

1. **KYC video calls × 25** new pandits across Q2 (one per week). ~30min each.
2. **Aadhaar verification** — manual cross-check via official Aadhaar e-KYC for each.
3. **Temple MoU × 5 new** — sign during founder Mumbai visit (recommend 3-day trip — Bandra/Andheri/Powai belt + South Mumbai temples).
4. **PostHog Mumbai cohort** — define cohort filter `properties.city == "Mumbai" OR user_city == "Mumbai" OR properties.city == "Bombay"`.
5. **Google Ads budget** — ₹15-25k/month geo-targeted post supply ready (~Q2 mid).
6. **NRI gift-puja USD rail** — Mumbai is highest Gujarati/Marathi diaspora source — coordinate w/ R-Q2-G-006 NRI launch.

## Dependencies

- **R-Q1-G-002 / R-Q1-G-003** (Mumbai city-3 base — 5 pandits + 5 temples) — must be at ≥5/5 before Q2 scale work makes sense.
- **R-Q2-S-002** (Mumbai +25 pandits Q2 onboarding) — must coordinate funnel.
- **R-Q1-S-006** (5 Mumbai temples Q1) — Q2 inherits this funnel.
- **Daily uptime-pinger** already curls /city/mumbai — no new monitoring needed.

## KPI scrape (Decision Agent nightly)

```sql
-- mumbai_mau (target 2000)
SELECT COUNT(DISTINCT u.id)
FROM "User" u
JOIN "UserSession" s ON s.user_id = u.id
WHERE u.city ILIKE '%mumbai%'
  AND s.created_at >= NOW() - INTERVAL '30 days';

-- pandits (target 50)
SELECT COUNT(*) FROM "Priest"
WHERE city ILIKE '%mumbai%' AND aadhaar_verified = true;

-- temples (target 10)
SELECT COUNT(*) FROM "Temple"
WHERE city ILIKE '%mumbai%' AND verified = true;
```

Add these as separate KPI scrapers in `scripts/agents/roadmap/_kpi-supabase.mjs` if not present.

## Status-flip gate

When all three queries return:
- `mumbai_mau >= 2000`
- `pandit_count >= 50`
- `temple_count >= 10`

→ Flip `status: in_progress` → `shipped` + add `shipped_at: <iso>` in frontmatter via Decision Agent finalize step.

## Founder action required label

This PR is labeled `founder-action-required` because the scale milestone cannot ship via engineering alone — supply onboarding + KYC + MAU activation are sales/ops execution, not code.
