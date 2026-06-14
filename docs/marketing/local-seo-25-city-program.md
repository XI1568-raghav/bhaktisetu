# 25-City Local SEO Program — Q4 2026

> Companion to R-Q4-M-005 handoff. Operating brief for the 25-city local-SEO push.

## Target keyword matrix (per city × 3 lanes = 75 high-intent queries)

For each city in `apps/web/lib/cities.ts`:

| Lane | Pattern | Page | Example (Varanasi) |
|---|---|---|---|
| Puja | "puja in {city}", "online puja {city}", "book puja {city}" | /city/[slug] | "puja in Varanasi", "online puja Varanasi" |
| Temple | "famous temples in {city}", "{city} darshan", "{city} temple online booking" | /city/[slug] (temples block) | "famous temples in Varanasi" |
| Panchang | "panchang {city}", "{city} panchang today", "tithi today {city}" | /panchang/[city] | "Varanasi panchang today" |

Multiply by 25 cities → 75 primary queries. Secondary long-tail (deity × city, festival × city) is already indexed via existing /city/[slug] and /deity/[slug] cross-linking.

## City prioritization

**Tier-1 (5 cities — first GMB push, biggest backlink budget)**:
Varanasi · Tirupati · Mumbai · Delhi · Chennai

Rationale: highest organic search volume, highest LTV (NRI overlap for Tirupati + Varanasi; commerce density for Mumbai/Delhi/Chennai).

**Tier-2 (10 cities — second wave)**:
Haridwar · Rishikesh · Ujjain · Ayodhya · Dwarka · Kolkata · Bengaluru · Hyderabad · Pune · Jaipur

**Tier-3 (10 cities — last wave)**:
Puri · Ahmedabad · Mathura · Vrindavan · Shirdi · Amritsar · Guruvayur · Madurai · Rameswaram · Gaya

## GMB execution — Option A (Service Area Business)

Pros: 1 listing to manage; instant 25-city coverage.
Cons: Google deprioritizes SAB in Local Pack vs verified physical-address competitors.

Steps:
1. Claim listing at https://business.google.com using founder@bhaktisetu.com.
2. Business name: "Bhaktisetu — Online Puja & Live Darshan"
3. Primary category: "Religious Goods Store" (closest match)
4. Secondary categories: "Religious Organization", "Tourist Information Center"
5. Address: Bengaluru HQ (Suite #, Street, 560XXX)
6. Service area: 25 cities (Google allows up to 20; group remaining 5 by state)
7. Upload 10 photos (logo, founder, puja-being-performed, video-proof sample, temple-collaboration screenshots)
8. Add services (one per puja SKU in apps/web/lib/pujas.ts top 20)
9. Description (750 chars max): emphasize "video-proof", "verified pandits", "80G receipts", "NRI dual-currency", "panchang in your local timezone"
10. Schedule 4 GMB posts per month per Tier (Tier-1 weekly, Tier-2 fortnightly, Tier-3 monthly) — copy in `docs/marketing/gmb-templates/`.

## GMB execution — Option B (per-city pandit-managed)

Pros: physical-address verification → top Local Pack rankings.
Cons: 24 separate verifications; pandit-relationship dependency; ownership-transfer paperwork.

Recommended for Tier-1 only; Option A for Tier-2/3.

Per pandit:
1. Founder calls pandit, explains program, gets verbal consent.
2. Pandit creates GMB listing using their temple address as the registered location.
3. Pandit grants "Manager" access to founder@bhaktisetu.com.
4. Founder uploads photos, schedules posts, monitors reviews — pandit handles only address-verification call from Google.
5. Pandit gets share of city's revenue (recommend 5% lifetime referral on city-attributed bookings).

## Backlink outreach kit

50 outreach targets ranked by domain authority + topical relevance.

Templates in `docs/marketing/local-backlink-targets.md` cover:
- Temple trusts (5 Tier-1 — request menu link)
- City news (Dainik Jagran, TOI city, regional vernacular)
- Devotional bloggers (Hindi, Tamil, Telugu blogspots + medium publications)
- NRI community sites (India Abroad, Khabar South Asia)
- Pilgrimage tour operators (cross-promotion: we link to their yatra packages, they link to our online-puja)

Email template (paste-once):

> Namaste,
>
> I run Bhaktisetu — an online platform where devotees can book live-streamed pujas at verified temples with video proof. We charge 80G-deductible donations and pay verified pandits transparently.
>
> Our editorial page on [Varanasi pujas](https://darshya.online/city/varanasi) covers [topic of their site] with depth I haven't seen elsewhere — [specific reference to their recent post]. Would you consider linking to it from your "[their menu name]" page? Happy to reciprocate with a backlink from our Tier-1 city pages.
>
> [Founder signature]

## Tracking

Add to GSC weekly export (founder/Mondays):
- Position by query (filter: country=India, query contains city name)
- Count of queries with position ≤ 10
- Top 10 winning + losing queries WoW

When `local_seo_keywords_top10 ≥ 500`, flip roadmap item status `in_progress` → `shipped` and append `shipped_at` to spec frontmatter.

## Free-tier budget impact

- GMB: free.
- Buffer (post scheduling): ₹400/mo (paid by founder).
- Ahrefs/SEMrush (rank tracking): use free GSC instead — ₹0.
- Outreach email sends: 100 over Q4 = within Resend 100/day free tier.

Total tooling cost: ₹400/mo for 3 months = ₹1200. Within founder OPEX.
