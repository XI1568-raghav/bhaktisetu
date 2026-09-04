'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
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
  fromApiRole,
  getRoleDashboardPath,
  persistAuthStorage,
  type AuthSession,
  type AuthUser,
} from '../../../lib/auth-context';

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
        // AUTH-12 / RES-01: a bare `fetch` has no timeout, so a stalled socket
        // left this page on its spinner forever with nothing to act on.
        const res = await fetchWithTimeout(`${API_BASE_URL}/auth/magic-link/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ token }),
        });
        // AUTH-02: status BEFORE body — an HTML 502 threw a SyntaxError that was
        // rendered verbatim as "Unexpected token '<'".
        if (!res.ok) {
          const errBody = await readJsonBody<{ error?: string; message?: string }>(res);
          setStatus('error');
          setErrorMessage(
            errBody?.error ??
              errBody?.message ??
              authHttpErrorMessage(res.status, 'Invalid or expired sign-in link'),
          );
          return;
        }
        const data = await readJsonBody<{
          ok?: boolean;
          session?: AuthSession;
          user?: Partial<AuthUser> & { id: string };
          error?: string;
        }>(res);
        if (!data?.ok || !data.session || !data.user) {
          setStatus('error');
          setErrorMessage(data?.error ?? UNREADABLE_RESPONSE_MESSAGE);
          return;
        }

        // AUTH-03 (2026-08-23): THE MAGIC LINK NOW CARRIES ITS ROLE.
        //
        // History: this response used to be `{ id, email, fullName, phone }` and
        // nothing else, so `fromApiRole(undefined)` made every provider a
        // devotee. A temple manager or pandit provisioned through the
        // partnerships pipeline has NO password (there is no password column on
        // User), so this link is their only door, and it dropped them outside
        // their own portal on every single sign-in. The stopgap was a blocking
        // GET /auth/me from this page.
        //
        // apps/api/src/routes/magic-link.ts now runs getPrimaryRoleForUser on
        // the /verify reply itself — the same resolver /login, /verify-otp and
        // /me use — so the answer arrives with the session and the extra
        // cross-origin round-trip in front of the slowest sign-in door in the
        // product is gone. `fromApiRole` still applies the web↔API bridge
        // (`pandit` → `priest`) and still falls back to devotee, so an older API
        // build that omits the field signs the user in rather than erroring.
        const verifiedUser = {
          ...(data.user as Partial<AuthUser>),
          id: data.user.id,
          role: fromApiRole((data.user as Partial<AuthUser>).role),
        } as AuthUser;

        // A-003: persistAuthStorage writes the `poojly_user` COOKIE as well as
        // localStorage. middleware.ts gates every portal path on that cookie,
        // and this door used to write localStorage only — so even a correctly
        // roled provider was 307'd back to /auth/login by the gate.
        try {
          persistAuthStorage(data.session, verifiedUser);
        } catch {
          /* private mode / quota — non-fatal */
        }
        setStatus('success');
        setTimeout(() => router.replace(getRoleDashboardPath(verifiedUser.role)), 600);
      } catch (err) {
        setStatus('error');
        setErrorMessage(
          isNetworkFailure(err)
            ? NETWORK_ERROR_MESSAGE
            : err instanceof Error
              ? err.message
              : 'Network error verifying link',
        );
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
      <h1 className={`${H1.portal} mb-1`}>Sign-in link not valid</h1>
      <p className="prose-meta text-surface-500 mb-6 text-center max-w-sm">{errorMessage}</p>
      <Link
        href="/auth/login"
        className={buttonClass('primary', 'md')}
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
