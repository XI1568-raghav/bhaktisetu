# apps\web\app\muhurat\[slug]\page.tsx

Statically generated, SEO-optimized detail page that renders a full guide (timing, best-for, avoid, calculation, significance) for each Vedic muhurat slug, 404ing on unknown slugs.

- generateStaticParams · function · L11-L13 — Enumerates all muhurat slugs so Next.js pre-renders every detail page at build time (with dynamicParams disabled).
- generateMetadata · function · L15-L36 — Builds per-muhurat SEO metadata (title, description, canonical, OpenGraph) from the muhurat's attributes, falling back to a not-found title for unknown slugs.
- jsonLd · function · L38-L60 — Produces schema.org BreadcrumbList and Article JSON-LD structured data so search engines index the muhurat guide rich results.
- MuhuratDetail · function · L74-L212 — Renders the full muhurat guide page — guard-clauses unknown slugs to 404, then shows timing facts, best-for/avoid lists, significance, and a category-dependent CTA (pandit consultation vs today's panchang) plus related muhurats.
