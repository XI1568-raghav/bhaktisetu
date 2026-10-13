/**
 * Pure logic for cancelling wellness enrolments and sessions (no React, no fetch).
 *
 * The API (apps/api/src/services/wellness-cancellation.service.ts) is the
 * authority on the refund. This module only PREVIEWS it so the confirm step can
 * say what is about to happen; the real tier and amount come back in the
 * POST /wellness/enrollments/:id/cancel response and are what we show after.
 * Ladder (same as pujas): 48h+ full, 24-48h 75%, inside 24h refused.
 */

import {
  CANCELLATION_CUTOFF_HOURS,
  FULL_REFUND_HOURS_BEFORE,
  PARTIAL_REFUND_PERCENT,
  REFUND_DAYS_LABEL,
} from './cancellation-policy';

export type EnrolmentPreview =
  | { kind: 'release'; message: string }
  | { kind: 'refund'; fraction: number; amountInr: number; message: string }
  | { kind: 'blocked'; message: string }
  | { kind: 'none'; message: string };

const round2 = (n: number) => Math.round(n * 100) / 100;

export function formatInr(amount: number): string {
  const whole = Number.isInteger(amount);
  return `Rs ${amount.toLocaleString('en-IN', {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export function previewEnrolmentCancel(opts: {
  status: string;
  priceInr: string | number;
  scheduledAt: string;
  now?: Date;
}): EnrolmentPreview {
  const price = Number(opts.priceInr);
  if (opts.status === 'PENDING_PAYMENT') {
    return { kind: 'release', message: 'You have not paid, so nothing will be charged. Your seat will be released.' };
  }
  if (opts.status === 'ATTENDED') {
    return { kind: 'blocked', message: 'You have already attended this class, so it can no longer be cancelled.' };
  }
  if (opts.status !== 'PAID') {
    return { kind: 'none', message: 'This enrolment is already cancelled.' };
  }
  if (!(price > 0)) {
    return { kind: 'release', message: 'This class is free, so there is nothing to refund. Your seat will be released.' };
  }
  const start = new Date(opts.scheduledAt).getTime();
  const now = (opts.now ?? new Date()).getTime();
  const hours = (start - now) / 3_600_000;
  if (!Number.isFinite(hours) || hours < CANCELLATION_CUTOFF_HOURS) {
    return {
      kind: 'blocked',
      message: `Paid classes can be cancelled up to ${CANCELLATION_CUTOFF_HOURS} hours before they start. This one starts too soon to cancel.`,
    };
  }
  const fraction = hours >= FULL_REFUND_HOURS_BEFORE ? 1 : PARTIAL_REFUND_PERCENT / 100;
  const amountInr = round2(price * fraction);
  return {
    kind: 'refund',
    fraction,
    amountInr,
    message:
      fraction === 1
        ? `You will get a full refund of ${formatInr(amountInr)}.`
        : `You will get a ${PARTIAL_REFUND_PERCENT}% refund of ${formatInr(amountInr)} (cancelling 24-48 hours before the class).`,
  };
}

export interface EnrolmentCancelResponse {
  cancelled?: boolean;
  alreadyCancelled?: boolean;
  refundOwedInr?: number;
  tierLabel?: string;
  note?: string;
}

/** The confirmation line shown after a successful cancel, from the API's own numbers. */
export function describeEnrolmentCancelled(r: EnrolmentCancelResponse): string {
  if (r.alreadyCancelled) return 'This enrolment was already cancelled.';
  const owed = Number(r.refundOwedInr ?? 0);
  if (owed > 0) {
    return `Enrolment cancelled. Refund of ${formatInr(owed)} (${r.tierLabel ?? 'per policy'}) will be processed in ${REFUND_DAYS_LABEL}.`;
  }
  return 'Enrolment cancelled. Nothing was charged, so there is no refund.';
}

/** Friendly sentence for a failed cancel call. 409 carries a code the API sets. */
export function describeEnrolmentCancelError(
  status: number,
  body: { error?: string; code?: string } | null,
): string {
  if (status === 409 && body?.code === 'cancellation_window_closed') {
    return `This class starts in less than ${CANCELLATION_CUTOFF_HOURS} hours, so it can no longer be cancelled and no refund is due.`;
  }
  if (status === 409 && body?.code === 'already_attended') {
    return 'You have already attended this class, so it can no longer be cancelled.';
  }
  if (status === 401) return 'Please sign in again to cancel this enrolment.';
  if (status === 403) return 'You can only cancel your own enrolment.';
  if (status === 404) return 'We could not find this enrolment. Refresh the page.';
  if (body?.error && status < 500) return body.error;
  return 'We could not cancel this enrolment just now. Please try again.';
}

export function canOfferEnrolmentCancel(status: string): boolean {
  return status === 'PAID' || status === 'PENDING_PAYMENT';
}

export interface RosterRow {
  id: string;
  status: string;
}

/** What cancelling a whole session will do, from the current roster and price. */
export function summariseSessionCancel(roster: RosterRow[], priceInr: string | number) {
  const paid = roster.filter((r) => r.status === 'PAID').length;
  const attended = roster.filter((r) => r.status === 'ATTENDED').length;
  const price = Number(priceInr);
  const refundTotalInr = price > 0 ? round2(paid * price) : 0;
  let message: string;
  if (paid === 0) {
    message = 'No paid enrolments. Any unpaid seats will be released.';
  } else if (price > 0) {
    message = `${paid} paid enrolment${paid === 1 ? '' : 's'} will be refunded in full (${formatInr(refundTotalInr)} in total) and unpaid seats released.`;
  } else {
    message = `${paid} free enrolment${paid === 1 ? '' : 's'} will be cancelled and unpaid seats released.`;
  }
  if (attended > 0) {
    message += ` ${attended} attended learner${attended === 1 ? '' : 's'} will not be refunded.`;
  }
  return { paid, attended, refundTotalInr, message };
}

/** Result line after the PATCH, from the API's `cancellation` block. */
export function describeSessionCancelled(c?: {
  released?: number;
  refunded?: number;
  refundOwedInr?: number;
}): string {
  if (!c) return 'Session cancelled.';
  const refunded = c.refunded ?? 0;
  const released = c.released ?? 0;
  const parts: string[] = [];
  if (refunded > 0) parts.push(`${refunded} refunded (${formatInr(Number(c.refundOwedInr ?? 0))})`);
  if (released > 0) parts.push(`${released} unpaid seat${released === 1 ? '' : 's'} released`);
  return parts.length ? `Session cancelled: ${parts.join(', ')}.` : 'Session cancelled. No enrolments needed a refund.';
}

/** Attendance error copy; the API sets these codes. */
export function describeAttendanceError(status: number, body: { error?: string; code?: string } | null): string {
  switch (body?.code) {
    case 'session_not_started':
      return 'Attendance can be marked once the class has started.';
    case 'session_cancelled':
      return 'This session was cancelled.';
    case 'enrollment_not_paid':
    case 'enrollment_changed':
      return body.error ?? 'This enrolment changed. Refresh the roster.';
    default:
      return status === 403
        ? 'Only the instructor can mark attendance.'
        : 'We could not mark attendance just now. Please try again.';
  }
}
