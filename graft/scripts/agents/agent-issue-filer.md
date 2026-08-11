# scripts\agents\agent-issue-filer.mjs

- ghFetch · function · L20-L37 — Wraps GitHub REST calls with bearer auth and a silent no-token/no-network fallback so the agent degrades to a no-op instead of crashing.
- listOpenAutoIssues · function · L39-L44 — Fetches all currently open issues carrying the agent-auto-filed label so the filer can check fingerprints before creating duplicates.
- fingerprint · function · L46-L52 — Hashes a signal set into a compact source-prefixed fingerprint used to detect and suppress re-filing of the same issue.
- fileIssue · function · L54-L65 — Creates a GitHub issue stamped with the agent-auto-filed label and reports back the created issue's URL/number or the failure reason.
- extractUptimeSignals · function · L69-L81 — Parses uptime report markdown tables to collect surfaces whose status cell reads DOWN or ERROR.
- extractBrokenLinkSignals · function · L83-L94 — Parses broken-link report tables for rows marked BROKEN with their HTTP status code, capping the list at ten to keep issues readable.
- extractSchemaSignals · function · L96-L105 — Extracts page URLs and HTTP statuses from schema-validator report headings to identify pages with invalid JSON-LD.
- processReport · function · L109-L131 — Runs one report through the extract-fingerprint-dedup-file pipeline, skipping when the report is absent, signal-free, or already covered by an open issue.
- main · function · L133-L218 — Orchestrates the daily run: no-ops without a token, otherwise processes today's uptime, broken-link, and schema reports and writes a summary report of filed/skipped issues.
