# apps\api\src\routes\admin-gurukuls.ts

Admin-only moderation API for gurukuls: listing with verification-status filtering plus endpoints to toggle a gurukul's verified and active flags.

- adminGurukulsRoutes · function · L18-L101 — Registers the gurukul moderation routes (list, verify, activate) and enforces that only authenticated admins can reach any of them.
