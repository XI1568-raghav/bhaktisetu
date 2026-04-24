'use client';

import { useState } from 'react';
import {
  Heart,
  IndianRupee,
  TrendingUp,
  Calendar,
  Filter,
  User,
  Clock,
  Search,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────

interface Donation {
  id: string;
  donorName: string;
  amount: number;
  purpose: string;
  paymentMethod: string;
  date: string;
  isAnonymous: boolean;
  receipt: string;
}

type PurposeFilter = 'all' | 'Anna Daan' | 'Temple Maintenance' | 'Gaushala Seva' | 'General Donation' | 'Festival Fund' | 'Priest Dakshina';

// ─── Mock Data ──────────────────────────────────────────────────

const mockDonations: Donation[] = [
  { id: '1', donorName: 'Meera Agarwal', amount: 5100, purpose: 'Anna Daan', paymentMethod: 'Razorpay UPI', date: '2026-04-16T10:30:00Z', isAnonymous: false, receipt: 'DON-20260416-001' },
  { id: '2', donorName: 'Suresh Pandey', amount: 2100, purpose: 'Temple Maintenance', paymentMethod: 'Razorpay Card', date: '2026-04-16T09:15:00Z', isAnonymous: false, receipt: 'DON-20260416-002' },
  { id: '3', donorName: 'Anonymous', amount: 11000, purpose: 'Gaushala Seva', paymentMethod: 'Bank Transfer', date: '2026-04-16T08:00:00Z', isAnonymous: true, receipt: 'DON-20260416-003' },
  { id: '4', donorName: 'Anonymous', amount: 1100, purpose: 'General Donation', paymentMethod: 'Razorpay UPI', date: '2026-04-15T18:45:00Z', isAnonymous: true, receipt: 'DON-20260415-004' },
  { id: '5', donorName: 'Rajesh Kumar', amount: 21000, purpose: 'Festival Fund', paymentMethod: 'Razorpay Card', date: '2026-04-15T14:20:00Z', isAnonymous: false, receipt: 'DON-20260415-005' },
  { id: '6', donorName: 'Priya Mehta', amount: 3100, purpose: 'Anna Daan', paymentMethod: 'Razorpay UPI', date: '2026-04-15T11:00:00Z', isAnonymous: false, receipt: 'DON-20260415-006' },
  { id: '7', donorName: 'Deepak Verma', amount: 5100, purpose: 'Priest Dakshina', paymentMethod: 'Razorpay UPI', date: '2026-04-14T16:30:00Z', isAnonymous: false, receipt: 'DON-20260414-007' },
  { id: '8', donorName: 'Anita Singh', amount: 11000, purpose: 'Temple Maintenance', paymentMethod: 'Bank Transfer', date: '2026-04-14T10:15:00Z', isAnonymous: false, receipt: 'DON-20260414-008' },
  { id: '9', donorName: 'Anonymous', amount: 51000, purpose: 'Gaushala Seva', paymentMethod: 'Bank Transfer', date: '2026-04-13T09:00:00Z', isAnonymous: true, receipt: 'DON-20260413-009' },
  { id: '10', donorName: 'Vikram Chauhan', amount: 2100, purpose: 'General Donation', paymentMethod: 'Razorpay UPI', date: '2026-04-13T08:30:00Z', isAnonymous: false, receipt: 'DON-20260413-010' },
  { id: '11', donorName: 'Kavita Sharma', amount: 7500, purpose: 'Anna Daan', paymentMethod: 'Razorpay Card', date: '2026-04-12T15:45:00Z', isAnonymous: false, receipt: 'DON-20260412-011' },
  { id: '12', donorName: 'Manoj Tiwari', amount: 1100, purpose: 'Festival Fund', paymentMethod: 'Razorpay UPI', date: '2026-04-12T12:00:00Z', isAnonymous: false, receipt: 'DON-20260412-012' },
];

// ─── Helpers ────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getPurposeColor(purpose: string): string {
  const map: Record<string, string> = {
    'Anna Daan': 'bg-saffron-50 text-saffron-700',
    'Temple Maintenance': 'bg-blue-100 text-blue-700',
    'Gaushala Seva': 'bg-green-100 text-green-700',
    'General Donation': 'bg-surface-100 text-surface-600',
    'Festival Fund': 'bg-purple-100 text-purple-700',
    'Priest Dakshina': 'bg-amber-100 text-amber-700',
  };
  return map[purpose] ?? 'bg-surface-100 text-surface-600';
}

// ─── Component ──────────────────────────────────────────────────

