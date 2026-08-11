# scripts\agents\onboarding-nudge.mjs

- loadState · function · L20-L27 — Loads the dedup state file recording which lead+window nudges were already sent, tolerating missing or corrupt JSON by starting fresh.
- saveState · function · L29-L32 — Persists the dedup state to disk so subsequent cron ticks skip already-nudged leads.
- escapeHtml · function · L61-L63 — Escapes HTML metacharacters in lead names so interpolated email templates can't be broken or injected.
- sendEmail · function · L65-L82 — Sends a single nudge email via the Resend API, returning a structured ok/skipped/failed result instead of throwing so the batch loop can log and continue.
- main · function · L84-L171 — Orchestrates the nudge run: fetches abandoned-KYC lead buckets, sends the window-appropriate email to each un-nudged lead with an email address, records sends in state, and writes a summary report.
