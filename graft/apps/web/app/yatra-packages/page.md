# apps\web\app\yatra-packages\page.tsx

- YatraPackage · interface · L17-L29 — Type contract for a yatra package as returned by the API, including pricing, group capacity, and departure dates used to render tour cards.
- fetchPackages · function · L31-L42 — Fetches the available yatra packages from the Darshya API with 5-minute ISR caching, degrading gracefully to an empty list on any failure.
- YatraPackagesPage · function · L44-L121 — Renders the yatra packages catalog page, showing an empty-state prompt when none exist or a grid of package cards with seats remaining and starting price.
