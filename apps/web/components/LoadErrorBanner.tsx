'use client';

import { AlertCircle } from 'lucide-react';
import ReauthPrompt from './ReauthPrompt';

/**
 * AUTH-06 — the amber "we could not load this" banner, with the right control
 * in it.
 *
 * Nine surfaces had hand-copied the same markup: an amber alert, the sentence
 * from `loadErrorMessage`, and a Retry button. That is correct for a timeout or
 * a 500. It is a dead end for a 401: `loadErrorMessage` answers "Your session
 * has expired — sign in again to see your live figures", and the only control
 * beside that instruction is Retry, which re-fires the request with the same
 * dead credential. The sentence tells the user what to do and the screen gives
 * them no way to do it.
 *
 * Retry and the sign-in link are mutually exclusive ON PURPOSE. Rendering both
 * leaves the broken control on screen next to the working one, and Retry is the
 * bigger, more familiar target — so the dead end survives, just with a second
 * option beside it.
 *
 * 403 deliberately keeps Retry. A suspended account is not an expired session;
 * `loadErrorIsForbidden` (lib/api-config.ts) exists precisely because sending a
 * suspended provider to sign in again produces a loop — the sign-in succeeds,
 * the redirect returns her to the same refusal, and the one sentence that could
 * have ended it is thrown away on the way past.
 */
export default function LoadErrorBanner({
  message,
  reauth = false,
  onRetry,
  className,
}: {
  /** The sentence from `loadErrorMessage` / `userFacingMessage`. */
  message: string;
  /** `loadErrorIsReauth(cause)` or `classifyUserFacing(err).reauth`. */
  reauth?: boolean;
  /** Omit to render no Retry at all (some surfaces reload by navigation). */
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={
        className ??
        'mt-4 flex flex-wrap items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800'
      }
    >
      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
      <span className="flex-1 min-w-[12rem]">{message}</span>
      {reauth ? (
        // message="" because the banner already printed the sentence; an empty
        // <p> dropped into the row is dead markup a screen reader still walks.
        <ReauthPrompt message="" className="shrink-0" />
      ) : onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="font-semibold underline underline-offset-2 hover:text-amber-900"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}
