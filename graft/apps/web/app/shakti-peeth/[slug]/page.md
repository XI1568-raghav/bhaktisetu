# apps\web\app\shakti-peeth\[slug]\page.tsx

Dynamic Next.js page that renders an SEO-optimized detail page for each of the 51 Shakti Peeth temples, with structured data and prev/next navigation.

- Props · interface · L19-L19 — Type contract for the route's async params carrying the temple slug from the URL.
- generateMetadata · function · L21-L36 — Builds per-temple SEO metadata (title, description, canonical, OpenGraph) from the Shakti Peeth record so each shrine page ranks and shares correctly.
- ShaktiPeethPage · function · L38-L194 — Renders the full Shakti Peeth detail page — resolving the slug to a temple record (404 if unknown), computing prev/next shrines, and emitting JSON-LD plus all content sections.
