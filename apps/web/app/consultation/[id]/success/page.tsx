'use client';

export const runtime = 'edge';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, Loader2, Phone, Calendar, Clock, IndianRupee, AlertCircle, XCircle } from 'lucide-react';
import AuthGuard from '../../../../components/AuthGuard';
import { useAuth } from '../../../../lib/auth-context';
import { API_BASE_URL } from '../../../../lib/api-config';

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
        throw new Error(`Cancel ${res.status}${body ? `: ${body.slice(0, 140)}` : ''}`);
      }
      setConsultation({ ...consultation, status: 'cancelled' });
    } catch (e) {
      setCancelError(e instanceof Error ? e.message : 'Could not cancel');
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
        if (!res.ok) throw new Error(`Could not load consultation (${res.status})`);
        const json = (await res.json()) as { consultation?: Consultation };
        if (!cancelled) {
          if (json.consultation) setConsultation(json.consultation);
          else setError('Consultation not found.');
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load consultation.');
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
          <Link href="/astrology" className="inline-flex items-center gap-2 px-6 py-3 bg-saffron-600 text-white font-medium rounded-lg hover:bg-saffron-700">
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
            <h1 className="text-2xl font-bold text-surface-800 mb-1">
              {confirmed ? 'Consultation Booked!' : 'Payment Pending'}
            </h1>
            <p className="text-sm text-surface-500">
              {confirmed
                ? 'Your astrologer has been notified. Join the room when ready.'
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
              className="w-full px-6 py-3.5 bg-saffron-600 text-white font-bold rounded-xl hover:bg-saffron-700"
            >
              Refresh Status
            </button>
          )}

          <p className="text-xs text-surface-400 text-center mt-4">
            Room link also emailed to you. Refund if astrologer doesn't join within 10 min.
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
