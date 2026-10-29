'use client';


import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock, IndianRupee, Loader2, Sparkles, Phone } from 'lucide-react';
import AuthGuard from '../../../../components/AuthGuard';
import { useAuth } from '../../../../lib/auth-context';
import { API_BASE_URL } from '../../../../lib/api-config';
import { astrologyFetch, isAstrologyNetworkFailure } from '../../../../lib/astrologer-fetch';
import { DateTimeInput } from '../../../../components/ui/DateInput';
import { buttonClass } from '../../../../components/ui/button-recipe';
import { H1 } from '../../../../components/ui/heading-recipe';
import { userFacingMessage, UserFacingError, serverErrorText } from '../../../../lib/friendly-error';

import { preloadRazorpayCheckout } from '../../../../lib/razorpay-loader';
import {
  availabilitySummary,
  isSlotAvailable,
  type PublicAvailability,
} from '../../../../lib/astrologer-availability';
import { formatIst, localDateTimeMin } from '../../../../lib/consultation-time';
type Astrologer = {
  id: string;
  name: string;
  perMinuteRate: number;
  specializations: string[];
  languages: string[];
  rating: number;
  isOnline: boolean;
  isBusy: boolean;
  /** The astrologer's weekly hours (IST). null = none saved, any time may be requested. */
  availability?: PublicAvailability | null;
};

/** POST /consultation/book refuses a slot further out than this. */
const MAX_DAYS_AHEAD = 60;

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

// P1#4: HttpOnly cookie `darshya_session` is canonical. Bearer header retained
// as additive transition fallback (in-memory session — no localStorage read).
// Every fetch MUST pass `credentials: 'include'` for cross-origin cookie send.
function buildAuthHeaders(accessToken: string | undefined): Record<string, string> {
  return {
    'content-type': 'application/json',
    ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
  };
}

