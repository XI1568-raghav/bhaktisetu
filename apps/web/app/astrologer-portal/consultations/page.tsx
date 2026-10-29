'use client';

import { useState, useEffect, useCallback } from 'react';
import {
 MessageSquare,
 Video,
 Calendar,
 Clock,
 Loader2,
 CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../../lib/auth-context';
import { UserFacingError, serverErrorText, userFacingMessage } from '../../../lib/friendly-error';
import { API_BASE_URL } from '../../../lib/api-config';
import { H1 } from '../../../components/ui/heading-recipe';
import { formatIst } from '../../../lib/consultation-time';

/**
 * AW-01 (2026-08-12, P0) — this page could never show a consultation the
 * astrologer had been PAID for.
 *
 * It fetched `GET /astrology/consultations?role=astrologer`, served by
 * astrology.service.ts:859-863 from an in-memory `this.sessions` Map that only
 * the free `/astrology/consult/start` trial path ever writes to (and which
 * empties on every API restart). The PAID flow — POST /consultation/book →
 * /verify-payment — persists to the raw-SQL `astrologer_consultations` table
 * instead. Verified live for the real onboarded astrologer: the dashboard
 * endpoint returned the confirmed ₹375 row while this one returned
 * {"consultations":[]} at the same moment.
 *
 * It now reads `GET /consultation/astrologer/mine`, the DB-backed list, whose
 * own AW-01 half was that it filtered on the User UUID while /book writes the
 * AstrologerProfile.id (fixed in routes/consultation.ts).
 *
 * The Join and End actions were repointed to the DB-backed endpoints too. The
 * old astrologer-side Cancel button is gone: POST /consultation/:id/cancel is
 * gated on `row.user_id === caller` (devotee-only), so for an astrologer it was
 * a guaranteed 403 dressed up as an action. A button that cannot work is worse
 * than no button.
 */

type TabKey = 'upcoming' | 'past';

type ConsultationStatus = 'pending_payment' | 'confirmed' | 'completed' | 'cancelled';

/** Mirrors GET /consultation/astrologer/mine exactly. */
interface Consultation {
  id: string;
  reference: string;
  astrologerName?: string | null;
  minutes?: number | null;
  amountInr?: number | null;
  currency?: string | null;
  status: ConsultationStatus | string;
  roomName?: string | null;
  jitsiUrl?: string | null;
  scheduledAt?: string | null;
  createdAt?: string | null;
  paidAt?: string | null;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

// IST, labelled: this used the browser's zone with no label, so the time an
// astrologer read could differ from the one the devotee booked in.
function formatDateTime(dateStr: string | null | undefined): string {
  return formatIst(dateStr, 'Time to be agreed');
}

/** The instant a row is "for": its slot, else when it was paid, else created. */
function sortKey(c: Consultation): number {
  const t = new Date(c.scheduledAt ?? c.paidAt ?? c.createdAt ?? 0).getTime();
  return Number.isFinite(t) ? t : 0;
}

function getStatusConfig(status: string) {
  const map: Record<string, { label: string; cls: string }> = {
    pending_payment: { label: 'Awaiting payment', cls: 'bg-amber-100 text-amber-700' },
    confirmed:       { label: 'Confirmed',        cls: 'bg-blue-100 text-blue-700' },
    completed:       { label: 'Completed',        cls: 'bg-green-100 text-green-700' },
    cancelled:       { label: 'Cancelled',        cls: 'bg-surface-100 text-surface-600' },
  };
  return map[status] ?? { label: status, cls: 'bg-surface-100 text-surface-600' };
}

export default function AstrologerConsultationsPage() {
  const { session } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('upcoming');
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchConsultations = useCallback(async () => {
    if (!session?.accessToken) {
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/consultation/astrologer/mine?limit=100`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        // RES-09: this is the finding's own example — the astrologer was
        // shown `API 500: {"error":"Internal Server Error"}`, and on a
        // gateway failure 120 characters of raw HTML.
        throw new UserFacingError(
          serverErrorText(body, 'Could not load consultations. Please try again.'),
          res.status,
        );
      }
      const data = await res.json();
      const raw: Consultation[] = Array.isArray(data.consultations) ? data.consultations : [];
      setConsultations(raw);
    } catch (e) {
      setError(userFacingMessage(e, 'Could not load consultations. Please try again.'));
      setConsultations([]);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    fetchConsultations();
  }, [fetchConsultations]);

  // The room is minted by /verify-payment and returned on the row, so there is
  // nothing to "start" — open it. If the row carries no room the payment has not
  // settled, and we say that instead of opening a URL we invented.
  function handleJoin(c: Consultation) {
    setActionError(null);
    if (!c.jitsiUrl) {
      setActionError('No room has been created for this consultation yet.');
      return;
    }
    window.open(c.jitsiUrl, '_blank', 'noopener,noreferrer');
  }

  async function handleComplete(c: Consultation) {
    // Ending a session releases the earning for payout and cannot be taken back,
    // and the button sits next to Join: one stray click used to be final.
    if (!window.confirm(`Mark ${c.reference} as completed? This releases your earning and cannot be undone.`)) return;
    setActionId(c.id);
    setActionError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/consultation/${c.id}/complete`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${session?.accessToken ?? ''}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new UserFacingError(
          serverErrorText(body, 'We could not update that consultation.'),
          res.status,
        );
      }
      await fetchConsultations();
    } catch (e) {
      setActionError(userFacingMessage(e, 'We could not update that consultation. Please try again.'));
    } finally {
      setActionId(null);
    }
  }

  // Only sessions a devotee actually paid for. An older API still returns
  // abandoned checkouts (pending_payment) here, and they read "Devotee paid".
  // Upcoming runs soonest-first (the API list is newest-first, so the next
  // session used to be at the bottom); past runs most-recent-first.
  const upcoming = consultations
    .filter((c) => c.status === 'confirmed')
    .sort((x, y) => sortKey(x) - sortKey(y));
  const past = consultations
    .filter((c) => c.status === 'completed' || (c.status === 'cancelled' && !!c.paidAt))
    .sort((x, y) => sortKey(y) - sortKey(x));
  const displayed = activeTab === 'upcoming' ? upcoming : past;

  const tabs = [
    { key: 'upcoming' as TabKey, label: 'Upcoming', count: upcoming.length },
    { key: 'past' as TabKey, label: 'Past', count: past.length },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className={H1.portal}>Consultations</h1>
        <p className="text-surface-500 mt-1">Manage your upcoming and past sessions. All times are IST.</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-center justify-between gap-3">
          <span>{error}</span>
          {/* RES-09: the error state offered no way out. */}
          <button
            type="button"
            onClick={() => void fetchConsultations()}
            className="shrink-0 text-xs font-medium text-red-700 underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}
      {actionError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {actionError}
        </div>
      )}

      <div className="flex gap-1 overflow-x-auto rounded-xl bg-white p-1 border border-surface-100">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.key ? 'bg-purple-600 text-white shadow-sm' : 'text-surface-600 hover:bg-surface-50'
            }`}
          >
            {tab.label}
            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
              activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-surface-100 text-surface-500'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          <span className="ml-3 text-surface-500">Loading consultations...</span>
        </div>
      ) : displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-surface-100 bg-white py-16">
          <MessageSquare className="w-12 h-12 text-surface-300 mb-4" />
          <h3 className="text-lg font-semibold text-surface-700">No {activeTab} consultations</h3>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map((consultation) => {
            const statusCfg = getStatusConfig(consultation.status);
            const isActing = actionId === consultation.id;
            const isPaid = consultation.status === 'confirmed';
            const amount = Number(consultation.amountInr);

            return (
              <div key={consultation.id} className="bg-white rounded-xl border border-surface-100 p-5 hover:border-purple-200 transition-all">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center shrink-0">
                    <Video className="w-5 h-5 text-purple-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="text-base font-semibold text-surface-800">{consultation.reference}</h3>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusCfg.cls}`}>{statusCfg.label}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-surface-400">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDateTime(consultation.scheduledAt)}</span>
                      {typeof consultation.minutes === 'number' && (
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{consultation.minutes} min</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0 flex flex-col gap-2 items-end">
                    {Number.isFinite(amount) && amount > 0 && (
                      <>
                        <p className="text-sm font-bold text-surface-800">{formatCurrency(amount)}</p>
                        <p className="text-xs text-surface-400 -mt-1">Devotee paid</p>
                      </>
                    )}
                    {isPaid && (
                      <button
                        onClick={() => handleJoin(consultation)}
                        disabled={isActing}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-white text-xs font-medium rounded-lg bg-purple-600 hover:bg-purple-700 transition-colors disabled:opacity-60"
                      >
                        <Video className="w-3 h-3" /> Join
                      </button>
                    )}
                    {isPaid && (
                      <button
                        onClick={() => handleComplete(consultation)}
                        disabled={isActing}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-white text-xs font-medium rounded-lg bg-green-600 hover:bg-green-700 transition-colors disabled:opacity-60"
                      >
                        {isActing ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />} End
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
