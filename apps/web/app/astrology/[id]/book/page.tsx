'use client';

export const runtime = 'edge';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock, IndianRupee, Loader2, Sparkles, Phone } from 'lucide-react';
import AuthGuard from '../../../../components/AuthGuard';
import { useAuth } from '../../../../lib/auth-context';
import { API_BASE_URL } from '../../../../lib/api-config';

type Astrologer = {
  id: string;
  name: string;
  perMinuteRate: number;
  specializations: string[];
  languages: string[];
  rating: number;
  isOnline: boolean;
  isBusy: boolean;
};

const MINUTE_PRESETS = [5, 10, 15, 20, 30, 45, 60] as const;

let razorpayScriptPromise: Promise<void> | null = null;
function loadRazorpayScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if ((window as unknown as { Razorpay?: unknown }).Razorpay) return Promise.resolve();
  if (razorpayScriptPromise) return razorpayScriptPromise;
  razorpayScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
    );
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('razorpay script load failed')), { once: true });
      return;
    }
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => { razorpayScriptPromise = null; reject(new Error('razorpay script load failed')); };
    document.body.appendChild(s);
  });
  return razorpayScriptPromise;
}

function authHeaders(): Record<string, string> {
  const token =
    typeof window !== 'undefined'
      ? localStorage.getItem('poojly_session_token') ?? localStorage.getItem('darshya_session_token')
      : null;
  return {
    'content-type': 'application/json',
    ...(token ? { authorization: `Bearer ${token}` } : {}),
  };
}

