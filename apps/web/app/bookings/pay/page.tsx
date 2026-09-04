'use client';

// app/bookings/pay/page.tsx — resume payment for a booking that already exists.
//
// DB-03 (prod sweep 2026-08-12, P1). The booking wizard POSTs
// /bookings/create-order and the server commits a real PujaBooking row at
// status `pending_payment` BEFORE Razorpay checkout is opened. Any failure
// after that point — gateway not configured, checkout.js blocked, the customer
// closing the modal — leaves that row behind. It holds one of the offering's
// slot seats for UNPAID_HOLD_MINUTES, and the wizard tells the customer "You
// have NOT been charged", which is true about the money and silent about the
// booking.
//
// Before this page there was NO way to pay one of those rows: the list offered
// only Cancel, and the detail page's pending_payment banner was text with no
// action. One seeded devotee had 8 unpayable ghosts. Every failed checkout was
// unrecoverable revenue.
//
// The one thing this page must never do is POST /bookings/create-order — that
// mints a SECOND booking and a second slot hold for one customer intent, which
// is how the ghosts accumulated in the first place. It calls
// POST /payments/create-order with the existing bookingId; that path is
// idempotent (payment.service.createRazorpayOrder returns the already-initiated
// gateway order instead of creating a duplicate) and it rejects any booking
// that is not this user's and not in pending_payment.

