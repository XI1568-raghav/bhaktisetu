'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Loader2, ShieldCheck } from 'lucide-react';
import AuthGuard from '../../../components/AuthGuard';
import CookieSettingsButton from '../../../components/CookieSettingsButton';
import { useAuth } from '../../../lib/auth-context';
import {
  API_BASE_URL,
  DATA_FETCH_TIMEOUT_MS,
  fetchWithTimeout,
  isNetworkFailure,
  NETWORK_ERROR_MESSAGE,
} from '../../../lib/api-config';
import { COMPANY, grievanceOfficerLine, grievanceSlaLine } from '../../../lib/company';

/**
 * LEG-16 (prod sweep 2026-08-12) — DPDP rights were email-only.
 *
 * /privacy section 8 said "To exercise any of these rights, email us at
 * privacy@darshya.online", and company.ts describes that inbox, in its own
 * comment, as aspirational. Meanwhile the backend to do it properly has been
 * shipped since R-Q3-L-001: POST /api/v1/dpdp/dsar, GET /api/v1/dpdp/dsar/mine,
 * POST /api/v1/dpdp/consent, GET /api/v1/dpdp/consent/mine, plus an admin queue
 * sorted by SLA deadline. A repo-wide grep of apps/web for `dpdp` returned zero
 * calls: the endpoints were wired to no UI at all, so the compliance gap was
 * pure wiring.
 *
 * This screen is that wiring. It states the real 30-day statutory SLA the
 * endpoint stamps (`sla_deadline = now() + 30 days`, dpdp.ts:97,119) rather
 * than a number invented here, and it never fabricates: a failed load says so
 * and shows nothing, and a failed submission never claims the request was
 * filed.
 */

type DsarKind = 'access' | 'portability' | 'rectify' | 'erasure';

interface DsarRequest {
  id: string;
  kind: string;
  status: string;
  note: string | null;
  slaDeadline: string | null;
  resolvedAt: string | null;
  resolutionNote: string | null;
  createdAt: string | null;
}

const KINDS: { id: DsarKind; label: string; blurb: string }[] = [
  {
    id: 'access',
    label: 'Get a copy of my data',
    blurb: 'Everything we hold that is linked to your account.',
  },
  {
    id: 'portability',
    label: 'Export my data (machine-readable)',
    blurb: 'The same data as JSON, so you can take it elsewhere.',
  },
  {
    id: 'rectify',
    label: 'Correct something that is wrong',
    blurb: 'Tell us which field is incorrect and what it should say.',
  },
  {
    id: 'erasure',
    label: 'Delete my account and data',
    blurb:
      'Booking and transaction records are kept where Indian tax law requires it; everything else is removed.',
  },
];

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function AccountPrivacyPage() {
  return (
    <AuthGuard>
      <AccountPrivacyInner />
    </AuthGuard>
  );
}

