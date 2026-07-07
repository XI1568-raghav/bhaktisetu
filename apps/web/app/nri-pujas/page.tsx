import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Globe2,
  Calendar,
  ShieldCheck,
  Video,
  FileText,
  Clock,
  CheckCircle2,
  ArrowRight,
  CreditCard,
  Mail,
  Phone,
  Star,
} from 'lucide-react';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'NRI Pujas — Book a Puja from USA, UK, Canada, Australia | Darshya',
  description:
    'Complete guide for NRIs to book authentic Hindu pujas at verified India temples. Dual currency USD/INR, video proof on WhatsApp, 80G receipt eligible donations, 24-hour cancellation. Trusted by Indian diaspora worldwide.',
  robots: { index: false, follow: false },
  alternates: { canonical: 'https://darshya.online/nri-pujas' },
  openGraph: {
    title: 'NRI Pujas — Book from Anywhere in the World | Darshya',
    description:
      'Step-by-step guide for booking pujas at India temples from abroad. Dual currency, video proof, 80G receipts.',
    url: 'https://darshya.online/nri-pujas',
    type: 'website',
    images: ['/og/default.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NRI Pujas Guide | Darshya',
    description: 'Book pujas at India temples from USA, UK, Canada, Australia.',
  },
};

const popularPujas = [
  { slug: 'satyanarayan-katha', name: 'Satyanarayan Katha', occasion: 'Housewarming, new beginnings', est: '$45-$120' },
  { slug: 'rudrabhishek', name: 'Rudrabhishek', occasion: 'Mahashivratri, Mondays', est: '$60-$180' },
  { slug: 'lakshmi-puja-diwali', name: 'Lakshmi Puja', occasion: 'Diwali, wealth blessings', est: '$50-$160' },
  { slug: 'shraadh-pitra-paksh', name: 'Shraadh / Pitra Paksh', occasion: 'Ancestor remembrance', est: '$70-$200' },
  { slug: 'birthday-janmadin-puja', name: 'Birthday Puja', occasion: 'Janmadin blessings', est: '$40-$110' },
  { slug: 'griha-pravesh', name: 'Griha Pravesh', occasion: 'New home', est: '$80-$220' },
];

const popularTempleCities = [
  { slug: 'varanasi', name: 'Varanasi', deity: 'Kashi Vishwanath, Annapurna' },
  { slug: 'tirupati', name: 'Tirupati', deity: 'Balaji (Venkateswara)' },
  { slug: 'haridwar', name: 'Haridwar', deity: 'Ganga, Mansa Devi' },
  { slug: 'ujjain', name: 'Ujjain', deity: 'Mahakaleshwar' },
  { slug: 'ayodhya', name: 'Ayodhya', deity: 'Ram Lalla' },
  { slug: 'vrindavan', name: 'Vrindavan', deity: 'Krishna, Banke Bihari' },
];

