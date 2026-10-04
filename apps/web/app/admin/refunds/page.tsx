'use client';

/**
 * /admin/refunds — the refund decision queue.
 *
 * AO-03 (prod sweep 2026-08-12, P0): this route returned HTTP 404 while the
 * whole refund rail sat live and unreachable on the API. Every refund had to be
 * run by hand with curl against a booking id nobody could look up from a
 * screen — and a refund a devotee has been promised and not received is the
 * fastest way to lose the demand side.
 *
 * TWO LISTS, ON PURPOSE:
 *
 *   Awaiting a decision — GET /admin/bookings/refunds/pending. A DERIVED set,
 *                         not a status: BookingStatus has no REFUND_REQUESTED,
 *                         so the server returns `cancelled` bookings whose
 *                         Payment is still captured/authorized.
 *   Already refunded    — GET /admin/bookings?status=refunded. Read-only. What
 *                         was actually paid back, so an operator can see it
 *                         without opening the database.
 *
 * NOTHING HERE CLAIMS SUCCESS FROM A 200. /admin/users shipped a Block control
 * that rendered "User updated" over a write that never happened. The same
 * defect here tells a devotee their money is on its way when the gateway
 * refused it. Both actions check what the SERVER reports and then refetch to
 * confirm the change actually persisted:
 *
 *   approve — the inner ProcessRefundResult must say ok (the route answers 200
 *             with `ok: true` even when the refund failed, and 502 when
 *             Razorpay is unconfigured), and the booking must have left the
 *             queue.
 *   reject  — does NOT change booking.status or the payment, so "the row
 *             disappeared" is the wrong proof. The only durable evidence is the
 *             [refund-rejected] marker the server writes into
 *             cancellationReason, read back off a refetched booking.
 *
 * THE LEDGER RULE IS STATED ON SCREEN, not assumed. refund.service reverses the
 * commission ledger for a FULL refund only; a partial refund deliberately
 * leaves the provider's earning standing, because splitting it mid-flight is an
 * open policy decision. An operator issuing a partial refund is therefore
 * paying the devotee back out of platform margin, and has to be told so before
 * they confirm — not after.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, RotateCcw, Receipt } from 'lucide-react';
import { useAuth } from '../../../lib/auth-context';
import {
  approveRefund,
  listPendingRefunds,
  listRefundedBookings,
  refundableInr,
  rejectRefund,
  REFUND_REJECTED_MARKER,
  type RefundBooking,
  type RefundType,
} from './refund-api';
import { H1 } from '../../../components/ui/heading-recipe';
import { buttonClass } from '../../../components/ui/button-recipe';
import { userFacingMessage, UserFacingError } from '../../../lib/friendly-error';

/**
 * Exact rupees, always. Compact formatting ("Rs. 3.2L") is fine for a headline
 * tile and wrong everywhere on this page — nobody should approve sending money
 * back against a rounded figure.
 */
