'use client';

import { useEffect, useState } from 'react';

/**
 * The query-dependent lines of /checkout/success.
 *
 * The page used to read `searchParams` on the server, which made Next render it
 * per request in the Cloudflare Worker (free plan: 10 ms CPU, cold start = error
 * 1102) on the one screen a customer sees right after paying. The shell is now
 * fully static and served from assets; the booking number, the gateway status
 * and the reference are read from the address bar in the browser after hydration
 * (history.replaceState-free: nothing here navigates).
 */
interface Query {
  bk: string;
  paymentIntent: string;
  status: string;
}

const EMPTY: Query = { bk: '', paymentIntent: '', status: '' };

function useCheckoutQuery(): Query {
  const [q, setQ] = useState<Query>(EMPTY);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setQ({
      bk: p.get('bk') ?? '',
      paymentIntent: p.get('payment_intent') ?? '',
      status: p.get('redirect_status') ?? '',
    });
  }, []);
  return q;
}

export function CheckoutSuccessLines() {
  const { bk, status } = useCheckoutQuery();
  return (
    <>
      {bk && (
        <p className="mt-2 text-sm text-surface-600">
          Booking <strong className="font-mono">{bk}</strong> is confirmed.
        </p>
      )}
      {status && status !== 'succeeded' && (
        <p className="mt-2 text-sm text-amber-700">
          Payment status: <strong>{status}</strong> — we&apos;ll confirm shortly.
        </p>
      )}
    </>
  );
}

export function CheckoutSuccessRef() {
  const { paymentIntent } = useCheckoutQuery();
  if (!paymentIntent) return null;
  return <p className="mt-6 text-xs text-surface-400 font-mono">ref: {paymentIntent}</p>;
}
