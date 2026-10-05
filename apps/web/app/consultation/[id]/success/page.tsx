'use client';


import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, Loader2, Phone, Calendar, Clock, IndianRupee, AlertCircle, XCircle } from 'lucide-react';
import AuthGuard from '../../../../components/AuthGuard';
import { useAuth } from '../../../../lib/auth-context';
import { API_BASE_URL } from '../../../../lib/api-config';
import { buttonClass } from '../../../../components/ui/button-recipe';
import { H1 } from '../../../../components/ui/heading-recipe';
import {
  GENERIC_ERROR_MESSAGE,
  UserFacingError,
  friendlyApiError,
  serverErrorText,
  userFacingMessage,
} from '../../../../lib/friendly-error';

/**
 * RES-09 (2026-09-08) — the same two defects as /profile/consultations, on the
 * screen a devotee lands on straight after paying.
 *
 *   :57 throw new Error(`Cancel ${res.status}${body ? `: ${body.slice(0,140)}` : ''}`)
 *   :63 setCancelError(userFacingMessage(e, 'Could not cancel'))
 *   :79 throw new Error(`Could not load consultation (${res.status})`)
 *   :84 setError(userFacingMessage(err, 'Could not load consultation.'))
 *
 * The cancel path spliced up to 140 characters of the RESPONSE BODY into the
 * message and rendered it, so a gateway answering HTML put "<html><head><title>
 * 502 Bad Gateway" on a devotee's confirmation page. The load path printed the
 * status. On a dropped connection both printed whatever the browser wrote.
 */
const LOAD_FALLBACK = 'Could not load this booking right now. Please try again.';
const CANCEL_FALLBACK = 'Could not cancel this consultation right now. Please try again.';

/**
 * The copy for a status, or the page's own line when the status says nothing
 * useful. The number is passed via String() rather than interpolated, so it
 * reaches the classifier and never a screen.
 */
function statusCopy(status: number, fallback: string): string {
  const classified = friendlyApiError(new Error(String(status))).message;
  return classified === GENERIC_ERROR_MESSAGE ? fallback : classified;
}

type Consultation = {
  id: string;
  reference: string;
  astrologerId: string;
  astrologerName: string;
  minutes: number;
  amountInr: number;
  currency: string;
  status: string;
  roomName: string | null;
  jitsiUrl: string | null;
  scheduledAt: string | null;
  createdAt: string;
};

// P1#4: HttpOnly cookie `darshya_session` is canonical. Bearer header retained
// as additive transition fallback (in-memory session — no localStorage read).
// Every fetch MUST pass `credentials: 'include'` for cross-origin cookie send.
function buildAuthHeaders(accessToken: string | undefined): Record<string, string> {
  return accessToken ? { authorization: `Bearer ${accessToken}` } : {};
}

