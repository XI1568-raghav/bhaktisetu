'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
 IndianRupee,
 ArrowUpRight,
 Wallet,
 CreditCard,
 Send,
 ChevronRight,
 Loader2,
 AlertTriangle,
 CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../../lib/auth-context';
import {
  getRevenue,
  getDashboard,
  type RevenueResponse,
  type DashboardResponse,
} from '../../../lib/admin-api';
import {
  listPayoutRequests,
  completePayoutRequest,
  getPayoutAccrual,
  type AdminPayoutRequest,
  type PayoutAccrual,
} from './payout-api';
import { listCommissions, type Commission } from '../../../lib/commission-api';

const roleBadgeColors: Record<string, string> = {
 PANDIT: 'bg-saffron-50 text-saffron-700',
 // The payout engine labels the legacy booking-backed rail PRIEST, not PANDIT.
 // Without this row the priest accrual — the largest single balance — rendered
 // unstyled and unlabelled.
 PRIEST: 'bg-saffron-50 text-saffron-700',
 STORE_OWNER: 'bg-green-50 text-green-700',
 ASTROLOGER: 'bg-purple-50 text-purple-700',
 WELLNESS_INSTRUCTOR: 'bg-teal-50 text-teal-700',
 GAUSHALA_MANAGER: 'bg-amber-50 text-amber-700',
 TEMPLE_MANAGER: 'bg-red-50 text-red-700',
 ADMIN: 'bg-surface-200 text-surface-700',
 DEVOTEE: 'bg-blue-50 text-blue-700',
};

const roleLabels: Record<string, string> = {
 PANDIT: 'Pandit',
 PRIEST: 'Pandit',
 STORE_OWNER: 'Store',
 ASTROLOGER: 'Astrologer',
 WELLNESS_INSTRUCTOR: 'Wellness',
 GAUSHALA_MANAGER: 'Gaushala',
 TEMPLE_MANAGER: 'Temple Mgr',
 ADMIN: 'Admin',
 DEVOTEE: 'Devotee',
};

// Format paise/rupee scalar to a compact INR display: "Rs. 1.24Cr",
// "Rs. 8.6L", "Rs. 24,500". Caller passes whole rupees.
function formatInrCompact(amount: number): string {
  if (amount >= 1_00_00_000) return `Rs. ${(amount / 1_00_00_000).toFixed(2)}Cr`;
  if (amount >= 1_00_000) return `Rs. ${(amount / 1_00_000).toFixed(1)}L`;
  return `Rs. ${amount.toLocaleString('en-IN')}`;
}

/**
 * Exact rupees for anything an operator is about to transfer. `formatInrCompact`
 * collapses 3,20,000 to "Rs. 3.2L", which is fine for a headline tile and wrong
 * for a payout confirmation — nobody should approve a bank transfer against a
 * rounded figure.
 */
