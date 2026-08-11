# apps\admin\app\gurukuls\GurukulModerationClient.tsx

- GurukulRow · interface · L5-L21 — Row shape describing one gurukul listing shown in the moderation table, including its verification/active flags, owner contact, and program count.
- clientApiBase · function · L23-L29 — Resolves the backend API base URL from public env vars with a localhost fallback so moderation requests hit the right server.
- GurukulModerationClient · function · L31-L198 — Interactive moderation table that filters gurukul listings by all/pending/verified and exposes per-row verify and show/hide actions.
- toggleVerified · function · L36-L62 — Flips a gurukul's verified flag via the admin API and applies the server-confirmed value to local table state, with a busy guard preventing concurrent edits.
- toggleActive · function · L64-L90 — Flips a gurukul's active (live/hidden) flag via the admin API and syncs the server-confirmed value back into local table state.
