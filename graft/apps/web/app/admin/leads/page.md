# apps\web\app\admin\leads\page.tsx

- LeadRole · type · L9-L9 — Enumerates the provider categories (temples, priests, astrologers, wellness instructors, gaushalas) that outreach leads can belong to.
- LeadStatus · type · L10-L10 — Enumerates the lead lifecycle stages from NEW through outreach (QUEUED/EMAILED) to terminal outcomes (REPLIED/CONVERTED/BOUNCED/UNSUBSCRIBED).
- Lead · interface · L12-L28 — Data shape of a single outreach lead including identity, contact info, source attribution, pipeline status, and contact-count tracking.
- OutreachLog · interface · L30-L37 — Data shape of one recorded outreach attempt against a lead, capturing channel, template, delivery status, and any error.
- LeadDetail · interface · L39-L41 — Extends a lead with its full outreach history for the detail drawer view.
- StatsResponse · interface · L43-L48 — Data shape of aggregate pipeline stats (totals, replies, conversions, per-role breakdown) shown in the header cards.
- authFetch · function · L78-L89 — Shared helper that calls the admin API with the session bearer token and throws on non-OK responses so callers get uniform error handling.
- AdminLeadsPage · function · L91-L563 — Main admin leads page component orchestrating filtered/paginated lead fetching, stats, the detail drawer, and import modal.
- openDrawer · function · L167-L175 — Opens the lead detail drawer by fetching the full lead record, falling back to the row data if the detail request fails.
- submitNote · function · L177-L189 — Appends an admin note to the selected lead and refreshes the drawer's notes field.
- transitionStatus · function · L191-L211 — Moves the selected lead to a new pipeline status (optionally triggering an outreach email with a decision reason) and syncs the change into both the drawer and the table row.
- submitImport · function · L213-L232 — Bulk-imports pasted JSON lead data via the admin API, reporting inserted/skipped counts and resetting to page one.
- StatCard · function · L565-L572 — Presentational card rendering one pipeline metric label and value in the stats header.
- Row · function · L574-L581 — Presentational label/value row used throughout the lead detail drawer.