const faqs: Array<{ q: string; a: string }> = [
  {
    q: 'Can I book a puja from outside India?',
    a: 'Yes. Darshya accepts USD, GBP, CAD, AUD, EUR, SGD and AED on every puja listing. Pay with international cards via Stripe. Booking confirmation arrives by email and WhatsApp within minutes.',
  },
  {
    q: 'Will I receive video proof of my puja?',
    a: 'Video proof is mandatory on every booking. The verified pandit uploads a 3-7 minute clip showing the sankalp (your name + gotra), the ritual, and the prasad. You receive a WhatsApp link within 24 hours of completion. Pandit payout is gated on this upload.',
  },
  {
    q: 'How does dual-currency pricing work?',
    a: 'Domestic prices are shown in INR. NRI prices are priced separately to cover international payment processing, currency conversion, dedicated WhatsApp coordination and priority slot allocation. The full NRI price is shown in your local currency at checkout — no hidden conversion markups.',
  },
  {
    q: 'Are the pandits verified?',
    a: 'Every pandit on Darshya passes a 5-step verification: Aadhaar KYC, lineage/gotra check, temple affiliation letter, video test puja and devotee rating gate. We list the pandit\'s name, photo, lineage and language fluency on every booking page.',
  },
  {
    q: 'Can my parents in India also benefit?',
    a: 'Yes. You can book a puja for any beneficiary in India. Just enter their name, gotra and date of birth at checkout. The pandit will mention them in the sankalp. Prasad can be shipped to their address (extra fee for shipping) or to yours abroad.',
  },
  {
    q: 'Is the donation 80G tax-deductible?',
    a: 'Donations to temples with active 80G registration are eligible for Indian income-tax deduction. You receive a 80G receipt (DR-YYYYMMDD-XXXX) via email within 7 days. NRI status does not block 80G eligibility — anyone with an Indian PAN can claim it on Indian-sourced income.',
  },
  {
    q: 'What is the cancellation policy?',
    a: 'Free cancellation up to 24 hours before the scheduled puja time. Refunds processed within 5-7 business days to the original payment method. Within 24 hours, the booking is non-refundable since the pandit has already prepared materials.',
  },
  {
    q: 'How long does the full process take?',
    a: 'Booking: 3 minutes online. Pandit confirmation: same day (within 6 hours, often within 1 hour). Puja completion: 30 minutes to 4 hours depending on the ritual. Video proof: within 24 hours. Prasad shipment (if ordered): 7-21 days international.',
  },
  {
    q: 'Can I watch the puja live?',
    a: 'For most major pujas you can request a live darshan via WhatsApp video call (₹500 / $8 add-on). Sankashti, Rudrabhishek, Satyanarayan and wedding pujas support full live streaming. Other rituals deliver recorded video proof only.',
  },
  {
    q: 'Do you ship prasad internationally?',
    a: 'Yes. Prasad (laddu, kumkum, chunari, sacred thread, photo) ships via DHL/FedEx to 60+ countries. Shipping fee is shown at checkout based on destination. Customs duties are buyer\'s responsibility — most prasad items are duty-free in most countries.',
  },
];

const steps = [
  {
    n: 1,
    title: 'Choose your puja',
    body: 'Browse 50+ rituals by occasion, deity or temple. Each listing shows what\'s included, duration, lineage of pandit and what you\'ll receive (video, photos, prasad).',
  },
  {
    n: 2,
    title: 'Enter sankalp details',
    body: 'Your name, gotra, date of birth, beneficiary (if booking for parents), and any specific prayer intention. This is what the pandit recites at the start of the puja.',
  },
  {
    n: 3,
    title: 'Pay in your currency',
    body: 'Stripe accepts USD, GBP, CAD, AUD, EUR, SGD, AED. Apple Pay and Google Pay supported. Booking confirmed instantly with reference number BS-YYYYMMDD-XXXXX.',
  },
  {
    n: 4,
    title: 'Pandit confirms within 6 hours',
    body: 'You receive a WhatsApp message from the assigned pandit with their photo, lineage, language, and the exact muhurat (auspicious time) for your puja.',
  },
  {
    n: 5,
    title: 'Puja happens at the temple',
    body: 'On the scheduled date, the pandit performs the ritual at the temple sanctum. You can optionally join via WhatsApp video call (add-on).',
  },
  {
    n: 6,
    title: 'Video proof + prasad',
    body: 'Within 24 hours, a 3-7 minute video clip arrives on WhatsApp showing the sankalp, ritual and prasad offering. Prasad ships if ordered. 80G receipt within 7 days.',
  },
];

const trustSignals = [
  { icon: Video, title: 'Video proof mandatory', body: 'Every puja delivers a video — pandit payout is gated on upload.' },
  { icon: ShieldCheck, title: 'Verified pandits only', body: '5-step KYC: Aadhaar, gotra, temple affiliation, test puja, devotee rating.' },
  { icon: CreditCard, title: 'Dual currency, no markup', body: 'USD/GBP/CAD/AUD/EUR/SGD/AED — full price shown upfront.' },
  { icon: Clock, title: '24-hour free cancellation', body: 'Full refund up to 24h before scheduled time.' },
  { icon: FileText, title: '80G tax receipts', body: 'Eligible donations get 80G receipt within 7 days.' },
  { icon: Globe2, title: 'Trusted by diaspora', body: 'NRIs from USA, UK, Canada, Australia, Singapore, UAE.' },
];

const pillarPageJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      '@id': 'https://darshya.online/nri-pujas',
      url: 'https://darshya.online/nri-pujas',
      name: 'NRI Pujas — Book a Puja from USA, UK, Canada, Australia',
      description: metadata.description,
      isPartOf: { '@id': 'https://darshya.online/#website' },
      inLanguage: 'en-IN',
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://darshya.online/' },
        { '@type': 'ListItem', position: 2, name: 'NRI Pujas', item: 'https://darshya.online/nri-pujas' },
      ],
    },
    {
      '@type': 'FAQPage',
      mainEntity: faqs.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
    {
      '@type': 'HowTo',
      name: 'How to book an NRI puja at an India temple from abroad',
      description: '6-step process to book a verified puja with video proof from any country.',
      step: steps.map((s) => ({
        '@type': 'HowToStep',
        position: s.n,
        name: s.title,
        text: s.body,
      })),
    },
  ],
};

export default function NRIPujasPillarPage() {
  return (
    <div className="bg-white text-surface-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pillarPageJsonLd) }}
      />

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="border-b border-surface-200 bg-surface-50">
        <div className="mx-auto max-w-6xl px-6 py-3 text-sm text-surface-600">
          <Link href="/" className="hover:text-saffron-700">
            Home
          </Link>
          <span className="mx-2">/</span>
          <span className="text-surface-900">NRI Pujas</span>
        </div>
      </nav>

      {/* Hero */}
      <header className="bg-gradient-to-b from-saffron-50 via-amber-50 to-white">
        <div className="mx-auto max-w-6xl px-6 py-14 md:py-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-saffron-200 bg-white px-3 py-1 text-xs font-medium text-saffron-700">
            <Globe2 className="h-3.5 w-3.5" />
            For NRIs in USA, UK, Canada, Australia, Singapore, UAE
          </span>
          <h1 className="mt-4 font-display text-4xl md:text-5xl font-semibold leading-tight text-surface-900">
            Book a Puja at an India Temple — from Anywhere in the World
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-surface-700">
            The complete NRI guide to booking authentic Hindu pujas with verified pandits, video
            proof on WhatsApp, dual-currency checkout and 80G tax receipts. Trusted by the Indian
            diaspora across 60+ countries.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/pujas"
              className="inline-flex items-center gap-2 rounded-lg bg-saffron-600 px-5 py-3 text-sm font-medium text-white hover:bg-saffron-700"
            >
              Browse 50+ pujas
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/nri"
              className="inline-flex items-center gap-2 rounded-lg border border-saffron-300 bg-white px-5 py-3 text-sm font-medium text-saffron-700 hover:bg-saffron-50"
            >
              See NRI Premium tier
            </Link>
          </div>
        </div>
      </header>

      {/* Trust signals */}
      <section className="mx-auto max-w-6xl px-6 py-12">
        <h2 className="font-display text-2xl font-semibold text-surface-900">
          Why NRIs choose Darshya
        </h2>
        <p className="mt-2 max-w-2xl text-surface-700">
          Distance from India should not mean distance from dharma. Every booking is anchored on
          verifiable proof.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {trustSignals.map((t) => (
            <div
              key={t.title}
              className="rounded-xl border border-surface-200 bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-sm"
            >
              <t.icon className="h-6 w-6 text-saffron-600" />
              <h3 className="mt-3 font-semibold text-surface-900">{t.title}</h3>
              <p className="mt-1 text-sm text-surface-700">{t.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-surface-50">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <h2 className="font-display text-2xl font-semibold text-surface-900">
            How booking a puja from abroad works
          </h2>
          <p className="mt-2 max-w-2xl text-surface-700">
            Six steps, fully online. Most devotees complete the booking in under 5 minutes.
          </p>
          <ol className="mt-6 grid gap-4 md:grid-cols-2">
            {steps.map((s) => (
              <li
                key={s.n}
                className="rounded-xl border border-surface-200 bg-white p-5"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-saffron-600 text-sm font-semibold text-white">
                    {s.n}
                  </span>
                  <div>
                    <h3 className="font-semibold text-surface-900">{s.title}</h3>
                    <p className="mt-1 text-sm text-surface-700">{s.body}</p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Popular NRI pujas */}
      <section className="mx-auto max-w-6xl px-6 py-12">
        <h2 className="font-display text-2xl font-semibold text-surface-900">
          Pujas most-booked by NRIs
        </h2>
        <p className="mt-2 max-w-2xl text-surface-700">
          Estimated NRI price ranges shown. Final price depends on temple, pandit lineage and
          add-ons.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {popularPujas.map((p) => (
            <Link
              key={p.slug}
              href={`/pujas/${p.slug}`}
              className="group rounded-xl border border-surface-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-saffron-300 hover:shadow-sm"
            >
              <h3 className="font-semibold text-surface-900 group-hover:text-saffron-700">
                {p.name}
              </h3>
              <p className="mt-1 text-sm text-surface-600">{p.occasion}</p>
              <p className="mt-2 text-sm font-medium text-saffron-700">{p.est}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs text-saffron-700">
                Book this puja
                <ArrowRight className="h-3 w-3" />
              </span>
            </Link>
          ))}
        </div>
        <div className="mt-6">
          <Link
            href="/pujas"
            className="text-sm font-medium text-saffron-700 hover:text-saffron-800"
          >
            Browse all 50+ pujas →
          </Link>
        </div>
      </section>

      {/* Popular temple cities */}
      <section className="bg-surface-50">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <h2 className="font-display text-2xl font-semibold text-surface-900">
            Top India temples for NRI bookings
          </h2>
          <p className="mt-2 max-w-2xl text-surface-700">
            Every temple is verified, has active pandit roster, and accepts international bookings.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {popularTempleCities.map((c) => (
              <Link
                key={c.slug}
                href={`/city/${c.slug}`}
                className="group rounded-xl border border-surface-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-saffron-300 hover:shadow-sm"
              >
                <h3 className="font-semibold text-surface-900 group-hover:text-saffron-700">
                  {c.name}
                </h3>
                <p className="mt-1 text-sm text-surface-600">{c.deity}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs text-saffron-700">
                  See temples
                  <ArrowRight className="h-3 w-3" />
                </span>
              </Link>
            ))}
          </div>
          <div className="mt-6">
            <Link
              href="/temples"
              className="text-sm font-medium text-saffron-700 hover:text-saffron-800"
            >
              Browse all temples →
            </Link>
          </div>
        </div>
      </section>

      {/* Gift puja banner */}
      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="rounded-2xl border border-saffron-200 bg-gradient-to-r from-saffron-50 to-amber-50 p-8 md:p-10">
          <div className="grid gap-6 md:grid-cols-[2fr_1fr] md:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-medium text-saffron-700">
                <Star className="h-3.5 w-3.5" />
                Most popular NRI feature
              </span>
              <h2 className="mt-3 font-display text-2xl font-semibold text-surface-900">
                Gift a puja to your parents in India
              </h2>
              <p className="mt-2 max-w-xl text-surface-700">
                Send a Satyanarayan Katha for their anniversary, a Rudrabhishek on Shivratri, or a
                birthday puja for a sibling. They receive WhatsApp confirmation and you receive the
                video proof.
              </p>
            </div>
            <div>
              <Link
                href="/gift"
                className="inline-flex items-center gap-2 rounded-lg bg-saffron-600 px-5 py-3 text-sm font-medium text-white hover:bg-saffron-700"
              >
                Send a gift puja
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-surface-50">
        <div className="mx-auto max-w-4xl px-6 py-12">
          <h2 className="font-display text-2xl font-semibold text-surface-900">
            NRI puja booking — frequently asked
          </h2>
          <p className="mt-2 text-surface-700">
            Ten questions we get from devotees abroad every week.
          </p>
          <div className="mt-6 space-y-3">
            {faqs.map((f) => (
              <details
                key={f.q}
                className="group rounded-xl border border-surface-200 bg-white p-5 open:border-saffron-300"
              >
                <summary className="cursor-pointer list-none font-semibold text-surface-900">
                  <span className="inline-flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-saffron-600" />
                    {f.q}
                  </span>
                </summary>
                <p className="mt-3 pl-7 text-sm text-surface-700">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-4 rounded-2xl bg-surface-900 p-8 text-white md:grid-cols-[2fr_1fr] md:items-center md:p-10">
          <div>
            <h2 className="font-display text-2xl font-semibold">Ready to book your first puja?</h2>
            <p className="mt-2 max-w-xl text-surface-200">
              Pick from 50+ verified pujas across 30+ temple cities. International payment, video
              proof, WhatsApp coordination — all included.
            </p>
          </div>
          <div className="flex flex-col gap-2 md:items-end">
            <Link
              href="/pujas"
              className="inline-flex items-center gap-2 rounded-lg bg-saffron-500 px-5 py-3 text-sm font-medium text-white hover:bg-saffron-600"
            >
              Browse pujas
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 text-sm text-surface-300 hover:text-white"
            >
              <Mail className="h-3.5 w-3.5" />
              Talk to NRI concierge
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
