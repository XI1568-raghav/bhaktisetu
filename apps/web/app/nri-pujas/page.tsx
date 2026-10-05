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
import { fetchPublicStats, type PublicStats } from '../../lib/live-stats';
import { getPujaTypes } from '../../lib/api';
import { COMPANY } from '../../lib/company';
import {
  CANCELLATION_BADGE_LABEL,
  CANCELLATION_BADGE_DESC,
  CANCELLATION_POLICY_SENTENCE,
  REFUND_SETTLEMENT_SENTENCE,
} from '../../lib/cancellation-policy';
import { NRI_PREMIUM_IS_SELLABLE } from '../nri/plan-availability';
import { buttonClass } from '../../components/ui/button-recipe';
import { H1 } from '../../components/ui/heading-recipe';

export const revalidate = 86400;

/**
 * LEG-13 (prod sweep 2026-08-12) — four CTAs on this page advertised a puja
 * catalogue five times the size of the real one, and the final CTA added a
 * temple-city count that was larger than the entire temple table. The API
 * returned 10 puja types and 20 temples. /about was rewired to live counts in
 * the same sweep; this surface, the highest-value NRI acquisition page, was
 * not. There is no city count anywhere in the API, so that half of the claim is
 * dropped rather than re-derived from something adjacent.
 *
 * Same rule as lib/live-stats: a count we could not read is OMITTED, never
 * replaced with a remembered figure.
 */
function countedNoun(count: number | null, noun: string): string {
  return count === null ? noun : `${count.toLocaleString('en-IN')} ${noun}`;
}

/**
 * TC-01 (P0) / TC-08 (P1) / LEG-03 straggler — seven surfaces on this page
 * promised an 80G deduction, two published a pandit vetting process that does
 * not run, and one trust card published a cancellation ladder the engine does
 * not honour.
 *
 * 80G: `HAS_80G_VERIFIED` is false, `eightyGNumber` and `pan` are both null,
 * and apps/api/src/lib/pdf-receipt.ts stamps every receipt "Proof of donation
 * — not a tax exemption certificate" because `is80GEligible()` needs a donee
 * registration number AND a PAN, and `gaushala_profiles.regn_80g` / `.pan` are
 * read in one place and written nowhere. Same gate as lib/company.ts.
 *
 * Vetting: there is no gotra check, no temple-affiliation letter, no test puja
 * and no rating gate. `Priest.isVerified`, `.verificationStatus` and
 * `.aadhaarVerified` have no writer outside apps/api/prisma/seed.ts, and
 * `.aadhaarVerified` is read in exactly one place — payment.service.ts, as a
 * PAYOUT gate. The replacement wording is the sentence already shipping at
 * app/temples/[slug]/pujas/page.tsx, reused verbatim so they cannot drift.
 *
 * Cancellation: the "Full refund up to 24h before scheduled time" trust card
 * slipped past the LEG-03 guards because it phrased the promise differently
 * from the two literals they scan for. The engine pays 100% at 48h or more and
 * 75% in the 24-48h band, so the card renders lib/cancellation-policy instead
 * of a fourth hand-typed ladder.
 */
const HAS_80G = COMPANY.donationLegal.HAS_80G_VERIFIED;

