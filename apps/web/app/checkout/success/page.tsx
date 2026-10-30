
import Link from 'next/link';
import { CheckCircle2, Video, Mail } from 'lucide-react';
import { buttonClass } from '../../../components/ui/button-recipe';
import { H1 } from '../../../components/ui/heading-recipe';
import { HAS_80G } from '../../../lib/eighty-g';
import { CheckoutSuccessLines, CheckoutSuccessRef } from './CheckoutSuccessQuery';


export const metadata = {
  title: 'Payment received',
  description: 'Your puja booking is confirmed.',
  robots: { index: false, follow: false },
};

// Fully static (no searchParams on the server): see CheckoutSuccessQuery.tsx.
export default function CheckoutSuccessPage() {
  return (
    <div className="min-h-[100dvh] bg-[var(--color-bg)] py-12">
      <div className="max-w-xl mx-auto px-4">
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center">
          <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
          <h1 className={`${H1.portal} mt-4`}>Payment received</h1>
          <CheckoutSuccessLines />

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

          <CheckoutSuccessRef />
        </div>
      </div>
    </div>
  );
}