function formatInrExact(amount: string | number): string {
  const n = typeof amount === 'number' ? amount : Number(amount);
  if (!Number.isFinite(n)) return String(amount);
  return `Rs. ${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDay(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function isRejected(booking: RefundBooking): boolean {
  return (booking.cancellationReason ?? '').includes(REFUND_REJECTED_MARKER);
}

type DialogMode = 'refund' | 'reject';

export default function AdminRefundsPage() {
  const { session } = useAuth();
  const token = session?.accessToken;

  const [pending, setPending] = useState<RefundBooking[]>([]);
  const [schemaNote, setSchemaNote] = useState<string | null>(null);
  const [history, setHistory] = useState<RefundBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const [dialog, setDialog] = useState<{ mode: DialogMode; target: RefundBooking } | null>(null);
  const [refundType, setRefundType] = useState<RefundType>('full');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // React state is stale inside the handler's closure, so the in-flight latch
  // that stops a double-clicked refund firing the gateway twice has to be a ref.
  const inFlight = useRef(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setQueueError(null);
      try {
        const queue = await listPendingRefunds(token);
        if (!cancelled) {
          setPending(queue.bookings);
          setSchemaNote(queue.schemaNote);
        }
      } catch (err) {
        if (!cancelled) {
          setPending([]);
          setQueueError(userFacingMessage(err, 'Could not load the refund queue.'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  // History is a separate, non-blocking fetch: a failure here must not blank
  // the decision queue, and an empty history must not read as "nothing refunded".
  const loadHistory = useCallback(async (): Promise<void> => {
    if (!token) return;
    try {
      setHistory(await listRefundedBookings(token));
      setHistoryError(null);
    } catch (err) {
      setHistory([]);
      setHistoryError(userFacingMessage(err, 'Could not load refunded bookings.'));
    }
  }, [token]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const openDialog = useCallback((mode: DialogMode, target: RefundBooking) => {
    setDialog({ mode, target });
    setRefundType('full');
    setAmount('');
    setReason('');
    setActionError(null);
    setSuccessMessage(null);
  }, []);

  const closeDialog = useCallback(() => {
    if (inFlight.current) return;
    setDialog(null);
    setReason('');
    setAmount('');
    setActionError(null);
  }, []);

  /**
   * Refetch the queue and hand back the server's current view.
   *
   * Returns null when the refetch itself failed — in which case the caller says
   * out loud that it could not confirm, rather than quietly assuming.
   */
  const refetchQueue = useCallback(async (): Promise<RefundBooking[] | null> => {
    try {
      const queue = await listPendingRefunds(token);
      setPending(queue.bookings);
      setSchemaNote(queue.schemaNote);
      return queue.bookings;
    } catch {
      return null;
    }
  }, [token]);

  const confirmRefund = useCallback(async () => {
    if (!dialog || inFlight.current) return;
    const { target } = dialog;

    const why = reason.trim();
    if (why.length < 3) {
      setActionError(
        'Enter why this booking is being refunded. The reason is stored on the payment and goes into the devotee’s refund email.',
      );
      return;
    }

    const cap = refundableInr(target);
    let amountInr: number | undefined;
    if (refundType === 'partial') {
      amountInr = Number(amount.trim());
      if (!Number.isFinite(amountInr) || amountInr <= 0) {
        setActionError('Enter the amount to refund, in rupees.');
        return;
      }
      if (amountInr > cap) {
        setActionError(
          `Only ${formatInrExact(cap)} is captured against this booking — a partial refund cannot exceed it.`,
        );
        return;
      }
    }

    inFlight.current = true;
    setSubmitting(true);
    setActionError(null);
    setSuccessMessage(null);
    try {
      const result = await approveRefund(token, target.id, {
        reason: why,
        refundType,
        amountInr,
      });

      const refreshed = await refetchQueue();
      if (refreshed && refreshed.some((b) => b.id === target.id)) {
        throw new UserFacingError(
          `The gateway reported a refund, but booking ${target.bookingNumber} is still in the refund queue. ` +
            'Do not refund it again — reconcile the payment against Razorpay first.',
        );
      }
      const caveat = refreshed ? '' : ' The queue could not be refreshed — reload to confirm.';

      if (result.skipped) {
        setSuccessMessage(
          `Booking ${target.bookingNumber} was already refunded (${
            result.reason ?? 'already-refunded'
          }) — the gateway was not charged a second time and no new refund was sent.${caveat}`,
        );
      } else {
        const paid =
          typeof result.amountInr === 'number' ? formatInrExact(result.amountInr) : 'The refund';
        setSuccessMessage(
          `${paid} refunded for booking ${target.bookingNumber}${
            result.refundId ? ` — gateway refund id ${result.refundId}` : ''
          }. ${
            refundType === 'full'
              ? 'The commission ledger for this booking was reversed.'
              : 'The commission ledger was NOT reversed — the provider keeps their full earning on this booking.'
          }${caveat}`,
        );
      }
      setDialog(null);
      setReason('');
      setAmount('');
      // A booking just refunded belongs in the list below; leaving it stale
      // invites a second refund against the same payment.
      await loadHistory();
    } catch (err) {
      setActionError(userFacingMessage(err, 'Could not refund this booking.'));
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }, [dialog, reason, refundType, amount, token, refetchQueue, loadHistory]);

  const confirmReject = useCallback(async () => {
    if (!dialog || inFlight.current) return;
    const { target } = dialog;

    const why = reason.trim();
    if (why.length < 3) {
      setActionError(
        'Enter why this refund is being declined. The API rejects an empty reason, and it is the only thing the devotee can be told.',
      );
      return;
    }

    inFlight.current = true;
    setSubmitting(true);
    setActionError(null);
    setSuccessMessage(null);
    try {
      await rejectRefund(token, target.id, why);

      // The endpoint echoes its own write back, which proves nothing. Rejecting
      // leaves status and payment untouched by design, so the row STAYS in the
      // queue — the only evidence is the marker on a refetched booking.
      const refreshed = await refetchQueue();
      if (!refreshed) {
        throw new UserFacingError(
          'The server accepted the rejection but the queue could not be refreshed, so nothing confirms it was recorded. Treat it as not recorded and reload.',
        );
      }
      const after = refreshed.find((b) => b.id === target.id);
      if (!after) {
        throw new UserFacingError(
          `Booking ${target.bookingNumber} is no longer in the refund queue, so the ${REFUND_REJECTED_MARKER} marker could not be confirmed. Treat the rejection as not recorded and check the booking.`,
        );
      }
      if (!isRejected(after)) {
        throw new UserFacingError(
          `The server accepted the rejection, but the refetched booking does not show the ${REFUND_REJECTED_MARKER} marker — it was not recorded. Do not tell the devotee anything yet.`,
        );
      }

      setSuccessMessage(
        `Refund for booking ${target.bookingNumber} rejected and recorded. The booking stays in the queue — there is no rejected status in the schema — and the payment is untouched.`,
      );
      setDialog(null);
      setReason('');
    } catch (err) {
      setActionError(userFacingMessage(err, 'Could not reject this refund.'));
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }, [dialog, reason, token, refetchQueue]);

  const target = dialog?.target ?? null;
  const cap = target ? refundableInr(target) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className={H1.portal}>Refunds</h1>
        <p className="text-sm text-surface-500 mt-0.5">
          Approve or decline refunds on cancelled bookings whose payment is still captured.
        </p>
      </div>

      {successMessage && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
        >
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* ─── awaiting a decision ──────────────────────────────────────────── */}
      <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]">
        <div className="px-5 py-4 border-b border-[var(--color-border)]">
          <h2 className="text-sm font-semibold text-surface-800 flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-saffron-600" />
            Awaiting a refund decision
          </h2>
          <p className="text-xs text-surface-400 mt-0.5">
            Cancelled bookings whose payment is still held by the gateway. Approving sends the money
            back; declining records the decision and leaves the booking here.
          </p>
        </div>

        {queueError && (
          <div className="mx-5 mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              Refund queue unavailable — {queueError}. This is not an empty queue; retry before
              telling anyone their refund was not found.
            </span>
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center">
            <Loader2 className="w-5 h-5 text-surface-400 mx-auto mb-2 animate-spin" />
            <p className="text-sm text-surface-500">Loading the refund queue…</p>
          </div>
        ) : pending.length === 0 ? (
          <p className="text-sm text-surface-400 py-12 text-center">
            {queueError
              ? 'The queue could not be loaded.'
              : 'No refunds awaiting a decision right now.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="text-left py-2.5 px-5 text-xs font-medium text-surface-500 uppercase tracking-wide">Booking</th>
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-surface-500 uppercase tracking-wide">Devotee</th>
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-surface-500 uppercase tracking-wide">Cancelled</th>
                  <th className="text-right py-2.5 px-4 text-xs font-medium text-surface-500 uppercase tracking-wide">Captured</th>
                  <th className="text-right py-2.5 px-5 text-xs font-medium text-surface-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((b, i) => (
                  <tr
                    key={b.id}
                    className={`border-b border-[var(--color-border)] last:border-0 ${i % 2 === 1 ? 'bg-surface-50/30' : ''}`}
                  >
                    <td className="py-2.5 px-5">
                      <p className="font-medium text-surface-800">{b.bookingNumber}</p>
                      <p className="text-xs text-surface-400">
                        {b.pujaType?.name ?? 'Puja'}
                        {b.temple?.name ? ` · ${b.temple.name}` : ''}
                      </p>
                      {isRejected(b) && (
                        <span className="inline-flex items-center mt-1 px-1.5 py-0.5 rounded-full bg-surface-100 text-surface-600 text-xs">
                          Refund declined
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4">
                      <p className="text-surface-800">{b.user?.fullName ?? 'Unknown devotee'}</p>
                      {b.user?.phone && <p className="text-xs text-surface-400">{b.user.phone}</p>}
                    </td>
                    <td className="py-2.5 px-4 text-surface-500">
                      {formatDay(b.cancelledAt)}
                      {b.cancellationReason && (
                        <p className="prose-meta text-surface-400 truncate max-w-[220px]">
                          {b.cancellationReason}
                        </p>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right font-semibold text-surface-800">
                      {formatInrExact(refundableInr(b))}
                      {Number(b.priceAmount) !== refundableInr(b) && (
                        <p className="text-xs font-normal text-surface-400">
                          booked {formatInrExact(b.priceAmount)}
                        </p>
                      )}
                    </td>
                    <td className="py-2.5 px-5 text-right whitespace-nowrap">
                      <span className="inline-flex gap-2">
                        <button
                          type="button"
                          onClick={() => openDialog('refund', b)}
                          className={buttonClass('primary', 'md')}
                        >
                          Refund
                        </button>
                        <button
                          type="button"
                          onClick={() => openDialog('reject', b)}
                          className="px-3 py-1.5 border border-[var(--color-border)] text-surface-600 text-xs font-medium rounded-md hover:bg-surface-50 transition-colors"
                        >
                          Reject
                        </button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {schemaNote && (
          <p className="px-5 py-3 text-xs text-surface-400 border-t border-[var(--color-border)]">
            {schemaNote}
          </p>
        )}
      </div>

      {/* ─── already refunded (read-only) ─────────────────────────────────── */}
      <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]">
        <div className="px-5 py-4 border-b border-[var(--color-border)]">
          <h2 className="text-sm font-semibold text-surface-800 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-saffron-600" />
            Already refunded
          </h2>
          <p className="text-xs text-surface-400 mt-0.5">
            Bookings the gateway has paid back. Read-only — a refund cannot be undone from here.
          </p>
        </div>

        {historyError && (
          <div className="mx-5 mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>Refunded bookings unavailable — {historyError}</span>
          </div>
        )}

        {history.length === 0 ? (
          <p className="text-sm text-surface-400 py-10 text-center">
            {historyError ? 'Refunded bookings could not be loaded.' : 'Nothing refunded yet.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="text-left py-2.5 px-5 text-xs font-medium text-surface-500 uppercase tracking-wide">Booking</th>
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-surface-500 uppercase tracking-wide">Devotee</th>
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-surface-500 uppercase tracking-wide">Cancelled</th>
                  <th className="text-right py-2.5 px-5 text-xs font-medium text-surface-500 uppercase tracking-wide">Booked</th>
                </tr>
              </thead>
              <tbody>
                {history.map((b, i) => (
                  <tr
                    key={b.id}
                    className={`border-b border-[var(--color-border)] last:border-0 ${i % 2 === 1 ? 'bg-surface-50/30' : ''}`}
                  >
                    <td className="py-2.5 px-5">
                      <p className="font-medium text-surface-800">{b.bookingNumber}</p>
                      <p className="text-xs text-surface-400">
                        {b.pujaType?.name ?? 'Puja'}
                        {b.temple?.name ? ` · ${b.temple.name}` : ''}
                      </p>
                    </td>
                    <td className="py-2.5 px-4 text-surface-800">
                      {b.user?.fullName ?? 'Unknown devotee'}
                    </td>
                    <td className="py-2.5 px-4 text-surface-500">{formatDay(b.cancelledAt)}</td>
                    <td className="py-2.5 px-5 text-right font-semibold text-surface-800">
                      {formatInrExact(b.priceAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── confirmation ─────────────────────────────────────────────────── */}
      {dialog && target && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="refund-dialog-title"
            className="w-full max-w-md rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-5 shadow-xl max-h-[90vh] overflow-y-auto"
          >
            <h2 id="refund-dialog-title" className="text-base font-semibold text-surface-800">
              {dialog.mode === 'refund' ? 'Refund this booking' : 'Decline this refund'}
            </h2>
            <p className="text-sm text-surface-500 mt-1">
              {dialog.mode === 'refund'
                ? 'This sends money back through Razorpay immediately. It cannot be undone from this screen.'
                : 'This records the decision against the booking. It does not change the booking status or release the payment — the booking stays in the queue.'}
            </p>

            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-surface-500">Booking</dt>
                <dd className="font-medium text-surface-800 text-right">{target.bookingNumber}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-surface-500">Devotee</dt>
                <dd className="text-surface-800 text-right">
                  {target.user?.fullName ?? 'Unknown devotee'}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-surface-500">Captured</dt>
                <dd className="font-semibold text-surface-800">{formatInrExact(cap)}</dd>
              </div>
            </dl>

            {dialog.mode === 'refund' && cap <= 0 && (
              <p className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>
                  No captured payment is recorded against this booking — there is nothing for the
                  gateway to send back. Check the payment before trying.
                </span>
              </p>
            )}

            {dialog.mode === 'refund' ? (
              <>
                <fieldset className="mt-4">
                  <legend className="text-sm font-medium text-surface-700">Refund amount</legend>
                  <div className="mt-2 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <input
                        id="refund-type-full"
                        type="radio"
                        name="refund-type"
                        checked={refundType === 'full'}
                        onChange={() => setRefundType('full')}
                      />
                      <label htmlFor="refund-type-full" className="text-sm text-surface-700">
                        Full refund
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        id="refund-type-partial"
                        type="radio"
                        name="refund-type"
                        checked={refundType === 'partial'}
                        onChange={() => setRefundType('partial')}
                      />
                      <label htmlFor="refund-type-partial" className="text-sm text-surface-700">
                        Partial refund
                      </label>
                    </div>
                  </div>
                </fieldset>

                {/*
                  The ledger consequence, stated BEFORE the operator commits.
                  refund.service reverses the commission ledger for a full refund
                  only — a partial one leaves the provider's earning standing,
                  which means the platform, not the provider, funds the money
                  going back. Saying nothing here is how an operator refunds half
                  a booking believing the provider's share came back with it.
                */}
                {refundType === 'full' ? (
                  <p className="mt-3 rounded-lg border border-[var(--color-border)] bg-surface-50 px-3 py-2 text-xs text-surface-600">
                    A full refund reverses the commission ledger for this booking — the provider’s
                    earning and any temple share are reversed with it. Anything already paid out is
                    left alone and has to be recovered by hand.
                  </p>
                ) : (
                  <p className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>
                      A partial refund does <strong>not</strong> reverse the commission ledger. The
                      provider keeps their full earning on this booking, so this money comes out of
                      platform margin. Only a full refund unwinds the provider’s share.
                    </span>
                  </p>
                )}

                {refundType === 'partial' && (
                  <>
                    <label
                      htmlFor="refund-amount"
                      className="block text-sm font-medium text-surface-700 mt-4"
                    >
                      Amount to refund (Rs.)
                    </label>
                    <input
                      id="refund-amount"
                      type="text"
                      inputMode="decimal"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder={String(cap)}
                      className="mt-1 w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm text-surface-800 bg-transparent"
                    />
                    <p className="mt-1 text-xs text-surface-400">
                      Cannot exceed the {formatInrExact(cap)} the gateway is holding.
                    </p>
                  </>
                )}

                <label
                  htmlFor="refund-reason"
                  className="block text-sm font-medium text-surface-700 mt-4"
                >
                  Reason for the refund
                </label>
                <textarea
                  id="refund-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="e.g. Priest unavailable on the scheduled date"
                  className="mt-1 w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm text-surface-800 bg-transparent"
                />
              </>
            ) : (
              <>
                <label
                  htmlFor="reject-reason"
                  className="block text-sm font-medium text-surface-700 mt-4"
                >
                  Reason for declining
                </label>
                <textarea
                  id="reject-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="e.g. Puja was performed, video proof on file"
                  className="mt-1 w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm text-surface-800 bg-transparent"
                />
              </>
            )}

            {submitting && (
              <p className="mt-3 text-sm text-surface-500">Processing — do not close this window.</p>
            )}
            {actionError && (
              <div
                role="alert"
                className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              >
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeDialog}
                disabled={submitting}
                className="px-3 py-1.5 text-sm rounded-md border border-[var(--color-border)] text-surface-600 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={dialog.mode === 'refund' ? confirmRefund : confirmReject}
                disabled={submitting}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-white text-sm font-medium rounded-md disabled:opacity-60 transition-colors ${
                  dialog.mode === 'refund'
                    ? 'bg-saffron-600 hover:bg-saffron-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {dialog.mode === 'refund' ? 'Confirm refund' : 'Confirm rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
