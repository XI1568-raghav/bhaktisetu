import type { Metadata } from 'next';
import Link from 'next/link';
import {
 ArrowRight,
 Play,
 Shield,
 Video,
 Gift,
 Sparkles,
 Moon,
 ChevronDown,
} from 'lucide-react';
import { getTranslations } from '../lib/t';
import { getTodayPanchang } from '../lib/api';
import { getPlatformCounts } from '../lib/platform-stats';
// ParallaxLayer is the only motion component this page actually renders.
// TextReveal, ScrambleReveal and StickyHeadlinePin were imported here and
// never used in the JSX — three dead imports the bundler still had to resolve,
// and a StickyHeadlinePin that nobody could find on the page because it was
// never mounted. TextReveal is still live inside the strip components.
import ParallaxLayer from '../components/motion/ParallaxLayer';
import { brandFaqJsonLd } from '../lib/jsonld';
import { getTempleHero, getDeityImage, getContentImage, IMG_W, remoteSrcSet } from '../lib/images';
import ScrollReveal from '../components/ScrollReveal';
import { buttonClass } from '../components/ui/button-recipe';
import { HomeHeroCta } from '../components/HomeHeroCta';
import IntentTrio from '../components/home/IntentTrio';
import ContinueJourneyCard from '../components/home/ContinueJourneyCard';
import ThisWeek from '../components/home/ThisWeek';
import ServiceLanes from '../components/home/ServiceLanes';
import NriLane from '../components/home/NriLane';
import EmailCapture from '../components/EmailCapture';
import HowItWorks from '../components/home/HowItWorks';
import HeroCopyVariant from '../components/home/HeroCopyVariant';
import TempleClock from '../components/home/TempleClock';
import SankalpThread from '../components/home/SankalpThread';

// Edge runtime + 1-hour revalidate — TTFB win per Pillar 4 audit (2026-06-08).
// Panchang chip cache OK at 1h granularity. Personal salutation deferred to client.
export const revalidate = 3600;

export const metadata: Metadata = {
 title: "Darshya, India's Devotional Super App",
 description:
   'Live darshan from sacred temples, online puja booking with verified pandits, daily panchang, Vedic astrology, Sanskrit lessons, gaushala donations and AI spiritual guidance. Your complete Sanatan Dharma companion.',
 alternates: {
   canonical: 'https://darshya.online',
   languages: {
     en: 'https://darshya.online/',
     hi: 'https://darshya.online/hi',
     ta: 'https://darshya.online/ta',
     te: 'https://darshya.online/te',
     bn: 'https://darshya.online/bn',
     mr: 'https://darshya.online/mr',
   },
 },
 openGraph: {
   title: "Darshya, India's Devotional Super App",
   description:
     'Live darshan, online puja booking, panchang, Vedic astrology, Sanskrit and Vedic learning, gaushala donations and AI pandit guidance. One app for daily devotional practice.',
   url: 'https://darshya.online',
   type: 'website',
   images: ['/og/default.png'],
 },
 twitter: {
   card: 'summary_large_image',
   title: "Darshya, India's Devotional Super App",
   description:
     'Live darshan, online puja booking, panchang, Vedic astrology, Sanskrit & Vedic learning, gaushala donations and AI pandit guidance.',
   images: ['/og/default.png'],
 },
};

