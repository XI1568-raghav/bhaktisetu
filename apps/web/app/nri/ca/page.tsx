import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Globe2,
  Calendar,
  ShieldCheck,
  Phone,
  FileText,
  MapPin,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { COMPANY } from '../../../lib/company';
import { NRI_PREMIUM_IS_SELLABLE } from '../plan-availability';
import { buttonClass } from '../../../components/ui/button-recipe';
import { H1 } from '../../../components/ui/heading-recipe';

export const revalidate = 86400;

/**
 * TC-01 (P0, trust). Same gate as /gaushala, /donations and /nri. The flag is
 * false, `eightyGNumber` and `pan` are null, and apps/api/src/lib/pdf-receipt
 * .ts stamps every receipt "Proof of donation — not a tax exemption
 * certificate" because `is80GEligible()` needs a donee registration number AND
 * PAN, and neither column is ever written. Promising an Indian deduction to a
 * Canadian filer is the same misrepresentation with an extra jurisdiction on
 * top, so the claim is a branch on the flag rather than a sentence.
 */
const HAS_80G = COMPANY.donationLegal.HAS_80G_VERIFIED;

export const metadata: Metadata = {
  title: 'Canada NRI — Live Puja Booking & Darshan from India',
  description:
    'Built for Indo-Canadian devotees in Toronto, Vancouver, Brampton, Mississauga, Surrey, Calgary. Book pujas at verified temples in India. Live darshan, donation receipts, weekly 1:1 priest call. CAD checkout, transparent pricing.',
  alternates: {
    canonical: 'https://darshya.online/nri/ca',
    languages: {
      en: 'https://darshya.online/nri/ca',
      'en-CA': 'https://darshya.online/nri/ca',
      'x-default': 'https://darshya.online/nri',
    },
  },
  openGraph: {
    title: 'Canada NRI — Darshya',
    description:
      'Indo-Canadian devotional super-app. Pujas at verified India temples, live darshan, AI Pandit. CAD checkout.',
    url: 'https://darshya.online/nri/ca',
    type: 'website',
    locale: 'en_CA',
    images: ['/og/nri-premium.jpg'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Darshya — Canada NRI',
    description: 'India temples + live darshan + CAD checkout for Toronto, Vancouver, Brampton.',
  },
};

const canadaMetros = [
  {
    city: 'Toronto / GTA',
    population: '~250K+ Hindu community',
    note: 'Bramalea, Etobicoke, Scarborough hubs',
  },
  {
    city: 'Vancouver / Lower Mainland',
    population: '~80K+ Indo-Canadian',
    note: 'Surrey, Burnaby, Richmond, Abbotsford',
  },
  {
    city: 'Brampton',
    population: '~180K+ South-Asian',
    note: 'Largest Punjabi-Hindu corridor outside India',
  },
  {
    city: 'Mississauga',
    population: '~90K+ Hindu households',
    note: 'Heartland, Meadowvale, Streetsville',
  },
  {
    city: 'Calgary / Edmonton',
    population: '~60K+ combined',
    note: 'Growing prairie diaspora',
  },
  {
    city: 'Montreal / Ottawa',
    population: '~40K+ combined',
    note: 'Quebec + national-capital region',
  },
];

const benefits = [
  {
    icon: Globe2,
    title: 'Book pujas at verified India temples',
    body: 'Rudrabhishek at Kashi Vishwanath, Satyanarayan at Tirupati, Lakshmi puja at Ujjain Mahakaleshwar. Every temple manually verified by founder — no fake listings.',
  },
  {
    icon: Phone,
    title: 'Live aarti + darshan stream',
    body: 'Watch real-time aarti from your home temple — Vaishno Devi morning, Kashi sandhya, Tirupati suprabhatam. HLS player works on iOS Safari + Chrome Android.',
  },
  {
    icon: FileText,
    title: HAS_80G ? '80G receipts (India tax-deductible)' : 'Donation receipts, emailed instantly',
    body: HAS_80G
      ? 'Donations to registered Indian temples auto-generate 80G receipts. Useful for India-tax filers; documentation for CRA charitable contribution claims.'
      : 'Every donation auto-generates a receipt PDF with its own receipt number. It is proof of payment, not a tax-exemption certificate: Darshya holds no Section 80G registration yet, so a donation made today is not deductible in India, and it is not deductible in Canada either.',
  },
  {
    icon: Calendar,
    title: 'IST scheduling, EST/PST display',
    body: 'See muhurat times in your local timezone (Toronto EST, Vancouver PST). Auto-converts so you book the right India slot the first time.',
  },
  {
    icon: ShieldCheck,
    title: 'Pandit-verified, video proof mandatory',
    body: `Every booking ships a video of your puja being performed. If none has arrived ${COMPANY.refunds.missingVideoEscalationHours}h after your slot, a sweep cancels a booking still waiting on its assigned pandit and sends it for manual refund review; any other status is reviewed when you write in. Where the pandit is at fault the refund is 100%. Pandits Aadhaar-verified before payout.`,
  },
  {
    icon: Sparkles,
    title: 'AI Pandit in your language',
    // TC-04: this used to end "…; unlimited on NRI Premium." That tier is
    // withdrawn from sale — both activation rails answer 400 — so the sentence
    // upsold a plan that cannot be bought. Gated on the same constant /nri
    // uses, so the upsell returns with the plan rather than being rewritten.
    body: NRI_PREMIUM_IS_SELLABLE
      ? 'Ask scripture, panchang, muhurat, gotra questions in English, Hindi, Punjabi, Tamil, Gujarati. Daily 5 free questions; unlimited on NRI Premium.'
      : 'Ask scripture, panchang, muhurat, gotra questions in English, Hindi, Punjabi, Tamil, Gujarati. 5 free questions a month.',
  },
];

const founderFaqs = [
  {
    q: 'Why launch in Canada?',
    a: 'Canada has ~1.5M people of South-Asian origin per 2021 Census (≈3.7% population) with the densest Hindu corridor outside India in Brampton + Mississauga. Strong CAD purchasing power + India ties = high willingness to pay for puja-by-proxy + live darshan.',
  },
  {
    q: 'Is checkout in CAD?',
    a: 'A native CAD rail is on the roadmap. Today Canadian cards are accepted through Razorpay and billed in INR, so your bank applies its own conversion rate and any foreign-transaction fee.',
  },
  {
    q: 'Are these temples real?',
    a: 'Yes. Every temple in the catalog is verified by founder before going live — temple board MoU, government registration check (12A/80G), site visit or video call with priest-in-charge.',
  },
  {
    q: 'What about Canadian tax?',
    a: HAS_80G
      ? 'Donations to Indian temples are NOT CRA-registered charities, so they do not generate Canadian charitable receipts. 80G is India-tax-deductible only. The NRI Premium subscription is a service (not a donation) and is billed in INR; no Canadian GST/HST is collected by us.'
      : 'Donations to Indian temples are NOT CRA-registered charities, so they do not generate Canadian charitable receipts. Nor are they deductible in India today: Darshya does not hold a Section 80G registration, so the receipt we issue is proof of payment and nothing more. The NRI Premium subscription is a service (not a donation) and is billed in INR; no Canadian GST/HST is collected by us.',
  },
  {
    q: 'What languages?',
    a: 'English + Hindi shipping today. Punjabi (Gurmukhi script) prioritized given Brampton + Surrey diaspora. Tamil + Gujarati on roadmap.',
  },
  {
    q: 'When does this go live for payments?',
    a: 'A native CAD rail is an open activation gate (U2). This page goes live first to seed organic discovery + Toronto/Vancouver SEO; in the meantime Canadian cards can already book, billed in INR.',
  },
];

export default function CanadaNriLanding() {
  return (
    <main className="bg-surface-50 min-h-[100dvh]">
      <section className="relative overflow-hidden bg-gradient-to-br from-saffron-50 via-cream-50 to-saffron-100/30 border-b border-surface-200/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-saffron-100 text-saffron-800 text-xs font-medium mb-6">
              <MapPin className="w-3.5 h-3.5" />
              For Indo-Canadians in Toronto, Vancouver, Brampton, Mississauga
            </div>
            <h1 className={`${H1.marketing} mb-6`}>
              India temples, from
              <br />
              <span className="text-saffron-700">your Canada home.</span>
            </h1>
            <p className="prose-lead text-surface-600 mb-8 leading-relaxed">
              Book pujas at verified India temples. Watch live aarti. Get video proof of every booking. Built for the Canadian Hindu, Punjabi, Tamil, and Gujarati diaspora — from morning Kashi sandhya to evening Tirupati suprabhatam, on your timezone.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              <Link
                href="/pujas"
                className={buttonClass('primary', 'md', 'shadow-md shadow-saffron-600/20')}
              >
                Browse pujas
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/darshan"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white hover:bg-surface-50 text-surface-800 font-medium rounded-lg border border-surface-200 transition-all"
              >
                Watch live darshan
              </Link>
            </div>
            <p className="text-xs text-surface-500 mt-4">
              CAD checkout activation in progress · Toronto + Vancouver + Brampton priority metros · video proof on every puja
            </p>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <h2 className="text-3xl md:text-4xl font-bold text-surface-900 text-center mb-3">
          Built for Canadian metros
        </h2>
        <p className="text-surface-600 text-center mb-12 max-w-2xl mx-auto">
          Indo-Canadian community size + diaspora corridor highlights for target launch metros.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {canadaMetros.map((m) => (
            <div
              key={m.city}
              className="bg-white border border-surface-200 rounded-xl p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-saffron-600" />
                <h3 className="font-semibold text-surface-900">{m.city}</h3>
              </div>
              <p className="text-sm text-surface-700 mb-1">{m.population}</p>
              <p className="text-xs text-surface-500">{m.note}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-surface-500 text-center mt-6">
          Community size figures are 2021 Statistics Canada / public estimates; treat as planning targets, not verified booking counts.
        </p>
      </section>

      <section className="bg-white border-y border-surface-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
          <h2 className="text-3xl md:text-4xl font-bold text-surface-900 text-center mb-3">
            What you get
          </h2>
          <p className="text-surface-600 text-center mb-12 max-w-2xl mx-auto">
            Live India temple access, video proof, AI pandit, and tax-aware receipts — designed for diaspora reality.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {benefits.map((b) => (
              <div key={b.title} className="border border-surface-200 rounded-xl p-5">
                <b.icon className="w-6 h-6 text-saffron-600 mb-3" />
                <h3 className="font-semibold text-surface-900 mb-2">{b.title}</h3>
                <p className="text-sm text-surface-700 leading-relaxed">{b.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <h2 className="text-3xl md:text-4xl font-bold text-surface-900 text-center mb-3">
          Canada launch FAQ
        </h2>
        <p className="text-surface-600 text-center mb-10">
          Founder transparency — what works today vs what is gated on activation.
        </p>
        <div className="space-y-3">
          {founderFaqs.map((f, i) => (
            <details
              key={i}
              className="group bg-white border border-surface-200 rounded-xl p-5"
            >
              <summary className="font-semibold text-surface-900 cursor-pointer flex items-center justify-between">
                <span>{f.q}</span>
                <ArrowRight className="w-4 h-4 text-saffron-600 group-open:rotate-90 transition-transform" />
              </summary>
              <p className="text-sm text-surface-700 mt-3 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="bg-gradient-to-br from-saffron-50 to-cream-50 border-t border-surface-200/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-surface-900 mb-3">
            Be first when CAD checkout goes live
          </h2>
          <p className="text-surface-700 mb-6 max-w-xl mx-auto">
            Join the Canada waitlist. We email Toronto, Vancouver, and Brampton subscribers first when CAD pricing goes live.
          </p>
          {/* TC-04: this CTA read "See NRI Premium tier" and sent a Canadian
              visitor to a plan that cannot be bought — both activation rails
              answer 400 with the withdrawal message. While it is withdrawn the
              button points at what the visitor can actually do today; the
              upsell returns with the plan. */}
          <Link
            href={NRI_PREMIUM_IS_SELLABLE ? '/nri' : '/temples'}
            className={buttonClass('primary', 'md', 'shadow-md shadow-saffron-600/20')}
          >
            {NRI_PREMIUM_IS_SELLABLE ? 'See NRI Premium tier' : 'Browse verified temples'}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Service',
            name: 'Darshya — Canada NRI Devotional Platform',
            description:
              'Live darshan, puja booking at verified India temples, and AI Pandit guidance built for the Indo-Canadian diaspora across Toronto, Vancouver, Brampton, Mississauga, Calgary, Edmonton, Montreal, and Ottawa.',
            provider: {
              '@type': 'Organization',
              name: 'Darshya',
              url: 'https://darshya.online',
            },
            areaServed: {
              '@type': 'Country',
              name: 'Canada',
            },
            availableLanguage: ['en', 'hi'],
            url: 'https://darshya.online/nri/ca',
          }),
        }}
      />
    </main>
  );
}
