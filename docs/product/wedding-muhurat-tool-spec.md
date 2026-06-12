# Wedding Muhurat Tool — Date + Location + Couple Kundli Match

> **Roadmap item**: R-Q2-P-002 (P1) · **Authored**: 2026-06-13

## Goal

Wedding muhurat tool integrating birth-time + location + couple kundli compatibility. Targets 500+ MAU + 10+ paid muhurat consults Q2.

## Flow

### Input
- Bride name + DOB + birth-time + birth-place
- Groom name + DOB + birth-time + birth-place
- Wedding location (city)
- Wedding date range (e.g., "Q2 2026", "Nov 2026", "specific dates")

### Logic

1. Compute kundli for both bride + groom (existing R-Q1-E-009 Lahiri ayanamsa)
2. Compute Ashtakoot match score (8 traditional Vedic compatibility points 0-36)
3. Within date range, identify Vivah Muhurta (auspicious wedding days per Hindu calendar)
4. Within muhurat days, compute exact time slot 4-6 AM or 6-10 PM (standard wedding muhurat times)
5. Suggest 3-5 specific date+time combos w/ rationale

### Output
- Compatibility score (0-36) + interpretation
- 3-5 auspicious wedding dates w/ exact muhurat time
- 1-line per-date rationale ("Magh Purnima, ideal for prosperity")
- Booking CTA: "Connect w/ verified astrologer for detailed kundli report (₹500)"

## Engineering tickets

- R-Q2-P-002a: Ashtakoot match logic in apps/web/lib/vedic-astrology.ts
- R-Q2-P-002b: Vivah Muhurta calendar (12-year Hindu calendar w/ wedding-suitable days)
- R-Q2-P-002c: UI form + result display
- R-Q2-P-002d: Astrologer booking handoff funnel

## Monetization

- Free tool: input + compatibility + 3 dates
- Paid upgrade ₹500: detailed kundli match report (PDF) + extended dates
- Paid upgrade ₹2000: 30-min astrologer consultation

## SEO

- `/astrology/wedding-muhurat` — primary landing
- `/astrology/wedding-muhurat/2026` — year-specific (R-Q2-M-007 progSEO pattern)
- `/astrology/wedding-muhurat/{city}` — city-specific (25 cities)

## Closes

R-Q2-P-002 — spec shipped.
