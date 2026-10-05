'use client';

import { useEffect, useState } from 'react';
// DU-05: the one h1 recipe per page archetype. Extras are layout-only.
import { H1 } from '../../components/ui/heading-recipe';
import Link from 'next/link';
import { API_BASE_URL } from '../../lib/api-config';
import { useAuth } from '../../lib/auth-context';
import EmailCapture from '../../components/EmailCapture';
import { buttonClass } from '../../components/ui/button-recipe';
import { serverErrorMessage } from '../../lib/friendly-error';


interface ReferralMeResponse {
  code: string;
  shareUrl: string;
  stats: { totalClaims: number; rewardedClaims: number };
  rewardPerSide: { amount: number; currency: string };
  createdAt: string;
}

export default function ReferPage() {
  const { session, isAuthenticated, isLoading: authLoading } = useAuth();
  const [data, setData] = useState<ReferralMeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !session?.accessToken) {
      setBusy(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/referrals/me`, {
          headers: { Authorization: `Bearer ${session.accessToken}` },
        });
        const json = await res.json();
        if (cancelled) return;
        if (res.status === 503) {
          setError('Referrals are being prepared. Please check back soon.');
        } else if (!res.ok) {
          setError(serverErrorMessage(json, 'Could not load your referral code.'));
        } else {
          setData(json);
        }
      } catch {
        if (!cancelled) setError('Network error. Please try again.');
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, session?.accessToken]);

  async function copyLink() {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  if (authLoading || busy) {
    return (
      <main className="max-w-3xl mx-auto px-6 py-16 text-center">
        <p className="text-surface-600">Loading…</p>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className={`${H1.catalogue} mb-4`}>Refer & Earn</h1>
        <p className="text-surface-700 mb-6">
          Sign in to get your personal referral link. Earn ₹100 in wallet credit when a friend signs up with your link and completes their first puja booking.
        </p>
        <Link
          href="/auth/login?next=/refer"
          className={buttonClass('primary', 'md')}
        >
          Sign in to continue
        </Link>
        <div className="mt-10">
          <EmailCapture
            source="refer-anon"
            title="Not ready to sign in?"
            subtitle="Leave your email — we’ll send your referral link as soon as we launch credits in your region."
            cta="Send me my link"
          />
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className={`${H1.catalogue} mb-4`}>Refer & Earn</h1>
        <p className="text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-4">
          {error}
        </p>
      </main>
    );
  }

  if (!data) return null;

  const reward = `₹${data.rewardPerSide.amount}`;
  const shareText =
    `Try Darshya for live darshan, verified puja bookings and daily panchang. ` +
    `Sign up with my link:`;
  const waUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${data.shareUrl}`)}`;
  const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(data.shareUrl)}`;
  const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(data.shareUrl)}`;
  const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(data.shareUrl)}&text=${encodeURIComponent(shareText)}`;
  const emailUrl = `mailto:?subject=${encodeURIComponent('Darshya — devotional super-app')}&body=${encodeURIComponent(`${shareText}\n\n${data.shareUrl}`)}`;

  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      <nav className="text-sm text-surface-600 mb-6">
        <Link href="/" className="hover:text-saffron-700">Home</Link>
        <span className="mx-2">/</span>
        <span className="text-surface-900">Refer & Earn</span>
      </nav>

      <h1 className={`${H1.catalogue} mb-3`}>
        Refer & Earn {reward}
      </h1>
      <p className="text-surface-700 mb-8">
        Share Darshya with friends and family. When a friend signs up with your link and completes their first puja booking, {reward} is added to your Darshya wallet. Your friend does not receive a credit. Wallet credit cannot be spent at checkout yet; we will say so here when it can.
      </p>

      <section className="rounded-xl border border-saffron-200 bg-saffron-50 p-6 mb-8">
        <p className="text-xs uppercase tracking-wider text-saffron-800 font-semibold mb-2">
          Your referral code
        </p>
        <p className="text-3xl font-mono font-bold text-saffron-900 mb-4 tracking-widest">
          {data.code}
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            readOnly
            value={data.shareUrl}
            className="flex-1 px-3 py-2 rounded-md border border-saffron-300 bg-white text-sm text-surface-800 font-mono"
          />
          <button
            onClick={copyLink}
            className="px-4 py-2 bg-saffron-700 text-white rounded-md text-sm font-medium hover:bg-saffron-800"
          >
            {copied ? 'Copied!' : 'Copy link'}
          </button>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-sm uppercase tracking-wider text-surface-600 font-semibold mb-3">
          Share via
        </h2>
        <div className="flex flex-wrap gap-2">
          <a href={waUrl} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700">WhatsApp</a>
          <a href={xUrl} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-surface-900 text-white rounded-md text-sm font-medium hover:opacity-90">X (Twitter)</a>
          <a href={fbUrl} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700">Facebook</a>
          <a href={tgUrl} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-sky-500 text-white rounded-md text-sm font-medium hover:bg-sky-600">Telegram</a>
          <a href={emailUrl} className="px-4 py-2 border border-surface-300 text-surface-900 rounded-md text-sm font-medium hover:bg-surface-50">Email</a>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4 mb-8">
        <div className="rounded-lg border border-surface-200 p-4">
          <p className="text-xs uppercase tracking-wider text-surface-600 mb-1">Total signups</p>
          <p className="text-3xl font-bold text-surface-900">{data.stats.totalClaims}</p>
        </div>
        <div className="rounded-lg border border-surface-200 p-4">
          <p className="text-xs uppercase tracking-wider text-surface-600 mb-1">Rewards earned</p>
          <p className="text-3xl font-bold text-surface-900">
            {data.stats.rewardedClaims}
          </p>
          <p className="text-xs text-surface-500 mt-1">
            {data.stats.rewardedClaims > 0
              ? `₹${data.stats.rewardedClaims * data.rewardPerSide.amount} credit issued`
              : 'No rewards yet'}
          </p>
        </div>
      </section>

      <section className="border-t border-surface-200 pt-6">
        <h2 className="text-sm uppercase tracking-wider text-surface-600 font-semibold mb-3">
          How it works
        </h2>
        <ol className="space-y-2 text-surface-700 text-sm list-decimal list-inside">
          <li>Share your link with friends and family on WhatsApp, social media or email.</li>
          <li>They sign up on Darshya using your link — your code is captured automatically.</li>
          <li>When they complete their first puja booking, {reward} is added to your wallet balance.</li>
        </ol>
      </section>
    </main>
  );
}
