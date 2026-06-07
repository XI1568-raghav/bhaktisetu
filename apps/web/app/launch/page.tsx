import type { Metadata } from 'next';
import Link from 'next/link';
import EmailCapture from '../../components/EmailCapture';

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
    body:
      'Watch HD aarti streams from Tirupati, Kashi Vishwanath, Vrindavan, Golden Temple and 100+ verified shrines — for free.',
    href: '/darshan',
  },
  {
    title: 'Puja booking with video proof',
    body:
      'Book a verified pandit, get a recording of your sankalp + entire ritual delivered to your inbox. Money back if no proof.',
    href: '/pujas',
  },
  {
    title: 'Daily panchang in your inbox',
    body:
      'Tithi, nakshatra, muhurat, festival reminders — every morning, free forever. No app install needed.',
    href: '/panchang',
  },
  {
    title: 'Sanskrit + Vedic learning hub',
    body:
      'Daily shlokas with meaning, lessons + streaks, shareable cards, deep articles on Vedas, Upanishads and Puranas.',
    href: '/knowledge',
  },
  {
    title: 'Gurukul admissions, end-to-end',
    body:
      'Discover verified gurukuls, apply to admissions, pay tuition securely. Bringing traditional learning back online.',
    href: '/gurukuls',
  },
  {
    title: 'Gaushala seva + 80G receipts',
    body:
      'Adopt a cow, sponsor a feeding, sponsor a vet visit. Verified gaushalas, real photos, 80G tax receipt within 24h.',
    href: '/gaushalas',
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
      <section className="px-4 sm:px-6 py-16 sm:py-24 bg-gradient-to-br from-saffron-50 via-amber-50 to-yellow-50">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block px-3 py-1 mb-6 text-xs font-bold uppercase tracking-wider text-saffron-700 bg-saffron-100 rounded-full">
            🚀 Launching on Product Hunt
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-surface-900 leading-tight mb-6">
            India’s devotional super app —{' '}
            <span className="text-saffron-700">finally in one place.</span>
          </h1>
          <p className="text-lg sm:text-xl text-surface-700 max-w-2xl mx-auto mb-10 leading-relaxed">
            Live darshan, puja booking with video proof, daily panchang, Sanskrit
            + Vedic learning, gurukul admissions, gaushala seva and AI pandit
            guidance. Built for the 1.4 billion who practice Sanatan Dharma — and
            the 35 million NRIs who miss home.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/"
              className="px-7 py-3 bg-saffron-600 text-white rounded-md text-base font-semibold hover:bg-saffron-700"
            >
              Try Darshya now
            </Link>
            <a
              href="https://www.producthunt.com"
              target="_blank"
              rel="noopener noreferrer"
              className="px-7 py-3 border border-saffron-300 text-saffron-800 rounded-md text-base font-semibold hover:bg-saffron-50"
            >
              Upvote on Product Hunt →
            </a>
          </div>
          <p className="mt-6 text-xs text-surface-500">
            Free forever for daily darshan + panchang. No credit card required.
          </p>
        </div>
      </section>

      {/* What we ship */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <h2 className="text-3xl font-bold text-surface-900 mb-3 text-center">
          One app. Every devotional need.
        </h2>
        <p className="text-surface-600 text-center max-w-2xl mx-auto mb-12">
          We replace 8 disconnected apps + 12 WhatsApp groups + countless trips
          to the temple. Same dharma, less friction.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <Link
              key={f.title}
              href={f.href}
              className="block rounded-xl border border-surface-200 p-6 hover:border-saffron-300 hover:shadow-md transition-all bg-white"
            >
              <h3 className="text-lg font-semibold text-surface-900 mb-2">
                {f.title}
              </h3>
              <p className="text-sm text-surface-700 leading-relaxed">{f.body}</p>
              <span className="mt-3 inline-block text-saffron-700 text-sm font-medium">
                Try it →
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* NRI lane */}
      <section className="bg-surface-50 py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <span className="inline-block px-2.5 py-0.5 mb-4 text-xs font-semibold text-emerald-700 bg-emerald-100 rounded-full">
                For NRI
              </span>
              <h2 className="text-3xl font-bold text-surface-900 mb-4">
                $399/yr Premium. Made for the diaspora.
              </h2>
              <p className="text-surface-700 mb-6 leading-relaxed">
                Skip the time-zone math + WhatsApp middlemen + temple no-shows.
                Book pujas in India with video proof, get 80G receipts, talk to
                a priest weekly — all on a single annual subscription.
              </p>
              <ul className="space-y-2 mb-6">
                {NRI_BULLETS.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-sm text-surface-800">
                    <span className="text-saffron-600 font-bold">✓</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/nri"
                className="inline-block px-5 py-2.5 bg-saffron-600 text-white rounded-md text-sm font-semibold hover:bg-saffron-700"
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
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <h2 className="text-2xl font-bold text-surface-900 mb-4">
          A note from the founder
        </h2>
        <div className="prose prose-lg max-w-none text-surface-800">
          <p>
            Hi — I’m building Darshya because every existing devotional app
            either tries to be a content silo, a single-temple booking page or a
            chat box. None of them respect the actual texture of daily Hindu
            practice: a quick panchang glance at sunrise, a live aarti during
            commute, a pandit call before a real ritual, a 80G donation receipt
            for tax filing, a Sanskrit shloka shared on a family WhatsApp.
          </p>
          <p>
            Darshya is one app for all of it. Video proof on every puja so trust
            is engineered, not promised. NRI pricing that respects how hard
            booking from abroad really is. Sanskrit + Vedic content treated as
            seriously as commerce. Built on a solo budget, shipped daily, every
            number transparent on Twitter.
          </p>
          <p>
            If this resonates — try the app, upvote on Product Hunt, and tell
            one friend. That’s the whole launch ask.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-surface-900 text-white px-4 sm:px-6 py-14 text-center">
        <h2 className="text-3xl font-bold mb-4">Try Darshya today</h2>
        <p className="text-surface-300 max-w-xl mx-auto mb-8">
          Free forever for daily darshan + panchang + shlokas. Premium when you
          want puja with proof + ad-free + priority calls.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="px-7 py-3 bg-saffron-600 text-white rounded-md text-base font-semibold hover:bg-saffron-700"
          >
            Open Darshya
          </Link>
          <Link
            href="/upgrade"
            className="px-7 py-3 border border-surface-600 text-surface-100 rounded-md text-base font-semibold hover:bg-surface-800"
          >
            See plans
          </Link>
        </div>
      </section>
    </main>
  );
}
