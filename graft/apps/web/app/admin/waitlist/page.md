# apps\web\app\admin\waitlist\page.tsx

- WaitlistStats · interface · L8-L16 — Type shape for the admin waitlist stats payload, covering totals, the conversion funnel, daily signup counts, and the referral leaderboard.
- authFetch · function · L18-L27 — Fetch helper that attaches the admin's Bearer token to API requests and converts non-OK HTTP responses into thrown errors.
- AdminWaitlistPage · function · L29-L156 — Client component that loads waitlist stats once an auth token is available and renders the dashboard's stat cards, chart, funnel, and referrer table with loading and error states.
- pct · function · L62-L62 — Converts a funnel stage count into a percentage string of the total funnel population, guarding against division by zero.
- StatCard · function · L158-L165 — Presentational card showing a single labeled waitlist metric in a color-coded large number.
- FunnelRow · function · L167-L181 — Presentational row rendering one conversion-funnel stage with its count, percentage, and a proportional progress bar.
