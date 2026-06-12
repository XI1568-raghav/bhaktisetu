# 25-city Local SEO — Programmatic Pages + GMB + Backlinks

> **Roadmap item**: R-Q4-M-005 (P0) · **Authored**: 2026-06-13 · **Extends**: R-Q3-M-014 SEO audit

## Goal

By Q4: 25 city-specific landing pages ranking in top-3 Google results for "{city} puja booking online". Drive 60K organic MAU.

## 25-city target list

Per G-008 city expansion mapping:
- Tier-1 cities (10): Bengaluru / Mumbai / Delhi / Chennai / Kolkata / Hyderabad / Pune / Ahmedabad / Jaipur / Lucknow
- Tier-2 cities (10): Indore / Bhopal / Nagpur / Patna / Bhubaneswar / Guwahati / Coimbatore / Vadodara / Surat / Chandigarh
- Tier-3 cities (5): Mysore / Mangalore / Bhopal / Vizag / Kochi

## Per-city URL pattern

```
darshya.online/{city-slug}/puja              — city's puja catalog
darshya.online/{city-slug}/temples           — city's verified temples
darshya.online/{city-slug}/pandits           — city's onboarded pandits
darshya.online/{city-slug}/festivals         — festival calendar for city
darshya.online/{city-slug}/{puja-type}       — e.g. /bangalore/satyanarayan
```

25 cities × 5 page types = 125 city-specific landing pages. Plus 25 × 10 puja types = 250 city-puja combos = 250+ programmatic pages total.

## Per-page content structure (programmatic)

- H1: "{Puja type} booking in {City} — verified pandit + video proof"
- 200-word intro (templated, city-specific filled via DB)
- Pricing table per puja type
- 3 local-temple cards (cross-link to /temples/{slug})
- 5 customer testimonials (filtered by city)
- Booking CTA + schema.org markup

## Schema.org markup

```json
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Bhaktisetu — {City} puja booking",
  "address": "{...}",
  "areaServed": "{City}, India",
  "priceRange": "₹501-₹5001",
  "offers": [
    { "@type": "Offer", "name": "Satyanarayan Puja", "price": 501 }
  ]
}
```

## Google My Business (GMB) profiles

Per city: separate GMB profile. Founder action:
- Create GMB business listing per city (free)
- Verify via postcard (~1 week per city)
- Add 5 photos + service catalog + hours
- Reply to all reviews within 24h

GMB at scale = founder-time intensive. Use third-party tool (Birdeye / Podium) if budget allows.

## Local backlinks

Per city, target:
- 1 local newspaper (Bangalore Mirror, DNA, etc.) feature
- 2 local-temple-website backlinks (we partner = they link us)
- 1 Reddit r/{city} mention
- 1 city-Facebook-group cross-promo

5 backlinks/city × 25 cities = 125 high-quality local backlinks = HUGE SEO boost.

## Engineering tickets

EDGE-RUNTIME ALERT: 250+ programmatic pages = MUST plan edge-runtime sweep first. Otherwise 250 separate dynamic routes = high-risk.

Alternatives:
- Static-generation w/ generateStaticParams (no edge-runtime trigger)
- ISR (Incremental Static Regeneration) — Next.js native
- Re-validation cron daily

Recommend: SSG + ISR (1h revalidation) — most SEO-friendly, no edge-runtime risk.

## Tickets

- R-Q4-M-005a: 25-city URL routing
- R-Q4-M-005b: SSG/ISR setup
- R-Q4-M-005c: schema.org markup
- R-Q4-M-005d: GMB profile bulk-create
- R-Q4-M-005e: backlink outreach playbook

## Closes

R-Q4-M-005 — spec shipped.
