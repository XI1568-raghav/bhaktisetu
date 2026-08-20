'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
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

        // AUTH-03 (2026-08-20): THE MAGIC LINK CARRIES NO ROLE.
        //
        // POST /auth/magic-link/verify answers `{ id, email, fullName, phone }`
        // and nothing else. Persisting that verbatim made every provider a
        // devotee — `fromApiRole(undefined)` returns 'devotee' — and this page
        // then hardcoded /dashboard on top. A temple manager or pandit
        // provisioned through the partnerships pipeline has NO password (there
        // is no password column on User), so this link is their only door, and
        // it dropped them outside their own portal on every single sign-in.
        //
        // The server already knows: GET /auth/me runs getPrimaryRoleForUser and
        // returns the web-facing role. Ask it, with the session we were just
        // handed. Best-effort — a failed /me must still leave the user SIGNED
        // IN as a devotee rather than turning a valid link into an error page.
        const role = await resolveRole(data.session.accessToken);
        const verifiedUser = {
          ...(data.user as Partial<AuthUser>),
          id: data.user.id,
          role: fromApiRole(role ?? (data.user as Partial<AuthUser>).role),
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

/**
 * AUTH-03 — ask the server which role this account actually holds.
 *
 * Returns `null` rather than throwing: a provider holding a valid link must not
 * be shown "Sign-in link not valid" because a role lookup was slow. They land
 * on the devotee dashboard in that case, which is the pre-existing behaviour,
 * and the next full page load re-reads the role through AuthProvider.
 */
async function resolveRole(accessToken: string): Promise<string | null> {
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      credentials: 'include',
    });
    if (!res.ok) return null;
    const body = await readJsonBody<{ user?: { role?: string } }>(res);
    return body?.user?.role ?? null;
  } catch {
    return null;
  }
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center" style={{ background: 'var(--color-bg)' }}>
      {children}
    </div>
  );
}
