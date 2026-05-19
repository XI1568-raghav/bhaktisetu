'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, Download, Loader2, AlertCircle } from 'lucide-react';
import AuthGuard from '../../../components/AuthGuard';
import { useAuth } from '../../../lib/auth-context';
import { API_BASE_URL } from '../../../lib/api-config';

type Donation = {
  id: string;
  donor: string;
  email: string | null;
  amountInr: number;
  status: 'created' | 'paid' | 'failed';
  receiptNumber: string | null;
  createdAt: string;
  paidAt: string | null;
};

const statusLabel: Record<Donation['status'], string> = {
  created: 'Pending',
  paid: 'Received',
  failed: 'Failed',
};

const statusStyles: Record<Donation['status'], string> = {
  paid: 'bg-green-100 text-green-700',
  created: 'bg-yellow-100 text-yellow-700',
  failed: 'bg-red-100 text-red-700',
};

const filters: Array<{ key: 'all' | Donation['status']; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'paid', label: 'Received' },
  { key: 'created', label: 'Pending' },
  { key: 'failed', label: 'Failed' },
];

export default function DonationsPage() {
  return (
    <AuthGuard allowedRoles={['gaushala_manager', 'admin']}>
      <DonationsPageContent />
    </AuthGuard>
  );
}

function DonationsPageContent() {
  const { session } = useAuth();
  const token = session?.accessToken;
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Donation['status']>('all');

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE_URL}/gaushala-portal/donations?limit=500`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        if (!cancelled) setDonations(data.donations ?? []);
      } catch (err: any) {
        if (!cancelled) setError(err?.message ?? 'Failed to load donations');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return donations.filter((d) => {
      const matchStatus = statusFilter === 'all' || d.status === statusFilter;
      if (!matchStatus) return false;
      if (!q) return true;
      return (
        d.donor.toLowerCase().includes(q) ||
        (d.email ?? '').toLowerCase().includes(q) ||
        (d.receiptNumber ?? '').toLowerCase().includes(q)
      );
    });
  }, [donations, search, statusFilter]);

  const totalReceived = useMemo(
    () => donations.filter((d) => d.status === 'paid').reduce((s, d) => s + d.amountInr, 0),
    [donations],
  );

  const monthReceived = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    return donations
      .filter((d) => d.status === 'paid' && d.paidAt && new Date(d.paidAt).getTime() >= monthStart)
      .reduce((s, d) => s + d.amountInr, 0);
  }, [donations]);

  const exportCsv = () => {
    const header = 'ID,Donor,Email,Amount,Status,Receipt,Created,Paid\n';
    const rows = filtered
      .map((d) =>
        [
          d.id,
          `"${d.donor.replace(/"/g, '""')}"`,
          d.email ?? '',
          d.amountInr,
          statusLabel[d.status],
          d.receiptNumber ?? '',
          d.createdAt,
          d.paidAt ?? '',
        ].join(','),
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `donations-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-amber-900">Donations</h1>
          <p className="text-amber-700 text-sm mt-1">
            Total received: ₹{totalReceived.toLocaleString('en-IN')} · This month: ₹
            {monthReceived.toLocaleString('en-IN')}
          </p>
        </div>
        <button
          onClick={exportCsv}
          disabled={filtered.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-amber-800 text-white rounded-lg text-sm hover:bg-amber-900 transition-colors disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-amber-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-amber-50 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search donor, email or receipt..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                statusFilter === f.key
                  ? 'bg-amber-700 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-amber-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-amber-700">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Loading donations...
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-16 text-red-600">
            <AlertCircle className="w-5 h-5 mr-2" />
            {error}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-amber-50">
                <tr>
                  {['Donor', 'Email', 'Amount', 'Status', 'Receipt', 'Date'].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-left text-xs font-semibold text-amber-800 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-50">
                {filtered.map((d) => {
                  const when = d.paidAt ?? d.createdAt;
                  return (
                    <tr key={d.id} className="hover:bg-amber-50/60 transition-colors">
                      <td className="px-5 py-3 font-medium text-gray-800">{d.donor}</td>
                      <td className="px-5 py-3 text-gray-500 text-xs">{d.email ?? '—'}</td>
                      <td className="px-5 py-3 font-semibold text-amber-700">
                        ₹{d.amountInr.toLocaleString('en-IN')}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyles[d.status]}`}
                        >
                          {statusLabel[d.status]}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-gray-500">
                        {d.receiptNumber ?? '—'}
                      </td>
                      <td className="px-5 py-3 text-gray-500 text-xs">
                        {new Date(when).toLocaleDateString('en-IN')}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-gray-400 text-sm">
                      {donations.length === 0
                        ? 'No donations yet. Share your gaushala page to start receiving seva.'
                        : 'No donations match these filters.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
