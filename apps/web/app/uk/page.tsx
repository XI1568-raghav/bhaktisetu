import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Sparkles,
  Globe2,
  Calendar,
  ShieldCheck,
  FileText,
  MessageCircle,
  CheckCircle2,
  ArrowRight,
  MapPin,
  PoundSterling,
} from 'lucide-react';
import EmailCapture from '../../components/EmailCapture';
import { formatPrice, gbpFromInr } from '../../lib/pricing';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Darshya UK — Pujas, Darshan & 80G Receipts in GBP for the UK Hindu Diaspora',
  description:
    'Book pujas at Indian temples, watch live aarti, receive 80G receipts — paid in GBP. Built for London, Birmingham, Leicester, Manchester and the wider UK Hindu, Jain & Sikh diaspora.',
  alternates: {
    canonical: 'https://darshya.online/uk',
    languages: {
      'en-GB': 'https://darshya.online/uk',
      'en-IN': 'https://darshya.online',
      'hi-IN': 'https://darshya.online/hi',
    },
  },
  openGraph: {
    title: 'Darshya UK — Pujas & Darshan in GBP',
    description:
      'UK NRI puja booking, live darshan and 80G receipts in GBP. London / Birmingham / Leicester.',
    url: 'https://darshya.online/uk',
    type: 'website',
    locale: 'en_GB',
    images: ['/og/default.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Darshya UK — Pujas in GBP',
    description: 'UK Hindu diaspora — book pujas, watch darshan, get 80G receipts in GBP.',
  },
};

const UK_HUBS = [
  {
    city: 'London',
    population: '350,000+ Hindu population (2021 census)',
    anchors: 'Shri Swaminarayan Mandir Neasden · BAPS · ISKCON Soho · Highgate Hill Murugan',
    diaspora: 'Largest UK Hindu hub — Brent, Harrow, Hounslow, Newham',
  },
  {
    city: 'Birmingham & West Midlands',
    population: '70,000+ Hindu/Jain population',
    anchors: 'Shri Venkateswara Balaji Temple Tividale · Shree Geeta Bhawan · Hare Krishna Temple Coventry',
    diaspora: 'Gujarati & Punjabi heritage — Handsworth, Soho Road, Smethwick',
  },
  {
    city: 'Leicester',
    population: '50,000+ Hindu population (highest % per capita in UK)',
    anchors: 'Shree Sanatan Mandir · Shree Hindu Temple Belgrave · ISKCON Leicester',
    diaspora: 'Belgrave Road "Golden Mile" — East African Gujarati heritage',
  },
];

const BENEFITS = [
  {
    icon: PoundSterling,
    title: 'Pay in GBP via Stripe',
    body: 'UK card, Apple Pay, Google Pay accepted. No FX surprise — see the £ price before you tap pay.',
  },
  {
    icon: Globe2,
    title: 'Indian temple bookings from anywhere in the UK',
    body: 'Rudrabhishek at Kashi Vishwanath, Satyanarayan at Tirupati, Lakshmi Puja at home temple — booked from London at IST timings.',
  },
  {
    icon: Calendar,
    title: 'Live aarti darshan, GMT/BST adjusted',
    body: 'Watch live aarti from Indian temples on your schedule. Calendar shows IST → GMT auto-converted.',
  },
  {
    icon: ShieldCheck,
    title: 'Video proof on every puja',
    body: 'Priest uploads sankalp + main ritual + aarti video. Your grandmother in Ahmedabad sees the same proof as you in Wembley.',
  },
  {
    icon: FileText,
    title: '80G receipts (India tax) on donations',
    body: 'For UK donors with Indian tax filing obligations, every donation comes with a valid 80G receipt from the donee temple.',
  },
  {
    icon: MessageCircle,
    title: 'WhatsApp support — UK timezone',
    body: 'Customer support response by 10am GMT. Real human, not a bot.',
  },
];

// Sample GBP pricing (10x INR domestic, FX £1≈₹105) — founder reviews quarterly
const SAMPLE_PUJAS = [
  { name: 'Rudrabhishek (Kashi Vishwanath)', inr: 2500, type: 'temple-stream' },
  { name: 'Satyanarayan Katha (your home deity)', inr: 1500, type: 'home-puja' },
  { name: 'Lakshmi Puja (Diwali)', inr: 2100, type: 'temple-stream' },
  { name: 'Mahamrityunjaya Jaap 11,000', inr: 5500, type: 'jaap' },
  { name: 'Shraadh Pitru Paksh', inr: 3100, type: 'shraadh' },
];

