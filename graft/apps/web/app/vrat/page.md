# apps\web\app\vrat\page.tsx

Static, SEO-optimized index page that catalogs the 10 major Hindu vrats grouped by observance category (lunar, seasonal, family, weekly) with structured data and cross-links to panchang and pandit booking.

- itemListJsonLd · function · L23-L36 — Builds schema.org ItemList JSON-LD enumerating every vrat's detail-page URL so search engines can index the vrat collection as a structured list.
- VratIndex · function · L52-L146 — Renders the vrat guide landing page by grouping vrat cards under their observance-category sections, skipping any category with no entries.
