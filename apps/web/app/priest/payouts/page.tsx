'use client';

import { useState, useEffect } from 'react';
import {
  IndianRupee,
  TrendingUp,
  Clock,
  CheckCircle2,
  Loader2,
  Wallet,
  Calendar,
  ArrowUpRight,
  Inbox,
  Filter,
} from 'lucide-react';
import { useAuth } from '../../../lib/auth-context';
import { API_BASE_URL } from '../../../lib/api-config';

// ─── Types ──────────────────────────────────────────────────────

type PayoutStatusFilter = 'all' | 'pending' | 'processing' | 'completed' | 'failed';

interface PayoutItem {
  id: string;
  amount: number;
  status: string;
  payoutMethod: string;
  payoutReference: string | null;
  processedAt: string | null;
  createdAt: string;
  booking: {
    id: string;
    bookingNumber: string;
    pujaType: { name: string };
    temple: { name: string };
  };
}

interface PayoutSummary {
  totalEarned: number;
  pending: number;
  lastPayout: { amount: number; date: string } | null;
}

// ─── Fallback ───────────────────────────────────────────────────

const fallbackPayouts: PayoutItem[] = [
  {
    id: '1',
    amount: 805,
    status: 'completed',
    payoutMethod: 'bank_transfer',
    payoutReference: 'UTR123456789',
    processedAt: '2026-04-14T10:30:00Z',
    createdAt: '2026-04-13T10:30:00Z',
    booking: {
      id: '1',
      bookingNumber: 'BS-20260410-34521',
      pujaType: { name: 'Rudrabhishek Puja' },
      temple: { name: 'Shri Kashi Vishwanath Temple' },
    },
  },
  {
    id: '2',
    amount: 490,
    status: 'completed',
    payoutMethod: 'bank_transfer',
    payoutReference: 'UTR987654321',
    processedAt: '2026-04-12T08:15:00Z',
    createdAt: '2026-04-11T08:15:00Z',
    booking: {
      id: '2',
      bookingNumber: 'BS-20260408-29874',
      pujaType: { name: 'Maha Mrityunjay Jaap' },
      temple: { name: 'Shri Kashi Vishwanath Temple' },
    },
  },
  {
    id: '3',
    amount: 1190,
    status: 'processing',
    payoutMethod: 'bank_transfer',
    payoutReference: null,
    processedAt: null,
    createdAt: '2026-04-14T14:20:00Z',
    booking: {
      id: '3',
      bookingNumber: 'BS-20260413-18432',
      pujaType: { name: 'Satyanarayan Katha' },
      temple: { name: 'Shri Kashi Vishwanath Temple' },
    },
  },
  {
    id: '4',
    amount: 665,
    status: 'pending',
    payoutMethod: 'bank_transfer',
    payoutReference: null,
    processedAt: null,
    createdAt: '2026-04-15T09:45:00Z',
    booking: {
      id: '4',
      bookingNumber: 'BS-20260414-12098',
      pujaType: { name: 'Ganesh Atharvashirsha Path' },
      temple: { name: 'Trimbakeshwar Temple' },
    },
  },
  {
    id: '5',
    amount: 805,
    status: 'completed',
    payoutMethod: 'bank_transfer',
    payoutReference: 'UTR112233445',
    processedAt: '2026-04-08T11:30:00Z',
    createdAt: '2026-04-07T11:30:00Z',
    booking: {
      id: '5',
      bookingNumber: 'BS-20260405-09876',
      pujaType: { name: 'Rudrabhishek Puja' },
      temple: { name: 'Shri Kashi Vishwanath Temple' },
    },
  },
];

const fallbackSummary: PayoutSummary = {
  totalEarned: 185600,
  pending: 8400,
  lastPayout: { amount: 805, date: '2026-04-14T10:30:00Z' },
};

// ─── Helpers ────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getPayoutStatusConfig(status: string) {
  const map: Record<string, { label: string; cls: string; icon: typeof CheckCircle2 }> = {
    pending: { label: 'Pending', cls: 'bg-amber-100 text-amber-700', icon: Clock },
    processing: { label: 'Processing', cls: 'bg-blue-100 text-blue-700', icon: Loader2 },
    completed: { label: 'Completed', cls: 'bg-tulsi-green-light/30 text-tulsi-green', icon: CheckCircle2 },
    failed: { label: 'Failed', cls: 'bg-red-100 text-red-700', icon: Clock },
  };
  return map[status] ?? { label: status, cls: 'bg-surface-100 text-surface-600', icon: Clock };
}

// ─── Component ──────────────────────────────────────────────────

