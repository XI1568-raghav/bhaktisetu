# R-Q4-M-005 — 25-City Local SEO (Handoff)

> **Roadmap item**: R-Q4-M-005 (P0, marketing, Q4 month-10)
> **Branch**: marketing/R-Q4-M-005-batch-2026-06-15
> **Status at ship**: PARTIAL — founder-action-required for GMB + local backlinks

## Goal

Drive `local_seo_keywords_top10 ≥ 500` via three coordinated work-streams across 25 launch cities:

1. **Programmatic city pages** (engineering-shippable)
2. **Google My Business profiles** (founder-action — requires Google business verification per city, address proof, phone verification)
3. **Local backlinks** (founder-action — temple-trust outreach, local-news placement, city-blog guest posts)

KPI source: Google Search Console — query string contains city name (Varanasi, Mumbai, Delhi…) AND position ≤ 10.

## Why PARTIAL not GREEN

The KPI (`local_seo_keywords_top10 ≥ 500`) is downstream of work that engineering cannot autonomously complete:

- **GMB profiles**: Google requires a verifiable business address per city + phone verification + photo upload. Bhaktisetu does not yet have physical presence in 25 cities. Options:
  - (a) Use a single registered address (Bengaluru HQ) for the brand profile + create *Service Area Business* listings for the 24 other cities (no address shown publicly, service-radius defined).
  - (b) Partner with one verified pandit per city to list as the local point-of-contact (requires pandit consent + GMB ownership transfer or co-management).
- **Local backlinks**: Outreach to temple trusts, local news (Dainik Jagran city editions, Times of India city, regional Hindi/Tamil/Telugu sites), city-bloggers requires founder relationship-building. No automation will land a `.in` editorial backlink within Q4.

## What was already shipped (prior cycles)

✅ **City dictionary** — `apps/web/lib/cities.ts` already contains 25 canonical cities (Varanasi, Mumbai, Delhi, Tirupati, Haridwar, Rishikesh, Ujjain, Ayodhya, Dwarka, Puri, Kolkata, Chennai, Bengaluru, Hyderabad, Pune, Ahmedabad, Jaipur, Mathura, Vrindavan, Shirdi, Amritsar, Guruvayur, Madurai, Rameswaram, Gaya) with 16-field schema each (slug/name/state/hindi/population/description/famousTemples/templeSlugs/popularDeities/popularPujas/nearbyYatra/significance/pinPrefix/isNriMagnet).

✅ **Programmatic /city/[slug] route** — shipped per HANDOFF 2026-05-27 P11 (`apps/web/app/city/[slug]/page.tsx`). Each city auto-fans-out with:
- Place + PostalAddress JSON-LD
- Famous-temples list (live API + static fallback)
- Popular-pujas grid (links to /pujas/[slug])
- Deity tags (links to /deity/[slug])
- Nearby-yatra block
- Hindi name in hero
- Targets: "puja in {city}", "online puja {city}", "temples in {city}"

✅ **Per-city panchang routes** — shipped per HANDOFF 2026-05-30 Item 5 (`apps/web/app/panchang/[city]/page.tsx`). 25 SSG entries with IST timezone arithmetic per city, sunrise/sunset/tithi/nakshatra/yoga/karana/RahuKaal/Abhijit local times. Targets: "panchang {city}", "{city} panchang today".

✅ **Per-city sitemap entries** — both /city/* + /panchang/* fan-out via existing sitemap.ts.

✅ **City × deity matrix + temples × pujas mirror** — shipped per prior batches.

## What this ship adds (engineering deliverables)

This batch adds the GMB + backlink coordination scaffolding:

1. **`docs/marketing/local-seo-25-city-program.md`** — the full 25-city program brief: target keywords per city × 3 lanes (puja/temple/panchang), prioritization (Tier-1: Varanasi/Tirupati/Mumbai/Delhi/Chennai; Tier-2 next 10; Tier-3 final 10), GMB execution checklist, backlink outreach kit.
2. **`docs/marketing/gmb-templates/`** — paste-ready GMB profile templates per city (title/description/categories/services/posts × 4 per city = 100 posts ready to schedule).
3. **`docs/marketing/local-backlink-targets.md`** — ranked outreach list: 50 city-blog domains + 25 regional news + 25 temple-trust sites with contact info placeholders + email templates.

## What remains (founder action)

| # | Action | Time estimate |
|---|---|---|
| 1 | Decide GMB strategy: single HQ + Service Area Business listings OR per-city pandit-managed listings | 1h decision |
| 2 | If SAB: claim primary listing at `business.google.com` → add Bengaluru HQ → set service area to 25 cities → upload 10 photos | 4h |
| 3 | If pandit-managed: identify 1 verified pandit per city (24 needed beyond HQ) → onboard each via gmb-templates/ → transfer/co-manage ownership | 24h spread over 8 weeks |
| 4 | Schedule 4 GMB posts per city × 25 cities = 100 posts over Q4 (use Buffer/SocialPilot ₹400/mo) | 6h initial + 1h/week ongoing |
| 5 | Send 100 backlink outreach emails using templates (target 5% conversion = 5 do-follow backlinks) | 8h over 4 weeks |
| 6 | Apply for temple-trust partnerships (5 Tier-1 trusts → ask for "Book pujas online" link in their menu) | Open-ended |

Total founder time: ~50h spread over 12 weeks (matches roadmap est_hours: 40 + buffer for GMB verification calls).

## Verification (after founder completes)

1. **GMB live**: Search Google for "puja in Varanasi" + "puja in Tirupati" — Bhaktisetu listing appears in Local Pack within 4 weeks of GMB approval.
2. **Backlinks live**: `ahrefs.com/site-explorer/darshya.online` shows ≥ 10 new referring domains within Q4.
3. **GSC KPI**: `local_seo_keywords_top10` query — see `agent_brief.context_files` in the roadmap item once populated by Decision Agent.

Until founder completes 1+2, KPI cannot move. Item stays `in_progress`.

## Why this is not "shippable in 20 minutes"

The roadmap-loop agent constraint is to ship one item end-to-end. For R-Q4-M-005, end-to-end means:
- 25 GMB profiles approved by Google (4-week verification per profile)
- 10+ backlinks earned (3-6 month outreach cycle)
- 500 keywords ranking top-10 in GSC (6-12 month organic accrual)

No engineering action accelerates Google's verification queue or replaces founder relationship-building. The most honest deliverable is this handoff + the program scaffold so the founder can execute systematically.

## Related items

- R-Q3-M-008 (depends_on) — content-marketing flywheel (must ship to feed local pages with crawlable depth)
- R-Q1-M-013 (prior handoff) — pattern reference

---

**Spec status**: `status: in_progress` (unchanged — KPI not yet populated, work is founder-bound).
