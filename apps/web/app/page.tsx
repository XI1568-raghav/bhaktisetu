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
} from 'lucide-react';
import { getTranslations } from '../lib/t';
import { getTempleHero, getDeityImage, getContentImage, getProductImage } from '../lib/images';
import { organizationJsonLd } from '../lib/jsonld';
import ScrollReveal from '../components/ScrollReveal';
import { HomeHeroCta } from '../components/HomeHeroCta';

export const metadata: Metadata = {
 title: "Darshya — India's Devotional Super App",
 description: 'Live darshan, puja booking, AI spiritual guidance, and more.',
 alternates: { canonical: 'https://darshya.online' },
 openGraph: {
   title: "Darshya — India's Devotional Super App",
   description: 'Live darshan, puja booking, AI spiritual guidance, and more.',
   url: 'https://darshya.online',
   type: 'website',
   // TODO: add /og-default.png (1200x630) to apps/web/public/
   images: ['/og-default.png'],
 },
 twitter: {
   card: 'summary_large_image',
   title: "Darshya — India's Devotional Super App",
   description: 'Live darshan, puja booking, AI spiritual guidance, and more.',
   images: ['/og-default.png'],
 },
};

export default async function HomePage() {
 const t = await getTranslations('home');
 const tCommon = await getTranslations('common');
 return (
 <ScrollReveal>
 <script
   type="application/ld+json"
   dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
 />
 <div data-scroll-progress className="fixed top-0 left-0 right-0 h-0.5 z-[60] origin-left scale-x-0" style={{ background: 'var(--color-primary)' }} />
 {/* Sticky early-access banner — pinned just below the fixed nav. */}
 <div
   className="sticky top-14 z-[55] w-full text-center text-[12px] sm:text-xs px-4 py-2"
   style={{ background: 'var(--color-primary)', color: '#fff' }}
 >
   <span className="font-medium">{t('bannerEarlyAccess')}</span>
   <span className="mx-2 opacity-70">—</span>
   <Link href="/waitlist" className="underline underline-offset-2 font-semibold whitespace-nowrap">
     {t('bannerCta')} →
   </Link>
 </div>
 <div style={{ background: 'var(--color-bg)' }}>

 {/* ═══ HERO — parallax bento, spring reveals ═════════════════════════ */}
 <section className="flex flex-col justify-center relative overflow-hidden">
 <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
 <div className="grid md:grid-cols-2 gap-8 items-center">
 <div>
 <div
 data-reveal="spring"
 className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-6"
 style={{ background: 'var(--color-art-2)', color: 'var(--color-text)' }}
 >
 <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
 {t('heroBadge')}
 </div>

 <h1
 data-reveal="cinematic"
 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight leading-[1.1]"
 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
 >
 {t('heroTitle1')}{' '}
 <span className="text-highlight" style={{ color: 'var(--color-primary)' }}>{t('heroTitle2')}</span>
 </h1>

 <p
 data-reveal="up"
 data-delay="2"
 className="mt-4 text-sm leading-relaxed"
 style={{ color: 'var(--color-text-muted)' }}
 >
 {t('heroSubtitle')}
 </p>

 <div data-reveal="spring" data-delay="3" className="mt-6 flex items-center gap-3 flex-wrap">
 <HomeHeroCta />
 <Link
 href="/pujas"
 className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg transition-all"
 style={{ background: 'var(--color-surface-offset)', color: 'var(--color-text)' }}
 >
 {t('heroCtaSecondary')}
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

 {/* Right — Bento with parallax float */}
 <div data-reveal="zoom-rotate" data-delay="1" className="hidden md:grid grid-cols-2 gap-2.5">
 <Link href="/darshan" className="col-span-2 rounded-xl overflow-hidden relative group" style={{ border: '1px solid var(--color-border)' }}>
 <img
 src="https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/The_Golden_Temple_of_Amrithsar_7.jpg/1920px-The_Golden_Temple_of_Amrithsar_7.jpg"
 srcSet="https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/The_Golden_Temple_of_Amrithsar_7.jpg/960px-The_Golden_Temple_of_Amrithsar_7.jpg 960w, https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/The_Golden_Temple_of_Amrithsar_7.jpg/1280px-The_Golden_Temple_of_Amrithsar_7.jpg 1280w, https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/The_Golden_Temple_of_Amrithsar_7.jpg/1920px-The_Golden_Temple_of_Amrithsar_7.jpg 1920w"
 sizes="(max-width: 768px) 100vw, 600px"
 alt="Sri Harmandir Sahib (Golden Temple) — live darshan"
 width={1920}
 height={960}
 className="w-full h-40 object-cover transition-transform duration-500 group-hover:scale-[1.02]"
 loading="eager"
 fetchPriority="high"
 decoding="async"
 />
 <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
 <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
 <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> LIVE
 </div>
 <div className="absolute bottom-2.5 left-2.5">
 <p className="text-xs font-medium text-white">Golden Temple, Amritsar</p>
 <p className="text-[10px] text-white/70">Watch live darshan →</p>
 </div>
 </Link>
 <div className="rounded-xl p-3 flex flex-col justify-between scroll-float" style={{ background: 'var(--color-art-1)', minHeight: '90px', animationDelay: '0s' }}>
 <Shield className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
 <div>
 <p className="text-[11px] font-medium mt-1" style={{ color: 'var(--color-text)' }}>Verified Priests</p>
 <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Aadhaar authenticated</p>
 </div>
 </div>
 <div className="rounded-xl p-3 flex flex-col justify-between scroll-float" style={{ background: 'var(--color-art-2)', minHeight: '90px', animationDelay: '1.5s' }}>
 <Sparkles className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
 <div>
 <p className="text-[11px] font-medium mt-1" style={{ color: 'var(--color-text)' }}>AI Pandit</p>
 <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Gita-powered guidance</p>
 </div>
 </div>
 </div>
 </div>
 </div>

 <div className="absolute bottom-6 left-1/2 -translate-x-1/2 scroll-indicator">
 <ChevronDown className="w-4 h-4" style={{ color: 'var(--color-text-faint)' }} />
 </div>
 </section>

 {/* ═══ OUR STORY — wipe-in timeline ════════════════════════════════ */}
 <section className="py-8 md:py-10" style={{ background: 'var(--color-surface)' }}>
 <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
 <p data-reveal="spring" className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: 'var(--color-primary)' }}>{t('ourStory')}</p>
 <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
 {[
 { num: '01', title: t('story1Title'), text: t('story1Text') },
 { num: '02', title: t('story2Title'), text: t('story2Text') },
 { num: '03', title: t('story3Title'), text: t('story3Text') },
 { num: '04', title: t('story4Title'), text: t('story4Text') },
 ].map((ch, i) => (
 <div key={ch.num} data-reveal="cascade" data-delay={String(i + 1)} className="relative pl-4" style={{ borderLeft: '2px solid var(--color-primary)' }}>
 <span className="text-[10px] font-bold" style={{ color: 'var(--color-primary)' }}>{ch.num}</span>
 <h3 className="text-xs font-semibold mt-0.5" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>{ch.title}</h3>
 <p className="text-[11px] mt-1 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>{ch.text}</p>
 </div>
 ))}
 </div>
 </div>
 </section>

 {/* ═══ SOCIAL PROOF — counter animation on scroll ════════════════ */}
 <section className="py-6 md:py-8">
 <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
 <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
 {[
 { number: '1B+', label: t('stat1') },
 { number: '30M+', label: t('stat2') },
 { number: '900+', label: t('stat3') },
 { number: '$58B', label: t('stat4') },
 ].map((stat, i) => (
 <div key={stat.number} data-reveal="cascade" data-delay={String(i + 1)} className="p-3 rounded-xl text-center" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
 <p data-counter data-counter-target={stat.number} className="text-lg font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-primary)' }}>{stat.number}</p>
 <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{stat.label}</p>
 </div>
 ))}
 </div>
 </div>
 </section>

 {/* animated divider */}
 <div data-reveal="fade" className="scroll-divider max-w-xs mx-auto" />

 {/* ═══ WHAT WE OFFER — cascade card grid ════════════════════════════ */}
 <section className="py-10 md:py-12">
 <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
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
 <section className="py-10 md:py-12" style={{ background: 'var(--color-surface)' }}>
 <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
 <div className="flex items-center justify-between mb-5">
 <div>
 <p data-reveal="fade" className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color: 'var(--color-primary)' }}>{t('liveDarshanLabel')}</p>
 <h2 data-reveal="spring" className="text-xl sm:text-2xl font-semibold tracking-tight" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
 {t('liveDarshanTitle')}
 </h2>
 </div>
 <Link href="/darshan" data-reveal="fade" className="inline-flex items-center gap-1 text-xs font-medium link-underline" style={{ color: 'var(--color-primary)' }}>
 {t('allStreams')} <ArrowRight className="w-3 h-3" />
 </Link>
 </div>

 <Link href="/darshan" data-reveal="cinematic" className="block relative rounded-xl overflow-hidden card-hover group" style={{ border: '1px solid var(--color-border)' }}>
 <div className="aspect-[16/9] relative">
 <img
 src="https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/The_Golden_Temple_of_Amrithsar_7.jpg/1920px-The_Golden_Temple_of_Amrithsar_7.jpg"
 srcSet="https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/The_Golden_Temple_of_Amrithsar_7.jpg/960px-The_Golden_Temple_of_Amrithsar_7.jpg 960w, https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/The_Golden_Temple_of_Amrithsar_7.jpg/1280px-The_Golden_Temple_of_Amrithsar_7.jpg 1280w, https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/The_Golden_Temple_of_Amrithsar_7.jpg/1920px-The_Golden_Temple_of_Amrithsar_7.jpg 1920w"
 sizes="(max-width: 768px) 100vw, 1200px"
 alt="Sri Harmandir Sahib (Golden Temple), Amritsar — live darshan"
 width={1920}
 height={1080}
 className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
 fetchPriority="high"
 decoding="async"
 />
 <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/25 to-transparent" />
 <div className="absolute top-3 left-3 flex items-center gap-2">
 <span className="flex items-center gap-1.5 bg-red-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
 <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> LIVE
 </span>
 </div>
 <div className="absolute bottom-4 left-4 right-4">
 <h3 className="text-lg sm:text-xl font-semibold text-white">Sri Harmandir Sahib</h3>
 <p className="text-xs text-white/80 mt-0.5">Live Darshan • Amritsar, Punjab</p>
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
 <section className="py-10 md:py-12">
 <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
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
 <img src={getDeityImage('lord-shiva')} alt="Puja ceremony" className="w-full h-full object-cover" loading="lazy" decoding="async" />
 </div>
 <div className="col-span-2 rounded-lg overflow-hidden">
 <img src={getContentImage('aarti', 'thumbnail')} alt="Aarti" className="w-full h-full object-cover" loading="lazy" decoding="async" />
 </div>
 <div className="col-span-2 rounded-lg p-2.5 flex flex-col justify-center" style={{ background: 'var(--color-art-3)' }}>
 <p className="text-base font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>HD</p>
 <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Video proof every puja</p>
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
 <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{f.label}</span>
 </div>
 ))}
 </div>
 <Link href="/pujas" className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--color-primary)' }}>
 {t('browsePujas')} <ArrowRight className="w-3 h-3" />
 </Link>
 </div>

 {/* Astrology card */}
 <div data-reveal="right" className="rounded-xl p-5" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
 <p className="text-xs font-medium uppercase tracking-widest mb-2" style={{ color: 'var(--color-primary)' }}>{t('astrologyLabel')}</p>
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
 <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-xs" style={{ background: 'var(--color-primary)' }}>PK</div>
 <div>
 <p className="text-[11px] font-semibold" style={{ color: 'var(--color-text)' }}>Pandit Kamal</p>
 <p className="text-[9px]" style={{ color: 'var(--color-text-muted)' }}>Vedic • 15yr exp</p>
 </div>
 </div>
 <div className="flex items-center gap-1">
 {[1,2,3,4,5].map(i => (
 <span key={i} className="text-[10px]" style={{ color: 'var(--color-primary)' }}></span>
 ))}
 <span className="text-[9px] ml-1" style={{ color: 'var(--color-text-muted)' }}>preview</span>
 </div>
 <div className="flex items-center justify-between">
 <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(184, 115, 51, 0.15)', color: 'var(--color-primary)' }}>Online</span>
 <p className="text-[10px] font-semibold" style={{ color: 'var(--color-text)' }}>₹25/min</p>
 </div>
 </div>
 {/* Today's horoscope preview */}
 <div className="col-span-2 rounded-lg p-2.5 flex flex-col justify-center" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
 <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Today • Leo</p>
 <p className="text-sm font-semibold mt-0.5" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}></p>
 <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Lucky: 7</p>
 </div>
 {/* Kundli chart icon */}
 <div className="col-span-2 rounded-lg p-2.5 flex flex-col justify-center items-center text-center" style={{ background: 'var(--color-primary-highlight)' }}>
 <p data-counter data-counter-target="15+" className="text-base font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-primary)' }}>15+</p>
 <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Astrologers</p>
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
 <Moon className="w-3.5 h-3.5" style={{ color: 'var(--color-primary)' }} />
 <span className="text-xs font-medium group-hover:underline" style={{ color: 'var(--color-text)' }}>{card.title}</span>
 </div>
 <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: 'var(--color-primary-highlight)', color: 'var(--color-primary)' }}>{card.badge}</span>
 </Link>
 ))}
 </div>
 <Link href="/astrology" className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--color-primary)' }}>
 {t('talkToAstrologer')} <ArrowRight className="w-3 h-3" />
 </Link>
 </div>
 </div>
 </div>
 </section>

 {/* animated divider */}
 <div data-reveal="fade" className="scroll-divider max-w-xs mx-auto" />

 {/* ═══ AI PANDIT — blur-in chat mockup ════════════════════════════ */}
 <section className="py-10 md:py-14" style={{ background: 'var(--color-surface)' }}>
 <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
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
 <Link href="/ask-pandit" className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg text-white btn-press" style={{ background: 'var(--color-primary)' }}>
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
 <p className="text-[10px]" style={{ color: 'var(--color-text-faint)' }}>{t('aiSpiritualGuide')}</p>
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
 <p className="italic text-[11px] mb-1" style={{ color: 'var(--color-text-muted)' }}>{"कर्मण्येवाधिकारस्ते मा फलेषु कदाचन"}</p>
 <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>&quot;You have the right to perform your duty, but not to the fruits of your actions.&quot;</p>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 </section>

 {/* ═══ BHAKTI STORE — showcase ═══════════════════════════════════ */}
 <section className="py-10 md:py-12">
 <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
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
 <span key={tag} className="text-[11px] px-2.5 py-1 rounded-full" style={{ background: 'var(--color-surface-offset)', color: 'var(--color-text-muted)' }}>{tag}</span>
 ))}
 </div>
 <div data-reveal="spring" data-delay="3">
 <Link href="/store" className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg text-white btn-press" style={{ background: 'var(--color-primary)' }}>
 {t('shopEssentials')} <ArrowRight className="w-3.5 h-3.5" />
 </Link>
 </div>
 </div>
 <div className="grid grid-cols-2 gap-3">
 {[
 { name: 'Brass Puja Thali', price: '₹1,299', img: getProductImage('brass-puja-thali') },
 { name: 'Rudraksha Mala', price: '₹599', img: getProductImage('rudraksha-mala') },
 { name: 'Sandalwood Incense', price: '₹249', img: getProductImage('incense-sticks') },
 { name: 'Ganesh Murti', price: '₹2,499', img: getProductImage('ganesh-murti') },
 ].map((p, i) => (
 <div key={p.name} data-reveal="cascade" data-delay={String(i + 1)} className="rounded-xl overflow-hidden card-hover" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
 <div className="aspect-square">
 <img src={p.img} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
 </div>
 <div className="p-2.5">
 <p className="text-[11px] font-medium truncate" style={{ color: 'var(--color-text)' }}>{p.name}</p>
 <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-primary)' }}>{p.price}</p>
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>
 </section>

 {/* ═══ MORE FEATURES — cascade compact row ═══════════════════════ */}
 <section className="py-6 md:py-8" style={{ background: 'var(--color-surface)' }}>
 <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
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
 <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{item.desc}</p>
 </Link>
 ))}
 </div>
 </div>
 </section>

 {/* ═══ FINAL CTA — cinematic + spring ════════════════════════════ */}
 <section className="py-10 md:py-12">
 <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
 <h2 data-reveal="cinematic" className="text-xl sm:text-2xl font-semibold tracking-tight mb-3" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
 {t('finalCtaTitle')}
 </h2>
 <p data-reveal="up" data-delay="1" className="text-xs max-w-sm mx-auto mb-6" style={{ color: 'var(--color-text-muted)' }}>
 {t('finalCtaDesc')}
 </p>
 <div data-reveal="spring" data-delay="2" className="flex items-center justify-center gap-3">
 <Link
 href="/auth/login"
 className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg text-white btn-press"
 style={{ background: 'var(--color-primary)' }}
 >
 {tCommon('getStarted')} <ArrowRight className="w-3.5 h-3.5" />
 </Link>
 <Link
 href="/temples"
 className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg transition-all"
 style={{ background: 'var(--color-surface-offset)', color: 'var(--color-text)' }}
 >
 {t('exploreFirst')}
 </Link>
 </div>
 </div>
 </section>

 </div>
 </ScrollReveal>
 );
}
