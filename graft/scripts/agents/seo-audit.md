# scripts\agents\seo-audit.mjs

- extractMeta · function · L20-L23 — Pulls the content value of a named meta tag (e.g. description, og:title) out of raw HTML so pages can be checked for missing or weak metadata.
- extractTitle · function · L25-L28 — Extracts the page's <title> text from raw HTML for length and presence checks.
- countInternalLinks · function · L30-L36 — Collects the set of unique internal paths linked from a page's HTML, feeding both per-page link-count checks and cross-page orphan detection.
- run · function · L38-L129 — Crawls all core pages, flags SEO issues per page, verifies sitemap/robots health, detects orphan pages, and emits the daily audit report.