export default function UkLaunchPage() {
  return (
    <div className="min-h-[100dvh] bg-surface-50">
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-gradient-to-br from-saffron-50 via-amber-50 to-emerald-50/40 px-6 py-16 sm:px-12 lg:px-24 lg:py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-saffron-200 bg-white/80 px-3 py-1 text-xs font-semibold text-saffron-800">
            <MapPin className="h-3.5 w-3.5" /> UK launch · London / Birmingham / Leicester
          </div>
          <h1 className="font-display text-4xl font-bold leading-tight text-surface-900 sm:text-5xl lg:text-6xl">
            Pujas, darshan & 80G receipts — paid in GBP.
          </h1>
          <p className="mt-6 max-w-3xl text-lg text-surface-700 sm:text-xl">
            Built for the UK Hindu, Jain & Sikh diaspora. Book pujas at any Indian temple, watch
            live aarti darshan, get 80G receipts on donations — all from your UK bank card. No
            surcharge surprises, no FX games, no "call our India office".
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/pujas?cc=GB"
              className="inline-flex items-center gap-2 rounded-lg bg-saffron-600 px-6 py-3 font-semibold text-white shadow-sm hover:bg-saffron-700"
            >
              Browse pujas in £ <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/darshan"
              className="inline-flex items-center gap-2 rounded-lg border border-surface-300 bg-white px-6 py-3 font-semibold text-surface-900 hover:bg-surface-50"
            >
              Watch live darshan
            </Link>
          </div>
          <p className="mt-4 text-xs text-surface-600">
            UK GBP rail is rolling out as Stripe NRI activation completes. Email below to get
            notified the moment it goes live in your postcode.
          </p>
        </div>
      </section>

      {/* Why Darshya for UK */}
      <section className="border-y border-surface-200 bg-white px-6 py-16 sm:px-12 lg:px-24">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-display text-3xl font-bold text-surface-900 sm:text-4xl">
            Why UK devotees use Darshya
          </h2>
          <p className="mt-3 max-w-3xl text-surface-700">
            Sri Mandir is built for India domestic. The UK Hindu diaspora needs different things:
            GBP at checkout, GMT-aware aarti schedules, video proof your relatives in India can
            actually watch, and support that responds in your timezone.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {BENEFITS.map((b) => (
              <div
                key={b.title}
                className="rounded-xl border border-surface-200 bg-surface-50/50 p-6 transition hover:-translate-y-0.5 hover:shadow-sm"
              >
                <b.icon className="h-6 w-6 text-saffron-600" />
                <h3 className="mt-3 font-semibold text-surface-900">{b.title}</h3>
                <p className="mt-2 text-sm text-surface-700">{b.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* UK hubs */}
      <section className="bg-surface-50 px-6 py-16 sm:px-12 lg:px-24">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-display text-3xl font-bold text-surface-900 sm:text-4xl">
            Built for UK Hindu hubs
          </h2>
          <p className="mt-3 max-w-3xl text-surface-700">
            We're prioritising London, Birmingham and Leicester at launch — the three UK metros
            with the largest Hindu populations and most active temple communities.
          </p>
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {UK_HUBS.map((hub) => (
              <div
                key={hub.city}
                className="rounded-xl border border-surface-200 bg-white p-6"
              >
                <div className="flex items-center gap-2 text-saffron-700">
                  <MapPin className="h-4 w-4" />
                  <h3 className="font-display text-xl font-semibold text-surface-900">
                    {hub.city}
                  </h3>
                </div>
                <p className="mt-3 text-sm font-medium text-surface-800">{hub.population}</p>
                <p className="mt-2 text-xs text-surface-600">
                  <span className="font-semibold text-surface-700">Anchor mandirs (target community partnerships):</span>{' '}
                  {hub.anchors}
                </p>
                <p className="mt-2 text-xs italic text-surface-600">{hub.diaspora}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-xs text-surface-500">
            Anchor mandirs above are well-known UK Hindu temples — listed as community context, not
            as confirmed Darshya partners. Partnership outreach in progress (R-Q3-S-006 supply
            funnel).
          </p>
        </div>
      </section>

      {/* GBP pricing preview */}
      <section className="border-y border-surface-200 bg-white px-6 py-16 sm:px-12 lg:px-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-display text-3xl font-bold text-surface-900 sm:text-4xl">
            Sample pujas in £
          </h2>
          <p className="mt-3 max-w-3xl text-surface-700">
            Indicative GBP pricing per UK NRI tier. Final price at checkout reflects live FX and
            temple-specific fees. NRI pricing is 9-10x domestic — covers temple operations + UK
            payment processing + USD/GBP infrastructure + a small dharmic donation.
          </p>
          <div className="mt-8 overflow-hidden rounded-xl border border-surface-200">
            <table className="w-full text-sm">
              <thead className="bg-surface-100 text-left text-xs uppercase tracking-wide text-surface-600">
                <tr>
                  <th className="px-4 py-3">Puja</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 text-right">Domestic (₹)</th>
                  <th className="px-4 py-3 text-right">UK NRI (£)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-200 bg-white">
                {SAMPLE_PUJAS.map((p) => (
                  <tr key={p.name}>
                    <td className="px-4 py-3 font-medium text-surface-900">{p.name}</td>
                    <td className="px-4 py-3 text-xs text-surface-600">{p.type}</td>
                    <td className="px-4 py-3 text-right text-surface-700">
                      {formatPrice(p.inr, { currency: 'INR' })}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-saffron-800">
                      {formatPrice(gbpFromInr(p.inr), { currency: 'GBP' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs text-surface-500">
            Reference FX: £1 ≈ ₹105 (spot, 2026-06-15). Founder reviews quarterly. Actual
            checkout price may differ by ±5% based on Stripe FX rate at moment of charge.
          </p>
        </div>
      </section>

      {/* Compliance */}
      <section className="bg-surface-50 px-6 py-16 sm:px-12 lg:px-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-display text-3xl font-bold text-surface-900 sm:text-4xl">
            Compliance & trust
          </h2>
          <ul className="mt-6 space-y-3 text-sm text-surface-700">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
              <span>
                <strong>UK GDPR + Data Protection Act 2018</strong> compliant. Data Processing
                Agreement (DPA) available on request via{' '}
                <a href="mailto:privacy@darshya.online" className="text-saffron-700 underline">
                  privacy@darshya.online
                </a>
                . Cookie banner shipped per R-Q3-L-002 (UK & EEA visitors only).
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
              <span>
                <strong>Stripe-managed payments</strong> — PCI DSS handled by Stripe, no card data
                touches Darshya servers. Strong Customer Authentication (SCA / 3D Secure) enforced
                per UK FCA rules.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
              <span>
                <strong>80G receipts</strong> issued by donee Indian temple (where eligible). UK
                Gift Aid is not currently supported — donations are India-tax-deductible only.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
              <span>
                <strong>Video proof</strong> mandatory on every puja per Darshya business rule —
                no exceptions for UK bookings.
              </span>
            </li>
          </ul>
        </div>
      </section>

      {/* Email capture */}
      <section className="border-t border-surface-200 bg-white px-6 py-16 sm:px-12 lg:px-24">
        <div className="mx-auto max-w-3xl text-center">
          <Sparkles className="mx-auto h-10 w-10 text-saffron-600" />
          <h2 className="mt-4 font-display text-3xl font-bold text-surface-900 sm:text-4xl">
            Be the first to book in £
          </h2>
          <p className="mt-3 text-surface-700">
            UK GBP rail goes live as soon as Stripe NRI activation completes. Drop your email —
            we'll ping you the moment it's ready in your postcode. No spam, no list-selling, single
            launch ping.
          </p>
          <div className="mt-8">
            <EmailCapture source="uk-landing" />
          </div>
        </div>
      </section>

      {/* Schema.org */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Service',
            name: 'Darshya UK — Puja & Darshan Service',
            provider: {
              '@type': 'Organization',
              name: 'Darshya',
              url: 'https://darshya.online',
            },
            serviceType: 'Hindu puja booking and live darshan',
            areaServed: {
              '@type': 'Country',
              name: 'United Kingdom',
            },
            availableLanguage: ['en-GB', 'hi-IN', 'gu-IN', 'ta-IN'],
            offers: {
              '@type': 'AggregateOffer',
              priceCurrency: 'GBP',
              lowPrice: gbpFromInr(500),
              highPrice: gbpFromInr(25000),
              availability: 'https://schema.org/PreOrder',
            },
          }),
        }}
      />
    </div>
  );
}
