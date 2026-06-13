# /city/{slug} Content Expansion — 5 City Deep-Polish

> Existing /city pages get 4-section expansion for top 5 traffic cities. Boosts SEO + dwell time.

## Cities to expand

Per /city/{slug} traffic data (estimated top 5 by organic):

1. /city/varanasi
2. /city/mumbai
3. /city/bengaluru
4. /city/delhi
5. /city/tirupati

## 4-section expansion pattern per city

### Section 1: "Why book a pandit in {city}?"

3-4 paragraphs covering:
- Local pandit tradition + lineage
- Most-booked pujas by residents
- NRI emotional anchor (for Hindu families from this city)
- Specific neighborhood / temple cluster strengths

### Section 2: "Best temples in {city} for live darshan"

Numbered list (5-10 entries) with each:
- Temple name + sanskrit
- Best timing for darshan
- Distinct ritual specialty
- Cross-link to /tirth/{slug} OR /temples/{slug}

### Section 3: "Festival highlights in {city} 2026"

3-5 festivals per city (regional priority):

**Varanasi:** Maha Shivaratri / Dev Deepawali / Ganga Aarti annual / Hanuman Jayanti / Naga Panchami
**Mumbai:** Ganesh Chaturthi / Diwali / Navratri / Janmashtami / Holi
**Bengaluru:** Rama Navami / Sankranti / Diwali / Karaga Festival / Vaikunta Ekadashi
**Delhi:** Diwali / Karwa Chauth / Janmashtami / Holi / Republic Day spiritual events
**Tirupati:** Brahmotsavam / Vaikunta Ekadashi / Ratha Saptami / Rama Navami / Hanuman Jayanti

Each festival entry: 100-150 words covering tradition + best temples + booking guidance.

### Section 4: "NRI families: how to book pujas in {city} from abroad"

3-5 paragraphs covering:
- USD/GBP/CAD/AUD pricing for this city
- Time zone challenges + IST live darshan scheduling
- 80G receipt + tax considerations for NRI
- Real customer testimonials (from this city's diaspora)
- Founder note on respecting cultural distance

## Per-city schema additions

```typescript
// City page metadata
const citySchema = {
  '@context': 'https://schema.org',
  '@type': 'Place',
  name: `${city.name} — Pujas + Temples`,
  address: {
    '@type': 'PostalAddress',
    addressLocality: city.name,
    addressRegion: city.state,
    addressCountry: 'IN'
  },
  geo: city.coordinates,
  containsPlace: city.temples.map(t => ({
    '@type': 'TouristAttraction',
    name: t.name
  })),
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: `Verified Pandit Pujas in ${city.name}`,
    itemListElement: city.popularPujas.map(p => ({
      '@type': 'Offer',
      name: p.name,
      price: p.priceInr,
      priceCurrency: 'INR'
    }))
  }
}
```

## Engineering ticket

For each city:
- 1 founder review session (1hr) to confirm cultural accuracy
- 1 content writer session (2hr) for drafting (could be AI Pandit-assisted)
- 1 pandit liaison call (30 min) to verify ritual details
- 1 dev session (1hr) to implement schema + cross-links
- Total per city: ~5 hours × 5 cities = 25 hours Q2 work

## SEO impact

- Avg city page word count: 800 → 2200 (3x depth signal)
- Cross-link count: 5 → 25 per page (better PageRank distribution)
- Schema additions: 1 → 4 schema types (richer rich-snippet eligibility)
- Expected organic traffic uplift: 40-80% per city
- Expected dwell time uplift: 90sec → 4min (engagement signal)

## Priority sequencing

Week 1: Varanasi (highest organic)
Week 2: Mumbai
Week 3: Bengaluru
Week 4: Delhi
Week 5: Tirupati

## Verification

- Google Search Console position tracking per city
- PostHog dwell time tracking per page
- Cohort: visitors who landed via /city/{slug} → conversion rate

## Closes

R-Q2-S-007a (Pune temple parallel) + R-Q1-G-006/007 city onboarding both feed content here.
