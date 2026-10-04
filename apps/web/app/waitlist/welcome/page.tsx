'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import RouteFallback from '../../../components/ui/RouteFallback';

import { buttonClass } from '../../../components/ui/button-recipe';
import { H1 } from '../../../components/ui/heading-recipe';
import { userFacingMessage } from '../../../lib/friendly-error';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.darshya.online';

interface Stats {
  rank: number;
  total: number;
  referralCount: number;
}

// CM-15: the Suspense fallback below was an empty viewport-tall div.
export default function WaitlistWelcomePage() {
  return (
    <Suspense fallback={<RouteFallback label="Loading your waitlist spot…" className="min-h-[calc(100vh-3.5rem)]" />}>
      <WelcomeContent />
    </Suspense>
  );
}

function WelcomeContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get('code') ?? '';
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const shareUrl = code
    ? `${typeof window !== 'undefined' ? window.location.origin : 'https://darshya.online'}/waitlist?ref=${code}`
    : '';
  const shareMessage = `Devotion. Verified. I just joined the early-access waitlist for Darshya — India's devotional super-app. Join me:`;

  useEffect(() => {
    if (!code) {
      setError('Missing referral code in URL.');
      return;
    }
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`${API_URL}/api/v1/waitlist/stats?code=${encodeURIComponent(code)}`, {
          cache: 'no-store',
        });
        if (!res.ok) {
          if (!cancelled) setError('Could not load your spot. Refresh and try again.');
          return;
        }
        const json = (await res.json()) as Stats;
        if (!cancelled) setStats(json);
      } catch (err) {
        if (!cancelled) setError(userFacingMessage(err, 'Network error.'));
      }
    }
    void load();
    // Phase D P1 #2: visibility-pause + slower poll. Was 10s indefinite, now 60s + skip when hidden.
    let interval: ReturnType<typeof setInterval> | null = null;
    const start = (): void => {
      if (interval !== null) return;
      interval = setInterval(load, 60_000);
    };
    const stop = (): void => {
      if (interval !== null) {
        clearInterval(interval);
        interval = null;
      }
    };
    const onVisibility = (): void => {
      if (document.visibilityState === 'visible') start();
      else stop();
    };
    onVisibility();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      stop();
    };
  }, [code]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard may be blocked — fall back to a select-all hint.
      setCopied(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)]" style={{ background: 'var(--color-bg, #f5f3ef)' }}>
      <section className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16">
        <div className="text-center mb-8">
          <p className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: 'var(--color-primary, #ea580c)' }}>
            You're in
          </p>
          <h1
            className={H1.catalogue}
            style={{ color: 'var(--color-text, #1f1b18)' }}
          >
            Welcome to Darshya early access
          </h1>
          <p className="mt-3 text-sm" style={{ color: 'var(--color-text-muted, #6b6258)' }}>
            Check your email to confirm. Then climb the rank by sharing your link.
          </p>
        </div>

        <div
          className="rounded-2xl p-6 sm:p-8 mb-6 text-center"
          style={{
            background: 'var(--color-surface, #fff)',
            border: '1px solid var(--color-border, #e7dfd2)',
          }}
        >
          {error ? (
            <p className="text-sm" style={{ color: '#9a2a0a' }}>
              {error}
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-3xl font-semibold" style={{ color: 'var(--color-primary, #ea580c)', fontFamily: 'var(--font-display)' }}>
                  {stats ? `#${stats.rank}` : '…'}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted, #6b6258)' }}>
                  Your rank
                </p>
              </div>
              <div>
                <p className="text-3xl font-semibold" style={{ color: 'var(--color-text, #1f1b18)', fontFamily: 'var(--font-display)' }}>
                  {stats?.total ?? '…'}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted, #6b6258)' }}>
                  Total joined
                </p>
              </div>
              <div>
                <p className="text-3xl font-semibold" style={{ color: 'var(--color-text, #1f1b18)', fontFamily: 'var(--font-display)' }}>
                  {stats?.referralCount ?? 0}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted, #6b6258)' }}>
                  Friends referred
                </p>
              </div>
            </div>
          )}
        </div>

        <div
          className="rounded-2xl p-6"
          style={{
            background: 'var(--color-surface, #fff)',
            border: '1px solid var(--color-border, #e7dfd2)',
          }}
        >
          <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--color-text, #1f1b18)' }}>
            Share to unlock priority access
          </h2>
          <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted, #6b6258)' }}>
            Every confirmed friend who joins through your link moves you up the leaderboard.
          </p>

          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg mb-4"
            style={{ background: 'var(--color-bg, #faf7f2)', border: '1px solid var(--color-border, #e7dfd2)' }}
          >
            <span className="flex-1 truncate text-xs" style={{ color: 'var(--color-text, #1f1b18)' }}>
              {shareUrl || '—'}
            </span>
            <button
              type="button"
              onClick={copyLink}
              disabled={!shareUrl}
              className={buttonClass('primary', 'md')}
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`${shareMessage} ${shareUrl}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-center text-xs font-medium py-2.5 rounded-lg transition-colors"
              style={{ background: '#25D366', color: '#fff' }}
            >
              WhatsApp
            </a>
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareMessage)}&url=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-center text-xs font-medium py-2.5 rounded-lg transition-colors"
              style={{ background: '#000', color: '#fff' }}
            >
              Twitter / X
            </a>
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-center text-xs font-medium py-2.5 rounded-lg transition-colors"
              style={{ background: '#1877F2', color: '#fff' }}
            >
              Facebook
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
