'use client';

/**
 * Temple manager — all puja bookings for their temple (revamp 2026-08-05).
 *
 * Before this, a temple manager could only see the dashboard's 10 most recent
 * bookings — no list, no filter, no way to run their seva calendar. This page
 * reads the new GET /temple-portal/bookings endpoint with status + date filters.
 */

import { useCallback, useEffect, useState } from 'react';
import { CalendarDays, Clock, Loader2, Inbox, IndianRupee, Search } from 'lucide-react';
import AuthGuard from '../../../components/AuthGuard';
import { useAuth } from '../../../lib/auth-context';
import { API_BASE_URL } from '../../../lib/api-config';

interface TempleBooking {
  id: string;
  bookingNumber: string;
  status: string;
  scheduledDate: string;
  scheduledTimeSlot: string;
  priceAmount: string;
  pujaName: string;
  pujaCategory: string;
  priestName: string | null;
  devoteeName: string;
  devoteeEmail: string | null;
  dispatchTier: string;
  createdAt: string;
}

const STATUS_FILTERS = [
  'all', 'pending_payment', 'confirmed', 'priest_assigned', 'in_progress', 'completed', 'cancelled',
] as const;

const statusClass: Record<string, string> = {
  pending_payment: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  priest_assigned: 'bg-indigo-100 text-indigo-800',
  in_progress: 'bg-saffron-100 text-saffron-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

function TempleBookingsContent() {
  const { session } = useAuth();
  const [bookings, setBookings] = useState<TempleBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('all');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    if (!session?.accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const qs = status !== 'all' ? `?status=${encodeURIComponent(status)}&limit=200` : '?limit=200';
      const res = await fetch(`${API_BASE_URL}/temple-portal/bookings${qs}`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json();
      setBookings(j.bookings ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, [session?.accessToken, status]);

  useEffect(() => { load(); }, [load]);

  const filtered = bookings.filter((b) =>
    !search ||
    b.bookingNumber.toLowerCase().includes(search.toLowerCase()) ||
    b.devoteeName.toLowerCase().includes(search.toLowerCase()) ||
    b.pujaName.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold text-surface-800">Puja Bookings</h1>
        <p className="text-sm text-surface-500 mt-1">All bookings at your temple — your seva calendar.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search booking #, devotee, puja…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-saffron-200"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                status === s ? 'bg-saffron-600 text-white' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
              }`}
            >
              {s === 'all' ? 'All' : s.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border border-surface-100">
        {loading ? (
          <div className="flex items-center gap-2 p-8 text-surface-500 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading bookings…
          </div>
        ) : error ? (
          <p className="p-8 text-sm text-red-600 text-center">{error}</p>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Inbox className="w-8 h-8 text-surface-300 mx-auto mb-2" />
            <p className="text-sm text-surface-500">No bookings found{status !== 'all' ? ` for "${status.replace(/_/g, ' ')}"` : ''}.</p>
          </div>
        ) : (
          <div className="divide-y divide-surface-100">
            {filtered.map((b) => (
              <div key={b.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-surface-800">{b.pujaName}</p>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusClass[b.status] ?? 'bg-surface-100 text-surface-600'}`}>
                      {b.status.replace(/_/g, ' ')}
                    </span>
                    {b.dispatchTier !== 'scheduled' && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 uppercase">
                        {b.dispatchTier.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-surface-500 mt-1 font-mono">#{b.bookingNumber}</p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 mt-1.5 text-xs text-surface-500">
                    <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" />{new Date(b.scheduledDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{b.scheduledTimeSlot}</span>
                    <span className="flex items-center gap-1"><IndianRupee className="w-3 h-3" />{Number(b.priceAmount).toLocaleString('en-IN')}</span>
                  </div>
                  <p className="text-xs text-surface-500 mt-1">
                    Devotee: {b.devoteeName}{b.priestName ? ` · Pandit: ${b.priestName}` : ' · Pandit: unassigned'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function TempleBookingsPage() {
  return (
    <AuthGuard allowedRoles={['temple_manager', 'admin']}>
      <TempleBookingsContent />
    </AuthGuard>
  );
}
