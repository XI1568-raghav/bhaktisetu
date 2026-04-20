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
import { getTempleHero, getDeityImage, getContentImage, getProductImage } from '../lib/images';
import ScrollReveal from '../components/ScrollReveal';

export const metadata: Metadata = {
  title: "Poojly — India's Devotional Super App",
  description: 'Live darshan, puja booking, AI spiritual guidance, and more.',
};

export default function HomePage() {
  return (
    <ScrollReveal>
      <div data-scroll-progress className="fixed top-0 left-0 right-0 h-0.5 z-[60] origin-left scale-x-0" style={{ background: 'var(--color-primary)' }} />
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
                  12,450+ devotees watching live darshan
                </div>

                <h1
                  data-reveal="cinematic"
                  className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight leading-[1.1]"
                  style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
                >
                  Your bridge to{' '}
                  <span className="text-highlight" style={{ color: 'var(--color-primary)' }}>sacred traditions</span>
                </h1>

                <p
                  data-reveal="up"
                  data-delay="2"
                  className="mt-4 text-sm leading-relaxed"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  Watch live temple darshan. Book authentic pujas with verified priests. Get AI-powered spiritual guidance rooted in ancient wisdom.
                </p>

                <div data-reveal="spring" data-delay="3" className="mt-6 flex items-center gap-3 flex-wrap">
                  <Link
                    href="/temples"
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg text-white transition-all btn-press"
                    style={{ background: 'var(--color-primary)' }}
                  >
                    Explore Temples <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <Link
                    href="/pujas"
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg transition-all"
                    style={{ background: 'var(--color-surface-offset)', color: 'var(--color-text)' }}
                  >
                    Book a Puja
                  </Link>
                </div>

                <div data-reveal="fade" data-delay="4" className="mt-8 flex items-center gap-6 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  <div><span data-counter data-counter-target="200+" className="text-base font-semibold" style={{ color: 'var(--color-text)' }}>200+</span> Temples</div>
                  <div className="w-px h-4" style={{ background: 'var(--color-divider)' }} />
                  <div><span data-counter data-counter-target="50K+" className="text-base font-semibold" style={{ color: 'var(--color-text)' }}>50K+</span> Pujas</div>
                  <div className="w-px h-4" style={{ background: 'var(--color-divider)' }} />
                  <div><span className="text-base font-semibold" style={{ color: 'var(--color-text)' }}>4.9★</span> Rating</div>
                </div>
              </div>

              {/* Right — Bento with parallax float */}
              <div data-reveal="zoom-rotate" data-delay="1" className="hidden md:grid grid-cols-2 gap-2.5">
                <div className="col-span-2 rounded-xl overflow-hidden relative" data-parallax="0.08" style={{ border: '1px solid var(--color-border)' }}>
                  <img src={getTempleHero('kashi-vishwanath')} alt="Kashi Vishwanath" className="w-full h-40 object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> LIVE
                  </div>
                  <div className="absolute bottom-2.5 left-2.5">
                    <p className="text-xs font-medium text-white">Kashi Vishwanath</p>
                    <p className="text-[10px] text-white/60">Morning Aarti • 12.4K watching</p>
                  </div>
                </div>
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
            <p data-reveal="spring" className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: 'var(--color-primary)' }}>Our Story</p>
            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { num: '01', title: 'The Gap', text: 'Millions of Hindus worldwide are disconnected from their spiritual roots and temple traditions.' },
                { num: '02', title: 'The Market', text: 'A $58B religious market is moving online — yet no single platform serves the full devotional journey.' },
                { num: '03', title: 'The Bridge', text: 'Poojly brings live darshan, verified pujas, AI guidance, and sacred commerce into one app.' },
                { num: '04', title: 'The Impact', text: '50K+ pujas performed, 200+ temples connected, and a growing community of devoted users.' },
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
                { number: '1B+', label: 'Hindus worldwide' },
                { number: '30M+', label: 'NRIs disconnected' },
                { number: '900+', label: 'Spiritual startups' },
                { number: '$58B', label: 'Market size' },
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
              <p className="text-xs font-medium uppercase tracking-widest" style={{ color: 'var(--color-primary)' }}>Everything in one app</p>
            </div>
            <h2 data-reveal="spring" className="text-xl sm:text-2xl font-semibold tracking-tight leading-snug mb-5" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
              One platform for your complete spiritual journey
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { title: 'Live Darshan', desc: 'HD streams from 200+ temples', href: '/darshan' },
                { title: 'Verified Pujas', desc: 'Video proof + prasad delivery', href: '/pujas' },
                { title: 'AI Pandit', desc: 'Gita-powered spiritual guidance', href: '/ask-pandit' },
                { title: 'Sacred Content', desc: '5,000+ aartis, mantras, bhajans', href: '/content' },
                { title: 'Astrology', desc: 'Free kundli + daily horoscope', href: '/astrology' },
                { title: 'Wellness', desc: 'Yoga, meditation, vipassana', href: '/wellness' },
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
                <p data-reveal="fade" className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color: 'var(--color-primary)' }}>Live Darshan</p>
                <h2 data-reveal="spring" className="text-xl sm:text-2xl font-semibold tracking-tight" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
                  See the divine, from anywhere
                </h2>
              </div>
              <Link href="/darshan" data-reveal="fade" className="inline-flex items-center gap-1 text-xs font-medium link-underline" style={{ color: 'var(--color-primary)' }}>
                All streams <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div data-reveal="cinematic" className="relative rounded-xl overflow-hidden card-hover" style={{ border: '1px solid var(--color-border)' }}>
              <div className="aspect-[16/7] relative">
                <img src={getTempleHero('kashi-vishwanath')} alt="Kashi Vishwanath Temple Live" data-parallax="0.05" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <span className="flex items-center gap-1.5 bg-red-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> LIVE
                  </span>
                  <span className="flex items-center gap-1 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-full backdrop-blur-sm">
                    <Users className="w-3 h-3" /> 12,450
                  </span>
                </div>
                <div className="absolute bottom-4 left-4 right-4">
                  <h3 className="text-lg sm:text-xl font-semibold text-white">Shri Kashi Vishwanath Temple</h3>
                  <p className="text-xs text-white/70 mt-0.5">Morning Aarti • Varanasi, Uttar Pradesh</p>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-all cursor-pointer">
                    <Play className="w-6 h-6 text-white ml-0.5" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ PUJA BOOKING + ASTROLOGY — side by side ═══════════════════ */}
        <section className="py-10 md:py-12">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-5">
              {/* Puja Booking card */}
              <div data-reveal="spring" className="rounded-xl p-5" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <p className="text-xs font-medium uppercase tracking-widest mb-2" style={{ color: 'var(--color-primary)' }}>Puja Booking</p>
                <h3 className="text-lg font-semibold tracking-tight mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
                  Authentic rituals, verified priests
                </h3>
                <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
                  Book pujas at India&apos;s most revered temples. Every ritual performed by verified pandits with live video proof and sacred prasad delivery.
                </p>
                <div className="grid grid-cols-5 grid-rows-2 gap-2 mb-4" style={{ height: '160px' }}>
                  <div className="col-span-3 row-span-2 rounded-lg overflow-hidden" data-parallax="0.04">
                    <img src={getDeityImage('lord-shiva')} alt="Puja ceremony" className="w-full h-full object-cover" />
                  </div>
                  <div className="col-span-2 rounded-lg overflow-hidden">
                    <img src={getContentImage('aarti', 'thumbnail')} alt="Aarti" className="w-full h-full object-cover" />
                  </div>
                  <div className="col-span-2 rounded-lg p-2.5 flex flex-col justify-center" style={{ background: 'var(--color-art-3)' }}>
                    <p data-counter data-counter-target="50K+" className="text-base font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>50K+</p>
                    <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Pujas with proof</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 mb-4">
                  {[
                    { icon: Shield, label: 'Verified' },
                    { icon: Video, label: 'Video Proof' },
                    { icon: Gift, label: 'Prasad' },
                  ].map((f) => (
                    <div key={f.label} className="flex items-center gap-1.5">
                      <f.icon className="w-3 h-3" style={{ color: 'var(--color-primary)' }} />
                      <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{f.label}</span>
                    </div>
                  ))}
                </div>
                <Link href="/pujas" className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--color-primary)' }}>
                  Browse Pujas <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              {/* Astrology card */}
              <div data-reveal="right" className="rounded-xl p-5" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <p className="text-xs font-medium uppercase tracking-widest mb-2" style={{ color: 'var(--color-primary)' }}>Astrology</p>
                <h3 className="text-lg font-semibold tracking-tight mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
                  Consult India&apos;s top astrologers
                </h3>
                <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
                  Free kundli, daily horoscope for 12 rashis, live consultations starting at ₹15/min with 15+ verified Vedic astrologers.
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
                        <span key={i} className="text-[10px]" style={{ color: 'var(--color-primary)' }}>★</span>
                      ))}
                      <span className="text-[9px] ml-1" style={{ color: 'var(--color-text-muted)' }}>(2.1K)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(184, 115, 51, 0.15)', color: 'var(--color-primary)' }}>Online</span>
                      <p className="text-[10px] font-semibold" style={{ color: 'var(--color-text)' }}>₹25/min</p>
                    </div>
                  </div>
                  {/* Today's horoscope preview */}
                  <div className="col-span-2 rounded-lg p-2.5 flex flex-col justify-center" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                    <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Today • Leo</p>
                    <p className="text-sm font-semibold mt-0.5" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>♌</p>
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
                    { title: 'Free Kundli', badge: 'Free', href: '/astrology/kundli' },
                    { title: 'Daily Horoscope', badge: 'Daily', href: '/astrology/horoscope' },
                    { title: 'Live Consultation', badge: 'From ₹15/min', href: '/astrology' },
                  ].map((card) => (
                    <Link key={card.title} href={card.href} className="group flex items-center justify-between p-2.5 rounded-lg transition-all" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                      <div className="flex items-center gap-2">
                        <Moon className="w-3.5 h-3.5" style={{ color: 'var(--color-primary)' }} />
                        <span className="text-xs font-medium group-hover:underline" style={{ color: 'var(--color-text)' }}>{card.title}</span>
                      </div>
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: 'var(--color-primary-highlight)', color: 'var(--color-primary)' }}>{card.badge}</span>
                    </Link>
                  ))}
                </div>
                <Link href="/astrology" className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--color-primary)' }}>
                  Talk to Astrologer <ArrowRight className="w-3 h-3" />
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
                <p data-reveal="fade" className="text-xs font-medium uppercase tracking-widest mb-2" style={{ color: 'var(--color-primary)' }}>AI Spiritual Guide</p>
                <h2 data-reveal="spring" className="text-xl sm:text-2xl font-semibold tracking-tight mb-3" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
                  Get wisdom from ancient scriptures, instantly
                </h2>
                <p data-reveal="up" data-delay="1" className="text-xs leading-relaxed mb-5" style={{ color: 'var(--color-text-muted)' }}>
                  Ask Pandit Ji anything. Powered by AI with deep knowledge of the Bhagavad Gita, Upanishads, and Vedic traditions.
                </p>
                <div data-reveal="spring" data-delay="2">
                  <Link href="/ask-pandit" className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg text-white btn-press" style={{ background: 'var(--color-primary)' }}>
                    Ask Your Question <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              <div data-reveal="glow" data-delay="1" className="rounded-xl overflow-hidden" style={{ background: 'var(--color-surface-2, #fff)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-md)' }}>
                <div className="px-4 py-2.5 flex items-center gap-2" style={{ borderBottom: '1px solid var(--color-divider)' }}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'var(--color-art-2)' }}>
                    <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--color-primary)' }} />
                  </div>
                  <div>
                    <p className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>Pandit Ji</p>
                    <p className="text-[10px]" style={{ color: 'var(--color-text-faint)' }}>AI Spiritual Guide</p>
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
                      <p className="italic text-[11px] mb-1" style={{ color: 'var(--color-text-muted)' }}>{"\u0915\u0930\u094D\u092E\u0923\u094D\u092F\u0947\u0935\u093E\u0927\u093F\u0915\u093E\u0930\u0938\u094D\u0924\u0947 \u092E\u093E \u092B\u0932\u0947\u0937\u0941 \u0915\u0926\u093E\u091A\u0928"}</p>
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
                <p data-reveal="fade" className="text-xs font-medium uppercase tracking-widest mb-2" style={{ color: 'var(--color-primary)' }}>Bhakti Store</p>
                <h2 data-reveal="spring" className="text-xl sm:text-2xl font-semibold tracking-tight mb-3" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
                  Everything for your daily worship
                </h2>
                <p data-reveal="up" data-delay="1" className="text-xs leading-relaxed mb-5" style={{ color: 'var(--color-text-muted)' }}>
                  Premium brass puja thalis, authentic rudraksha malas, sandalwood incense, marble idols — all delivered to your doorstep. Free shipping on orders above ₹499.
                </p>
                <div data-reveal="up" data-delay="2" className="flex flex-wrap gap-2 mb-5">
                  {['Puja Thali Sets', 'Rudraksha', 'Idols', 'Incense', 'Books'].map((tag) => (
                    <span key={tag} className="text-[11px] px-2.5 py-1 rounded-full" style={{ background: 'var(--color-surface-offset)', color: 'var(--color-text-muted)' }}>{tag}</span>
                  ))}
                </div>
                <div data-reveal="spring" data-delay="3">
                  <Link href="/store" className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg text-white btn-press" style={{ background: 'var(--color-primary)' }}>
                    Shop Essentials <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { name: 'Brass Puja Thali', price: '₹1,299', img: getProductImage('brass-puja-thali') },
                  { name: 'Rudraksha Mala', price: '₹599', img: getProductImage('rudraksha-mala') },
                  { name: 'Sandalwood Incense', price: '₹249', img: getProductImage('incense-sticks') },
                  { name: 'Ganesh Idol', price: '₹2,499', img: getProductImage('brass-ganesha-idol') },
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
                { title: 'Gau Seva', desc: 'Adopt a cow from ₹51/day', href: '/gaushala', icon: Heart },
                { title: 'Panchang', desc: 'Daily tithi & muhurat', href: '/panchang', icon: Calendar },
                { title: 'Content', desc: '5K+ aartis & mantras', href: '/content', icon: Music },
                { title: 'Wellness', desc: 'Yoga & meditation', href: '/wellness', icon: Leaf },
              ].map((item, i) => (
                <Link
                  key={item.title}
                  href={item.href}
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
              Join 50,000+ devotees on Poojly
            </h2>
            <p data-reveal="up" data-delay="1" className="text-xs max-w-sm mx-auto mb-6" style={{ color: 'var(--color-text-muted)' }}>
              Begin your spiritual journey today. Live darshan, authentic pujas, AI guidance — all in one place.
            </p>
            <div data-reveal="spring" data-delay="2" className="flex items-center justify-center gap-3">
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg text-white btn-press"
                style={{ background: 'var(--color-primary)' }}
              >
                Get Started <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/temples"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg transition-all"
                style={{ background: 'var(--color-surface-offset)', color: 'var(--color-text)' }}
              >
                Explore First
              </Link>
            </div>
          </div>
        </section>

      </div>
    </ScrollReveal>
  );
}
