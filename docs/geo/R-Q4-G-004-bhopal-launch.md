# R-Q4-G-004 — Bhopal city launch (9 of 25 — central) handoff

> Status: city page scaffold shipped; supply onboarding gated on founder KYC + temple MoUs. Engineering scaffold complete; live KPI = 1 requires manual founder action.

## Why this matters

Bhopal is city 9 of the 25-city India tier-2/tier-3 expansion plan. Central India belt — anchors the Madhya Pradesh corridor alongside Indore (R-Q4-G-003). Bhopal → Bhojpur Shivling (largest monolith) → Ujjain Mahakaleshwar (190km) → Omkareshwar Jyotirlinga (270km) gives a natural 4-stop pilgrim circuit that doubles as supply pipeline.

## Success criteria

| # | Criterion | Status | Owner |
|---|---|---|---|
| 1 | ≥5 verified pandits in Bhopal (Priest table, city='Bhopal', aadhaar_verified=true) | ⏳ | Founder (KYC video calls + Aadhaar verify) |
| 2 | ≥5 verified temples in Bhopal (Temple table, city='Bhopal', verified=true) | ⏳ | Founder + ops (verify partnership MoU) |
| 3 | ≥3 paid bookings completed via Bhopal pandits in last 30d | ⏳ | Demand activation (post supply ready) |
| 4 | /city/bhopal page lists ≥4 temples + ≥4 puja offerings | ✓ shipped | This batch |
| 5 | KPI `city_active_users_bhopal` ≥ 3000 (PostHog) | ⏳ | Post-launch demand |

## What shipped this batch

- `apps/web/lib/cities.ts` — Bhopal entry added at end of `CITIES[]`. Slug `bhopal`, hindi `भोपाल`, state Madhya Pradesh, population 2.4M, pinPrefix 462.
- `famousTemples`: Birla Mandir (Lakshminarayan), Gufa Mandir (Hanuman cave), Bhojeshwar Mahadev (Bhojpur 28km), Khedapati Hanuman.
- `popularDeities`: shiva, hanuman, lakshmi.
- `popularPujas`: rudrabhishek, satyanarayan-puja, hanuman-chalisa-path, lakshmi-puja-diwali.
- `nearbyYatra`: ujjain, omkareshwar, maheshwar.
- `significance`: Bhojeshwar largest monolithic Shivling + Mahashivratri yatra + gateway to Ujjain + Omkareshwar Jyotirlinga.
- Page auto-renders via `/city/[slug]` SSG (revalidate=3600). No new route file required.
- Sitemap auto-includes `/city/bhopal` via `citySlugs()`.
- Criterion #4 ✅ met by deploy of this batch.

## Sales / onboarding tactics (founder action)

1. **WhatsApp outreach** — Birla Mandir Bhopal trust + Bhojpur Mahadev temple committee + Gufa Mandir mahant (founder warm intros via MP Brahmin Sabha).
2. **MP Brahmin community FB + Telegram groups** — "MP Pandit Network", "Bhopal Brahman Samaj", "Madhya Pradesh Karmakand Pandits".
3. **Google Maps temple list scrape + cold call** — top-30 temples in Bhopal metro bbox sorted by review count. Target ISKCON Bhopal + Ram Mandir Trust + Sankat Mochan Hanuman.
4. **Vidisha + Sanchi pandit overflow** — 60km radius pandits servicing Bhopal; cheaper acquisition.
5. **Bhojpur Mahashivratri activation** — coordinate with festival committee; offer free livestream + booking infrastructure in exchange for pandit referrals.

Each verified pandit MUST have `aadhaar_verified=true` per business rule #4. Payouts gated.

## Founder action (BLOCKING — KPI = 1 cannot flip without these)

1. **KYC video calls** with first 5 pandits in Bhopal (target Q4 2026, weeks 1-3 of onboarding cycle).
2. **Aadhaar verification** — manual cross-check via official Aadhaar e-KYC portal. Darshya does NOT auto-verify per Indian regulatory + business rule #4.
3. **Temple onboarding MoU** — 5 temples × signed partnership doc. Verified=true flip in `/admin/temples` only after MoU signed + uploaded.
4. **Demand seeding** — first 3 bookings via founder warm network + 1× ad spend test (₹5K Meta budget targeting Bhopal + Indore overlap audience).
5. After supply + first bookings: Decision Agent KPI scrape `city_active_users_bhopal` will surface in PostHog. Threshold 3000 active users requires sustained demand campaign (Q4 month-3 onwards).

## Dependencies

- **R-Q4-S-001** (Q4 supply onboarding sprint) — same KYC funnel feeds Bhopal pipeline. Founder coordinates batch.
- **R-Q4-G-003** Indore — sibling MP city; reuse same pandit network leads where Bhopal-Indore overlap exists.

## KPI query (Supabase)

```sql
SELECT CASE
  WHEN (SELECT COUNT(*) FROM "Priest" WHERE city='Bhopal' AND aadhaar_verified=true) >= 5
   AND (SELECT COUNT(*) FROM "Temple" WHERE city='Bhopal' AND verified=true) >= 5
   AND (SELECT COUNT(*) FROM "Booking" b
        JOIN "Priest" p ON p.id = b.priest_id
        WHERE p.city='Bhopal'
          AND b.status IN ('CONFIRMED','COMPLETED')
          AND b.created_at >= NOW() - INTERVAL '30 days') >= 3
  THEN 1 ELSE 0 END;
```

PostHog `city_active_users_bhopal` insight ID: TBD — populate after Bhopal user cohort reaches >50 events.

## Status reasoning

Item stays `in_progress`. Engineering scaffold (criterion #4) is shipped this batch. The remaining 4 criteria are pure founder action — KYC, MoUs, demand seeding. Per project rules: agent CANNOT auto-claim shipped status when KPI requires founder action. PR delivers scaffold + handoff; status flips to `shipped` only when founder confirms ≥5 pandits + ≥5 temples + ≥3 bookings in Bhopal.

## Verify

- `curl https://darshya.online/city/bhopal` → expect 200 + Bhopal hero block + 4 famous temples + 4 puja CTAs after CF Pages deploy.
- `grep "bhopal" apps/web/lib/cities.ts` → 1 match (slug entry).
- `apps/web/lib/cities.ts` length: 26 cities total post-merge (was 25).
