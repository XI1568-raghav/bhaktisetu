'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, Download, Loader2, AlertCircle } from 'lucide-react';
import AuthGuard from '../../../components/AuthGuard';
import { useAuth } from '../../../lib/auth-context';
import { UserFacingError, serverErrorText, userFacingMessage } from '../../../lib/friendly-error';
import { API_BASE_URL } from '../../../lib/api-config';
import { H1 } from '../../../components/ui/heading-recipe';
import { buttonClass } from '../../../components/ui/button-recipe';

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
  paid: 'bg-[#e7f0e0] text-[#3f6b1f]',
  created: 'bg-[var(--color-primary-highlight)] text-[var(--color-primary-active)]',
  failed: 'bg-[#fef2e8] text-[#943b19]',
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
        // P2 #221 (2026-08-03): was `?limit=500` — an unbounded fetch of every
        // donation in one shot. Cap to a sane page size; a proper paginated UI
        // can page further when needed.
        const res = await fetch(`${API_BASE_URL}/gaushala-portal/donations?limit=100`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          // RES-09: `HTTP 500` reached the gaushala manager verbatim.
          throw new UserFacingError(
            serverErrorText(await res.text().catch(() => ''), 'We could not load your donations.'),
            res.status,
          );
        }
        const data = await res.json();
        if (!cancelled) setDonations(data.donations ?? []);
      } catch (err: any) {
        if (!cancelled) setError(userFacingMessage(err, 'We could not load your donations. Please try again.'));
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
          <h1 className={H1.portal}>Donations</h1>
          <p className="text-[var(--color-text-muted)] text-sm mt-1">
            Total received: ₹{totalReceived.toLocaleString('en-IN')} · This month: ₹
            {monthReceived.toLocaleString('en-IN')}
          </p>
        </div>
        <button
          onClick={exportCsv}
          disabled={filtered.length === 0}
          className={buttonClass('primary', 'md')}
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      <div className="bg-[var(--color-surface)] rounded-xl shadow-sm border border-[var(--color-border)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--color-border)] flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-faint)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search donor, email or receipt..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-[var(--color-surface-offset)] border border-[var(--color-border)] text-[var(--color-text)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
          </div>
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                statusFilter === f.key
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-primary-highlight)]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-[var(--color-text-muted)]">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Loading donations...
          </div>
        ) : error ? (
          <div className="mx-6 my-8 flex items-start gap-2 text-sm px-3 py-2 rounded-lg bg-[#fef2e8] border border-[#f59e54] text-[#943b19]">
            <AlertCircle className="w-5 h-5 shrink-0 mt-px" />
            <span>{error}</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--color-surface-offset)]">
                <tr>
                  {['Donor', 'Email', 'Amount', 'Status', 'Receipt', 'Date'].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-left text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {filtered.map((d) => {
                  const when = d.paidAt ?? d.createdAt;
                  return (
                    <tr key={d.id} className="hover:bg-[var(--color-primary-highlight)]/40 transition-colors">
                      <td className="px-5 py-3 font-medium text-[var(--color-text)]">{d.donor}</td>
                      <td className="px-5 py-3 text-[var(--color-text-muted)] text-xs">{d.email ?? '—'}</td>
                      <td className="px-5 py-3 font-semibold text-[var(--color-primary)]">
                        ₹{d.amountInr.toLocaleString('en-IN')}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyles[d.status]}`}
                        >
                          {statusLabel[d.status]}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-[var(--color-text-muted)]">
                        {d.receiptNumber ?? '—'}
                      </td>
                      <td className="px-5 py-3 text-[var(--color-text-muted)] text-xs">
                        {new Date(when).toLocaleDateString('en-IN')}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-[var(--color-text-faint)] text-sm">
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
