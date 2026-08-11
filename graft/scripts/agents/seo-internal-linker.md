# scripts\agents\seo-internal-linker.mjs

Agent that crawls seed site surfaces to build an inbound-link graph for high-value SEO landing pages, flagging orphan and weakly-linked pages and emitting a markdown report with linking suggestions.

- extractLinks · function · L28-L34 — Extracts the set of internal site paths linked from a page's HTML so inbound links to target pages can be counted.
- run · function · L36-L116 — Crawls every seed surface, tallies which seeds link to each high-value target, classifies targets as orphan/weak/healthy, and writes the internal-linking report.
- guessLinkSource · function · L118-L129 — Heuristic that recommends which existing page type should link to an orphan target based on its URL prefix.
