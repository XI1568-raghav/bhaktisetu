# apps\web\app\sitemap.ts

- toCanonicalTempleSlug · function · L50-L61 — Normalizes the API's long `<name>-<city>` temple slugs down to the curated short slug the /temples/[slug] route actually renders, so advertised sitemap URLs return 200 instead of 404.
- safeTempleSlugs · function · L63-L72 — Fetches temple slugs from the API, canonicalizes and dedupes them, and falls back to a curated list so the build still ships a useful sitemap when the API is down or returns nothing.
- safePujaSlugs · function · L74-L82 — Fetches puja-type slugs from the API and falls back to a curated list on failure or empty response so puja URLs are never missing from the sitemap.
- sitemap · function · L84-L904 — Assembles the complete sitemap by combining the static route priority tables with dynamically imported slug sources (temples, pujas, yatras, deities, festivals, cities, rashis, blog posts, and more) into prioritized URL entries.
