'use client';

import { useState } from 'react';
import { CreditCard, Pencil } from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import { API_BASE_URL } from '../../lib/api-config';
import { buttonClass } from '../ui/button-recipe';
import { prepareEditPendingBooking } from '../../lib/edit-pending-booking';

/**
 * What a devotee can do with an UNPAID booking: finish paying, or change the
 * details. Rendered only for `pending_payment`; a paid booking has its own
 * reschedule and cancel flows with a refund policy.
 *
 * "Edit details" reopens the booking form pre-filled and releases the unpaid
 * hold (see lib/edit-pending-booking.ts), so the devotee can re-pick even the
 * same date and slot.
 */
export function PendingBookingActions({ bookingId, status }: { bookingId: string; status: string }) {
  const { session } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (status !== 'pending_payment') return null;

  async function edit() {
    if (busy) return;
    setBusy(true);
    setError('');
    const result = await prepareEditPendingBooking(bookingId, session?.accessToken ?? '', API_BASE_URL);
    if (result.ok) {
      window.location.href = result.href;
      return;
    }
    setError(result.message);
    setBusy(false);
  }

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center gap-2">
        <a href={`/bookings/pay?id=${encodeURIComponent(bookingId)}`} className={buttonClass('primary', 'sm')}>
          <CreditCard className="h-3.5 w-3.5" />
          Complete payment
        </a>
        <button type="button" onClick={edit} disabled={busy} aria-disabled={busy} className={buttonClass('secondary', 'sm')}>
          <Pencil className="h-3.5 w-3.5" />
          {busy ? 'Opening…' : 'Edit details'}
        </button>
      </div>
      <p className="mt-1.5 text-xs text-surface-500">
        Not paid yet. Editing reopens the booking form with your details filled in.
      </p>
      {error && (
        <p role="alert" className="mt-1.5 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
