/**
 * AUTH-09 — what a sign-out actually does, in words, before it happens.
 *
 * `POST /api/v1/auth/logout` defaults to `scope: 'global'`
 * (apps/api/src/routes/auth.ts, `logoutSchema`: "global REMAINS THE DEFAULT"),
 * and this app's `signOut` in lib/auth-context.tsx posts that body with no
 * `scope` at all — so every sign-out from the phone is a sign-out everywhere.
 * The handler backs that up: it calls `supabase.auth.signOut()` and then
 * `UPDATE refresh_token_jtis SET used_at = now() WHERE user_id = $1` plus the
 * same sweep over `email_sessions`, i.e. every refresh token the account holds
 * on every device it holds one on.
 *
 * Six screens confirmed that with "Are you sure?" — a question about a
 * consequence it did not state. A pandit who signs out of the app between
 * bookings and then finds the browser on his desktop signed out too has been
 * surprised by his own security control, and the surprise is worst for exactly
 * the users who are signed in in two places because they work in two places.
 *
 * Kept as one exported constant rather than six string literals so the six
 * cannot drift apart, and so the guard in
 * lib/__tests__/signout-disclosure.auth09.test.ts has a single thing to check
 * every screen against.
 *
 * The web says the same thing at apps/web/app/auth/logout/page.tsx — "For your
 * security this signs you out on all your devices, not just this one." Same
 * promise, both platforms.
 */

/** Title of the sign-out confirmation. */
export const SIGN_OUT_TITLE = 'Sign Out';

/**
 * The body of the confirmation. States the scope BEFORE the user commits,
 * because after the tap there is nothing to undo — the refresh tokens are
 * already burned and every other device has to sign in again.
 */
export const SIGN_OUT_GLOBAL_MESSAGE =
  'This signs you out on all your devices, not just this one. You will need to sign in again everywhere.';

/** Label on the destructive confirm button. */
export const SIGN_OUT_CONFIRM_LABEL = 'Sign Out';

/** Label on the cancel button. */
export const SIGN_OUT_CANCEL_LABEL = 'Cancel';
