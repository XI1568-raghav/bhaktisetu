/**
 * The contract between "a devotee cancelled a paid booking" and "the refund cron
 * should pick it up".
 *
 * `processAutoRefunds` (services/refund.service.ts) selects cancelled bookings
 * whose `cancellationReason` starts with this marker. It lives here, rather than
 * inside refund.service, so the PRODUCER (booking.service.cancelBooking) and the
 * CONSUMER (refund.service) share one definition without importing each other.
 *
 * RV-07 (2026-08-10): before this, the marker was declared only inside
 * refund.service and no code path ever wrote it — the cron's query matched zero
 * rows forever, so a devotee who cancelled a paid booking was never automatically
 * refunded. The money stayed with the platform until an admin manually spotted the
 * booking in GET /admin/bookings/refunds/pending.
 */
export const REFUND_REQUESTED_MARKER = '[refund-requested]';
