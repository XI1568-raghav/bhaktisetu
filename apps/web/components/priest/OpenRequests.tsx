'use client';

/**
 * "Open requests": paid bookings no pandit has taken yet.
 *
 * Why this exists (customer test 2026-10-05): the default booking tier leaves a
 * paid booking `confirmed` with no pandit, expecting pandits to self-pick. The
 * portal only ever listed bookings already assigned to the pandit, so nobody
 * could see the booking and the devotee waited on a pandit who did not know.
 *
 * Honesty rules, same as the dispatch offers list below it: render only what the
 * server returned, say plainly when the pandit is not approved, never show an
 * empty list for a failed load, and report an accept only after the server does.
 * No devotee name appears here: the API does not send one, and it is released
 * to the pandit who accepts.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, CheckCircle2, Loader2, MapPin, RefreshCw, Users } from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import { API_BASE_URL, DATA_FETCH_TIMEOUT_MS, fetchWithTimeout } from '../../lib/api-config';
import { UserFacingError, serverErrorMessage, serverErrorText, userFacingMessage } from '../../lib/friendly-error';
import { buttonClass } from '../ui/button-recipe';

interface OpenRequestRow {
  id: string;
  bookingNumber: string | null;
  scheduledDate: string | null;
  scheduledTimeSlot: string | null;
  devoteeCount: number;
  priestEarningInr: number;
  pujaName: string;
  templeName: string;
  city: string;
}

function formatDate(value: string | null): string {
  if (!value) return 'Date to be confirmed';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'Date to be confirmed';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

// What the pandit is paid, as the server computed it; nothing is printed for a missing figure.
function formatEarning(value: number | null | undefined): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

export default function OpenRequests() {
  const { session } = useAuth();
  const [rows, setRows] = useState<OpenRequestRow[]>([]);
  const [eligible, setEligible] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [takingId, setTakingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmedMessage, setConfirmedMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session?.accessToken) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetchWithTimeout(
        `${API_BASE_URL}/priest/open-requests`,
        { headers: { Authorization: `Bearer ${session.accessToken}` } },
        DATA_FETCH_TIMEOUT_MS,
      );
      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new UserFacingError(serverErrorText(detail, 'Could not load open requests. Please try again.'));
      }
      const data = await res.json();
      setEligible(data?.eligible !== false);
      setRows(Array.isArray(data?.requests) ? data.requests : []);
    } catch (err) {
      setLoadError(
        err instanceof TypeError
          ? 'Could not reach Darshya. Check your connection and try again.'
          : userFacingMessage(err, 'Could not load open requests. Please try again.'),
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    void load();
  }, [load]);

  async function accept(id: string) {
    setTakingId(id);
    setActionError(null);
    setConfirmedMessage(null);
    try {
      const res = await fetchWithTimeout(
        `${API_BASE_URL}/priest/bookings/${id}/accept`,
        { method: 'PATCH', headers: { Authorization: `Bearer ${session?.accessToken ?? ''}` } },
        DATA_FETCH_TIMEOUT_MS,
      );
      let payload: { message?: string; error?: string } = {};
      try {
        payload = await res.json();
      } catch {
        // res.ok is still the source of truth.
      }
      if (!res.ok) {
        setActionError(serverErrorMessage(payload, 'Could not take this booking. Please try again.'));
        return;
      }
      setRows((prev) => prev.filter((r) => r.id !== id));
      setConfirmedMessage(payload.message ?? 'Booking accepted.');
    } catch {
      setActionError('Could not reach Darshya. Check your connection and try again.');
    } finally {
      setTakingId(null);
    }
  }

  return (
    <section aria-labelledby="open-requests-heading" className="space-y-4">
      <div>
        <h2 id="open-requests-heading" className="text-lg font-semibold text-surface-800">
          Open requests
        </h2>
        <p className="text-surface-500 mt-1 text-sm">
          Paid bookings that no pandit has taken yet. Accept one and it becomes yours; the devotee&apos;s details
          are shown to you after you accept.
        </p>
      </div>

      {confirmedMessage && (
        <div className="rounded-lg border border-tulsi-green-light bg-tulsi-green-light/20 px-4 py-3 text-sm text-tulsi-green flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            {confirmedMessage}{' '}
            <Link href="/priest/bookings" className="underline font-medium">
              See your bookings
            </Link>
          </span>
        </div>
      )}

      {actionError && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-saffron-500" />
        </div>
      ) : loadError ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          <p>{loadError}</p>
          <button type="button" onClick={() => void load()} className={buttonClass('secondary', 'md', 'mt-3')}>
            <RefreshCw className="w-4 h-4" /> Try again
          </button>
        </div>
      ) : !eligible ? (
        <div className="rounded-xl border border-surface-200 bg-white p-5 text-sm text-surface-600">
          <p className="font-medium text-surface-700">Your profile is waiting for approval</p>
          <p className="mt-1">
            Open requests appear here once an admin approves your pandit profile.{' '}
            <Link href="/onboarding/view?role=priest" className="underline text-saffron-700">
              Check your application
            </Link>
          </p>
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-surface-200 bg-white p-5 text-sm text-surface-600">
          <p className="font-medium text-surface-700">No open requests right now</p>
          <p className="mt-1">New paid bookings appear here. Check back during the day.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="rounded-xl border border-surface-200 bg-white p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="font-semibold text-surface-800">{r.pujaName}</p>
                <p className="text-sm text-surface-600 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  {r.templeName}
                  {r.city ? `, ${r.city}` : ''}
                </p>
                <p className="text-sm text-surface-600 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {formatDate(r.scheduledDate)}
                  {r.scheduledTimeSlot ? ` · ${r.scheduledTimeSlot}` : ''}
                </p>
                <p className="text-xs text-surface-500 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  {r.devoteeCount} {r.devoteeCount === 1 ? 'devotee' : 'devotees'}
                  {r.bookingNumber ? ` · ${r.bookingNumber}` : ''}
                </p>
                {formatEarning(r.priestEarningInr) && (
                  <p className="text-sm font-medium text-tulsi-green">You earn {formatEarning(r.priestEarningInr)}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => void accept(r.id)}
                disabled={takingId === r.id}
                className={buttonClass('primary', 'md')}
              >
                {takingId === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Accept this booking
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
