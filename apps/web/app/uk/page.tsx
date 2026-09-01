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
import {
  formatPrice,
  gbpFromInr,
  fetchPujaCatalog,
  pickCatalogRows,
  FX_INR_PER_GBP,
} from '../../lib/pricing';
// Read, not duplicated: the same constant the puja checkout adds, so this
// sentence cannot drift away from the number the devotee is actually charged.
import { PLATFORM_FEE_INR } from '../../lib/puja-pricing';
import { rightsContactEmail } from "../../lib/company";
import { buttonClass } from '../../components/ui/button-recipe';
import { H1 } from '../../components/ui/heading-recipe';
import { HAS_80G, RECEIPT_NOUN, RECEIPT_NOUN_PLURAL, NO_80G_DISCLOSURE } from '../../lib/eighty-g';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Darshya UK — Pujas, Darshan & Donations for the UK Hindu Diaspora',
  description:
    `Book pujas at Indian temples, watch live aarti, donate with a ${RECEIPT_NOUN} by email, with £ reference pricing. Built for London, Birmingham, Leicester, Manchester and the wider UK Hindu, Jain & Sikh diaspora.`,
  alternates: {
    canonical: 'https://darshya.online/uk',
    languages: {
      'en-GB': 'https://darshya.online/uk',
      'en-IN': 'https://darshya.online',
      'hi-IN': 'https://darshya.online/hi',
    },
  },
  openGraph: {
    title: 'Darshya UK — Pujas & Darshan for the UK Diaspora',
    description:
      `UK NRI puja booking, live darshan and ${RECEIPT_NOUN_PLURAL}. London / Birmingham / Leicester.`,
    url: 'https://darshya.online/uk',
    type: 'website',
    locale: 'en_GB',
    images: ['/og/default.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Darshya UK — Pujas for the UK Diaspora',
    description: `UK Hindu diaspora — book pujas, watch darshan, get ${RECEIPT_NOUN_PLURAL}.`,
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
    title: 'Book with a UK card',
    body: 'UK cards accepted through Razorpay. Billing is in INR today — a native GBP rail is on the roadmap.'
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
    title: HAS_80G ? '80G receipts (India tax) on donations' : 'A numbered receipt on every donation',
    body: HAS_80G
      ? 'For UK donors with Indian tax filing obligations, every donation comes with a valid 80G receipt from the donee temple.'
      : NO_80G_DISCLOSURE + ' UK Gift Aid is not supported either, so treat a donation here as a gift rather than a relievable payment.',
  },
  {
    icon: MessageCircle,
    title: 'WhatsApp support — UK timezone',
    body: 'Customer support response by 10am GMT. Real human, not a bot.',
  },
];

/**
 * PM-05 (prod sweep 2026-08-12) — this section used to be a hardcoded
 * SAMPLE_PUJAS table:
 *
 *   Rudrabhishek ₹2,500 / £240 · Satyanarayan ₹1,500 / £145 ·
 *   Lakshmi Puja ₹2,100 / £200 · Mahamrityunjaya ₹5,500 / £525 ·
 *   Shraadh ₹3,100 / £295
 *
 * Against the live catalogue those rupee figures were wrong — Rudrabhishek is
 * ₹1,100, Lakshmi Puja ₹901, Mahamrityunjaya ₹2,501 — and there is no
 * "Shraadh Pitru Paksh" SKU at all. The £ column then multiplied the wrong
 * rupee figure by 10 (the "NRI pricing is 9-10x domestic" rule), which the
 * server does not apply: /bookings/from-offering charges `basePrice` to
 * everyone. A London devotee was quoted £240 for a puja the platform charges
 * ₹1,100 (about £10.50) for — on the page built to acquire that exact cohort.
 *
 * Both columns now come from GET /api/v1/pujas/types. The order below is
 * editorial preference only; a slug missing from the catalogue drops out
 * rather than being rendered from memory, and an unreachable catalogue
 * renders no table.
 */
const PREFERRED_PUJA_SLUGS = [
  'rudrabhishek',
  'satyanarayan-katha',
  'lakshmi-puja',
  'maha-mrityunjay-jaap',
  'pitru-dosh-nivaran-puja',
];

/**
 * API `category` enum → the words a UK visitor reads. The six values live on
 * GET /api/v1/pujas/types (read 2026-08-13). An unmapped value falls through to
 * the raw enum rather than to a guess — an odd-looking label is recoverable,
 * a confidently wrong one is not.
 */
const CATEGORY_LABELS: Record<string, string> = {
  planetary: 'Planetary remedy',
  special_occasion: 'Special occasion',
  prosperity: 'Prosperity',
  health: 'Health & longevity',
  daily: 'Daily practice',
  memorial: 'Ancestral rites',
};

