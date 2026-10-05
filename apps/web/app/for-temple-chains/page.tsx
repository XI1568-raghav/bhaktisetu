import type { Metadata } from 'next';
import Link from 'next/link';
import RoiCalculator from './RoiCalculator';
import { buttonClass } from '../../components/ui/button-recipe';
import { H1 } from '../../components/ui/heading-recipe';
import { HAS_80G, RECEIPT_NOUN, RECEIPT_NOUN_PLURAL } from '../../lib/eighty-g';


export const metadata: Metadata = {
  title: 'Darshya for Temple Chains, Ashrams & Mathas — B2B SaaS',
  description:
    `White-label donor CRM, puja bookings, ${RECEIPT_NOUN} automation and live darshan for temple chains, ashram networks and matha organizations. Pilot pricing ₹1,500/mo for 90 days.`,
  alternates: { canonical: '/for-temple-chains' },
  openGraph: {
    images: ['/images/golden-temple-og.jpg'],
    title: 'Darshya for Temple Chains — B2B SaaS pilot ₹1,500/mo',
    description: `White-label donor CRM, ${RECEIPT_NOUN} automation, puja bookings for chains operating 5-20 temples.`,
    url: 'https://darshya.online/for-temple-chains',
  },
};

const TIERS = [
  {
    name: 'Starter',
    audience: 'Single temple, < 1,000 monthly donors',
    price: '₹999/mo',
    pilotPrice: '₹500/mo (first 90 days)',
    accent: 'border-saffron-300 bg-saffron-50',
    features: [
      'Online puja booking widget',
      'Donor capture form',
      HAS_80G
        ? '80G receipt automation (if registered)'
        : 'Numbered donation receipt automation (not an 80G document — see below)',
      'Live darshan stream embed',
      'Email + WA support',
    ],
  },
  {
    name: 'Pro',
    audience: 'Temple chains, ashram networks, matha branches (5-20 sites)',
    price: '₹2,999/mo',
    pilotPrice: '₹1,500/mo (first 90 days)',
    accent: 'border-indigo-300 bg-indigo-50 ring-2 ring-indigo-400',
    features: [
      'All Starter features',
      'Multi-temple donor CRM with chain-wide view',
      'Recurring donor management + retention reports',
      'Custom subdomain + branding (your-chain.darshya.online)',
      'Founder-led 4-hour onboarding workshop',
      'WhatsApp support during the 90-day pilot',
    ],
    recommended: true,
  },
  {
    name: 'Enterprise',
    audience: 'High-volume single temple or large federation (> 20 sites)',
    price: '₹4,999/mo + 1.5% txn',
    pilotPrice: 'Custom — founder call required',
    accent: 'border-emerald-300 bg-emerald-50',
    features: [
      'All Pro features',
      'Dedicated CSM + quarterly strategy review',
      'Custom API access for donor sync',
      'Advanced analytics + investor-grade reports',
      `Compliance audit + ${RECEIPT_NOUN} reconciliation`,
      'White-glove migration from existing CRM',
    ],
  },
];

const CUSTOMER_TYPES = [
  {
    title: 'Temple chains',
    examples: 'ISKCON regional committees, Sringeri Mutt branches, Shirdi Sansthan satellites',
    body: 'Single org operating 5-20 temples gets chain-wide donor view + cross-temple campaign tools.',
  },
  {
    title: 'Ashram networks',
    examples: 'Art of Living, Isha Foundation chapters, Sivananda Yoga centers',
    body: 'Ashram-side puja booking + recurring donor management + retreat enrollment in one stack.',
  },
  {
    title: 'Matha networks',
    examples: 'Pejawar Mutt, Sringeri Mutt, Raghavendra Mutt chapters',
    body: 'Donor + devotee management across chapters with chain-wide reporting to the central matha.',
  },
  {
    title: 'High-volume temples',
    examples: 'Vaishno Devi Shrine Board, Tirumala Tirupati, Sabarimala',
    body: `Full donor CRM + ${RECEIPT_NOUN} automation + analytics scaled for daily transaction volumes in lakhs.`,
  },
  {
    title: 'Diaspora temple federations',
    examples: 'Hindu Federation Canada, BAPS USA, UK Hindu Council',
    body: 'Member-temple donor management in INR, with international cards accepted.',
  },
];

const ROI_COMPARISON = [
  { row: 'Donor CRM setup', razorpay: 'Manual spreadsheet', darshya: 'Built-in, day 1' },
  { row: `${RECEIPT_NOUN.charAt(0).toUpperCase()}${RECEIPT_NOUN.slice(1)} issuance`, razorpay: 'Manual PDF per donor', darshya: 'Auto-emailed on payment' },
  { row: 'Recurring donor retention', razorpay: 'Not native', darshya: 'Tracked + nudged via WA' },
  { row: 'Live darshan stream', razorpay: 'N/A', darshya: 'Embedded player included' },
  { row: 'Puja booking + sankalp + video proof', razorpay: 'N/A', darshya: 'Native flow' },
  { row: 'Multi-temple chain view', razorpay: 'N/A', darshya: 'Pro tier feature' },
  { row: 'Transaction fee (per ₹100 donation)', razorpay: '₹2.00', darshya: '₹2.00 (passthrough) + ₹0 platform' },
];

