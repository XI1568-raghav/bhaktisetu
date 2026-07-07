
import Link from 'next/link';
import { CheckCircle2, Video, Mail } from 'lucide-react';


export const metadata = {
  title: 'Payment received — Darshya',
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
          <h1 className="mt-4 text-2xl font-bold text-surface-800">Payment received</h1>
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
                <p className="text-surface-600">Receipt + 80G info sent to your registered email.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg bg-surface-50 p-4">
              <Video className="mt-0.5 h-5 w-5 shrink-0 text-saffron-600" />
              <div className="text-sm">
                <p className="font-semibold text-surface-800">Video proof guaranteed</p>
                <p className="text-surface-600">
                  Your puja will be performed on the scheduled date. Video link arrives within 24h of completion.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link
              href="/profile/bookings"
              className="flex-1 rounded-lg bg-saffron-600 hover:bg-saffron-700 text-white font-semibold py-3 px-4"
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