export default function TempleDonationsPage() {
  const [search, setSearch] = useState('');
  const [purposeFilter, setPurposeFilter] = useState<PurposeFilter>('all');

  const filtered = mockDonations.filter((d) => {
    const matchSearch = !search || d.donorName.toLowerCase().includes(search.toLowerCase()) || d.receipt.toLowerCase().includes(search.toLowerCase());
    const matchPurpose = purposeFilter === 'all' || d.purpose === purposeFilter;
    return matchSearch && matchPurpose;
  });

  const todayDate = new Date().toISOString().split('T')[0];
  const totalAmount = mockDonations.reduce((sum, d) => sum + d.amount, 0);
  const todayAmount = mockDonations
    .filter((d) => d.date.startsWith(todayDate!))
    .reduce((sum, d) => sum + d.amount, 0);
  const purposes = ['all', 'Anna Daan', 'Temple Maintenance', 'Gaushala Seva', 'General Donation', 'Festival Fund', 'Priest Dakshina'] as PurposeFilter[];

  // Group by purpose for summary
  const purposeSummary = purposes.filter((p) => p !== 'all').map((purpose) => ({
    purpose,
    total: mockDonations.filter((d) => d.purpose === purpose).reduce((sum, d) => sum + d.amount, 0),
    count: mockDonations.filter((d) => d.purpose === purpose).length,
  }));

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-surface-800">Donations</h1>
        <p className="text-surface-500 mt-1">Track and manage temple donations</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-surface-100 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
              <Heart className="w-5 h-5 text-red-500" />
            </div>
            <span className="text-sm text-surface-500">Today</span>
          </div>
          <p className="text-lg font-semibold text-surface-800">{formatCurrency(todayAmount)}</p>
        </div>
        <div className="bg-white rounded-xl border border-surface-100 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-tulsi-green-light/20 rounded-lg flex items-center justify-center">
              <IndianRupee className="w-5 h-5 text-tulsi-green" />
            </div>
            <span className="text-sm text-surface-500">Total Received</span>
          </div>
          <p className="text-lg font-semibold text-surface-800">{formatCurrency(totalAmount)}</p>
        </div>
        <div className="bg-white rounded-xl border border-surface-100 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-saffron-50 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-saffron-600" />
            </div>
            <span className="text-sm text-surface-500">Total Donors</span>
          </div>
          <p className="text-lg font-semibold text-surface-800">{mockDonations.length}</p>
        </div>
      </div>

      {/* Purpose Breakdown */}
      <div className="bg-white rounded-xl border border-surface-100 p-5">
        <h3 className="font-semibold text-surface-800 mb-4">By Purpose</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {purposeSummary.map((ps) => (
            <div key={ps.purpose} className="bg-surface-50 rounded-lg p-3">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getPurposeColor(ps.purpose)}`}>
                {ps.purpose}
              </span>
              <p className="text-base font-semibold text-surface-800 mt-2">{formatCurrency(ps.total)}</p>
              <p className="text-xs text-surface-400">{ps.count} donation{ps.count !== 1 ? 's' : ''}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 bg-white border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-saffron-200"
            placeholder="Search by donor or receipt..." />
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {purposes.map((p) => (
            <button key={p} onClick={() => setPurposeFilter(p)}
              className={`px-3 py-2.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                purposeFilter === p
                  ? 'bg-saffron-600 text-white'
                  : 'bg-white border border-surface-200 text-surface-600 hover:border-saffron-300'
              }`}>
              {p === 'all' ? 'All' : p}
            </button>
          ))}
        </div>
      </div>

      {/* Donations List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-surface-100 bg-white py-16">
          <Heart className="w-12 h-12 text-surface-300 mb-4" />
          <h3 className="text-lg font-semibold text-surface-700">No donations found</h3>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-surface-100 overflow-hidden">
          {/* Desktop header */}
          <div className="hidden lg:grid grid-cols-12 gap-4 px-5 py-3 bg-surface-50 text-xs font-semibold text-surface-500 uppercase tracking-wider border-b border-surface-100">
            <div className="col-span-3">Donor</div>
            <div className="col-span-2">Amount</div>
            <div className="col-span-2">Purpose</div>
            <div className="col-span-2">Payment</div>
            <div className="col-span-2">Date</div>
            <div className="col-span-1">Receipt</div>
          </div>

          <div className="divide-y divide-surface-50">
            {filtered.map((donation) => (
              <div key={donation.id} className="px-5 py-4 hover:bg-surface-50/50 transition-colors">
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
                    <span className={`text-sm font-medium ${donation.isAnonymous ? 'text-surface-400 italic' : 'text-surface-800'}`}>
                      {donation.donorName}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm font-bold text-surface-800">{formatCurrency(donation.amount)}</p>
                  </div>
                  <div className="col-span-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getPurposeColor(donation.purpose)}`}>
                      {donation.purpose}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-surface-500">{donation.paymentMethod}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-surface-500">{formatDateTime(donation.date)}</p>
                  </div>
                  <div className="col-span-1">
                    <p className="text-xs text-surface-400 font-mono truncate">{donation.receipt}</p>
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
                        <p className={`text-sm font-medium ${donation.isAnonymous ? 'text-surface-400 italic' : 'text-surface-800'}`}>
                          {donation.donorName}
                        </p>
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${getPurposeColor(donation.purpose)}`}>
                          {donation.purpose}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-surface-800">{formatCurrency(donation.amount)}</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-surface-400">
                    <span>{donation.paymentMethod}</span>
                    <span>{formatDateTime(donation.date)}</span>
                    <span className="font-mono">{donation.receipt}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