export default function ForTempleChainsPage() {
  return (
    <div className="bg-cream-50 text-surface-900">
      <section className="bg-gradient-to-br from-saffron-50 via-cream-50 to-indigo-50 px-6 py-16 sm:py-24">
        <div className="mx-auto max-w-5xl">
          <p className="mb-4 inline-block rounded-full bg-saffron-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-saffron-800">
            B2B SaaS pilot · Q4 2026
          </p>
          <h1 className={H1.marketing}>
            One stack for your temple chain, ashram network or matha.
          </h1>
          <p className="prose-lead mt-4 max-w-2xl text-surface-700">
            White-label donor CRM, {RECEIPT_NOUN} automation, puja bookings and live darshan — built on the same
            infrastructure thousands of devotees already trust on darshya.online.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href="/contact?topic=b2b-pilot"
              className={buttonClass('primary', 'md', 'shadow-sm')}
            >
              Apply for 90-day pilot
            </Link>
            <a
              href="mailto:pilots@darshya.online?subject=B2B+pilot+inquiry"
              className="rounded-full border border-surface-300 bg-white px-6 py-3 text-base font-semibold text-surface-900 transition hover:border-saffron-400"
            >
              Email pilots@darshya.online
            </a>
          </div>
          <p className="mt-4 text-sm text-surface-600">
            5 pilot slots open for Q4. Founder personally onboards each customer over 4 hours.
          </p>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">Who this is built for</h2>
          <p className="mt-2 text-surface-700">
            If your organization operates 5+ devotional sites, manages a recurring donor base, or
            issues {RECEIPT_NOUN_PLURAL} at volume, you fit one of these archetypes.
          </p>
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {CUSTOMER_TYPES.map((t) => (
              <div key={t.title} className="rounded-2xl border border-surface-200 bg-white p-5">
                <h3 className="font-semibold text-surface-900">{t.title}</h3>
                <p className="mt-1 text-xs uppercase tracking-wide text-surface-500">{t.examples}</p>
                <p className="mt-3 text-sm text-surface-700">{t.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">Estimate your annual savings</h2>
          <p className="mt-2 text-surface-700">
            Most temple chains spend ₹2-6 lakh/year stitching Razorpay + Google Forms + Excel + a manual
            {RECEIPT_NOUN} PDF generator. Estimate what Darshya replaces.
          </p>
          <div className="mt-6">
            <RoiCalculator />
          </div>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">Pilot pricing</h2>
          <p className="mt-2 text-surface-700">
            All pilots run 90 days at 50% off list. ₹0 setup fee. Founder personally onboards.
            Cancel anytime during the pilot, no questions asked.
          </p>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {TIERS.map((t) => (
              <div
                key={t.name}
                className={`relative rounded-2xl border-2 p-6 ${t.accent}`}
              >
                {t.recommended && (
                  <span className="absolute -top-3 left-6 rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                    Most piloted
                  </span>
                )}
                <h3 className="font-display text-xl font-bold">{t.name}</h3>
                <p className="mt-1 text-xs text-surface-600">{t.audience}</p>
                <p className="mt-3 text-2xl font-bold">{t.price}</p>
                <p className="text-sm font-medium text-saffron-700">{t.pilotPrice}</p>
                <ul className="mt-4 space-y-2 text-sm text-surface-800">
                  {t.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <span aria-hidden className="text-saffron-600">·</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-6 text-xs text-surface-600">
            Pricing locked at pilot terms for 12 months post-conversion. List prices apply year 2 onward.
          </p>
        </div>
      </section>

      <section className="bg-cream-100 px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">
            Darshya vs Razorpay-only setup
          </h2>
          <p className="mt-2 text-surface-700">
            Razorpay is great at processing payments. We add everything around it that a temple
            actually needs to run.
          </p>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b-2 border-surface-300">
                  <th className="py-3 pr-4 font-semibold">Capability</th>
                  <th className="py-3 pr-4 font-semibold text-surface-600">Razorpay-only</th>
                  <th className="py-3 pr-4 font-semibold text-indigo-700">Darshya for Temples</th>
                </tr>
              </thead>
              <tbody>
                {ROI_COMPARISON.map((row) => (
                  <tr key={row.row} className="border-b border-surface-200">
                    <td className="py-3 pr-4 font-medium">{row.row}</td>
                    <td className="py-3 pr-4 text-surface-700">{row.razorpay}</td>
                    <td className="py-3 pr-4 text-indigo-800">{row.darshya}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-display text-3xl font-bold">5 pilot slots. Q4 close.</h2>
          <p className="mt-3 text-surface-700">
            We are signing 5 organizations to anchor our B2B SaaS launch. Each gets the founder's
            personal time, locked-in pilot pricing for 12 months, and a public case study slot
            (optional).
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/contact?topic=b2b-pilot"
              className={buttonClass('primary', 'md', 'shadow-sm')}
            >
              Apply for pilot
            </Link>
            <a
              href="mailto:pilots@darshya.online?subject=B2B+pilot+inquiry"
              className="rounded-full border border-surface-300 bg-white px-6 py-3 text-base font-semibold text-surface-900 transition hover:border-saffron-400"
            >
              Email founder directly
            </a>
          </div>
          <p className="mt-3 text-xs text-surface-600">
            The founder replies to pilot inquiries personally.
          </p>
        </div>
      </section>
    </div>
  );
}
