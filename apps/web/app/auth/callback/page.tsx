'use client';

import { useEffect, useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '../../../lib/supabase';
import { API_BASE_URL } from '../../../lib/api-config';
import { getRoleDashboardPath, type UserRole } from '../../../lib/auth-context';

const STORAGE_KEYS = {
 SESSION: 'poojly_session',
 USER: 'poojly_user',
} as const;

function setCookie(name: string, value: string, days = 7) {
 const expires = new Date(Date.now() + days * 864e5).toUTCString();
 document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

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

 const persistedSession = data.session;
 const persistedUser = { ...data.user, role: (data.user.role as UserRole) || 'devotee' };
 try {
 localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(persistedSession));
 localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(persistedUser));
 } catch {
 // localStorage unavailable — fall back to cookies only
 }
 setCookie(STORAGE_KEYS.SESSION, JSON.stringify(persistedSession));
 setCookie(STORAGE_KEYS.USER, JSON.stringify(persistedUser));

 const params = new URLSearchParams(window.location.search);
 const redirectTarget = params.get('redirect') || getRoleDashboardPath(persistedUser.role);
 window.location.href = redirectTarget;
 } catch (err) {
 setStatus('error');
 setErrorMessage(err instanceof Error ? err.message : 'Unexpected error completing sign-in.');
 }
 })();
 }, []);

 return (
 <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] px-4">
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