function BookContent() {
  const params = useParams();
  const router = useRouter();
  const { user, session } = useAuth();
  const astrologerId = String(params?.id ?? '');

  const [astrologer, setAstrologer] = useState<Astrologer | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [minutes, setMinutes] = useState<number>(15);
  const [scheduledAt, setScheduledAt] = useState<string>('');
  // DateTimeInput keeps its own date/time text and has no way to empty itself;
  // remounting it is how "Clear" works.
  const [slotKey, setSlotKey] = useState(0);
  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);

  // Fetch checkout.js while the user fills the form, not after create-order returns.
  useEffect(() => { preloadRazorpayCheckout(); }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // DF-12: bounded. A bare `fetch` never rejects on a stalled socket, so
        // the `finally { setLoading(false) }` below could not run and this page
        // held the full-screen Loader2 forever — the same dead spinner the
        // finding reported on /astrology/view, one click further in.
        const res = await astrologyFetch(`${API_BASE_URL}/astrology/astrologers/${astrologerId}`);
        if (!res.ok) throw new Error(`Astrologer fetch failed (${res.status})`);
        const json = (await res.json()) as { astrologer?: Astrologer };
        if (!cancelled) {
          if (json.astrologer) setAstrologer(json.astrologer);
          else setFetchError('Astrologer not found.');
        }
      } catch (err) {
        if (!cancelled) setFetchError(userFacingMessage(err, 'Could not load astrologer.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [astrologerId]);

  const amountInr = astrologer ? Math.round(astrologer.perMinuteRate * minutes) : 0;

  // A requested slot is checked here first so the devotee is told BEFORE the pay
  // button, not by a refusal after it. The server enforces the same rule.
  const slotDate = scheduledAt ? new Date(scheduledAt) : null;
  const slotProblem: string | null = (() => {
    if (!slotDate || !astrologer) return null;
    if (Number.isNaN(slotDate.getTime())) return 'That date and time is not valid.';
    if (slotDate.getTime() <= Date.now()) return 'Pick a time in the future.';
    if (slotDate.getTime() > Date.now() + MAX_DAYS_AHEAD * 86_400_000) {
      return `Slots can be booked up to ${MAX_DAYS_AHEAD} days ahead.`;
    }
    if (!isSlotAvailable(astrologer.availability, slotDate, minutes)) {
      return `${astrologer.name} is not available for the whole ${minutes} minutes from ${formatIst(slotDate)}. Choose a time inside their hours, or clear the slot.`;
    }
    return null;
  })();

  async function handleBook() {
    if (!astrologer || slotProblem) return;
    setPlacing(true);
    setPlaceError(null);
    let paymentCaptured = false;
    try {
      const headers = buildAuthHeaders(session?.accessToken);
      // DF-12: bounded like the load above. Without it the pay button sticks on
      // "Processing…" with no error, which on a payment screen reads as "did my
      // money go through?" — the worst place in the app to hang silently.
      const res = await astrologyFetch(`${API_BASE_URL}/consultation/book`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          astrologerId: astrologer.id,
          minutes,
          ...(scheduledAt ? { scheduledAt: new Date(scheduledAt).toISOString() } : {}),
        }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        // AW-02 (2026-08-12): POST /consultation/book now REFUSES any astrologer
        // id that is not an approved AstrologerProfile — the 15-row mock fixture
        // used to be bookable, so a devotee could be charged for a consultation
        // with someone who does not exist. A stale link to a fixture profile
        // lands here; show the API's own sentence rather than a raw JSON dump.
        throw new UserFacingError(
          serverErrorText(txt, 'We could not book this consultation. Please try again.'),
          res.status,
        );
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
        const verifyRes = await astrologyFetch(`${API_BASE_URL}/consultation/verify-payment`, {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify({
            consultationId: order.consultationId,
            razorpay_order_id: order.razorpayOrderId,
            razorpay_payment_id: `pay_demo_${Date.now()}`,
            razorpay_signature: 'demo',
          }),
        });
        if (!verifyRes.ok) {
          const txt = await verifyRes.text().catch(() => '');
          throw new UserFacingError(
            serverErrorText(txt, 'We could not confirm your payment. If you were charged, contact support@darshya.online.'),
            verifyRes.status,
          );
        }
        router.push(`/consultation/${order.consultationId}/success`);
        return;
      }

      await loadRazorpayScript();
      const Razorpay = (window as unknown as { Razorpay?: new (opts: Record<string, unknown>) => { open: () => void } }).Razorpay;
      if (!Razorpay) throw new UserFacingError('The payment window could not load. Check your connection and try again.');
      if (!order.razorpayKeyId) throw new UserFacingError('Payments are not available right now. Please try again later.');

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
          theme: { color: '#9e6229' },
          modal: { ondismiss: () => reject(new Error('Payment cancelled')) },
          handler: async (response: {
            razorpay_order_id: string;
            razorpay_payment_id: string;
            razorpay_signature: string;
          }) => {
            // Razorpay only calls this once the charge has been captured, so
            // from here on the devotee's money HAS moved. Anything that fails
            // after this line must not be reported as "booking failed".
            paymentCaptured = true;
            try {
              const verifyRes = await astrologyFetch(`${API_BASE_URL}/consultation/verify-payment`, {
                method: 'POST',
                headers,
                credentials: 'include',
                body: JSON.stringify({
                  consultationId: order.consultationId,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                }),
              });
              if (!verifyRes.ok) {
                const txt = await verifyRes.text().catch(() => '');
                throw new UserFacingError(
                  serverErrorText(txt, 'We could not confirm your payment. If you were charged, contact support@darshya.online.'),
                  verifyRes.status,
                );
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
      // DF-12: with a deadline on every call, this branch is now reachable
      // where it previously could not run at all. Two failures reach it and
      // they must not say the same thing.
      if (isAstrologyNetworkFailure(err)) {
        setPlaceError(
          paymentCaptured
            ? 'Your payment went through, but we lost the connection before we could confirm the booking. Do NOT pay again — open My Consultations in a moment, and contact support if it is not there.'
            : 'Could not reach Darshya to start the booking. Nothing was charged — check your connection and try again.',
        );
      } else {
        setPlaceError(userFacingMessage(err, 'Could not start consultation booking'));
      }
    } finally {
      setPlacing(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-indigo-50">
        <Loader2 className="w-8 h-8 text-saffron-600 animate-spin" />
      </div>
    );
  }

  if (fetchError || !astrologer) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-indigo-50 px-4">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-bold text-surface-700 mb-2">Astrologer unavailable</h2>
          <p className="text-surface-500 mb-6">{fetchError ?? 'Could not load this astrologer.'}</p>
          <Link href="/astrology" className={buttonClass('primary', 'md')}>
            Browse Astrologers
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-indigo-50">
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
              <h1 className={`${H1.portal} mb-1`}>Book {astrologer.name}</h1>
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

          {!astrologer.isOnline && (
            <div className="mb-6 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
              {astrologer.name} is offline right now. Your booking is saved to their dashboard and they will see it when
              they next sign in. Pick a preferred slot below to agree a time, or book someone who is online.
            </div>
          )}

          {/* Optional schedule */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-surface-700 mb-2" htmlFor="when">
              Preferred slot <span className="text-xs font-normal text-surface-400">(optional — leave blank to start as soon as the astrologer joins)</span>
            </label>
            <DateTimeInput
              key={slotKey}
              value={scheduledAt}
              onChange={(v) => setScheduledAt(v)}
              min={localDateTimeMin()}
              max={localDateTimeMin(new Date(Date.now() + MAX_DAYS_AHEAD * 86_400_000))}
            />
            {slotDate && !Number.isNaN(slotDate.getTime()) && (
              <p className="prose-meta mt-2 text-surface-600">
                That is <span className="font-semibold">{formatIst(slotDate)}</span> (India time).{' '}
                <button
                  type="button"
                  onClick={() => { setScheduledAt(''); setSlotKey((k) => k + 1); }}
                  className="font-medium text-saffron-700 underline"
                >
                  Clear slot
                </button>
              </p>
            )}
            {slotProblem && (
              <p role="alert" className="mt-2 text-sm text-red-700">{slotProblem}</p>
            )}
            {astrologer.availability && availabilitySummary(astrologer.availability).length > 0 && (
              <div className="mt-3 rounded-lg border border-surface-100 bg-surface-50 p-3">
                <p className="prose-meta font-semibold text-surface-700">Hours for booked slots (IST)</p>
                <ul className="prose-meta mt-1 text-surface-600">
                  {availabilitySummary(astrologer.availability).map((r) => (
                    <li key={r.day}><span className="font-medium">{r.day.slice(0, 3)}</span> {r.text}</li>
                  ))}
                </ul>
              </div>
            )}
            {astrologer.availability && availabilitySummary(astrologer.availability).length === 0 && (
              <p className="prose-meta mt-2 text-surface-600">
                {astrologer.name} is not taking booked time slots right now. You can still request a session that starts when they join.
              </p>
            )}
          </div>

          {/* Summary */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 mb-6">
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
            disabled={placing || !!slotProblem}
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
            <Sparkles className="inline w-3 h-3 text-amber-500" /> Secure Razorpay checkout. Cancel at least 24 hours before a booked slot for a full refund. If the astrologer does not show up, email support@darshya.online for a refund or a free reschedule (see our Refunds page).
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
