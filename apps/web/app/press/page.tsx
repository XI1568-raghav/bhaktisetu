import type { Metadata } from 'next';
// DU-05: the one h1 recipe per page archetype. Extras are layout-only.
import { H1 } from '../../components/ui/heading-recipe';
import Link from 'next/link';
import { withEightyG } from '../../lib/eighty-g';


export const metadata: Metadata = {
  title: 'Press kit',
  description:
    'Press resources for journalists, partners, investors. Logos, founder bio, screenshots, one-liner. Reach: press@darshya.online.',
  alternates: { canonical: 'https://darshya.online/press' },
  openGraph: {
    title: 'Darshya press kit',
    description: 'Logos, founder bio, screenshots, one-liner.',
    url: 'https://darshya.online/press',
    type: 'website',
    images: ['/og/default.png'],
  },
};

const ONE_LINER =
  'Darshya is India\'s devotional super-app — live darshan, puja with video proof, panchang, Sanskrit, gurukul marketplace, gaushala seva, and AI pandit in one place.';

const ELEVATOR = `India has 1.2 billion Hindus and no single trusted devotional layer. Sri Mandir won on darshan, but every adjacent need — puja with proof, gurukul admissions, gaushala seva, NRI services, weddings, daily panchang — is fragmented. Darshya is the single canvas, with mandatory video proof on every transaction and a 9-10× NRI pricing lane that funds verified-temple onboarding domestically.`;

const FACTS = [
  { label: 'Domain', value: 'darshya.online · api.darshya.online' },
  { label: 'Stack', value: 'Next 15, Fastify 5, Prisma, Supabase, Cloudflare Pages, Render' },
  { label: 'Surfaces', value: 'Web, API, Admin, Android (EAS), iOS (pending)' },
  { label: 'Verticals', value: 'Darshan, Pujas, Donations, Store, Astrology, Wellness, Yatra, Weddings, Gurukul, Gaushala' },
  { label: 'Pricing', value: 'Domestic per-puja commission 20-40% · NRI premium ₹5000/yr ($60)' },
  { label: 'Compliance', value: `${withEightyG('80G receipts, ')}Aadhaar-gated priest payouts, mandatory video proof, GDPR-friendly EU PostHog region` },
  { label: 'Team', value: 'Solo founder + autonomous agent fleet (15 cron-scheduled scripts)' },
  { label: 'Stage', value: 'Pre-launch, build-in-public' },
];

const CONTACTS = [
  { label: 'Press', url: 'mailto:press@darshya.online' },
  { label: 'Partnerships', url: 'mailto:partners@darshya.online' },
  { label: 'Investors', url: 'mailto:invest@darshya.online' },
  { label: 'Founder', url: 'mailto:hello@darshya.online' },
];

const FURTHER = [
  { label: 'Live product', href: 'https://darshya.online' },
  { label: 'Agent reports', href: '/updates' },
  { label: 'Changelog', href: '/changelog' },
  { label: 'GitHub', href: 'https://github.com/XI1568-raghav/bhaktisetu' },
];

export default function PressKitPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <nav className="text-sm text-surface-600 mb-6">
        <Link href="/" className="hover:text-saffron-700">Home</Link>
        <span className="mx-2">/</span>
        <span className="text-surface-900">Press</span>
      </nav>

      <header className="mb-10">
        <span className="inline-block px-2.5 py-0.5 mb-4 text-xs font-semibold text-saffron-700 bg-saffron-100 rounded-full">
          📰 Press kit
        </span>
        <h1 className={`${H1.catalogue} mb-3`}>
          Press kit
        </h1>
        <p className="text-surface-700 text-base leading-relaxed">
          Resources for journalists, partners and investors. Permission granted for editorial use with attribution to <em>Darshya</em>.
        </p>
      </header>

      <section className="mb-10">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-surface-600 mb-3">One-liner</h2>
        <p className="rounded-xl border border-surface-200 bg-white p-5 text-surface-900 text-base leading-relaxed">
          {ONE_LINER}
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-surface-600 mb-3">Elevator</h2>
        <p className="rounded-xl border border-surface-200 bg-white p-5 text-surface-800 text-sm leading-relaxed">
          {ELEVATOR}
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-surface-600 mb-3">Logo</h2>
        <div className="rounded-xl border border-surface-200 bg-white p-8 flex items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-saffron-600 text-white flex items-center justify-center text-4xl font-serif">
            ॐ
          </div>
          <div>
            <p className="text-2xl font-bold text-surface-900">Darshya</p>
            <p className="text-sm text-surface-600 mt-1">Saffron #9e6229 · OM symbol · serif wordmark</p>
            <a
              href="/og/default.png"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-saffron-700 hover:underline mt-2 inline-block"
            >
              Download brand OG card (1200×630) →
            </a>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-surface-600 mb-3">Facts</h2>
        <dl className="rounded-xl border border-surface-200 bg-white divide-y divide-surface-200">
          {FACTS.map((f) => (
            <div key={f.label} className="grid grid-cols-3 px-5 py-3 gap-3">
              <dt className="text-sm font-semibold text-surface-700 col-span-1">{f.label}</dt>
              <dd className="text-sm text-surface-800 col-span-2">{f.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mb-10">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-surface-600 mb-3">Contacts</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {CONTACTS.map((c) => (
            <a
              key={c.label}
              href={c.url}
              className="rounded-lg border border-surface-200 bg-white p-4 text-center hover:border-saffron-300 hover:shadow-sm transition"
            >
              <p className="text-xs uppercase tracking-wider text-surface-600 mb-1">{c.label}</p>
              <p className="text-sm font-semibold text-saffron-700">{c.url.replace('mailto:', '')}</p>
            </a>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-surface-600 mb-3">Further reading</h2>
        <ul className="space-y-2">
          {FURTHER.map((f) => (
            <li key={f.href}>
              <a
                href={f.href}
                target={f.href.startsWith('http') ? '_blank' : undefined}
                rel={f.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                className="text-sm text-saffron-700 hover:underline"
              >
                {f.label} →
              </a>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
