'use client';

/**
 * /admin/store-refunds - refunds the customer asked for by cancelling a paid
 * store order. Approve sends the captured amount back through the gateway;
 * reject records a reason the customer sees. Both ask first.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, RotateCcw } from 'lucide-react';
import { useAuth } from '../../../lib/auth-context';
import { userFacingMessage } from '../../../lib/friendly-error';
import { H1 } from '../../../components/ui/heading-recipe';
import {
  approveStoreRefund,
  listPendingStoreRefunds,
  refundableAmount,
  rejectStoreRefund,
  validateRejectReason,
  type PendingStoreRefund,
} from '../../../lib/admin-store-refunds';

const inr = (n: number) => `Rs ${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function day(iso?: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function AdminStoreRefundsPage() {
  const { session } = useAuth();
  const token = session?.accessToken;
  const [rows, setRows] = useState<PendingStoreRefund[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ mode: 'approve' | 'reject'; order: PendingStoreRefund } | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const inFlight = useRef(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setLoadError(null);
    try {
      setRows(await listPendingStoreRefunds(token));
    } catch (err) {
      setRows([]);
      setLoadError(userFacingMessage(err, 'Could not load the refund queue.'));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  function open(mode: 'approve' | 'reject', order: PendingStoreRefund) {
    setDialog({ mode, order });
    setReason('');
    setActionError(null);
  }

  async function submit() {
    if (!dialog || inFlight.current) return;
    const { mode, order } = dialog;
    if (mode === 'reject') {
      const bad = validateRejectReason(reason);
      if (bad) {
        setActionError(bad);
        return;
      }
    }
    inFlight.current = true;
    setBusy(true);
    setActionError(null);
    try {
      if (mode === 'approve') {
        const r = await approveStoreRefund(token, order.id, reason);
        setNotice(
          r.skipped
            ? `Order ${order.orderNumber} was already refunded; nothing more was sent.`
            : `Refund of ${inr(r.amountInr ?? refundableAmount(order))} sent for order ${order.orderNumber}.`,
        );
      } else {
        await rejectStoreRefund(token, order.id, reason);
        setNotice(`Refund declined for order ${order.orderNumber}. The customer can see your reason.`);
      }
      setDialog(null);
      await load();
    } catch (err) {
      setActionError(userFacingMessage(err, 'Something went wrong. Please try again.'));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className={H1.portal}>Store refunds</h1>
        <p className="text-sm text-surface-500 mt-0.5">
          Cancelled store orders that were paid online and are waiting for your decision.
        </p>
      </div>

      {notice && (
        <div role="status" data-testid="store-refund-notice" className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]">
        <div className="px-5 py-4 border-b border-[var(--color-border)]">
          <h2 className="text-sm font-semibold text-surface-800 flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-saffron-600" />
            Awaiting a decision ({rows.length})
          </h2>
        </div>

        {loadError && (
          <div role="alert" className="mx-5 mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span className="flex-1">The queue could not be loaded: {loadError}</span>
            <button type="button" onClick={() => void load()} className="font-medium underline">Retry</button>
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center">
            <Loader2 className="w-5 h-5 text-surface-400 mx-auto mb-2 animate-spin" />
            <p className="text-sm text-surface-500">Loading the refund queue...</p>
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-surface-400 py-12 text-center" data-testid="store-refund-empty">
            {loadError ? 'The queue could not be loaded.' : 'No store refunds waiting.'}
          </p>
        ) : (
          <ul className="divide-y divide-[var(--color-border)]">
            {rows.map((o) => (
              <li key={o.id} data-testid={`store-refund-row-${o.orderNumber}`} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-surface-800">{o.orderNumber}</p>
                  <p className="text-xs text-surface-500">
                    {o.customerName} - cancelled {day(o.updatedAt)}
                  </p>
                  <p className="text-xs text-surface-400 truncate">
                    {o.items.map((i) => `${i.name} x${i.quantity}`).join(', ')}
                  </p>
                </div>
                <p className="font-semibold text-surface-800 sm:text-right">{inr(refundableAmount(o))}</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    data-testid={`store-refund-approve-${o.orderNumber}`}
                    onClick={() => open('approve', o)}
                    className="h-9 px-3 rounded-lg bg-emerald-700 text-white text-sm font-medium hover:bg-emerald-800"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    data-testid={`store-refund-reject-${o.orderNumber}`}
                    onClick={() => open('reject', o)}
                    className="h-9 px-3 rounded-lg border border-surface-300 text-surface-700 text-sm font-medium hover:bg-surface-100"
                  >
                    Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {dialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true" data-testid="store-refund-dialog">
          <div className="bg-white rounded-xl border border-surface-100 w-full max-w-md p-5 shadow-xl">
            <h3 className="font-semibold text-surface-800">
              {dialog.mode === 'approve' ? 'Approve this refund?' : 'Reject this refund?'}
            </h3>
            <p className="text-sm text-surface-600 mt-2">
              {dialog.mode === 'approve'
                ? `${inr(refundableAmount(dialog.order))} will be sent back to ${dialog.order.customerName} through the payment gateway for order ${dialog.order.orderNumber}. This cannot be undone.`
                : `No money will be sent for order ${dialog.order.orderNumber}. The customer sees the reason you give.`}
            </p>
            <label className="block text-xs font-medium text-surface-500 mt-3" htmlFor="store-refund-reason">
              {dialog.mode === 'approve' ? 'Note (optional)' : 'Reason (required)'}
            </label>
            <textarea
              id="store-refund-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={dialog.mode === 'reject' ? 300 : 250}
              className="w-full mt-1 px-3 py-2 bg-white border border-surface-200 rounded-lg text-sm"
              data-testid="store-refund-reason"
            />
            {actionError && (
              <p role="alert" data-testid="store-refund-error" className="mt-2 text-sm text-red-700">{actionError}</p>
            )}
            <div className="flex justify-end gap-2 mt-4">
              <button type="button" disabled={busy} onClick={() => setDialog(null)} className="px-4 py-2 rounded-lg text-sm font-medium text-surface-600 hover:bg-surface-50">
                Back
              </button>
              <button
                type="button"
                disabled={busy}
                data-testid="store-refund-confirm"
                onClick={() => void submit()}
                className={`px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60 ${dialog.mode === 'approve' ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-red-600 hover:bg-red-700'}`}
              >
                {busy ? 'Working...' : dialog.mode === 'approve' ? 'Yes, send refund' : 'Yes, reject refund'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
