'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, AlertCircle } from 'lucide-react';

export const runtime = 'edge';

/**
 * Live consultation room — embeds Jitsi Meet.
 *
 * URL: /consultation/[room]?provider=Acharya+Vinod
 *
 * Jitsi Meet on the public meet.jit.si server is free, requires no API key,
 * and supports HD video + audio + screen share + chat. The room name in the
 * URL acts as the shared identifier between devotee and provider.
 */
export default function ConsultationRoomPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const room = params.room as string;
  const providerName = searchParams.get('provider') ?? 'Provider';
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Tiny delay to avoid hydration mismatch on first paint
    const timer = setTimeout(() => setReady(true), 50);
    return () => clearTimeout(timer);
  }, []);

  if (!room) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center">
        <AlertCircle className="w-12 h-12 text-saffron-600 mb-4" />
        <h1 className="text-xl font-semibold text-surface-800 mb-2">Invalid consultation link</h1>
        <Link href="/astrology" className="text-saffron-600 hover:underline text-sm">
          Browse astrologers →
        </Link>
      </div>
    );
  }

  // Build Jitsi embed URL with sensible defaults: prejoin off, branding muted
  const jitsiUrl =
    `https://meet.jit.si/${encodeURIComponent(room)}` +
    `#config.prejoinPageEnabled=false` +
    `&config.disableDeepLinking=true` +
    `&interfaceConfig.MOBILE_APP_PROMO=false` +
    `&interfaceConfig.SHOW_JITSI_WATERMARK=false`;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-bg)' }}>
      {/* Header */}
      <div className="border-b border-surface-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <Link
            href="/astrology"
            className="inline-flex items-center gap-2 text-sm text-surface-600 hover:text-saffron-600"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to astrologers
          </Link>
          <div className="text-xs text-surface-500">
            Consultation with{' '}
            <span className="font-medium text-surface-700">{providerName}</span>
          </div>
        </div>
      </div>

      {/* Jitsi iframe */}
      <div className="flex-1 relative">
        {ready ? (
          <iframe
            allow="camera; microphone; fullscreen; display-capture; autoplay"
            src={jitsiUrl}
            className="absolute inset-0 w-full h-full border-0"
            title="Live consultation"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-surface-500">
            Connecting…
          </div>
        )}
      </div>

      {/* Privacy footer */}
      <div className="bg-white border-t border-surface-100 px-4 py-3 text-center">
        <p className="text-[11px] text-surface-500">
          Powered by Jitsi Meet — open-source video. Calls are encrypted in
          transit. No recordings are stored on Darshya servers.
        </p>
      </div>
    </div>
  );
}