export default function PriestPayoutsPage() {
  const { session } = useAuth();
  const [payouts, setPayouts] = useState<PayoutItem[]>([]);
  const [summary, setSummary] = useState<PayoutSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<PayoutStatusFilter>('all');

  useEffect(() => {
    async function fetchPayouts() {
      try {
        const res = await fetch(`${API_BASE_URL}/priest/payouts`, {
          headers: { Authorization: `Bearer ${session?.accessToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          setPayouts(data.payouts || []);
          setSummary(data.summary || null);
        } else {
          throw new Error('API unavailable');
        }
      } catch {
        setPayouts(fallbackPayouts);
        setSummary(fallbackSummary);
      } finally {
        setLoading(false);
      }
    }
    fetchPayouts();
  }, [session]);

  const filteredPayouts = payouts.filter((p) => {
    if (filter === 'all') return true;
    return p.status === filter;
  });

  const summaryCards = [
    {
      label: 'Total Earned',
      value: formatCurrency(summary?.totalEarned ?? 0),
      icon: IndianRupee,
      color: 'text-tulsi-green',
      bg: 'bg-tulsi-green-light/20',
    },
    {
      label: 'Pending Payout',
      value: formatCurrency(summary?.pending ?? 0),
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: 'Last Payout',
      value: summary?.lastPayout ? formatCurrency(summary.lastPayout.amount) : 'N/A',
      subtitle: summary?.lastPayout ? formatDate(summary.lastPayout.date) : undefined,
      icon: ArrowUpRight,
      color: 'text-saffron-600',
      bg: 'bg-saffron-50',
    },
  ];

  const statusFilters: { key: PayoutStatusFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'processing', label: 'Processing' },
    { key: 'completed', label: 'Completed' },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold text-surface-800">Payouts</h1>
        <p className="text-surface-500 mt-1">Track your earnings and payout history</p>
      </div>

      {/* Summary Cards */}
      {!loading && summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className="bg-white rounded-xl border border-surface-100 p-5"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 ${card.bg} rounded-lg flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${card.color}`} />
                  </div>
                  <span className="text-sm text-surface-500">{card.label}</span>
                </div>
                <p className="text-lg font-semibold text-surface-800">{card.value}</p>
                {'subtitle' in card && card.subtitle && (
                  <p className="text-xs text-surface-400 mt-0.5">{card.subtitle}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Filter className="w-4 h-4 text-surface-400" />
        <div className="flex gap-1 overflow-x-auto">
          {statusFilters.map((sf) => (
            <button
              key={sf.key}
              onClick={() => setFilter(sf.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filter === sf.key
                  ? 'bg-saffron-600 text-white'
                  : 'bg-white border border-surface-200 text-surface-600 hover:border-saffron-300'
              }`}
            >
              {sf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-saffron-500" />
        </div>
      )}

      {/* Empty */}
      {!loading && filteredPayouts.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-surface-100 bg-white py-16">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-saffron-50">
            <Wallet className="h-8 w-8 text-saffron-400" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-surface-700">No payouts found</h3>
          <p className="text-sm text-surface-500">
            {filter === 'all'
              ? 'You have no payout records yet.'
              : `No payouts with "${filter}" status.`}
          </p>
        </div>
      )}

      {/* Payouts List */}
      {!loading && filteredPayouts.length > 0 && (
        <div className="bg-white rounded-xl border border-surface-100 overflow-hidden">
          {/* Table header - desktop */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 bg-surface-50 text-xs font-semibold text-surface-500 uppercase tracking-wider border-b border-surface-100">
            <div className="col-span-4">Booking</div>
            <div className="col-span-2">Amount</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2">Date</div>
            <div className="col-span-2">Reference</div>
          </div>

          <div className="divide-y divide-surface-50">
            {filteredPayouts.map((payout) => {
              const statusCfg = getPayoutStatusConfig(payout.status);
              return (
                <div key={payout.id} className="px-5 py-4 hover:bg-surface-50/50 transition-colors">
                  {/* Desktop layout */}
                  <div className="hidden md:grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-4">
                      <p className="text-sm font-medium text-surface-800">{payout.booking.pujaType.name}</p>
                      <p className="text-xs text-surface-500">{payout.booking.temple.name}</p>
                      <p className="text-xs text-surface-400 font-mono">{payout.booking.bookingNumber}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm font-bold text-surface-800">{formatCurrency(payout.amount)}</p>
                    </div>
                    <div className="col-span-2">
                      <span className={`inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full ${statusCfg.cls}`}>
                        {statusCfg.label}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm text-surface-600">
                        {payout.processedAt ? formatDate(payout.processedAt) : formatDate(payout.createdAt)}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-surface-500 font-mono truncate">
                        {payout.payoutReference || '-'}
                      </p>
                      <p className="text-xs text-surface-400 capitalize">
                        {payout.payoutMethod.replace('_', ' ')}
                      </p>
                    </div>
                  </div>

                  {/* Mobile layout */}
                  <div className="md:hidden space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-surface-800">{payout.booking.pujaType.name}</p>
                        <p className="text-xs text-surface-500">{payout.booking.temple.name}</p>
                      </div>
                      <p className="text-sm font-bold text-surface-800">{formatCurrency(payout.amount)}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusCfg.cls}`}>
                        {statusCfg.label}
                      </span>
                      <span className="text-xs text-surface-400 font-mono">{payout.booking.bookingNumber}</span>
                      <span className="text-xs text-surface-400">
                        {payout.processedAt ? formatDate(payout.processedAt) : formatDate(payout.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
