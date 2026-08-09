# apps\web\lib\jsonld.ts

- articleJsonLd · function · L63-L88 — Builds Article structured data for content pages, defaulting the author to the Darshya organization and dateModified to datePublished when specifics are missing.
- breadcrumbJsonLd · function · L90-L101 — Builds BreadcrumbList structured data so Google can show page hierarchy in search results, assigning 1-based positions to each crumb.
- productJsonLd · function · L103-L141 — Builds Product structured data with dual INR/USD offers and stock availability so store items are eligible for Google product rich results.
- eventJsonLd · function · L143-L177 — Builds Event structured data for live darshan and temple events, switching attendance mode and location type between online and offline based on isOnline.
- placeJsonLd · function · L179-L212 — Builds Place structured data for temples, emitting a PostalAddress defaulting to India and GeoCoordinates only when both latitude and longitude are provided.
- StoreProductLite · type · L300-L307 — Minimal product shape required from the store catalog to generate ItemList structured data without coupling to the full product model.
- storeItemListJsonLd · function · L309-L323 — Builds an ItemList of up to 50 store products with canonical per-product URLs so the store page qualifies for Google carousel/listing rich results.