function formatInrExact(amount: string | number): string {
  const n = typeof amount === 'number' ? amount : Number(amount);
  if (!Number.isFinite(n)) return String(amount);
  return `Rs. ${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function AdminRevenuePage() {
  const { session } = useAuth();
  const token = session?.accessToken;

  const [revenue, setRevenue] = useState<RevenueResponse | null>(null);
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ─── payout queue (AO-02) ──────────────────────────────────────────────────
  // The settleable rail. Kept separate from `revenue.commissions`: a PENDING
  // commission is money OWED, a PayoutRequest is money a provider has ASKED for
  // and the only thing POST …/payout-requests/:id/process can act on.
  const [payoutRequests, setPayoutRequests] = useState<AdminPayoutRequest[]>([]);
  const [queueError, setQueueError] = useState<string | null>(null);

  // ─── what we actually owe (AO-11) ──────────────────────────────────────────
  // GET /admin/bookings/payouts/pending is the ONLY source that reconciles both
  // rails — the legacy PriestPayout sidecar and the Commission ledger — and it
  // excludes balance an open payout request has already claimed.
  // `revenue.pendingPayouts` sums PENDING commissions alone, so it was blind to
  // 12 completed pujas worth Rs 9,900 to a pandit and reported Rs 3,200 against
  // a real Rs 13,100.
  const [accrual, setAccrual] = useState<PayoutAccrual | null>(null);
  const [accrualError, setAccrualError] = useState<string | null>(null);

  // ─── the named ledger (AO-12) ──────────────────────────────────────────────
  // getRevenue's serializer drops providerName / bookingNumber / itemName, so
  // this screen printed 36-character uuids and blank cells next to a Pay Now
  // button. GET /admin/commissions returns the same rows already enriched.
  const [ledger, setLedger] = useState<Commission[]>([]);
  const [ledgerError, setLedgerError] = useState<string | null>(null);
  const [payTarget, setPayTarget] = useState<AdminPayoutRequest | null>(null);
  const [reference, setReference] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  // A double-clicked Pay Now must not fire two transfers. React state is stale
  // inside the handler's closure, so the in-flight latch is a ref.
  const inFlight = useRef(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setQueueError(null);
      setAccrualError(null);
      setLedgerError(null);
      try {
        const [rev, dash] = await Promise.all([getRevenue(token), getDashboard(token)]);
        if (cancelled) return;
        setRevenue(rev);
        setDashboard(dash);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load revenue');
        if (!cancelled) setLoading(false);
        return;
      }
      // Three independent, non-blocking follow-ups. A failure in any one must
      // not blank the whole revenue page — and must not read as "nothing to
      // settle" either, which is how an empty list on a broken query gets a
      // provider missed on payout day.
      const [queueResult, accrualResult, ledgerResult] = await Promise.allSettled([
        listPayoutRequests(token, 'pending'),
        getPayoutAccrual(token),
        listCommissions(token, { status: 'PENDING', pageSize: 200 }),
      ]);
      if (cancelled) return;

      if (queueResult.status === 'fulfilled') {
        setPayoutRequests(queueResult.value);
      } else {
        setPayoutRequests([]);
        setQueueError(
          queueResult.reason instanceof Error
            ? queueResult.reason.message
            : 'Could not load the payout queue.',
        );
      }

      if (accrualResult.status === 'fulfilled') {
        setAccrual(accrualResult.value);
      } else {
        setAccrual(null);
        setAccrualError(
          accrualResult.reason instanceof Error
            ? accrualResult.reason.message
            : 'Could not load provider balances.',
        );
      }

      if (ledgerResult.status === 'fulfilled') {
        setLedger(ledgerResult.value.items);
      } else {
        setLedger([]);
        setLedgerError(
          ledgerResult.reason instanceof Error
            ? ledgerResult.reason.message
            : 'Could not load the commission ledger.',
        );
      }

      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const openPayDialog = useCallback((req: AdminPayoutRequest) => {
    setPayTarget(req);
    setReference('');
    setActionError(null);
    setSuccessMessage(null);
  }, []);

  const closePayDialog = useCallback(() => {
    if (inFlight.current) return;
    setPayTarget(null);
    setReference('');
    setActionError(null);
  }, []);

  /**
   * Settle one payout request.
   *
   * The success path is deliberately paranoid. This screen's sibling control
   * (/admin/users Block) reported "User updated" off a 200 that wrote nothing,
   * and this one moves money: an operator who is told the transfer landed will
   * not check again. So success is claimed only when the server reports the
   * request reached `completed` AND a refetch of the pending queue no longer
   * contains it. Every other outcome is an error on screen.
   */
  const confirmPayout = useCallback(async () => {
    if (!payTarget || inFlight.current) return;
    const ref = reference.trim();
    if (!ref) {
      setActionError(
        'Enter the transfer reference (UTR / UPI ref) — a settled payout with no reference cannot be reconciled later.',
      );
      return;
    }

    inFlight.current = true;
    setSubmitting(true);
    setActionError(null);
    setSuccessMessage(null);
    try {
      const result = await completePayoutRequest(token, payTarget.id, ref);
      if (result.status !== 'completed') {
        throw new Error(
          `The payout was left in "${result.status}" status, so nothing has been marked paid. ` +
            'Check the payout queue before transferring again.',
        );
      }

      // Prove it persisted rather than assuming it did.
      let refreshed: AdminPayoutRequest[] | null = null;
      try {
        refreshed = await listPayoutRequests(token, 'pending');
      } catch {
        refreshed = null; // refetch failed; the completion above still stands
      }
      if (refreshed) {
        setPayoutRequests(refreshed);
        if (refreshed.some((r) => r.id === payTarget.id)) {
          throw new Error(
            'The server reported this payout complete, but it is still pending in the queue. ' +
              'Do not transfer again — reconcile the ledger first.',
          );
        }
      }

      setSuccessMessage(
        `${formatInrExact(payTarget.amount)} to ${payTarget.providerName} marked as paid (ref ${ref}).` +
          (refreshed ? '' : ' The queue could not be refreshed — reload to confirm.'),
      );
      setPayTarget(null);
      setReference('');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not process this payout.');
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }, [payTarget, reference, token]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-lg font-semibold text-surface-800">Revenue</h1>
          <p className="text-sm text-surface-500 mt-0.5">Platform revenue, commissions, and payout management</p>
        </div>
        <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-12 text-center">
          <Loader2 className="w-6 h-6 text-surface-400 mx-auto mb-3 animate-spin" />
          <p className="text-sm text-surface-500">Loading revenue data…</p>
        </div>
      </div>
    );
  }

  if (error || !revenue || !dashboard) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-lg font-semibold text-surface-800">Revenue</h1>
          <p className="text-sm text-surface-500 mt-0.5">Platform revenue, commissions, and payout management</p>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error ?? 'Could not load revenue data.'}
        </div>
      </div>
    );
  }

  const totalRevenue = dashboard.totalRevenue;
  const totalCommissions = revenue.totalCommissions;
  const totalSubscriptions = revenue.totalSubscriptions;

  // AO-11. Two halves of one liability:
  //   accrual  — earned, no payout request raised yet (both rails, deduped)
  //   queue    — already claimed by an OPEN request, so excluded from accrual
  // Sum them and the figure matches the payout engine. When the accrual call
  // fails the liability is UNKNOWN and is shown as such: falling back to
  // revenue.pendingPayouts would print a confident Rs 3,200 against a real
  // Rs 13,100, which is the defect itself dressed up as a fallback.
  const openQueueTotal = payoutRequests.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const accrualTotal = accrual
    ? accrual.groups.reduce((sum, g) => sum + (Number(g.totalPayout) || 0), 0)
    : null;
  const pendingPayouts = accrualTotal === null ? null : accrualTotal + openQueueTotal;
  const pendingPayoutsDisplay = pendingPayouts === null ? '—' : formatInrCompact(pendingPayouts);

  const overviewCards = [
    { label: 'Total Revenue', value: formatInrCompact(totalRevenue), icon: IndianRupee, color: 'bg-green-50 text-green-600' },
    { label: 'Commissions Earned', value: formatInrCompact(totalCommissions), icon: Wallet, color: 'bg-saffron-50 text-saffron-600' },
    { label: 'Subscriptions', value: formatInrCompact(totalSubscriptions), icon: CreditCard, color: 'bg-blue-50 text-blue-600' },
    { label: 'Pending Payouts', value: pendingPayoutsDisplay, icon: Send, color: 'bg-amber-50 text-amber-600' },
  ];

  // Subscription revenue by role.
  const totalSubAmount = revenue.subscriptionRevenue.reduce((sum, s) => sum + s.totalAmount, 0);
  const subBreakdown = revenue.subscriptionRevenue.map((s, i) => ({
    source: `${s.plan} · ${roleLabels[s.role] ?? s.role}`,
    amount: s.totalAmount,
    pct: totalSubAmount > 0 ? Math.round((s.totalAmount / totalSubAmount) * 1000) / 10 : 0,
    color: ['bg-saffron-600', 'bg-green-500', 'bg-purple-500', 'bg-teal-500', 'bg-amber-500', 'bg-red-500', 'bg-blue-500'][i % 7] ?? 'bg-saffron-600',
  }));

  // AO-12: the ledger rows, already carrying providerName / providerRole /
  // bookingNumber / itemName. `revenue.commissions` carries none of those — it
  // is why this table used to print a bare uuid or an empty cell.
  const commissionRows = ledger.slice(0, 12);

  // AO-11/AO-12: provider balances straight from the payout engine. Named,
  // covering the priest rail, and deduped against open requests — replacing a
  // re-derivation from the 50 most recent commissions that silently under-listed
  // past row 50 and had no provider name to show.
  const owedByProvider = accrual?.groups ?? [];

 return (
 <div className="space-y-6">
 {/* Header */}
 <div>
 <h1 className="text-lg font-semibold text-surface-800">Revenue</h1>
 <p className="text-sm text-surface-500 mt-0.5">Platform revenue, commissions, and payout management</p>
 </div>

 {/* Overview cards */}
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
 {overviewCards.map((card) => {
 const Icon = card.icon;
 return (
 <div key={card.label} className="bg-[var(--color-surface)] rounded-xl p-5 border border-[var(--color-border)]">
 <div className="flex items-start justify-between">
 <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.color}`}>
 <Icon className="w-5 h-5" />
 </div>
 <span className="inline-flex items-center gap-0.5 text-xs font-medium text-green-600">
 <ArrowUpRight className="w-3 h-3" />
 Live
 </span>
 </div>
 <p className="text-2xl font-bold text-surface-800 mt-3">{card.value}</p>
 <p className="text-sm text-surface-500 mt-0.5">{card.label}</p>
 </div>
 );
 })}
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 {/* Subscription revenue by plan/role */}
 <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-5">
 <h2 className="text-sm font-semibold text-surface-800 mb-4">Subscription Revenue by Plan</h2>
 {subBreakdown.length === 0 ? (
   <p className="text-sm text-surface-400 py-6 text-center">No subscription revenue yet.</p>
 ) : (
 <div className="space-y-3">
 {subBreakdown.map((item) => (
 <div key={item.source}>
 <div className="flex items-center justify-between text-sm mb-1">
 <span className="text-surface-600">{item.source}</span>
 <span className="text-surface-800 font-medium">
 {formatInrCompact(item.amount)} ({item.pct}%)
 </span>
 </div>
 <div className="w-full h-2.5 bg-surface-100 rounded-full overflow-hidden">
 <div
 className={`h-full rounded-full ${item.color}`}
 style={{ width: `${item.pct}%` }}
 />
 </div>
 </div>
 ))}
 </div>
 )}
 </div>

 {/* Recent transactions (from dashboard) */}
 <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-5">
 <h2 className="text-sm font-semibold text-surface-800 mb-4">Recent Transactions</h2>
 {dashboard.recentTransactions.length === 0 ? (
   <p className="text-sm text-surface-400 py-6 text-center">No recent transactions.</p>
 ) : (
   <div className="space-y-2">
     {dashboard.recentTransactions.slice(0, 8).map((t) => (
       <div key={t.id} className="flex items-center justify-between text-sm border-b border-[var(--color-border)] last:border-0 py-2">
         <div className="min-w-0">
           <p className="font-medium text-surface-800 truncate">{t.type}</p>
           <p className="text-xs text-surface-400">
             {new Date(t.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
           </p>
         </div>
         <div className="text-right">
           <p className="font-semibold text-surface-800">{formatInrCompact(t.amount)}</p>
           <p className="text-xs text-surface-400 capitalize">{t.status.toLowerCase()}</p>
         </div>
       </div>
     ))}
   </div>
 )}
 </div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 {/* Commissions list */}
 <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]">
 <div className="px-5 py-4 border-b border-[var(--color-border)]">
 <h2 className="text-sm font-semibold text-surface-800">Pending Commissions</h2>
 </div>
 {ledgerError && (
   <div className="mx-5 mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
     <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
     <span>Commission ledger unavailable — {ledgerError}. This is not an empty ledger.</span>
   </div>
 )}
 {commissionRows.length === 0 ? (
   <p className="text-sm text-surface-400 py-12 text-center">
     {ledgerError ? 'The ledger could not be loaded.' : 'No pending commissions.'}
   </p>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead>
 <tr className="border-b border-[var(--color-border)]">
 <th className="text-left py-2.5 px-5 text-xs font-medium text-surface-500 uppercase tracking-wide">Provider</th>
 <th className="text-left py-2.5 px-4 text-xs font-medium text-surface-500 uppercase tracking-wide">Item</th>
 <th className="text-left py-2.5 px-4 text-xs font-medium text-surface-500 uppercase tracking-wide">Status</th>
 <th className="text-right py-2.5 px-5 text-xs font-medium text-surface-500 uppercase tracking-wide">Provider earns</th>
 </tr>
 </thead>
 <tbody>
 {commissionRows.map((c, i) => (
 <tr key={c.id} className={`border-b border-[var(--color-border)] last:border-0 ${i % 2 === 1 ? 'bg-surface-50/30' : ''}`}>
 <td className="py-2.5 px-5">
 <p className="font-medium text-surface-800 truncate max-w-[200px]">
   {c.providerName ?? 'Unnamed provider'}
 </p>
 <p className="text-xs text-surface-400">
 {c.providerRole ? `${roleLabels[c.providerRole] ?? c.providerRole} · ` : ''}
 {new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
 </p>
 </td>
 {/*
   Booking number OR item name, never the raw uuid this cell used to print —
   and never a blank cell for a store-order / wellness commission, which
   carries no bookingId at all.
 */}
 <td className="py-2.5 px-4">
 <p className="text-surface-700 truncate max-w-[200px]">{c.itemName ?? 'Unnamed item'}</p>
 {c.bookingNumber && (
   <p className="text-xs text-surface-400 font-mono">{c.bookingNumber}</p>
 )}
 </td>
 <td className="py-2.5 px-4">
 <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
   c.status === 'PAID' ? 'bg-green-50 text-green-700' :
   c.status === 'PENDING' ? 'bg-amber-50 text-amber-700' :
   'bg-surface-100 text-surface-600'
 }`}>{String(c.status).toLowerCase()}</span>
 </td>
 <td className="py-2.5 px-5 text-right font-medium text-surface-800">
 {formatInrExact(c.amount)}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </div>

 {/* Subscription details */}
 <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]">
 <div className="px-5 py-4 border-b border-[var(--color-border)]">
 <h2 className="text-sm font-semibold text-surface-800">Subscriptions by Role</h2>
 </div>
 {revenue.subscriptionRevenue.length === 0 ? (
   <p className="text-sm text-surface-400 py-12 text-center">No active subscriptions.</p>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead>
 <tr className="border-b border-[var(--color-border)]">
 <th className="text-left py-2.5 px-5 text-xs font-medium text-surface-500 uppercase tracking-wide">Plan</th>
 <th className="text-left py-2.5 px-4 text-xs font-medium text-surface-500 uppercase tracking-wide">Role</th>
 <th className="text-center py-2.5 px-4 text-xs font-medium text-surface-500 uppercase tracking-wide">Subs</th>
 <th className="text-right py-2.5 px-5 text-xs font-medium text-surface-500 uppercase tracking-wide">Total</th>
 </tr>
 </thead>
 <tbody>
 {revenue.subscriptionRevenue.map((s, i) => (
 <tr key={`${s.plan}-${s.role}`} className={`border-b border-[var(--color-border)] last:border-0 ${i % 2 === 1 ? 'bg-surface-50/30' : ''}`}>
 <td className="py-2.5 px-5 text-surface-800 font-medium">{s.plan}</td>
 <td className="py-2.5 px-4">
 <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${roleBadgeColors[s.role] ?? 'bg-surface-100 text-surface-600'}`}>
 {roleLabels[s.role] ?? s.role}
 </span>
 </td>
 <td className="py-2.5 px-4 text-center text-surface-600">{s.count}</td>
 <td className="py-2.5 px-5 text-right font-medium text-surface-800">{formatInrCompact(s.totalAmount)}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </div>
 </div>

 {/* Pending payouts */}
 <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]">
 <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
 <h2 className="text-sm font-semibold text-surface-800">Pending Payouts</h2>
 <span className="text-xs text-saffron-600 font-medium flex items-center gap-1">
 {pendingPayoutsDisplay} due <ChevronRight className="w-3.5 h-3.5" />
 </span>
 </div>

 {successMessage && (
   <div
     role="status"
     className="mx-5 mt-4 flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
   >
     <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
     <span>{successMessage}</span>
   </div>
 )}
 {queueError && (
   <div className="mx-5 mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
     <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
     <span>Payout queue unavailable — {queueError}. This list is not a settled state; retry before payout day.</span>
   </div>
 )}

 {/* Settleable: providers who have requested a payout. */}
 <div className="px-5 pt-4">
   <h3 className="text-xs font-semibold uppercase tracking-wide text-surface-500">
     Awaiting settlement
   </h3>
   <p className="text-xs text-surface-400 mt-0.5">
     Payout requests a provider has raised. Completing one marks its commissions paid.
   </p>
 </div>
 {payoutRequests.length === 0 ? (
   <p className="text-sm text-surface-400 py-8 text-center">
     No payout requests awaiting settlement.
   </p>
 ) : (
 <div className="overflow-x-auto mt-3">
 <table className="w-full text-sm">
 <thead>
 <tr className="border-y border-[var(--color-border)]">
 <th className="text-left py-2.5 px-5 text-xs font-medium text-surface-500 uppercase tracking-wide">Provider</th>
 <th className="text-left py-2.5 px-4 text-xs font-medium text-surface-500 uppercase tracking-wide">Requested</th>
 <th className="text-left py-2.5 px-4 text-xs font-medium text-surface-500 uppercase tracking-wide">Method</th>
 <th className="text-right py-2.5 px-4 text-xs font-medium text-surface-500 uppercase tracking-wide">Amount</th>
 <th className="text-right py-2.5 px-5 text-xs font-medium text-surface-500 uppercase tracking-wide">Action</th>
 </tr>
 </thead>
 <tbody>
 {payoutRequests.map((p, i) => (
 <tr key={p.id} className={`border-b border-[var(--color-border)] last:border-0 ${i % 2 === 1 ? 'bg-surface-50/30' : ''}`}>
 <td className="py-2.5 px-5">
   <p className="font-medium text-surface-800 truncate max-w-[220px]">{p.providerName}</p>
   <p className="text-xs text-surface-400">
     <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full mr-1 ${roleBadgeColors[p.role] ?? 'bg-surface-100 text-surface-600'}`}>
       {roleLabels[p.role] ?? p.role}
     </span>
     {p.linkedCommissionCount} commission{p.linkedCommissionCount === 1 ? '' : 's'}
   </p>
 </td>
 <td className="py-2.5 px-4 text-surface-500">
   {new Date(p.requestedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
 </td>
 <td className="py-2.5 px-4 text-surface-500 uppercase text-xs">{p.method}</td>
 <td className="py-2.5 px-4 text-right font-semibold text-surface-800">
   {formatInrExact(p.amount)}
 </td>
 <td className="py-2.5 px-5 text-right">
 <button
   type="button"
   onClick={() => openPayDialog(p)}
   className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-md hover:bg-green-700 transition-colors"
 >
   Pay Now
 </button>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}

 {/* Owed — read-only, because the API offers no control for these rows. */}
 <div className="px-5 pt-6">
   <h3 className="text-xs font-semibold uppercase tracking-wide text-surface-500">
     Earned, not yet requested
   </h3>
   <p className="text-xs text-surface-400 mt-0.5">
     Provider balances from the payout engine — the Commission ledger AND the legacy priest
     rail, with anything already claimed by a request above excluded. Nothing here can be paid
     until the provider raises a payout request.
   </p>
 </div>
 {accrualError && (
   <div className="mx-5 mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
     <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
     <span>
       Provider balances unavailable — {accrualError}. Pending Payouts above reads “—” on
       purpose: the commission-only figure on this endpoint understates the priest rail
       entirely, and a wrong liability is worse than none.
     </span>
   </div>
 )}
 {owedByProvider.length === 0 ? (
   <p className="text-sm text-surface-400 py-8 text-center">
     {accrualError ? 'Balances could not be loaded.' : 'No unrequested provider balance.'}
   </p>
 ) : (
 <div className="overflow-x-auto mt-3">
 <table className="w-full text-sm">
 <thead>
 <tr className="border-y border-[var(--color-border)]">
 <th className="text-left py-2.5 px-5 text-xs font-medium text-surface-500 uppercase tracking-wide">Provider</th>
 <th className="text-left py-2.5 px-4 text-xs font-medium text-surface-500 uppercase tracking-wide">Role</th>
 <th className="text-center py-2.5 px-4 text-xs font-medium text-surface-500 uppercase tracking-wide">Items</th>
 <th className="text-right py-2.5 px-4 text-xs font-medium text-surface-500 uppercase tracking-wide">Balance</th>
 <th className="text-right py-2.5 px-5 text-xs font-medium text-surface-500 uppercase tracking-wide">Action</th>
 </tr>
 </thead>
 <tbody>
 {owedByProvider.map((g, i) => (
 <tr key={`${g.providerId}-${g.role}`} className={`border-b border-[var(--color-border)] last:border-0 ${i % 2 === 1 ? 'bg-surface-50/30' : ''}`}>
 <td className="py-2.5 px-5 font-medium text-surface-800 truncate max-w-[220px]">{g.providerName}</td>
 <td className="py-2.5 px-4">
   <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${roleBadgeColors[g.role] ?? 'bg-surface-100 text-surface-600'}`}>
     {roleLabels[g.role] ?? g.role}
   </span>
 </td>
 <td className="py-2.5 px-4 text-center text-surface-600">{g.bookingsCount}</td>
 <td className="py-2.5 px-4 text-right font-semibold text-surface-800">{formatInrExact(g.totalPayout)}</td>
 <td className="py-2.5 px-5 text-right text-xs text-surface-400">Not settleable here</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}

 {accrual?.truncated && (
   <p className="px-5 py-3 text-xs text-amber-700 bg-amber-50 border-t border-[var(--color-border)]">
     Only the most recent {accrual.scanLimit} records were scanned — the Pending Payouts
     figure is a floor, not the full liability.
   </p>
 )}
 </div>

 {/* Payout confirmation */}
 {payTarget && (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
 <div
   role="dialog"
   aria-modal="true"
   aria-labelledby="payout-dialog-title"
   className="w-full max-w-md rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-5 shadow-xl"
 >
 <h2 id="payout-dialog-title" className="text-base font-semibold text-surface-800">
   Confirm payout
 </h2>
 <p className="text-sm text-surface-500 mt-1">
   Record a transfer you have already made. This marks the linked commissions paid — it
   does not move money by itself.
 </p>

 <dl className="mt-4 space-y-2 text-sm">
   <div className="flex justify-between gap-4">
     <dt className="text-surface-500">Provider</dt>
     <dd className="font-medium text-surface-800 text-right">{payTarget.providerName}</dd>
   </div>
   {payTarget.providerEmail && (
     <div className="flex justify-between gap-4">
       <dt className="text-surface-500">Email</dt>
       <dd className="text-surface-600 text-right break-all">{payTarget.providerEmail}</dd>
     </div>
   )}
   <div className="flex justify-between gap-4">
     <dt className="text-surface-500">Amount</dt>
     <dd className="font-semibold text-surface-800">{formatInrExact(payTarget.amount)}</dd>
   </div>
   <div className="flex justify-between gap-4">
     <dt className="text-surface-500">Commissions</dt>
     <dd className="text-surface-600">
       {payTarget.linkedCommissionCount} · {formatInrExact(payTarget.linkedCommissionTotal)}
     </dd>
   </div>
 </dl>

 {/*
   processPayout refuses both of these, but it refuses AFTER the operator has
   already made the bank transfer they came here to record. Say it first.
 */}
 {payTarget.linkedCommissionCount === 0 && (
   <p className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
     <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
     <span>
       This request owns no commissions — there is nothing to pay. Do not transfer; check
       the provider&apos;s balance first.
     </span>
   </p>
 )}
 {payTarget.linkedCommissionCount > 0 &&
   Number(payTarget.linkedCommissionTotal) !== Number(payTarget.amount) && (
   <p className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
     <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
     <span>
       The request amount and its linked commissions disagree. Reconcile the ledger before
       transferring — this will be rejected.
     </span>
   </p>
 )}

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

 {submitting && (
   <p className="mt-3 text-sm text-surface-500">Processing payout — do not close this window.</p>
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
     onClick={closePayDialog}
     disabled={submitting}
     className="px-3 py-1.5 text-sm rounded-md border border-[var(--color-border)] text-surface-600 disabled:opacity-50"
   >
     Cancel
   </button>
   <button
     type="button"
     onClick={confirmPayout}
     disabled={submitting}
     className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-60 transition-colors"
   >
     {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
     Mark as paid
   </button>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}
