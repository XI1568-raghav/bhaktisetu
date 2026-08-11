# apps\api\src\routes\bookings.ts

HTTP route module for the puja-booking lifecycle — creating bookings, checking slot availability, driving status transitions, cancellation, rescheduling, refunds, and reviews — with strict per-transition input allowlists and ownership/role authorization added to close an IDOR where any user could mutate any booking's financial fields.

- bookingRoutes · function · L109-L1384 — Registers all authenticated booking endpoints, with the PATCH status-transition handler gating mutations so only the booking owner, the assigned priest, or an admin can advance a booking — and only an admin can reassign the priest.
- slotLabel · function · L655-L664 — Converts a raw scheduled time-slot value into a human-readable label for user-facing notification and refund messages.
- generateBookingNumber · function · L1159-L1170 — Produces a unique, human-readable booking reference number assigned to each new booking for identification in communications and support.