export const metadata: Metadata = {
  title: 'NRI Pujas — Book a Puja from USA, UK, Canada, Australia',
  description:
    'Complete guide for NRIs to book authentic Hindu pujas at verified India temples. International cards billed in INR, video proof on WhatsApp' +
    (HAS_80G ? ', 80G receipt eligible donations' : ', numbered donation receipts') +
    `. ${CANCELLATION_BADGE_LABEL}. Trusted by Indian diaspora worldwide.`,
  robots: { index: false, follow: false },
  alternates: { canonical: 'https://darshya.online/nri-pujas' },
  openGraph: {
    title: 'NRI Pujas — Book from Anywhere in the World | Darshya',
    description:
      'Step-by-step guide for booking pujas at India temples from abroad. International cards billed in INR, video proof' +
      (HAS_80G ? ', 80G receipts.' : ', donation receipts.'),
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
    a: 'Yes. You can book every puja listing from abroad using an international card. Billing is in Indian Rupees through Razorpay, so your bank applies its own conversion rate. Your booking confirmation is emailed to you, and sent on WhatsApp where that is enabled for your number.',
  },
  {
    q: 'Will I receive video proof of my puja?',
    a: `Video proof is mandatory on every booking. The assigned pandit uploads a 3-7 minute clip showing the sankalp (your name + gotra), the ritual, and the prasad. We aim to have the WhatsApp link with you within ${COMPANY.refunds.videoProofTargetLabel} of completion; if nothing has arrived ${COMPANY.refunds.missingVideoEscalationHours} hours after your slot, write in and a person reviews it.`,
  },
  {
    q: 'How does pricing work from abroad?',
    a: 'There is one price for everyone: the INR price shown on each puja, plus a flat platform fee, plus a flat prasad-delivery fee if you add it. There is no separate NRI price and no surcharge for booking from abroad. The full total is shown on the booking screen before you pay. Razorpay charges that amount in INR, and your bank applies its own conversion rate and any foreign-transaction fee.',
  },
  {
    q: 'Are the pandits verified?',
    a: 'Only in one specific sense, so here is exactly how far it goes. A pandit is paid only once Aadhaar-based KYC is on file, which is a payout gate rather than a public credential check — we do not yet run independent credential verification or temple reference checks, and we do not publish a per-pandit trust score. What every booking does carry is mandatory video proof of the ceremony.',
  },
  {
    q: 'Can my parents in India also benefit?',
    a: 'Yes. You can book a puja for any beneficiary in India. Just enter their name, gotra and date of birth at checkout. The pandit will mention them in the sankalp. Prasad can be shipped to their address (extra fee for shipping) or to yours abroad.',
  },
  {
    q: HAS_80G ? 'Is the donation 80G tax-deductible?' : 'Can I claim a tax deduction on the donation?',
    a: HAS_80G
      ? 'Donations to temples with active 80G registration are eligible for Indian income-tax deduction. You receive a 80G receipt (DR-YYYYMMDD-XXXX) via email within 7 days. NRI status does not block 80G eligibility — anyone with an Indian PAN can claim it on Indian-sourced income.'
      : 'Not today. You receive a numbered receipt (DR-YYYYMMDD-XXXX) by email, but it is proof of payment rather than a tax-exemption certificate: it carries no donee registration number and no donee PAN, so nothing can be claimed against it under Indian income-tax law. We will update this answer the day that registration is issued.',
  },
  {
    q: 'What is the cancellation policy?',
    a: `${CANCELLATION_POLICY_SENTENCE} ${REFUND_SETTLEMENT_SENTENCE}`,
  },
  {
    q: 'How long does the full process take?',
    a: `Booking: 3 minutes online. Pandit assignment: you are notified when a pandit accepts the booking. Puja completion: 30 minutes to 4 hours depending on the ritual. Video proof: we aim for ${COMPANY.refunds.videoProofTargetLabel} after the ceremony. Prasad shipment (if ordered): 7-21 days to an address abroad.`,
  },
  {
    q: 'Can I watch the puja live?',
    a: 'Not on a booking. Every puja delivers recorded video proof of the ceremony. Free live darshan streams from select temples are on the Live Darshan page, separate from your booking.',
  },
  {
    q: 'Do you ship prasad internationally?',
    a: 'Yes, you can add prasad delivery to a puja booking and enter an address abroad. It is a flat ₹150 add-on, the same for every destination, shown on the booking screen before you pay. Customs duties and import rules in your country are your responsibility.',
  },
];

const stepsFor = (stats: PublicStats) => [
  {
    n: 1,
    title: 'Choose your puja',
    body: `Browse ${countedNoun(stats.pujaTypeCount, 'rituals')} by occasion, deity or temple. Each listing shows what's included, duration, lineage of pandit and what you'll receive (video, photos, prasad).`,
  },
  {
    n: 2,
    title: 'Enter sankalp details',
    body: 'Your name, gotra, date of birth, beneficiary (if booking for parents), and any specific prayer intention. This is what the pandit recites at the start of the puja.',
  },
  {
    n: 3,
    title: 'Book with an international card',
    body: 'Razorpay accepts international cards, UPI, and net banking, billed in INR. Booking confirmed instantly with reference number BS-YYYYMMDD-XXXXX.',
  },
  {
    n: 4,
    title: 'A pandit is assigned',
    body: 'Once a pandit accepts your booking you are notified by email and, where WhatsApp is enabled for your number, on WhatsApp. Slot times are India Standard Time (IST), the time at the temple.',
  },
  {
    n: 5,
    title: 'Puja happens at the temple',
    body: 'On the scheduled date, the pandit performs the ritual at the temple. The ceremony is recorded for your video proof.',
  },
  {
    n: 6,
    title: 'Video proof + prasad',
    body:
      `We aim to send your video proof within ${COMPANY.refunds.videoProofTargetLabel} of the ceremony, showing the sankalp, ritual and prasad offering. Prasad ships if ordered.` +
      (HAS_80G ? ' 80G receipt within 7 days.' : ' Any donation you added is receipted by email.'),
  },
];