export default async function HomePage() {
 const t = await getTranslations('home');
 const tCommon = await getTranslations('common');

 // Tolerant panchang fetch — surface tithi + nakshatra chip in hero per blueprint Day 2.
 let panchangChip: { tithi: string; nakshatra: string } | null = null;
 try {
   const p = await getTodayPanchang();
   panchangChip = { tithi: p.tithi, nakshatra: p.nakshatra };
 } catch {
   panchangChip = null;
 }

 // CM-11 / DF-05 (prod sweep 2026-08-12): every inventory number on this page
 // used to be a string literal ("200+ verified temples", "500+ vetted
 // pandits"). They are now server counts, and a failed count renders copy with
 // no digits rather than the old marketing figure. See lib/platform-stats.ts.
 const counts = await getPlatformCounts();

 return (
 <ScrollReveal>
 <script
   type="application/ld+json"
   dangerouslySetInnerHTML={{ __html: JSON.stringify(brandFaqJsonLd) }}
 />
 {/* HOME-SCROLL (2026-09-08): the kalava rail. Decorative + a jump nav; lg-only,
     lives in the gutter a wide viewport already has spare. */}
 <SankalpThread
   stops={[
     { id: 'hero', label: 'Book a puja', at: 4 },
     { id: 'begin', label: 'Choose where to begin', at: 16 },
     { id: 'coming-up', label: 'What is coming up', at: 21 },
     { id: 'how-it-works', label: 'How it works', at: 29 },
     { id: 'lanes', label: 'Every way to be present', at: 47 },
     { id: 'nri', label: 'Living abroad', at: 58 },
     { id: 'darshan', label: 'Live darshan', at: 66 },
     { id: 'offerings', label: 'Pujas and astrology', at: 76 },
     { id: 'panchang', label: 'Daily panchang', at: 92 },
   ]}
 />
 <div data-scroll-progress className="fixed top-0 left-0 right-0 h-0.5 z-[60] origin-left scale-x-0" style={{ background: 'var(--color-primary)' }} />
 <div style={{ background: 'var(--color-bg)' }}>

 {/* Waitlist banner + NextFestivalStrip moved below hero per user feedback 2026-06-07. */}

 {/* ═══ HERO — parallax bento, spring reveals ═════════════════════════ */}
 {/* HOME-TOD: `data-tod-wash` layers the time-of-day gradient behind the hero.
     The hero is already `position: relative`, which the rule depends on. */}
 <section id="hero" data-tod-wash className="flex flex-col justify-center relative overflow-hidden">
 <div className="container-wide py-6 md:py-8">
 <div className="grid md:grid-cols-2 gap-8 items-center">
 <div>
 {panchangChip && (
 <div
 data-reveal="up"
 className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-3"
 style={{ background: '#FFFBEB', color: '#92400E', border: '1px solid #FDE68A' }}
 >
 <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#D97706' }} />
 Aaj {panchangChip.tithi}, {panchangChip.nakshatra}
 </div>
 )}
 <div
 data-reveal="spring"
 className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-6"
 style={{ background: 'var(--color-art-2)', color: 'var(--color-text)' }}
 >
 <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
 {t('heroBadge')}
 </div>

 <HeroCopyVariant
 controlTitle1={t('heroTitle1')}
 controlTitle2={t('heroTitle2')}
 controlSubtitle={t('heroSubtitle')}
 />

 {/* CM-13 / CM-14 (prod sweep 2026-08-12): these were two equally-weighted
   filled buttons at the same y — "Explore Temples" and "Book a Puja" —
   splitting intent at the highest-stakes decision on the site. Worse, the
   temples branch is the weaker one: 15 of 20 temples have zero puja
   offerings, so three of every four destinations behind it cannot take
   money. One primary (the catalogue, via HomeHeroCta), and the temple
   directory demoted to a text link. */}
 <div data-reveal="spring" data-delay="3" className="mt-6 flex items-center gap-4 flex-wrap">
 <HomeHeroCta />
 <Link
 href="/temples"
 data-hero-secondary
 className="inline-flex min-h-[44px] items-center gap-1 text-sm font-medium underline underline-offset-4"
 style={{ color: 'var(--color-text-muted)' }}
 >
 Explore temples <ArrowRight className="w-3.5 h-3.5" />
 </Link>
 </div>

 {/* HOME-TOD (2026-09-05): the live line — which part of the day it is at the
     temples, and which real aarti is next, from lib/aarti-schedules.ts.
     Deliberately NOT inside a data-reveal wrapper: this is the one element on
     the page whose whole job is to be true at the moment you look at it, and
     an element that starts at opacity 0 waiting for an observer is the one
     element that must not carry a countdown. */}
 <TempleClock />

 <div data-reveal="fade" data-delay="4" className="mt-8 flex items-center gap-6 text-xs" style={{ color: 'var(--color-text-muted)' }}>
 <div><span className="text-base font-semibold" style={{ color: 'var(--color-text)' }}>{t('heroBadgeVerified')}</span> {t('heroBadgeTemples')}</div>
 <div className="w-px h-4" style={{ background: 'var(--color-divider)' }} />
 <div><span className="text-base font-semibold" style={{ color: 'var(--color-text)' }}>{t('heroBadgeAadhaar')}</span> {t('heroBadgePriests')}</div>
 <div className="w-px h-4" style={{ background: 'var(--color-divider)' }} />
 <div><span className="text-base font-semibold" style={{ color: 'var(--color-text)' }}>{t('heroBadgeHd')}</span> {t('heroBadgeStreams')}</div>
 </div>
 </div>

 {/* Right — Bento with explicit ParallaxLayer + scroll-driven depth */}
 <ParallaxLayer speed={0.12} maxOffset={48} className="hidden md:block">
 <div data-reveal="zoom-rotate" data-delay="1" className="grid grid-cols-2 gap-2.5">
 <Link href="/darshan" className="col-span-2 rounded-xl overflow-hidden relative group" style={{ border: '1px solid var(--color-border)' }}>
 {/* HOME-01 (2026-08-20): this was <Image … priority unoptimized>. `priority`
     makes next/image call ReactDOM.preload (node_modules/next/dist/client/
     image-component.js:220), and the last real build proves what that emitted:

       .next/server/app/index.html, one image preload in <head> —
       <link rel="preload" as="image" href="…/500px-The_Golden_Temple_of_Amrithsar_7.jpg"/>

     no imagesrcset, no imagesizes, no media. The box it fills is inside
     ParallaxLayer's `hidden md:block`, so on every phone the browser fetched
     61,099 B at the highest priority there is, into something display:none that
     is never painted. PERF-02 banned this exact shape in app/layout.tsx; it was
     living one level down.

     Now a plain <img> (images.unoptimized is true, so <Image> rendered a bare
     <img> anyway and its prop type omits srcSet) with a `sizes` that tells the
     truth about the phone slot. Measured candidates: 250px 16,790 B, 330px
     28,510 B, 500px 61,099 B.
       phone  <768px  → declared 1px  → 250px candidate →  16,790 B (was 61,099)
       md-lg          → >= 464 CSS px → 500px candidate →  61,099 B (unchanged)
       >= 1216px      →    528 CSS px → 500px candidate →  61,099 B (unchanged)
     No fetchPriority: the tag sits at byte ~22.9k of the document, so the
     preload scanner still finds it in the first network chunk, and PERF-02's
     rule against priority hints on maybe-unpainted resources holds here too. */}
 {/* HOME-01 (2026-08-21) — why there is a 120 px candidate. Dropping
     `priority` stopped next/image emitting a preload, but REACT 19 emits one of
     its own for the first non-lazy <img> it renders and copies `sizes` across.
     Read out of the SSR'd document on 2026-08-21, it is the page's only
     <link rel="preload">:
       <link rel="preload" as="image"
             imagesrcset="…250px… 250w, …330px… 330w, …500px… 500w"
             imagesizes="(max-width: 767px) 1px, …">
     It carries no `media`, and a React-emitted preload cannot be given one, so
     a phone DOES fetch a candidate for a box inside `hidden md:block` —
     display:none, never painted. Every other <img> on this page is
     loading="lazy", which makes this preload the WHOLE of a phone's at-load
     image budget.
     120 is a real Commons ladder step, so the 1 px declared slot resolves to it
     instead of to 250. Measured over the wire 2026-08-21 (HEAD to Commons):
     120px = 4,543 B vs 250px = 16,790 B — 12,247 B, 72.9% of that budget, no
     longer spent on an invisible box.
     Nothing that PAINTS can select it: the box exists only at >=768 px, where
     the narrowest slot is (768 - 96) / 2 = 336 CSS px, and 336 already resolves
     to the 500 px candidate at DPR 1. Desktop is byte-for-byte unchanged. */}
 <img
 src={getTempleHero('golden-temple', IMG_W.CARD)}
 srcSet={remoteSrcSet(getTempleHero('golden-temple', IMG_W.CARD), [120, 250, 330, IMG_W.CARD])}
 alt="Sri Harmandir Sahib (Golden Temple), live darshan"
 width={500}
 height={250}
 sizes="(max-width: 767px) 1px, (max-width: 1215px) calc((100vw - 6rem) / 2), 528px"
 className="w-full h-40 object-cover object-center transition-transform duration-500 group-hover:scale-[1.02]"
 decoding="async"
 />
 <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
 <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
 <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> LIVE
 </div>
 <div className="absolute bottom-2.5 left-2.5">
 <p className="text-xs font-medium text-white">Golden Temple, Amritsar</p>
 <p className="text-xs text-white/70">Watch live darshan →</p>
 </div>
 </Link>
 <div className="rounded-xl p-3 flex flex-col justify-between scroll-float" style={{ background: 'var(--color-art-1)', minHeight: '90px', animationDelay: '0s' }}>
 <Shield className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
 <div>
 <p className="text-xs font-medium mt-1" style={{ color: 'var(--color-text)' }}>Verified Priests</p>
 <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Aadhaar authenticated</p>
 </div>
 </div>
 <div className="rounded-xl p-3 flex flex-col justify-between scroll-float" style={{ background: 'var(--color-art-2)', minHeight: '90px', animationDelay: '1.5s' }}>
 <Sparkles className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
 <div>
 <p className="text-xs font-medium mt-1" style={{ color: 'var(--color-text)' }}>AI Pandit</p>
 <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Gita-powered guidance</p>
 </div>
 </div>
 </div>
 </ParallaxLayer>
 </div>
 </div>

 <div className="absolute bottom-6 left-1/2 -translate-x-1/2 scroll-indicator">
 <ChevronDown className="w-4 h-4" style={{ color: 'var(--color-text-faint)' }} />
 </div>
 </section>

 {/* ═══ ONBOARDING — intent trio (anon) / continue card (returning) — moved below hero per Phase D-6 ═══ */}
 <ContinueJourneyCard />
 <IntentTrio liveDarshanTemples={counts.liveDarshanTemples} />

 {/* ═══ THE DATED SURFACE ═══════════════════════════════════════════
     Supersedes NextFestivalStrip, which showed exactly one festival and had
     no browse-fallback story of its own. Urgency here is a tithi, not a
     discount timer — the deadline is real, which is the only kind of urgency
     the CCPA dark-pattern guidelines leave open. Every CTA resolves against
     the live catalogue; when nothing resolves the card offers the guide
     rather than a dead /pujas/<slug>. */}
 <ThisWeek />

 {/* CM-13: the answer to "how do I know the puja actually happened?", placed
     where the buyer asks it rather than ten screens down. */}
 {/* HOME-IA (2026-09-08): HowItWorks now also renders the five promises that
     used to be the separate <WhatYouGet /> section directly beneath it. The two
     answered the same question twice — what happens, then what you are owed
     while it happens — for ~550px. The rows are imported from WhatYouGet, which
     is still the single sourced definition; only the second MOUNT is gone. */}
 <HowItWorks />

 {/* HOME-IA (2026-09-08): the six lanes. The page sold one of them — a puja at
     a temple — across every section above, while a devotee wanting a pandit at
     their own house, an astrologer, a yatra, gaushala seva or simply to donate
     had no route from this page at all. One grid rather than five strips: five
     strips is how this page reached twelve sections, and four of those rendered
     with no heading. */}
 <ServiceLanes />

 {/* HOME-IA (2026-09-08): NRI pricing is 9-10x domestic (PROJECT_CONTEXT rule 2),
     so this is the highest-margin lane in the product — and the only one whose
     objection is distance rather than trust. It gets a band, not a card. */}
 <NriLane />


 {/* ═══ LIVE DARSHAN — cinematic image reveal ════════════════════════ */}
 <section id="darshan" className="py-6 md:py-8" style={{ background: 'var(--color-surface)' }}>
 <div className="container-wide">
 <div className="flex items-center justify-between mb-5">
 <div>
 <p data-reveal="fade" className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color: 'var(--color-primary)' }}>{t('liveDarshanLabel')}</p>
 <h2 data-reveal="spring" className="text-xl sm:text-2xl font-semibold tracking-tight" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
 {t('liveDarshanTitle')}
 </h2>
 </div>
 <Link href="/darshan" data-reveal="fade" className="tap-safe items-center gap-1 text-xs font-medium link-underline" style={{ color: 'var(--color-primary)' }}>
 {t('allStreams')} <ArrowRight className="w-3 h-3" />
 </Link>
 </div>

 {/* HOME-IA (2026-09-08): this was ONE 16:9 tile of Mahakaleshwar, 768px tall
     — the largest single element on the page, spending a full viewport to link
     to one temple and to imply the product had one stream. Three 4:3 cards say
     more in less than half the height: they prove there are several temples,
     they name where each one is, and each links to its own darshan page.

     All three slugs carry a real photo in IMAGES.temples AND a schedule in
     lib/aarti-schedules.ts, so none falls through to FALLBACK_IMAGE and none
     lands on a "Coming soon" panel. Check both before swapping a temple in.

     No srcSet gymnastics needed at this size: the painted slot is ~349 CSS px
     on desktop (1088 container, 3 columns, gap-3) and ~100vw-32px below sm, so
     CARD (500) covers a 1x desktop and a 1x phone, and the 2x step resolves to
     WIDE. That is the same two-candidate list the old tile ended up with after
     HERO was measured to ADD 133,682 B. */}
 <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
 {[
 { slug: 'kashi-vishwanath', name: 'Kashi Vishwanath', place: 'Varanasi, Uttar Pradesh' },
 { slug: 'mahakaleshwar', name: 'Mahakaleshwar Jyotirlinga', place: 'Ujjain, Madhya Pradesh' },
 { slug: 'golden-temple', name: 'Sri Harmandir Sahib', place: 'Amritsar, Punjab' },
 ].map((temple, i) => (
 <li key={temple.slug}>
 <Link
   href={`/darshan/${temple.slug}`}
   data-reveal="up"
   data-delay={String(i + 1)}
   className="group block relative rounded-xl overflow-hidden card-hover h-full"
   style={{ border: '1px solid var(--color-border)' }}
 >
 <div className="aspect-[4/3] relative">
 <img
   src={getTempleHero(temple.slug, IMG_W.CARD)}
   srcSet={remoteSrcSet(getTempleHero(temple.slug, IMG_W.CARD), [IMG_W.CARD, IMG_W.WIDE])}
   sizes="(max-width: 639px) calc(100vw - 32px), 349px"
   alt={`${temple.name} live darshan`}
   width={500}
   height={375}
   className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
   loading="lazy"
   decoding="async"
 />
 <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
 <span className="absolute top-2.5 left-2.5 flex items-center gap-1.5 bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
 <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> LIVE
 </span>
 <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
 <span className="w-11 h-11 rounded-full bg-white/25 backdrop-blur-sm flex items-center justify-center transition-all duration-300 group-hover:bg-white/40 group-hover:scale-110">
 <Play className="w-5 h-5 text-white ml-0.5" />
 </span>
 </span>
 <span className="absolute bottom-3 left-3 right-3">
 <span className="block text-sm font-semibold text-white leading-snug">{temple.name}</span>
 <span className="block text-xs text-white/80 mt-0.5">{temple.place}</span>
 </span>
 </div>
 </Link>
 </li>
 ))}
 </ul>
 </div>
 </section>

 {/* ═══ PUJA BOOKING + ASTROLOGY — side by side ═══════════════════ */}
 <section id="offerings" className="py-6 md:py-8">
 <div className="container-wide">
 <div className="grid md:grid-cols-2 gap-5">
 {/* Puja Booking card */}
 {/* HOME-IA (2026-09-08): `flex flex-col h-full` + `mt-auto` on the footer below.
     This card is shorter than the astrology card beside it, and a CSS grid
     stretches both cells to the tallest — so the surplus used to fall as dead
     whitespace under a 12px text link, which read as an unfinished component.
     The height difference is real and fine; what was wrong was leaving the
     bottom of the card empty instead of anchoring the action to it. */}
 <div data-reveal="spring" className="flex h-full flex-col rounded-xl p-5" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
 <p className="text-xs font-medium uppercase tracking-widest mb-2" style={{ color: 'var(--color-primary)' }}>{t('pujaBookingLabel')}</p>
 <h3 className="text-lg font-semibold tracking-tight mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
 {t('pujaBookingTitle')}
 </h3>
 <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
 {t('pujaBookingDesc')}
 </p>
 <div className="grid grid-cols-5 grid-rows-2 gap-2 mb-4" style={{ height: '160px' }}>
 <div className="col-span-3 row-span-2 rounded-lg overflow-hidden" data-parallax="0.04">
 {/* HOME-01 (2026-08-20): 3 of 5 columns of a 494 CSS px card body, so the slot
     is ~293 px on desktop and ~(60vw - 46px) below md — nowhere near the 500 px
     this always downloaded. Candidates measure 250px 17,262 B / 330px 27,483 B /
     500px 55,881 B, so a 1x desktop now saves 28,398 B and a 1x phone 38,619 B.
     A 2x screen still resolves to 500 px, unchanged. */}
 <img
   src={getDeityImage('lord-shiva', 'portrait', IMG_W.CARD)}
   srcSet={remoteSrcSet(getDeityImage('lord-shiva', 'portrait', IMG_W.CARD), [250, 330, IMG_W.CARD])}
   sizes="(max-width: 767px) calc(60vw - 46px), 293px"
   alt="Puja ceremony"
   width={480}
   height={320}
   className="w-full h-full object-cover"
   loading="lazy"
   decoding="async"
 />
 </div>
 <div className="col-span-2 rounded-lg overflow-hidden">
 {/* HOME-01 (2026-08-23 re-rank): this was the only <img> on the homepage with
     neither srcSet nor sizes, so every device took the 250px / 15,277 B
     candidate. Slot maths: .container-wide is 1088 CSS px of content at
     >=1024px, the md:grid-cols-2 gap-5 card is (1088-20)/2 = 534, p-5 leaves a
     494px body, and grid-cols-5 gap-2 makes col-span-2 = 2*92.4 + 8 = ~193px.
     Below md the same chain gives ~(40vw - 34px) — 116px at a 375px viewport.
     Candidates are [120, 250] and deliberately NOT 500: 1x phone takes 120 /
     5,144 B (-10,133 B) and every other device still resolves to 250, exactly
     what it pays today. Offering a wider step is the trap documented on the
     Live Darshan tile, where it ADDED 133,682 B to desktop and DPR-3 phones. */}
 <img
   src={getContentImage('aarti', 'thumbnail', IMG_W.THUMB)}
   srcSet={remoteSrcSet(getContentImage('aarti', 'thumbnail', IMG_W.THUMB), [120, IMG_W.THUMB])}
   sizes="(max-width: 767px) calc(40vw - 34px), 193px"
   alt="Aarti"
   width={320}
   height={320}
   className="w-full h-full object-cover"
   loading="lazy"
   decoding="async"
 />
 </div>
 <div className="col-span-2 rounded-lg p-2.5 flex flex-col justify-center" style={{ background: 'var(--color-art-3)' }}>
 <p className="text-base font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>HD</p>
 <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Video proof every puja</p>
 </div>
 </div>
 <div className="mt-auto">
 <div className="flex flex-wrap gap-3 border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
 {[
 { icon: Shield, label: tCommon('verified') },
 { icon: Video, label: t('videoProof') },
 { icon: Gift, label: t('prasadDelivery') },
 ].map((f) => (
 <div key={f.label} className="flex items-center gap-1.5">
 <f.icon className="w-3 h-3" style={{ color: 'var(--color-primary)' }} />
 <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{f.label}</span>
 </div>
 ))}
 </div>
 {/* A real button, not a 12px text link. This is the puja catalogue — the
     single highest-intent destination on the page — and it was the only
     lane whose card closed on a link lighter than its own body copy. */}
 <div className="mt-4 flex flex-wrap items-center gap-3">
 <Link href="/pujas" className={buttonClass('primary', 'sm')}>
 {t('browsePujas')} <ArrowRight className="w-3.5 h-3.5" />
 </Link>
 <Link
   href="/temples"
   // RESP-09: a bare inline anchor, so it takes the tap-safe opt-in rather than
   // a hand-rolled min-h. The global 44px floor in globals.css reaches
   // button/[role=button]/nav li>a and footer li>a — never a naked <a> like this.
   className="tap-safe text-xs underline underline-offset-4"
   style={{ color: 'var(--color-text-muted)' }}
 >
 Browse temples
 </Link>
 </div>
 </div>
 </div>

 {/* Astrology card — indigo accent per audit §3 section 7 (reference/decision lane, not action) */}
 <div data-reveal="right" className="rounded-xl p-5" style={{ background: 'linear-gradient(180deg, #eef2ff 0%, var(--color-surface) 60%)', border: '1px solid #c7d2fe' }}>
 <p className="text-xs font-medium uppercase tracking-widest mb-2" style={{ color: '#4f46e5' }}>{t('astrologyLabel')}</p>
 <h3 className="text-lg font-semibold tracking-tight mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
 {t('astrologyTitle')}
 </h3>
 <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
 {t('astrologyDesc')}
 </p>

 {/* Visual: 12 rashis grid + astrologer card */}
 <div className="grid grid-cols-5 grid-rows-2 gap-2 mb-4" style={{ height: '160px' }}>
 {/* Featured astrologer */}
 <div className="col-span-3 row-span-2 rounded-lg p-3 flex flex-col justify-between relative overflow-hidden" style={{ background: 'linear-gradient(135deg, var(--color-art-3), var(--color-art-2))' }}>
 <div className="flex items-center gap-2">
 <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-xs" style={{ background: '#4f46e5' }}>PK</div>
 <div>
 <p className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>Pandit Kamal</p>
 <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Vedic • 15yr exp</p>
 </div>
 </div>
 <div className="flex items-center gap-1">
 {[1,2,3,4,5].map(i => (
 <span key={i} className="text-xs" style={{ color: '#4f46e5' }}></span>
 ))}
 <span className="text-xs ml-1" style={{ color: 'var(--color-text-muted)' }}>preview</span>
 </div>
 <div className="flex items-center justify-between">
 <span className="text-xs font-medium px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(79, 70, 229, 0.12)', color: '#4f46e5' }}>Online</span>
 <p className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>₹25/min</p>
 </div>
 </div>
 {/* Today's horoscope preview */}
 <div className="col-span-2 rounded-lg p-2.5 flex flex-col justify-center" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
 <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Today • Leo</p>
 <p className="text-sm font-semibold mt-0.5" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}></p>
 <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Lucky: 7</p>
 </div>
 {/* CM-11 / AW-02: this tile was a `data-counter` count-up reading "15+"
     above the word "Astrologers". Fifteen was not an estimate — it is the
     size of the in-memory astrologer fixture, and AW-02 ("the LAST door
     that still sold the 15 invented astrologers") rebound the directory,
     the profile page, the reviews and booking endpoints and the Expo
     app's only astrologer source onto real supply: three approved
     profiles. The homepage was the door it missed, advertising the
     fixture's headcount at five times the real roster, animated so it
     read as a live metric.

     The replacement follows the ruling lib/platform-stats.ts already made
     for the pandit headcount — "the honest move on a trust strip is to
     make a claim that is not about volume at all". This makes a claim
     about vetting instead, which is true of every profile the directory
     will serve. Restore a number here only if it comes from a server
     count, the way `verifiedTempleClaim` does. Guarded by
     __tests__/funnel-inventory-claims.test.tsx. */}
 <div className="col-span-2 rounded-lg p-2.5 flex flex-col justify-center items-center text-center" style={{ background: 'rgba(79, 70, 229, 0.10)' }}>
 <p className="text-base font-semibold" style={{ fontFamily: 'var(--font-display)', color: '#4f46e5' }}>Verified</p>
 <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Astrologers</p>
 </div>
 </div>

 <div className="space-y-2 mb-4">
 {[
 { title: t('freeKundli'), badge: tCommon('free'), href: '/astrology/kundli' },
 { title: t('dailyHoroscope'), badge: 'Daily', href: '/astrology/horoscope' },
 { title: t('liveConsultation'), badge: 'From ₹15/min', href: '/astrology' },
 ].map((card) => (
 <Link key={card.title} href={card.href} prefetch={false} className="group flex items-center justify-between p-2.5 rounded-lg transition-all" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
 <div className="flex items-center gap-2">
 <Moon className="w-3.5 h-3.5" style={{ color: '#4f46e5' }} />
 <span className="text-xs font-medium group-hover:underline" style={{ color: 'var(--color-text)' }}>{card.title}</span>
 </div>
 <span className="text-xs font-medium px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(79, 70, 229, 0.10)', color: '#4f46e5' }}>{card.badge}</span>
 </Link>
 ))}
 </div>
 <Link href="/astrology" className="tap-safe items-center gap-1.5 text-xs font-medium" style={{ color: '#4f46e5' }}>
 {t('talkToAstrologer')} <ArrowRight className="w-3 h-3" />
 </Link>
 </div>
 </div>
 </div>
 </section>

 {/* HOME-IA (2026-09-04): the five discovery strips that used to close the page
     — WorshipStrip, WisdomStrip, ConsultStrip and both NriLaneAbTest slots —
     are gone from here. Measured on the live DOM at 1440x900 they added 1,507px
     to a 6,382px page, and three of the four rendered with NO heading at all: a
     devotee scrolling past was shown anonymous rails of links with nothing
     saying what they were or why now. They also said what the page had already
     said twice — IntentTrio ("Choose where to begin") and WhatYouGet cover the
     same "here are our lanes" job, above the fold, with headings.

     Nothing is deleted. Each strip is a section of the page that owns its
     intent (/discover, /astrology, /gift), where the visitor has already
     declared it. The components stay in components/home/ and are unchanged.

     nri_lane_above_fold is retired rather than relocated: the experiment cannot
     report. NEXT_PUBLIC_POSTHOG_KEY is unset in production, so useFeatureFlag
     returns its default and every visitor has been served the "below" control
     since the test shipped. A geo-conditional gift lane beats both variants
     without spending a test slot. */}

 {/* Daily-panchang waitlist — single-field email capture, source-tagged for funnel.
     A <div>, not a <section>: EmailCapture renders its own <section> with the
     heading, so wrapping it in a second one put two identical "Daily panchang in
     your inbox" landmarks in the a11y tree, one nested inside the other. */}
 <div id="panchang" className="container-prose py-12">
 <EmailCapture
 source="home-hero"
 title="Daily panchang in your inbox"
 subtitle="Tithi, nakshatra, festival reminders and launch credits. Free forever, unsubscribe any time."
 cta="Get free panchang"
 />
 </div>

 </div>
 </ScrollReveal>
 );
}
