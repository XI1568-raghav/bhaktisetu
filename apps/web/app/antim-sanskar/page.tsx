export const runtime = 'edge';
import Link from 'next/link';
import type { Metadata } from 'next';

// Layer AT — Antim sanskar (death rites) landing.
//
// Tone is reverent. No promotional hooks, no "popular tier" tags, no
// percentage-off banners, no live-chat widget. The only call-to-action
// is a single "Talk to Coordinator" button that goes to the booking
// flow. AdSense is auto-suppressed on this route by the layout below
// (data-ad-quarantine="true") so families never see ads next to text
// about cremation.

export const metadata: Metadata = {
  title: 'Antim Sanskar — Darshya',
  description:
    'Coordinated last rites support for Hindu families. Pandit, samagri, ghat coordination, and asthi visarjan handled with dignity. Available 24x7.',
  robots: { index: true, follow: true },
};

const PACKAGES = [
  {
    tier: 'basic',
    name: 'Basic Antyeshti',
    priceInr: 15000,
    summary:
      'Pandit ji at the cremation ghat for mukhagni and the 13-day antyeshti karma.',
    includes: [
      'Pandit ji at the ghat for the cremation rites',
      '13 days of antyeshti — daily rites at home or designated ghat',
      'Mantra recitation per family tradition',
      'Coordination with cremation ground staff',
    ],
  },
  {
    tier: 'standard',
    name: 'Standard with Asthi Visarjan',
    priceInr: 35000,
    summary:
      'Above plus asthi visarjan at Haridwar, Kashi, or Prayag, with full samagri provided.',
    includes: [
      'Everything in Basic',
      'Asthi visarjan at Haridwar (Har Ki Pauri), Kashi (Manikarnika), or Prayag (Sangam)',
      'Travel and stay coordination for one family member',
      'Complete samagri — havan samagri, til, jau, gangajal, kusha, tulsi',
    ],
  },
  {
    tier: 'comprehensive',
    name: 'Comprehensive with Shradh',
    priceInr: 50000,
    summary:
      'All rites including tarpan, the 13th-day shradh ceremony, and a small memorial gathering.',
    includes: [
      'Everything in Standard',
      'Pind daan and tarpan over the prescribed days',
      'Shradh on the 13th day with brahman bhojan (up to 11 brahmans)',
      'Small memorial gathering arrangement (up to 30 family members)',
      'Pandit availability for masik shradh reminders for one year',
    ],
  },
] as const;

const PROCESS = [
  {
    n: '1',
    title: 'You reach out',
    body: 'Share the basics — your name, city, and what you need. There is nothing more required from you in this moment.',
  },
  {
    n: '2',
    title: 'A coordinator calls within 30 minutes',
    body: 'A real human, not an automated message. They will gently understand your situation and confirm the package and timing.',
  },
  {
    n: '3',
    title: 'Pandit ji arrives at the ghat',
    body: 'Our verified pandit reaches the cremation ground or your home with all required samagri. The rites begin without delay.',
  },
  {
    n: '4',
    title: 'Rites complete with dignity',
    body: '13-day antyeshti, asthi visarjan and shradh as per your chosen package. Payment is collected on-site after — never in advance.',
  },
];

function rupees(n: number): string {
  return `Rs ${n.toLocaleString('en-IN')}`;
}

