import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Sparkles,
  Globe2,
  Calendar,
  ShieldCheck,
  Phone,
  FileText,
  MessageCircle,
  CheckCircle2,
  ArrowRight,
  Star,
} from 'lucide-react';
import { nriPremiumServiceJsonLd } from '../../lib/jsonld';
import EmailCapture from '../../components/EmailCapture';

export const metadata: Metadata = {
  title: 'NRI Premium — Stay Connected to India | Darshya',
  description:
    'Annual all-access for the Indian diaspora. No NRI surcharge on bookings, weekly 1:1 priest call, priority booking, free 80G receipts, unlimited AI Pandit. ₹5,000 INR / $60 USD per year.',
  alternates: { canonical: 'https://darshya.online/nri' },
  openGraph: {
    title: 'NRI Premium — Darshya',
    description:
      'Annual all-access tier built for the Indian diaspora. ₹5,000 INR / $60 USD per year.',
    url: 'https://darshya.online/nri',
    type: 'website',
    images: ['/og/nri-premium.jpg'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NRI Premium — Darshya',
    description: 'Annual all-access for the Indian diaspora. $60 USD / yr.',
  },
};

const benefits = [
  {
    icon: Globe2,
    title: 'No NRI surcharge on bookings',
    body: 'Pay domestic prices on every puja, donation, and prasad shipment. Saves $30-200 per booking depending on temple tier.',
  },
  {
    icon: Calendar,
    title: 'Priority booking, 7 days early',
    body: 'Book Mahashivratri, Diwali, Janmashtami, Navratri slots before they open to general devotees. No more lottery.',
  },
  {
    icon: Phone,
    title: 'Weekly 1:1 priest video call',
    body: 'Free 30-min Jitsi consultation every week. Discuss family puja, share gotra, get personalized sankalpa guidance in your language.',
  },
  {
    icon: ShieldCheck,
    title: 'No ads, ever',
    body: 'Clean experience across web + mobile. Your donation pages, live darshan streams, and AI Pandit chat stay distraction-free.',
  },
  {
    icon: FileText,
    title: 'Free 80G receipt PDFs',
    body: 'Every donation auto-generates a tax-compliant 80G receipt. India-tax filers get the deduction; US/UK/CA filers get proof for charitable contribution claims.',
  },
  {
    icon: MessageCircle,
    title: 'Unlimited AI Pandit chat',
    body: 'No 5-message daily cap. Ask scripture questions, muhurat lookups, panchang queries — anytime, any language.',
  },
];

const comparison = [
  { feature: 'AI Pandit messages', free: '5 / month', perPuja: '5 / month', nri: 'Unlimited' },
  { feature: 'Booking surcharge', free: 'NRI 9-10× rate', perPuja: 'NRI 9-10× rate', nri: 'Domestic rate' },
  { feature: 'Priority booking window', free: 'No', perPuja: 'No', nri: '7 days early' },
  { feature: 'Weekly priest video call', free: 'No', perPuja: 'No', nri: 'Free, 30 min' },
  { feature: 'Ads', free: 'Yes', perPuja: 'Yes', nri: 'None' },
  { feature: '80G receipt PDF', free: '₹49 each', perPuja: '₹49 each', nri: 'Free, unlimited' },
  { feature: 'Live darshan replay history', free: '24 hours', perPuja: '24 hours', nri: '90 days' },
  { feature: 'Cancellation flexibility', free: '24h notice', perPuja: '24h notice', nri: '4h notice' },
];

const faqs = [
  {
    q: 'How does billing work?',
    a: 'Annual subscription, billed once via Stripe in USD ($60 USD, ~₹5,000 INR equivalent). Auto-renews after 365 days; cancel anytime from /account/subscriptions.',
  },
  {
    q: 'Can I get a refund?',
    a: 'Yes — full refund within 14 days, no questions asked. Pro-rated refund within 90 days. After that, refunds are case-by-case (medical, family emergency).',
  },
  {
    q: 'What about taxes?',
    a: 'US/UK/CA/AU residents: Stripe handles applicable sales tax automatically. The subscription itself is not tax-deductible (it is a service, not a donation). Donations made through Darshya remain 80G-eligible separately.',
  },
  {
    q: 'Do I need to be NRI to subscribe?',
    a: 'No, anyone can subscribe. The tier is named for who it most benefits — Indians abroad who want India-rate pricing and live priest connection. Domestic users are welcome.',
  },
  {
    q: 'How is the 1:1 priest call scheduled?',
    a: 'Book any open slot from /priests directly after subscribing. The first call is auto-scheduled within 7 days. Each subsequent week unlocks one new free slot.',
  },
  {
    q: 'What languages are supported?',
    a: 'Hindi, Tamil, Telugu, Kannada, Bengali, Marathi, English. AI Pandit detects your language; live calls let you pick from priest profiles.',
  },
];

export default function NriPremiumLanding() {
  return (
    <main className="bg-surface-50 min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(nriPremiumServiceJsonLd) }}
      />
      <section className="relative overflow-hidden bg-gradient-to-br from-saffron-50 via-cream-50 to-saffron-100/30 border-b border-surface-200/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-saffron-100 text-saffron-800 text-xs font-medium mb-6">
              <Globe2 className="w-3.5 h-3.5" />
              Built for the Indian diaspora
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-surface-900 mb-6 leading-tight">
              Stay connected to India,
              <br />
              <span className="text-saffron-700">at India prices.</span>
            </h1>
            <p className="text-lg md:text-xl text-surface-600 mb-8 leading-relaxed">
              Annual all-access for NRIs. Drop the surcharge on every puja, get a free weekly 1:1 priest call, and unlimited AI Pandit guidance — all for less than the cost of a single live darshan booking abroad.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              <Link
                href="/auth?redirect=/upgrade"
                className="inline-flex items-center gap-2 px-6 py-3 bg-saffron-600 hover:bg-saffron-700 text-white font-semibold rounded-lg shadow-md shadow-saffron-600/20 transition-all"
              >
                Go Premium — $60 USD / year
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="#compare"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white hover:bg-surface-50 text-surface-800 font-medium rounded-lg border border-surface-200 transition-all"
              >
                Compare plans
              </Link>
            </div>
            <p className="text-xs text-surface-500 mt-4">
              ₹5,000 INR / $60 USD per year · cancel anytime · 14-day full refund
            </p>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <h2 className="text-3xl md:text-4xl font-bold text-surface-900 text-center mb-3">
          What you get
        </h2>
        <p className="text-surface-600 text-center mb-12 max-w-2xl mx-auto">
          Six benefits that pay for the subscription on a single booking.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {benefits.map((b) => {
            const Icon = b.icon;
            return (
              <div
                key={b.title}
                className="bg-white rounded-xl border border-surface-200/60 p-6 hover:shadow-md hover:shadow-surface-900/5 transition-shadow"
              >
                <div className="w-10 h-10 rounded-lg bg-saffron-100 text-saffron-700 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-surface-900 mb-2">{b.title}</h3>
                <p className="text-sm text-surface-600 leading-relaxed">{b.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section id="compare" className="bg-white border-y border-surface-200/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
          <h2 className="text-3xl md:text-4xl font-bold text-surface-900 text-center mb-3">
            Compare plans
          </h2>
          <p className="text-surface-600 text-center mb-12 max-w-2xl mx-auto">
            One annual fee. No surprise charges per booking.
          </p>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full text-sm border border-surface-200 rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-surface-50 text-surface-700">
                  <th className="text-left px-4 py-3 font-medium">Feature</th>
                  <th className="text-center px-4 py-3 font-medium">Free</th>
                  <th className="text-center px-4 py-3 font-medium">Per puja</th>
                  <th className="text-center px-4 py-3 font-medium bg-saffron-50 text-saffron-900">
                    NRI Premium
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((row, i) => (
                  <tr key={row.feature} className={i % 2 === 0 ? 'bg-white' : 'bg-surface-50/50'}>
                    <td className="px-4 py-3 font-medium text-surface-800">{row.feature}</td>
                    <td className="text-center px-4 py-3 text-surface-600">{row.free}</td>
                    <td className="text-center px-4 py-3 text-surface-600">{row.perPuja}</td>
                    <td className="text-center px-4 py-3 font-medium text-saffron-900 bg-saffron-50/50">
                      {row.nri}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-br from-saffron-50 to-cream-50 border-y border-surface-200/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 text-center">
          <div className="flex items-center justify-center gap-1 mb-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star key={i} className="w-5 h-5 text-saffron-500 fill-saffron-500" />
            ))}
          </div>
          <p className="text-lg md:text-xl text-surface-800 italic mb-4 leading-relaxed">
            &ldquo;Saved over $400 in NRI surcharges on Janmashtami booking alone. The weekly priest call has been the most meaningful part — feels like home.&rdquo;
          </p>
          <p className="text-sm text-surface-600">
            <strong className="text-surface-800">Anjali R.</strong> · NRI Premium since 2026
          </p>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <h2 className="text-3xl md:text-4xl font-bold text-surface-900 text-center mb-12">
          Questions
        </h2>
        <div className="space-y-6">
          {faqs.map((f) => (
            <details
              key={f.q}
              className="group bg-white rounded-xl border border-surface-200/60 p-5 open:shadow-md transition-shadow"
            >
              <summary className="flex items-start justify-between cursor-pointer text-base font-semibold text-surface-900 list-none">
                <span>{f.q}</span>
                <span className="ml-4 text-saffron-600 group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="mt-3 text-sm text-surface-600 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <EmailCapture
          source="nri-landing"
          title="Not ready to subscribe yet?"
          subtitle="Get our NRI festival calendar + a $10 trial credit when we launch your country premium tier."
          cta="Notify me"
        />
      </section>

      <section className="bg-saffron-700 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20 text-center">
          <Sparkles className="w-10 h-10 text-saffron-200 mx-auto mb-6" />
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Less than a single live darshan abroad.
          </h2>
          <p className="text-saffron-100 text-lg mb-8 max-w-2xl mx-auto">
            $60 USD (~₹5,000 INR) per year. Cancel anytime. Full refund within 14 days. Your home is one click away.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/auth?redirect=/upgrade"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-saffron-800 hover:bg-saffron-50 font-semibold rounded-lg shadow-md transition-all"
            >
              Go Premium
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/upgrade"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-saffron-800/40 hover:bg-saffron-800/60 text-white font-medium rounded-lg border border-saffron-400/30 transition-all"
            >
              See all plans
            </Link>
          </div>
          <ul className="mt-8 grid sm:grid-cols-3 gap-3 text-sm text-saffron-100 max-w-2xl mx-auto">
            <li className="flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-saffron-200" />
              Stripe secure checkout
            </li>
            <li className="flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-saffron-200" />
              14-day money back
            </li>
            <li className="flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-saffron-200" />
              Cancel in 1 click
            </li>
          </ul>
        </div>
      </section>
    </main>
  );
}