const trustSignals = [
  { icon: Video, title: 'Video proof mandatory', body: 'Every puja delivers a video — pandit payout is gated on upload.' },
  { icon: ShieldCheck, title: 'Aadhaar KYC before payout', body: 'A payout gate, not a credential check — no reference checks, no trust score.' },
  // CM-06: this signal used to advertise dual-currency billing and list seven
  // foreign currencies. There is no multi-currency rail — Razorpay charges in
  // INR only, and the foreign-currency path was deleted with Stripe (RV-01).
  // Say what actually happens at checkout.
  { icon: CreditCard, title: 'International cards, no markup', body: 'Billed in INR — full price shown upfront, no platform FX fee.' },
  { icon: Clock, title: CANCELLATION_BADGE_LABEL, body: `${CANCELLATION_BADGE_DESC}. Inside that window the slot is locked.` },
  HAS_80G
    ? { icon: FileText, title: '80G tax receipts', body: 'Eligible donations get 80G receipt within 7 days.' }
    : { icon: FileText, title: 'Numbered donation receipts', body: 'Proof of payment by email — not a tax-exemption certificate.' },
  { icon: Globe2, title: 'Trusted by diaspora', body: 'NRIs from USA, UK, Canada, Australia, Singapore, UAE.' },
];

const pillarPageJsonLdFor = (steps: ReturnType<typeof stepsFor>) => ({
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
});

export default async function NRIPujasPillarPage() {
  const stats = await fetchPublicStats();
  // Real prices from the live catalogue, or no price grid at all.
  let catalogue: { slug: string; name: string; basePrice: string }[] = [];
  try {
    const res = await getPujaTypes({ limit: 50 });
    catalogue = res.data ?? [];
  } catch {
    catalogue = [];
  }
  const steps = stepsFor(stats);
  const pillarPageJsonLd = pillarPageJsonLdFor(steps);
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
          <h1 className={`${H1.marketing} mt-4`}>
            Book a Puja at an India Temple — from Anywhere in the World
          </h1>
          <p className="prose-lead mt-4 max-w-2xl text-surface-700">
            The complete NRI guide to booking authentic Hindu pujas at India temples — mandatory
            video proof on WhatsApp, international-card checkout billed in INR, and{' '}
            {HAS_80G ? '80G tax receipts' : 'a numbered receipt for every donation'}. Prasad can be
            delivered to an address abroad.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/pujas"
              className={buttonClass('primary', 'md')}
            >
              Browse {countedNoun(stats.pujaTypeCount, 'pujas')}
              <ArrowRight className="h-4 w-4" />
            </Link>
            {/*
              TC-04 — this button marketed nri_premium_yearly, which the server
              has withdrawn: every one of its six benefits carries
              `enforcedBy: null`, so `nriPremiumIsSellable()` is false,
              `getPlans()` drops it and both activation rails answer 400. While
              it is withdrawn the CTA points at the temple catalogue instead of
              a tier nobody can buy.
            */}
            <Link
              href={NRI_PREMIUM_IS_SELLABLE ? '/nri' : '/temples'}
              className="inline-flex items-center gap-2 rounded-lg border border-saffron-300 bg-white px-5 py-3 text-sm font-medium text-saffron-700 hover:bg-saffron-50"
            >
              {NRI_PREMIUM_IS_SELLABLE ? 'See NRI Premium tier' : 'Browse verified temples'}
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

      {/* Live catalogue. Real INR prices, real slugs — or nothing. The page used
          to print invented USD ranges ("$60-$180" for a Rs 1,100 puja that is
          charged Rs 1,151) and linked four slugs that 404. */}
      {catalogue.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 py-12">
          <h2 className="font-display text-2xl font-semibold text-surface-900">
            Pujas you can book from abroad
          </h2>
          <p className="mt-2 max-w-2xl text-surface-700">
            The price is the same from any country: the INR price below, plus a flat platform
            fee shown on the booking screen. Your bank converts it at its own rate.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {catalogue.slice(0, 6).map((p) => (
              <Link
                key={p.slug}
                href={`/pujas/${p.slug}`}
                className="group rounded-xl border border-surface-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-saffron-300 hover:shadow-sm"
              >
                <h3 className="font-semibold text-surface-900 group-hover:text-saffron-700">
                  {p.name}
                </h3>
                <p className="mt-2 text-sm font-medium text-saffron-700">
                  from &#8377;{Number(p.basePrice).toLocaleString('en-IN')}
                </p>
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
            Browse all {countedNoun(stats.pujaTypeCount, 'pujas')} →
          </Link>
        </div>
      </section>
      )}

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
                className={buttonClass('primary', 'md')}
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
              Pick from {countedNoun(stats.pujaTypeCount, 'verified pujas')} at{' '}
              {countedNoun(stats.templeCount, 'listed temples')}. International payment, video
              proof, WhatsApp coordination — all included.
            </p>
          </div>
          <div className="flex flex-col gap-2 md:items-end">
            <Link
              href="/pujas"
              className={buttonClass('primary', 'md')}
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
