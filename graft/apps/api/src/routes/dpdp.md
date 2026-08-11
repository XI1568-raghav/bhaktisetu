# apps\api\src\routes\dpdp.ts

- RawRow · type · L99-L99 — Loose row type for raw SQL results so Prisma $queryRawUnsafe rows can be read without generated models.
- rowGet · function · L101-L104 — Null-safe typed accessor for reading a column off a raw SQL row.
- dpdpRoutes · function · L106-L337 — Registers the six DPDP endpoints — user DSAR filing/history, append-only consent recording/current-state, and admin SLA-ordered dashboard plus resolve/reject — enforcing the published 30-day DSAR SLA and latest-event-per-purpose consent semantics.
