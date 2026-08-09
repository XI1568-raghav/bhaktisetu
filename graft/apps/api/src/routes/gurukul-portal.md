# apps\api\src\routes\gurukul-portal.ts

Fastify route module that lets authenticated gurukul owners list student applications to their programs and record admission decisions (forward/accept/reject/withdraw) with timestamps.

- isSyntheticUserId · function · L6-L8 — Flags demo-/anon- prefixed user IDs as synthetic so portal routes can bypass database access for non-persistent demo or anonymous sessions.
- dbDisabled · function · L9-L9 — Reports whether DATABASE_URL is missing so the routes can degrade gracefully instead of failing when no database is configured.
- gurukulPortalRoutes · function · L16-L85 — Registers authenticated endpoints for gurukul owners to fetch applications across their programs and to update an application's status, enforcing ownership and stamping forwarded/decision timestamps per status transition.
