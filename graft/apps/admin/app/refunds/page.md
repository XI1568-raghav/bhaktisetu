# apps\admin\app\refunds\page.tsx

- RefundBooking · interface · L7-L19 — Shape of a cancelled booking row shown in the refund queue, including devotee, puja, cancellation details, and payment state.
- RefundResult · interface · L21-L26 — Envelope for the refunds fetch outcome, carrying either the booking list plus an optional schema-gap note or an error message.
- fetchRefunds · function · L28-L43 — Loads pending-refund bookings from the admin API without caching, converting HTTP or network failures into an error result instead of throwing.
- RefundsPage · function · L47-L113 — Server component that renders the pending-refunds queue as an error banner, empty state, or a table with per-booking refund actions.
