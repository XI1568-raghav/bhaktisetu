# scripts\agents\support-intent-triage.mjs

- classify · function · L34-L37 — Maps free-text ticket content to a support intent and priority tier by testing it against an ordered list of keyword regexes, defaulting to low-priority 'general'.
- loadState · function · L39-L46 — Loads the persisted set of already-processed ticket IDs so re-runs skip duplicates, tolerating a missing or corrupt state file.
- saveState · function · L48-L50 — Persists the processed-ticket ledger to disk so the next hourly run does not reclassify or re-alert on old tickets.
- ghFileIssue · function · L52-L71 — Escalates urgent tickets by creating a labeled GitHub issue via the REST API, degrading gracefully to a skipped result when no token is configured.
- readInbound · function · L73-L87 — Parses the append-only JSONL inbox into ticket objects, silently dropping malformed lines and entries lacking an id or text.
- main · function · L89-L171 — Orchestrates the triage run: dedupes new tickets against state, buckets them by intent, files one combined P0 GitHub issue for refund/abuse alerts, and emits the founder-facing markdown report.
