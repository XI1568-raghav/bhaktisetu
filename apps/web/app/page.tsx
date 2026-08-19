import type { Metadata } from 'next';
import Link from 'next/link';
import {
 ArrowRight,
 Play,
 Users,
 Shield,
 Video,
 Gift,
 Sparkles,
 Music,
 Calendar,
 Heart,
 Moon,
 ChevronDown,
 Zap,
 CheckCircle,
 Leaf,
 Flame,
 Stars,
 Compass,
 BookOpen,
} from 'lucide-react';
import { getTranslations } from '../lib/t';
import { buttonClass } from '../components/ui/button-recipe';
import { getTodayPanchang } from '../lib/api';
import { getPlatformCounts } from '../lib/platform-stats';
import Image from 'next/image';
import TextReveal from '../components/motion/TextReveal';
import ParallaxLayer from '../components/motion/ParallaxLayer';
import ScrambleReveal from '../components/motion/ScrambleReveal';
import StickyHeadlinePin from '../components/motion/StickyHeadlinePin';
import { brandFaqJsonLd } from '../lib/jsonld';
import { getTempleHero, getDeityImage, getContentImage, getProductImage, IMG_W, remoteSrcSet } from '../lib/images';
import ScrollReveal from '../components/ScrollReveal';
import { HomeHeroCta } from '../components/HomeHeroCta';
import IntentTrio from '../components/home/IntentTrio';
import ContinueJourneyCard from '../components/home/ContinueJourneyCard';
import WorshipStrip from '../components/home/WorshipStrip';
import WisdomStrip from '../components/home/WisdomStrip';
import ConsultStrip from '../components/home/ConsultStrip';
import ShopStrip from '../components/home/ShopStrip';
import YatraStrip from '../components/home/YatraStrip';
import TrustStrip from '../components/home/TrustStrip';
import EmailCapture from '../components/EmailCapture';
import NextFestivalStrip from '../components/home/NextFestivalStrip';
import HowItWorks from '../components/home/HowItWorks';
import HeroCopyVariant from '../components/home/HeroCopyVariant';
import NriLaneAbTest from '../components/home/NriLaneAbTest';

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
 <div data-scroll-progress className="fixed top-0 left-0 right-0 h-0.5 z-[60] origin-left scale-x-0" style={{ background: 'var(--color-primary)' }} />
 <div style={{ background: 'var(--color-bg)' }}>

 {/* Waitlist banner + NextFestivalStrip moved below hero per user feedback 2026-06-07. */}

 {/* ═══ HERO — parallax bento, spring reveals ═════════════════════════ */}
 <section className="flex flex-col justify-center relative overflow-hidden">
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
 <Image
 src={getTempleHero('golden-temple', IMG_W.CARD)}
 alt="Sri Harmandir Sahib (Golden Temple), live darshan"
 width={500}
 height={250}
 sizes="(max-width: 768px) 100vw, 360px"
 className="w-full h-40 object-cover object-center transition-transform duration-500 group-hover:scale-[1.02]"
 priority
 unoptimized
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

 {/* ═══ A/B nri_lane_above_fold — above slot (R-Q1-E-009) ═════════════ */}
 <NriLaneAbTest slot="above" />

 {/* ═══ ONBOARDING — intent trio (anon) / continue card (returning) — moved below hero per Phase D-6 ═══ */}
 <ContinueJourneyCard />
 <IntentTrio liveDarshanTemples={counts.liveDarshanTemples} />

 {/* ═══ NEXT FESTIVAL countdown — relocated below intent trio per user feedback 2026-06-07 ═════ */}
 <NextFestivalStrip />

 {/* CM-13: the answer to "how do I know the puja actually happened?", placed
     where the buyer asks it rather than ten screens down. */}
 <HowItWorks />

 {/* ═══ CATEGORY COLOR STRIP — 5 brand worlds visible above fold ═══════ */}
 {/* User complaint 2026-06-05: above-fold reads as saffron monoculture. */}
 {/* This strip immediately signals Worship saffron, Library indigo, Astrology indigo, Yatra emerald, Shop amber. */}
 <section aria-label="Browse by category" className="py-5 md:py-7" style={{ background: 'var(--color-bg)' }}>
 <div className="container-wide">
 <div className="flex md:grid md:grid-cols-5 gap-2.5 overflow-x-auto md:overflow-visible -mx-4 px-4 md:mx-0 md:px-0 snap-x snap-mandatory md:snap-none scrollbar-thin">
 {[
 { label: 'Worship', sub: 'Darshan, Puja, Aarti', href: '/pujas', Icon: Flame, bg: '#FFF8F0', border: '#FDD8AF', text: '#7d4e1f', icon: '#9e6229' },
 { label: 'Library', sub: '500 plus wisdom guides', href: '/discover', Icon: BookOpen, bg: '#EEF2FF', border: '#C7D2FE', text: '#3730A3', icon: '#4F46E5' },
 { label: 'Astrology', sub: 'Kundli, Horoscope, Doshas', href: '/astrology', Icon: Stars, bg: '#EEF2FF', border: '#C7D2FE', text: '#3730A3', icon: '#4F46E5' },
 { label: 'Yatra', sub: 'Pilgrimage, Wellness', href: '/yatra', Icon: Compass, bg: '#ECFDF5', border: '#A7F3D0', text: '#065F46', icon: '#059669' },
 { label: 'Shop', sub: 'Prasad, Idols, Rudraksha', href: '/store', Icon: Heart, bg: '#FFFBEB', border: '#FDE68A', text: '#92400E', icon: '#D97706' },
 ].map((cat) => (
 <Link
 key={cat.label}
 href={cat.href}
 prefetch={false}
 className="snap-start shrink-0 md:shrink flex flex-col items-start justify-between gap-2 min-w-[164px] md:min-w-0 p-3.5 rounded-xl card-hover transition-all"
 style={{ background: cat.bg, border: `1px solid ${cat.border}` }}
 >
 <cat.Icon className="w-5 h-5" style={{ color: cat.icon }} />
 <div>
 <p className="text-sm font-semibold" style={{ color: cat.text }}>{cat.label}</p>
 <p className="text-xs mt-0.5" style={{ color: cat.text, opacity: 0.75 }}>{cat.sub}</p>
 </div>
 </Link>
 ))}
 </div>
 </div>
 </section>

 {/* ═══ QUICK ACTIONS — 6 chip row (IA P4) ═══════════════════════════ */}
 <section aria-label="Quick actions" className="py-6 md:py-8" style={{ background: 'var(--color-bg)' }}>
 <div className="container-wide">
 <div className="flex md:grid md:grid-cols-6 gap-2.5 overflow-x-auto md:overflow-visible -mx-4 px-4 md:mx-0 md:px-0 snap-x snap-mandatory md:snap-none scrollbar-thin">
 {[
 { label: 'Darshan', href: '/darshan', Icon: Video, color: 'var(--color-primary)' },
 { label: 'Book Puja', href: '/pujas', Icon: Flame, color: 'var(--color-primary)' },
 { label: 'Kundli', href: '/astrology/kundli', Icon: Stars, color: '#4f46e5' },
 { label: 'Panchang', href: '/panchang', Icon: Calendar, color: '#d97706' },
 { label: 'Donate', href: '/donations', Icon: Heart, color: '#059669' },
 { label: 'Yatra', href: '/yatra', Icon: Compass, color: '#059669' },
 ].map((chip) => (
 <Link
 key={chip.label}
 href={chip.href}
 prefetch={false}
 className="snap-start shrink-0 md:shrink flex flex-col items-center justify-center gap-1.5 min-w-[88px] md:min-w-0 px-3 py-3 rounded-xl card-hover transition-all"
 style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
 >
 <chip.Icon className="w-5 h-5" style={{ color: chip.color }} />
 <span className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>{chip.label}</span>
 </Link>
 ))}
 </div>
 </div>
 </section>

 {/* ═══ TRUST STRIP — verified, video-proof, 80G, NRI-friendly ═══ */}
 <section aria-label="Trust signals" className="py-6 md:py-8" style={{ background: 'var(--color-surface)' }}>
 <div className="container-wide">
 <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
 {[
 { icon: Shield, title: 'Verified Temples', desc: 'Manager-signed, on-site audit', accent: 'var(--color-primary)' },
 { icon: Video, title: 'Video Proof', desc: 'Every puja recorded + shared', accent: '#059669' },
 { icon: CheckCircle, title: '80G Receipts', desc: 'Tax-deductible donations', accent: '#059669' },
 { icon: Heart, title: 'NRI Friendly', desc: 'Book from 40+ countries', accent: 'var(--color-primary)' },
 ].map((t, i) => (
 <div key={t.title} data-reveal="cascade" data-delay={String(i + 1)} className="flex items-start gap-2.5 p-3 rounded-xl" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
 <t.icon className="w-5 h-5 shrink-0 mt-0.5" style={{ color: t.accent }} />
 <div>
 <p className="text-xs font-semibold leading-tight" style={{ color: 'var(--color-text)' }}>{t.title}</p>
 <p className="text-xs mt-0.5 leading-snug" style={{ color: 'var(--color-text-muted)' }}>{t.desc}</p>
 </div>
 </div>
 ))}
 </div>
 </div>
 </section>

 {/* animated divider */}
 <div data-reveal="fade" className="scroll-divider max-w-xs mx-auto" />

 {/* ═══ WHAT WE OFFER — cascade card grid ════════════════════════════ */}
 <section className="py-6 md:py-8">
 <div className="container-wide">
 <div className="flex items-center gap-2.5 mb-3">
 <Zap className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
 <p className="text-xs font-medium uppercase tracking-widest" style={{ color: 'var(--color-primary)' }}>{t('everythingOneApp')}</p>
 </div>
 <h2 data-reveal="spring" className="text-xl sm:text-2xl font-semibold tracking-tight leading-snug mb-5" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
 {t('everythingTitle')}
 </h2>
 <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
 {[
 { title: t('featLiveDarshan'), desc: t('featLiveDarshanDesc'), href: '/darshan' },
 { title: t('featVerifiedPujas'), desc: t('featVerifiedPujasDesc'), href: '/pujas' },
 { title: t('featDharmicYatra'), desc: t('featDharmicYatraDesc'), href: '/yatra' },
 { title: t('featAiPandit'), desc: t('featAiPanditDesc'), href: '/ask-pandit' },
 { title: t('featSacredContent'), desc: t('featSacredContentDesc'), href: '/content' },
 { title: t('featAstrology'), desc: t('featAstrologyDesc'), href: '/astrology' },
 { title: t('featWellness'), desc: t('featWellnessDesc'), href: '/wellness' },
 ].map((item, i) => (
 <Link
 key={item.title}
 href={item.href}
 data-reveal="cascade"
 data-delay={String(i + 1)}
 className="group flex gap-2.5 p-3 rounded-xl transition-all card-hover"
 style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
 >
 <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--color-primary)' }} />
 <div>
 <h3 className="text-sm font-medium group-hover:underline" style={{ color: 'var(--color-text)' }}>{item.title}</h3>
 <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{item.desc}</p>
 </div>
 </Link>
 ))}
 </div>
 </div>
 </section>

 {/* ═══ LIVE DARSHAN — cinematic image reveal ════════════════════════ */}
 <section className="py-6 md:py-8" style={{ background: 'var(--color-surface)' }}>
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

 <Link href="/darshan" data-reveal="cinematic" className="block relative rounded-xl overflow-hidden card-hover group" style={{ border: '1px solid var(--color-border)' }}>
 <div className="aspect-[16/9] relative">
 {/* HOME-01: the single largest image on the page. images.unoptimized is true
     in next.config.ts, so Next emits no srcset of its own — without the
     explicit srcSet below EVERY viewport pulled the 960px / 189,024 B
     candidate, a 375px phone included (measured mobile saving: 132,270 B).

     The SOURCE width stays WIDE. The painted slot is ~1088 CSS px
     (.container-wide = 72rem minus 2rem gutters at >=1024px), so the triage
     doc's advice to drop to IMG_W.CARD (500) would be a 2.18x upscale on the
     biggest picture on the homepage. The sizes attribute names 1088px for the
     same reason — 960px understated the slot and made the browser pick one
     step too small on a 2x screen.

     Plain <img>, not next/image: images.unoptimized is true so <Image> renders a
     bare <img> anyway, and its prop type OMITS srcSet — the same reason
     app/pujas/page.tsx:679 uses <img> for the card srcSet. */}
 <img
   src={getTempleHero('mahakaleshwar', IMG_W.WIDE)}
   srcSet={remoteSrcSet(getTempleHero('mahakaleshwar', IMG_W.WIDE), [
     IMG_W.CARD,
     IMG_W.WIDE,
     IMG_W.HERO,
   ])}
   alt="Mahakaleshwar Jyotirlinga, Ujjain, live darshan"
   width={1280}
   height={720}
   sizes="(max-width: 768px) 100vw, 1088px"
   className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
   loading="lazy"
   decoding="async"
 />
 <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/25 to-transparent" />
 <div className="absolute top-3 left-3 flex items-center gap-2">
 <span className="flex items-center gap-1.5 bg-red-600 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
 <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> LIVE
 </span>
 </div>
 <div className="absolute bottom-4 left-4 right-4">
 {/* P2 #217 (2026-08-03): image is Mahakaleshwar (Ujjain) but the caption read
   "Sri Harmandir Sahib / Amritsar" — wrong temple. Match the image. */}
 <h3 className="text-lg sm:text-xl font-semibold text-white">Mahakaleshwar Jyotirlinga</h3>
 <p className="text-xs text-white/80 mt-0.5">Live Darshan • Ujjain, Madhya Pradesh</p>
 </div>
 <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
 <div className="w-16 h-16 rounded-full bg-white/25 backdrop-blur-sm flex items-center justify-center transition-all duration-300 group-hover:bg-white/40 group-hover:scale-110">
 <Play className="w-7 h-7 text-white ml-0.5" />
 </div>
 </div>
 </div>
 </Link>
 </div>
 </section>

 {/* ═══ PUJA BOOKING + ASTROLOGY — side by side ═══════════════════ */}
 <section className="py-6 md:py-8">
 <div className="container-wide">
 <div className="grid md:grid-cols-2 gap-5">
 {/* Puja Booking card */}
 <div data-reveal="spring" className="rounded-xl p-5" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
 <p className="text-xs font-medium uppercase tracking-widest mb-2" style={{ color: 'var(--color-primary)' }}>{t('pujaBookingLabel')}</p>
 <h3 className="text-lg font-semibold tracking-tight mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
 {t('pujaBookingTitle')}
 </h3>
 <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
 {t('pujaBookingDesc')}
 </p>
 <div className="grid grid-cols-5 grid-rows-2 gap-2 mb-4" style={{ height: '160px' }}>
 <div className="col-span-3 row-span-2 rounded-lg overflow-hidden" data-parallax="0.04">
 <img src={getDeityImage('lord-shiva', 'portrait', IMG_W.CARD)} alt="Puja ceremony" width={480} height={320} className="w-full h-full object-cover" loading="lazy" decoding="async" />
 </div>
 <div className="col-span-2 rounded-lg overflow-hidden">
 <img src={getContentImage('aarti', 'thumbnail', IMG_W.THUMB)} alt="Aarti" width={320} height={320} className="w-full h-full object-cover" loading="lazy" decoding="async" />
 </div>
 <div className="col-span-2 rounded-lg p-2.5 flex flex-col justify-center" style={{ background: 'var(--color-art-3)' }}>
 <p className="text-base font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>HD</p>
 <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Video proof every puja</p>
 </div>
 </div>
 <div className="flex flex-wrap gap-3 mb-4">
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
 <Link href="/pujas" className="tap-safe items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--color-primary)' }}>
 {t('browsePujas')} <ArrowRight className="w-3 h-3" />
 </Link>
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
 {/* Kundli chart icon */}
 <div className="col-span-2 rounded-lg p-2.5 flex flex-col justify-center items-center text-center" style={{ background: 'rgba(79, 70, 229, 0.10)' }}>
 <p data-counter data-counter-target="15+" className="text-base font-semibold" style={{ fontFamily: 'var(--font-display)', color: '#4f46e5' }}>15+</p>
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

 {/* animated divider */}
 <div data-reveal="fade" className="scroll-divider max-w-xs mx-auto" />

 {/* ═══ AI PANDIT — blur-in chat mockup ════════════════════════════ */}
 <section className="py-6 md:py-8" style={{ background: 'var(--color-surface)' }}>
 <div className="container-wide">
 <div className="grid md:grid-cols-2 gap-8 items-center">
 <div>
 <p data-reveal="fade" className="text-xs font-medium uppercase tracking-widest mb-2" style={{ color: 'var(--color-primary)' }}>{t('aiGuideLabel')}</p>
 <h2 data-reveal="spring" className="text-xl sm:text-2xl font-semibold tracking-tight mb-3" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
 {t('aiGuideTitle')}
 </h2>
 <p data-reveal="up" data-delay="1" className="text-xs leading-relaxed mb-5" style={{ color: 'var(--color-text-muted)' }}>
 {t('aiGuideDesc')}
 </p>
 <div data-reveal="spring" data-delay="2">
 <Link href="/ask-pandit" className={buttonClass('primary', 'md', 'btn-press')}>
 {t('askYourQuestion')} <ArrowRight className="w-3.5 h-3.5" />
 </Link>
 </div>
 </div>

 <div data-reveal="glow" data-delay="1" className="rounded-xl overflow-hidden" style={{ background: 'var(--color-surface-2, #fff)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-md)' }}>
 <div className="px-4 py-2.5 flex items-center gap-2" style={{ borderBottom: '1px solid var(--color-divider)' }}>
 <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'var(--color-art-2)' }}>
 <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--color-primary)' }} />
 </div>
 <div>
 <p className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>{t('panditJi')}</p>
 <p className="text-xs" style={{ color: 'var(--color-text-faint)' }}>{t('aiSpiritualGuide')}</p>
 </div>
 </div>
 <div className="p-4 space-y-3">
 <div className="flex justify-end">
 <div className="px-3 py-2 rounded-2xl rounded-br-md text-xs max-w-[80%]" style={{ background: 'var(--color-primary)', color: '#fff' }}>
 What does the Gita say about duty?
 </div>
 </div>
 <div className="flex justify-start">
 <div className="px-3 py-2 rounded-2xl rounded-bl-md text-xs max-w-[85%]" style={{ background: 'var(--color-surface-offset)', color: 'var(--color-text)' }}>
 <p className="mb-1.5">The Bhagavad Gita teaches us in Chapter 2, Verse 47:</p>
 <p className="italic text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>{"कर्मण्येवाधिकारस्ते मा फलेषु कदाचन"}</p>
 <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>&quot;You have the right to perform your duty, but not to the fruits of your actions.&quot;</p>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 </section>

 {/* ═══ BHAKTI STORE — showcase ═══════════════════════════════════ */}
 <section className="py-6 md:py-8">
 <div className="container-wide">
 <div className="grid md:grid-cols-2 gap-8 items-center">
 <div>
 <p data-reveal="fade" className="text-xs font-medium uppercase tracking-widest mb-2" style={{ color: 'var(--color-primary)' }}>{t('bhaktiStoreLabel')}</p>
 <h2 data-reveal="spring" className="text-xl sm:text-2xl font-semibold tracking-tight mb-3" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
 {t('bhaktiStoreTitle')}
 </h2>
 <p data-reveal="up" data-delay="1" className="text-xs leading-relaxed mb-5" style={{ color: 'var(--color-text-muted)' }}>
 {t('bhaktiStoreDesc')}
 </p>
 <div data-reveal="up" data-delay="2" className="flex flex-wrap gap-2 mb-5">
 {['Puja Essentials', 'Rudraksha & Malas', 'Idols', 'Books', 'Organic'].map((tag) => (
 <span key={tag} className="text-xs px-2.5 py-1 rounded-full" style={{ background: 'var(--color-surface-offset)', color: 'var(--color-text-muted)' }}>{tag}</span>
 ))}
 </div>
 <div data-reveal="spring" data-delay="3">
 <Link href="/store" className={buttonClass('primary', 'md', 'btn-press')}>
 {t('shopEssentials')} <ArrowRight className="w-3.5 h-3.5" />
 </Link>
 </div>
 </div>
 <div className="grid grid-cols-2 gap-3">
 {[
 { name: 'Brass Puja Thali', price: '₹1,299', img: getProductImage('brass-puja-thali', IMG_W.THUMB) },
 { name: 'Rudraksha Mala', price: '₹599', img: getProductImage('rudraksha-mala', IMG_W.THUMB) },
 { name: 'Sandalwood Incense', price: '₹249', img: getProductImage('incense-sticks', IMG_W.THUMB) },
 { name: 'Ganesh Murti', price: '₹2,499', img: getProductImage('ganesh-murti', IMG_W.THUMB) },
 ].map((p, i) => (
 <div key={p.name} data-reveal="cascade" data-delay={String(i + 1)} className="rounded-xl overflow-hidden card-hover" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
 <div className="aspect-square">
 <img src={p.img} alt={p.name} width={250} height={250} className="w-full h-full object-cover" loading="lazy" decoding="async" />
 </div>
 <div className="p-2.5">
 <p className="text-xs font-medium truncate" style={{ color: 'var(--color-text)' }}>{p.name}</p>
 <p className="text-xs mt-0.5" style={{ color: 'var(--color-primary)' }}>{p.price}</p>
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>
 </section>

 {/* ═══ MORE FEATURES — cascade compact row ═══════════════════════ */}
 <section className="py-6 md:py-8" style={{ background: 'var(--color-surface)' }}>
 <div className="container-wide">
 <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
 {[
 { title: t('gauSevaTitle'), desc: t('gauSevaDesc'), href: '/gaushala', icon: Heart },
 { title: t('panchangTitle'), desc: t('panchangDesc'), href: '/panchang', icon: Calendar },
 { title: t('contentTitle'), desc: t('contentDesc'), href: '/content', icon: Music },
 { title: t('wellnessTitle'), desc: t('wellnessDesc'), href: '/wellness', icon: Leaf },
 ].map((item, i) => (
 <Link
 key={item.title}
 href={item.href}
 prefetch={false}
 data-reveal="cascade"
 data-delay={String(i + 1)}
 className="group p-3 rounded-xl card-hover transition-all"
 style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
 >
 <item.icon className="w-4 h-4 mb-2" style={{ color: 'var(--color-primary)' }} />
 <h3 className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>{item.title}</h3>
 <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{item.desc}</p>
 </Link>
 ))}
 </div>
 </div>
 </section>

 {/* ═══ FINAL CTA — cinematic + spring ════════════════════════════ */}
 <section className="py-6 md:py-8">
 <div className="container-wide text-center">
 <h2 data-reveal="cinematic" className="text-xl sm:text-2xl font-semibold tracking-tight mb-3" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
 {t('finalCtaTitle')}
 </h2>
 <p data-reveal="up" data-delay="1" className="text-xs max-w-sm mx-auto mb-6" style={{ color: 'var(--color-text-muted)' }}>
 {t('finalCtaDesc')}
 </p>
 <div data-reveal="spring" data-delay="2" className="flex items-center justify-center gap-3">
 <Link href="/auth/login" className={buttonClass('primary', 'md', 'btn-press')}>
 {tCommon('getStarted')} <ArrowRight className="w-3.5 h-3.5" />
 </Link>
 <Link
 href="/temples"
 className={buttonClass('secondary', 'md')}
 >
 {t('exploreFirst')}
 </Link>
 </div>
 </div>
 </section>

 {/* ═══ 5-CATEGORY DISCOVERY STRIPS ═══════════════════════════════════ */}
 <WorshipStrip liveDarshanTemples={counts.liveDarshanTemples} />
 <WisdomStrip />
 <ConsultStrip />
 <ShopStrip />
 <YatraStrip />

 {/* ═══ A/B nri_lane_above_fold — below slot (R-Q1-E-009) ═════════════ */}
 <NriLaneAbTest slot="below" />

 {/* ═══ LIBRARY TEASER — 4-card row mirroring Library mega-panel (IA P4) ═══ */}
 <section aria-label="Discover the Library" className="py-6 md:py-8" style={{ background: 'var(--color-surface)' }}>
 <div className="container-wide">
 <div className="flex items-end justify-between mb-5">
 <div>
 <p className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color: '#4f46e5' }}>Library</p>
 <h2 className="text-xl sm:text-2xl font-semibold tracking-tight" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
 500+ guides across scripture, practice, saints and the calendar.
 </h2>
 </div>
 <Link href="/discover" className="hidden sm:inline-flex items-center gap-1 text-xs font-medium" style={{ color: '#4f46e5' }}>
 Browse all <ArrowRight className="w-3 h-3" />
 </Link>
 </div>
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
 {[
 { Icon: BookOpen, title: 'Scriptures', desc: 'Vedas, Upanishads, Puranas, Gita, Ramayana.', href: '/discover#scriptures' },
 { Icon: Music, title: 'Devotional', desc: 'Aarti, chalisa, mantra, bhajan, sankalp.', href: '/discover#practice' },
 { Icon: Users, title: 'Saints & Deities', desc: '12 bhakti saints, 10 mahavidyas, navadurga.', href: '/discover#saints' },
 { Icon: Calendar, title: 'Calendar & Cosmology', desc: 'Festivals, tithi, nakshatra, ekadashi.', href: '/discover#cosmology' },
 ].map((card) => (
 <Link
 key={card.title}
 href={card.href}
 prefetch={false}
 className="group flex flex-col gap-2 p-4 rounded-xl card-hover transition-all"
 style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
 >
 <card.Icon className="w-5 h-5" style={{ color: '#4f46e5' }} />
 <h3 className="text-sm font-semibold group-hover:underline" style={{ color: 'var(--color-text)' }}>{card.title}</h3>
 <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>{card.desc}</p>
 </Link>
 ))}
 </div>
 <div className="sm:hidden mt-4 text-center">
 <Link href="/discover" className="tap-safe items-center gap-1 text-xs font-medium" style={{ color: '#4f46e5' }}>
 Browse all 500+ guides <ArrowRight className="w-3 h-3" />
 </Link>
 </div>
 </div>
 </section>

 {/* ═══ YATRA TEASER — 3-card emerald row per audit §3 delta #1 ═══════════ */}
 <section aria-label="Pilgrimage circuits" className="py-6 md:py-8" style={{ background: 'var(--color-bg)' }}>
 <div className="container-wide">
 <div className="flex items-end justify-between mb-5">
 <div>
 <p className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color: '#059669' }}>Yatra</p>
 <h2 className="text-xl sm:text-2xl font-semibold tracking-tight" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
 Walk the sacred circuits of India. Char Dham, 12 Jyotirlinga, 62 Tirth.
 </h2>
 </div>
 <Link href="/yatra" className="hidden sm:inline-flex items-center gap-1 text-xs font-medium" style={{ color: '#059669' }}>
 Plan a trip <ArrowRight className="w-3 h-3" />
 </Link>
 </div>
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
 {[
 { Icon: Compass, title: 'Char Dham', desc: 'Yamunotri, Gangotri, Kedarnath, Badrinath. Himalayan moksha route.', href: '/pilgrimage/char-dham' },
 { Icon: Flame, title: '12 Jyotirlinga', desc: 'Shiva self-manifest lights from Somnath to Rameswaram.', href: '/jyotirlinga' },
 { Icon: Leaf, title: '62 Tirth Guides', desc: 'Darshan timings, dress code, vip-darshan tips per shrine.', href: '/tirth' },
 ].map((card) => (
 <Link
 key={card.title}
 href={card.href}
 prefetch={false}
 className="group flex flex-col gap-2 p-4 rounded-xl card-hover transition-all"
 style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
 >
 <card.Icon className="w-5 h-5" style={{ color: '#059669' }} />
 <h3 className="text-sm font-semibold group-hover:underline" style={{ color: 'var(--color-text)' }}>{card.title}</h3>
 <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>{card.desc}</p>
 </Link>
 ))}
 </div>
 <div className="sm:hidden mt-4 text-center">
 <Link href="/yatra" className="tap-safe items-center gap-1 text-xs font-medium" style={{ color: '#059669' }}>
 Plan a trip <ArrowRight className="w-3 h-3" />
 </Link>
 </div>
 </div>
 </section>

 <TrustStrip verifiedTemples={counts.verifiedTemples} />

 {/* Daily-panchang waitlist — single-field email capture, source-tagged for funnel */}
 <section className="container-prose py-12">
 <EmailCapture
 source="home-hero"
 title="Daily panchang in your inbox"
 subtitle="Tithi, nakshatra, festival reminders and launch credits. Free forever, unsubscribe any time."
 cta="Get free panchang"
 />
 </section>

 </div>
 </ScrollReveal>
 );
}
