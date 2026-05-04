'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { API_BASE_URL } from '../../../lib/api-config';

/**
 * Magic-link verify page. The /api/v1/auth/magic-link/request endpoint
 * sends an email with a link to /auth/verify?token=... — this page POSTs
 * the token to /verify, stores the resulting session, then sends the user
 * to their role-specific dashboard.
 */
export default function VerifyMagicLinkPage() {
  return (
    <Suspense fallback={<Centered><Loader2 className="w-6 h-6 text-saffron-600 animate-spin" /></Centered>}>
      <VerifyInner />
    </Suspense>
  );
}

function VerifyInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const token = params.get('token');
    if (!token) {
      setStatus('error');
      setErrorMessage('Sign-in link is missing the token. Request a new link.');
      return;
    }
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/magic-link/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          setStatus('error');
          setErrorMessage(data.error ?? 'Invalid or expired sign-in link');
          return;
        }
        // Persist session in the same shape auth-context expects
        try {
          localStorage.setItem('poojly_session', JSON.stringify(data.session));
          localStorage.setItem('poojly_user', JSON.stringify(data.user));
        } catch {
          /* private mode / quota — non-fatal */
        }
        setStatus('success');
        // Land on the devotee dashboard; auth-context will rehydrate from localStorage.
        setTimeout(() => router.replace('/dashboard'), 600);
      } catch (err) {
        setStatus('error');
        setErrorMessage(err instanceof Error ? err.message : 'Network error verifying link');
      }
    })();
  }, [params, router]);

  if (status === 'loading') {
    return (
      <Centered>
        <Loader2 className="w-6 h-6 text-saffron-600 animate-spin mb-3" />
        <p className="text-sm text-surface-500">Verifying your sign-in link…</p>
      </Centered>
    );
  }
  if (status === 'success') {
    return (
      <Centered>
        <CheckCircle2 className="w-10 h-10 text-emerald-600 mb-3" />
        <p className="text-sm text-surface-700 font-medium">Signed in. Taking you to your dashboard…</p>
      </Centered>
    );
  }
  return (
    <Centered>
      <AlertCircle className="w-10 h-10 text-saffron-600 mb-3" />
      <h1 className="text-lg font-semibold text-surface-800 mb-1">Sign-in link not valid</h1>
      <p className="text-sm text-surface-500 mb-6 text-center max-w-sm">{errorMessage}</p>
      <Link
        href="/auth/login"
        className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg text-white"
        style={{ background: 'var(--color-primary)' }}
      >
        Request a new link
      </Link>
    </Centered>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center" style={{ background: 'var(--color-bg)' }}>
      {children}
    </div>
  );
}
