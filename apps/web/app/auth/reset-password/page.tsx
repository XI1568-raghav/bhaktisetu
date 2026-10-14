'use client';

/**
 * A-002 (2026-08-11): the landing page for Supabase's reset email.
 *
 * Supabase delivers the recovery credential in the URL **fragment**
 * (`#access_token=…&type=recovery`), which never reaches the server. The
 * browser client is created with `detectSessionInUrl: true` (lib/supabase.ts),
 * so it consumes that fragment and establishes a short-lived recovery session
 * on load; `updateUser` then authenticates against it. That is why this page
 * reads a session rather than a token off the query string — and why it must
 * be a client component.
 *
 * An invalid/expired link and a rejected password are shown as different
 * states on purpose: telling a locked-out user "request a new link" rather
 * than a generic failure is the difference between recovering and giving up.
 *
 * Renders as a card — apps/web/app/auth/layout.tsx supplies the full-screen
 * gradient and centering for every route in this segment.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Lock, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { getSupabaseBrowserClient } from '../../../lib/supabase';
import { persistAuthStorage } from '../../../lib/auth-context';
import { API_BASE_URL, fetchWithTimeout } from '../../../lib/api-config';
import { buttonClass } from '../../../components/ui/button-recipe';
import { H1 } from '../../../components/ui/heading-recipe';

const MIN_PASSWORD_LENGTH = 8;
// Mirrors the server-side signup policy (apps/api/src/routes/auth.ts) so a
// reset cannot set a weaker password than signup would have accepted.
const HAS_LETTER = /[A-Za-z]/;
const HAS_DIGIT = /\d/;

export default function ResetPasswordPage() {
 const [ready, setReady] = useState<'checking' | 'valid' | 'invalid'>('checking');
 const [password, setPassword] = useState('');
 const [confirm, setConfirm] = useState('');
 const [showPassword, setShowPassword] = useState(false);
 const [status, setStatus] = useState<'idle' | 'submitting' | 'done'>('idle');
 const [error, setError] = useState('');

 useEffect(() => {
  let cancelled = false;

  // Read the fragment BEFORE creating the client — detectSessionInUrl consumes
  // and strips it.
  //
  // Requiring `type=recovery` is a security gate, not a formality (found by
  // adversarial review 2026-08-11). The browser client persists sessions, the
  // Google OAuth callback leaves one behind, and this app's own sign-out clears
  // only its `poojly_*` keys — it never touches Supabase. So "a session exists"
  // was satisfied by an ordinary leftover login: on a shared machine the next
  // person could open this URL with no emailed link at all and silently rewrite
  // the previous user's password. A recovery link must actually be presented.
  const hash = typeof window !== 'undefined' ? window.location.hash : '';
  const arrivedWithRecoveryLink = hash.includes('type=recovery');

  const supabase = getSupabaseBrowserClient();

  // detectSessionInUrl parses the fragment asynchronously and fires
  // PASSWORD_RECOVERY once it has. Subscribe first so a fast parse is not
  // missed, then check directly for the case where it already completed.
  const { data: sub } = supabase.auth.onAuthStateChange((event) => {
   if (!cancelled && event === 'PASSWORD_RECOVERY') setReady('valid');
  });

  void (async () => {
   const { data } = await supabase.auth.getSession();
   if (!cancelled) {
    setReady(data.session && arrivedWithRecoveryLink ? 'valid' : 'invalid');
   }
  })();

  return () => {
   cancelled = true;
   sub.subscription.unsubscribe();
  };
 }, []);

 const handleSubmit = async () => {
  if (password.length < MIN_PASSWORD_LENGTH) {
   setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
   return;
  }
  if (!HAS_LETTER.test(password) || !HAS_DIGIT.test(password)) {
   setError('Password must contain at least one letter and one number.');
   return;
  }
  if (password !== confirm) {
   setError('Passwords do not match.');
   return;
  }

  setStatus('submitting');
  setError('');

  const supabase = getSupabaseBrowserClient();
  const { error: updateError } = await supabase.auth.updateUser({ password });

  if (updateError) {
   // Surfaced rather than swallowed: unlike the request page there is no
   // enumeration risk here (the caller already holds the link), and Supabase's
   // message names the actual problem — expired link, or a password the
   // project's policy rejects.
   setError(
    updateError.message || 'Could not update your password. Request a new link and try again.',
   );
   setStatus('idle');
   return;
  }

  setStatus('done');
  // Drop ALL THREE session stores. `supabase.auth.signOut()` alone clears only
  // Supabase's — this app carries its own `poojly_session`/`poojly_user`, and
  // leaving them meant the common case (user is logged in on desktop and resets
  // because they forgot the password) bounced straight past the login page into
  // a dashboard running on a session whose refresh token had just been revoked,
  // then silently died within the hour. signOut is global by default, which is
  // the right call after a password change.
  //
  // AUTH-11 (2026-08-20): THE THIRD STORE WAS NEVER CLEARED, WHILE THIS PAGE
  // CLAIMED IT WAS.
  //
  // The API issues two httpOnly cookies at sign-in — `darshya_session` (the
  // access token) and `darshya_refresh` — and apps/api/src/middlewares/auth.ts
  // accepts `darshya_session` as a credential on its own. Nothing here touched
  // them, so after being told "You've been signed out everywhere" the browser
  // still held a WORKING API credential for the remainder of that token's hour.
  // POST /auth/logout is what expires those cookies and revokes the session
  // server-side; `credentials: 'include'` is mandatory because darshya.online
  // and api.darshya.online are different origins — without it the cookie is
  // neither sent nor is the expiring Set-Cookie stored.
  //
  // Ordered before the Supabase signOut so the API can still resolve the
  // session from the cookie, and best-effort: the password HAS changed by this
  // point, and a failed logout must not present as a failed reset.
  try {
   // Send the live (recovery) access token explicitly with scope=global. A user
   // who arrives from the emailed link on a browser with no darshya_session
   // cookie would otherwise get a 400 here and every OTHER device would stay
   // signed in on the old password.
   let accessToken: string | undefined;
   try {
    accessToken = (await supabase.auth.getSession()).data.session?.access_token;
   } catch {
    accessToken = undefined;
   }
   await fetchWithTimeout(`${API_BASE_URL}/auth/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(accessToken ? { accessToken, scope: 'global' } : { scope: 'global' }),
   });
  } catch {
   /* best-effort — the local stores are cleared below regardless */
  }
  await supabase.auth.signOut().catch(() => undefined);
  persistAuthStorage(null, null);
  // Hard navigation, not router.push — the auth provider holds the old session
  // in memory and only a real load drops it.
  setTimeout(() => {
   window.location.href = '/auth/login';
  }, 2500);
 };

 if (ready === 'checking') {
  return (
   <div className="shadow-warm flex items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-12">
    <Loader2 className="text-saffron-600 h-8 w-8 animate-spin" />
   </div>
  );
 }

 if (ready === 'invalid') {
  return (
   <div className="shadow-warm overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center">
    <AlertCircle className="mx-auto mb-4 h-12 w-12 text-amber-500" />
    <h1 className={`${H1.portal} mb-2`}>This link is no longer valid</h1>
    <p className="text-surface-500 mb-6 text-sm">
     Password reset links expire an hour after they are sent, and can only be used once.
     Request a fresh one and it will work.
    </p>
    <Link
     href="/auth/forgot-password"
     className={buttonClass('primary', 'md')}
    >
     Send a new reset link
    </Link>
   </div>
  );
 }

 if (status === 'done') {
  return (
   <div className="shadow-warm overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center">
    <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-emerald-500" />
    <h1 className={`${H1.portal} mb-2`}>Password updated</h1>
    <p className="text-surface-500 mb-6 text-sm">
     You&apos;ve been signed out everywhere. Sign in with your new password —
     taking you to the sign-in page…
    </p>
    <Link
     href="/auth/login"
     className={buttonClass('primary', 'md')}
    >
     Sign in
    </Link>
   </div>
  );
 }

 return (
  <div className="shadow-warm overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8">
   <h1 className={`${H1.portal} mb-2`}>Choose a new password</h1>
   <p className="text-surface-500 mb-6 text-sm">
    At least {MIN_PASSWORD_LENGTH} characters, including a letter and a number.
    You&apos;ll use this to sign in from now on.
   </p>

   <label htmlFor="password" className="text-surface-700 mb-1.5 block text-sm font-medium">
    New password
   </label>
   <div className="relative mb-4">
    <Lock className="text-surface-400 absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
    <input
     id="password"
     type={showPassword ? 'text' : 'password'}
     autoComplete="new-password"
     placeholder="Enter new password"
     value={password}
     onChange={(e) => {
      setPassword(e.target.value);
      setError('');
     }}
     className="border-surface-200 text-surface-800 placeholder:text-surface-400 focus:ring-saffron-300 focus:border-saffron-400 w-full rounded-lg border py-2.5 pr-10 pl-10 text-sm transition-colors focus:ring-2 focus:outline-none"
    />
    <button
     type="button"
     onClick={() => setShowPassword(!showPassword)}
     className="text-surface-400 hover:text-surface-600 absolute top-1/2 right-3 -translate-y-1/2"
    >
     {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
   </div>

   <label htmlFor="confirm" className="text-surface-700 mb-1.5 block text-sm font-medium">
    Confirm password
   </label>
   <div className="relative mb-4">
    <Lock className="text-surface-400 absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
    <input
     id="confirm"
     type={showPassword ? 'text' : 'password'}
     autoComplete="new-password"
     placeholder="Re-enter new password"
     value={confirm}
     onChange={(e) => {
      setConfirm(e.target.value);
      setError('');
     }}
     onKeyDown={(e) => {
      if (e.key === 'Enter') handleSubmit();
     }}
     className="border-surface-200 text-surface-800 placeholder:text-surface-400 focus:ring-saffron-300 focus:border-saffron-400 w-full rounded-lg border py-2.5 pr-3 pl-10 text-sm transition-colors focus:ring-2 focus:outline-none"
    />
   </div>

   {error && (
    <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 p-3">
     <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
     <p className="text-sm text-red-700">{error}</p>
    </div>
   )}

   <button
    onClick={handleSubmit}
    disabled={status === 'submitting'}
    className={buttonClass('primary', 'md', 'w-full disabled:cursor-not-allowed')}
   >
    {status === 'submitting' ? (
     <>
      <Loader2 className="h-5 w-5 animate-spin" />
      Updating...
     </>
    ) : (
     'Update password'
    )}
   </button>
  </div>
 );
}