import { useCallback, useEffect, useRef, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, ArrowLeft, Calendar, Clock, Loader2, MapPin, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../../lib/auth-context';
import { API_BASE_URL } from '../../../lib/api-config';
import AuthGuard from '../../../components/AuthGuard';
import { H1 } from '../../../components/ui/heading-recipe';
import { buttonClass } from '../../../components/ui/button-recipe';

// ─── Razorpay ───────────────────────────────────────────────────

type RazorpayInstance = {
  open: () => void;
  on: (event: string, handler: (response: { error?: { description?: string } }) => void) => void;
};
type RazorpayConstructor = new (options: Record<string, unknown>) => RazorpayInstance;
type RazorpayWindow = typeof window & { Razorpay?: RazorpayConstructor };

const loadRazorpay = (): Promise<RazorpayConstructor | undefined> =>
  new Promise((resolve) => {
    const w = window as RazorpayWindow;
    if (w.Razorpay) {
      resolve(w.Razorpay);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve((window as RazorpayWindow).Razorpay);
    script.onerror = () => resolve(undefined);
    document.body.appendChild(script);
  });

// The literal placeholder the API ships when RAZORPAY_KEY_ID is unset. A real
// test key (rzp_test_<random>) is usable; only this exact sentinel means "no
// gateway configured". Same rule as the wizard — opening checkout with the
// placeholder against a live order_id only produces an opaque gateway error.
const RAZORPAY_PLACEHOLDER_KEY = 'rzp_test_demo';
function isUsableRazorpayKey(key: string | null | undefined): key is string {
  return typeof key === 'string' && key.length > 0 && key !== RAZORPAY_PLACEHOLDER_KEY;
}

// ─── Types ──────────────────────────────────────────────────────

interface PendingBooking {
  id: string;
  bookingNumber: string;
  status: string;
  pujaName: string;
  templeName: string;
  templeCity: string;
  scheduledDate: string;
  scheduledTime: string;
  amount: number;
}

function toAmount(v: unknown): number {
  const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : 0;
  return Number.isFinite(n) ? n : 0;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(`${dateStr.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Human wording for a status that is NOT payable. Never invent a state the
 *  server did not claim — an unknown value says exactly that. */
function notPayableReason(status: string): string {
  switch (status) {
    case 'cancelled':
      return 'This booking has already been cancelled, so there is nothing to pay.';
    case 'refunded':
      return 'This booking has already been refunded, so there is nothing to pay.';
    case 'confirmed':
    case 'priest_assigned':
    case 'in_progress':
    case 'completed':
    case 'video_uploaded':
    case 'delivered':
      return 'This booking has already been paid for — no further payment is due.';
    default:
      return 'This booking is not awaiting payment right now.';
  }
}

// ─── Component ──────────────────────────────────────────────────

function ResumePaymentContent() {
  const sp = useSearchParams();
  const bookingId = sp.get('id') ?? '';
  const { session, user } = useAuth();

  const [booking, setBooking] = useState<PendingBooking | null>(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [payError, setPayError] = useState('');
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  // Blocks a second /payments/create-order while one is in flight — the same
  // double-click guard the wizard needed (P0 #PBO-16).
  const inFlight = useRef(false);

  useEffect(() => {
    let cancelled = false;
    if (!bookingId) {
      setLoading(false);
      setLoadError('No booking was specified.');
      return;
    }
    if (!session?.accessToken) return;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/bookings/${bookingId}`, {
          headers: { Authorization: `Bearer ${session.accessToken}` },
        });
        if (!res.ok) {
          if (!cancelled) {
            setLoadError(
              res.status === 404
                ? 'We could not find that booking on your account.'
                // RES-09: the status code told the devotee nothing actionable.
                : 'We could not load that booking. Please try again.',
            );
            setLoading(false);
          }
          return;
        }
        const b = await res.json();
        // The endpoint returns the row itself; some wrappers nest it.
        const raw = b?.booking ?? b;
        if (cancelled) return;
        setBooking({
          id: String(raw?.id ?? bookingId),
          bookingNumber: String(raw?.bookingNumber ?? ''),
          status: String(raw?.status ?? ''),
          pujaName: raw?.pujaType?.name ?? 'Puja',
          templeName: raw?.temple?.name ?? 'Temple',
          templeCity: raw?.temple?.city ?? '',
          scheduledDate: String(raw?.scheduledDate ?? ''),
          scheduledTime: String(raw?.scheduledTimeSlot ?? ''),
          amount: toAmount(raw?.priceAmount),
        });
        setLoading(false);
      } catch {
        if (!cancelled) {
          setLoadError('Network error while loading your booking. Please try again.');
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bookingId, session?.accessToken]);

  const handlePay = useCallback(async () => {
    if (!booking || inFlight.current) return;
    inFlight.current = true;
    setPaying(true);
    setPayError('');

    try {
      // Existing booking id — NOT a new create-order. See the header note.
      const res = await fetch(`${API_BASE_URL}/payments/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.accessToken ?? ''}`,
        },
        body: JSON.stringify({ bookingId: booking.id }),
      }).catch(() => null);

      if (!res || !res.ok) {
        const detail = res ? await res.json().catch(() => null) : null;
        setPayError(
          detail?.error ??
            (res
              ? 'We could not start the payment. Your booking is unchanged — please try again or email support@darshya.online.'
              : 'Network error reaching the payment service. Your booking is unchanged — please try again.'),
        );
        setPaying(false);
        inFlight.current = false;
        return;
      }

      const order = await res.json().catch(() => null);
      if (!order?.orderId || typeof order.amount !== 'number') {
        setPayError('The payment service returned an unexpected response. Please try again.');
        setPaying(false);
        inFlight.current = false;
        return;
      }

      if (!isUsableRazorpayKey(order.razorpayKeyId)) {
        setPayError(
          'Payments are temporarily unavailable — the payment gateway is not configured, so we ' +
            'did not open checkout. You have NOT been charged and this booking is still held. ' +
            'Please try again shortly, or email support@darshya.online and we will complete it for you.',
        );
        setPaying(false);
        inFlight.current = false;
        return;
      }

      const Razorpay = await loadRazorpay();
      if (!Razorpay) {
        setPayError('We could not load the payment window. Please retry, or disable any ad blocker.');
        setPaying(false);
        inFlight.current = false;
        return;
      }

      const rzp = new Razorpay({
        key: order.razorpayKeyId,
        amount: order.amount,
        currency: order.currency ?? 'INR',
        name: 'Darshya',
        description: `${booking.pujaName} at ${booking.templeName}`,
        order_id: order.orderId,
        prefill: {
          name: user?.fullName || '',
          contact: user?.phone || '',
          email: user?.email || '',
        },
        theme: { color: '#ea580c' },
        handler: async (response: any) => {
          // The gateway handler fires even on a signature-mismatch attack; the
          // server's HMAC check is the source of truth. Never show success from
          // this callback alone.
          const verifyRes = await fetch(`${API_BASE_URL}/bookings/verify-payment`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session?.accessToken ?? ''}`,
            },
            body: JSON.stringify({
              orderId: booking.id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpayOrderId: response.razorpay_order_id,
              razorpaySignature: response.razorpay_signature,
            }),
          }).catch(() => null);

          if (!verifyRes || !verifyRes.ok) {
            setPayError(
              `Payment received (id: ${response.razorpay_payment_id}) but we could not confirm your ` +
                `booking. Please email support@darshya.online with this payment ID and we will ` +
                `reconcile within 24 hours.`,
            );
            setPaying(false);
            // Deliberately NOT releasing inFlight: the money may already be
            // captured, so re-clicking Pay must not mint a second order.
            return;
          }

          setPaid(true);
          setPaying(false);
        },
        modal: {
          ondismiss: () => {
            setPaying(false);
            inFlight.current = false;
          },
        },
      });

      rzp.on('payment.failed', (response: any) => {
        setPayError(
          response?.error?.description ||
            'The payment did not go through. Your booking is still held — please try again.',
        );
        setPaying(false);
        inFlight.current = false;
      });

      rzp.open();
    } catch {
      setPayError('Something went wrong starting the payment. Your booking is unchanged.');
      setPaying(false);
      inFlight.current = false;
    }
  }, [booking, session?.accessToken, user]);

  const payable = booking?.status === 'pending_payment';

  return (
    <div className="min-h-[100dvh] bg-surface-50">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <Link
          href="/bookings"
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-surface-500 hover:text-surface-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to My Bookings
        </Link>

        <h1 className={`${H1.portal} mb-1`}>Complete your payment</h1>
        <p className="mb-6 text-sm text-surface-500">
          This booking is already reserved in your name. Paying now confirms it.
        </p>

        {loading && (
          <div className="flex items-center justify-center rounded-xl border border-surface-100 bg-white py-16">
            <Loader2 className="h-6 w-6 animate-spin text-saffron-500" />
            <span className="ml-3 text-sm text-surface-500">Loading your booking…</span>
          </div>
        )}

        {!loading && loadError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            {loadError}
            <div className="mt-4">
              <Link href="/bookings" className="font-semibold underline">
                Go to My Bookings
              </Link>
            </div>
          </div>
        )}

        {!loading && booking && (
          <div className="rounded-xl border border-surface-100 bg-white p-6">
            <p className="font-mono text-xs text-surface-400">{booking.bookingNumber}</p>
            <h2 className="mt-1 text-lg font-semibold text-surface-800">{booking.pujaName}</h2>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-surface-500">
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {booking.templeName}
                {booking.templeCity ? `, ${booking.templeCity}` : ''}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(booking.scheduledDate)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {booking.scheduledTime}
              </span>
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-surface-50 pt-5">
              <span className="text-sm text-surface-500">Amount due</span>
              <span className="text-2xl font-bold text-surface-800">
                ₹{booking.amount.toLocaleString('en-IN')}
              </span>
            </div>

            {paid && (
              <div className="mt-5 rounded-lg border border-tulsi-green/30 bg-tulsi-green-light/20 p-4 text-sm text-tulsi-green-dark">
                <p className="font-semibold">Payment confirmed</p>
                <p className="mt-1">
                  Your booking is confirmed.{' '}
                  <Link href={`/bookings/view?id=${booking.id}`} className="font-semibold underline">
                    View booking
                  </Link>
                </p>
              </div>
            )}

            {!paid && !payable && (
              <div className="mt-5 flex items-start gap-3 rounded-lg border border-surface-200 bg-surface-50 p-4">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-surface-400" />
                <div className="text-sm text-surface-600">
                  <p>{notPayableReason(booking.status)}</p>
                  <Link
                    href={`/bookings/view?id=${booking.id}`}
                    className="mt-2 inline-block font-semibold text-saffron-700 underline"
                  >
                    View booking details
                  </Link>
                </div>
              </div>
            )}

            {!paid && payable && (
              <>
                {payError && (
                  <div className="mt-5 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                    <p>{payError}</p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handlePay}
                  disabled={paying}
                  className={buttonClass('primary', 'md', 'mt-5 w-full')}
                >
                  {paying && <Loader2 className="h-4 w-4 animate-spin" />}
                  Pay ₹{booking.amount.toLocaleString('en-IN')}
                </button>

                <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-surface-500">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Secure payment via Razorpay
                </p>

                <p className="mt-4 text-xs text-surface-500">
                  Do not want this booking any more? You can release it from{' '}
                  <Link href="/bookings" className="font-semibold underline">
                    My Bookings
                  </Link>{' '}
                  so the slot returns to other devotees.
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ResumePaymentPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-surface-500">Loading…</div>}>
      <AuthGuard>
        <ResumePaymentContent />
      </AuthGuard>
    </Suspense>
  );
}
