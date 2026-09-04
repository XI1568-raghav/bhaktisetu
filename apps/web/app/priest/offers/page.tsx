'use client';

/**
 * `/priest/offers` — the pandit-facing surface for the tiered dispatch engine
 * (PJ-04, 2026-08-13).
 *
 * The engine shipped on 2026-08-04 with three endpoints and no screen:
 * `GET /priest/offers`, `POST /priest/offers/:bookingId/accept` and
 * `POST /priest/offers/:bookingId/decline` (apps/api/src/routes/priest.ts).
 * Nothing in apps/web called any of them. /priest/bookings could not stand in,
 * because priest.service.getAssignedBookings filters on `{ priestId }` and an
 * offered booking has no priestId until it is accepted — so a T1/T2/T3 offer
 * was invisible in the portal by construction, and every instant / 1-hour
 * booking timed out to admin escalation while the pandit's dashboard toggle
 * still said "Turn on to receive instant puja requests near you".
 *
 * The WhatsApp one-tap link (`/priest/bookings/:id?accept=1`) now redirects
 * here carrying `?booking=<id>` — see app/priest/bookings/[id]/page.tsx for why
 * it cannot land on the booking detail page instead.
 *
 * Honesty rules this screen holds to: an offer is rendered only if the server
 * returned it; a failed load says so and offers a retry rather than an empty
 * list; and an accept is only reported as confirmed after the server confirms
 * it, quoting the server's own message.
 */

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../../../lib/auth-context';
import { API_BASE_URL } from '../../../lib/api-config';
import { H1 } from '../../../components/ui/heading-recipe';
import { buttonClass } from '../../../components/ui/button-recipe';
import { UserFacingError, serverErrorText } from '../../../lib/friendly-error';

interface OfferBooking {
  id: string;
  bookingNumber: string | null;
  scheduledDate: string | null;
  scheduledTimeSlot: string | null;
  priceAmount: string | number | null;
  pujaType: { name: string } | null;
  temple: { name: string; city: string } | null;
}

interface DispatchOffer {
  id: string;
  bookingId: string;
  sentAt: string;
  expiresAt: string;
  booking: OfferBooking | null;
}

