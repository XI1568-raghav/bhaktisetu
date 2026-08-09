# apps\web\app\admin\metrics\page.tsx

- LineBreak · type · L8-L8 — Shape of one revenue line (count, gross GMV, net platform take in paise) as shown in the investor revenue-breakdown table.
- InvestorPayload · type · L10-L23 — Contract for the investor-metrics endpoint, defining the top-line KPIs (MRR, cumulative GMV, paying users, NRI mix, retention stubs) the page renders.
- DashboardPayload · type · L25-L30 — Contract for the dashboard endpoint providing today's snapshot (GMV, successful payments, bookings, signups) plus running MRR/GMV totals.
- FunnelPayload · type · L32-L35 — Contract for the funnel endpoint: per-day counts at each conversion stage (landing through payment success) used for the 7-day funnel table.
- paiseToInr · function · L37-L39 — Formats a paise amount as a whole-rupee Indian-locale currency string for display in metric tiles and tables.
- pct · function · L41-L44 — Formats a nullable 0-1 fraction as a one-decimal percentage, showing an em-dash when the metric is unavailable.
- Tile · function · L46-L54 — Renders a single KPI card (label, big value, optional sub-note and accent border) used uniformly across all dashboard sections.
- MetricsPage · function · L56-L209 — Page component that loads the three admin metrics payloads on mount/refresh and lays them out as today-snapshot tiles, investor top-line tiles, a revenue-line table, and a 7-day funnel table.
- load · function · L65-L82 — Fetches the dashboard, investor, and funnel endpoints concurrently with allSettled so each panel populates independently and failures surface as partial rather than total page errors.
