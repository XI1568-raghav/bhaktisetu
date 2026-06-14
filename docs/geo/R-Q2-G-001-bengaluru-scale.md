# R-Q2-G-001 — Bengaluru scaled to 80% target (handoff)

> Status: engineering scaffold shipped; supply scale + MAU activation blocked on sales execution.
> Parent: builds on R-Q1-G-001 base (5 pandits + 5 temples already onboarded as of Q1 close).

## Success criteria

| # | Criterion | Status | Owner |
|---|---|---|---|
| 1 | 55 verified pandits in Bengaluru (cumulative — Q1 30 + Q2 25) | ⏳ blocked-on-sales | Founder (KYC) + sales drip |
| 2 | 10 verified temples in Bengaluru (cumulative — Q1 5 + Q2 5) | ⏳ blocked-on-sales | Founder + ops |
| 3 | 2000 Bengaluru MAU (distinct UserSession 30d where User.city=Bengaluru) | ⏳ blocked-on-supply | Demand activation post supply ready |
| 4 | /city/bengaluru landing live with real temples + pujas + pandits data | ✓ shipped Q1 (R-Q1-G-001) | This batch verified |
| 5 | Sales pipeline: 5+ leads/week from /city/bengaluru PostHog cohort | ⏳ post launch | Sales (after PostHog cohort cuts) |

## What shipped this batch (engineering side)

- **Scale handoff doc** (this file) — sales playbook + KPI tracking + dependency map for the 80% target.
- **Bengaluru page already has the richest entry** in `apps/web/lib/cities.ts` (7 famous temples, 12 popular pujas, 5 deities, isNriMagnet=true). No code change needed — page renders fine; scaling is a supply + demand problem, not a frontend problem.
- **KPI tracked in frontmatter** via `kpi.query` SQL — Decision Agent scrapes this nightly into `_kpi-state.json`. When pandit count + temple count + MAU all hit thresholds, status flips to `shipped`.

## Verification: /city/bengaluru live

```bash
curl -s -o /dev/null -w "%{http_code}" https://darshya.online/city/bengaluru
# expect 200

curl -s https://darshya.online/city/bengaluru | grep -c "ISKCON Bangalore"
# expect >=1 (page renders famous temples list)

curl -s "https://api.darshya.online/api/v1/temples?city=Bengaluru&limit=12" | jq '.data | length'
# expect: starts 0-2 in early Q2, target 10 by end-Q2
```

## Sales/onboarding tactics (per agent_brief)

### Pandit acquisition (25 new in Q2 → 55 cumulative)

1. **Weekly `scripts/agents/cold-temple-outreach.mjs` Bengaluru segment** — automated WhatsApp drip to verified phone numbers in Bengaluru bbox.
2. **ISKCON Bangalore priest network** — founder warm intro; 5-7 priests on standby per Q1 conversations.
3. **Banashankari + Malleshwaram + Jayanagar belt** — door-to-door visit batch (founder, 1 day/week).
4. **Karnataka Brahmana Sabha + Smartha Iyer Bangalore + Madhwa community FB groups** — paid post with referral incentive (₹500 per onboarded priest).
5. **University temple priests** (IIT Bangalore Hanuman, IISc Mandir, Bangalore University temples) — 5+ verified students/priests.

### Temple acquisition (5 new in Q2 → 10 cumulative)

1. Top-50 Google Maps Bengaluru temples by review count → cold call → MoU pitch.
2. Bull Temple, Banashankari Amma, Dodda Ganapathi (founder warm contacts).
3. Gavi Gangadhareshwara + Ragigudda Anjaneya (smaller, faster MoU close).
4. Chamundeshwari Mysore (145km, Shakti Peetha) — counts toward Bengaluru bookings.

### MAU activation (target 2000 distinct/30d)

1. Google Ads geo-targeted Bengaluru → /city/bengaluru landing (post supply ready).
2. PostHog cohort `bengaluru_visitor` filter → retargeting.
3. WhatsApp broadcast to Bengaluru phone leads after each pandit goes live.
4. Local Bengaluru influencer partnership (1-2 Kannada devotional YouTubers).

## Founder action items (BLOCKING)

1. **KYC video calls × 25** new pandits across Q2 (one per week). ~30min each.
2. **Aadhaar verification** — manual cross-check via official Aadhaar e-KYC for each.
3. **Temple MoU × 5 new** — sign during founder Bengaluru visit (recommend 2-3 day trip).
4. **PostHog Bengaluru cohort** — define cohort filter `properties.city == "Bengaluru" OR user_city == "Bengaluru"`.
5. **Google Ads budget** — ₹15-25k/month geo-targeted post supply ready (~Q2 mid).

## Dependencies

- **R-Q1-G-001** (5 pandits + 5 temples base) — must be at ≥5/5 before scale work makes sense.
- **R-Q1-S-002** (30 pandit onboarding pipeline Q1) — Q2 inherits this funnel for Bengaluru segment.
- **Daily uptime-pinger** already curls /city/bengaluru — no new monitoring needed.

## KPI scrape (Decision Agent nightly)

```sql
-- bengaluru_mau (target 2000)
SELECT COUNT(DISTINCT u.id)
FROM "User" u
JOIN "UserSession" s ON s.user_id = u.id
WHERE (u.city ILIKE '%bengaluru%' OR u.city ILIKE '%bangalore%')
  AND s.created_at >= NOW() - INTERVAL '30 days';

-- pandits (target 55)
SELECT COUNT(*) FROM "Priest"
WHERE city ILIKE '%bengaluru%' AND aadhaar_verified = true;

-- temples (target 10)
SELECT COUNT(*) FROM "Temple"
WHERE city ILIKE '%bengaluru%' AND verified = true;
```

Add these as separate KPI scrapers in `scripts/agents/roadmap/_kpi-supabase.mjs` if not present.

## Status-flip gate

When all three queries return:
- `bengaluru_mau >= 2000`
- `pandit_count >= 55`
- `temple_count >= 10`

→ Flip `status: in_progress` → `shipped` + add `shipped_at: <iso>` in frontmatter via Decision Agent finalize step.

## Founder action required label

This PR is labeled `founder-action-required` because the scale milestone cannot ship via engineering alone — supply onboarding + KYC + MAU activation are sales/ops execution, not code.
