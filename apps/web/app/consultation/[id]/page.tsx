'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, AlertCircle, Loader2, LogIn } from 'lucide-react';
import { useAuth } from '../../../lib/auth-context';
import { API_BASE_URL } from '../../../lib/api-config';
import AuthGuard from '../../../components/AuthGuard';
import { H1 } from '../../../components/ui/heading-recipe';

function buildAuthHeaders(accessToken: string | undefined): Record<string, string> {
  return accessToken ? { authorization: `Bearer ${accessToken}` } : {};
}

/**
 * Live consultation room — embeds Jitsi Meet.
 *
 * URL: /consultation/[id]?provider=Acharya+Vinod
 *
 * The dynamic segment is the Jitsi room name (acts as the shared identifier
 * between devotee and provider). It is named `[id]` (not `[room]`) so it
 * shares the slug name with the sibling `/consultation/[id]/success` route —
 * Next's App Router forbids different slug names for the same dynamic path
 * level ('id' !== 'room' raised at runtime). The value here is a room name,
 * not a DB consultation id; callers pass `roomName` (see Inbox.tsx,
 * astrology/view/page.tsx).
 *
 * P0 #AP-01 (2026-07-09): the page used to embed meet.jit.si for ANY visitor
 * using a client-constructed room name — a logged-out user got a free branded
 * room and could impersonate the astrologer. Now the page resolves the room
 * via GET /consultation/by-room/:room, which 403s unless the room is tied to a
 * PAID ('confirmed') consultation AND the caller is the devotee owner or the
 * assigned astrologer (or admin). The Jitsi iframe is only rendered after the
 * API authorizes the room; otherwise an "unauthorized / not paid" state is
 * shown. Free-trial `/consultation/start` rooms are NOT resolvable (no row) →
 * refused.
 *
 * Jitsi Meet on the public meet.jit.si server is free, requires no API key,
 * and supports HD video + audio + screen share + chat.
 */
function ConsultationRoomContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const room = params.id as string;
  const providerName = searchParams.get('provider') ?? 'Provider';
  const { session } = useAuth();
  const [authStatus, setAuthStatus] = useState<
    'checking' | 'authorized' | 'unauthorized' | 'notfound' | 'error'
  >('checking');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!room) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/consultation/by-room/${encodeURIComponent(room)}`,
          {
            headers: buildAuthHeaders(session?.accessToken),
            credentials: 'include',
          },
        );
        if (cancelled) return;
        if (res.status === 404) {
          setAuthStatus('notfound');
          return;
        }
        if (res.status === 401 || res.status === 403) {
          setAuthStatus('unauthorized');
          return;
        }
        if (!res.ok) {
          setAuthStatus('error');
          return;
        }
        setAuthStatus('authorized');
      } catch {
        if (!cancelled) setAuthStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [room, session?.accessToken]);

  // Tiny delay to avoid hydration mismatch on first paint, only once authorized.
  useEffect(() => {
    if (authStatus !== 'authorized') return;
    const timer = setTimeout(() => setReady(true), 50);
    return () => clearTimeout(timer);
  }, [authStatus]);

  if (!room) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
        <AlertCircle className="text-saffron-600 mb-4 h-12 w-12" />
        <h1 className={`${H1.portal} mb-2`}>Invalid consultation link</h1>
        <Link href="/astrology" className="text-saffron-600 text-sm hover:underline">
          Browse astrologers →
        </Link>
      </div>
    );
  }

  if (authStatus === 'checking') {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
        <Loader2 className="text-saffron-600 mb-4 h-8 w-8 animate-spin" />
        <p className="text-surface-600 text-sm">Verifying your consultation…</p>
      </div>
    );
  }

  if (authStatus === 'notfound') {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
        <AlertCircle className="text-saffron-600 mb-4 h-12 w-12" />
        <h1 className={`${H1.portal} mb-2`}>Consultation not found</h1>
        <p className="text-surface-600 mb-4 max-w-sm prose-meta">
          This room isn&apos;t linked to a paid consultation. Free-trial rooms are no longer
          available — please book a consultation to join a call.
        </p>
        <Link href="/astrology" className="text-saffron-600 text-sm hover:underline">
          Browse astrologers →
        </Link>
      </div>
    );
  }

  if (authStatus === 'unauthorized') {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
        <AlertCircle className="text-saffron-600 mb-4 h-12 w-12" />
        <h1 className={`${H1.portal} mb-2`}>
          You can&apos;t join this call
        </h1>
        <p className="text-surface-600 mb-4 max-w-sm prose-meta">
          {session?.accessToken
            ? "This consultation belongs to another user, or it hasn't been paid for yet."
            : 'Please sign in to join your consultation.'}
        </p>
        {session?.accessToken ? (
          <Link href="/astrology" className="text-saffron-600 text-sm hover:underline">
            Browse astrologers →
          </Link>
        ) : (
          <Link
            href="/auth/login?redirect=/consultation"
            className="text-saffron-600 inline-flex items-center gap-2 text-sm hover:underline"
          >
            <LogIn className="h-4 w-4" /> Sign in
          </Link>
        )}
      </div>
    );
  }

  if (authStatus === 'error') {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
        <AlertCircle className="text-saffron-600 mb-4 h-12 w-12" />
        <h1 className={`${H1.portal} mb-2`}>Something went wrong</h1>
        <p className="text-surface-600 mb-4 text-sm">
          We couldn&apos;t verify your consultation. Please try again.
        </p>
        <Link href="/astrology" className="text-saffron-600 text-sm hover:underline">
          Browse astrologers →
        </Link>
      </div>
    );
  }

  // authorized — build Jitsi embed URL with sensible defaults: prejoin off, branding muted
  const jitsiUrl =
    `https://meet.jit.si/${encodeURIComponent(room)}` +
    `#config.prejoinPageEnabled=false` +
    `&config.disableDeepLinking=true` +
    `&interfaceConfig.MOBILE_APP_PROMO=false` +
    `&interfaceConfig.SHOW_JITSI_WATERMARK=false`;

  return (
    <div className="flex min-h-[100dvh] flex-col" style={{ background: 'var(--color-bg)' }}>
      {/* Header */}
      <div className="border-surface-100 border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link
            href="/astrology"
            className="text-surface-600 hover:text-saffron-600 inline-flex items-center gap-2 text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to astrologers
          </Link>
          <div className="text-surface-500 text-xs">
            Consultation with <span className="text-surface-700 font-medium">{providerName}</span>
          </div>
        </div>
      </div>

      {/* Jitsi iframe */}
      <div className="relative flex-1">
        {ready ? (
          <iframe
            allow="camera; microphone; fullscreen; display-capture; autoplay"
            src={jitsiUrl}
            className="absolute inset-0 h-full w-full border-0"
            title="Live consultation"
          />
        ) : (
          <div className="text-surface-500 absolute inset-0 flex items-center justify-center text-sm">
            Connecting…
          </div>
        )}
      </div>

      {/* Privacy footer */}
      <div className="border-surface-100 border-t bg-white px-4 py-3 text-center">
        <p className="text-surface-500 text-xs">
          Powered by Jitsi Meet — open-source video. Calls are encrypted in transit. No recordings
          are stored on Darshya servers.
        </p>
      </div>
    </div>
  );
}

export default function ConsultationRoomPage() {
  return (
    <AuthGuard>
      <ConsultationRoomContent />
    </AuthGuard>
  );
}
