# apps\api\src\routes\admin-subscriptions.ts

Admin-only endpoint that serves marketplace subscription metrics as a placeholder, returning empty subscription data plus FREE-tier role counts until the subscriptions schema ships.

- route · function · L12-L57 — Registers GET /admin/subscriptions, which substitutes User table role groupings for real subscription data so admin clients get a valid response shape before the marketplace schema exists.
