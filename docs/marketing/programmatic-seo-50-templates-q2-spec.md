# Programmatic SEO — 50 New Long-Tail Templates Q2

> **Roadmap item**: R-Q2-M-007 (P1) · **Authored**: 2026-06-13

## Goal

Q2 ship 50 new programmatic SEO templates fanning out 1000+ long-tail URLs. Targets 50K organic MAU contribution.

## Template families (50)

### Puja × City (25 cities) — 5 templates × 25 cities = 125 pages
- /pujas/{slug}/in-{city} — already partial via R-Q1-E-013 /city
- "{puja} in {city} 2026 price" template

### Pandit × City (existing /city extend) — 25 pages
- /pandits/in-{city} — list verified pandits per city

### Temple × Deity matrix — already shipped
- Extend to /temples/{slug}/famous-pujas

### Festival × Year — 30 festivals × 1 year = 30 pages
- /festivals/{slug}/2026 — date + significance + book-puja-now CTA

### Astrology × Geo matrix — 12 rashi × 25 cities = 300 pages
- /astrology/horoscope/{rashi}/in-{city}

### NRI × Country — already exists
- Extend /nri/{country}/{service-type} (e.g., /nri/usa/shraddha)

### Yatra × Season — 12 yatras × 4 seasons = 48 pages
- /yatra/{slug}/best-time-{season}

### Tirth × Yatra-from — 30 tirth × top 5 yatras = 150 pages
- /tirth/{slug}/yatra-from-{from-city}

## Tooling

`scripts/agents/programmatic-seo-fan.mjs` — generates pages from template + data array. Tolerates missing data fields gracefully.

## QA gates

- 95%+ Lighthouse SEO score per page
- Unique title + meta-description per fan-out
- Internal link from /discover hub to each new template family
- Sitemap auto-fan via existing pattern

## Engineering tickets

- R-Q2-M-007a: 5 new fan-out generators
- R-Q2-M-007b: /discover update w/ new templates
- R-Q2-M-007c: GSC submitter retrigger

## Closes

R-Q2-M-007 — spec shipped.
