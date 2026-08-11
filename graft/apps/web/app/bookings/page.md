# apps\web\app\bookings\page.tsx

- BookingStatus · type · L27-L34 — Enumerates the booking lifecycle states (booked through delivered/cancelled) that drive status pills, tab filtering, and cancel eligibility.
- BookingListItem · interface · L36-L48 — Flat UI-friendly shape of a booking card (temple/puja names, schedule, amount, video URL) used by the list rendering.
- TabFilter · type · L50-L50 — The four list tabs (all/upcoming/completed/cancelled) a devotee can filter bookings by.
- ApiBooking · interface · L56-L67 — Raw backend booking payload shape with nested temple/pujaType objects and Decimal price, normalized before display.
- mapBooking · function · L69-L88 — Normalizes the nested API booking payload into the flat UI model, stripping ISO time from the date and coercing the Decimal price to a number.
- getStatusConfig · function · L92-L103 — Maps each booking status to its display label and badge colors so the status pill communicates lifecycle state at a glance.
- formatDate · function · L105-L112 — Formats a booking's scheduled date as a localized Indian short date for the card.
- formatTime · function · L114-L121 — Converts 24-hour scheduled time strings to 12-hour AM/PM display for the card.
- isUpcoming · function · L123-L132 — Decides whether a booking counts as upcoming: scheduled in the future and not in a terminal/fulfilled status, which drives the Upcoming tab and cancel eligibility.
- isCompleted · function · L134-L140 — Treats completed, video_uploaded, and delivered statuses as "completed" for the Completed tab grouping.
- BookingsContent · function · L144-L409 — Fetches the devotee's bookings via React Query and renders the tabbed, filterable booking card list with cancel and video actions.
- handleCancel · function · L153-L177 — Wires the Cancel button to POST /bookings/{id}/cancel with confirmation, then invalidates the bookings query so the status pill updates without refresh.
- BookingsPage · function · L411-L417 — Page entry that wraps the bookings content in AuthGuard so only signed-in devotees can view their bookings.
