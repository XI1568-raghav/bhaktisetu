import type { Metadata } from 'next';
import Link from 'next/link';
import EmailCapture from '../../components/EmailCapture';
import { buttonClass } from '../../components/ui/button-recipe';
import { H1 } from '../../components/ui/heading-recipe';
import { COMPANY } from '../../lib/company';
import {
  NRI_PREMIUM_IS_SELLABLE,
  NRI_PREMIUM_WITHDRAWN_NOTICE,
} from '../nri/plan-availability';

/**
 * PM-05 — /launch was the last NRI Premium shopfront with no gate on it.
 *
 * TC-03/TC-04 withdrew `nri_premium_yearly` properly: all six of its benefits
 * carry `enforcedBy: null` in apps/api/src/services/subscription-entitlements.ts,
 * so `nriPremiumIsSellable()` is false, `getPlans()` drops the plan and both
 * activation rails answer 400. /nri branches on the mirrored constant in twelve
 * places; /upgrade omits the card. This page referenced neither constant and
 * sold the tier outright, with three defects stacked:
 *
 *  1. "$399/yr Premium." The plan is Rs 5,000/year, `priceUsd: 60`. $399 is
 *     6.6x the only USD figure that exists and appears in no plan definition,
 *     no test and no other page — someone reading /launch then /nri saw two
 *     prices for one SKU differing by a factor of six.
 *  2. Five unenforced benefits listed as present tense, under a "See NRI plan"
 *     call to action leading to a page that cannot sell them.
 *  3. "80G tax receipt within 24h" while `HAS_80G_VERIFIED` is false, `pan` is
 *     null and `eightyGNumber` is null — a deduction a donor cannot claim.
 *
 * The section now describes what a devotee abroad can actually do today, all of
 * it already claimed elsewhere on this page, and prints the server's own
 * withdrawal sentence instead of a price. When a benefit is wired and
 * NRI_PREMIUM_IS_SELLABLE flips, the tier copy returns — sourced from the same
 * constant, not retyped here.
 */
const HAS_80G = COMPANY.donationLegal.HAS_80G_VERIFIED;

