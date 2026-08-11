# apps\web\app\astrology\pancha-pakshi\[slug]\page.tsx

Dynamic route that renders a full SEO-optimized profile page for one of the five Pancha Pakshi birds, including structured data, personality, compatibility, mantra, and remedy sections.

- generateMetadata · function · L9-L18 — Produces per-bird SEO metadata (title, description, canonical URL) from the slug so each Pakshi profile page is individually indexable, falling back to a 'Not found' title for unknown slugs.
- PanchaPakshiBirdPage · function · L20-L192 — Renders the complete Pancha Pakshi bird profile page — resolving the bird from the slug (404 if unknown) and wiring circular prev/next navigation across the five Pakshi.