function BookContent() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const astrologerId = String(params?.id ?? '');

  const [astrologer, setAstrologer] = useState<Astrologer | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [minutes, setMinutes] = useState<number>(15);
  const [scheduledAt, setScheduledAt] = useState<string>('');
  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/astrology/astrologers/${astrologerId}`);
        if (!res.ok) throw new Error(`Astrologer fetch failed (${res.status})`);
        const json = (await res.json()) as { astrologer?: Astrologer };
        if (!cancelled) {
          if (json.astrologer) setAstrologer(json.astrologer);
          else setFetchError('Astrologer not found.');
        }
      } catch (err) {
        if (!cancelled) setFetchError(err instanceof Error ? err.message : 'Could not load astrologer.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [astrologerId]);

  const amountInr = astrologer ? Math.round(astrologer.perMinuteRate * minutes) : 0;

  async function handleBook() {
    if (!astrologer) return;
    setPlacing(true);
    setPlaceError(null);
    try {
      const headers = authHeaders();
      const res = await fetch(`${API_BASE_URL}/consultation/book`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          astrologerId: astrologer.id,
          minutes,
          ...(scheduledAt ? { scheduledAt: new Date(scheduledAt).toISOString() } : {}),
        }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`Booking failed (${res.status}) ${txt.slice(0, 160)}`);
      }
      const order = (await res.json()) as {
        consultationId: string;
        reference: string;
        amountInr: number;
        amountInPaise: number;
        currency: string;
        razorpayOrderId: string;
        razorpayKeyId: string | null;
        demo: boolean;
      };

      // Demo mode: skip Razorpay UI, immediately verify with synthetic ids.
      if (order.demo) {
        const verifyRes = await fetch(`${API_BASE_URL}/consultation/verify-payment`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            consultationId: order.consultationId,
            razorpay_order_id: order.razorpayOrderId,
            razorpay_payment_id: `pay_demo_${Date.now()}`,
            razorpay_signature: 'demo',
          }),
        });
        if (!verifyRes.ok) {
          const txt = await verifyRes.text().catch(() => '');
          throw new Error(`Demo verify failed (${verifyRes.status}) ${txt.slice(0, 160)}`);
        }
        router.push(`/consultation/${order.consultationId}/success`);
        return;
      }

      await loadRazorpayScript();
      const Razorpay = (window as unknown as { Razorpay?: new (opts: Record<string, unknown>) => { open: () => void } }).Razorpay;
      if (!Razorpay) throw new Error('Razorpay checkout failed to load');
      if (!order.razorpayKeyId) throw new Error('Payment gateway not configured');

      await new Promise<void>((resolve, reject) => {
        const rzp = new Razorpay({
          key: order.razorpayKeyId!,
          amount: order.amountInPaise,
          currency: order.currency,
          name: 'Darshya',
          description: `Consultation with ${astrologer.name} (${minutes} min)`,
          order_id: order.razorpayOrderId,
          prefill: {
            name: user?.fullName ?? '',
            email: user?.email ?? '',
          },
          theme: { color: '#E16318' },
          modal: { ondismiss: () => reject(new Error('Payment cancelled')) },
          handler: async (response: {
            razorpay_order_id: string;
            razorpay_payment_id: string;
            razorpay_signature: string;
          }) => {
            try {
              const verifyRes = await fetch(`${API_BASE_URL}/consultation/verify-payment`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                  consultationId: order.consultationId,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                }),
              });
              if (!verifyRes.ok) {
                const txt = await verifyRes.text().catch(() => '');
                throw new Error(`Verify failed (${verifyRes.status}) ${txt.slice(0, 160)}`);
              }
              router.push(`/consultation/${order.consultationId}/success`);
              resolve();
            } catch (verifyErr) {
              reject(verifyErr);
            }
          },
        });
        rzp.open();
      });
    } catch (err) {
      setPlaceError(err instanceof Error ? err.message : 'Could not start consultation booking');
    } finally {
      setPlacing(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-saffron-50">
        <Loader2 className="w-8 h-8 text-saffron-600 animate-spin" />
      </div>
    );
  }

  if (fetchError || !astrologer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-saffron-50 px-4">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-bold text-surface-700 mb-2">Astrologer unavailable</h2>
          <p className="text-surface-500 mb-6">{fetchError ?? 'Could not load this astrologer.'}</p>
          <Link href="/astrology" className="inline-flex items-center gap-2 px-6 py-3 bg-saffron-600 text-white font-medium rounded-lg hover:bg-saffron-700">
            Browse Astrologers
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-saffron-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href={`/astrology/view?id=${astrologer.id}`}
          className="inline-flex items-center gap-2 text-sm text-surface-500 hover:text-saffron-600 mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to astrologer
        </Link>

        <div className="bg-white rounded-xl border border-surface-100 p-6 lg:p-8 mb-6">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-surface-800 mb-1">Book {astrologer.name}</h1>
              <p className="text-sm text-surface-500">
                {astrologer.specializations.slice(0, 3).join(' · ')}
              </p>
            </div>
            <div className="text-right shrink-0">
              <div className="text-lg font-semibold text-surface-800">
                ₹{astrologer.perMinuteRate}
                <span className="text-sm font-normal text-surface-400">/min</span>
              </div>
              {astrologer.isOnline && !astrologer.isBusy && (
                <span className="text-xs font-semibold text-emerald-600">● Online now</span>
              )}
            </div>
          </div>

          {/* Duration */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-surface-700 mb-3">
              <Clock className="inline w-4 h-4 mr-1 text-saffron-500" /> Duration
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {MINUTE_PRESETS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMinutes(m)}
                  className={`py-2 rounded-lg text-sm font-semibold border transition-colors ${
                    minutes === m
                      ? 'bg-saffron-600 text-white border-saffron-600'
                      : 'bg-white text-surface-600 border-surface-200 hover:border-saffron-300'
                  }`}
                >
                  {m}m
                </button>
              ))}
            </div>
          </div>

          {/* Optional schedule */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-surface-700 mb-2" htmlFor="when">
              Preferred slot <span className="text-xs font-normal text-surface-400">(optional — leave blank to start as soon as the astrologer joins)</span>
            </label>
            <input
              id="when"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full border border-surface-200 rounded-lg px-3 py-2 text-sm"
              min={new Date().toISOString().slice(0, 16)}
            />
          </div>

          {/* Summary */}
          <div className="bg-saffron-50 border border-saffron-100 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between text-sm text-surface-600 mb-1">
              <span>{minutes} min × ₹{astrologer.perMinuteRate}</span>
              <span>₹{amountInr}</span>
            </div>
            <div className="flex items-center justify-between text-base font-bold text-surface-800 pt-2 border-t border-saffron-200">
              <span>Total</span>
              <span className="flex items-center"><IndianRupee className="w-4 h-4" />{amountInr}</span>
            </div>
          </div>

          {placeError && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              {placeError}
            </div>
          )}

          <button
            type="button"
            disabled={placing}
            onClick={handleBook}
            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-green-500 text-white font-bold rounded-xl shadow-md shadow-emerald-500/25 hover:from-emerald-600 hover:to-green-600 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {placing ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
            ) : (
              <><Phone className="w-4 h-4" /> Pay ₹{amountInr} & Start Consultation</>
            )}
          </button>

          <p className="text-xs text-surface-400 text-center mt-3">
            <Sparkles className="inline w-3 h-3 text-amber-500" /> Secure Razorpay checkout. Refund if astrologer doesn't join within 10 min.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AstrologyBookPage() {
  return (
    <AuthGuard>
      <BookContent />
    </AuthGuard>
  );
}
