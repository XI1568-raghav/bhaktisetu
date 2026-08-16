import Link from 'next/link';
import { MessageCircle } from 'lucide-react';

/**
 * This page was the Stripe return URL for the gift-puja checkout: it read
 * `payment_intent` + `redirect_status` off the query string and called
 * `POST /gift-puja/verify-payment` to confirm the order and fire the
 * recipient's WhatsApp template.
 *
 * The Stripe rail was removed 2026-08-11 (owner directive) and both API routes
 * went with it, so nothing redirects here any more. The route is kept — rather
 * than deleted — so any stale link lands somewhere honest instead of a 404,
 * and it is now static: no query parsing, no fetch, no client component.
 */
/**
 * SEO-09 residual (2026-08-16): this export carried a `title` but no
 * `description`, so the page inherited the ROOT layout's — "Experience live
 * darshan, book pujas, explore panchang…" — which describes the homepage and
 * not this dead-end confirmation. It was one of only two served pages left
 * doing that after the SEO-09 sweep. `noindex` keeps it out of a SERP, but the
 * description is what a WhatsApp or Slack unfurl of a stale link still shows.
 */
export const metadata = {
  title: 'Gift Puja',
  description:
    'Gift-puja orders are arranged by the Darshya team directly. This page is kept so older payment links still land somewhere that explains what to do next.',
  robots: { index: false, follow: false },
};

export default function GiftSuccessPage() {
  return (
    <div className="min-h-[100dvh] bg-saffron-50">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl border border-surface-100 p-8 shadow-sm text-center">
          <MessageCircle className="w-12 h-12 text-saffron-600 mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-surface-800 mb-2">
            Gift puja requests are handled by our team
          </h1>
          <p className="text-sm text-surface-500 mb-6">
            There is no self-serve checkout for gift pujas right now. Send us the details and
            we reply within 4 hours with pandit and date options, the final amount, and a
            payment link. Your recipient gets a WhatsApp confirmation and video proof once the
            puja is scheduled.
          </p>
          <Link
            href="/gift"
            className="inline-flex items-center gap-2 px-6 py-3 bg-saffron-600 text-white font-medium rounded-lg hover:bg-saffron-700"
          >
            Request a gift puja
          </Link>
        </div>
      </div>
    </div>
  );
}