export const metadata: Metadata = {
  title: 'Darshya is launching — India’s devotional super app',
  description:
    'Live darshan, puja with video proof, daily panchang, Sanskrit lessons, gurukul admissions, gaushala seva and AI pandit guidance — one app for daily devotional practice. Launching on Product Hunt.',
  alternates: { canonical: 'https://darshya.online/launch' },
  openGraph: {
    title: 'Darshya is launching — India’s devotional super app',
    description:
      'Live darshan, puja with video proof, daily panchang, Sanskrit, gurukul admissions, gaushala seva, AI pandit. One app for Sanatan Dharma practice.',
    url: 'https://darshya.online/launch',
    type: 'website',
    images: ['/og/default.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Darshya — launching on Product Hunt',
    description:
      'One app for daily devotional practice. Live darshan + verified puja with video proof + panchang + Sanskrit + AI pandit.',
    images: ['/og/default.png'],
  },
};

const FEATURES: { title: string; body: string; href: string }[] = [
  {
    title: 'Live Darshan from sacred temples',
    body: 'Watch aarti streams from the temples listed on the darshan page — for free. Which streams are live changes with each temple\'s schedule.',
    href: '/darshan',
  },
  {
    title: 'Puja booking with video proof',
    body: 'Book a pandit, get a recording of your sankalp + entire ritual delivered to your inbox. Money back if no proof.',
    href: '/pujas',
  },
  {
    title: 'Daily panchang in your inbox',
    body: 'Tithi, nakshatra, muhurat, festival reminders — every morning, free forever. No app install needed.',
    href: '/panchang',
  },
  {
    title: 'Sanskrit + Vedic learning hub',
    body: 'Daily shlokas with meaning, lessons + streaks, shareable cards, deep articles on Vedas, Upanishads and Puranas.',
    href: '/vedas',
  },
  {
    title: 'Gurukul admissions, end-to-end',
    body: 'Discover verified gurukuls, apply to admissions, pay tuition securely. Bringing traditional learning back online.',
    href: '/gurukuls',
  },
  {
    // PM-05: this promised "80G receipts" in the title and "80G tax receipt
    // within 24h" in the body. HAS_80G_VERIFIED is false and both the
    // registration number and the PAN are null, so the receipt generator prints
    // "Proof of donation — not a tax exemption certificate" on every receipt it
    // has ever issued. /gaushala, /donations, /list-temple, /faqs and /csr-match
    // all branch on the same constant; this card was the outlier.
    title: HAS_80G ? 'Gaushala seva + 80G receipts' : 'Gaushala seva, with proof',
    body: HAS_80G
      ? 'Adopt a cow, sponsor a feeding, sponsor a vet visit. Gaushalas listed by the Darshya team, with an 80G tax receipt.'
      : 'Adopt a cow, sponsor a feeding, sponsor a vet visit. Gaushalas listed by the Darshya team, and a numbered donation receipt PDF for every contribution.',
    href: '/gaushala',
  },
];

/**
 * PM-05: these five replace the NRI Premium benefit list. Every one of them is
 * a capability this page already claims in `FEATURES` above and that a devotee
 * abroad can use today without buying anything — no tier, no gate, nothing
 * pending. The list the tier WAS specified to include lives on /nri, framed as
 * a specification rather than an offer.
 */
const NRI_BULLETS = [
  'Live darshan from verified temples — free, no account needed',
  'Book a puja in India from any time zone',
  'A recording of the sankalp and the ritual, sent to your inbox',
  'Daily panchang and festival reminders by email',
  'Pay per booking — nothing recurring to cancel',
];

export default function LaunchPage() {
  return (
    <main>
      {/* Hero */}
      <section className="from-saffron-50 bg-gradient-to-br via-amber-50 to-yellow-50 px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-4xl text-center">
          <span className="text-saffron-700 bg-saffron-100 mb-6 inline-block rounded-full px-3 py-1 text-xs font-bold tracking-wider uppercase">
            🚀 Launching on Product Hunt
          </span>
          <h1 className={`${H1.marketing} mb-6`}>
            India’s devotional super app —{' '}
            <span className="text-saffron-700">finally in one place.</span>
          </h1>
          <p className="prose-lead text-surface-700 mx-auto mb-10 max-w-2xl leading-relaxed">
            Live darshan, puja booking with video proof, daily panchang, Sanskrit + Vedic learning,
            gurukul admissions, gaushala seva and AI pandit guidance. Built for the 1.4 billion who
            practice Sanatan Dharma — and the 35 million NRIs who miss home.
          </p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/"
              className={buttonClass('primary', 'md')}
            >
              Try Darshya now
            </Link>
            <a
              href="https://www.producthunt.com"
              target="_blank"
              rel="noopener noreferrer"
              className="border-saffron-300 text-saffron-800 hover:bg-saffron-50 rounded-md border px-7 py-3 text-base font-semibold"
            >
              Upvote on Product Hunt →
            </a>
          </div>
          <p className="text-surface-500 mt-6 text-xs">
            Free forever for daily darshan + panchang. No credit card required.
          </p>
        </div>
      </section>

      {/* What we ship */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-surface-900 mb-3 text-center text-3xl font-bold">
          One app. Every devotional need.
        </h2>
        <p className="text-surface-600 mx-auto mb-12 max-w-2xl text-center">
          We replace 8 disconnected apps + 12 WhatsApp groups + countless trips to the temple. Same
          dharma, less friction.
        </p>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Link
              key={f.title}
              href={f.href}
              className="border-surface-200 hover:border-saffron-300 block rounded-xl border bg-white p-6 transition-all hover:shadow-md"
            >
              <h3 className="text-surface-900 mb-2 text-lg font-semibold">{f.title}</h3>
              <p className="text-surface-700 text-sm leading-relaxed">{f.body}</p>
              <span className="text-saffron-700 mt-3 inline-block text-sm font-medium">
                Try it →
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* NRI lane */}
      <section className="bg-surface-50 py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div>
              <span className="mb-4 inline-block rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                For NRI
              </span>
              <h2 className="text-surface-900 mb-4 text-3xl font-bold">
                {NRI_PREMIUM_IS_SELLABLE
                  ? 'Premium. Made for the diaspora.'
                  : 'Made for the diaspora.'}
              </h2>
              <p className="text-surface-700 mb-6 leading-relaxed">
                Skip the time-zone math, the WhatsApp middlemen and the temple no-shows. Book a puja
                in India from wherever you are and get the ritual back on video.
              </p>
              {!NRI_PREMIUM_IS_SELLABLE && (
                <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4">
                  <p className="text-sm font-semibold text-amber-900">
                    The annual NRI Premium tier is not on sale
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-amber-900/90">
                    {NRI_PREMIUM_WITHDRAWN_NOTICE}
                  </p>
                </div>
              )}
              <ul className="mb-6 space-y-2">
                {NRI_BULLETS.map((b) => (
                  <li key={b} className="text-surface-800 flex items-start gap-2 text-sm">
                    <span className="text-saffron-600 font-bold">✓</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/nri"
                className={buttonClass('primary', 'md')}
              >
                {NRI_PREMIUM_IS_SELLABLE ? 'See NRI plan →' : 'What the NRI tier was for →'}
              </Link>
            </div>
            <div>
              <EmailCapture
                source="launch-nri"
                title="Festival reminders for the diaspora"
                // PM-05 / TC-03 class: this offered "2026 calendar (PDF) + $10
                // launch credit when we activate your country". POST /waitlist
                // creates a Waitlist row, generates a referral code and sends a
                // confirmation email — it never touches the wallet, and of the
                // five CreditLedgerReason values only `referral_reward` is live,
                // so no path can issue a launch credit. No job mails a calendar
                // PDF either. EmailCapture's own default subtitle was corrected
                // for exactly this in TC-03; this page overrode it.
                subtitle="Tithi, nakshatra and festival dates by email. Free, unsubscribe any time."
                cta="Keep me posted"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Founder note */}
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h2 className="text-surface-900 mb-4 text-2xl font-bold">A note from the founder</h2>
        <div className="prose prose-lg text-surface-800 max-w-none">
          <p>
            Hi — I’m building Darshya because every existing devotional app either tries to be a
            content silo, a single-temple booking page or a chat box. None of them respect the
            actual texture of daily Hindu practice: a quick panchang glance at sunrise, a live aarti
            during commute, a pandit call before a real ritual, a donation receipt that arrives
            without a phone call, a Sanskrit shloka shared on a family WhatsApp.
          </p>
          <p>
            Darshya is one app for all of it. Video proof on every puja so trust is engineered, not
            promised. NRI pricing that respects how hard booking from abroad really is. Sanskrit +
            Vedic content treated as seriously as commerce. Built on a solo budget, shipped daily,
            every number transparent on Twitter.
          </p>
          <p>
            If this resonates — try the app, upvote on Product Hunt, and tell one friend. That’s the
            whole launch ask.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-surface-900 px-4 py-14 text-center text-white sm:px-6">
        <h2 className="mb-4 text-3xl font-bold">Try Darshya today</h2>
        {/* PM-05: this closed with "Premium when you want puja with proof +
            ad-free + priority calls" — two of those three are unenforced NRI
            Premium benefits on a tier that is withdrawn, and the third is not
            behind a paywall at all. Puja booking is pay-per-booking. */}
        <p className="text-surface-300 mx-auto mb-8 max-w-xl">
          Free forever for daily darshan + panchang + shlokas. Pay only when you book a puja —
          there is nothing to subscribe to.
        </p>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className={buttonClass('primary', 'md')}
          >
            Open Darshya
          </Link>
          <Link
            href="/upgrade"
            className="border-surface-600 text-surface-100 hover:bg-surface-800 rounded-md border px-7 py-3 text-base font-semibold"
          >
            See plans
          </Link>
        </div>
      </section>
    </main>
  );
}
