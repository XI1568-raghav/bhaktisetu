'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogIn } from 'lucide-react';
import { reauthLoginHref } from '../lib/friendly-error';
import { buttonClass } from './ui/button-recipe';

/**
 * AUTH-06 — the affordance that was missing behind `friendlyApiError().reauth`.
 *
 * A session that expires mid-action currently renders "Your session has expired.
 * Please sign in again to continue." beside a Retry button. Retry re-fires the
 * same request with the same dead credential, so the only control on screen is
 * the one control that cannot work, and the sentence's own instruction — sign in
 * again — has no button anywhere. Six pages are in that state today:
 * app/admin/leads, app/admin/ratings, app/bookings, app/bookings/view,
 * app/store/checkout and app/store/orders.
 *
 * Intended use — render this INSTEAD of the Retry button, not beside it:
 *
 *   const { message, reauth } = friendlyApiError(err);
 *   …
 *   {reauth ? <ReauthPrompt message={message} /> : <button onClick={retry}>Retry</button>}
 *
 * The redirect target comes from `usePathname()` and is sanitised by
 * `reauthLoginHref`, so the user lands back on the page they were on.
 */
export default function ReauthPrompt({
  message,
  className,
}: {
  /** The copy from `friendlyApiError(err).message`. Falls back to its own. */
  message?: string;
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <div className={className ?? 'flex flex-col items-start gap-3'} role="status">
      {/*
        An EMPTY string means "the caller already printed the sentence" — the
        /bookings alert row does, and an empty <p> dropped into the middle of it
        is dead markup a screen reader still walks into. Omitting the prop
        entirely still means "say it for me", which is the common case.
      */}
      {message !== '' && (
        <p className="text-sm text-surface-600">
          {message ?? 'Your session has expired. Please sign in again to continue.'}
        </p>
      )}
      {/*
        DU-03: the one primary-CTA recipe, not a hand-rolled inline fill. An
        inline `style` outranks every class, so no token can reach it — and
        __tests__/design-tokens.test.ts ratchets that channel downward.
      */}
      <Link href={reauthLoginHref(pathname)} className={buttonClass('primary', 'md')}>
        <LogIn className="h-4 w-4" aria-hidden="true" />
        Sign in again
      </Link>
    </div>
  );
}
