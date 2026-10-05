'use client';

/**
 * /admin/payouts — the provider settlement queue.
 *
 * AO-03 (prod sweep 2026-08-12, P0): this route returned HTTP 404 while the
 * whole payout rail sat live and unreachable on the API. Rs 13,100 was owed
 * across three providers, `POST …/payout-requests/:id/process` was answering
 * 200, and there was no screen — so every settlement had to be run by hand
 * with curl, which for a solo founder means providers do not get paid on
 * schedule, which is the fastest way to lose supply.
 *
 * TWO LISTS, ON PURPOSE. They answer different questions and only one of them
 * is actionable:
 *
 *   Settlement queue  — PayoutRequest rows. A provider has ASKED for this
 *                       money. `processPayout` takes a PayoutRequest id and
 *                       404s on anything else, so this is the only list that
 *                       can carry a control.
 *   Accrual summary   — GET /admin/bookings/payouts/pending. What each
 *                       provider has EARNED and not yet requested. Read-only:
 *                       there is no endpoint that can pay one of these, and a
 *                       button here could only lie.
 *
 * NOTHING HERE CLAIMS SUCCESS FROM A 200. /admin/users shipped a Block control
 * that rendered "User updated" over a write that never happened; the same
 * defect on this screen records a provider as paid who never sees a rupee.
 * Both actions check the status the server itself reports AND refetch the
 * queue to confirm the row actually left it.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, Send, Wallet } from 'lucide-react';
import { useAuth } from '../../../lib/auth-context';
import {
  listPayoutRequests,
  processPayoutRequest,
  getPayoutAccrual,
  type AdminPayoutRequest,
  type PayoutAccrual,
  type PayoutRequestStatus,
} from '../revenue/payout-api';
import { H1 } from '../../../components/ui/heading-recipe';
import { userFacingMessage, UserFacingError } from '../../../lib/friendly-error';

const roleBadgeColors: Record<string, string> = {
  PANDIT: 'bg-saffron-50 text-saffron-700',
  PRIEST: 'bg-saffron-50 text-saffron-700',
  STORE_OWNER: 'bg-green-50 text-green-700',
  ASTROLOGER: 'bg-purple-50 text-purple-700',
  WELLNESS_INSTRUCTOR: 'bg-teal-50 text-teal-700',
  GAUSHALA_MANAGER: 'bg-amber-50 text-amber-700',
  TEMPLE_MANAGER: 'bg-red-50 text-red-700',
};

const roleLabels: Record<string, string> = {
  PANDIT: 'Pandit',
  PRIEST: 'Pandit',
  STORE_OWNER: 'Store',
  ASTROLOGER: 'Astrologer',
  WELLNESS_INSTRUCTOR: 'Wellness',
  GAUSHALA_MANAGER: 'Gaushala',
  TEMPLE_MANAGER: 'Temple Mgr',
};

const statusBadgeColors: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700',
  processing: 'bg-blue-50 text-blue-700',
  completed: 'bg-green-50 text-green-700',
  rejected: 'bg-surface-100 text-surface-600',
  failed: 'bg-red-50 text-red-700',
};

const FILTERS: Array<{ key: PayoutRequestStatus | ''; label: string }> = [
  { key: 'pending', label: 'Pending' },
  { key: 'processing', label: 'Processing' },
  { key: 'completed', label: 'Completed' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'failed', label: 'Failed' },
  { key: '', label: 'All' },
];

/** A request in one of these states still owns its commissions and is actionable. */
const OPEN_STATUSES = ['pending', 'processing'];

/**
 * Exact rupees, always. Compact formatting ("Rs. 3.2L") is fine for a headline
 * tile and wrong everywhere on this page — nobody should approve a bank
 * transfer against a rounded figure.
 */
