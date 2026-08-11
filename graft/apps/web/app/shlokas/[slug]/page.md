# apps\web\app\shlokas\[slug]\page.tsx

- generateStaticParams · function · L10-L12 — Pre-renders every shloka route at build time so all verse pages are served as static HTML.
- generateMetadata · function · L14-L45 — Builds search- and social-optimized metadata (canonical URL, OpenGraph, Twitter card) for each shloka, truncating the meaning to fit description limits.
- ShlokaPage · function · L47-L187 — Renders the full shloka detail page — verse text, transliteration, meaning, JSON-LD structured data, share links, and related verses — rejecting unknown slugs with a 404.
