'use client';


import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, AlertCircle, Loader2, MessageCircle } from 'lucide-react';
import { API_BASE_URL } from '../../../lib/api-config';

type Verify = {
  verified: boolean;
  reference: string;
  status: string;
  whatsappDelivery?: string;
};

function VerifyContent() {
  const params = useSearchParams();
  const orderId = params?.get('orderId') ?? '';
  // Stripe redirect appends payment_intent + payment_intent_client_secret + redirect_status
  const paymentIntentId = params?.get('payment_intent') ?? '';
  const redirectStatus = params?.get('redirect_status') ?? '';

  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading');
  const [verify, setVerify] = useState<Verify | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId || !paymentIntentId) {
      setErr('Missing order or payment id in URL.');
      setState('error');
      return;
    }
    if (redirectStatus === 'failed') {
      setErr('Payment failed at Stripe. Please retry from the gift page.');
      setState('error');
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/gift-puja/verify-payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId, paymentIntentId }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => null) as { error?: string } | null;
          throw new Error(body?.error ?? `Verify failed (${res.status})`);
        }
        const json = (await res.json()) as Verify;
        if (!cancelled) {
          setVerify(json);
          setState('success');
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setErr(e instanceof Error ? e.message : 'Could not verify payment.');
          setState('error');
        }
      }
    })();
    return () => { cancelled = true; };
  }, [orderId, paymentIntentId, redirectStatus]);

  if (state === 'loading') {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-saffron-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-saffron-600 animate-spin mx-auto" />
          <p className="text-sm text-surface-500 mt-3">Confirming payment…</p>
        </div>
      </div>
    );
  }

  if (state === 'error' || !verify) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-saffron-50 px-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-surface-700 mb-2">Could not confirm payment</h2>
          <p className="text-surface-500 mb-6 text-sm">{err}</p>
          <Link href="/gift" className="inline-flex items-center gap-2 px-6 py-3 bg-saffron-600 text-white font-medium rounded-lg hover:bg-saffron-700">
            Back to gift puja
          </Link>
        </div>
      </div>
    );
  }

  const waSent = verify.whatsappDelivery === 'sent';

  return (
    <div className="min-h-[100dvh] bg-saffron-50">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl border border-surface-100 p-8 shadow-sm">
          <div className="flex flex-col items-center text-center mb-6">
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-3" />
            <h1 className="text-2xl font-bold text-surface-800 mb-1">Gift Puja Confirmed</h1>
            <p className="text-sm text-surface-500">
              Your offering is paid and the recipient has been notified.
            </p>
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex items-center justify-between text-sm py-3 border-b border-surface-100">
              <span className="text-surface-500">Reference</span>
              <span className="font-mono font-semibold text-surface-700">{verify.reference}</span>
            </div>
            <div className="flex items-center justify-between text-sm py-3 border-b border-surface-100">
              <span className="text-surface-500">Status</span>
              <span className="font-semibold text-emerald-700 capitalize">{verify.status}</span>
            </div>
            <div className="flex items-center justify-between text-sm py-3 border-b border-surface-100">
              <span className="text-surface-500 flex items-center gap-1.5">
                <MessageCircle className="w-4 h-4" /> WhatsApp delivery
              </span>
              <span className={waSent ? 'font-semibold text-emerald-700' : 'font-semibold text-amber-700'}>
                {waSent ? 'Sent to recipient' : 'Pending / fallback'}
              </span>
            </div>
          </div>

          {!waSent && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              WhatsApp delivery returned: <strong>{verify.whatsappDelivery ?? 'skipped'}</strong>. Our team will manually notify the recipient within 4 hours.
            </p>
          )}

          <p className="text-xs text-surface-500 text-center">
            Full video proof emailed within 24 hours of the puja completion.
          </p>
        </div>

        <div className="text-center mt-6">
          <Link href="/gift" className="text-sm text-surface-500 hover:text-saffron-600">
            ← Back to gift puja
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function GiftSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[100dvh] flex items-center justify-center bg-saffron-50">
        <Loader2 className="w-8 h-8 text-saffron-600 animate-spin" />
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}
