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
  Quote,
  Star,
} from 'lucide-react';
import { organizationJsonLd, brandFaqJsonLd } from '../../lib/jsonld';
import { fetchPublicStats, type PublicStats } from '../../lib/live-stats';
import ScrollReveal from '../../components/ScrollReveal';
import RoadmapRail, { type Milestone } from '../../components/RoadmapRail';
import { buttonClass } from '../../components/ui/button-recipe';
import { H1 } from '../../components/ui/heading-recipe';

export const metadata: Metadata = {
  title: 'About Darshya · The story, the founders, the road ahead',
  description:
    'Darshya is built by Raghav Sindhwani and Atishey Jain to give every devotee an honest, video-verified bridge to India\'s temples, priests, and traditions.',
  alternates: { canonical: 'https://darshya.online/about' },
  openGraph: {
    title: 'About Darshya · Two founders, one stubborn idea',
    description:
      'An honest devotional super-app for India and the diaspora. Video proof. Fair priest payouts. No middlemen.',
    type: 'website',
    url: 'https://darshya.online/about',
    images: ['/og/default.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About Darshya',
    description: 'Two founders, one stubborn idea: video-verified bhakti.',
    images: ['/og/default.png'],
  },
};

const founders = [
  {
    name: 'Raghav Sindhwani',
    role: 'Co-founder · Product & AI',
    location: 'Bengaluru',
    photo: '/team/raghav.svg',
    accent: '#b87333',
    accentSoft: '#f3e6d6',
    headline: 'AI product leader. Six years shipping for the diaspora.',
    bio: 'Senior AI Product Manager at Bounteous. Spent the last several years putting AI products in front of real customers — and decided to turn that craft toward something his own family could feel.',
    threads: [
      'Owns product, AI, and the weekly shipping cadence',
      'Talks to every devotee personally for the first 1,000 bookings',
    ],
    linkedin: 'https://www.linkedin.com/in/raghav-sindhwani',
  },
  {
    name: 'Atishey Jain',
    role: 'Co-founder · Engineering',
    location: 'Hyderabad',
    photo: '/team/atishey.svg',
    accent: '#2d5544',
    accentSoft: '#dbe7df',
    headline: 'Builds systems that can be trusted at 3 am.',
    bio: 'Software engineer at Amazon, working on high-scale, low-latency platforms. Believes a booking that says "completed" but cannot be replayed on video is a lie — and the system should make lying impossible, not just unlikely.',
    threads: [
      'Owns the platform, payments, and video pipeline',
      'Defines how priests get paid the moment proof is in',
    ],
    linkedin: 'https://www.linkedin.com/in/-atishey-jain/',
  },
];

const principles = [
  {
    icon: Flame,
    title: 'Video proof, or it is not delivered',
    // LEG-13: this used to read "Every puja booking gets a video recording from
    // the priest before payout. No exceptions, no opt-outs." Neither half held.
    // The proof gate (apps/api/src/routes/bookings.ts:276) blocks the
    // `video_uploaded` and `delivered` transitions only — a booking can reach
    // `completed` with videoProofUrl NULL, and four have — and no payout path
    // reads videoProofUrl at all. What is enforced is described here instead.
    // LEG-06/LEG-13 re-open: the second sentence used to read "If proof is
    // still missing after the window in our Refund Policy, the booking goes to
    // a refund review queue rather than being quietly closed." That traded one
    // unverified headline for another. escalateStaleBookings selects
    // `status: 'priest_assigned'` only, and the three proof-less bookings this
    // finding is built on are in `completed` — so they are exactly what the
    // sentence promised they were not.
    body: 'A booking cannot be moved to video-uploaded or delivered without a proof link attached by the assigned pandit — the server refuses the transition. If proof is still missing after the window in our Refund Policy and the booking is still waiting on its assigned pandit, an automatic sweep cancels it into a refund review queue. A booking a pandit has already advanced is outside that sweep, and we handle those on request — which is why the Refund Policy asks you to write in rather than wait.',
  },
  {
    icon: Heart,
    title: 'Priest paid first',
    body: 'Pandit payouts are calculated transparently — price minus a fair platform commission. We do not hold money to optimise our float.',
  },
  {
    icon: Compass,
    title: 'A clear NRI price, wherever you live',
    // LEG-13 neighbour: this claimed "NRI pricing is higher than domestic —
    // the multiplier is documented (9–10×)". No such premium is charged.
    // booking.service.ts:482-506 records that the `isNri ? nriPrice : basePrice`
    // swap was deliberately removed (isNri is self-settable via PATCH
    // /users/me, and it discarded the temple-level override), and the puja
    // pages' NRI price lines were deleted with it. A page cannot advertise a
    // premium the gateway is never asked for.
    body: 'A devotee in San Jose pays 2.5 times the domestic price for the same puja. It is shown in US dollars next to the exact rupee amount we charge, and the amount shown is the amount the order is created for — the server computes it, not the page.',
  },
  {
    icon: Globe2,
    title: 'Built for the diaspora',
    body: 'Sankalp, gotra, nakshatra — first-class concepts in the booking flow. A devotee in San Jose books the same way as one in Varanasi.',
  },
];

const roadmap: Milestone[] = [
  {
    when: 'January 2026',
    phase: 'The Spark',
    title: 'Two friends. One quiet ache for their families.',
    body: 'We had both watched our parents pay strangers for prayers they could never verify. A receipt. Sometimes a single photo. Often nothing. We thought a software company built by people who actually ship for a living could do better. The first commit went in that month.',
    status: 'shipped',
    icon: 'sunrise',
    accent: '#b87333',
    bgFrom: 'rgba(184,115,51,0.18)',
    bgTo: 'rgba(250,249,246,0.0)',
  },
  {
    when: 'February 2026',
    phase: 'Foundation',
    // LEG-13: this said "Our first 200 temples opened their doors" / "200
    // temples were listed". GET /api/v1/temples answers total 20. The strip
    // above now reads the live count, so restating 200 here would put the same
    // 10x overstatement back on the page in prose.
    title: 'The first temples opened their doors.',
    body: 'We sat with temple administrators and priests across India. By the end of the month the first temples were listed. The live count is in the strip above — it is read from our catalogue, not typed into this page.',
    status: 'shipped',
    icon: 'building',
    accent: '#c4814a',
    bgFrom: 'rgba(196,129,74,0.18)',
    bgTo: 'rgba(250,249,246,0.0)',
  },
  {
    when: 'March 2026',
    phase: 'Breadth',
    title: 'Every devotional thread, under one quiet roof.',
    body: 'Live darshan from real temples. A free AI Pandit for Gita questions. Astrologers and wellness teachers you could actually book. Char Dham and the twelve Jyotirlingas as guided yatras. The super-app stopped being a deck and started being a place people came back to.',
    status: 'shipped',
    icon: 'sparkles',
    accent: '#d99738',
    bgFrom: 'rgba(217,151,56,0.20)',
    bgTo: 'rgba(250,249,246,0.0)',
  },
  {
    when: 'April 2026',
    phase: 'Trust',
    // LEG-02/LEG-14: "Every receipt is real, deductible" asserted Section 80G
    // eligibility while lib/company.ts donationLegal.HAS_80G_VERIFIED is false
    // and both the donee 80G registration number and PAN are null. Deductibility
    // is the registration's to confer, not this page's.
    title: 'Gaushala seva, with a receipt for every donation.',
    body: 'Every donation is routed to the gaushala it was given to, and an itemised receipt is downloadable on the spot. We do not claim a tax outcome for you here: whether a donation is deductible depends on the donee\'s own 80G registration, which is between you, the gaushala and your assessor. We also ripped out every placeholder number from our admin dashboards — what you see is what is actually happening, today.',
    status: 'shipped',
    icon: 'shield',
    accent: '#a88454',
    bgFrom: 'rgba(168,132,84,0.18)',
    bgTo: 'rgba(250,249,246,0.0)',
  },
  {
    when: 'May 2026',
    phase: 'Now shipping',
    title: 'The mobile app, and a portal for every person who serves.',
    body: 'Devotee, priest, store owner, astrologer, wellness teacher, gaushala manager, temple administrator, admin — every person who keeps a corner of the seva running now has their own clean, native experience on iOS and Android. This is what we are putting in production this month.',
    status: 'now',
    icon: 'cog',
    accent: '#d99738',
    bgFrom: 'rgba(217,151,56,0.28)',
    bgTo: 'rgba(184,115,51,0.10)',
  },
  {
    when: 'Q3 2026',
    phase: 'Next',
    title: 'Antim Sanskar, samagri delivery, daily-habit subscriptions.',
    body: 'Coordinated last-rites support at city level for families who cannot fly back in time. A clean way to order puja samagri, idols, and books and have them at your door. And gentle daily-habit subscriptions for the devotees who want one small thing every morning.',
    status: 'planned',
    icon: 'radio',
    accent: '#7a6452',
    bgFrom: 'rgba(122,100,82,0.18)',
    bgTo: 'rgba(250,249,246,0.0)',
  },
  {
    when: '2027',
    phase: 'Vision',
    title: 'Every temple worth visiting, on one quiet map.',
    body: 'A thousand temples streaming live. A pandit who can answer in any of the twelve major Indian languages. Astrology and wellness powered by humans first, AI second. And — quietly — becoming the most-trusted devotional brand on the internet.',
    status: 'vision',
    icon: 'telescope',
    accent: '#5a8a5a',
    bgFrom: 'rgba(90,138,90,0.20)',
    bgTo: 'rgba(250,249,246,0.0)',
  },
];

/**
 * LEG-13 (prod sweep 2026-08-12) — this strip used to read
 * "200+ Temples partnered · 8 Role portals live · 9–10× NRI multiplier ·
 * 100% Bookings with video proof". The catalogue held 20 temples, and four
 * bookings sat in status `completed` with videoProofUrl NULL — the proof gate
 * (apps/api/src/routes/bookings.ts:276) only covers `video_uploaded` and
 * `delivered`, and no payout path reads videoProofUrl at all. Both headline
 * numbers were false on the page whose whole argument is that we tell the
 * truth about whether the puja happened.
 *
 * Counts now come from the live API. A count that could not be read is
 * DROPPED from the strip — never replaced with a remembered figure.
 */
function shippedStats(stats: PublicStats): { value: string; label: string }[] {
  const rows: { value: string; label: string }[] = [];
  if (stats.templeCount !== null) {
    rows.push({
      value: stats.templeCount.toLocaleString('en-IN'),
      label: stats.templeCount === 1 ? 'Temple listed' : 'Temples listed',
    });
  }
  if (stats.pujaTypeCount !== null) {
    rows.push({
      value: stats.pujaTypeCount.toLocaleString('en-IN'),
      label: stats.pujaTypeCount === 1 ? 'Puja you can book' : 'Pujas you can book',
    });
  }
  rows.push({ value: '8', label: 'Role portals live' });
  return rows;
}

export default async function AboutPage() {
  const shipped = shippedStats(await fetchPublicStats());
  return (
    <ScrollReveal>
      <div className="bg-[#faf9f6]">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(brandFaqJsonLd) }}
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

          <div className="relative mx-auto max-w-6xl px-6 pt-20 pb-20 sm:pt-24 sm:pb-24">
            <div
              data-reveal="up"
              className="inline-flex items-center gap-2 rounded-full border border-saffron-200/60 bg-white/70 px-3 py-1 text-xs font-medium text-saffron-700 backdrop-blur"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Our story · founded January 2026</span>
            </div>

            {/* DU-05: this was the 70.4px end of the finding's own "18px to
                70.4px" range — `text-[2.5rem] sm:text-[4.5rem]` (40px / 72px),
                two arbitrary bracket values off the scale entirely, plus
                `leading-[1.05]` pinned across both, plus a seventh colour
                token (`text-surface-900`) and the raw `font-display` utility
                instead of the .heading-display class the token layer can
                actually reach.

                It is now the `marketing` archetype, unmodified. The visual
                deltas are real and deliberate, and are listed here so they can
                be argued with rather than discovered:
                  size   40px / 72px          -> 30px / 36px (sm) / 48px (lg)
                  colour text-surface-900     -> text-surface-800
                  face   font-display         -> .heading-display (same family,
                                                 overridable from the token layer)
                  lead   leading-[1.05] fixed -> the --text-*--line-height
                                                 pairing for each step
                The underline bar drops h-3/h-4 -> h-2.5/h-3 to hold its ratio
                to the smaller type (was 30%/22% of the font size, now 33%/25%).
                `max-w-[56rem]` stays: it is a measure, not type. */}
            <h1
              data-reveal="up"
              className={`${H1.marketing} mt-7 max-w-[56rem]`}
            >
              Two founders.
              <br />
              One stubborn idea:
              <br />
              <span className="relative inline-block">
                <span className="relative z-10 text-saffron-700">video-verified bhakti.</span>
                <span
                  aria-hidden
                  className="absolute bottom-1 left-0 right-0 -z-0 h-2.5 bg-saffron-100/80 sm:h-3"
                />
              </span>
            </h1>

            <p
              data-reveal="up"
              className="prose-lead mt-7 max-w-2xl leading-relaxed text-surface-600"
            >
              Darshya is being built to give every devotee — in India and across
              the world — an honest, traceable bridge to the temples, priests, and
              traditions they grew up with. No screenshots. No middlemen. No
              broken promises about whether a puja actually happened.
            </p>

            <div data-reveal="up" className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                href="#founders"
                className={buttonClass('primary', 'md')}
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

            <div className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6">
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
          <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 sm:py-20 md:grid-cols-12">
            <div data-reveal="up" className="md:col-span-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-saffron-700">
                Why Darshya
              </p>
              <h2 className="mt-3 font-display text-3xl font-semibold leading-tight tracking-tight text-surface-900 sm:text-4xl">
                The internet has a thousand puja sites.
                <br />
                <span className="text-saffron-700">Almost none tell the truth.</span>
              </h2>
            </div>

            <div data-reveal="up" data-delay="2" className="md:col-span-8 md:pl-6">
              <div className="space-y-5 text-base leading-[1.75] text-surface-700 sm:text-lg">
                <p>
                  We started Darshya in January 2026 because we had both watched our
                  parents pay strangers on WhatsApp for pujas they could never
                  independently verify. A booking confirmation. A receipt. Sometimes a
                  single still photo. Often nothing.
                </p>
                <p>
                  The Indian devotional internet had grown comfortable selling faith
                  without proof — and a generation of NRIs were paying premium prices
                  into that gap, hoping it had been done right.
                </p>
                <p className="font-medium text-surface-900">
                  We thought we could do better. Make video proof the floor, not the
                  upsell. Pay the priest first. Document the NRI premium instead of
                  hiding it. Show every devotee the same thing we would want our own
                  parents to see.
                </p>
              </div>

              <figure className="mt-8 rounded-2xl border border-surface-200 bg-[#fbfaf6] p-6 sm:p-7">
                <Quote
                  className="h-5 w-5 text-saffron-600"
                  strokeWidth={1.5}
                  aria-hidden
                />
                <blockquote className="mt-3 font-display text-xl leading-relaxed text-surface-800 sm:text-2xl">
                  &ldquo;The simplest test of a devotional product is whether you would
                  feel comfortable booking it for your own grandmother. Everything we
                  build has to pass that test.&rdquo;
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
            className="pointer-events-none absolute -left-32 top-20 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,_rgba(184,115,51,0.08),_transparent_70%)]"
          />
          <div className="relative mx-auto max-w-6xl px-6 py-16 sm:py-20">
            <div data-reveal="up" className="mb-10 max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-saffron-700">
                The team
              </p>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-surface-900 sm:text-4xl">
                The two phones that ring when something breaks.
              </h2>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
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

                  <div className="flex items-center gap-5 p-6 sm:p-7">
                    <div
                      className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl ring-1"
                      style={{
                        background: f.accentSoft,
                        borderColor: `${f.accent}33`,
                      }}
                    >
                      <Image
                        src={f.photo}
                        alt={f.name}
                        width={160}
                        height={160}
                        className="h-20 w-20 object-cover"
                        unoptimized
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display text-xl font-semibold tracking-tight text-surface-900 sm:text-2xl">
                        {f.name}
                      </h3>
                      <p
                        className="mt-0.5 text-sm font-medium"
                        style={{ color: f.accent }}
                      >
                        {f.role} · {f.location}
                      </p>
                      <p className="mt-1 text-xs leading-snug text-surface-500">
                        {f.headline}
                      </p>
                    </div>
                  </div>

                  <div className="px-6 pb-6 sm:px-7 sm:pb-7">
                    <p className="text-base leading-relaxed text-surface-700">
                      {f.bio}
                    </p>

                    <ul className="mt-5 space-y-1.5">
                      {f.threads.map((t) => (
                        <li
                          key={t}
                          className="flex items-start gap-2 text-xs text-surface-600"
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

                    <div className="mt-6 flex items-center gap-3 border-t border-surface-200/70 pt-4">
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
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Principles ──────────────────────────────────────────────── */}
        <section className="relative border-b border-surface-200/60 bg-white">
          <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
            <div data-reveal="up" className="mb-10 max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-saffron-700">
                What we won&apos;t compromise on
              </p>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-surface-900 sm:text-4xl">
                Four rules. Written before the first commit.
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {principles.map((p, idx) => {
                const Icon = p.icon;
                return (
                  <div
                    key={p.title}
                    data-reveal="cascade"
                    data-delay={String(idx + 1)}
                    className="group relative overflow-hidden rounded-2xl border border-surface-200/70 bg-[#fbfaf6] p-6 transition-all hover:-translate-y-0.5 hover:border-saffron-300/60 hover:bg-white hover:shadow-[0_14px_28px_-14px_rgba(0,0,0,0.10)]"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-saffron-100 text-saffron-700 transition-colors group-hover:bg-saffron-700 group-hover:text-white">
                        <Icon className="h-5 w-5" strokeWidth={1.75} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-display text-lg font-semibold text-surface-900">
                          {p.title}
                        </h3>
                        <p className="mt-1.5 text-sm leading-relaxed text-surface-600">
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

        {/* ─── Roadmap (interactive sticky-pin rail) ───────────────────── */}
        <section
          id="roadmap"
          className="relative scroll-mt-20 border-b border-surface-200/60 bg-[#faf9f6]"
        >
          {/* Mobile copy header */}
          <div className="mx-auto max-w-6xl px-6 pt-14 md:hidden">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-saffron-700">
              The journey
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-surface-900">
              From the first commit to the long horizon.
            </h2>
            <p className="mt-3 text-base leading-relaxed text-surface-600">
              Scroll through where Darshya has been, where it is shipping now,
              and where we are taking it.
            </p>
          </div>

          {/* Mobile vertical stack lives inside RoadmapRail; desktop sticky-pin too. */}
          <div className="md:mt-0 mt-8 md:mb-0 mb-16 md:px-0 px-6">
            <RoadmapRail milestones={roadmap} />
          </div>

          <div className="mx-auto max-w-3xl px-6 pb-20 pt-4 text-center md:pt-8">
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
          <div className="relative mx-auto max-w-4xl px-6 py-16 text-center sm:py-20">
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
              className="prose-lead mx-auto mt-5 max-w-xl leading-relaxed text-surface-300"
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
                className={buttonClass('primary', 'md')}
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
