'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  Clock,
  CreditCard,
  Flame,
  IndianRupee,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Shield,
  Video,
} from 'lucide-react';
import { useAuth } from '../../../lib/auth-context';
import { API_BASE_URL } from '../../../lib/api-config';
import { DateInput } from '../../../components/ui/DateInput';

// ─── Razorpay loader ───────────────────────────────────────────
// Lifted verbatim from /pujas/[slug]/book — keep the two flows
// using identical loader semantics so a future migration to a
// shared util touches one call site, not two.
type RazorpayInstance = {
  open: () => void;
  on: (event: string, handler: (response: { error?: { description?: string } }) => void) => void;
};
type RazorpayConstructor = new (options: Record<string, unknown>) => RazorpayInstance;
type RazorpayWindow = typeof window & { Razorpay?: RazorpayConstructor };

const loadRazorpay = (): Promise<RazorpayConstructor | undefined> => {
  return new Promise((resolve) => {
    const w = window as RazorpayWindow;
    if (w.Razorpay) {
      resolve(w.Razorpay);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve((window as RazorpayWindow).Razorpay);
    document.body.appendChild(script);
  });
};

// ─── Types ─────────────────────────────────────────────────────

interface OfferingSummary {
  id: string;
  name: string;
  deity: string;
  description: string | null;
  basePrice: string;
  durationMinutes: number;
  isActive: boolean;
}

interface PriestSummary {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  isVerified: boolean;
}

interface PriestWithOfferings extends PriestSummary {
  offerings: OfferingSummary[];
}

function getTomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

const DEFAULT_SLOTS = [
  { value: '06:00', label: 'Morning (6:00 AM)' },
  { value: '08:00', label: 'Morning (8:00 AM)' },
  { value: '10:00', label: 'Late morning (10:00 AM)' },
  { value: '12:00', label: 'Noon (12:00 PM)' },
  { value: '16:00', label: 'Evening (4:00 PM)' },
  { value: '18:00', label: 'Evening (6:00 PM)' },
];

function OfferingCheckoutInner() {
  const sp = useSearchParams();
  const offeringId = (sp.get('id') ?? '') as string;
  const { user, session, isAuthenticated } = useAuth();

  // Auth gate — redirect to login the moment we know there's no session.
  // useEffect (not inline redirect) so SSR / first paint stays clean and
  // Next's app router does not complain about navigation-during-render.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Wait for the auth context to settle. If session is missing after
    // mount, push the user to /auth/login with a redirect-back param so
    // they land back on the same checkout after signing in.
    if (isAuthenticated === false) {
      const back = encodeURIComponent(window.location.pathname);
      window.location.href = `/auth/login?redirect=${back}`;
    }
  }, [isAuthenticated]);

  const [offering, setOffering] = useState<OfferingSummary | null>(null);
  const [priest, setPriest] = useState<PriestSummary | null>(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);

  const [scheduledDate, setScheduledDate] = useState(getTomorrow());
  const [scheduledTime, setScheduledTime] = useState(DEFAULT_SLOTS[0]!.value);
  const [devoteeName, setDevoteeName] = useState('');
  const [gotra, setGotra] = useState('');
  const [sankalp, setSankalp] = useState('');
  const [agreedTerms, setAgreedTerms] = useState(false);

  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingNumber, setBookingNumber] = useState('');

  // The INR/USD toggle was removed 2026-08-10 with the Stripe rail. It defaulted
  // to USD for ANY browser outside Asia/Kolkata and displayed `basePrice * 9` as
  // dollars — Rs 1,100 shown and billed as $9,900 (RV-01). Razorpay is now the
  // only gateway and INR the only currency; NRI premium pricing returns with the
  // PayPal rail as a server-quoted amount rendered before payment.

  // Prefill devotee name from the signed-in user once auth resolves.
  useEffect(() => {
    if (user?.fullName && !devoteeName) {
      setDevoteeName(user.fullName);
    }
  }, [user, devoteeName]);

  // ─── Load offering + priest ───────────────────────────────────
  //
  // No dedicated `/priests/offerings/:id` route, so we walk the
  // priests list and find the priest who owns this offering. The
  // public priests endpoint returns a small list (verified only)
  // so this is cheap enough for first cut.
  // TODO(W4): add GET /api/v1/priests/offerings/:id so we can
  // resolve in one round-trip without listing every priest.
  const fetchOffering = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const listRes = await fetch(`${API_BASE_URL}/priests`);
      if (!listRes.ok) {
        throw new Error(`Could not load pandits (${listRes.status}).`);
      }
      const listData = (await listRes.json()) as { priests: PriestSummary[] };
      const priests = listData.priests ?? [];

      for (const p of priests) {
        const detailRes = await fetch(`${API_BASE_URL}/priests/${p.id}`);
        if (!detailRes.ok) continue;
        const detail = (await detailRes.json()) as PriestWithOfferings;
        const match = detail.offerings.find((o) => o.id === offeringId);
        if (match) {
          setOffering(match);
          setPriest({
            id: detail.id,
            displayName: detail.displayName,
            avatarUrl: detail.avatarUrl,
            isVerified: detail.isVerified,
          });
          setLoading(false);
          return;
        }
      }
      setLoadError('This puja offering could not be found or is no longer available.');
    } catch (err: any) {
      setLoadError(err.message || 'Failed to load this puja offering.');
    } finally {
      setLoading(false);
    }
  }, [offeringId]);

  useEffect(() => {
    fetchOffering();
  }, [fetchOffering]);

  const priceInr = offering ? parseFloat(offering.basePrice) : 0;
  const canPay =
    !!offering &&
    !!priest &&
    isAuthenticated &&
    !!devoteeName.trim() &&
    agreedTerms &&
    !paymentLoading;

  // ─── Payment ─────────────────────────────────────────────────
  const handlePayment = async () => {
    if (!offering || !priest) return;
    if (!isAuthenticated) {
      window.location.href = `/auth/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      return;
    }

    setPaymentLoading(true);
    setPaymentError('');

    try {
      // 1. Create booking + Razorpay order in one round-trip.
      const res = await fetch(`${API_BASE_URL}/bookings/from-offering`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.accessToken}`,
        },
        body: JSON.stringify({
          offeringId: offering.id,
          scheduledDate,
          scheduledTime,
          devotees: [
            {
              name: devoteeName.trim(),
              gotra: gotra.trim() || undefined,
            },
          ],
          sankalp: sankalp.trim() || undefined,
          prasadDelivery: false,
        }),
      }).catch(() => null);

      if (!res || !res.ok) {
        const body = res ? await res.json().catch(() => null) : null;
        const msg = body?.error
          ? `${body.error}`
          : res
            ? `Could not create your booking (${res.status}). Please try again or contact support@darshya.online.`
            : 'Network error reaching the booking service. Please check your connection.';
        setPaymentError(msg);
        setPaymentLoading(false);
        return;
      }

      const data = await res.json().catch(() => null);
      if (!data?.orderId || !data?.razorpayOrderId || !data?.amount) {
        setPaymentError('Booking service returned an unexpected response. Please try again.');
        setPaymentLoading(false);
        return;
      }
      const orderId: string = data.orderId;
      const razorpayOrderId: string = data.razorpayOrderId;
      const amount: number = data.amount;

      // 2. Open Razorpay checkout.
      const Razorpay = await loadRazorpay();
      if (!Razorpay) {
        setPaymentError('Could not load Razorpay checkout. Please retry.');
        setPaymentLoading(false);
        return;
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_demo',
        amount,
        currency: 'INR',
        name: 'Darshya',
        description: `${offering.name} with ${priest.displayName}`,
        order_id: razorpayOrderId,
        prefill: {
          name: user?.fullName || devoteeName || '',
          contact: user?.phone || '',
          email: user?.email || '',
        },
        theme: { color: '#ea580c' },
        handler: async (response: any) => {
          // 3. Verify payment server-side. Razorpay's client handler fires
          // even on signature-mismatch attempts; the backend HMAC check
          // is the source of truth. Mirror the wizard's failure UX so
          // devotee never sees "success" without a verified booking.
          const verifyRes = await fetch(`${API_BASE_URL}/bookings/verify-payment`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session?.accessToken}`,
            },
            body: JSON.stringify({
              orderId,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpayOrderId: response.razorpay_order_id,
              razorpaySignature: response.razorpay_signature,
            }),
          }).catch(() => null);

          if (!verifyRes || !verifyRes.ok) {
            setPaymentError(
              `Payment received (id: ${response.razorpay_payment_id}) but we could not confirm your booking. ` +
                `Please email support@darshya.online with this payment ID and we will reconcile within 24 hours.`,
            );
            setPaymentLoading(false);
            return;
          }

          const verifyData = await verifyRes.json().catch(() => null);
          const bkNum: string = verifyData?.bookingNumber ?? data.bookingNumber;
          setBookingNumber(bkNum);
          setBookingSuccess(true);
          setPaymentLoading(false);
        },
        modal: {
          ondismiss: () => {
            setPaymentLoading(false);
          },
        },
      };

      const rzp = new Razorpay(options);
      rzp.on('payment.failed', (response: { error?: { description?: string } }) => {
        setPaymentError(
          response.error?.description ||
            'Payment failed. Please try again or use a different payment method.',
        );
        setPaymentLoading(false);
      });
      rzp.open();
    } catch (err: any) {
      setPaymentError(err.message || 'Something went wrong. Please try again.');
      setPaymentLoading(false);
    }
  };

  // handleStripePayment removed 2026-08-10 — Stripe is no longer a payment rail.

  // ─── Render ──────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-[var(--color-bg)] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-saffron-500 animate-spin" />
      </div>
    );
  }

  if (loadError || !offering || !priest) {
    return (
      <div className="min-h-[100dvh] bg-[var(--color-bg)]">
        <div className="max-w-2xl mx-auto px-4 py-10">
          <Link
            href="/pandits"
            className="inline-flex items-center gap-2 text-sm text-surface-500 hover:text-surface-700 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to pandits
          </Link>
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
              <div>
                <h1 className="text-lg font-semibold text-surface-800">
                  Could not load this puja
                </h1>
                <p className="text-sm text-surface-600 mt-1">
                  {loadError || 'Puja offering not available.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (bookingSuccess) {
    return (
      <div className="min-h-[100dvh] bg-[var(--color-bg)]">
        <div className="max-w-2xl mx-auto px-4 py-10">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-8 text-center">
            <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7 text-green-600" />
            </div>
            <h1 className="text-2xl font-semibold text-surface-800 mb-2">
              Booking confirmed
            </h1>
            <p className="text-sm text-surface-600">
              Your puja booking is confirmed. We have sent a tax invoice to your
              registered email.
            </p>
            <div className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-saffron-50 rounded-lg">
              <span className="text-xs text-surface-500">Booking number</span>
              <span className="text-sm font-semibold text-saffron-700">
                {bookingNumber}
              </span>
            </div>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href={`/dashboard/bookings`}
                className="inline-flex items-center justify-center px-5 py-2.5 bg-saffron-600 text-white text-sm font-medium rounded-lg hover:bg-saffron-700"
              >
                View my bookings
              </Link>
              <Link
                href={`/pandits/${priest.id}`}
                className="inline-flex items-center justify-center px-5 py-2.5 border border-[var(--color-border)] text-surface-700 text-sm font-medium rounded-lg hover:bg-saffron-50"
              >
                Back to pandit
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[var(--color-bg)]">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <Link
          href={`/pandits/${priest.id}`}
          className="inline-flex items-center gap-2 text-sm text-surface-500 hover:text-surface-700 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to {priest.displayName}
        </Link>

        {/* Summary */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 mb-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-saffron-50 rounded-xl flex items-center justify-center shrink-0">
              <Flame className="w-5 h-5 text-saffron-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-lg font-semibold text-surface-800">
                  {offering.name}
                </h1>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-saffron-50 text-saffron-700">
                  {offering.deity}
                </span>
              </div>
              <p className="text-sm text-surface-500">
                with <span className="text-surface-700 font-medium">{priest.displayName}</span>
              </p>
              {offering.description && (
                <p className="text-sm text-surface-600 mt-2 leading-relaxed">
                  {offering.description}
                </p>
              )}
              <div className="flex items-center gap-4 mt-3 text-sm text-surface-600">
                <span className="inline-flex items-center gap-1 font-semibold text-surface-800">
                  <IndianRupee className="w-3.5 h-3.5" />
                  {priceInr.toLocaleString('en-IN')}
                </span>
                <span className="inline-flex items-center gap-1 text-surface-500">
                  <Clock className="w-3.5 h-3.5" />
                  {offering.durationMinutes} min
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 mb-5 space-y-5">
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1.5">
              <Calendar className="w-3.5 h-3.5 inline mr-1" />
              Scheduled date
            </label>
            <DateInput
              min={getTomorrow()}
              value={scheduledDate}
              onChange={(v) => setScheduledDate(v)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1.5">
              <Clock className="w-3.5 h-3.5 inline mr-1" />
              Time slot
            </label>
            <select
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm focus:border-saffron-500 focus:ring-1 focus:ring-saffron-500 outline-none"
            >
              {DEFAULT_SLOTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1.5">
              Devotee name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={devoteeName}
              onChange={(e) => setDevoteeName(e.target.value)}
              placeholder="Your full name as it should appear in the sankalp"
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm focus:border-saffron-500 focus:ring-1 focus:ring-saffron-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1.5">
              Gotra (optional)
            </label>
            <input
              type="text"
              value={gotra}
              onChange={(e) => setGotra(e.target.value)}
              placeholder="e.g. Bharadwaja"
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm focus:border-saffron-500 focus:ring-1 focus:ring-saffron-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1.5">
              Sankalp / intent (optional)
            </label>
            <textarea
              value={sankalp}
              onChange={(e) => setSankalp(e.target.value)}
              rows={2}
              placeholder="e.g. For my mother's health, for prosperity..."
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm focus:border-saffron-500 focus:ring-1 focus:ring-saffron-500 outline-none resize-none"
            />
          </div>
        </div>

        {/* Trust + terms */}
        <div className="bg-saffron-50/50 border border-saffron-100 rounded-xl p-4 mb-5 space-y-2">
          <div className="flex items-start gap-2 text-xs text-surface-700">
            <Video className="w-3.5 h-3.5 text-saffron-600 mt-0.5 shrink-0" />
            <span>Video proof of your puja will be shared after completion.</span>
          </div>
          <div className="flex items-start gap-2 text-xs text-surface-700">
            <Shield className="w-3.5 h-3.5 text-saffron-600 mt-0.5 shrink-0" />
            <span>Free cancellation up to 24 hours before the scheduled time.</span>
          </div>
        </div>

        <label className="flex items-start gap-2 mb-5 text-sm text-surface-700 cursor-pointer">
          <input
            type="checkbox"
            checked={agreedTerms}
            onChange={(e) => setAgreedTerms(e.target.checked)}
            className="mt-0.5 accent-saffron-600"
          />
          <span>
            I agree to the{' '}
            <Link href="/terms" className="text-saffron-600 hover:underline">
              terms of service
            </Link>{' '}
            and{' '}
            <Link href="/refund" className="text-saffron-600 hover:underline">
              refund policy
            </Link>
            .
          </span>
        </label>

        {paymentError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{paymentError}</p>
          </div>
        )}

        {/* The embedded Stripe Elements card block lived here. Batch 1 removed
            handleStripePayment (the only caller of setStripeClientSecret), so
            this branch had been permanently unreachable — dead UI that still
            pulled Stripe Elements into the puja-checkout bundle. Razorpay is
            the only rail on this path. */}

        <button
          type="button"
          disabled={!canPay}
          onClick={handlePayment}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-saffron-600 text-white text-sm font-semibold rounded-lg hover:bg-saffron-700 disabled:bg-surface-300 disabled:cursor-not-allowed transition-colors"
        >
          {paymentLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4" />
              Pay &#8377;{priceInr.toLocaleString('en-IN')} with Razorpay
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default function OfferingCheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] flex items-center justify-center bg-[#faf7f0]"><div className="text-surface-500">Loading…</div></div>}>
      <OfferingCheckoutInner />
    </Suspense>
  );
}
