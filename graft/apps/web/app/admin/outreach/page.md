# apps\web\app\admin\outreach\page.tsx

- OutreachStats · interface · L8-L11 — Shape of the 30-day outreach email metrics (daily sent/replied/bounced plus totals) returned by the admin stats API.
- LeadsStats · interface · L13-L18 — Shape of the lead pipeline metrics grouped by role and status, used to compute per-role conversion and reply rates.
- authFetch · function · L22-L33 — Authenticated JSON fetch wrapper that attaches the admin bearer token and surfaces non-OK responses as errors.
- AdminOutreachPage · function · L35-L212 — Renders the outreach admin dashboard: loads email and lead stats, shows totals, a daily activity bar chart, and a per-role funnel table deriving reply/conversion rates from lead statuses.
- runNow · function · L70-L87 — Manually triggers the outreach job on demand and refreshes the displayed stats with the outcome.
- StatCard · function · L214-L221 — Presentational card showing a single labeled outreach metric value.
- Legend · function · L223-L230 — Presentational color-swatch legend item for the daily activity chart.
