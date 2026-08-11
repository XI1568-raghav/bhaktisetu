# apps\api\scripts\ops\sla-breach-outreach.ts

- BookingRow · interface · L29-L45 — Shape of a booking record returned by the admin SLA endpoint, including optional PII enrichment fields the endpoint may add later.
- SlaResponse · interface · L47-L53 — Envelope type for the /admin/ops/sla-overdue-bookings API response.
- CsvRow · interface · L55-L68 — Column schema for one row of the outreach CSV, including computed days-overdue, repeat-breach count, and suggested founder action.
- csvField · function · L75-L80 — Escapes a single CSV cell so commas, quotes, and newlines in booking data cannot corrupt the committed report.
- filterBreaches · function · L88-L100 — Narrows the API's broader overdue list to the strict breach spec: priest_assigned status, scheduled more than 7 days ago, and no video proof uploaded.
- groupByPriest · function · L107-L118 — Buckets breach bookings by priestId (null priests under an empty-string key) so repeat-offender counts can be computed per priest.
- toCsv · function · L126-L183 — Renders filtered breaches into a deterministic, commit-safe CSV whose per-row suggested action escalates from reschedule to refund to priest investigation based on days overdue and repeat-breach count.
- summarize · function · L185-L202 — Produces the console summary of breach count, total rupees at refund risk, and the sorted list of priests with two or more repeat breaches.
- transformToCsvRows · function · L208-L249 — Back-compat wrapper preserving the legacy unfiltered row transform and priest-then-booking sort, with the older CHASE-PRIEST action tier, so prior tests and call sites keep working.
- renderCsv · function · L251-L269 — Legacy thin renderer that serializes pre-built CsvRows into the header-plus-lines CSV string.
- main · function · L271-L329 — Orchestrates the fetch-filter-render-report flow, degrading to a header-only CSV on any API failure and always exiting 0 because the script is observational only.
