'use client';

/**
 * Devotee "Cancel enrolment" with a confirm step. The confirm text is a preview
 * from lib/wellness-cancel.ts; the figures shown after the call are the API's.
 */

import { useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { cancelWellnessEnrolment, WellnessApiError } from '../../lib/wellness-api';
import {
  canOfferEnrolmentCancel,
  describeEnrolmentCancelError,
  describeEnrolmentCancelled,
  previewEnrolmentCancel,
} from '../../lib/wellness-cancel';

export default function CancelEnrolment({
  token,
  enrollmentId,
  status,
  priceInr,
  scheduledAt,
  onCancelled,
}: {
  token: string | undefined;
  enrollmentId: string;
  status: string;
  priceInr: string | number;
  scheduledAt: string;
  onCancelled?: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  if (done) {
    return (
      <p
        role="status"
        data-testid="cancel-enrolment-done"
        className="mt-3 flex items-start gap-2 text-sm text-emerald-800"
      >
        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> {done}
      </p>
    );
  }
  if (!canOfferEnrolmentCancel(status)) return null;

  const preview = previewEnrolmentCancel({ status, priceInr, scheduledAt });

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      const r = await cancelWellnessEnrolment(token, enrollmentId);
      setDone(describeEnrolmentCancelled(r));
      setConfirming(false);
      onCancelled?.();
    } catch (err) {
      if (err instanceof WellnessApiError) {
        setError(describeEnrolmentCancelError(err.status, err.body));
      } else {
        setError('We could not cancel this enrolment just now. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3">
      {!confirming ? (
        <button
          type="button"
          data-testid="cancel-enrolment-open"
          onClick={() => {
            setConfirming(true);
            setError(null);
          }}
          className="text-sm font-medium text-red-700 underline underline-offset-2 hover:text-red-800"
        >
          Cancel enrolment
        </button>
      ) : (
        <div
          role="alertdialog"
          aria-label="Confirm cancellation"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900"
        >
          <p className="font-medium">Cancel this enrolment?</p>
          <p className="mt-1" data-testid="cancel-enrolment-preview">{preview.message}</p>
          {preview.kind === 'refund' ? (
            <p className="mt-1 text-xs text-red-800">
              The exact amount is confirmed by our system when you cancel.
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            {preview.kind !== 'blocked' && preview.kind !== 'none' ? (
              <button
                type="button"
                data-testid="cancel-enrolment-confirm"
                onClick={() => void confirm()}
                disabled={busy}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-red-700 text-white text-sm font-medium hover:bg-red-800 disabled:opacity-60"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Yes, cancel enrolment
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={busy}
              className="h-10 px-4 rounded-lg border border-red-200 bg-white text-sm font-medium text-red-800 hover:bg-red-100"
            >
              Keep my seat
            </button>
          </div>
        </div>
      )}
      {error ? (
        <p role="alert" data-testid="cancel-enrolment-error" className="mt-2 flex items-start gap-2 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
        </p>
      ) : null}
    </div>
  );
}
