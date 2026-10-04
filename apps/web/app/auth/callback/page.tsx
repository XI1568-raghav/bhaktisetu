'use client';

import { useEffect, useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '../../../lib/supabase';
import { buttonClass } from '../../../components/ui/button-recipe';
import { H1 } from '../../../components/ui/heading-recipe';
import {
 API_BASE_URL,
 fetchWithTimeout,
 isNetworkFailure,
 NETWORK_ERROR_MESSAGE,
 UNREADABLE_RESPONSE_MESSAGE,
 readJsonBody,
 authHttpErrorMessage,
} from '../../../lib/api-config';
import {
 getRoleDashboardPath,
 fromApiRole,
 persistAuthStorage,
 type AuthSession,
 type AuthUser,
} from '../../../lib/auth-context';
import { userFacingMessage } from '../../../lib/friendly-error';

/**
 * AUTH-13 — read the OAuth failure the provider actually reported.
 *
 * A declined consent, a `redirect_uri_mismatch`, an unverified app, a GoTrue
 * `server_error` — all of them come back to this URL carrying `error`,
 * `error_code` and `error_description`. The implicit flow puts them in the
 * FRAGMENT (`#error=access_denied&…`), PKCE puts them in the query string, so
 * both have to be read. Without this the page fell into its session poll, spun
 * for three seconds waiting for a session that cannot exist, and then blamed
 * the transport.
 *
 * Must run BEFORE getSupabaseBrowserClient(): the client is created with
 * `detectSessionInUrl: true`, which consumes and strips the fragment.
 */
function readOAuthError(): { title: string; message: string } | null {
 if (typeof window === 'undefined') return null;
 const query = new URLSearchParams(window.location.search);
 const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
 const code = query.get('error') ?? hash.get('error');
 if (!code) return null;
 const description = (query.get('error_description') ?? hash.get('error_description') ?? '')
 .replace(/\+/g, ' ')
 .trim();
 const subCode = query.get('error_code') ?? hash.get('error_code') ?? '';

 if (code === 'access_denied') {
 return {
 title: 'Sign-in cancelled',
 message:
 description ||
 'Google sign-in was denied, so we could not sign you in. You can try again, or use your email and password.',
 };
 }
 return {
 title: 'Sign-in failed',
 // The provider's own words first — "redirect_uri_mismatch" is the whole
 // answer for whoever has to fix it, and a generic apology is not.
 message: description || subCode || `Google returned an error (${code}).`,
 };
}

export default function AuthCallbackPage() {
 const [status, setStatus] = useState<'working' | 'error'>('working');
 const [errorTitle, setErrorTitle] = useState<string>('Sign-in failed');
 const [errorMessage, setErrorMessage] = useState<string>('');

 useEffect(() => {
 (async () => {
 try {
 // AUTH-13: the provider told us why. Say that, immediately.
 const oauthError = readOAuthError();
 if (oauthError) {
 setErrorTitle(oauthError.title);
 setStatus('error');
 setErrorMessage(oauthError.message);
 return;
 }

 const supabase = getSupabaseBrowserClient();

 // Supabase client (detectSessionInUrl: true) parses the hash on mount.
 // Wait briefly for the session to materialise.
 let session = null as Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session'];
 for (let i = 0; i < 20; i++) {
 const { data } = await supabase.auth.getSession();
 if (data.session) {
 session = data.session;
 break;
 }
 await new Promise((r) => setTimeout(r, 150));
 }

 if (!session) {
 setStatus('error');
 setErrorMessage('Could not read Google session. Please try again.');
 return;
 }

 const res = await fetchWithTimeout(`${API_BASE_URL}/auth/google/sync`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 accessToken: session.access_token,
 refreshToken: session.refresh_token,
 expiresAt: session.expires_at ? session.expires_at * 1000 : null,
 }),
 });

 // AUTH-02: status BEFORE body, here too. A 502/503 HTML page from the
 // gateway threw a SyntaxError out of res.json(), landed in the catch
 // below, and was rendered as the raw parser message ("Unexpected token
 // '<'…") to a user whose Google sign-in was perfectly valid.
 if (!res.ok) {
 const errBody = await readJsonBody<{ message?: string }>(res);
 setStatus('error');
 setErrorMessage(
 errBody?.message ||
 authHttpErrorMessage(res.status, 'Could not sign you in. Please try again.'),
 );
 return;
 }

 const data = await readJsonBody<{ session?: AuthSession; user?: AuthUser }>(res);
 if (!data?.session || !data?.user) {
 setStatus('error');
 setErrorMessage(UNREADABLE_RESPONSE_MESSAGE);
 return;
 }

 const persistedSession: AuthSession = data.session;
 // A-011 (2026-08-10): this path used to persist the API role VERBATIM while
 // every other login path ran it through fromApiRole. The API says `pandit`,
 // the web routes on `priest` — so a Google-signed-in pandit was stored as
 // `pandit`, landed on /dashboard (getRoleDashboardPath has no `pandit` case)
 // and was bounced off /priest by AuthGuard on every reload.
 const persistedUser: AuthUser = { ...data.user, role: fromApiRole(data.user.role) };
 // A-007: one writer for both stores — see persistAuthStorage.
 persistAuthStorage(persistedSession, persistedUser);

 const params = new URLSearchParams(window.location.search);
 const rawRedirect = params.get('redirect');
 // Open-redirect guard: only allow same-origin OR root-relative paths.
 let redirectTarget = getRoleDashboardPath(persistedUser.role);
 if (rawRedirect) {
   if (rawRedirect.startsWith('/') && !rawRedirect.startsWith('//')) {
     redirectTarget = rawRedirect;
   } else {
     try {
       const u = new URL(rawRedirect, window.location.origin);
       if (u.origin === window.location.origin) redirectTarget = u.pathname + u.search + u.hash;
     } catch {
       /* ignore malformed redirect param */
     }
   }
 }
 window.location.href = redirectTarget;
 } catch (err) {
 // Always leave 'working' — this page's only other state is an endless
 // spinner, and a stalled /auth/google/sync used to hang here with no
 // timeout and no message (reported from production 2026-08-11).
 setStatus('error');
 setErrorMessage(
 isNetworkFailure(err)
 ? NETWORK_ERROR_MESSAGE
 : userFacingMessage(err, 'Unexpected error completing sign-in.'),
 );
 }
 })();
 }, []);

 return (
 <div className="min-h-[100dvh] flex items-center justify-center bg-[var(--color-bg)] px-4">
 <div className="max-w-sm w-full bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-8 text-center">
 {status === 'working' ? (
 <>
 <Loader2 className="w-8 h-8 text-saffron-600 animate-spin mx-auto mb-4" />
 <h1 className={`${H1.portal} mb-1`}>Signing you in</h1>
 <p className="text-sm text-surface-500">Hold on while we finish the Google sign-in.</p>
 </>
 ) : (
 <>
 <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
 <h1 className={`${H1.portal} mb-1`}>{errorTitle}</h1>
 <p className="text-sm text-surface-500 mb-6">{errorMessage}</p>
 <Link
 href="/auth/login"
 className={buttonClass('primary', 'md')}
 >
 Back to login
 </Link>
 </>
 )}
 </div>
 </div>
 );
}
