import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {
  Sparkles,
  Heart,
  Flame,
  Compass,
  Globe2,
  Rocket,
  ArrowRight,
  Linkedin,
  Mail,
  MapPin,
  Briefcase,
  GraduationCap,
  Quote,
  Sunrise,
  Building2,
  ShieldCheck,
  Cog,
  CheckCircle2,
  Radio,
  Telescope,
  Star,
} from 'lucide-react';
import { organizationJsonLd } from '../../lib/jsonld';
import ScrollReveal from '../../components/ScrollReveal';

export const metadata: Metadata = {
  title: 'About Darshya · The story, the founders, the road ahead',
  description:
    "Darshya is built by Raghav Sindhwani (Sr. AI PM at Bounteous) and Atishey Jain (SDE2 at Amazon) to give every devotee an honest, video-verified bridge to India's temples, priests, and traditions.",
  alternates: { canonical: 'https://darshya.online/about' },
  openGraph: {
    title: 'About Darshya · Two founders, one stubborn idea',
    description:
      'An honest devotional super-app for India and the diaspora. Video proof, fair priest payouts, no middlemen.',
    type: 'website',
    url: 'https://darshya.online/about',
    images: ['/og-default.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About Darshya',
    description: 'Two founders, one stubborn idea: video-verified bhakti.',
    images: ['/og-default.png'],
  },
};

const founders = [
  {
    name: 'Raghav Sindhwani',
    role: 'Co-founder · Product & AI',
    location: 'Bengaluru, India',
    photo: '/team/raghav.jpg',
    initials: 'RS',
    accent: '#b87333',
    accentSoft: '#f3e6d6',
    headline: 'AI & Digital Product Leader · Ex-Xebia · PSPO certified',
    bio:
      'Six years shipping B2B and B2C AI products across SaaS, banking, and telecom — collectively north of $20M in delivered work. Now Senior AI Product Manager at Bounteous, after rising from intern to Senior Consultant over five years at Xebia.',
    quote:
      'My parents wanted a puja done at a specific temple back home. WhatsApp screenshots from a broker were not enough. That is the gap Darshya is closing.',
    work: [
      { year: '2024 → now', org: 'Bounteous', role: 'Senior AI Product Manager' },
      { year: '2019 → 2024', org: 'Xebia', role: 'Intern → Senior Consultant (Product)' },
    ],
    education: [
      { year: '', org: 'Thapar Institute of Engineering & Technology', role: 'B.Tech, Computer Science' },
    ],
    threads: [
      'Owns product, AI, and shipping cadence',
      'Personally onboards the first 1,000 devotees',
      'PSPO-certified · 6+ years in enterprise AI delivery',
    ],
    linkedin: 'https://www.linkedin.com/in/raghav-sindhwani',
  },
  {
    name: 'Atishey Jain',
    role: 'Co-founder · Engineering',
    location: 'Hyderabad, India',
    photo: '/team/atishey.svg',
    initials: 'AJ',
    accent: '#2d5544',
    accentSoft: '#dbe7df',
    headline: 'SDE2 · Distributed Systems · Logistics Routing & Ad Platforms',
    bio:
      'Software Development Engineer II at Amazon since 2020, building high-scale, low-latency platforms across logistics routing and ad serving. Wanted to be a software engineer since the 6th grade — went through Scaler Academy as a mentor-favorite, then took a 4× pay jump into Amazon.',
    quote:
      'A booking that says "completed" but cannot be replayed on video is a lie. The system has to make lying impossible — not unlikely.',
    work: [
      { year: '2024 → now', org: 'Amazon', role: 'SDE II' },
      { year: '2022 → 2024', org: 'Amazon', role: 'SDE I' },
      { year: '2020 → 2022', org: 'Amazon', role: 'Programmer Analyst' },
      { year: '2019 → 2020', org: 'PromptCloud', role: 'Software Engineer' },
    ],
    education: [
      { year: '2019 → 2020', org: 'Scaler Academy', role: 'Software Engineering' },
      { year: '2015 → 2019', org: 'PES University, Bangalore', role: 'B.Tech, Computer Science' },
    ],
    threads: [
      'Owns API, payments, video pipeline, infra',
      'Defines how priest payouts settle',
      'Scaler Academy mentor · LeetCode atishey17',
    ],
    linkedin: 'https://www.linkedin.com/in/atishey-jain',
  },
];

const principles = [
  {
    icon: Flame,
    title: 'Video proof, every time',
    body: 'Every puja booking gets a video recording from the priest before payout. No exceptions, no opt-outs. If a temple cannot commit to it, they do not list with us.',
  },
  {
    icon: Heart,
    title: 'Priest paid first',
    body: 'Pandit payouts are calculated transparently — price minus a fair platform commission — and gated only on Aadhaar verification. We do not hold money to optimise our float.',
  },
  {
    icon: Compass,
    title: 'NRI without exploitation',
    body: 'Yes, NRI pricing is higher than domestic — that is how we fund seva for temples that need it. But the multiplier is documented (9–10×), not hidden, and every rupee above cost is traceable.',
  },
  {
    icon: Globe2,
    title: 'Built for the diaspora',
    body: 'Sankalp, gotra, nakshatra — written into the booking flow as first-class concepts. A devotee in San Jose books the same way as one in Varanasi.',
  },
];

const roadmap = [
  {
    when: 'Jan 2026',
    phase: 'Spark',
    title: 'Two founders. One shared problem.',
    body: 'Raghav and Atishey wrote the first commit on the same day. The problem was concrete: aging parents back home wanting puja done at specific temples, and no honest way to verify it happened. WhatsApp screenshots from random brokers were not enough.',
    status: 'shipped',
    icon: Sunrise,
    accent: '#b87333',
  },
  {
    when: 'Feb 2026',
    phase: 'Foundation',
    title: 'Auth, temples, pandits, video proof — wired end-to-end',
    body: 'JWT auth (web cookies + mobile secure-store). Prisma + Supabase Postgres for 200+ temples and verified pandits. S3 video uploads with priest sign-off. Razorpay (domestic) + Stripe (NRI) live end-to-end.',
    status: 'shipped',
    icon: Building2,
    accent: '#b87333',
  },
  {
    when: 'Mar 2026',
    phase: 'Breadth',
    title: 'The super-app takes shape',
    body: 'Live darshan with HD streams from real temple YouTube channels. AI Pandit (Gita Q&A) with prompt caching. Astrology consultations. Wellness instructors. Dharmic Yatra (Char Dham, 12 Jyotirlingas) with verified yatra companions.',
    status: 'shipped',
    icon: Sparkles,
    accent: '#b87333',
  },
  {
    when: 'Apr 2026',
    phase: 'Trust layer',
    title: 'Gaushala seva, 80G receipts, real numbers everywhere',
    body: 'Gaushala donations with 80G tax receipts wired to the right legal entities. Removed every mock number we could find. Started shipping admin dashboards with real Prisma queries — not pretty fakes.',
    status: 'shipped',
    icon: ShieldCheck,
    accent: '#b87333',
  },
  {
    when: 'May 2026',
    phase: 'Now shipping',
    title: 'Mobile parity + role portals + payments hardening',
    body: 'Expo 50 app reaching parity with web for all 8 role groups (devotee, pandit, store-owner, astrologer, wellness, gaushala, temple-manager, admin). FCM push for booking events. Stripe Connect for NRI flows. Webhooks idempotent.',
    status: 'now',
    icon: Cog,
    accent: '#d99738',
  },
  {
    when: 'Q3 2026',
    phase: 'Next',
    title: 'Antim Sanskar coordination · commerce · retention',
    body: 'Antim Sanskar (last-rites coordination) at city level with on-call coordinators. MedusaJS commerce backend for puja samagri, idols, and books. Day-30 retention loops for devotees and recurring sankalp subscriptions for the diaspora.',
    status: 'planned',
    icon: Radio,
    accent: '#7a6452',
  },
  {
    when: '2027',
    phase: 'Vision',
    title: 'Every temple. Every diaspora. One bridge.',
    body: 'Every verified Indian temple discoverable in one place. Live darshan in 4K from 1,000+ temples. AI Pandit answering in 12 Indian languages. Astrology and wellness powered by humans first, AI second. Becoming, quietly, the most-trusted devotional brand on the internet.',
    status: 'vision',
    icon: Telescope,
    accent: '#5a8a5a',
  },
];

const shipped = [
  { value: '200+', label: 'Temples partnered' },
  { value: '8', label: 'Role portals live' },
  { value: '9–10×', label: 'NRI multiplier · documented' },
  { value: '100%', label: 'Bookings with video proof' },
];

const STATUS_LABEL: Record<string, string> = {
  shipped: 'Shipped',
  now: 'Shipping now',
  planned: 'Planned',
  vision: 'Vision',
};

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
            className="pointer-events-none absolute inset-x-0 -top-32 h-[520px] bg-[radial-gradient(ellipse_at_center,_rgba(184,115,51,0.22),_transparent_62%)]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-40 top-32 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,_rgba(45,85,68,0.10),_transparent_70%)]"
          />

          <div className="relative mx-auto max-w-6xl px-6 pt-20 pb-24 sm:pt-28 sm:pb-32">
            <div
              data-reveal="up"
              className="inline-flex items-center gap-2 rounded-full border border-saffron-200/60 bg-white/70 px-3 py-1 text-xs font-medium text-saffron-700 backdrop-blur"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Our story · founded January 2026</span>
            </div>

            <h1
              data-reveal="up"
              className="mt-7 max-w-4xl font-display text-[2.5rem] font-semibold leading-[1.05] tracking-tight text-surface-900 sm:text-[4.5rem]"
            >
              Two founders.
              <br />
              One stubborn idea:
              <br />
              <span className="relative inline-block">
                <span className="relative z-10 text-saffron-700">video-verified bhakti.</span>
                <span
                  aria-hidden
                  className="absolute bottom-1 left-0 right-0 -z-0 h-3 bg-saffron-100/80 sm:h-4"
                />
              </span>
            </h1>

            <p
              data-reveal="up"
              className="mt-8 max-w-2xl text-lg leading-relaxed text-surface-600 sm:text-xl"
            >
              Darshya is being built by{' '}
              <span className="font-medium text-surface-800">Raghav Sindhwani</span>{' '}
              and{' '}
              <span className="font-medium text-surface-800">Atishey Jain</span>{' '}
              to give every devotee — in India and across the world — an honest,
              traceable bridge to the temples, priests, and traditions they grew
              up with. No screenshots. No middlemen. No broken promises about
              whether a puja actually happened.
            </p>

            <div data-reveal="up" className="mt-10 flex flex-wrap items-center gap-3">
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
              <div className="ml-1 flex items-center -space-x-2">
                {founders.map((f) => (
                  <div
                    key={f.name}
                    className="relative h-9 w-9 overflow-hidden rounded-full ring-2 ring-[#faf9f6]"
                    style={{ background: f.accentSoft }}
                    title={f.name}
                  >
                    <Image
                      src={f.photo}
                      alt={f.name}
                      width={36}
                      height={36}
                      className="h-9 w-9 object-cover"
                      unoptimized
                    />
                  </div>
                ))}
                <span className="ml-3 text-xs text-surface-500">
                  the only two phones that ring
                </span>
              </div>
            </div>

            <div className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6">
              {shipped.map((n, i) => (
                <div
                  key={n.label}
                  data-reveal="cascade"
                  data-delay={String(i + 1)}
                  className="rounded-xl border border-surface-200/70 bg-white px-5 py-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
                >
                  <div className="font-display text-3xl font-semibold leading-none tracking-tight text-saffron-700">
                    {n.value}
                  </div>
                  <div className="mt-2 text-xs leading-snug text-surface-500">
                    {n.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Origin story ─────────────────────────────────────────────── */}
        <section className="relative border-b border-surface-200/60 bg-white">
          <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 sm:py-28 md:grid-cols-12">
            <div data-reveal="up" className="md:col-span-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-saffron-700">
                Why Darshya
              </p>
              <h2 className="mt-3 font-display text-3xl font-semibold leading-tight tracking-tight text-surface-900 sm:text-4xl">
                The internet has a thousand puja sites.
                <br />
                <span className="text-saffron-700">Almost none of them tell the truth.</span>
              </h2>
            </div>

            <div
              data-reveal="up"
              data-delay="2"
              className="md:col-span-8 md:pl-6"
            >
              <div className="space-y-5 text-base leading-[1.75] text-surface-700 sm:text-lg">
                <p>
                  We started Darshya in January 2026 because we had both watched
                  our parents pay strangers on WhatsApp for pujas they could
                  never independently verify. A booking confirmation, a
                  receipt, sometimes a single still photo. Often nothing.
                </p>
                <p>
                  The Indian devotional internet had grown comfortable selling
                  faith without proof — and a generation of NRIs were paying
                  premium prices into that gap, hoping it had been done right.
                </p>
                <p>
                  We thought a software company built by two people who actually
                  shipped systems for a living could do better. Make video
                  proof the floor, not the upsell. Pay the priest first.
                  Document the NRI premium instead of hiding it. Show the
                  devotee the same thing we would want our own parents to see.
                </p>
                <p className="font-medium text-surface-900">
                  That is the entire pitch. Everything below is just the work
                  of getting there.
                </p>
              </div>

              <figure className="mt-10 rounded-2xl border border-surface-200 bg-[#fbfaf6] p-7">
                <Quote
                  className="h-6 w-6 text-saffron-600"
                  strokeWidth={1.5}
                  aria-hidden
                />
                <blockquote className="mt-3 font-display text-xl leading-relaxed text-surface-800 sm:text-2xl">
                  &ldquo;The simplest test of a devotional product is whether
                  you&apos;d feel comfortable booking it for your own grandmother.
                  Everything we build has to pass that test.&rdquo;
                </blockquote>
                <figcaption className="mt-4 text-sm text-surface-500">
                  — Founding note, January 2026
                </figcaption>
              </figure>
            </div>
          </div>
        </section>

        {/* ─── Founders ────────────────────────────────────────────────── */}
        <section
          id="founders"
          className="relative scroll-mt-20 overflow-hidden border-b border-surface-200/60 bg-[#fbfaf6]"
        >
          <div
            aria-hidden
            data-parallax="-0.04"
            className="pointer-events-none absolute -left-32 top-20 h-[480px] w-[480px] rounded-full bg-[radial-gradient(circle,_rgba(184,115,51,0.08),_transparent_70%)]"
          />
          <div className="relative mx-auto max-w-6xl px-6 py-20 sm:py-28">
            <div data-reveal="up" className="mb-14 max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-saffron-700">
                The team
              </p>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-surface-900 sm:text-4xl">
                You should know exactly who is building this.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-surface-600 sm:text-lg">
                Most devotional apps don&apos;t tell you who is on the other end
                of the booking. We do. If something breaks, these are the two
                phones that ring.
              </p>
            </div>

            <div className="grid gap-8 lg:grid-cols-2">
              {founders.map((f, idx) => (
                <article
                  key={f.name}
                  data-reveal="up-far"
                  style={{ transitionDelay: `${idx * 120}ms` }}
                  className="group relative overflow-hidden rounded-3xl border border-surface-200/70 bg-white transition-all hover:-translate-y-1 hover:shadow-[0_22px_44px_-22px_rgba(0,0,0,0.18)]"
                >
                  <div
                    aria-hidden
                    className="absolute inset-x-0 top-0 h-1.5"
                    style={{ background: f.accent }}
                  />

                  <div className="grid gap-0 sm:grid-cols-5">
                    {/* portrait */}
                    <div
                      className="relative col-span-2 min-h-[260px] overflow-hidden sm:min-h-0"
                      style={{
                        background: `linear-gradient(160deg, ${f.accentSoft}, #ffffff 80%)`,
                      }}
                    >
                      <Image
                        src={f.photo}
                        alt={f.name}
                        width={520}
                        height={620}
                        className="absolute inset-0 h-full w-full object-cover"
                        unoptimized
                      />
                      <div
                        aria-hidden
                        className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/40 to-transparent sm:h-20"
                      />
                      <div className="absolute bottom-3 left-4 right-4 text-white">
                        <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider opacity-90">
                          <MapPin className="h-3 w-3" />
                          {f.location}
                        </div>
                      </div>
                    </div>

                    {/* body */}
                    <div className="col-span-3 p-6 sm:p-7">
                      <h3 className="font-display text-2xl font-semibold tracking-tight text-surface-900">
                        {f.name}
                      </h3>
                      <p
                        className="mt-1 text-sm font-medium"
                        style={{ color: f.accent }}
                      >
                        {f.role}
                      </p>
                      <p className="mt-2 text-[13px] leading-snug text-surface-500">
                        {f.headline}
                      </p>

                      <p className="mt-5 text-sm leading-relaxed text-surface-700">
                        {f.bio}
                      </p>

                      <blockquote
                        className="mt-5 rounded-lg border-l-2 px-4 py-2 text-sm italic leading-relaxed text-surface-600"
                        style={{
                          borderColor: f.accent,
                          background: `${f.accent}0c`,
                        }}
                      >
                        &ldquo;{f.quote}&rdquo;
                      </blockquote>

                      <div className="mt-6 grid gap-5 sm:grid-cols-2">
                        <FounderTimeline
                          icon={Briefcase}
                          title="Work"
                          items={f.work}
                          accent={f.accent}
                        />
                        <FounderTimeline
                          icon={GraduationCap}
                          title="Education"
                          items={f.education}
                          accent={f.accent}
                        />
                      </div>

                      <ul className="mt-6 space-y-1.5">
                        {f.threads.map((t) => (
                          <li
                            key={t}
                            className="flex items-start gap-2 text-[13px] text-surface-600"
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

                      <div className="mt-6 flex items-center gap-3 border-t border-surface-200/70 pt-5">
                        <a
                          href={f.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-md border border-surface-200 px-3 py-1.5 text-xs font-medium text-surface-700 transition-all hover:border-saffron-300 hover:text-saffron-700"
                        >
                          <Linkedin className="h-3.5 w-3.5" />
                          LinkedIn
                        </a>
                        <a
                          href={`mailto:${f.name.split(' ')[0]!.toLowerCase()}@darshya.online`}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-surface-500 transition-colors hover:text-saffron-700"
                        >
                          <Mail className="h-3.5 w-3.5" />
                          {f.name.split(' ')[0]!.toLowerCase()}@darshya.online
                        </a>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Principles ──────────────────────────────────────────────── */}
        <section className="relative border-b border-surface-200/60 bg-white">
          <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
            <div data-reveal="up" className="mb-12 max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-saffron-700">
                What we won&apos;t compromise on
              </p>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-surface-900 sm:text-4xl">
                Four rules. Written before the first commit.
              </h2>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              {principles.map((p, idx) => {
                const Icon = p.icon;
                return (
                  <div
                    key={p.title}
                    data-reveal="cascade"
                    data-delay={String(idx + 1)}
                    className="group relative overflow-hidden rounded-2xl border border-surface-200/70 bg-[#fbfaf6] p-7 transition-all hover:-translate-y-0.5 hover:border-saffron-300/60 hover:bg-white hover:shadow-[0_14px_28px_-14px_rgba(0,0,0,0.10)]"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-saffron-100 text-saffron-700 transition-colors group-hover:bg-saffron-600 group-hover:text-white">
                        <Icon className="h-5 w-5" strokeWidth={1.75} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-display text-lg font-semibold text-surface-900">
                          {p.title}
                        </h3>
                        <p className="mt-2 text-sm leading-relaxed text-surface-600">
                          {p.body}
                        </p>
                      </div>
                    </div>
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
            className="pointer-events-none absolute right-0 top-1/4 h-[560px] w-[560px] rounded-full bg-[radial-gradient(circle,_rgba(184,115,51,0.10),_transparent_70%)]"
          />
          <div className="relative mx-auto max-w-6xl px-6 py-20 sm:py-28">
            <div data-reveal="up" className="mb-16 max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-saffron-700">
                The journey
              </p>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-surface-900 sm:text-4xl">
                From the first commit to the long horizon.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-surface-600 sm:text-lg">
                Scroll through where Darshya has been, where it is shipping
                right now, and where we are taking it. Every milestone is a
                real commit, a real launch, or a real plan — not a wishlist.
              </p>
              <div className="mt-6 flex flex-wrap gap-2 text-[11px] font-medium uppercase tracking-wider">
                <LegendDot color="#b87333" label="Shipped" />
                <LegendDot color="#d99738" label="Shipping now" pulse />
                <LegendDot color="#7a6452" label="Planned" />
                <LegendDot color="#5a8a5a" label="Vision" />
              </div>
            </div>

            {/* alternating two-column rail */}
            <div className="relative">
              <div
                aria-hidden
                className="absolute left-[19px] top-2 bottom-2 w-px bg-gradient-to-b from-saffron-200 via-saffron-300/60 to-saffron-100 md:left-1/2 md:-translate-x-px"
              />

              <ol className="space-y-12 md:space-y-16">
                {roadmap.map((r, idx) => {
                  const Icon = r.icon;
                  const onRight = idx % 2 === 1;
                  return (
                    <li
                      key={r.when}
                      data-reveal="up"
                      style={{ transitionDelay: `${Math.min(idx * 60, 280)}ms` }}
                      className="relative"
                    >
                      <div
                        className={`grid gap-6 md:grid-cols-2 md:gap-12 ${
                          onRight ? 'md:[&>*:first-child]:order-2' : ''
                        }`}
                      >
                        {/* card */}
                        <div
                          className={`pl-12 md:pl-0 ${
                            onRight ? 'md:pl-10' : 'md:pr-10 md:text-right'
                          }`}
                        >
                          <div className="rounded-2xl border border-surface-200/70 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-16px_rgba(0,0,0,0.10)] sm:p-7">
                            <div
                              className={`flex flex-wrap items-center gap-2 ${
                                onRight ? '' : 'md:justify-end'
                              }`}
                            >
                              <span
                                className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                                style={{
                                  background: `${r.accent}1c`,
                                  color: r.accent,
                                }}
                              >
                                {r.phase}
                              </span>
                              <span className="text-[11px] font-semibold uppercase tracking-wider text-surface-400">
                                {r.when}
                              </span>
                              {r.status === 'now' && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-green-700">
                                  <span className="relative flex h-1.5 w-1.5">
                                    <span className="absolute inset-0 animate-ping rounded-full bg-green-400 opacity-75" />
                                    <span className="relative h-1.5 w-1.5 rounded-full bg-green-500" />
                                  </span>
                                  Live
                                </span>
                              )}
                            </div>
                            <h3 className="mt-3 font-display text-xl font-semibold leading-snug tracking-tight text-surface-900 sm:text-2xl">
                              {r.title}
                            </h3>
                            <p className="mt-3 text-sm leading-relaxed text-surface-600 sm:text-[15px]">
                              {r.body}
                            </p>
                            <div
                              className={`mt-5 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider ${
                                onRight ? '' : 'md:flex md:justify-end'
                              }`}
                              style={{ color: r.accent }}
                            >
                              {r.status === 'shipped' && (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              )}
                              {STATUS_LABEL[r.status]}
                            </div>
                          </div>
                        </div>

                        {/* spacer / icon halo for other column on md+ */}
                        <div className="hidden md:block" aria-hidden />
                      </div>

                      {/* node on the rail */}
                      <span
                        aria-hidden
                        className="absolute left-0 top-2 flex h-[38px] w-[38px] items-center justify-center rounded-full border-2 bg-[#faf9f6] md:left-1/2 md:-translate-x-1/2 md:h-[44px] md:w-[44px]"
                        style={{ borderColor: r.accent }}
                      >
                        <Icon
                          className="h-4 w-4 md:h-5 md:w-5"
                          style={{ color: r.accent }}
                          strokeWidth={1.75}
                        />
                        {r.status === 'now' && (
                          <span
                            aria-hidden
                            className="absolute inset-0 -m-1 animate-ping rounded-full opacity-40"
                            style={{ background: r.accent }}
                          />
                        )}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>

            <div
              data-reveal="up"
              className="mx-auto mt-16 max-w-2xl rounded-2xl border border-saffron-200/60 bg-white px-6 py-7 text-center shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
            >
              <Star
                className="mx-auto h-5 w-5 text-saffron-600"
                strokeWidth={1.75}
                aria-hidden
              />
              <p className="mt-3 font-display text-lg font-medium leading-relaxed text-surface-800 sm:text-xl">
                The roadmap is not a wishlist. Every shipped item is in production
                today at <span className="text-saffron-700">darshya.online</span>.
              </p>
            </div>
          </div>
        </section>

        {/* ─── CTA ─────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-[#1c1814] text-white">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(184,115,51,0.28),_transparent_55%)]"
          />
          <div
            aria-hidden
            data-parallax="0.08"
            className="pointer-events-none absolute -bottom-32 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,_rgba(217,151,56,0.22),_transparent_65%)]"
          />
          <div className="relative mx-auto max-w-4xl px-6 py-20 text-center sm:py-28">
            <div
              data-reveal="up"
              className="inline-flex items-center gap-2 rounded-full border border-saffron-400/30 bg-saffron-500/10 px-3 py-1 text-xs font-medium text-saffron-300"
            >
              <Rocket className="h-3.5 w-3.5" />
              Want to build with us?
            </div>
            <h2
              data-reveal="up"
              className="mt-6 font-display text-3xl font-semibold tracking-tight sm:text-5xl"
            >
              Reach out — we read everything.
            </h2>
            <p
              data-reveal="up"
              className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-surface-300 sm:text-lg"
            >
              Founder, temple admin, priest, devotee, or just curious. There
              are two real humans on the other side and we would rather hear
              from you directly than scale through a script.
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

function FounderTimeline({
  icon: Icon,
  title,
  items,
  accent,
}: {
  icon: typeof Briefcase;
  title: string;
  items: { year: string; org: string; role: string }[];
  accent: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-surface-500">
        <Icon className="h-3 w-3" style={{ color: accent }} />
        {title}
      </div>
      <ul className="mt-2 space-y-2">
        {items.map((item) => (
          <li key={`${item.org}-${item.role}`} className="text-[13px] leading-snug">
            <div className="font-medium text-surface-800">{item.org}</div>
            <div className="text-surface-500">{item.role}</div>
            {item.year && (
              <div className="mt-0.5 text-[11px] text-surface-400">{item.year}</div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function LegendDot({
  color,
  label,
  pulse,
}: {
  color: string;
  label: string;
  pulse?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-surface-200 bg-white px-2.5 py-1 text-surface-600">
      <span className="relative flex h-2 w-2">
        {pulse && (
          <span
            aria-hidden
            className="absolute inset-0 animate-ping rounded-full opacity-60"
            style={{ background: color }}
          />
        )}
        <span
          className="relative h-2 w-2 rounded-full"
          style={{ background: color }}
        />
      </span>
      {label}
    </span>
  );
}
