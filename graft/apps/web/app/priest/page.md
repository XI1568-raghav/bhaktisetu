# apps\web\app\priest\page.tsx

- DashboardData · interface · L24-L53 — Type contract for the priest dashboard API payload covering priest identity, earnings totals, booking counts, and upcoming booking cards.
- zeroDashboard · function · L57-L64 — Builds an all-zeros dashboard so a new priest or a failed fetch still renders a sensible empty state instead of crashing.
- formatCurrency · function · L68-L74 — Formats a payout amount as whole-rupee Indian currency for display.
- formatDate · function · L76-L79 — Renders a booking's scheduled date string as a short Indian-locale date.
- formatTime · function · L81-L87 — Converts a 24-hour HH:MM time slot into 12-hour AM/PM form for display.
- getStatusBadge · function · L89-L96 — Maps a booking status to its human label and badge colors, translating raw statuses like 'confirmed' into priest-facing terms like 'Pending Accept'.
- PriestDashboard · function · L100-L365 — Renders the priest's home dashboard by loading dashboard and KYC data on session change and composing stats, earnings, on-duty toggle, and upcoming-booking sections.
- toggleDuty · function · L113-L125 — Toggles the priest's on-duty state in the instant-dispatch pool by PATCHing availability, which also heartbeats lastSeenAt so dispatch knows they are live.
- fetchDashboard · function · L128-L147 — Loads the priest's dashboard data and guarantees the page still renders by substituting a zero baseline whenever the request fails or errors.
- fetchKyc · function · L148-L169 — Fetches the priest's KYC record (including for demo sessions) and derives the displayed verification state, capturing any rejection reason.
