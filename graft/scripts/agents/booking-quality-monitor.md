# scripts\agents\booking-quality-monitor.mjs

- ghFetch · function · L15-L32 — Thin GitHub REST wrapper that no-ops gracefully when no token is configured so the monitor can still emit its report without filing issues.
- fileIssue · function · L34-L45 — Posts a P0 booking-quality issue to the repo and normalizes the result into an ok/url-or-error shape for the report.
- findOpenSlaIssue · function · L47-L52 — Finds an already-open booking-quality issue carrying an sla-overdue marker so the same breach signal is not re-filed every hour.
- fingerprint · function · L54-L62 — Hashes the sorted set of overdue booking numbers into a short signature used to detect whether the current breach set is already covered by an open issue.
- main · function · L64-L147 — Orchestrates the hourly run: skip or report on missing auth, fetch the SLA-overdue feed, file a new GitHub issue only when the breach fingerprint is not already open, and write the markdown report.