function SuccessContent() {
  const { session } = useAuth();
  const params = useParams();
  const consultationId = String(params?.id ?? '');
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  async function handleCancel() {
    if (!consultation) return;
    if (!confirm(`Cancel ${consultation.reference}? Refund (if eligible) takes 5-7 business days.`)) return;
    setCancelling(true);
    setCancelError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/consultation/${consultation.id}/cancel`, {
        method: 'POST',
        headers: buildAuthHeaders(session?.accessToken),
        credentials: 'include',
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new UserFacingError(serverErrorText(body, statusCopy(res.status, CANCEL_FALLBACK)));
      }
      setConsultation({ ...consultation, status: 'cancelled' });
    } catch (e) {
      setCancelError(userFacingMessage(e, CANCEL_FALLBACK));
    } finally {
      setCancelling(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/consultation/${consultationId}`, {
          headers: buildAuthHeaders(session?.accessToken),
          credentials: 'include',
        });
        if (!res.ok) {
          const body = await res.text().catch(() => '');
          throw new UserFacingError(serverErrorText(body, statusCopy(res.status, LOAD_FALLBACK)));
        }
        const json = (await res.json()) as { consultation?: Consultation };
        if (!cancelled) {
          if (json.consultation) setConsultation(json.consultation);
          else setError('Consultation not found.');
        }
      } catch (err) {
        if (!cancelled) setError(userFacingMessage(err, LOAD_FALLBACK));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [consultationId, session?.accessToken]);

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-saffron-50">
        <Loader2 className="w-8 h-8 text-saffron-600 animate-spin" />
      </div>
    );
  }

  if (error || !consultation) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-saffron-50 px-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-surface-700 mb-2">Could not load booking</h2>
          <p className="text-surface-500 mb-6">{error ?? 'Booking not found.'}</p>
          <Link href="/astrology" className={buttonClass('primary', 'md')}>
            Browse Astrologers
          </Link>
        </div>
      </div>
    );
  }

  const confirmed = consultation.status === 'confirmed';
  const scheduled = consultation.scheduledAt ? new Date(consultation.scheduledAt) : null;

  return (
    <div className="min-h-[100dvh] bg-saffron-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl border border-surface-100 p-8 shadow-sm">
          <div className="flex flex-col items-center text-center mb-8">
            {confirmed ? (
              <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-3" />
            ) : (
              <AlertCircle className="w-16 h-16 text-amber-500 mb-3" />
            )}
            <h1 className={`${H1.portal} mb-1`}>
              {confirmed ? 'Consultation Booked!' : 'Payment Pending'}
            </h1>
            <p className="text-sm text-surface-500">
              {confirmed
                ? 'Your booking is confirmed and is on your astrologer’s dashboard. Join the room below when they are online.'
                : 'Status is still being updated. Refresh in a moment.'}
            </p>
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between text-sm py-3 border-b border-surface-100">
              <span className="text-surface-500">Reference</span>
              <span className="font-mono font-semibold text-surface-700">{consultation.reference}</span>
            </div>
            <div className="flex items-center justify-between text-sm py-3 border-b border-surface-100">
              <span className="text-surface-500">Astrologer</span>
              <span className="font-semibold text-surface-700">{consultation.astrologerName}</span>
            </div>
            <div className="flex items-center justify-between text-sm py-3 border-b border-surface-100">
              <span className="text-surface-500 flex items-center gap-1.5"><Clock className="w-4 h-4" /> Duration</span>
              <span className="font-semibold text-surface-700">{consultation.minutes} minutes</span>
            </div>
            <div className="flex items-center justify-between text-sm py-3 border-b border-surface-100">
              <span className="text-surface-500 flex items-center gap-1.5"><IndianRupee className="w-4 h-4" /> Paid</span>
              <span className="font-semibold text-surface-700">₹{consultation.amountInr}</span>
            </div>
            {scheduled && (
              <div className="flex items-center justify-between text-sm py-3 border-b border-surface-100">
                <span className="text-surface-500 flex items-center gap-1.5"><Calendar className="w-4 h-4" /> Scheduled</span>
                <span className="font-semibold text-surface-700">
                  {scheduled.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
              </div>
            )}
          </div>

          {confirmed && consultation.jitsiUrl ? (
            <a
              href={consultation.jitsiUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-green-500 text-white font-bold rounded-xl shadow-md shadow-emerald-500/25 hover:from-emerald-600 hover:to-green-600"
            >
              <Phone className="w-4 h-4" /> Join Consultation Room
            </a>
          ) : (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className={buttonClass('primary', 'md', 'w-full')}
            >
              Refresh Status
            </button>
          )}

          <p className="text-xs text-surface-400 text-center mt-4">
            The room link is always on this page. If your astrologer does not join, cancel below for a refund, available within 24 hours of paying.
          </p>

          {consultation.status !== 'cancelled' && consultation.status !== 'completed' && (
            <div className="mt-4 border-t border-surface-100 pt-4">
              {cancelError && (
                <p className="text-xs text-red-600 text-center mb-2">{cancelError}</p>
              )}
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelling}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-red-200 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 disabled:opacity-60"
              >
                {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                Cancel consultation
              </button>
              <p className="text-xs text-surface-400 text-center mt-2">
                Refund eligibility: full refund up to 24h before scheduled time. Within 24h, refund only if astrologer no-show.
              </p>
            </div>
          )}
        </div>

        <div className="text-center mt-6">
          <Link href="/astrology" className="text-sm text-surface-500 hover:text-saffron-600">
            ← Back to astrologers
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ConsultationSuccessPage() {
  return (
    <AuthGuard>
      <SuccessContent />
    </AuthGuard>
  );
}
