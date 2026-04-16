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
  ShoppingBag,
  Heart,
  Moon,
  ChevronDown,
  Globe,
  Frown,
  Zap,
  CheckCircle,
} from 'lucide-react';
import { getTempleHero, getDeityImage, getContentImage, getProductImage } from '../lib/images';
import ScrollReveal from '../components/ScrollReveal';

export const metadata: Metadata = {
  title: "Bhaktisetu — India's Devotional Super App",
  description: 'Live darshan, puja booking, AI spiritual guidance, and more.',
};

export default function HomePage() {
  return (
    <ScrollReveal>
      <div style={{ background: 'var(--color-bg)' }}>

        {/* ═══ ACT 1: HERO — "The Call" ═══════════════════════════════════ */}
        <section className="min-h-[80vh] flex flex-col justify-center relative">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-16">
            <div className="max-w-2xl">
              {/* Eyebrow badge */}
              <div
                data-reveal="fade"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-8"
                style={{ background: 'var(--color-art-2)', color: 'var(--color-text)' }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                12,450+ devotees watching live darshan
              </div>

              <h1
                data-reveal="up"
                className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.08]"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
              >
                Your bridge to{' '}
                <span style={{ color: 'var(--color-primary)' }}>sacred traditions</span>
              </h1>

              <p
                data-reveal="up"
                data-delay="1"
                className="mt-6 text-lg leading-relaxed max-w-lg"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Watch live temple darshan. Book authentic pujas with verified priests. Get AI-powered spiritual guidance rooted in ancient wisdom.
              </p>

              {/* CTAs */}
              <div data-reveal="up" data-delay="2" className="mt-10 flex items-center gap-3 flex-wrap">
                <Link
                  href="/temples"
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium rounded-lg text-white transition-all btn-press"
                  style={{ background: 'var(--color-primary)' }}
                >
                  Explore Temples <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/pujas"
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium rounded-lg transition-all"
                  style={{ background: 'var(--color-surface-offset)', color: 'var(--color-text)' }}
                >
                  Book a Puja
                </Link>
              </div>

              {/* Stats */}
              <div data-reveal="fade" data-delay="3" className="mt-14 flex items-center gap-8 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                <div><span className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>200+</span> Temples</div>
                <div className="w-px h-5" style={{ background: 'var(--color-divider)' }} />
                <div><span className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>50K+</span> Pujas</div>
                <div className="w-px h-5" style={{ background: 'var(--color-divider)' }} />
                <div><span className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>4.9★</span> Rating</div>
              </div>
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 scroll-indicator">
            <ChevronDown className="w-5 h-5" style={{ color: 'var(--color-text-faint)' }} />
          </div>
        </section>

        {/* ═══ THE STORY — Problem → Scale → Solution → Impact ═════════════ */}

        {/* --- Chapter 1: The Problem --- */}
        <section className="py-14 md:py-20" style={{ background: 'var(--color-surface)' }}>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div data-reveal="up" className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--color-art-2)' }}>
                <Frown className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
              </div>
              <p className="text-xs font-medium uppercase tracking-widest" style={{ color: 'var(--color-primary)' }}>The Problem</p>
            </div>
            <h2 data-reveal="up" data-delay="1" className="text-2xl sm:text-3xl font-semibold tracking-tight leading-snug mb-6" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
              Millions of devotees are disconnected from their spiritual roots
            </h2>
            <div className="space-y-4">
              {[
                'NRI families living abroad can\'t attend temple aartis or book pujas back home',
                'No way to verify if a pandit actually performed the ritual you paid for',
                'Spiritual content is scattered across dozens of apps with no unified experience',
                'Young devotees want guidance but don\'t know where to turn for authentic wisdom',
              ].map((point, i) => (
                <div key={i} data-reveal="left" data-delay={String(i + 1)} className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full mt-2 shrink-0" style={{ background: 'var(--color-primary)' }} />
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>{point}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* --- Chapter 2: The Scale --- */}
        <section className="py-14 md:py-20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div data-reveal="fade" className="inline-flex items-center gap-2 mb-6">
              <Globe className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
              <p className="text-xs font-medium uppercase tracking-widest" style={{ color: 'var(--color-primary)' }}>The Scale</p>
            </div>
            <h2 data-reveal="up" className="text-2xl sm:text-3xl font-semibold tracking-tight mb-12" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
              This isn't a niche problem. It's a $58 billion market.
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { number: '1B+', label: 'Hindus worldwide seeking spiritual connection' },
                { number: '30M+', label: 'NRIs disconnected from temples back home' },
                { number: '900+', label: 'Spiritual tech startups — but no super-app' },
                { number: '$58B', label: 'Indian religious market, growing 28% yearly' },
              ].map((stat, i) => (
                <div key={stat.number} data-reveal="up" data-delay={String(i + 1)} className="p-4 rounded-xl" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                  <p className="text-xl font-semibold mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-primary)' }}>{stat.number}</p>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* --- Chapter 3: The Solution --- */}
        <section className="py-14 md:py-20" style={{ background: 'var(--color-surface)' }}>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div data-reveal="up" className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--color-art-1)' }}>
                <Zap className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
              </div>
              <p className="text-xs font-medium uppercase tracking-widest" style={{ color: 'var(--color-primary)' }}>Our Solution</p>
            </div>
            <h2 data-reveal="up" data-delay="1" className="text-2xl sm:text-3xl font-semibold tracking-tight leading-snug mb-8" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
              One app that bridges devotees to the divine — through technology
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { title: 'Live Darshan', desc: 'HD streams from 200+ temples — watch morning aarti from anywhere in the world', href: '/darshan' },
                { title: 'Verified Pujas', desc: 'Book rituals with Aadhaar-verified priests. Get video proof of every puja.', href: '/pujas' },
                { title: 'AI Spiritual Guide', desc: 'Ask questions rooted in Bhagavad Gita, Upanishads — get instant wisdom', href: '/ask-pandit' },
                { title: 'Sacred Content', desc: '5,000+ aartis, mantras, chalisas — your daily spiritual practice companion', href: '/content' },
                { title: 'Cow Adoption', desc: 'Adopt a cow at a verified gaushala. Get monthly photo updates.', href: '/gaushala' },
                { title: 'Astrology', desc: 'Free kundli, daily horoscope, live consultations with verified astrologers', href: '/astrology' },
              ].map((item, i) => (
                <Link
                  key={item.title}
                  href={item.href}
                  data-reveal="up"
                  data-delay={String((i % 2) + 1)}
                  className="group flex gap-3 p-4 rounded-xl transition-all card-hover"
                  style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
                >
                  <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'var(--color-primary)' }} />
                  <div>
                    <h3 className="text-sm font-medium mb-1 group-hover:underline" style={{ color: 'var(--color-text)' }}>{item.title}</h3>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>{item.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* --- Chapter 4: The Impact --- */}
        <section className="py-14 md:py-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div data-reveal="fade" className="inline-flex items-center gap-2 mb-6">
              <Heart className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
              <p className="text-xs font-medium uppercase tracking-widest" style={{ color: 'var(--color-primary)' }}>The Impact</p>
            </div>
            <h2 data-reveal="up" className="text-2xl sm:text-3xl font-semibold tracking-tight mb-4" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
              We're not just building an app. We're preserving traditions.
            </h2>
            <p data-reveal="up" data-delay="1" className="text-base max-w-xl mx-auto mb-10" style={{ color: 'var(--color-text-muted)' }}>
              Every puja booked supports temple priests. Every darshan stream keeps traditions alive. Every cow adopted saves a life.
            </p>
            <div className="grid grid-cols-3 gap-6">
              {[
                { number: '50K+', label: 'Pujas performed with video proof' },
                { number: '₹2Cr+', label: 'Donated to temples & gaushalas' },
                { number: '12K+', label: 'Daily active devotees' },
              ].map((stat, i) => (
                <div key={stat.number} data-reveal="scale" data-delay={String(i + 1)}>
                  <p className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>{stat.number}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ ACT 2: LIVE DARSHAN — "See the Divine" ══════════════════════ */}
        <section className="py-14 md:py-20" style={{ background: 'var(--color-surface)' }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <p data-reveal="fade" className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: 'var(--color-primary)' }}>Live Darshan</p>
            <h2 data-reveal="up" className="text-2xl sm:text-3xl font-semibold tracking-tight mb-4" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
              See the divine, from anywhere
            </h2>
            <p data-reveal="up" data-delay="1" className="text-base max-w-xl mb-10" style={{ color: 'var(--color-text-muted)' }}>
              Watch live ceremonies from India's most sacred temples. HD streams with real-time audio, available 24/7.
            </p>

            {/* One large featured card */}
            <div data-reveal="scale" className="relative rounded-2xl overflow-hidden card-hover" style={{ border: '1px solid var(--color-border)' }}>
              <div className="aspect-[16/7] relative">
                <img src={getTempleHero('kashi-vishwanath')} alt="Kashi Vishwanath Temple Live" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                <div className="absolute top-4 left-4 flex items-center gap-2">
                  <span className="flex items-center gap-1.5 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                    <span className="w-2 h-2 bg-white rounded-full animate-pulse" /> LIVE
                  </span>
                  <span className="flex items-center gap-1 bg-black/50 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">
                    <Users className="w-3 h-3" /> 12,450
                  </span>
                </div>
                <div className="absolute bottom-6 left-6 right-6">
                  <h3 className="text-xl sm:text-2xl font-semibold text-white">Shri Kashi Vishwanath Temple</h3>
                  <p className="text-sm text-white/70 mt-1">Morning Aarti • Varanasi, Uttar Pradesh</p>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-all cursor-pointer">
                    <Play className="w-7 h-7 text-white ml-1" />
                  </div>
                </div>
              </div>
            </div>

            <div data-reveal="fade" data-delay="1" className="mt-6 text-right">
              <Link href="/darshan" className="inline-flex items-center gap-1.5 text-sm font-medium link-underline" style={{ color: 'var(--color-primary)' }}>
                Watch all live streams <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* ═══ ACT 3: PUJA BOOKING — "Book Your Ritual" ════════════════════ */}
        <section className="py-14 md:py-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              {/* Image */}
              <div data-reveal="scale" className="rounded-2xl overflow-hidden">
                <img src={getDeityImage('lord-shiva')} alt="Puja ceremony" className="w-full h-80 object-cover rounded-2xl" />
              </div>
              {/* Copy */}
              <div>
                <p data-reveal="fade" className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: 'var(--color-primary)' }}>Puja Booking</p>
                <h2 data-reveal="up" className="text-2xl sm:text-3xl font-semibold tracking-tight mb-4" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
                  Authentic rituals, verified priests
                </h2>
                <p data-reveal="up" data-delay="1" className="text-base mb-8" style={{ color: 'var(--color-text-muted)' }}>
                  Book pujas at India's most revered temples. Every ritual performed by verified pandits with live video proof.
                </p>

                {/* 3 features */}
                <div className="space-y-4">
                  {[
                    { icon: Shield, text: 'Verified priests with Aadhaar authentication' },
                    { icon: Video, text: 'Live video proof of every puja performed' },
                    { icon: Gift, text: 'Sacred prasad delivered to your doorstep' },
                  ].map((f, i) => (
                    <div key={f.text} data-reveal="left" data-delay={String(i + 1)} className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--color-primary-highlight)' }}>
                        <f.icon className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
                      </div>
                      <span className="text-sm" style={{ color: 'var(--color-text)' }}>{f.text}</span>
                    </div>
                  ))}
                </div>

                <div data-reveal="up" data-delay="4" className="mt-8">
                  <Link href="/pujas" className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg text-white btn-press" style={{ background: 'var(--color-primary)' }}>
                    Browse Pujas <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ ACT 4: AI PANDIT — "Ask the Wise" ═══════════════════════════ */}
        <section className="py-14 md:py-20" style={{ background: 'var(--color-surface)' }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p data-reveal="fade" className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: 'var(--color-primary)' }}>AI Spiritual Guide</p>
            <h2 data-reveal="up" className="text-2xl sm:text-3xl font-semibold tracking-tight mb-4 max-w-xl mx-auto" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
              Get wisdom from ancient scriptures, instantly
            </h2>
            <p data-reveal="up" data-delay="1" className="text-base max-w-lg mx-auto mb-12" style={{ color: 'var(--color-text-muted)' }}>
              Ask Pandit Ji anything. Powered by AI with deep knowledge of the Bhagavad Gita, Upanishads, and Vedic traditions.
            </p>

            {/* Chat mockup */}
            <div data-reveal="up" data-delay="2" className="max-w-lg mx-auto rounded-2xl overflow-hidden" style={{ background: 'var(--color-surface-2, #fff)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-lg)' }}>
              <div className="px-5 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid var(--color-divider)' }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--color-art-2)' }}>
                  <Sparkles className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Pandit Ji</p>
                  <p className="text-xs" style={{ color: 'var(--color-text-faint)' }}>AI Spiritual Guide</p>
                </div>
              </div>
              <div className="p-5 space-y-4 text-left">
                {/* User message */}
                <div className="flex justify-end">
                  <div className="px-4 py-2.5 rounded-2xl rounded-br-md text-sm max-w-[80%]" style={{ background: 'var(--color-primary)', color: '#fff' }}>
                    What does the Gita say about duty?
                  </div>
                </div>
                {/* Bot response */}
                <div className="flex justify-start">
                  <div className="px-4 py-2.5 rounded-2xl rounded-bl-md text-sm max-w-[85%]" style={{ background: 'var(--color-surface-offset)', color: 'var(--color-text)' }}>
                    <p className="mb-2">The Bhagavad Gita teaches us in Chapter 2, Verse 47:</p>
                    <p className="italic text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>{"\u0915\u0930\u094D\u092E\u0923\u094D\u092F\u0947\u0935\u093E\u0927\u093F\u0915\u093E\u0930\u0938\u094D\u0924\u0947 \u092E\u093E \u092B\u0932\u0947\u0937\u0941 \u0915\u0926\u093E\u091A\u0928"}</p>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{'"You have the right to perform your duty, but not to the fruits of your actions."'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div data-reveal="fade" data-delay="3" className="mt-8">
              <Link href="/ask-pandit" className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg text-white btn-press" style={{ background: 'var(--color-primary)' }}>
                Ask Your Question <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* ═══ ACT 5: CONTENT — "Listen & Learn" ═══════════════════════════ */}
        <section className="py-14 md:py-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <p data-reveal="fade" className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: 'var(--color-primary)' }}>Spiritual Content</p>
            <h2 data-reveal="up" className="text-2xl sm:text-3xl font-semibold tracking-tight mb-10" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
              5,000+ aartis, mantras & bhajans
            </h2>

            <div className="grid sm:grid-cols-3 gap-5">
              {[
                { type: 'Aarti', title: 'Om Jai Jagdish Hare', deity: 'Lord Vishnu', img: getContentImage('aarti', 'thumbnail'), icon: Music },
                { type: 'Mantra', title: 'Gayatri Mantra (108×)', deity: 'Goddess Gayatri', img: getContentImage('mantra', 'thumbnail'), icon: Moon },
                { type: 'Chalisa', title: 'Hanuman Chalisa', deity: 'Lord Hanuman', img: getContentImage('chalisa', 'thumbnail'), icon: Music },
              ].map((item, i) => (
                <div key={item.title} data-reveal="up" data-delay={String(i + 1)} className="rounded-xl overflow-hidden card-hover" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                  <div className="relative aspect-[4/3]">
                    <img src={item.img} alt={item.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                    <div className="absolute bottom-3 left-3">
                      <span className="text-xs font-medium text-white/90 px-2 py-0.5 rounded" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>{item.type}</span>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <Play className="w-5 h-5 text-white ml-0.5" />
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{item.title}</h3>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{item.deity}</p>
                  </div>
                </div>
              ))}
            </div>

            <div data-reveal="fade" data-delay="4" className="mt-8 text-center">
              <Link href="/content" className="inline-flex items-center gap-1.5 text-sm font-medium link-underline" style={{ color: 'var(--color-primary)' }}>
                Explore full library <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* ═══ STORE — "Sacred Essentials" (image right, copy left) ═════════ */}
        <section className="py-14 md:py-20" style={{ background: 'var(--color-surface)' }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-10 items-center">
              <div>
                <p data-reveal="fade" className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: 'var(--color-primary)' }}>Bhakti Store</p>
                <h2 data-reveal="up" className="text-2xl sm:text-3xl font-semibold tracking-tight mb-4" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
                  Everything for your daily worship
                </h2>
                <p data-reveal="up" data-delay="1" className="text-sm mb-6 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                  Premium brass puja thalis, authentic rudraksha malas, sandalwood incense, marble idols — all delivered to your doorstep. Free shipping on orders above ₹499.
                </p>
                <div data-reveal="up" data-delay="2" className="flex flex-wrap gap-2 mb-6">
                  {['Puja Thali Sets', 'Rudraksha', 'Idols', 'Incense', 'Books'].map((tag) => (
                    <span key={tag} className="text-xs px-3 py-1 rounded-full" style={{ background: 'var(--color-surface-offset)', color: 'var(--color-text-muted)' }}>{tag}</span>
                  ))}
                </div>
                <div data-reveal="up" data-delay="3">
                  <Link href="/store" className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg text-white btn-press" style={{ background: 'var(--color-primary)' }}>
                    Shop Essentials <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
              <div data-reveal="scale" className="grid grid-cols-2 gap-3">
                {[
                  { name: 'Brass Puja Thali', price: '₹1,299', img: getProductImage('brass-puja-thali') },
                  { name: 'Rudraksha Mala', price: '₹599', img: getProductImage('rudraksha-mala') },
                  { name: 'Sandalwood Incense', price: '₹249', img: getProductImage('incense-sticks') },
                  { name: 'Ganesh Idol', price: '₹2,499', img: getProductImage('brass-ganesha-idol') },
                ].map((p, i) => (
                  <div key={p.name} data-reveal="up" data-delay={String(i + 1)} className="rounded-xl overflow-hidden" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                    <div className="aspect-square" style={{ background: 'var(--color-surface-offset)' }}>
                      <img src={p.img} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                    <div className="p-3">
                      <p className="text-xs font-medium truncate" style={{ color: 'var(--color-text)' }}>{p.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-primary)' }}>{p.price}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═══ ASTROLOGY — "Know Your Stars" (centered, horizontal cards) ══ */}
        <section className="py-14 md:py-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p data-reveal="fade" className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: 'var(--color-primary)' }}>Astrology</p>
            <h2 data-reveal="up" className="text-2xl sm:text-3xl font-semibold tracking-tight mb-4" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
              Consult India's top astrologers
            </h2>
            <p data-reveal="up" data-delay="1" className="text-sm max-w-lg mx-auto mb-10" style={{ color: 'var(--color-text-muted)' }}>
              Free kundli generation, daily horoscope for all 12 rashis, and live consultations with 15+ verified Vedic astrologers starting at ₹15/min.
            </p>

            <div className="grid sm:grid-cols-3 gap-4 mb-8">
              {[
                { title: 'Free Kundli', desc: 'Generate your birth chart instantly with planetary positions', href: '/astrology/kundli' },
                { title: 'Daily Horoscope', desc: 'Personalized predictions for all 12 rashis updated daily', href: '/astrology/horoscope' },
                { title: 'Live Consultation', desc: 'Chat with verified astrologers — first 5 minutes free', href: '/astrology' },
              ].map((card, i) => (
                <Link key={card.title} href={card.href} data-reveal="up" data-delay={String(i + 1)} className="group text-left p-5 rounded-xl card-hover transition-all" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                  <h3 className="text-sm font-medium mb-2 group-hover:underline" style={{ color: 'var(--color-text)' }}>{card.title}</h3>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>{card.desc}</p>
                  <span className="inline-flex items-center gap-1 text-xs font-medium mt-3 group-hover:gap-2 transition-all" style={{ color: 'var(--color-primary)' }}>
                    Try now <ArrowRight className="w-3 h-3" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ GAUSHALA + PANCHANG — Compact duo (side by side) ════════════ */}
        <section className="py-14 md:py-20" style={{ background: 'var(--color-surface)' }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Gaushala */}
              <Link href="/gaushala" data-reveal="up" data-delay="1" className="group p-6 rounded-xl card-hover transition-all" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-art-1)' }}>
                    <Heart className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
                  </div>
                  <div>
                    <h3 className="text-base font-medium" style={{ color: 'var(--color-text)' }}>Gau Seva</h3>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Cow Adoption Program</p>
                  </div>
                </div>
                <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--color-text-muted)' }}>
                  Adopt a cow at a verified gaushala from ₹51/day. Get monthly photo updates, visit anytime. 12 cows across 3 gaushalas waiting for your care.
                </p>
                <span className="text-xs font-medium flex items-center gap-1 group-hover:gap-2 transition-all" style={{ color: 'var(--color-primary)' }}>
                  Adopt a cow <ArrowRight className="w-3 h-3" />
                </span>
              </Link>

              {/* Panchang */}
              <Link href="/panchang" data-reveal="up" data-delay="2" className="group p-6 rounded-xl card-hover transition-all" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-art-3)' }}>
                    <Calendar className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
                  </div>
                  <div>
                    <h3 className="text-base font-medium" style={{ color: 'var(--color-text)' }}>Daily Panchang</h3>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Hindu Calendar & Timings</p>
                  </div>
                </div>
                <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--color-text-muted)' }}>
                  Today's tithi, nakshatra, shubh muhurat, rahu kaal, and upcoming festivals. Navigate by date. Never miss an auspicious moment.
                </p>
                <span className="text-xs font-medium flex items-center gap-1 group-hover:gap-2 transition-all" style={{ color: 'var(--color-primary)' }}>
                  Check today's panchang <ArrowRight className="w-3 h-3" />
                </span>
              </Link>
            </div>
          </div>
        </section>

        {/* ═══ ACT 7: FINAL CTA — "Begin Your Journey" ════════════════════ */}
        <section className="py-14 md:py-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 data-reveal="up" className="text-2xl sm:text-3xl font-semibold tracking-tight mb-4" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
              Join 50,000+ devotees on Bhaktisetu
            </h2>
            <p data-reveal="up" data-delay="1" className="text-base max-w-md mx-auto mb-10" style={{ color: 'var(--color-text-muted)' }}>
              Begin your spiritual journey today. Live darshan, authentic pujas, AI guidance — all in one place.
            </p>
            <div data-reveal="up" data-delay="2" className="flex items-center justify-center gap-3">
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium rounded-lg text-white btn-press"
                style={{ background: 'var(--color-primary)' }}
              >
                Get Started <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/temples"
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium rounded-lg transition-all"
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