export default async function UkLaunchPage() {
  const catalog = await fetchPujaCatalog();
  const samplePujas = pickCatalogRows(catalog, PREFERRED_PUJA_SLUGS, 5);
  return (
    <div className="min-h-[100dvh] bg-surface-50">
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-gradient-to-br from-saffron-50 via-amber-50 to-emerald-50/40 px-6 py-16 sm:px-12 lg:px-24 lg:py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-saffron-200 bg-white/80 px-3 py-1 text-xs font-semibold text-saffron-800">
            <MapPin className="h-3.5 w-3.5" /> UK launch · London / Birmingham / Leicester
          </div>
          <h1 className={H1.marketing}>
            Pujas, darshan & donations for the UK diaspora.
          </h1>
          <p className="prose-lead mt-6 max-w-3xl text-surface-700">
            Built for the UK Hindu, Jain & Sikh diaspora. Book pujas at any Indian temple, watch
            live aarti darshan, donate with a {RECEIPT_NOUN} emailed to you — all from your UK bank card.
            Prices below are shown in £ for reference; you are charged in INR, so your bank
            applies its own rate. No hidden surcharge, no "call our India office".
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/pujas?cc=GB"
              className={buttonClass('primary', 'md', 'shadow-sm')}
            >
              Browse pujas <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/darshan"
              className="inline-flex items-center gap-2 rounded-lg border border-surface-300 bg-white px-6 py-3 font-semibold text-surface-900 hover:bg-surface-50"
            >
              Watch live darshan
            </Link>
          </div>
          <p className="mt-4 text-xs text-surface-600">
            A native GBP checkout is on the roadmap — today you can book with a UK card and be
            billed in INR. Email below to get notified when £ pricing goes live in your postcode.
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
            £ reference pricing, GMT-aware aarti schedules, video proof your relatives in India
            can actually watch, and support that responds in your timezone.
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
            These are our live catalogue prices — the same amount a devotee booking from India
            pays. There is no NRI surcharge and no separate diaspora tier. The £ figures are a
            reference conversion of that exact price, not a quote in £.
          </p>
          {samplePujas.length === 0 ? (
            <div
              data-testid="uk-prices-unavailable"
              className="mt-8 rounded-xl border border-surface-200 bg-surface-50 p-6"
            >
              <p className="text-sm font-medium text-surface-900">
                Puja prices are temporarily unavailable.
              </p>
              <p className="mt-2 max-w-xl prose-meta text-surface-600">
                We could not reach our catalogue, so we are showing no price rather than one we
                cannot honour at checkout. Every live puja and its current price is on the browse
                page.
              </p>
              <Link
                href="/pujas?cc=GB"
                className={buttonClass('primary', 'md', 'mt-4')}
              >
                Browse pujas <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="mt-8 overflow-x-auto rounded-xl border border-surface-200">
              <table className="w-full text-sm">
                <thead className="bg-surface-100 text-left text-xs uppercase tracking-wide text-surface-600">
                  <tr>
                    <th className="px-4 py-3">Puja</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3 text-right">Price charged (₹)</th>
                    <th className="px-4 py-3 text-right">Approx. in £</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-200 bg-white">
                  {samplePujas.map((p) => (
                    <tr key={p.slug}>
                      <td className="px-4 py-3 font-medium text-surface-900">
                        <Link href={`/pujas/${p.slug}`} className="hover:text-saffron-700">
                          {p.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-xs text-surface-600">
                        {CATEGORY_LABELS[p.category] ?? p.category}
                      </td>
                      <td className="px-4 py-3 text-right text-surface-700">
                        {formatPrice(p.basePrice, { currency: 'INR' })}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-saffron-800">
                        ≈ {formatPrice(gbpFromInr(p.basePrice), { currency: 'GBP' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-4 text-xs text-surface-500">
            Reference FX: £1 ≈ ₹{FX_INR_PER_GBP} (spot, 2026-06-15), reviewed quarterly. You are
            billed in INR, so the exact £ amount depends on your card issuer's rate and any
            foreign-transaction fee on the day. A ₹{PLATFORM_FEE_INR} platform fee is added at
            checkout.
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
                <a href={`mailto:${rightsContactEmail()}`} className="text-saffron-700 underline">
                  {rightsContactEmail()}
                </a>
                . Cookie banner shipped per R-Q3-L-002 (UK & EEA visitors only).
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
              <span>
                <strong>Gateway-managed payments</strong> — PCI DSS handled by Razorpay, no card
                data touches Darshya servers. 3D Secure enforced on card payments.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
              <span>
                {HAS_80G ? (
                  <>
                    <strong>80G receipts</strong> issued by donee Indian temple (where eligible). UK
                    Gift Aid is not currently supported — donations are India-tax-deductible only.
                  </>
                ) : (
                  <>
                    <strong>Donation receipts</strong> — {NO_80G_DISCLOSURE} UK Gift Aid is not
                    supported either.
                  </>
                )}
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
            Be the first to know when £ checkout lands
          </h2>
          <p className="mt-3 text-surface-700">
            Native £ checkout is on the roadmap; today UK cards are billed in INR. Drop your email
            — we'll ping you the moment £ pricing is ready in your postcode. No spam, no
            list-selling, single launch ping.
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
            // Billed in INR — advertising a GBP price in structured data puts
            // a £ figure in Google's result and sends the devotee to an
            // INR-only checkout. The £ figures on the page itself are labelled
            // as indicative conversions, which is a different claim.
            offers: {
              '@type': 'AggregateOffer',
              priceCurrency: 'INR',
              lowPrice: 500,
              highPrice: 25000,
              availability: 'https://schema.org/PreOrder',
            },
          }),
        }}
      />
    </div>
  );
}
