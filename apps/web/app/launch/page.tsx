import type { Metadata } from 'next';
import Link from 'next/link';
import EmailCapture from '../../components/EmailCapture';
import { buttonClass } from '../../components/ui/button-recipe';
import { H1 } from '../../components/ui/heading-recipe';

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
    body: 'Watch HD aarti streams from Tirupati, Kashi Vishwanath, Vrindavan, Golden Temple and 100+ verified shrines — for free.',
    href: '/darshan',
  },
  {
    title: 'Puja booking with video proof',
    body: 'Book a verified pandit, get a recording of your sankalp + entire ritual delivered to your inbox. Money back if no proof.',
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
    title: 'Gaushala seva + 80G receipts',
    body: 'Adopt a cow, sponsor a feeding, sponsor a vet visit. Verified gaushalas, real photos, 80G tax receipt within 24h.',
    href: '/gaushala',
  },
];

const NRI_BULLETS = [
  'No NRI surcharge on bookings (Premium tier)',
  'Priority booking 7 days early',
  'Free 80G receipt PDF',
  'Weekly 1:1 priest call (Jitsi)',
  'Unlimited AI astro chat',
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
                $399/yr Premium. Made for the diaspora.
              </h2>
              <p className="text-surface-700 mb-6 leading-relaxed">
                Skip the time-zone math + WhatsApp middlemen + temple no-shows. Book pujas in India
                with video proof, get 80G receipts, talk to a priest weekly — all on a single annual
                subscription.
              </p>
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
                See NRI plan →
              </Link>
            </div>
            <div>
              <EmailCapture
                source="launch-nri"
                title="Get the NRI festival calendar"
                subtitle="2026 calendar (PDF) + $10 launch credit when we activate your country."
                cta="Send me the PDF"
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
            during commute, a pandit call before a real ritual, a 80G donation receipt for tax
            filing, a Sanskrit shloka shared on a family WhatsApp.
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
        <p className="text-surface-300 mx-auto mb-8 max-w-xl">
          Free forever for daily darshan + panchang + shlokas. Premium when you want puja with proof
          + ad-free + priority calls.
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
