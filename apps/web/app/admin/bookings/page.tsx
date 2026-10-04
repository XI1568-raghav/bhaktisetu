'use client';

/**
 * /admin/bookings — every puja booking, starting with the ones nobody is working on.
 *
 * Why it exists (customer test 2026-10-05): a paid booking in the default
 * "scheduled" tier stays `confirmed` with no pandit until one takes it, and the
 * admin menu had no Bookings page, so the person running the platform had no
 * screen that answered "which paid bookings has nobody picked up, and how soon
 * is the slot?". It opens on exactly that list, soonest first, and flags any
 * whose slot is within 48 hours.
 *
 * Honesty rules, as on the other admin screens: render only what the server
 * returned, say plainly when nothing is waiting, never show an empty "all clear"
 * for a failed load, and say when the list is only the first page of a longer one.
 */

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { useAuth } from '../../../lib/auth-context';
import { API_BASE_URL, DATA_FETCH_TIMEOUT_MS, fetchWithTimeout } from '../../../lib/api-config';
import { UserFacingError, serverErrorText, userFacingMessage } from '../../../lib/friendly-error';
import { H1 } from '../../../components/ui/heading-recipe';
import { buttonClass } from '../../../components/ui/button-recipe';

interface AdminBooking {
  id: string;
  bookingNumber: string | null;
  status: string;
  priestId: string | null;
  scheduledDate: string | null;
  scheduledTimeSlot: string | null;
  createdAt: string;
  pujaType: { name: string } | null;
  temple: { name: string; city: string } | null;
  user: { fullName: string; phone: string | null } | null;
  priest: { displayName: string } | null;
}

type TabKey = 'waiting' | 'all' | 'priest_assigned' | 'in_progress' | 'completed' | 'delivered' | 'cancelled';

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'waiting', label: 'Waiting for a pandit' },
  { key: 'all', label: 'All' },
  { key: 'priest_assigned', label: 'Assigned' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'completed', label: 'Completed' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
];

const PAGE_SIZE = 50;
const URGENT_HOURS = 48;

function queryFor(tab: TabKey): string {
  const base = `limit=${PAGE_SIZE}`;
  if (tab === 'waiting') return `waiting=1&${base}`;
  if (tab === 'all') return base;
  return `status=${tab}&${base}`;
}

function formatDate(value: string | null): string {
  if (!value) return 'Date to be confirmed';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'Date to be confirmed';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

function hoursUntil(value: string | null): number | null {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? (t - Date.now()) / 3600000 : null;
}

function ageLabel(createdAt: string): string {
  const h = Math.max(0, (Date.now() - new Date(createdAt).getTime()) / 3600000);
  if (!Number.isFinite(h)) return '';
  if (h < 1) return 'booked just now';
  if (h < 48) return `booked ${Math.floor(h)}h ago`;
  return `booked ${Math.floor(h / 24)}d ago`;
}

export default function AdminBookingsPage() {
  const { session } = useAuth();
  const [tab, setTab] = useState<TabKey>('waiting');
  const [rows, setRows] = useState<AdminBooking[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session?.accessToken) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetchWithTimeout(
        `${API_BASE_URL}/admin/bookings?${queryFor(tab)}`,
        { headers: { Authorization: `Bearer ${session.accessToken}` } },
        DATA_FETCH_TIMEOUT_MS,
      );
      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new UserFacingError(serverErrorText(detail, 'Could not load bookings. Please try again.'));
      }
      const data = await res.json();
      setRows(Array.isArray(data?.bookings) ? data.bookings : []);
      setTotal(typeof data?.total === 'number' ? data.total : 0);
    } catch (err) {
      setLoadError(
        err instanceof TypeError
          ? 'Could not reach Darshya. Check your connection and try again.'
          : userFacingMessage(err, 'Could not load bookings. Please try again.'),
      );
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [session, tab]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className={H1.portal}>Bookings</h1>
        <p className="text-surface-500 mt-1 text-sm">
          Every puja booking. Start with the ones waiting for a pandit: the devotee has paid and nobody has taken it yet.
        </p>
      </div>

      <div role="tablist" aria-label="Booking status" className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={buttonClass(tab === t.key ? 'primary' : 'secondary', 'sm')}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-7 h-7 animate-spin text-saffron-500" />
        </div>
      ) : loadError ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          <p>{loadError}</p>
          <button type="button" onClick={() => void load()} className={buttonClass('secondary', 'md', 'mt-3')}>
            <RefreshCw className="w-4 h-4" /> Try again
          </button>
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-surface-200 bg-white p-6 text-sm text-surface-600">
          {tab === 'waiting' ? 'No bookings are waiting for a pandit right now.' : 'No bookings in this view.'}
        </div>
      ) : (
        <>
          <ul className="space-y-3">
            {rows.map((b) => {
              const h = hoursUntil(b.scheduledDate);
              const urgent = tab === 'waiting' && h !== null && h <= URGENT_HOURS;
              return (
                <li
                  key={b.id}
                  className={`rounded-xl border bg-white p-4 grid gap-3 sm:grid-cols-[1.4fr_1.2fr_1fr] ${urgent ? 'border-red-300' : 'border-surface-200'}`}
                >
                  <div className="space-y-1">
                    <p className="font-mono text-xs text-surface-500">{b.bookingNumber ?? b.id.slice(0, 8)}</p>
                    <p className="font-semibold text-surface-800">{b.pujaType?.name ?? 'Puja'}</p>
                    <p className="text-sm text-surface-600">
                      {b.temple?.name ?? 'Temple'}
                      {b.temple?.city ? `, ${b.temple.city}` : ''}
                    </p>
                    <p className="text-sm text-surface-600">
                      {formatDate(b.scheduledDate)}
                      {b.scheduledTimeSlot ? ` · ${b.scheduledTimeSlot}` : ''}
                    </p>
                    {urgent && (
                      <p className="text-xs font-medium text-red-700 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> Slot within 48h
                      </p>
                    )}
                  </div>
                  <div className="space-y-1 text-sm text-surface-600">
                    <p className="font-medium text-surface-700">{b.user?.fullName ?? 'Devotee'}</p>
                    {b.user?.phone ? <p>{b.user.phone}</p> : null}
                    <p className="text-xs text-surface-500">{ageLabel(b.createdAt)}</p>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p className="text-xs uppercase tracking-wide text-surface-500">Pandit</p>
                    {b.priest?.displayName ? (
                      <p className="font-medium text-surface-800">{b.priest.displayName}</p>
                    ) : (
                      <p className="text-surface-500">No pandit yet</p>
                    )}
                    <p className="text-xs text-surface-500">{b.status.replace(/_/g, ' ')}</p>
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-surface-500">
            Showing {rows.length} of {total}
            {total > rows.length ? ' — narrow the view to see the rest.' : '.'}
          </p>
        </>
      )}
    </div>
  );
}
