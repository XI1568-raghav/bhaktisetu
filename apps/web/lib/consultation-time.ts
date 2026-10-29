/**
 * Consultation date/time helpers. Every astrologer time on this product is IST
 * (see format-locale APP_TIME_ZONE); the portal used the BROWSER's zone with no
 * label, so an astrologer travelling or a devotee abroad read a different clock
 * from the one the slot was agreed in.
 */
import { APP_LOCALE, APP_TIME_ZONE } from './format-locale';

/** "5 Nov, 10:30 am IST". An em-dash-free fallback for missing/invalid input. */
export function formatIst(value: string | number | Date | null | undefined, fallback = 'Time to be agreed'): string {
  if (value === null || value === undefined || value === '') return fallback;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return fallback;
  const text = d.toLocaleString(APP_LOCALE, {
    timeZone: APP_TIME_ZONE,
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${text} IST`;
}

/** Day + month only, in IST (earnings rows). */
export function formatIstDate(value: string | number | Date | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(APP_LOCALE, { timeZone: APP_TIME_ZONE, day: 'numeric', month: 'short' });
}

/**
 * The value for `<input type="datetime-local" min>`: now in the BROWSER's local
 * wall clock. `new Date().toISOString().slice(0, 16)` is UTC, which for an IST
 * browser is 5 h 30 min in the past, so "past" slots were selectable.
 */
export function localDateTimeMin(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

/** Hours of notice a cancellation needs to be refunded in full. Mirrors routes/consultation.ts. */
export const CONSULTATION_REFUND_NOTICE_HOURS = 24;

/**
 * Would cancelling this CONFIRMED consultation now be refunded? Same rule as
 * POST /consultation/:id/cancel: a scheduled slot needs >= 24 h notice; an
 * unscheduled one is refundable for 24 h after payment. Unpaid rows cancel free.
 */
export function cancellationRefundable(
  c: { status: string; scheduledAt?: string | null; paidAt?: string | null },
  now: number = Date.now(),
): boolean {
  if (c.status === 'pending_payment') return true;
  if (c.status !== 'confirmed') return false;
  const dayMs = CONSULTATION_REFUND_NOTICE_HOURS * 60 * 60 * 1000;
  if (c.scheduledAt) {
    const at = new Date(c.scheduledAt).getTime();
    return Number.isFinite(at) && at >= now + dayMs;
  }
  if (!c.paidAt) return true;
  const paid = new Date(c.paidAt).getTime();
  return !Number.isFinite(paid) || now - paid < dayMs;
}
