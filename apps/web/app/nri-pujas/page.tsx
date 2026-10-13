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
import { PujaPrice } from '../../components/pricing/PujaPrice';
import { CurrencyToggle } from '../../components/pricing/CurrencyToggle';

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
  title: 'NRI Pujas — Book a Puja at an India Temple from Abroad',
  description:
    'Guide for NRIs to book Hindu pujas at India temples. Billed in INR (UPI, Indian cards and net banking; foreign cards and PayPal coming soon), video proof on your booking page' +
    (HAS_80G ? ', 80G receipt eligible donations' : ', numbered donation receipts') +
    `. ${CANCELLATION_BADGE_LABEL}.`,
  alternates: { canonical: 'https://darshya.online/nri-pujas' },
  openGraph: {
    title: 'NRI Pujas — Book from Anywhere in the World | Darshya',
    description:
      'Step-by-step guide for booking pujas at India temples from abroad. Billed in INR, video proof' +
      (HAS_80G ? ', 80G receipts.' : ', donation receipts.'),
    url: 'https://darshya.online/nri-pujas',
    type: 'website',
    images: ['/og/default.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NRI Pujas Guide | Darshya',
    description: 'Book pujas at India temples from abroad.',
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
    a: 'Yes. You can book puja listings from abroad. Billing is in Indian Rupees through Razorpay, so you pay with UPI, an Indian card or net banking. Cards issued outside India and PayPal are coming soon. Your booking page always shows the current status of your booking.',
  },
  {
    q: 'Will I receive video proof of my puja?',
    a: `Video proof is mandatory on every booking. The assigned pandit uploads a video of the ritual. We aim to have it on your booking page within ${COMPANY.refunds.videoProofTargetLabel} of completion; if nothing has arrived ${COMPANY.refunds.missingVideoEscalationHours} hours after your slot, write in and a person reviews it.`,
  },
  {
    q: 'How does pricing work from abroad?',
    a: 'NRI pricing is 2.5 times the domestic price of the same puja. The flat platform fee (₹51) and the optional prasad-delivery fee (₹150) are the same for everyone and are not multiplied. We show the amount in US dollars for convenience, but the order is created and charged in Indian Rupees through Razorpay: the booking screen shows the exact rupee amount next to the dollar figure, and you pay with UPI, an Indian card or net banking. Cards issued outside India and PayPal are coming soon. You can switch the page back to rupees at any time.',
  },
  {
    q: 'Are the pandits verified?',
    a: 'Only in one specific sense, so here is exactly how far it goes. A pandit is paid only once Aadhaar-based KYC is on file, which is a payout gate rather than a public credential check — we do not yet run independent credential verification or temple reference checks, and we do not publish a per-pandit trust score. What every booking does carry is mandatory video proof of the ceremony.',
  },
  {
    q: 'Can my parents in India also benefit?',
    a: 'Yes. You can book a puja for any beneficiary in India. Just enter their name, gotra and date of birth at checkout. The pandit will mention them in the sankalp. Prasad delivery is an optional flat ₹150 add-on to whichever address you enter.',
  },
  {
    q: HAS_80G ? 'Is the donation 80G tax-deductible?' : 'Can I claim a tax deduction on the donation?',
    a: HAS_80G
      ? 'Donations to temples with active 80G registration are eligible for Indian income-tax deduction. You receive a 80G receipt (DR-YYYYMMDD-XXXX) via email within 7 days. NRI status does not block 80G eligibility — anyone with an Indian PAN can claim it on Indian-sourced income.'
      : 'Not today. You receive a numbered receipt (DR-YYYYMMDD-XXXX), but it is proof of payment rather than a tax-exemption certificate: it carries no donee registration number and no donee PAN, so nothing can be claimed against it under Indian income-tax law. We will update this answer the day that registration is issued.',
  },
  {
    q: 'What is the cancellation policy?',
    a: `${CANCELLATION_POLICY_SENTENCE} ${REFUND_SETTLEMENT_SENTENCE}`,
  },
  {
    q: 'How long does the full process take?',
    a: `Pandit assignment: your booking page shows when a pandit accepts the booking. Video proof: we aim for ${COMPANY.refunds.videoProofTargetLabel} after the ceremony. We do not promise a prasad delivery date.`,
  },
  {
    q: 'Can I watch the puja live?',
    a: 'Not on a booking. Every puja delivers recorded video proof of the ceremony. Free live darshan streams from select temples are on the Live Darshan page, separate from your booking.',
  },
  {
    q: 'Can prasad be sent to an address abroad?',
    a: 'No. Prasad is delivered within India only, so the booking screen takes an Indian address (with a 6-digit pincode) when you choose prasad delivery. You can still book any puja from anywhere in the world without prasad; the ceremony and its video proof do not depend on a delivery address. Store orders are also delivered within India only.',
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
    title: 'Pay by card, billed in INR',
    body: 'Pay through Razorpay, billed in INR, with UPI, an Indian card or net banking. Cards issued outside India and PayPal are coming soon. Once payment succeeds, your booking page shows the reference number BS-YYYYMMDD-XXXXX.',
  },
  {
    n: 4,
    title: 'A pandit is assigned',
    body: 'Your booking page always shows its status, including when a pandit accepts. Slot times are India Standard Time (IST), the time at the temple.',
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
      `We aim to put your video proof on your booking page within ${COMPANY.refunds.videoProofTargetLabel} of the ceremony. Prasad delivery is optional and no delivery date is promised.` +
      (HAS_80G ? ' 80G receipt within 7 days.' : ' Any donation you added gets a numbered receipt.'),
  },
];

