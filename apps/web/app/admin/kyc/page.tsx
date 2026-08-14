'use client';

/**
 * /admin/kyc — provider KYC review.
 *
 * AO-03 (prod sweep 2026-08-12, P0): this route returned HTTP 404. The API's
 * KYC queue and decision endpoints were live and had no screen, so the only
 * way to verify a provider was a hand-written PATCH.
 *
 * That is worse than a missing page. `payout.service` gates BOTH payout paths
 * on `provider_kyc.verified`: requestPayout throws "Your KYC is pending
 * verification…" and the weekly settlement sweep skips anyone unverified.
 * Nothing in the codebase could set that column to true until 2026-08-12, so
 * every pandit, astrologer, wellness instructor, store owner and temple
 * manager who earned money was permanently told their KYC was pending. This
 * screen is the only writer of that flag.
 *
 * It does not, and cannot, move money — the bank rail (RazorpayX / Cashfree)
 * is still owner-gated. Verifying unblocks the request, not the transfer.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, BadgeCheck, CheckCircle2, Landmark, Loader2, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../../lib/auth-context';
import {
  listKycSubmissions,
  decideKyc,
  type KycQueueStatus,
  type KycSubmission,
} from './kyc-api';

const TABS: Array<{ key: KycQueueStatus; label: string; blurb: string }> = [
  { key: 'pending', label: 'Pending', blurb: 'Submitted, never decided. These providers cannot withdraw.' },
  { key: 'verified', label: 'Verified', blurb: 'Payouts unlocked. Reject to freeze withdrawals again.' },
  { key: 'rejected', label: 'Rejected', blurb: 'Turned down with a reason. Verify once the provider resubmits.' },
];

function formatDay(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

type DialogMode = 'verify' | 'reject';

export default function AdminKycPage() {
  const { session } = useAuth();
  const token = session?.accessToken;

  const [tab, setTab] = useState<KycQueueStatus>('pending');
  const [submissions, setSubmissions] = useState<KycSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [queueError, setQueueError] = useState<string | null>(null);

  const [dialog, setDialog] = useState<{ mode: DialogMode; target: KycSubmission } | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Stale closure guard — a double-clicked confirm must not send two decisions.
  const inFlight = useRef(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setQueueError(null);
      try {
        const rows = await listKycSubmissions(token, tab);
        if (!cancelled) setSubmissions(rows);
      } catch (err) {
        if (!cancelled) {
          setSubmissions([]);
          setQueueError(err instanceof Error ? err.message : 'Could not load the KYC queue.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, tab]);

  const openDialog = useCallback((mode: DialogMode, target: KycSubmission) => {
    // The API 409s a verify with no bank account on file, but only after the
    // operator has decided. Refuse here, where it is still a decision.
    if (mode === 'verify' && !target.hasBank) {
      setDialog(null);
      setSuccessMessage(null);
      setActionError(
        `${target.fullName} has no bank account on file, so verifying would unlock a payout with nowhere to send the money. Ask them to resubmit KYC with bank details.`,
      );
      return;
    }
    setDialog({ mode, target });
    setReason('');
    setActionError(null);
    setSuccessMessage(null);
  }, []);

  const closeDialog = useCallback(() => {
    if (inFlight.current) return;
    setDialog(null);
    setReason('');
    setActionError(null);
  }, []);

  const confirmDecision = useCallback(async () => {
    if (!dialog || inFlight.current) return;
    const { mode, target } = dialog;
    const why = reason.trim();

    if (mode === 'reject' && why.length < 3) {
      setActionError(
        'Enter why this submission is being rejected. The API requires it, and it is the only thing the provider can be told.',
      );
      return;
    }

    inFlight.current = true;
    setSubmitting(true);
    setActionError(null);
    setSuccessMessage(null);
    try {
      const result = await decideKyc(token, target.userId, mode, mode === 'reject' ? why : undefined);
      const expected = mode === 'verify';
      if (result.verified !== expected) {
        throw new Error(
          `The server reports this provider as ${result.verified ? 'verified' : 'not verified'}, which is not the decision that was made. Reload the queue before deciding again.`,
        );
      }

      // Prove it persisted rather than assuming it did: the row must have left
      // the list it was decided from.
      let refreshed: KycSubmission[] | null = null;
      try {
        refreshed = await listKycSubmissions(token, tab);
      } catch {
        refreshed = null;
      }
      if (refreshed) {
        setSubmissions(refreshed);
        if (refreshed.some((s) => s.userId === target.userId)) {
          throw new Error(
            `The server accepted the decision, but ${target.fullName} is still pending in this queue. Reload and check before deciding again.`,
          );
        }
      }
      const caveat = refreshed ? '' : ' The queue could not be refreshed — reload to confirm.';

      setSuccessMessage(
        mode === 'verify'
          ? `${target.fullName} verified — payout requests are now unlocked for this provider.${caveat}`
          : `${target.fullName}'s KYC was rejected. Payouts stay blocked until they resubmit.${caveat}`,
      );
      setDialog(null);
      setReason('');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not record this KYC decision.');
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }, [dialog, reason, tab, token]);

  const activeTab = TABS.find((t) => t.key === tab);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-surface-800">Provider KYC</h1>
        <p className="text-sm text-surface-500 mt-0.5">
          Verify a provider&apos;s identity and bank details. Payout requests stay blocked until this
          is done.
        </p>
      </div>

      {successMessage && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
        >
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Page-level errors only exist while no dialog is open, so there is
          never more than one alert on screen at a time. */}
      {!dialog && actionError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]">
        <div className="px-5 py-4 border-b border-[var(--color-border)]">
          <h2 className="text-sm font-semibold text-surface-800 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-saffron-600" />
            KYC queue
          </h2>
          <p className="text-xs text-surface-400 mt-0.5">{activeTab?.blurb}</p>
        </div>

        <div className="flex flex-wrap gap-1.5 px-5 py-3 border-b border-[var(--color-border)]">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                tab === t.key
                  ? 'bg-saffron-50 text-saffron-700 border border-saffron-200'
                  : 'text-surface-500 border border-transparent hover:bg-surface-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {queueError && (
          <div className="mx-5 mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              KYC queue unavailable — {queueError}. An empty list here is not evidence that nobody is
              waiting.
            </span>
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center">
            <Loader2 className="w-5 h-5 text-surface-400 mx-auto mb-2 animate-spin" />
            <p className="text-sm text-surface-500">Loading KYC submissions…</p>
          </div>
        ) : submissions.length === 0 ? (
          <p className="text-sm text-surface-400 py-12 text-center">
            No KYC submissions in this view.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="text-left py-2.5 px-5 text-xs font-medium text-surface-500 uppercase tracking-wide">Provider</th>
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-surface-500 uppercase tracking-wide">Submitted</th>
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-surface-500 uppercase tracking-wide">Bank</th>
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-surface-500 uppercase tracking-wide">State</th>
                  <th className="text-right py-2.5 px-5 text-xs font-medium text-surface-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((s, i) => (
                  <tr
                    key={s.userId}
                    className={`border-b border-[var(--color-border)] last:border-0 ${i % 2 === 1 ? 'bg-surface-50/30' : ''}`}
                  >
                    <td className="py-2.5 px-5">
                      <p className="font-medium text-surface-800 truncate max-w-[240px]">{s.fullName}</p>
                      {s.email && <p className="text-xs text-surface-400 truncate max-w-[240px]">{s.email}</p>}
                    </td>
                    <td className="py-2.5 px-4 text-surface-500">{formatDay(s.submittedAt)}</td>
                    <td className="py-2.5 px-4">
                      {s.hasBank ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                          <Landmark className="w-3 h-3" />
                          On file
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
                          <AlertTriangle className="w-3 h-3" />
                          Missing
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4">
                      {s.verified ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                          <BadgeCheck className="w-3 h-3" />
                          Verified {s.verifiedAt ? `· ${formatDay(s.verifiedAt)}` : ''}
                        </span>
                      ) : s.rejectionReason ? (
                        <span className="inline-flex flex-col gap-0.5">
                          <span className="inline-flex w-fit items-center px-2 py-0.5 rounded-full text-xs font-medium bg-surface-100 text-surface-600">
                            Rejected
                          </span>
                          <span className="text-xs text-surface-400 max-w-[220px] truncate">
                            {s.rejectionReason}
                          </span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
                          Awaiting review
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-5 text-right whitespace-nowrap">
                      <span className="inline-flex gap-2">
                        {!s.verified && (
                          <button
                            type="button"
                            onClick={() => openDialog('verify', s)}
                            className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-md hover:bg-green-700 transition-colors"
                          >
                            Verify
                          </button>
                        )}
                        {!s.rejectionReason && (
                          <button
                            type="button"
                            onClick={() => openDialog('reject', s)}
                            className="px-3 py-1.5 border border-[var(--color-border)] text-surface-600 text-xs font-medium rounded-md hover:bg-surface-50 transition-colors"
                          >
                            Reject
                          </button>
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {dialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="kyc-dialog-title"
            className="w-full max-w-md rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-5 shadow-xl"
          >
            <h2 id="kyc-dialog-title" className="text-base font-semibold text-surface-800">
              {dialog.mode === 'verify' ? 'Verify provider KYC' : 'Reject provider KYC'}
            </h2>
            <p className="text-sm text-surface-500 mt-1">
              {dialog.mode === 'verify'
                ? 'This unlocks payout requests for the provider. It does not transfer any money — the bank rail is separate.'
                : 'This keeps payouts blocked. The reason is stored against the submission and is what the provider will be told.'}
            </p>

            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-surface-500">Provider</dt>
                <dd className="font-medium text-surface-800 text-right">{dialog.target.fullName}</dd>
              </div>
              {dialog.target.email && (
                <div className="flex justify-between gap-4">
                  <dt className="text-surface-500">Email</dt>
                  <dd className="text-surface-600 text-right break-all">{dialog.target.email}</dd>
                </div>
              )}
              <div className="flex justify-between gap-4">
                <dt className="text-surface-500">Bank details</dt>
                <dd className="text-surface-600">{dialog.target.hasBank ? 'On file' : 'Missing'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-surface-500">Submitted</dt>
                <dd className="text-surface-600">{formatDay(dialog.target.submittedAt)}</dd>
              </div>
            </dl>

            {dialog.mode === 'reject' && (
              <>
                <label htmlFor="kyc-reason" className="block text-sm font-medium text-surface-700 mt-4">
                  Reason for rejection
                </label>
                <textarea
                  id="kyc-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="e.g. ID document is unreadable — please re-upload"
                  className="mt-1 w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm text-surface-800 bg-transparent"
                />
              </>
            )}

            {submitting && (
              <p className="mt-3 text-sm text-surface-500">Recording the decision — do not close this window.</p>
            )}
            {actionError && (
              <div
                role="alert"
                className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              >
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeDialog}
                disabled={submitting}
                className="px-3 py-1.5 text-sm rounded-md border border-[var(--color-border)] text-surface-600 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDecision}
                disabled={submitting}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-white text-sm font-medium rounded-md disabled:opacity-60 transition-colors ${
                  dialog.mode === 'verify' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {dialog.mode === 'verify' ? 'Confirm verification' : 'Confirm rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
