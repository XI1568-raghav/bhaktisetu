# apps\web\app\priest\bookings\page.tsx

- TabKey · type · L25-L25 — Enumerates the booking-status filter tabs a priest can view on this page.
- BookingItem · interface · L27-L42 — Data shape of an assigned booking as the priest sees it, including temple, puja type, devotees, payout, and video proof URL.
- formatCurrency · function · L51-L53 — Renders payout amounts as whole-rupee INR strings for display on booking cards.
- formatDate · function · L55-L58 — Formats a booking's scheduled date into a short Indian-locale display string.
- formatTime · function · L60-L65 — Converts a 24-hour scheduled time slot into 12-hour AM/PM display format.
- getStatusConfig · function · L67-L77 — Maps each booking status to a priest-friendly label and badge color so workflow state (e.g. confirmed shown as "Pending Accept") is clear at a glance.
- PriestBookingsPage · function · L81-L87 — Wraps the bookings page in a Suspense boundary so useSearchParams works under Next.js static rendering.
- PriestBookingsInner · function · L89-L401 — Main priest bookings view: fetches assigned bookings, keeps the status filter tab synced to the URL, and renders booking cards with the appropriate lifecycle action buttons.
- fetchBookings · function · L107-L123 — Loads the priest's bookings from the API using the session bearer token, degrading to an empty list when the API is unavailable.
- handleAction · function · L141-L198 — Executes a booking lifecycle action (accept/reject/start/complete/video) against the API and optimistically updates local status, prompting for and validating a real video URL instead of a placeholder.
- getActionButton · function · L200-L274 — Decides which action buttons a booking card shows based on its current status, driving the priest workflow from accept through video upload.
- isLoading · function · L201-L201 — Checks whether a specific action on this booking is currently in flight so its button can show a spinner.
