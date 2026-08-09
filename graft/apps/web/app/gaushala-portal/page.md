# apps\web\app\gaushala-portal\page.tsx · [[client-side-auth-api-base-url-resolution]] [[gaushala-manager-portal]] [[graceful-degradation-in-portal-data-fetching]]

- DashboardStats · type · L11-L16 — Shape of the aggregate shelter metrics (cow count, donor count, total and monthly donation amounts) returned by the dashboard API.
- DashboardDonation · type · L18-L23 — Shape of a single recent donation entry (donor name, INR amount, payment timestamp) shown in the dashboard feed.
- DashboardCow · type · L25-L31 — Shape of a cow registry preview entry (name, breed, age, health status) shown on the dashboard.
- formatInr · function · L33-L37 — Formats INR amounts into compact Indian-style notation (₹1.2L / ₹3.4K) so large donation figures fit dashboard cards.
- relativeTime · function · L39-L47 — Converts a donation timestamp into a short human-readable 'xh ago' / 'xd ago' label for the recent-donations feed.
- GaushalaDashboard · function · L56-L235 — Renders the gaushala manager's home dashboard, fetching live stats/donations/cows and deriving the KYC badge state (verified, pending, rejected with reason, or unsubmitted) from the provider-kyc API.
