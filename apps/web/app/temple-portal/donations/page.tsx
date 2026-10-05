'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Heart,
  IndianRupee,
  TrendingUp,
  User,
  Search,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../../../lib/auth-context';
import { userFacingMessage } from '../../../lib/friendly-error';
import { getMyDonations, type TempleDonation } from '../../../lib/temple-api';
import { H1 } from '../../../components/ui/heading-recipe';

// ─── Helpers ────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  paid: { label: 'Received', cls: 'bg-green-100 text-green-700' },
  created: { label: 'Payment not completed', cls: 'bg-amber-100 text-amber-700' },
  failed: { label: 'Payment failed', cls: 'bg-red-100 text-red-700' },
};

// ─── Component ──────────────────────────────────────────────────

export default function TempleDonationsPage() {
  const { session } = useAuth();
  const token = session?.accessToken;

  const [donations, setDonations] = useState<TempleDonation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await getMyDonations(token);
      setDonations(rows);
    } catch (err) {
      setError(userFacingMessage(err, 'We could not load your donations. Please try again.'));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = donations.filter((d) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return (
      d.donor.toLowerCase().includes(term) ||
      (d.receiptNumber ?? '').toLowerCase().includes(term)
    );
  });

  // Only a captured payment is money the temple received. The API also returns
  // checkouts that were opened and abandoned (`created`) and failed payments.
  const paid = donations.filter((d) => d.status === 'paid');
  const todayIso = new Date().toISOString().split('T')[0];
  const totalAmount = paid.reduce((sum, d) => sum + d.amountInr, 0);
  const todayAmount = paid
    .filter((d) => (d.paidAt ?? d.createdAt).startsWith(todayIso ?? ''))
    .reduce((sum, d) => sum + d.amountInr, 0);
  const donorCount = new Set(paid.map((d) => d.email ?? d.donor)).size;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className={H1.portal}>Donations</h1>
          <p className="text-surface-500 mt-1">
            Donations devotees have made to your temple.
          </p>
          <p className="prose-meta text-surface-500 mt-1 max-w-xl">
            Donations are collected by Darshya first and sent on to your temple by bank
            transfer. Only completed payments are counted below; transfers to your temple are
            recorded by the Darshya team and are not shown here yet.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading || !token}
          className="p-1.5 rounded-md text-surface-400 hover:text-saffron-600 hover:bg-saffron-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Refresh"
          aria-label="Refresh donations"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Retry banner on error */}
      {error && !loading && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-red-700">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </div>
          <button
            onClick={load}
            className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          icon={<Heart className="w-5 h-5 text-red-500" />}
          bg="bg-red-50"
          label="Today"
          value={loading && donations.length === 0 ? null : formatCurrency(todayAmount)}
        />
        <SummaryCard
          icon={<IndianRupee className="w-5 h-5 text-tulsi-green" />}
          bg="bg-tulsi-green-light/20"
          label="Total Received"
          value={loading && donations.length === 0 ? null : formatCurrency(totalAmount)}
        />
        <SummaryCard
          icon={<TrendingUp className="w-5 h-5 text-saffron-600" />}
          bg="bg-saffron-50"
          label="Total Donors"
          value={loading && donations.length === 0 ? null : String(donorCount)}
        />
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 bg-white border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-saffron-200"
            placeholder="Search by donor or receipt..."
          />
        </div>
      </div>

      {/* Donations List */}
      {loading && donations.length === 0 ? (
        <div className="bg-white rounded-xl border border-surface-100 p-6 animate-pulse space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-8 bg-surface-100 rounded" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-surface-100 bg-white py-16">
          <Heart className="w-12 h-12 text-surface-300 mb-4" />
          <h3 className="text-lg font-semibold text-surface-700">
            {donations.length === 0 ? 'No donations yet' : 'No donations match your search'}
          </h3>
          {donations.length === 0 && (
            <p className="prose-meta text-surface-500 mt-1 max-w-md text-center">
              Donations made to your temple appear here as devotees complete payment.
            </p>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-surface-100 overflow-hidden">
          <div className="hidden lg:grid grid-cols-12 gap-4 px-5 py-3 bg-surface-50 text-xs font-semibold text-surface-500 uppercase tracking-wider border-b border-surface-100">
            <div className="col-span-3">Donor</div>
            <div className="col-span-2">Amount</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-3">Date</div>
            <div className="col-span-2">Receipt</div>
          </div>

          <div className="divide-y divide-surface-50">
            {filtered.map((donation) => {
              const status = STATUS_LABEL[donation.status] ?? STATUS_LABEL.created!;
              return (
                <div
                  key={donation.id}
                  className="px-5 py-4 hover:bg-surface-50/50 transition-colors"
                >
                  {/* Desktop */}
                  <div className="hidden lg:grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-3 flex items-center gap-3">
                      <div className="w-8 h-8 bg-red-50 rounded-full flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-red-400" />
                      </div>
                      <span className="text-sm font-medium text-surface-800">{donation.donor}</span>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm font-bold text-surface-800">
                        {formatCurrency(donation.amountInr)}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status.cls}`}>
                        {status.label}
                      </span>
                    </div>
                    <div className="col-span-3">
                      <p className="text-xs text-surface-500">
                        {formatDateTime(donation.paidAt ?? donation.createdAt)}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-surface-400 font-mono truncate">
                        {donation.receiptNumber ?? '—'}
                      </p>
                    </div>
                  </div>

                  {/* Mobile */}
                  <div className="lg:hidden space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-red-50 rounded-full flex items-center justify-center">
                          <Heart className="w-4 h-4 text-red-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-surface-800">{donation.donor}</p>
                          <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${status.cls}`}>
                            {status.label}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm font-bold text-surface-800">
                        {formatCurrency(donation.amountInr)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-surface-400">
                      <span>{formatDateTime(donation.paidAt ?? donation.createdAt)}</span>
                      <span className="font-mono">{donation.receiptNumber ?? '—'}</span>
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

// ─── Subcomponents ──────────────────────────────────────────────

function SummaryCard({
  icon,
  bg,
  label,
  value,
}: {
  icon: React.ReactNode;
  bg: string;
  label: string;
  value: string | null;
}) {
  return (
    <div className="bg-white rounded-xl border border-surface-100 p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 ${bg} rounded-lg flex items-center justify-center`}>
          {icon}
        </div>
        <span className="text-sm text-surface-500">{label}</span>
      </div>
      {value === null ? (
        <div className="h-6 w-20 bg-surface-100 rounded animate-pulse" />
      ) : (
        <p className="text-lg font-semibold text-surface-800">{value}</p>
      )}
    </div>
  );
}
