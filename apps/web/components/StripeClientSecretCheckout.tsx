'use client';

/**
 * Embedded Stripe Payment Element for clientSecret-only flow.
 * Used when server returns clientSecret but no hosted checkoutUrl.
 * Gated on NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY — falls back to mailto if absent.
 */
import { useEffect, useMemo, useState } from 'react';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { Loader2, AlertCircle } from 'lucide-react';

const PK = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

let stripePromise: Promise<Stripe | null> | null = null;
function getStripePromise(): Promise<Stripe | null> | null {
  if (!PK) return null;
  if (!stripePromise) stripePromise = loadStripe(PK);
  return stripePromise;
}

type Props = {
  clientSecret: string;
  bookingNumber: string;
  returnUrl: string;
  onMailtoFallback: (bk: string) => void;
};

export function StripeClientSecretCheckout(props: Props) {
  const promise = useMemo(() => getStripePromise(), []);

  if (!promise) {
    // No publishable key configured — graceful degradation.
    return (
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-medium">Stripe Elements not configured</p>
            <p className="mt-1">
              Your booking <strong>{props.bookingNumber}</strong> is queued. Opening email to support…
            </p>
            <button
              type="button"
              onClick={() => props.onMailtoFallback(props.bookingNumber)}
              className="mt-2 underline"
            >
              Email support
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Elements
      stripe={promise}
      options={{
        clientSecret: props.clientSecret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#ea580c',
            colorBackground: '#ffffff',
            colorText: '#1f2937',
            borderRadius: '8px',
            fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          },
        },
      }}
    >
      <CheckoutForm bookingNumber={props.bookingNumber} returnUrl={props.returnUrl} />
    </Elements>
  );
}

function CheckoutForm({ bookingNumber, returnUrl }: { bookingNumber: string; returnUrl: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (stripe && elements) setReady(true);
  }, [stripe, elements]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    setErrMsg(null);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: returnUrl,
      },
    });

    if (error) {
      setErrMsg(error.message ?? 'Payment failed. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement
        options={{
          layout: { type: 'tabs', defaultCollapsed: false },
          wallets: { applePay: 'auto', googlePay: 'auto' },
        }}
      />

      {errMsg && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errMsg}
        </div>
      )}

      <button
        type="submit"
        disabled={!ready || submitting}
        className="w-full rounded-lg bg-saffron-600 hover:bg-saffron-700 text-white font-semibold py-3 px-4 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
      >
        {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</> : `Pay securely — ${bookingNumber}`}
      </button>

      <p className="text-xs text-surface-500 text-center">
        Payment processed by Stripe. Booking confirmed on success.
      </p>
    </form>
  );
}
