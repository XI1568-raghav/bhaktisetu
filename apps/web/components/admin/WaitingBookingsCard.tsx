'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, CalendarClock } from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import { API_BASE_URL, DATA_FETCH_TIMEOUT_MS, fetchWithTimeout } from '../../lib/api-config';

/**
 * Dashboard tile: paid bookings no pandit has taken yet. The number an operator
 * needs to see first on launch day. A failed check says it could not check; it
 * is never allowed to read as "none waiting".
 */
export default function WaitingBookingsCard() {
  const { session } = useAuth();
  const [state, setState] = useState<{ kind: 'loading' } | { kind: 'ok'; total: number } | { kind: 'error' }>({ kind: 'loading' });

  useEffect(() => {
    if (!session?.accessToken) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchWithTimeout(
          `${API_BASE_URL}/admin/bookings?waiting=1&limit=1`,
          { headers: { Authorization: `Bearer ${session.accessToken}` } },
          DATA_FETCH_TIMEOUT_MS,
        );
        if (!res.ok) throw new Error('bad status');
        const data = await res.json();
        if (!cancelled) setState(typeof data?.total === 'number' ? { kind: 'ok', total: data.total } : { kind: 'error' });
      } catch {
        if (!cancelled) setState({ kind: 'error' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session]);

  const urgent = state.kind === 'ok' && state.total > 0;
  return (
    <Link
      href="/admin/bookings"
      className={`bg-[var(--color-surface)] rounded-xl p-5 border transition-all group ${urgent ? 'border-red-300' : 'border-[var(--color-border)] hover:border-saffron-200'}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center mb-3">
            <CalendarClock className="w-5 h-5 text-red-600" />
          </div>
          <h3 className="text-sm font-semibold text-surface-800">Paid bookings</h3>
          <p className="text-xs text-surface-500 mt-1">
            {state.kind === 'loading'
              ? '—'
              : state.kind === 'error'
                ? 'Could not check'
                : state.total === 0
                  ? 'None waiting for a pandit'
                  : `${state.total} waiting for a pandit`}
          </p>
        </div>
        <ArrowUpRight className="w-5 h-5 text-surface-300 group-hover:text-saffron-500 transition-colors" />
      </div>
    </Link>
  );
}