const trustSignals = [
  { icon: Video, title: 'Video proof mandatory', body: 'Every puja delivers a video, and pandit payout is gated on upload.' },
  { icon: ShieldCheck, title: 'Aadhaar KYC before payout', body: 'A payout gate, not a credential check — no reference checks, no trust score.' },
  // CM-06: this signal used to advertise dual-currency billing and list seven
  // foreign currencies. There is no multi-currency rail — Razorpay charges in
  // INR only, and the foreign-currency path was deleted with Stripe (RV-01).
  // Say what actually happens at checkout.
  { icon: CreditCard, title: 'Billed in INR', body: 'Shown in USD, billed in INR. The exact rupee amount is shown upfront and we add no FX fee of our own. Pay with UPI, an Indian card or net banking; cards issued outside India are not accepted at the moment.' },
  { icon: Clock, title: CANCELLATION_BADGE_LABEL, body: `${CANCELLATION_BADGE_DESC}. Inside that window the slot is locked.` },
  HAS_80G
    ? { icon: FileText, title: '80G tax receipts', body: 'Eligible donations get 80G receipt within 7 days.' }
    : { icon: FileText, title: 'Numbered donation receipts', body: 'Proof of payment by email — not a tax-exemption certificate.' },
  { icon: Globe2, title: 'Book from anywhere', body: 'Slot times are in India Standard Time, the time at the temple, so you always know when the puja happens.' },
];

const pillarPageJsonLdFor = (steps: ReturnType<typeof stepsFor>) => ({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      '@id': 'https://darshya.online/nri-pujas',
      url: 'https://darshya.online/nri-pujas',
      name: 'NRI Pujas — Book a Puja at an India Temple from Abroad',
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
      description: '6-step process to book a puja with video proof from abroad.',
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
            For Indians living abroad
          </span>
          <h1 className={`${H1.marketing} mt-4`}>
            Book a Puja at an India Temple — from Anywhere in the World
          </h1>
          <p className="prose-lead mt-4 max-w-2xl text-surface-700">
            A guide to booking Hindu pujas at India temples from abroad — mandatory
            video proof on your booking page, checkout billed in INR, and{' '}
            {HAS_80G ? '80G tax receipts' : 'a numbered receipt for every donation'}. Prasad
            delivery is an optional add-on.
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
              {NRI_PREMIUM_IS_SELLABLE ? 'See NRI Premium tier' : 'Browse temples'}
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
            Six steps, fully online.
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
            NRI pricing is 2.5 times the domestic price, plus a flat platform fee. Dollar
            figures are a display conversion for reference: the order is charged in rupees.
          </p>
          <CurrencyToggle className="mt-4" />
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
                  <PujaPrice domesticPuja={Number(p.basePrice)} part="main" prefix="from " />
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
            Some of the temples listed on Darshya. Each temple page shows its pujas and slots.
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
                Gift a puja
              </span>
              <h2 className="mt-3 font-display text-2xl font-semibold text-surface-900">
                Gift a puja to your parents in India
              </h2>
              <p className="mt-2 max-w-xl text-surface-700">
                Send a Satyanarayan Katha for their anniversary, a Rudrabhishek on Shivratri, or a
                birthday puja for a sibling. Enter their name and gotra when you book; the video proof
                is on your booking page.
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
            Common questions from devotees abroad.
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
              Pick from {countedNoun(stats.pujaTypeCount, 'pujas')} at{' '}
              {countedNoun(stats.templeCount, 'listed temples')}. Video proof is included with every
              booking.
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
              Contact support
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