function formatDate(value: string | null): string {
  if (!value) return 'Date to be confirmed';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'Date to be confirmed';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatPrice(value: string | number | null): string {
  if (value === null || value === undefined) return '—';
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return '—';
  return `₹${n.toLocaleString('en-IN')}`;
}

/** Whole minutes left, floored at 0. Rendered as text, not a live countdown —
 *  a ticking timer here would re-render the whole list every second for no
 *  decision the pandit can make faster. */
function minutesLeft(expiresAt: string): number {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (!Number.isFinite(ms)) return 0;
  return Math.max(0, Math.floor(ms / 60000));
}

function PriestOffersInner() {
  const { session } = useAuth();
  const searchParams = useSearchParams();
  const deepLinkedBookingId = searchParams.get('booking');

  const [offers, setOffers] = useState<DispatchOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionOn, setActionOn] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<{ bookingId: string; message: string } | null>(null);

  const fetchOffers = useCallback(async () => {
    if (!session?.accessToken) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/priest/offers`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        // RES-09: the status code plus 140 raw characters of the body were
        // rendered to the pandit. The server's own sentence survives; the
        // developer framing does not.
        throw new UserFacingError(
          serverErrorText(detail, 'Could not load your offers. Please try again.'),
        );
      }
      const data = await res.json();
      setOffers(Array.isArray(data?.offers) ? data.offers : []);
    } catch (err) {
      // Never fall back to an empty list here: "no offers" and "we could not
      // ask" look identical to the pandit and only one of them means he can
      // stop watching his phone.
      setLoadError(
        err instanceof TypeError
          ? 'Could not reach Darshya. Check your connection and try again.'
          : err instanceof Error && err.message
            ? err.message
            : 'Could not load your offers. Please try again.',
      );
      setOffers([]);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    void fetchOffers();
  }, [fetchOffers]);

  async function respond(bookingId: string, action: 'accept' | 'decline') {
    setActionOn(`${bookingId}-${action}`);
    setActionError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/priest/offers/${bookingId}/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.accessToken ?? ''}` },
      });
      let payload: { message?: string; error?: string } = {};
      try {
        payload = await res.json();
      } catch {
        // A body-less response is fine; res.ok is still the source of truth.
      }
      if (!res.ok) {
        // The server is the only thing that knows whether the offer is still
        // open — another pandit may have taken it a second ago.
        setActionError(payload.error ?? `Could not ${action} this offer. Please try again.`);
        return;
      }
      setOffers((prev) => prev.filter((o) => o.bookingId !== bookingId));
      if (action === 'accept') {
        setConfirmed({
          bookingId,
          message: payload.message ?? 'Booking confirmed.',
        });
      }
    } catch {
      setActionError('Could not reach Darshya. Check your connection and try again.');
    } finally {
      setActionOn(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-saffron-500" />
      </div>
    );
  }

  const deepLinkMissing =
    !!deepLinkedBookingId &&
    !loadError &&
    !offers.some((o) => o.bookingId === deepLinkedBookingId) &&
    confirmed?.bookingId !== deepLinkedBookingId;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className={H1.portal}>Puja Offers</h1>
        <p className="text-surface-500 mt-1 text-sm">
          Requests sent to you by the dispatch engine. Accept one and the booking becomes yours.
        </p>
      </div>

      {confirmed && (
        <div className="rounded-lg border border-tulsi-green-light bg-tulsi-green-light/20 px-4 py-3 text-sm text-tulsi-green flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            {confirmed.message}{' '}
            <Link
              href={`/priest/bookings/view?id=${confirmed.bookingId}`}
              className="underline font-medium"
            >
              Open the booking
            </Link>
          </span>
        </div>
      )}

      {actionError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {deepLinkMissing && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
          <Clock className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            That offer is no longer open — it either expired or another pandit accepted it first.
          </span>
        </div>
      )}

      {loadError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
          <p className="text-sm text-red-700">{loadError}</p>
          <button
            onClick={() => void fetchOffers()}
            className={buttonClass('primary', 'md', 'mt-4')}
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>
        </div>
      ) : offers.length === 0 ? (
        <div className="rounded-xl border border-surface-200 bg-white p-8 text-center">
          <Clock className="w-8 h-8 text-surface-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-surface-700">No open offers right now</p>
          <p className="text-xs text-surface-500 mt-1">
            Turn on availability from your dashboard to receive instant requests near you.
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {offers.map((o) => {
            const b = o.booking;
            const highlighted = deepLinkedBookingId === o.bookingId;
            const left = minutesLeft(o.expiresAt);
            return (
              <li
                key={o.id}
                className={`rounded-xl border bg-white p-5 ${
                  highlighted ? 'border-saffron-400 ring-2 ring-saffron-100' : 'border-surface-200'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-surface-800">
                      {b?.pujaType?.name ?? 'Puja booking'}
                    </p>
                    {b?.bookingNumber && (
                      <p className="text-xs text-surface-400 mt-0.5">{b.bookingNumber}</p>
                    )}
                  </div>
                  <p className="text-lg font-bold text-surface-800">
                    {formatPrice(b?.priceAmount ?? null)}
                  </p>
                </div>

                <div className="mt-3 grid gap-2 text-sm text-surface-600">
                  <p className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-surface-400" />
                    {formatDate(b?.scheduledDate ?? null)}
                    {b?.scheduledTimeSlot ? ` · ${b.scheduledTimeSlot}` : ''}
                  </p>
                  <p className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-surface-400" />
                    {b?.temple ? `${b.temple.name}, ${b.temple.city}` : 'At the devotee’s home'}
                  </p>
                  <p className="flex items-center gap-2 text-xs text-surface-500">
                    <Clock className="w-4 h-4 text-surface-400" />
                    {left > 0
                      ? `Expires in about ${left} minute${left === 1 ? '' : 's'}`
                      : 'Expiring now'}
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => void respond(o.bookingId, 'accept')}
                    disabled={actionOn !== null}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-tulsi-green-dark text-white font-medium text-sm rounded-lg hover:opacity-90 transition disabled:opacity-50"
                  >
                    {actionOn === `${o.bookingId}-accept` ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    Accept
                  </button>
                  <button
                    onClick={() => void respond(o.bookingId, 'decline')}
                    disabled={actionOn !== null}
                    className="inline-flex items-center gap-2 px-4 py-2 border border-surface-200 text-surface-600 font-medium text-sm rounded-lg hover:bg-surface-50 transition disabled:opacity-50"
                  >
                    {actionOn === `${o.bookingId}-decline` ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                    Decline
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function PriestOffersPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-saffron-500" />
        </div>
      }
    >
      <PriestOffersInner />
    </Suspense>
  );
}
