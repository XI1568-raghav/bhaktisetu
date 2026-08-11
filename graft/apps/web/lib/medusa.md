# apps\web\lib\medusa.ts

- MedusaProduct · interface · L15-L41 — Unified product shape that normalises both Medusa API results and seed data so the storefront UI never has to branch on the source.
- MedusaListResponse · interface · L43-L58 — Minimal structural type for the subset of the Medusa store products endpoint response this client actually consumes.
- isMedusaEnabled · function · L63-L65 — Reports whether a Medusa backend URL is configured, gating all live API calls versus seed fallback.
- headers · function · L67-L71 — Builds request headers for Medusa calls, attaching the publishable API key only when one is configured.
- seedToMedusa · function · L73-L98 — Converts a static seed product into the unified MedusaProduct shape so fallback data is indistinguishable to the UI.
- medusaToNormal · function · L100-L128 — Normalises a raw Medusa product into the unified shape, extracting the INR price from the first variant and synthesising display defaults (stock, free delivery, rating) for bare-bones catalogue entries.
- listProducts · function · L130-L144 — Fetches the product list from Medusa when configured, guaranteeing a non-empty catalogue by falling back to seed products on any failure.
- getProductByHandle · function · L146-L165 — Looks up a single product by handle from Medusa when configured, falling back to the seed catalogue on error or when disabled so detail pages never 404 on backend issues.
