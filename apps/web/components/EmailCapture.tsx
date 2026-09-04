'use client';

import { useState, type FormEvent } from 'react';
import { buttonClass } from './ui/button-recipe';
import { API_BASE_URL } from '../lib/api-config';

interface Props {
  source: string;                // e.g. "home-hero", "nri", "upgrade-paywall"
  title?: string;
  subtitle?: string;
  cta?: string;
  successMessage?: string;
  variant?: 'card' | 'inline';
}

// Thin wrapper over POST /waitlist — gives any landing surface a one-field
// email capture with deterministic source tagging for funnel attribution.
// Idempotent: hitting the same email twice returns the existing row.
export default function EmailCapture({
  source,
  title = 'Get early access',
  // TC-03: this default used to end "…and exclusive launch credits". There is a
  // real credit system (UserCredit / CreditLedgerEntry via
  // WalletService.creditUser) but it has exactly two callers in the whole API —
  // routes/referrals.ts and services/payment.service.ts — and four of the five
  // CreditLedgerReason values are marked "(future)" in the schema. POST
  // /waitlist writes a Waitlist row and sends a confirmation email; it never
  // touches the wallet, and no job grants a credit for joining. So every
  // landing surface mounting this without its own subtitle offered a reward
  // nothing could issue. Guarded by __tests__/tc03-email-capture-defaults.test.tsx.
  subtitle = 'Daily panchang and festival reminders — straight to your inbox.',
  cta = 'Notify me',
  successMessage = 'You’re on the list. Check your inbox to confirm.',
  variant = 'card',
}: Props) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE_URL}/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          source,
          panchangOptIn: true,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.message || 'Could not save your email. Please try again.');
      } else {
        setDone(true);
        // Best-effort PostHog event for funnel measurement.
        import('../lib/posthog')
          .then((m) => m.capture('email_capture_submitted', { source }))
          .catch(() => { /* ignore */ });
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div
        className={
          variant === 'card'
            ? 'rounded-xl border border-saffron-200 bg-saffron-50 p-6 text-center'
            : 'rounded-md border border-saffron-200 bg-saffron-50 px-4 py-3 text-sm text-center'
        }
      >
        <p className="text-saffron-900 font-medium">{successMessage}</p>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2 w-full">
        <input
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="flex-1 px-4 py-2 border border-surface-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-saffron-500"
        />
        <button
          type="submit"
          disabled={busy}
          // DU-03: "Get free panchang" measured 41px tall with a 10px radius
          // — one of the two adjacent homepage CTAs the finding opens with.
          className={buttonClass('primary', 'md')}
        >
          {busy ? '…' : cta}
        </button>
        {error ? <p className="text-xs text-red-600 sm:basis-full">{error}</p> : null}
      </form>
    );
  }

  return (
    <section className="rounded-xl border border-saffron-200 bg-gradient-to-br from-saffron-50 to-amber-50 p-6 sm:p-8">
      <h3 className="text-xl font-bold text-surface-900 mb-2">{title}</h3>
      <p className="text-sm text-surface-700 mb-4">{subtitle}</p>
      <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2">
        <input
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="flex-1 px-4 py-2 border border-surface-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-saffron-500"
        />
        <button
          type="submit"
          disabled={busy}
          className={buttonClass('primary', 'md')}
        >
          {busy ? 'Saving…' : cta}
        </button>
      </form>
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
      <p className="mt-3 text-xs text-surface-500">No spam. Unsubscribe any time.</p>
    </section>
  );
}
