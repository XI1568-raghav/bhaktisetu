# apps\web\app\admin\page.tsx

- UserStatus · type · L84-L84 — Union of the three UI-side account statuses used to badge users in the signups table.
- SignupRow · interface · L86-L93 — View-model shape for one row of the recent-signups table and CSV export.
- mapStatus · function · L95-L100 — Normalizes the backend's varied status strings (blocked/banned/suspended, pending variants) into the three UI statuses so badges stay consistent.
- mapUserToSignup · function · L102-L113 — Converts a backend user record into a SignupRow, deriving the display role from the user's first role assignment with a devotee fallback.
- formatInrCompact · function · L117-L124 — Formats rupee amounts in compact Indian notation (K/L/Cr) so revenue figures match the dashboard's original visual style.
- AdminDashboardPage · function · L128-L525 — Composes the admin dashboard: fetches dashboard stats, pending approvals, and recent users in parallel with per-request failure isolation, then derives stat tiles, role breakdown percentages, and table/export data.
- handleExportCsv · function · L245-L261 — Exports the currently loaded recent signups as a CSV file download, quoting name/email fields to keep the output valid.