export default function AntimSanskarPage() {
  return (
    <div data-ad-quarantine="true" style={{ background: 'var(--color-bg)' }}>
      {/* Hero — quiet, no flashy gradient. */}
      <section
        className="relative"
        style={{
          background:
            'linear-gradient(180deg, var(--color-surface-offset) 0%, var(--color-bg) 100%)',
        }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-20">
          <p
            className="text-xs uppercase tracking-[0.2em] mb-4"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Antim Sanskar — Last Rites Support
          </p>
          <h1
            className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight leading-[1.1] max-w-3xl"
            style={{
              fontFamily: 'var(--font-display)',
              color: 'var(--color-text)',
            }}
          >
            When you need help most, we coordinate everything.
          </h1>
          <p
            className="mt-5 text-base leading-relaxed max-w-2xl"
            style={{ color: 'var(--color-text-muted)' }}
          >
            The loss of a loved one leaves little room for arrangements. We
            quietly take care of the pandit, the samagri, the ghat, and the
            13 days of rites that follow — so the family can simply be
            together.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link
              href="/antim-sanskar/book"
              className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium rounded-lg text-white transition-all"
              style={{ background: 'var(--color-text)' }}
            >
              Talk to a Coordinator
            </Link>
            <a
              href="tel:+919999999999"
              className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium rounded-lg transition-all"
              style={{
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
              }}
            >
              Call 24x7
            </a>
          </div>
          <p
            className="mt-4 text-xs"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Coordinator responds within 30 minutes, day or night.
          </p>
        </div>
      </section>

      {/* What we coordinate */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <h2
          className="text-2xl md:text-3xl font-semibold mb-8"
          style={{
            fontFamily: 'var(--font-display)',
            color: 'var(--color-text)',
          }}
        >
          What we take care of
        </h2>
        <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-4 text-sm leading-relaxed">
          {[
            'A verified pandit ji reaching the ghat or home, on time',
            'Mukhagni, antyeshti, and the 13-day rites in your tradition',
            'Cremation ground coordination — paperwork and timing',
            'Asthi visarjan at Ganga, Godavari, Yamuna, or Narmada',
            'Pind daan, tarpan, and the 13th-day shradh ceremony',
            'Brahman bhojan and a small memorial gathering (if chosen)',
            'Samagri — havan samagri, til, jau, gangajal, kusha, tulsi',
            'Masik shradh reminders for one year afterward (Comprehensive)',
          ].map((item) => (
            <li
              key={item}
              className="flex gap-3"
              style={{ color: 'var(--color-text-muted)' }}
            >
              <span
                aria-hidden
                className="mt-2 inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: 'var(--color-text-muted)' }}
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Packages — transparent pricing, no upsell */}
      <section
        className="py-14"
        style={{ background: 'var(--color-surface-offset)' }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2
            className="text-2xl md:text-3xl font-semibold mb-2"
            style={{
              fontFamily: 'var(--font-display)',
              color: 'var(--color-text)',
            }}
          >
            Transparent pricing
          </h2>
          <p
            className="text-sm mb-10 max-w-2xl"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Three options to choose from. The amount is settled on-site after
            the rites — never in advance. There are no add-ons, no service
            charges, no surprises.
          </p>
          <div className="grid md:grid-cols-3 gap-5">
            {PACKAGES.map((p) => (
              <article
                key={p.tier}
                className="p-6 rounded-xl"
                style={{
                  background: 'var(--color-bg)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <h3
                  className="text-lg font-semibold mb-1"
                  style={{ color: 'var(--color-text)' }}
                >
                  {p.name}
                </h3>
                <p
                  className="text-2xl font-semibold mb-1"
                  style={{ color: 'var(--color-text)' }}
                >
                  {rupees(p.priceInr)}
                </p>
                <p
                  className="text-xs mb-4"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  Settled on-site after the rites
                </p>
                <p
                  className="text-sm leading-relaxed mb-4"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {p.summary}
                </p>
                <ul className="space-y-2 text-sm leading-relaxed">
                  {p.includes.map((line) => (
                    <li
                      key={line}
                      className="flex gap-2"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      <span aria-hidden>—</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <h2
          className="text-2xl md:text-3xl font-semibold mb-10"
          style={{
            fontFamily: 'var(--font-display)',
            color: 'var(--color-text)',
          }}
        >
          How it works
        </h2>
        <ol className="space-y-8">
          {PROCESS.map((step) => (
            <li key={step.n} className="flex gap-5">
              <span
                aria-hidden
                className="flex-shrink-0 w-9 h-9 rounded-full inline-flex items-center justify-center text-sm font-medium"
                style={{
                  background: 'var(--color-surface-offset)',
                  color: 'var(--color-text)',
                  border: '1px solid var(--color-border)',
                }}
              >
                {step.n}
              </span>
              <div>
                <h3
                  className="text-base font-semibold mb-1"
                  style={{ color: 'var(--color-text)' }}
                >
                  {step.title}
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Quiet contact */}
      <section
        className="py-14"
        style={{
          background: 'var(--color-surface-offset)',
          borderTop: '1px solid var(--color-border)',
        }}
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p
            className="text-sm mb-5"
            style={{ color: 'var(--color-text-muted)' }}
          >
            We are here whenever you need us.
          </p>
          <Link
            href="/antim-sanskar/book"
            className="inline-flex items-center justify-center px-7 py-3 text-sm font-medium rounded-lg text-white transition-all"
            style={{ background: 'var(--color-text)' }}
          >
            Talk to a Coordinator
          </Link>
          <p
            className="mt-4 text-xs"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Om shanti.
          </p>
        </div>
      </section>
    </div>
  );
}
