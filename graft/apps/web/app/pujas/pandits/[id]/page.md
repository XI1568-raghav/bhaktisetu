# apps\web\app\pujas\pandits\[id]\page.tsx

Legacy route shim that redirects old /pujas/pandits/[id] URLs to the live pandit listing because the curated placeholder profiles don't correspond to real Priest records.

- Props · type · L4-L4 — Type describing the route params promise for the legacy pandit detail page; a plain data holder with no logic.
- LegacyPanditRedirect · function · L9-L12 — Server component that unconditionally forwards legacy pandit detail requests to the /pandits listing to avoid 404s on placeholder profile IDs.
