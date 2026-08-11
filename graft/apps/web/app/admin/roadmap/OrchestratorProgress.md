# apps\web\app\admin\roadmap\OrchestratorProgress.tsx

- NormalizedRun · interface · L18-L27 — Data shape of one normalized GitHub Actions workflow run used to render cycle outcome badges and wall-clock times.
- NormalizedCommit · interface · L29-L35 — Data shape of a normalized git commit returned by the status API for the recent-commits display.
- PlannedItem · interface · L37-L44 — Data shape of a planned roadmap item surfaced as a likely candidate for the next orchestrator cycle.
- QueueItem · interface · L46-L51 — Data shape of an unconsumed dry-run queue item written by the orchestrator.
- FiredTripwire · interface · L53-L56 — Data shape of a fired tripwire used to show which armed triggers have activated.
- ShippedItem · interface · L58-L65 — Data shape of a recently shipped roadmap item for the shipped-work display.
- InProgressItem · interface · L67-L73 — Data shape of a roadmap item currently in progress.
- StatusOK · interface · L75-L89 — Success-payload contract of the status endpoint, aggregating runs, commits, queue, pipeline, tripwires, cron schedule, and GitHub rate-limit info into one fetch.
- StatusErr · interface · L91-L94 — Error-payload contract of the status endpoint carrying a human-readable failure reason.
- Status · type · L96-L96 — Discriminated union on `ok` so the UI can safely narrow between a full status payload and an error.
- fmtWall · function · L98-L103 — Formats a cycle's wall-clock duration in seconds into a compact 's' or 'XmYYs' label for badges and stat tiles.
- fmtRelative · function · L105-L113 — Converts an ISO timestamp into a human recency label ('just now', 'Xm/Xh/Xd ago') for last-cycle and last-green displays.
- runBadge · function · L115-L129 — Translates a run's status/conclusion into the icon, label, and color scheme that communicate cycle outcome (running, success, cancelled, failed/timed-out) at a glance.
- OrchestratorProgress · function · L131-L569 — Renders the live orchestrator status panel, deriving the top-level summary banner, green-rate health score, past-24h outcome tallies, inferred phase tracker, and next-cron countdown from the polled status payload.
- fetchStatus · function · L139-L152 — Fetches the orchestrator status JSON and updates component state while suppressing updates after unmount and surfacing endpoint errors.
