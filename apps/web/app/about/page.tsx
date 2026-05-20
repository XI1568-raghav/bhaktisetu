import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {
  Sparkles,
  Heart,
  Flame,
  Target,
  Compass,
  Globe2,
  Rocket,
  ArrowRight,
  Linkedin,
  Mail,
  MapPin,
} from 'lucide-react';
import { organizationJsonLd } from '../../lib/jsonld';
import ScrollReveal from '../../components/ScrollReveal';

export const metadata: Metadata = {
  title: 'About Darshya · The story, the founders, the road ahead',
  description:
    "Darshya is being built by two founders — Raghav Sindhwani and Atishey Jain — to give every devotee an honest, video-verified bridge to India's temples, priests, and traditions. Read the journey from January 2026, what we've shipped, and where we're going.",
  alternates: { canonical: 'https://darshya.online/about' },
  openGraph: {
    title: 'About Darshya',
    description:
      'Two founders, one mission: an honest devotional super-app for the Indian diaspora.',
    type: 'website',
    url: 'https://darshya.online/about',
    images: ['/og-default.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About Darshya',
    description:
      'Two founders, one mission: an honest devotional super-app for the Indian diaspora.',
    images: ['/og-default.png'],
  },
};

const founders = [
  {
    name: 'Raghav Sindhwani',
    role: 'Co-founder · Product & AI',
    location: 'Bengaluru, India',
    photo: '/team/raghav.svg',
    initials: 'RS',
    accent: '#b87333',
    bio: "Senior product manager at Bounteous building AI SaaS. Trained at Thapar Institute of Engineering & Technology. Spent the last several years shipping AI-first products to enterprise customers — and wanted to point that same craft at something his parents could feel in their own language.",
    threads: [
      'Leads Darshya product & AI',
      'Owns shipping cadence + roadmap',
      'Talks to every devotee personally for the first 1,000 bookings',
    ],
    linkedin: 'https://www.linkedin.com/in/raghav-sindhwani',
  },
  {
    name: 'Atishey Jain',
    role: 'Co-founder · Engineering',
    location: 'Hyderabad, India',
    photo: '/team/atishey.svg',
    initials: 'AJ',
    accent: '#5a8a5a',
    bio: 'Software engineer at Amazon, trained at Scaler Academy. Builds the systems that keep video-proof verifiable, payments deterministic, and the platform honest at 3am IST.',
    threads: [
      'Owns API, payments, video pipeline',
      'Defines how priest payouts settle',
      'Believes the simplest correct thing wins',
    ],
    linkedin: 'https://www.linkedin.com/in/atishey-jain',
  },
];

const principles = [
  {
    icon: Flame,
    title: 'Video proof, every time',
    body: "Every puja booking gets a video recording from the priest before payout. No exceptions, no opt-outs. If a temple can't commit to it, they don't list with us.",
  },
  {
    icon: Heart,
    title: 'Priest paid first',
    body: 'Pandit payouts are calculated transparently — price minus a fair platform commission — and gated only on Aadhaar verification. We do not hold money to optimise our float.',
  },
  {
    icon: Compass,
    title: 'NRI without exploitation',
    body: "Yes, NRI pricing is higher than domestic — that's how we fund seva for temples that need it. But the multiplier is documented (9-10×), not hidden, and every rupee above cost is traceable.",
  },
  {
    icon: Globe2,
    title: 'Built for the diaspora',
    body: 'Sankalp, gotra, nakshatra — written into the booking flow as first-class concepts, not afterthoughts. A devotee in San Jose books the same way as one in Varanasi.',
  },
];

const roadmap = [
  {
    when: 'Jan 2026',
    phase: 'Spark',
    title: 'Two founders, one shared problem',
    body: 'Raghav and Atishey wrote the first commit on the same day. The problem was concrete: aging parents back home wanting puja done at specific temples, and no honest way to verify it happened. WhatsApp screenshots from random brokers were not enough.',
    status: 'shipped',
    accent: '#b87333',
  },
  {
    when: 'Feb 2026',
    phase: 'Foundation',
    title: 'Auth, temples, pandits, video proof',
    body: 'JWT auth (web cookies + mobile secure-store), Prisma + Supabase Postgres for 200+ temples and verified pandits, S3 video uploads with priest sign-off, Razorpay (domestic) + Stripe (NRI) live end-to-end.',
    status: 'shipped',
    accent: '#b87333',
  },
  {
    when: 'Mar 2026',
    phase: 'Breadth',
    title: 'The super-app takes shape',
    body: 'Live darshan with HD streams from real temple YouTube channels. AI Pandit (Gita Q&A) with prompt caching. Astrology consultations. Wellness instructors. Dharmic Yatra (Char Dham, 12 Jyotirlingas) with verified yatra companions.',
    status: 'shipped',
    accent: '#b87333',
  },
  {
    when: 'Apr 2026',
    phase: 'Trust layer',
    title: 'Gaushala seva, 80G receipts, real numbers',
    body: 'Gaushala donations with 80G tax receipts wired to the right legal entities. Removed every mock number we could find. Started shipping admin dashboards with real Prisma queries — not pretty fakes.',
    status: 'shipped',
    accent: '#b87333',
  },
  {
    when: 'May 2026',
    phase: 'Now',
    title: 'Mobile parity + role portals + payments hardening',
    body: 'Expo 50 app reaching parity with web for all 8 role groups (devotee, pandit, store-owner, astrologer, wellness, gaushala, temple-manager, admin). FCM push for booking events. Stripe Connect for NRI flows. Webhooks idempotent.',
    status: 'now',
    accent: '#d99738',
  },
  {
    when: 'Q3 2026',
    phase: 'Next',
    title: 'Antim Sanskar end-to-end + commerce + retention',
    body: 'Antim Sanskar (last-rites coordination) at city level with on-call coordinators. MedusaJS commerce backend for puja samagri, idols, books. Day-30 retention loops for devotees and recurring sankalp subscriptions for the diaspora.',
    status: 'planned',
    accent: '#7a6452',
  },
  {
    when: '2027',
    phase: 'Vision',
    title: 'Every temple, every diaspora, one bridge',
    body: 'Every verified Indian temple discoverable in one place. Live darshan in 4K from 1,000+ temples. AI Pandit answering in 12 Indian languages. Astrology and wellness powered by humans first, AI second. Becoming, quietly, the most-trusted devotional brand on the internet.',
    status: 'vision',
    accent: '#5a8a5a',
  },
];

const numbers = [
  { value: '200', suffix: '+', label: 'Temples partnered' },
  { value: '8', suffix: '', label: 'Role portals shipped' },
  { value: '9-10', suffix: '×', label: 'NRI multiplier (documented)' },
  { value: '100', suffix: '%', label: 'Bookings with video proof' },
];

export default function AboutPage() {
  return (
    <ScrollReveal>
      <div className="bg-[#faf9f6]">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />

      <div className="fixed top-14 left-0 right-0 z-40 h-0.5 bg-saffron-100">
        <div
          data-scroll-progress
          className="h-full origin-left bg-saffron-600 transition-transform duration-150"
          style={{ transform: 'scaleX(0)' }}
        />
      </div>

      {/* ─── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-surface-200/60">
        <div
          data-parallax="0.08"
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-32 h-[480px] bg-[radial-gradient(ellipse_at_center,_rgba(184,115,51,0.18),_transparent_60%)]"
        />
        <div className="relative mx-auto max-w-5xl px-6 pt-20 pb-24 sm:pt-28 sm:pb-32">
          <div
            data-reveal="up"
            className="inline-flex items-center gap-2 rounded-full border border-saffron-200/60 bg-white/70 px-3 py-1 text-xs font-medium text-saffron-700 backdrop-blur"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Our story · founded January 2026</span>
          </div>
          <h1
            data-reveal="up"
            className="mt-6 font-display text-4xl font-semibold leading-[1.08] tracking-tight text-surface-900 sm:text-6xl"
          >
            Two founders.
            <br />
            One stubborn idea:{' '}
            <span className="text-saffron-700">video-verified bhakti</span>.
          </h1>
          <p
            data-reveal="up"
            className="mt-6 max-w-2xl text-lg leading-relaxed text-surface-600"
          >
            Darshya is being built by Raghav Sindhwani and Atishey Jain to give
            every devotee — in India and across the world — an honest, traceable
            bridge to the temples, priests, and traditions they grew up with. No
            screenshots. No middlemen. No broken promises about whether a puja
            actually happened.
          </p>
          <div data-reveal="up" className="mt-10 flex flex-wrap gap-3">
            <Link
              href="#founders"
              className="inline-flex items-center gap-2 rounded-lg bg-saffron-600 px-5 py-3 text-sm font-medium text-white transition-all hover:bg-saffron-700"
            >
              Meet the founders
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="#roadmap"
              className="inline-flex items-center gap-2 rounded-lg border border-surface-300 bg-white px-5 py-3 text-sm font-medium text-surface-800 transition-all hover:border-saffron-400 hover:bg-saffron-50"
            >
              See the roadmap
            </Link>
          </div>

          <div className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6">
            {numbers.map((n, i) => (
              <div
                key={n.label}
                data-reveal="cascade"
                data-delay={String(i + 1)}
                className="rounded-xl border border-surface-200/70 bg-white px-5 py-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
              >
                <div className="flex items-baseline gap-0.5 font-display text-3xl font-semibold tracking-tight text-saffron-700">
                  <span data-counter data-counter-target={n.value}>
                    {n.value}
                  </span>
                  <span className="text-2xl">{n.suffix}</span>
                </div>
                <div className="mt-1 text-xs leading-snug text-surface-500">
                  {n.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Founders ────────────────────────────────────────────────── */}
      <section
        id="founders"
        className="relative scroll-mt-20 border-b border-surface-200/60 bg-white"
      >
        <div className="mx-auto max-w-5xl px-6 py-20 sm:py-28">
          <div data-reveal="up" className="mb-14 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-saffron-700">
              The team
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-surface-900 sm:text-4xl">
              You should know who&apos;s actually building this.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-surface-600">
              Most devotional apps don&apos;t tell you who&apos;s on the other
              end of the booking. We do. If something breaks, these are the two
              phones that ring.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            {founders.map((f, idx) => (
              <article
                key={f.name}
                data-reveal="up-far"
                style={{ transitionDelay: `${idx * 120}ms` }}
                className="group relative overflow-hidden rounded-2xl border border-surface-200/70 bg-[#fbfaf6] p-7 transition-all hover:-translate-y-1 hover:border-saffron-300/60 hover:shadow-[0_12px_28px_-12px_rgba(184,115,51,0.18)]"
              >
                <div
                  aria-hidden
                  className="absolute -right-12 -top-12 h-40 w-40 rounded-full opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  style={{
                    background: `radial-gradient(circle, ${f.accent}22, transparent 70%)`,
                  }}
                />
                <div className="relative flex items-start gap-5">
                  <FounderAvatar
                    photo={f.photo}
                    initials={f.initials}
                    accent={f.accent}
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-xl font-semibold tracking-tight text-surface-900">
                      {f.name}
                    </h3>
                    <p
                      className="mt-0.5 text-sm font-medium"
                      style={{ color: f.accent }}
                    >
                      {f.role}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-surface-500">
                      <MapPin className="h-3 w-3" />
                      {f.location}
                    </p>
                  </div>
                </div>

                <p className="relative mt-5 text-sm leading-relaxed text-surface-700">
                  {f.bio}
                </p>

                <ul className="relative mt-5 space-y-2">
                  {f.threads.map((t) => (
                    <li
                      key={t}
                      className="flex items-start gap-2 text-sm text-surface-600"
                    >
                      <span
                        aria-hidden
                        className="mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full"
                        style={{ background: f.accent }}
                      />
                      {t}
                    </li>
                  ))}
                </ul>

                <div className="relative mt-6 flex items-center gap-3 border-t border-surface-200/70 pt-5">
                  <a
                    href={f.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-surface-600 transition-colors hover:text-saffron-700"
                  >
                    <Linkedin className="h-3.5 w-3.5" />
                    LinkedIn
                  </a>
                  <span className="h-3 w-px bg-surface-300" />
                  <a
                    href={`mailto:${f.name.split(' ')[0]!.toLowerCase()}@darshya.online`}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-surface-600 transition-colors hover:text-saffron-700"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    {f.name.split(' ')[0]!.toLowerCase()}@darshya.online
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Principles ──────────────────────────────────────────────── */}
      <section className="relative border-b border-surface-200/60">
        <div className="mx-auto max-w-5xl px-6 py-20 sm:py-28">
          <div data-reveal="up" className="mb-12 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-saffron-700">
              What we won&apos;t compromise on
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-surface-900 sm:text-4xl">
              Four rules. Written before the first commit.
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {principles.map((p, idx) => {
              const Icon = p.icon;
              return (
                <div
                  key={p.title}
                  data-reveal="cascade"
                  data-delay={String(idx + 1)}
                  className="relative rounded-xl border border-surface-200/70 bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-saffron-300/60 hover:shadow-[0_10px_24px_-12px_rgba(0,0,0,0.08)]"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-saffron-50 text-saffron-700">
                    <Icon className="h-5 w-5" strokeWidth={1.75} />
                  </div>
                  <h3 className="mt-4 font-display text-lg font-semibold text-surface-900">
                    {p.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-surface-600">
                    {p.body}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Roadmap ─────────────────────────────────────────────────── */}
      <section
        id="roadmap"
        className="relative scroll-mt-20 overflow-hidden border-b border-surface-200/60 bg-[#fbfaf6]"
      >
        <div
          aria-hidden
          data-parallax="-0.05"
          className="pointer-events-none absolute right-0 top-1/4 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,_rgba(184,115,51,0.08),_transparent_70%)]"
        />
        <div className="relative mx-auto max-w-5xl px-6 py-20 sm:py-28">
          <div data-reveal="up" className="mb-16 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-saffron-700">
              The journey
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-surface-900 sm:text-4xl">
              From the first commit to the vision.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-surface-600">
              Scroll through where Darshya has been, where it is right now, and
              where we&apos;re taking it.
            </p>
          </div>

          <div className="relative">
            <div
              aria-hidden
              className="absolute left-[15px] top-3 bottom-3 w-px bg-gradient-to-b from-saffron-200 via-saffron-300/60 to-saffron-100 sm:left-[19px]"
            />

            <ol className="space-y-10">
              {roadmap.map((r, idx) => (
                <li
                  key={r.when}
                  data-reveal="up"
                  style={{ transitionDelay: `${Math.min(idx * 70, 300)}ms` }}
                  className="relative pl-12 sm:pl-16"
                >
                  <span
                    aria-hidden
                    className="absolute left-0 top-1 flex h-[34px] w-[34px] items-center justify-center rounded-full border-2 bg-[#faf9f6] sm:h-[42px] sm:w-[42px]"
                    style={{ borderColor: r.accent }}
                  >
                    <span
                      className="h-2 w-2 rounded-full sm:h-2.5 sm:w-2.5"
                      style={{ background: r.accent }}
                    />
                    {r.status === 'now' && (
                      <span
                        aria-hidden
                        className="absolute inset-0 -m-1 animate-ping rounded-full opacity-50"
                        style={{ background: r.accent }}
                      />
                    )}
                  </span>

                  <div className="rounded-2xl border border-surface-200/70 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-12px_rgba(0,0,0,0.08)]">
                    <div className="flex flex-wrap items-baseline gap-3">
                      <span
                        className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                        style={{
                          background: `${r.accent}18`,
                          color: r.accent,
                        }}
                      >
                        {r.phase}
                      </span>
                      <span className="text-xs font-medium text-surface-500">
                        {r.when}
                      </span>
                      {r.status === 'now' && (
                        <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-green-700">
                          Live now
                        </span>
                      )}
                    </div>
                    <h3 className="mt-3 font-display text-lg font-semibold tracking-tight text-surface-900 sm:text-xl">
                      {r.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-surface-600">
                      {r.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ─── CTA ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[#2a2520] text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(184,115,51,0.22),_transparent_55%)]"
        />
        <div className="relative mx-auto max-w-4xl px-6 py-20 text-center sm:py-24">
          <div
            data-reveal="up"
            className="inline-flex items-center gap-2 rounded-full border border-saffron-400/30 bg-saffron-500/10 px-3 py-1 text-xs font-medium text-saffron-300"
          >
            <Rocket className="h-3.5 w-3.5" />
            Want to build with us?
          </div>
          <h2
            data-reveal="up"
            className="mt-6 font-display text-3xl font-semibold tracking-tight sm:text-4xl"
          >
            Reach out — we read everything.
          </h2>
          <p
            data-reveal="up"
            className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-surface-300"
          >
            Founder, temple admin, priest, devotee, or just curious. There are
            two real humans on the other side and we&apos;d rather hear from you
            directly than scale through a script.
          </p>
          <div
            data-reveal="up"
            className="mt-10 flex flex-wrap justify-center gap-3"
          >
            <a
              href="mailto:support@darshya.online"
              className="inline-flex items-center gap-2 rounded-lg bg-saffron-500 px-5 py-3 text-sm font-medium text-white transition-all hover:bg-saffron-400"
            >
              <Mail className="h-4 w-4" />
              support@darshya.online
            </a>
            <a
              href="tel:+919255109400"
              className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-5 py-3 text-sm font-medium text-white transition-all hover:bg-white/5"
            >
              <Target className="h-4 w-4" />
              +91 92551 09400
            </a>
          </div>
          <p className="mt-6 text-xs text-surface-500">
            Mon – Sat, 9 AM – 7 PM IST · we typically reply within 24 hours
          </p>
        </div>
      </section>
      </div>
    </ScrollReveal>
  );
}

function FounderAvatar({
  photo,
  initials,
  accent,
}: {
  photo: string;
  initials: string;
  accent: string;
}) {
  return (
    <div
      className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl ring-1 ring-surface-200"
      style={{
        background: `linear-gradient(135deg, ${accent}28, ${accent}10)`,
      }}
    >
      <div
        aria-hidden
        className="absolute inset-0 flex items-center justify-center font-display text-2xl font-semibold tracking-tight"
        style={{ color: accent }}
      >
        {initials}
      </div>
      <Image
        src={photo}
        alt=""
        width={80}
        height={80}
        className="relative h-20 w-20 object-cover"
        unoptimized
      />
    </div>
  );
}
