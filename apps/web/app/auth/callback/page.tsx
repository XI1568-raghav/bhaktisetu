'use client';

import { useEffect, useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '../../../lib/supabase';
import { API_BASE_URL } from '../../../lib/api-config';
import {
 getRoleDashboardPath,
 fromApiRole,
 persistAuthStorage,
 type AuthSession,
 type AuthUser,
} from '../../../lib/auth-context';

export default function AuthCallbackPage() {
 const [status, setStatus] = useState<'working' | 'error'>('working');
 const [errorMessage, setErrorMessage] = useState<string>('');

 useEffect(() => {
 (async () => {
 try {
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

 const res = await fetch(`${API_BASE_URL}/auth/google/sync`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 accessToken: session.access_token,
 refreshToken: session.refresh_token,
 expiresAt: session.expires_at ? session.expires_at * 1000 : null,
 }),
 });

 const data = await res.json();
 if (!res.ok) {
 setStatus('error');
 setErrorMessage(data.message || 'Could not sign you in. Please try again.');
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
 setStatus('error');
 setErrorMessage(err instanceof Error ? err.message : 'Unexpected error completing sign-in.');
 }
 })();
 }, []);

 return (
 <div className="min-h-[100dvh] flex items-center justify-center bg-[var(--color-bg)] px-4">
 <div className="max-w-sm w-full bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-8 text-center">
 {status === 'working' ? (
 <>
 <Loader2 className="w-8 h-8 text-saffron-600 animate-spin mx-auto mb-4" />
 <h1 className="text-base font-semibold text-surface-800 mb-1">Signing you in</h1>
 <p className="text-sm text-surface-500">Hold on while we finish the Google sign-in.</p>
 </>
 ) : (
 <>
 <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
 <h1 className="text-base font-semibold text-surface-800 mb-1">Sign-in failed</h1>
 <p className="text-sm text-surface-500 mb-6">{errorMessage}</p>
 <Link
 href="/auth/login"
 className="inline-flex items-center gap-2 px-4 py-2 bg-saffron-600 text-white text-sm font-medium rounded-lg hover:bg-saffron-700"
 >
 Back to login
 </Link>
 </>
 )}
 </div>
 </div>
 );
}
