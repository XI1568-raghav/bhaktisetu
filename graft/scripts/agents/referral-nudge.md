# scripts\agents\referral-nudge.mjs

Daily cron script that emails a one-time referral nudge (deep link to /refer with a 10%-off friend offer) to users whose first booking landed 7-8 days ago, deduping per user_id via a JSON state file.

- loadState · function · L15-L22 — Loads the dedup state file of already-nudged user IDs, falling back to an empty state if the file is missing or corrupt.
- saveState · function · L24-L26 — Persists the updated dedup state so future runs never re-email the same user.
- escapeHtml · function · L28-L30 — Sanitizes user-supplied names before embedding them in the email HTML to prevent markup injection.
- emailHtml · function · L32-L39 — Builds the referral nudge email body pitching the 10%-off friend discount with a UTM-tagged deep link to the /refer page.
- sendEmail · function · L41-L55 — Sends one nudge email through the Resend API, gracefully skipping when no API key or recipient is configured.
- main · function · L57-L133 — Orchestrates the daily run: fetches eligible first-booking users, emails each non-duplicate, records them in state, and writes a summary report.
