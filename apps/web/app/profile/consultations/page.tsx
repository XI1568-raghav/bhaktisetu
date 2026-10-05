'use client';


import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Loader2,
  Phone,
  Calendar,
  Clock,
  IndianRupee,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Sparkles,
} from 'lucide-react';
import AuthGuard from '../../../components/AuthGuard';
import { useAuth } from '../../../lib/auth-context';
import { API_BASE_URL } from '../../../lib/api-config';
import { H1 } from '../../../components/ui/heading-recipe';
import { buttonClass } from '../../../components/ui/button-recipe';
import {
  GENERIC_ERROR_MESSAGE,
  UserFacingError,
  friendlyApiError,
  serverErrorText,
  userFacingMessage,
} from '../../../lib/friendly-error';

/**
 * RES-09 (2026-09-08) — this screen put developer text in a devotee's face and
 * then answered a question it had no answer to.
 *
 *   :78  throw new Error(`Could not load (${res.status})`)
 *   :81  setError(userFacingMessage(e, 'Network error'))
 *   :102 throw new Error(`Cancel ${res.status}${body ? `: ${body.slice(0,140)}` : ''}`)
 *   :105 setCancelError(userFacingMessage(e, 'Could not cancel'))
 *
 * So an expired token read as "Could not load (401)", and a cancel against a
 * gateway that answers HTML spliced 140 characters of `<html><head><title>502
 * Bad Gateway` into a red box. On a dropped connection `e.message` was
 * whatever the browser wrote — "Failed to fetch" on Chrome, "Load failed" on
 * iOS Safari — which no status-code sweep ever sees, because the string is not
 * ours.
 *
 * `friendlyApiError` alone could not be dropped in: it cannot tell a sentence
 * the product wrote from one the browser wrote, so it flattens the good one.
 * `UserFacingError` marks deliberate copy and `userFacingMessage` routes on it.
 */
const LOAD_FALLBACK = 'Could not load your consultations right now. Please try again.';
const CANCEL_FALLBACK = 'Could not cancel this consultation right now. Please try again.';

