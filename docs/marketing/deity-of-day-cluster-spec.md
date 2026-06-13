# Daily Deity-of-Day Cluster Articles — 7 Weekly

> **Roadmap item**: R-Q1-M-009 (P2) · **Authored**: 2026-06-13

## Goal

Q1 ship 7 weekly daily-deity content articles. Programmatic SEO + daily-return retention layer.

## 7-day deity rotation

| Day | Deity | Content |
|---|---|---|
| Monday (Somvar) | Shiva | "Why Hindus worship Shiva on Monday" + Shiv mantras |
| Tuesday (Mangal) | Hanuman | "Hanuman Tuesday: rituals + benefits" + Hanuman Chalisa |
| Wednesday (Budh) | Ganesh | "Ganesh Wednesday: removing obstacles" + Ganesh mantras |
| Thursday (Brihaspati) | Vishnu | "Vishnu Thursday: prosperity + protection" + Vishnu mantras |
| Friday (Shukra) | Lakshmi/Durga | "Friday Mata seva: Lakshmi + Durga" + Stotras |
| Saturday (Shani) | Hanuman + Shani | "Shani Saturday: Sade Sati remedies" + Hanuman seva |
| Sunday (Ravi) | Surya | "Surya Sunday: arghya + sun salutation" + Surya mantras |

## Per-article template

- 800-1200 words
- Devanagari mantras + transliteration + meaning
- Cross-link to /deity/{slug} + /chants/{slug}
- Schema.org Article JSON-LD
- /today/{day} canonical URL

## Auto-publish

`content-publisher` agent (per existing fleet) → daily MDX draft → founder review + publish.

## Engineering tickets

- R-Q1-M-009a: 7 article templates
- R-Q1-M-009b: /today/{day} dynamic routes
- R-Q1-M-009c: Daily auto-publish via agent
- R-Q1-M-009d: WhatsApp daily push integration

## Q1 success

- 7 articles live
- Daily-return rate +20%
- SEO long-tail wins ("monday hanuman puja")

## Closes

R-Q1-M-009 — spec shipped.
