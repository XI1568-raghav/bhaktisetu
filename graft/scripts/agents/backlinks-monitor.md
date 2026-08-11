# scripts\agents\backlinks-monitor.mjs

- extractLinks · function · L21-L36 — Parses raw search-result HTML into a deduplicated set of referring domains while excluding search-engine hosts and the site's own domains so only genuine external mentions count.
- probeDdg · function · L38-L43 — Runs one DuckDuckGo HTML search for a query and returns the external domains found, degrading to an empty set on non-200 responses.
- loadState · function · L45-L52 — Loads the prior run's domain list and last-seen dates from the JSON state file, falling back to empty state when missing or corrupt.
- saveState · function · L54-L57 — Persists the current domain snapshot and last-seen map to the state file so the next run can diff against it.
- main · function · L59-L117 — Orchestrates the daily run: probes all queries with polite delays, diffs the aggregated domains against prior state to compute new and lost backlinks, updates last-seen timestamps, and emits the markdown report.
