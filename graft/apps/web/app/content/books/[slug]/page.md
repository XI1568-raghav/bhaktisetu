# apps\web\app\content\books\[slug]\page.tsx

Next.js page module that renders a book's detail page (cover, metadata, chapter TOC) with SEO metadata and JSON-LD, 404ing when the slug has no manifest.

- Params · type · L12-L12 — Route parameter shape carrying the book slug from the URL; a plain data holder with no logic.
- generateStaticParams · function · L14-L17 — Enumerates all book slugs at build time so Next.js can pre-render every book detail page statically; a thin delegation to listBookSlugs.
- generateMetadata · function · L19-L40 — Builds per-book SEO metadata (title, canonical URL, OpenGraph book entry) from the loaded manifest so each text is indexed and shared correctly.
- BookDetailPage · function · L42-L128 — Renders the book detail page — cover, titles, description, continue-reading CTA, and chapter table of contents — after resolving the slug to a manifest or triggering a 404.
