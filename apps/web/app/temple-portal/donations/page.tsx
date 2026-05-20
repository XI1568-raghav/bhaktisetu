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
import { getMyDonations, type TempleDonation } from '../../../lib/temple-api';

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
      setError(err instanceof Error ? err.message : 'Failed to load donations');
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
      d.donorName.toLowerCase().includes(term) ||
      d.receipt.toLowerCase().includes(term)
    );
  });

  const todayIso = new Date().toISOString().split('T')[0];
  const totalAmount = donations.reduce(
    (sum, d) => sum + parseFloat(d.amount ?? '0'),
    0,
  );
  const todayAmount = donations
    .filter((d) => d.createdAt.startsWith(todayIso ?? ''))
    .reduce((sum, d) => sum + parseFloat(d.amount ?? '0'), 0);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-800">Donations</h1>
          <p className="text-surface-500 mt-1">
            Track and manage temple donations
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
          value={loading && donations.length === 0 ? null : String(donations.length)}
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
            No donations yet
          </h3>
          <p className="text-sm text-surface-500 mt-1 max-w-md text-center">
            Temple donations will appear here once the donation flow is enabled
            for your temple. Devotees will be able to give via the temple
            details page.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-surface-100 overflow-hidden">
          <div className="hidden lg:grid grid-cols-12 gap-4 px-5 py-3 bg-surface-50 text-xs font-semibold text-surface-500 uppercase tracking-wider border-b border-surface-100">
            <div className="col-span-3">Donor</div>
            <div className="col-span-2">Amount</div>
            <div className="col-span-2">Purpose</div>
            <div className="col-span-2">Payment</div>
            <div className="col-span-2">Date</div>
            <div className="col-span-1">Receipt</div>
          </div>

          <div className="divide-y divide-surface-50">
            {filtered.map((donation) => {
              const amountNum = parseFloat(donation.amount ?? '0');
              return (
                <div
                  key={donation.id}
                  className="px-5 py-4 hover:bg-surface-50/50 transition-colors"
                >
                  {/* Desktop */}
                  <div className="hidden lg:grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-3 flex items-center gap-3">
                      <div className="w-8 h-8 bg-red-50 rounded-full flex items-center justify-center shrink-0">
                        {donation.isAnonymous ? (
                          <Heart className="w-4 h-4 text-red-400" />
                        ) : (
                          <User className="w-4 h-4 text-red-400" />
                        )}
                      </div>
                      <span
                        className={`text-sm font-medium ${
                          donation.isAnonymous
                            ? 'text-surface-400 italic'
                            : 'text-surface-800'
                        }`}
                      >
                        {donation.donorName}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm font-bold text-surface-800">
                        {formatCurrency(amountNum)}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-surface-100 text-surface-600">
                        {donation.purpose}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-surface-500">
                        {donation.paymentMethod}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-surface-500">
                        {formatDateTime(donation.createdAt)}
                      </p>
                    </div>
                    <div className="col-span-1">
                      <p className="text-xs text-surface-400 font-mono truncate">
                        {donation.receipt}
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
                          <p
                            className={`text-sm font-medium ${
                              donation.isAnonymous
                                ? 'text-surface-400 italic'
                                : 'text-surface-800'
                            }`}
                          >
                            {donation.donorName}
                          </p>
                          <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-surface-100 text-surface-600">
                            {donation.purpose}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm font-bold text-surface-800">
                        {formatCurrency(amountNum)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-surface-400">
                      <span>{donation.paymentMethod}</span>
                      <span>{formatDateTime(donation.createdAt)}</span>
                      <span className="font-mono">{donation.receipt}</span>
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