function formatInrExact(amount: string | number): string {
  const n = typeof amount === 'number' ? amount : Number(amount);
  if (!Number.isFinite(n)) return String(amount);
  return `Rs. ${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

type DialogMode = 'pay' | 'reject';

export default function AdminPayoutsPage() {
  const { session } = useAuth();
  const token = session?.accessToken;

  const [filter, setFilter] = useState<PayoutRequestStatus | ''>('pending');
  const [requests, setRequests] = useState<AdminPayoutRequest[]>([]);
  const [accrual, setAccrual] = useState<PayoutAccrual | null>(null);
  const [loading, setLoading] = useState(true);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [accrualError, setAccrualError] = useState<string | null>(null);

  const [dialog, setDialog] = useState<{ mode: DialogMode; target: AdminPayoutRequest } | null>(null);
  const [reference, setReference] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // React state is stale inside the handler's closure, so the in-flight latch
  // that stops a double-clicked transfer firing twice has to be a ref.
  const inFlight = useRef(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setQueueError(null);
      try {
        const queue = await listPayoutRequests(token, filter);
        if (!cancelled) setRequests(queue);
      } catch (err) {
        if (!cancelled) {
          setRequests([]);
          setQueueError(userFacingMessage(err, 'Could not load the payout queue.'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, filter]);

  // Accrual is a separate, non-blocking fetch: a failure here must not blank
  // the settlement queue, and an empty accrual must not read as "nothing owed".
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      setAccrualError(null);
      try {
        const a = await getPayoutAccrual(token);
        if (!cancelled) setAccrual(a);
      } catch (err) {
        if (!cancelled) {
          setAccrual(null);
          setAccrualError(userFacingMessage(err, 'Could not load provider balances.'));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const openDialog = useCallback((mode: DialogMode, target: AdminPayoutRequest) => {
    setDialog({ mode, target });
    setReference('');
    setReason('');
    setActionError(null);
    setSuccessMessage(null);
  }, []);

  const closeDialog = useCallback(() => {
    if (inFlight.current) return;
    setDialog(null);
    setReference('');
    setReason('');
    setActionError(null);
  }, []);

  /**
   * Prove the decision persisted instead of assuming it did.
   *
   * Returns the refreshed list, or null when the refetch itself failed (in
   * which case the server's own status is the only evidence we have and the
   * caller says so out loud). Throws when the row is demonstrably unchanged.
   */
  const verifyLeftQueue = useCallback(
    async (id: string): Promise<AdminPayoutRequest[] | null> => {
      let refreshed: AdminPayoutRequest[];
      try {
        refreshed = await listPayoutRequests(token, filter);
      } catch {
        return null;
      }
      setRequests(refreshed);
      const still = refreshed.find((r) => r.id === id);
      if (still && OPEN_STATUSES.includes(still.status)) {
        throw new UserFacingError(
          `The server accepted the decision, but this request is still pending in the queue. ` +
            'Do not act on it again — reconcile the ledger first.',
        );
      }
      return refreshed;
    },
    [token, filter],
  );

  const confirmAction = useCallback(async () => {
    if (!dialog || inFlight.current) return;
    const { mode, target } = dialog;

    const ref = reference.trim();
    const why = reason.trim();
    if (mode === 'pay' && !ref) {
      setActionError(
        'Enter the transfer reference (UTR / UPI ref) — a settled payout with no reference cannot be reconciled against a bank statement later.',
      );
      return;
    }
    if (mode === 'reject' && why.length < 3) {
      setActionError(
        'Enter why this payout is being rejected. The reason is stored on the request and is the only thing the provider can be told.',
      );
      return;
    }

    inFlight.current = true;
    setSubmitting(true);
    setActionError(null);
    setSuccessMessage(null);
    try {
      const expected = mode === 'pay' ? 'completed' : 'rejected';
      const result = await processPayoutRequest(
        token,
        target.id,
        mode === 'pay' ? 'complete' : 'reject',
        mode === 'pay' ? { reference: ref } : { failureReason: why },
      );
      if (result.status !== expected) {
        throw new UserFacingError(
          `The request was left in "${result.status}" status, so nothing was ${
            mode === 'pay' ? 'marked paid' : 'released'
          }. Check the queue before acting again.`,
        );
      }

      const refreshed = await verifyLeftQueue(target.id);
      const caveat = refreshed ? '' : ' The queue could not be refreshed — reload to confirm.';

      setSuccessMessage(
        mode === 'pay'
          ? `${formatInrExact(target.amount)} to ${target.providerName} marked as paid (ref ${ref}).${caveat}`
          : `Payout request for ${target.providerName} rejected. ${formatInrExact(
              target.amount,
            )} is back in their withdrawable balance.${caveat}`,
      );
      setDialog(null);
      setReference('');
      setReason('');
    } catch (err) {
      setActionError(userFacingMessage(err, 'Could not process this payout request.'));
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }, [dialog, reference, reason, token, verifyLeftQueue]);

  const target = dialog?.target ?? null;
  const mismatch =
    target !== null &&
    target.linkedCommissionCount > 0 &&
    Number(target.linkedCommissionTotal) !== Number(target.amount);

  const queueTotal = requests
    .filter((r) => OPEN_STATUSES.includes(r.status))
    .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className={H1.portal}>Payouts</h1>
        <p className="text-sm text-surface-500 mt-0.5">
          Settle provider payout requests and review what each provider has earned.
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

      {/* ─── settlement queue ─────────────────────────────────────────────── */}
      <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-[var(--color-border)]">
          <div>
            <h2 className="text-sm font-semibold text-surface-800 flex items-center gap-2">
              <Send className="w-4 h-4 text-saffron-600" />
              Settlement queue
            </h2>
            <p className="text-xs text-surface-400 mt-0.5">
              Payout requests providers have raised. Completing one marks its linked commissions paid.
            </p>
          </div>
          {queueTotal > 0 && (
            <span className="text-xs font-medium text-saffron-600">
              {formatInrExact(queueTotal)} awaiting settlement
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5 px-5 py-3 border-b border-[var(--color-border)]">
          {FILTERS.map((f) => (
            <button
              key={f.key || 'all'}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                filter === f.key
                  ? 'bg-saffron-50 text-saffron-700 border border-saffron-200'
                  : 'text-surface-500 border border-transparent hover:bg-surface-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {queueError && (
          <div className="mx-5 mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              Payout queue unavailable — {queueError}. This is not a settled state; retry before payout day.
            </span>
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center">
            <Loader2 className="w-5 h-5 text-surface-400 mx-auto mb-2 animate-spin" />
            <p className="text-sm text-surface-500">Loading the payout queue…</p>
          </div>
        ) : requests.length === 0 ? (
          <p className="text-sm text-surface-400 py-12 text-center">
            No payout requests in this view.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="text-left py-2.5 px-5 text-xs font-medium text-surface-500 uppercase tracking-wide">Provider</th>
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-surface-500 uppercase tracking-wide">Requested</th>
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-surface-500 uppercase tracking-wide">Method</th>
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-surface-500 uppercase tracking-wide">Status</th>
                  <th className="text-right py-2.5 px-4 text-xs font-medium text-surface-500 uppercase tracking-wide">Amount</th>
                  <th className="text-right py-2.5 px-5 text-xs font-medium text-surface-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r, i) => {
                  const actionable = OPEN_STATUSES.includes(r.status);
                  return (
                    <tr
                      key={r.id}
                      className={`border-b border-[var(--color-border)] last:border-0 ${i % 2 === 1 ? 'bg-surface-50/30' : ''}`}
                    >
                      <td className="py-2.5 px-5">
                        <p className="font-medium text-surface-800 truncate max-w-[220px]">{r.providerName}</p>
                        <p className="text-xs text-surface-400 flex items-center gap-1 mt-0.5">
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded-full ${
                              roleBadgeColors[r.role] ?? 'bg-surface-100 text-surface-600'
                            }`}
                          >
                            {roleLabels[r.role] ?? r.role}
                          </span>
                          <span>
                            {r.linkedCommissionCount} commission{r.linkedCommissionCount === 1 ? '' : 's'} ·{' '}
                            {formatInrExact(r.linkedCommissionTotal)}
                          </span>
                        </p>
                        {r.providerEmail && (
                          <p className="prose-meta text-surface-400 truncate max-w-[220px]">{r.providerEmail}</p>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-surface-500">{formatDay(r.requestedAt)}</td>
                      <td className="py-2.5 px-4 text-surface-500 uppercase text-xs">{r.method}</td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            statusBadgeColors[r.status] ?? 'bg-surface-100 text-surface-600'
                          }`}
                        >
                          {r.status}
                        </span>
                        {r.reference && (
                          <p className="prose-meta text-surface-400 mt-0.5 truncate max-w-[160px]">ref {r.reference}</p>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-right font-semibold text-surface-800">
                        {formatInrExact(r.amount)}
                      </td>
                      <td className="py-2.5 px-5 text-right whitespace-nowrap">
                        {actionable ? (
                          <span className="inline-flex gap-2">
                            <button
                              type="button"
                              onClick={() => openDialog('pay', r)}
                              className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-md hover:bg-green-700 transition-colors"
                            >
                              Pay Now
                            </button>
                            <button
                              type="button"
                              onClick={() => openDialog('reject', r)}
                              className="px-3 py-1.5 border border-[var(--color-border)] text-surface-600 text-xs font-medium rounded-md hover:bg-surface-50 transition-colors"
                            >
                              Reject
                            </button>
                          </span>
                        ) : (
                          <span className="text-xs text-surface-400">
                            {r.processedAt ? `Processed ${formatDay(r.processedAt)}` : 'No action available'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── accrual (read-only) ──────────────────────────────────────────── */}
      <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]">
        <div className="px-5 py-4 border-b border-[var(--color-border)]">
          <h2 className="text-sm font-semibold text-surface-800 flex items-center gap-2">
            <Wallet className="w-4 h-4 text-saffron-600" />
            Earned, not yet requested
          </h2>
          <p className="text-xs text-surface-400 mt-0.5">
            Provider balances from the ledger, excluding anything already claimed by an open request
            above. There is no endpoint that settles one of these — a provider has to raise a payout
            request first.
          </p>
        </div>

        {accrualError && (
          <div className="mx-5 mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>Provider balances unavailable — {accrualError}</span>
          </div>
        )}

        {!accrual || accrual.groups.length === 0 ? (
          <p className="text-sm text-surface-400 py-10 text-center">
            {accrualError ? 'Balances could not be loaded.' : 'No unrequested provider balance.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="text-left py-2.5 px-5 text-xs font-medium text-surface-500 uppercase tracking-wide">Provider</th>
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-surface-500 uppercase tracking-wide">Role</th>
                  <th className="text-center py-2.5 px-4 text-xs font-medium text-surface-500 uppercase tracking-wide">Items</th>
                  <th className="text-right py-2.5 px-4 text-xs font-medium text-surface-500 uppercase tracking-wide">Balance</th>
                  <th className="text-right py-2.5 px-5 text-xs font-medium text-surface-500 uppercase tracking-wide">Action</th>
                </tr>
              </thead>
              <tbody>
                {accrual.groups.map((g, i) => (
                  <tr
                    key={`${g.providerId}-${g.role}`}
                    className={`border-b border-[var(--color-border)] last:border-0 ${i % 2 === 1 ? 'bg-surface-50/30' : ''}`}
                  >
                    <td className="py-2.5 px-5 font-medium text-surface-800 truncate max-w-[240px]">
                      {g.providerName}
                    </td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          roleBadgeColors[g.role] ?? 'bg-surface-100 text-surface-600'
                        }`}
                      >
                        {roleLabels[g.role] ?? g.role}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-center text-surface-600">{g.bookingsCount}</td>
                    <td className="py-2.5 px-4 text-right font-semibold text-surface-800">
                      {formatInrExact(g.totalPayout)}
                    </td>
                    <td className="py-2.5 px-5 text-right text-xs text-surface-400">Not settleable here</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {accrual?.truncated && (
          <p className="px-5 py-3 text-xs text-amber-700 bg-amber-50 border-t border-[var(--color-border)]">
            Only the most recent {accrual.scanLimit} records were scanned — this total is a floor,
            not the full balance.
          </p>
        )}
      </div>

      {/* ─── confirmation ─────────────────────────────────────────────────── */}
      {dialog && target && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="payout-dialog-title"
            className="w-full max-w-md rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-5 shadow-xl"
          >
            <h2 id="payout-dialog-title" className="text-base font-semibold text-surface-800">
              {dialog.mode === 'pay' ? 'Confirm payout' : 'Reject payout request'}
            </h2>
            <p className="text-sm text-surface-500 mt-1">
              {dialog.mode === 'pay'
                ? 'Record a transfer you have already made. This marks the linked commissions paid — it does not move money by itself.'
                : 'This releases the linked commissions back to the provider’s withdrawable balance. They can request the money again.'}
            </p>

            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-surface-500">Provider</dt>
                <dd className="font-medium text-surface-800 text-right">{target.providerName}</dd>
              </div>
              {target.providerEmail && (
                <div className="flex justify-between gap-4">
                  <dt className="text-surface-500">Email</dt>
                  <dd className="text-surface-600 text-right break-all">{target.providerEmail}</dd>
                </div>
              )}
              <div className="flex justify-between gap-4">
                <dt className="text-surface-500">Amount</dt>
                <dd className="font-semibold text-surface-800">{formatInrExact(target.amount)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-surface-500">Commissions</dt>
                <dd className="text-surface-600">
                  {target.linkedCommissionCount} · {formatInrExact(target.linkedCommissionTotal)}
                </dd>
              </div>
              {dialog?.mode === 'pay' && (target.payTo ? (
                <>
                  {target.payTo.holderName && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-surface-500">Account holder</dt>
                      <dd className="text-surface-800 text-right">{target.payTo.holderName}</dd>
                    </div>
                  )}
                  <div className="flex justify-between gap-4">
                    <dt className="text-surface-500">Account number</dt>
                    <dd className="font-mono text-surface-800 text-right">{target.payTo.accountNumber}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-surface-500">IFSC</dt>
                    <dd className="font-mono text-surface-800 text-right">{target.payTo.ifsc}</dd>
                  </div>
                </>
              ) : (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  No bank details on file for this provider. Do not mark this paid until you have them.
                </div>
              ))}
            </dl>

            {/*
              processPayout refuses both of these — but it refuses AFTER the
              operator has already made the bank transfer they came here to
              record. Say it first.
            */}
            {dialog.mode === 'pay' && target.linkedCommissionCount === 0 && (
              <p className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>
                  This request owns no commissions — there is nothing to pay. Do not transfer; check
                  the provider&apos;s balance first.
                </span>
              </p>
            )}
            {dialog.mode === 'pay' && mismatch && (
              <p className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>
                  The request amount and its linked commissions disagree. Reconcile the ledger before
                  transferring — this will be rejected.
                </span>
              </p>
            )}

            {dialog.mode === 'pay' ? (
              <>
                <label htmlFor="payout-reference" className="block text-sm font-medium text-surface-700 mt-4">
                  Transfer reference (UTR / UPI ref)
                </label>
                <input
                  id="payout-reference"
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="e.g. 418923456789"
                  maxLength={200}
                  className="mt-1 w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm text-surface-800 bg-transparent"
                />
              </>
            ) : (
              <>
                <label htmlFor="payout-reason" className="block text-sm font-medium text-surface-700 mt-4">
                  Reason for rejection
                </label>
                <textarea
                  id="payout-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="e.g. Bank details bounced — asked provider to resubmit"
                  className="mt-1 w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm text-surface-800 bg-transparent"
                />
              </>
            )}

            {submitting && (
              <p className="mt-3 text-sm text-surface-500">
                Processing — do not close this window.
              </p>
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
                onClick={confirmAction}
                disabled={submitting}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-white text-sm font-medium rounded-md disabled:opacity-60 transition-colors ${
                  dialog.mode === 'pay' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {dialog.mode === 'pay' ? 'Mark as paid' : 'Confirm rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