/**
 * The copy for a status, or the page's own line when the status says nothing
 * useful. `friendlyApiError` classifies off message TEXT, so it is handed the
 * number — 401/403 become "your session has expired", 429 the rate-limit line,
 * 5xx "something went wrong on our side", anything else falls through to the
 * caller's sentence. The number is passed via String() rather than
 * interpolated, so it can never be mistaken for rendered copy.
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
  status: 'pending_payment' | 'confirmed' | 'completed' | 'cancelled' | string;
  roomName: string | null;
  jitsiUrl: string | null;
  scheduledAt: string | null;
  createdAt: string;
};

// P1#4: HttpOnly cookie `darshya_session` is the canonical auth surface.
// Bearer header retained as additive transition fallback (in-memory session
// from auth-context — no localStorage read) while backend rolls out cookie
// issuance. Every fetch below MUST pass `credentials: 'include'` so the
// cross-origin cookie (darshya.online → api.darshya.online) is sent.
function buildAuthHeaders(accessToken: string | undefined): Record<string, string> {
  return accessToken ? { authorization: `Bearer ${accessToken}` } : {};
}

function statusBadge(status: string) {
  switch (status) {
    case 'confirmed':
      return { cls: 'bg-emerald-100 text-emerald-700', label: 'Confirmed' };
    case 'completed':
      return { cls: 'bg-blue-100 text-blue-700', label: 'Completed' };
    case 'cancelled':
      return { cls: 'bg-surface-100 text-surface-600', label: 'Cancelled' };
    case 'pending_payment':
      return { cls: 'bg-amber-100 text-amber-700', label: 'Payment Pending' };
    default:
      return { cls: 'bg-surface-100 text-surface-600', label: status };
  }
}

function ListContent() {
  const { session } = useAuth();
  const [items, setItems] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/consultation/mine`, {
        headers: buildAuthHeaders(session?.accessToken),
        credentials: 'include',
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        // The server's own sentence when it wrote one worth reading; otherwise
        // the copy for THIS status. serverErrorText refuses a non-JSON body and
        // refuses a developer name for the status ("Unauthorized").
        throw new UserFacingError(serverErrorText(body, statusCopy(res.status, LOAD_FALLBACK)));
      }
      const json = (await res.json()) as { consultations?: Consultation[] };
      setItems(json.consultations ?? []);
    } catch (e) {
      setError(userFacingMessage(e, LOAD_FALLBACK));
    } finally {
      setLoading(false);
    }
  }, [session?.accessToken]);

  useEffect(() => { load(); }, [load]);

  async function handleCancel(c: Consultation) {
    if (!confirm(`Cancel consultation ${c.reference}? This cannot be undone.`)) return;
    setCancellingId(c.id);
    setCancelError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/consultation/${c.id}/cancel`, {
        method: 'POST',
        headers: buildAuthHeaders(session?.accessToken),
        credentials: 'include',
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new UserFacingError(serverErrorText(body, statusCopy(res.status, CANCEL_FALLBACK)));
      }
      await load();
    } catch (e) {
      setCancelError(userFacingMessage(e, CANCEL_FALLBACK));
    } finally {
      setCancellingId(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-saffron-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-saffron-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-6">
          <h1 className={H1.portal}>My Consultations</h1>
          <p className="text-sm text-surface-500 mt-1">Past and upcoming astrologer sessions</p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 mb-4">
            {error}
          </div>
        )}
        {cancelError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 mb-4">
            {cancelError}
          </div>
        )}

        {items.length === 0 ? (
          /* RES-09 (2026-09-08): a failed load leaves `items` empty, so this
             told a devotee "No consultations yet" underneath a banner saying
             the list could not be loaded — a claim about their own bookings,
             made from data the page never received. Gated on `error` rather
             than on the emptiness of the array, so a server that genuinely
             returns no consultations still gets the real empty state. */
          error ? null : (
            <div className="bg-white rounded-2xl border border-surface-100 p-10 text-center">
              <Sparkles className="w-12 h-12 text-saffron-400 mx-auto mb-3" />
              <h2 className="text-lg font-semibold text-surface-700 mb-1">No consultations yet</h2>
              <p className="text-sm text-surface-500 mb-6">Book a session with a approved astrologer.</p>
              <Link href="/astrology" className={buttonClass('primary', 'md')}>
                Browse Astrologers
              </Link>
            </div>
          )
        ) : (
          <div className="space-y-3">
            {items.map((c) => {
              const badge = statusBadge(c.status);
              const scheduled = c.scheduledAt ? new Date(c.scheduledAt) : null;
              const isCancelling = cancellingId === c.id;
              const canCancel = c.status === 'pending_payment' || c.status === 'confirmed';
              const canJoin = c.status === 'confirmed' && c.jitsiUrl;

              return (
                <div key={c.id} className="bg-white rounded-xl border border-surface-100 p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="font-semibold text-surface-800">{c.astrologerName}</div>
                      <div className="font-mono text-xs text-surface-400">{c.reference}</div>
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${badge.cls}`}>{badge.label}</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-surface-500 mb-4">
                    <div className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{c.minutes} min</div>
                    <div className="flex items-center gap-1"><IndianRupee className="w-3.5 h-3.5" />₹{c.amountInr}</div>
                    {scheduled && (
                      <div className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />
                        {scheduled.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/consultation/${c.id}/success`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-surface-200 text-surface-700 hover:bg-surface-50"
                    >
                      Details
                    </Link>
                    {canJoin && (
                      <a
                        href={c.jitsiUrl!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium rounded-lg"
                      >
                        <Phone className="w-3 h-3" /> Join
                      </a>
                    )}
                    {canCancel && (
                      <button
                        type="button"
                        onClick={() => handleCancel(c)}
                        disabled={isCancelling}
                        className="inline-flex items-center gap-1 px-3 py-1.5 border border-red-200 text-red-600 text-xs font-medium rounded-lg hover:bg-red-50 disabled:opacity-60"
                      >
                        {isCancelling ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                        Cancel
                      </button>
                    )}
                    {c.status === 'completed' && (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Session closed
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-8 text-center">
          <Link href="/profile" className="text-sm text-surface-500 hover:text-saffron-600">
            ← Back to profile
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function MyConsultationsPage() {
  return (
    <AuthGuard>
      <ListContent />
    </AuthGuard>
  );
}
