
import Link from 'next/link';
import { CheckCircle2, Video, Mail } from 'lucide-react';
import { buttonClass } from '../../../components/ui/button-recipe';
import { H1 } from '../../../components/ui/heading-recipe';
import { HAS_80G } from '../../../lib/eighty-g';


export const metadata = {
  title: 'Payment received',
  description: 'Your puja booking is confirmed.',
  robots: { index: false, follow: false },
};

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const bookingNumber = typeof sp.bk === 'string' ? sp.bk : '';
  const paymentIntent = typeof sp.payment_intent === 'string' ? sp.payment_intent : '';
  const status = typeof sp.redirect_status === 'string' ? sp.redirect_status : '';

  return (
    <div className="min-h-[100dvh] bg-[var(--color-bg)] py-12">
      <div className="max-w-xl mx-auto px-4">
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center">
          <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
          <h1 className={`${H1.portal} mt-4`}>Payment received</h1>
          {bookingNumber && (
            <p className="mt-2 text-sm text-surface-600">
              Booking <strong className="font-mono">{bookingNumber}</strong> is confirmed.
            </p>
          )}
          {status && status !== 'succeeded' && (
            <p className="mt-2 text-sm text-amber-700">
              Payment status: <strong>{status}</strong> — we&apos;ll confirm shortly.
            </p>
          )}

          <div className="mt-8 space-y-3 text-left">
            <div className="flex items-start gap-3 rounded-lg bg-surface-50 p-4">
              <Mail className="mt-0.5 h-5 w-5 shrink-0 text-saffron-600" />
              <div className="text-sm">
                <p className="font-semibold text-surface-800">Confirmation email</p>
                <p className="text-surface-600">
                  {HAS_80G
                    ? 'Receipt + 80G info sent to your registered email.'
                    : 'Your payment receipt has been sent to your registered email.'}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg bg-surface-50 p-4">
              <Video className="mt-0.5 h-5 w-5 shrink-0 text-saffron-600" />
              <div className="text-sm">
                <p className="font-semibold text-surface-800">Video proof included</p>
                <p className="text-surface-600">
                  Your puja is booked for the scheduled date. We aim to put the video on your booking page within 24-48 hours of completion.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link
              href="/bookings"
              className={buttonClass('primary', 'md', 'flex-1')}
            >
              View my bookings
            </Link>
            <Link
              href="/"
              className="flex-1 rounded-lg border border-[var(--color-border)] hover:bg-surface-50 text-surface-700 font-semibold py-3 px-4"
            >
              Back to home
            </Link>
          </div>

          {paymentIntent && (
            <p className="mt-6 text-xs text-surface-400 font-mono">ref: {paymentIntent}</p>
          )}
        </div>
      </div>
    </div>
  );
}