function AccountPrivacyInner() {
  const { session } = useAuth();
  const token = session?.accessToken;

  const [kind, setKind] = useState<DsarKind>('access');
  const [note, setNote] = useState('');
  const [requests, setRequests] = useState<DsarRequest[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [filed, setFiled] = useState<{ id: string; slaDeadline: string | null } | null>(null);

  const loadMine = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetchWithTimeout(
        `${API_BASE_URL}/dpdp/dsar/mine`,
        { headers: { Authorization: `Bearer ${token}` } },
        DATA_FETCH_TIMEOUT_MS,
      );
      if (!res.ok) {
        // Never render an empty history for a failed read — an empty list here
        // reads as "you have never asked us for anything", which is a claim.
        setRequests(null);
        setLoadError(
          res.status === 401 || res.status === 403
            ? 'Your session has expired — sign in again to see your requests.'
            : `We could not load your requests (HTTP ${res.status}). This is a display problem on our side; any request you have filed still stands.`,
        );
        return;
      }
      const data = (await res.json()) as { requests?: DsarRequest[] };
      setRequests(Array.isArray(data.requests) ? data.requests : []);
    } catch (err) {
      setRequests(null);
      setLoadError(
        isNetworkFailure(err)
          ? `${NETWORK_ERROR_MESSAGE} Any request you have already filed still stands.`
          : 'We could not load your requests. This is a display problem on our side; any request you have filed still stands.',
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadMine();
  }, [loadMine]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    setFiled(null);
    try {
      const res = await fetchWithTimeout(
        `${API_BASE_URL}/dpdp/dsar`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(note.trim() ? { kind, note: note.trim() } : { kind }),
        },
        DATA_FETCH_TIMEOUT_MS,
      );
      if (!res.ok) {
        setSubmitError(
          `We could not file that request (HTTP ${res.status}). Nothing has been submitted — try again, or email ${COMPANY.specialtyEmails.privacy ?? COMPANY.supportEmail}.`,
        );
        return;
      }
      const body = (await res.json()) as { id?: string; slaDeadline?: string | null };
      setFiled({ id: body.id ?? '', slaDeadline: body.slaDeadline ?? null });
      setNote('');
      await loadMine();
    } catch (err) {
      setSubmitError(
        isNetworkFailure(err)
          ? `${NETWORK_ERROR_MESSAGE} Nothing has been submitted.`
          : 'We could not file that request. Nothing has been submitted — try again.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-[100dvh] bg-surface-50">
      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
        <h1 className="text-2xl font-semibold text-surface-900">Your data & privacy</h1>
        <p className="mt-2 text-sm leading-relaxed text-surface-700">
          Exercise your rights under the Digital Personal Data Protection Act, 2023 here. We record
          every request with a deadline and answer in writing — you do not have to send an email and
          hope.
        </p>

        <section className="mt-8 rounded-xl border border-surface-200 bg-white p-5">
          <h2 className="text-base font-semibold text-surface-900">Make a request</h2>
          <form className="mt-4 space-y-4" onSubmit={submit}>
            <fieldset className="space-y-3">
              <legend className="text-sm font-medium text-surface-800">What do you need?</legend>
              {KINDS.map((k) => (
                <label key={k.id} className="flex items-start gap-3 text-sm">
                  <input
                    type="radio"
                    name="dsar-kind"
                    value={k.id}
                    checked={kind === k.id}
                    onChange={() => setKind(k.id)}
                    className="mt-1"
                  />
                  <span>
                    <span className="font-medium text-surface-900">{k.label}</span>
                    <span className="block text-surface-600">{k.blurb}</span>
                  </span>
                </label>
              ))}
            </fieldset>

            <div>
              <label htmlFor="dsar-note" className="block text-sm font-medium text-surface-800">
                Anything we should know? (optional)
              </label>
              <textarea
                id="dsar-note"
                value={note}
                maxLength={2000}
                rows={3}
                onChange={(e) => setNote(e.target.value)}
                className="mt-1 w-full rounded-lg border border-surface-300 p-3 text-sm"
                placeholder="e.g. my phone number is wrong on my bookings"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !token}
              className="inline-flex h-11 items-center justify-center rounded-lg bg-saffron-600 px-5 text-sm font-medium text-white disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Filing…
                </>
              ) : (
                'File request'
              )}
            </button>
          </form>

          {submitError && (
            <p
              role="alert"
              data-testid="dsar-submit-error"
              className="mt-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-800"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {submitError}
            </p>
          )}

          {filed && (
            <p
              data-testid="dsar-filed"
              className="mt-4 flex items-start gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900"
            >
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              Request filed. We will answer by {formatDate(filed.slaDeadline)} — the statutory
              deadline recorded against it.
            </p>
          )}
        </section>

        <section className="mt-8 rounded-xl border border-surface-200 bg-white p-5">
          <h2 className="text-base font-semibold text-surface-900">Your requests</h2>

          {loading && (
            <p className="mt-3 flex items-center gap-2 text-sm text-surface-600">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </p>
          )}

          {!loading && loadError && (
            <p
              role="alert"
              data-testid="dsar-load-error"
              className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {loadError}
            </p>
          )}

          {!loading && !loadError && requests && requests.length === 0 && (
            <p data-testid="dsar-empty" className="mt-3 text-sm text-surface-600">
              You have not made any requests yet.
            </p>
          )}

          {!loading && !loadError && requests && requests.length > 0 && (
            <ul className="mt-3 space-y-3" data-testid="dsar-list">
              {requests.map((r) => (
                <li key={r.id} className="rounded-lg border border-surface-200 p-3 text-sm">
                  <p className="font-medium text-surface-900">{r.kind}</p>
                  <p className="text-surface-600">
                    Filed {formatDate(r.createdAt)} · status {r.status} · due by{' '}
                    {formatDate(r.slaDeadline)}
                  </p>
                  {r.resolutionNote && (
                    <p className="mt-1 text-surface-700">Our answer: {r.resolutionNote}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-8 rounded-xl border border-surface-200 bg-white p-5">
          <h2 className="text-base font-semibold text-surface-900">Cookies</h2>
          <p className="mt-2 text-sm text-surface-700">
            Analytics and marketing cookies run only with your consent. Change or withdraw it here —
            it takes the same click that granted it.
          </p>
          <p className="mt-3">
            <CookieSettingsButton />
          </p>
        </section>

        <section className="mt-8 rounded-xl border border-surface-200 bg-white p-5">
          <h2 className="text-base font-semibold text-surface-900">Not happy with our answer?</h2>
          <p className="mt-2 text-sm text-surface-700">{grievanceOfficerLine()}</p>
          <p className="mt-1 text-sm text-surface-700">{grievanceSlaLine()}</p>
        </section>
      </div>
    </div>
  );
}
