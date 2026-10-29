/**
 * How a booking status reads to a temple manager. The API sends the raw enum
 * (`priest_assigned`, `pending_payment`); the dashboard printed it as is and
 * the bookings page only swapped underscores for spaces.
 */
export const TEMPLE_BOOKING_STATUS: Record<string, { label: string; cls: string }> = {
  pending_payment: { label: 'Awaiting payment', cls: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: 'Confirmed', cls: 'bg-blue-100 text-blue-800' },
  priest_assigned: { label: 'Pandit assigned', cls: 'bg-indigo-100 text-indigo-800' },
  in_progress: { label: 'In progress', cls: 'bg-saffron-100 text-saffron-800' },
  completed: { label: 'Performed', cls: 'bg-green-100 text-green-800' },
  video_uploaded: { label: 'Proof uploaded', cls: 'bg-green-100 text-green-800' },
  delivered: { label: 'Delivered', cls: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelled', cls: 'bg-red-100 text-red-800' },
  refunded: { label: 'Refunded', cls: 'bg-red-100 text-red-800' },
};

export function templeBookingStatus(status: string): { label: string; cls: string } {
  return (
    TEMPLE_BOOKING_STATUS[status] ?? {
      label: status.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()),
      cls: 'bg-surface-100 text-surface-600',
    }
  );
}

/** Filter chips on the bookings page, in the order a booking moves through them. */
export const TEMPLE_BOOKING_FILTERS = [
  'all',
  'pending_payment',
  'confirmed',
  'priest_assigned',
  'in_progress',
  'completed',
  'video_uploaded',
  'delivered',
  'cancelled',
] as const;
