# apps\admin\app\api\payouts\pending\route.ts

Admin API route module that exposes a GET endpoint proxying requests for pending payout bookings to the backend admin service.

- GET · function · L6-L16 — Forwards the admin client's request for pending payouts to the backend admin API and relays the upstream response body, status, and content type unchanged.
