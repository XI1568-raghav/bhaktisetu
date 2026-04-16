import type { Metadata } from 'next';
import { Suspense } from 'react';
import {
  Star,
  Clock,
  Users,
  ArrowRight,
  Play,
  Heart,
  Moon,
  Sunrise,
  Sunset,
  ChevronRight,
  MapPin,
  Sparkles,
  MessageCircle,
  Bot,
} from 'lucide-react';
import {
  getLiveDarshan,
  getTodayPanchang,
  getPujaTypes,
  getContent,
  type DarshanStream,
  type Panchang,
  type PujaType,
  type ContentItem,
} from '../lib/api';
import { getTempleHero, getDeityImage, getContentImage, getProductImage } from '../lib/images';
import ForYouSection from '../components/ForYouSection';

export const metadata: Metadata = {
  title: "Bhaktisetu \u2014 India\u2019s Devotional Super App",
  description:
    'Experience live darshan, book pujas, explore panchang, listen to bhajans, and shop for sacred items. Your complete spiritual companion.',
};

// ─── Static fallback data ─────────────────────────────────────────────────────

const fallbackLiveDarshan = [
  {
    name: 'Shri Kashi Vishwanath',
    city: 'Varanasi',
    viewers: 12450,
    isLive: true,
    deity: 'Lord Shiva',
    slug: 'kashi-vishwanath',
    id: 'fallback-1',
  },
  {
    name: 'Tirupati Balaji',
    city: 'Tirumala',
    viewers: 28300,
    isLive: true,
    deity: 'Lord Venkateswara',
    slug: 'tirupati',
    id: 'fallback-2',
  },
  {
    name: 'Siddhivinayak Temple',
    city: 'Mumbai',
    viewers: 8760,
    isLive: true,
    deity: 'Lord Ganesha',
    slug: 'siddhivinayak',
    id: 'fallback-3',
  },
  {
    name: 'Jagannath Temple',
    city: 'Puri',
    viewers: 6120,
    isLive: false,
    deity: 'Lord Jagannath',
    slug: 'jagannath-puri',
    nextStream: '5:30 AM',
    id: 'fallback-4',
  },
];

const fallbackPanchang = {
  tithi: 'Trayodashi',
  tithiPaksha: 'Shukla Paksha',
  nakshatra: 'Hasta',
  nakshatraUntil: 'Until 3:42 PM',
  sunrise: '6:02 AM',
  sunset: '6:48 PM',
  shubhMuhurat: [
    { name: 'Abhijit', start: '11:54 AM', end: '12:45 PM' },
    { name: 'Amrit Kaal', start: '2:18 PM', end: '3:52 PM' },
  ],
  rahuKaal: '3:18 PM - 4:48 PM',
  vrat: 'Pradosh Vrat',
};

const fallbackPujas = [
  {
    name: 'Rudrabhishek Puja',
    temple: 'Kashi Vishwanath, Varanasi',
    price: 1100,
    rating: 4.9,
    reviews: 2340,
    tag: 'Most Popular',
    deity: 'Lord Shiva',
    slug: 'rudrabhishek',
  },
  {
    name: 'Satyanarayan Katha',
    temple: 'ISKCON, Delhi',
    price: 751,
    rating: 4.8,
    reviews: 1820,
    tag: 'Recommended',
    deity: 'Lord Vishnu',
    slug: 'satyanarayan-katha',
  },
  {
    name: 'Ganesh Atharvashirsha',
    temple: 'Siddhivinayak, Mumbai',
    price: 501,
    rating: 4.9,
    reviews: 3100,
    tag: 'Trending',
    deity: 'Lord Ganesha',
    slug: 'ganesh-atharvashirsha',
  },
  {
    name: 'Lakshmi Puja',
    temple: 'Mahalakshmi Temple, Kolhapur',
    price: 851,
    rating: 4.7,
    reviews: 1560,
    tag: 'For Prosperity',
    deity: 'Goddess Lakshmi',
    slug: 'lakshmi-puja',
  },
  {
    name: 'Hanuman Chalisa Path',
    temple: 'Sankat Mochan, Varanasi',
    price: 351,
    rating: 4.8,
    reviews: 4200,
    tag: 'Tuesday Special',
    deity: 'Lord Hanuman',
    slug: 'hanuman-chalisa-path',
  },
  {
    name: 'Navgraha Shanti Puja',
    temple: 'Navagraha Temple, Assam',
    price: 2100,
    rating: 4.6,
    reviews: 980,
    tag: 'Astrology',
    deity: 'Navagraha',
    slug: 'navgraha-shanti',
  },
];

const fallbackTrending = [
  {
    title: 'Hanuman Chalisa',
    deity: 'Lord Hanuman',
    type: 'Chalisa',
    plays: '12.5M',
    duration: '9:42',
    slug: 'hanuman-chalisa',
  },
  {
    title: 'Om Jai Jagdish Hare',
    deity: 'Lord Vishnu',
    type: 'Aarti',
    plays: '8.3M',
    duration: '6:18',
    slug: 'om-jai-jagdish-hare',
  },
  {
    title: 'Gayatri Mantra - 108 times',
    deity: 'Goddess Gayatri',
    type: 'Mantra',
    plays: '6.1M',
    duration: '45:00',
    slug: 'gayatri-mantra-108',
  },
  {
    title: 'Shiv Tandav Stotram',
    deity: 'Lord Shiva',
    type: 'Stotram',
    plays: '5.8M',
    duration: '11:30',
    slug: 'shiv-tandav-stotram',
  },
];

const storeHighlights = [
  {
    name: 'Brass Puja Thali Set',
    price: 1299,
    originalPrice: 1899,
    rating: 4.7,
  },
  {
    name: 'Natural Rudraksha Mala',
    price: 599,
    originalPrice: 999,
    rating: 4.8,
  },
  {
    name: 'Sandalwood Incense (100 sticks)',
    price: 249,
    originalPrice: 399,
    rating: 4.6,
  },
  {
    name: 'Marble Ganesh Idol',
    price: 2499,
    originalPrice: 3499,
    rating: 4.9,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString('en-IN');
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ─── Content type badge colors ───────────────────────────────────────────────

function typeBadgeClasses(type: string): string {
  switch (type.toLowerCase()) {
    case 'aarti':
      return 'bg-saffron-100 text-saffron-700';
    case 'chalisa':
      return 'bg-amber-100 text-amber-700';
    case 'mantra':
      return 'bg-purple-100 text-purple-700';
    case 'stotram':
      return 'bg-blue-100 text-blue-700';
    case 'bhajan':
      return 'bg-pink-100 text-pink-700';
    default:
      return 'bg-surface-100 text-surface-600';
  }
}

// ─── Async data-fetching sections ─────────────────────────────────────────────

async function LiveDarshanSection() {
  let temples: {
    name: string;
    city: string;
    viewers: number;
    isLive: boolean;
    deity: string;
    slug: string;
    id: string;
    nextStream?: string;
  }[];

  try {
    const res = await getLiveDarshan();
    temples = res.streams.slice(0, 4).map((s) => ({
      name: s.temple.name,
      city: s.temple.city,
      viewers: s.viewerCount,
      isLive: s.status === 'live',
      deity: s.temple.deityPrimary,
      slug: s.temple.slug,
      id: s.id,
    }));
    if (temples.length === 0) temples = fallbackLiveDarshan;
  } catch {
    temples = fallbackLiveDarshan;
  }

  return (
    <section className="py-14 md:py-20" style={{ background: 'var(--color-surface)' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
              Live Darshan
            </h2>
            <p className="mt-2" style={{ color: 'var(--color-text-muted)' }}>
              Watch sacred temple ceremonies in real time
            </p>
          </div>
          <a
            href="/darshan"
            className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold transition-colors link-underline"
            style={{ color: 'var(--color-primary)' }}
          >
            All Live Temples &rarr;
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {temples.map((temple, idx) => (
            <a
              key={temple.id}
              href={`/darshan/${temple.id}`}
              data-reveal="up"
              className={`group rounded-xl overflow-hidden card-hover${idx === 0 ? ' sm:col-span-2' : ''}`}
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            >
              {/* Temple image */}
              <div className={`relative ${idx === 0 ? 'aspect-[2/1]' : 'aspect-video'} bg-gradient-to-br from-saffron-200 to-saffron-100`}>
                <img
                  src={getTempleHero(temple.slug)}
                  alt={`${temple.name} - Live Darshan`}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/15" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-xl bg-white/80 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                    <Play className="w-5 h-5 text-saffron-600 ml-0.5" />
                  </div>
                </div>
                {temple.isLive ? (
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-red-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    LIVE
                  </div>
                ) : (
                  <div className="absolute top-3 left-3 flex items-center gap-1 bg-surface-800/70 text-white text-[11px] font-medium px-2.5 py-1 rounded-full backdrop-blur-sm">
                    <Clock className="w-3 h-3" />
                    Next: {temple.nextStream ?? 'Soon'}
                  </div>
                )}
                {temple.isLive && (
                  <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-black/50 text-white text-[11px] font-medium px-2 py-1 rounded-lg backdrop-blur-sm">
                    <Users className="w-3 h-3" />
                    {temple.viewers.toLocaleString('en-IN')}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-4">
                <h3 className="font-semibold transition-colors" style={{ color: 'var(--color-text)' }}>
                  {temple.name}
                </h3>
                <p className="text-sm flex items-center gap-1 mt-1" style={{ color: 'var(--color-text-muted)' }}>
                  <MapPin className="w-3.5 h-3.5" />
                  {temple.city} &middot; {temple.deity}
                </p>
              </div>
            </a>
          ))}
        </div>

        <div className="mt-8 text-center sm:hidden">
          <a
            href="/darshan"
            className="inline-flex items-center gap-1 font-semibold text-sm"
            style={{ color: 'var(--color-primary)' }}
          >
            All Live Temples &rarr;
          </a>
        </div>
      </div>
    </section>
  );
}

async function PanchangSection() {
  let panchangData: typeof fallbackPanchang;

  try {
    const panchang = await getTodayPanchang();
    panchangData = {
      tithi: panchang.tithi.includes(' ')
        ? panchang.tithi.split(' ').pop()!
        : panchang.tithi,
      tithiPaksha: panchang.tithi.includes('Shukla')
        ? 'Shukla Paksha'
        : panchang.tithi.includes('Krishna')
          ? 'Krishna Paksha'
          : '',
      nakshatra: panchang.nakshatra,
      nakshatraUntil: '',
      sunrise: panchang.sunrise,
      sunset: panchang.sunset,
      shubhMuhurat: panchang.shubhMuhurat.slice(0, 2),
      rahuKaal: panchang.rahuKaal,
      vrat: panchang.vrat.length > 0 ? panchang.vrat[0]! : '',
    };
  } catch {
    panchangData = fallbackPanchang;
  }

  const today = new Date();
  const dayNames = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];
  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  const formattedDate = `${dayNames[today.getDay()]}, ${monthNames[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`;

  return (
    <section className="py-14 md:py-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
              Today&rsquo;s Panchang
            </h2>
            <p className="mt-2" style={{ color: 'var(--color-text-muted)' }}>
              {formattedDate}
              {panchangData.tithiPaksha
                ? ` \u00b7 ${panchangData.tithiPaksha} ${panchangData.tithi}`
                : ` \u00b7 ${panchangData.tithi}`}
            </p>
          </div>
          <a
            href="/panchang"
            className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold transition-colors link-underline"
            style={{ color: 'var(--color-primary)' }}
          >
            Full Details <ArrowRight className="w-4 h-4" />
          </a>
        </div>

        {/* Bento grid: 4 cards top row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Sunrise */}
          <div data-reveal="up" className="rounded-xl p-6 card-hover" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center mb-3">
              <Sunrise className="w-5 h-5 text-amber-500" />
            </div>
            <div className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>Sunrise</div>
            <div className="text-xl font-semibold mt-0.5" style={{ color: 'var(--color-text)' }}>
              {panchangData.sunrise}
            </div>
          </div>

          {/* Sunset */}
          <div data-reveal="up" className="rounded-xl p-6 card-hover" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center mb-3">
              <Sunset className="w-5 h-5 text-orange-500" />
            </div>
            <div className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>Sunset</div>
            <div className="text-xl font-semibold mt-0.5" style={{ color: 'var(--color-text)' }}>
              {panchangData.sunset}
            </div>
          </div>

          {/* Tithi */}
          <div data-reveal="up" className="rounded-xl p-6 card-hover" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <div className="w-10 h-10 bg-saffron-50 rounded-xl flex items-center justify-center mb-3">
              <Moon className="w-5 h-5 text-saffron-500" />
            </div>
            <div className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>Tithi</div>
            <div className="text-lg font-semibold mt-0.5" style={{ color: 'var(--color-text)' }}>
              {panchangData.tithi}
            </div>
            {panchangData.tithiPaksha && (
              <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-faint)' }}>
                {panchangData.tithiPaksha}
              </div>
            )}
          </div>

          {/* Nakshatra */}
          <div data-reveal="up" className="rounded-xl p-6 card-hover" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center mb-3">
              <Star className="w-5 h-5 text-purple-500" />
            </div>
            <div className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>Nakshatra</div>
            <div className="text-lg font-semibold mt-0.5" style={{ color: 'var(--color-text)' }}>
              {panchangData.nakshatra}
            </div>
            {panchangData.nakshatraUntil && (
              <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-faint)' }}>
                {panchangData.nakshatraUntil}
              </div>
            )}
          </div>
        </div>

        {/* Auspicious timings row */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div data-reveal="up" className="bg-tulsi-green/5 border border-tulsi-green/15 rounded-xl p-6 card-hover">
            <h4 className="text-sm font-semibold text-tulsi-green mb-3">
              Shubh Muhurat
            </h4>
            <div className="space-y-2 text-sm" style={{ color: 'var(--color-text)' }}>
              {panchangData.shubhMuhurat.map((m) => (
                <div key={m.name} className="flex justify-between">
                  <span>{m.name}</span>
                  <span className="font-medium">
                    {m.start} - {m.end}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div data-reveal="up" className="bg-sacred-red/5 border border-sacred-red/15 rounded-xl p-6 card-hover">
            <h4 className="text-sm font-semibold text-sacred-red mb-3">
              Rahu Kaal
            </h4>
            <div className="text-sm" style={{ color: 'var(--color-text)' }}>
              <div className="flex justify-between">
                <span>Avoid new beginnings</span>
                <span className="font-medium">{panchangData.rahuKaal}</span>
              </div>
            </div>
          </div>
          <div data-reveal="up" className="bg-ganga-blue/5 border border-ganga-blue/15 rounded-xl p-6 card-hover">
            <h4 className="text-sm font-semibold text-ganga-blue mb-3">
              Today&rsquo;s Vrat / Festival
            </h4>
            <div className="text-sm" style={{ color: 'var(--color-text)' }}>
              {panchangData.vrat ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: 'var(--color-primary-highlight)', color: 'var(--color-primary)' }}>
                  {panchangData.vrat}
                </span>
              ) : (
                <span style={{ color: 'var(--color-text-faint)' }}>No special observance</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

async function FeaturedPujasSection() {
  let pujas: typeof fallbackPujas;

  try {
    const res = await getPujaTypes();
    pujas = res.data.slice(0, 6).map((p, i) => ({
      name: p.name,
      temple: p.deity,
      price: parseFloat(p.basePrice),
      rating: 4.7 + (i % 3) * 0.1,
      reviews: 1000 + i * 300,
      tag:
        i === 0
          ? 'Most Popular'
          : i === 1
            ? 'Recommended'
            : i === 2
              ? 'Trending'
              : '',
      deity: p.deity,
      slug: p.slug,
    }));
    if (pujas.length === 0) pujas = fallbackPujas;
  } catch {
    pujas = fallbackPujas;
  }

  return (
    <section className="py-14 md:py-20" style={{ background: 'var(--color-surface)' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
              Featured Pujas
            </h2>
            <p className="mt-2" style={{ color: 'var(--color-text-muted)' }}>
              Book with verified pandits at renowned temples
            </p>
          </div>
          <a
            href="/pujas"
            className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors btn-hover"
            style={{ background: 'var(--color-surface-offset)', color: 'var(--color-text)' }}
          >
            Browse All <ArrowRight className="w-4 h-4" />
          </a>
        </div>

        <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 -mx-6 px-6 lg:grid lg:grid-cols-3 lg:overflow-visible lg:mx-0 lg:px-0 lg:snap-none">
          {pujas.map((puja) => (
            <a
              key={puja.name}
              href={`/pujas/${puja.slug}`}
              data-reveal="up"
              className="group snap-start shrink-0 w-[280px] lg:w-auto rounded-xl overflow-hidden card-hover"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            >
              {/* Deity image */}
              <div className="relative aspect-[16/10] bg-gradient-to-br from-saffron-100 to-amber-50">
                <img
                  src={getDeityImage(puja.deity.toLowerCase().replace(/\s+/g, '-'))}
                  alt={`${puja.deity} - ${puja.name}`}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                {puja.tag && (
                  <div className="absolute top-3 left-3">
                    <span className="bg-white/90 backdrop-blur-sm text-surface-800 text-[11px] font-semibold px-2.5 py-1 rounded-full shadow-sm">
                      {puja.tag}
                    </span>
                  </div>
                )}
                <button
                  className="absolute top-3 right-3 w-8 h-8 bg-white/80 backdrop-blur-sm rounded-xl flex items-center justify-center hover:bg-white transition-colors"
                  aria-label="Add to wishlist"
                >
                  <Heart className="w-4 h-4 text-surface-400" />
                </button>
              </div>

              <div className="p-5">
                <div className="flex items-center gap-1 text-sm mb-1" style={{ color: 'var(--color-text-muted)' }}>
                  <MapPin className="w-3.5 h-3.5" />
                  {puja.temple}
                </div>
                <h3 className="text-lg font-semibold transition-colors" style={{ color: 'var(--color-text)' }}>
                  {puja.name}
                </h3>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex items-center gap-1 text-sm">
                    <Star className="w-4 h-4 text-temple-gold fill-temple-gold" />
                    <span className="font-semibold" style={{ color: 'var(--color-text)' }}>
                      {puja.rating}
                    </span>
                  </div>
                  <span style={{ color: 'var(--color-divider)' }}>|</span>
                  <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    {puja.reviews.toLocaleString('en-IN')} reviews
                  </span>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <div>
                    <span className="text-xl font-semibold" style={{ color: 'var(--color-primary)' }}>
                      &#x20B9;{puja.price.toLocaleString('en-IN')}
                    </span>
                    <span className="text-sm ml-1" style={{ color: 'var(--color-text-faint)' }}>
                      onwards
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold group-hover:translate-x-1 transition-transform" style={{ color: 'var(--color-primary)' }}>
                    Book <ChevronRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

async function TrendingContentSection() {
  let items: typeof fallbackTrending;

  try {
    const res = await getContent();
    items = res.data.slice(0, 4).map((c) => ({
      title: c.title,
      deity: c.deity ?? '',
      type: c.type.charAt(0).toUpperCase() + c.type.slice(1),
      plays: formatCount(c.viewCount),
      duration: formatDuration(c.durationSeconds),
      slug: c.slug,
    }));
    if (items.length === 0) items = fallbackTrending;
  } catch {
    items = fallbackTrending;
  }

  return (
    <section className="py-14 md:py-20" style={{ background: 'var(--color-surface)' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
              Trending Content
            </h2>
            <p className="mt-2" style={{ color: 'var(--color-text-muted)' }}>
              Aartis, bhajans, mantras, and more
            </p>
          </div>
          <a
            href="/content"
            className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold transition-colors link-underline"
            style={{ color: 'var(--color-primary)' }}
          >
            Explore Library
          </a>
        </div>

        <div className="space-y-3">
          {items.map((item) => (
            <a
              key={item.title}
              href={`/content/${item.slug}`}
              data-reveal="up"
              className="flex items-center gap-4 p-4 rounded-xl transition-colors card-hover"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            >
              <img
                src={getDeityImage(item.deity.toLowerCase().replace(/\s+/g, '-'), 'square')}
                alt={`${item.title} - ${item.deity}`}
                loading="lazy"
                className="w-16 h-16 rounded-lg object-cover shrink-0"
              />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate" style={{ color: 'var(--color-text)' }}>
                  {item.title}
                </h3>
                <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  {item.deity} &middot; <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full ${typeBadgeClasses(item.type)}`}>{item.type}</span> &middot; {item.plays} plays
                </p>
              </div>
              <span className="text-sm shrink-0" style={{ color: 'var(--color-text-faint)' }}>{item.duration}</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Loading fallbacks ────────────────────────────────────────────────────────

function SectionSkeleton({
  bg = '',
  count = 4,
}: {
  bg?: string;
  count?: number;
}) {
  return (
    <section
      className="py-14 md:py-20"
      style={bg === 'surface' ? { background: 'var(--color-surface)' } : undefined}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 animate-pulse">
        <div className="h-8 rounded-xl w-64 mb-3" style={{ background: 'var(--color-surface-offset)' }} />
        <div className="h-4 rounded-lg w-96 mb-10" style={{ background: 'var(--color-surface)' }} />
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${count} gap-5`}>
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="rounded-xl h-64" style={{ background: 'var(--color-surface)' }} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* ============ HERO SECTION — Story-driven, warm ============ */}
      <section className="relative overflow-hidden" style={{ background: 'var(--color-bg)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 md:pt-28 md:pb-24">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left — Story copy */}
            <div>
              <div
                className="animate-fade-in inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-6"
                style={{ background: 'var(--color-art-2)', color: 'var(--color-text)' }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                12,450+ devotees watching live darshan
              </div>

              <h1
                className="animate-fade-in animate-fade-in-delay-1 text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-[1.1]"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
              >
                Your bridge to<br />
                <span style={{ color: 'var(--color-primary)' }}>sacred traditions</span>
              </h1>

              <p
                className="animate-fade-in animate-fade-in-delay-2 mt-5 text-base md:text-lg leading-relaxed max-w-lg"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Book authentic pujas with verified priests. Watch live darshan from
                India&rsquo;s most sacred temples. Get AI-powered spiritual guidance.
              </p>

              <div className="animate-fade-in animate-fade-in-delay-3 mt-8 flex items-center gap-3">
                <a
                  href="/temples"
                  className="px-5 py-2.5 text-sm font-medium rounded-lg text-white transition-colors btn-press btn-hover"
                  style={{ background: 'var(--color-primary)' }}
                >
                  Explore Temples
                </a>
                <a
                  href="/pujas"
                  className="px-5 py-2.5 text-sm font-medium rounded-lg transition-colors btn-press btn-hover"
                  style={{ background: 'var(--color-surface-offset)', color: 'var(--color-text)' }}
                >
                  Book a Puja
                </a>
              </div>

              {/* Trust badges */}
              <div className="mt-10 flex items-center gap-6 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                <div><span className="font-semibold" style={{ color: 'var(--color-text)' }}>200+</span> Temples</div>
                <div className="w-px h-4" style={{ background: 'var(--color-divider)' }} />
                <div><span className="font-semibold" style={{ color: 'var(--color-text)' }}>50K+</span> Pujas Booked</div>
                <div className="w-px h-4" style={{ background: 'var(--color-divider)' }} />
                <div><span className="font-semibold" style={{ color: 'var(--color-text)' }}>4.9&#9733;</span> Rating</div>
              </div>
            </div>

            {/* Right — Featured illustrated card (bento style) */}
            <div className="hidden md:block">
              <div
                className="rounded-2xl p-6 relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg, var(--color-art-1), var(--color-art-3))' }}
              >
                <div className="organic-shape art-shell w-32 h-32 absolute -bottom-4 -right-4 opacity-40" />
                <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>Live Now</h3>
                <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>Kashi Vishwanath &middot; Morning Aarti</p>
                <div className="mt-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>12,450 watching</span>
                </div>
                <img
                  src={getTempleHero('kashi-vishwanath')}
                  alt="Kashi Vishwanath"
                  className="mt-4 rounded-xl w-full h-40 object-cover"
                  loading="eager"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ LIVE DARSHAN (dynamic) ============ */}
      <Suspense fallback={<SectionSkeleton bg="surface" count={4} />}>
        <LiveDarshanSection />
      </Suspense>

      {/* ============ TODAY'S PANCHANG (dynamic) ============ */}
      <Suspense
        fallback={
          <section className="py-14 md:py-20">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 animate-pulse">
              <div className="h-8 rounded-xl w-64 mb-10" style={{ background: 'var(--color-surface-offset)' }} />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-xl h-28"
                    style={{ background: 'var(--color-surface)' }}
                  />
                ))}
              </div>
            </div>
          </section>
        }
      >
        <PanchangSection />
      </Suspense>

      {/* ============ FEATURED PUJAS (dynamic) ============ */}
      <Suspense fallback={<SectionSkeleton bg="surface" count={3} />}>
        <FeaturedPujasSection />
      </Suspense>

      {/* ============ FOR YOU TODAY (AI-personalized content) ============ */}
      <ForYouSection />

      {/* ============ TRENDING CONTENT (dynamic) ============ */}
      <Suspense fallback={<SectionSkeleton bg="surface" count={4} />}>
        <TrendingContentSection />
      </Suspense>

      {/* ============ ASK PANDIT AI SECTION ============ */}
      <section className="py-14 md:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className="relative overflow-hidden rounded-2xl p-10 md:p-16"
            style={{ background: 'linear-gradient(135deg, var(--color-art-3), var(--color-art-1))' }}
          >
            <div className="organic-shape art-shell w-48 h-48 absolute -bottom-8 -right-8 opacity-30" />

            <div className="relative grid md:grid-cols-[1fr_auto] gap-8 items-center">
              <div>
                <div
                  className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full mb-6 uppercase tracking-widest"
                  style={{ background: 'var(--color-surface-offset)', color: 'var(--color-text-muted)' }}
                >
                  <Bot className="w-3.5 h-3.5" />
                  AI-Powered
                </div>
                <h2
                  className="text-2xl md:text-3xl font-semibold tracking-tight mb-4 max-w-xl"
                  style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
                >
                  Ask Pandit &mdash; Your Spiritual Guide
                </h2>
                <p className="text-base md:text-lg max-w-xl mb-8 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                  Get instant answers about rituals, muhurat timings, festival
                  significance, and personalized puja recommendations from our
                  AI spiritual assistant.
                </p>
                <a
                  href="/ask-pandit"
                  className="inline-flex items-center gap-2.5 text-white font-medium px-6 py-3 rounded-lg transition-colors btn-press btn-hover"
                  style={{ background: 'var(--color-primary)' }}
                >
                  <MessageCircle className="w-5 h-5" />
                  Start a Conversation
                </a>
              </div>
              <div className="hidden md:flex items-center justify-center">
                <div
                  className="w-20 h-20 rounded-xl flex items-center justify-center"
                  style={{ background: 'var(--color-surface-offset)' }}
                >
                  <Sparkles className="w-10 h-10" style={{ color: 'var(--color-primary)' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ BHAKTI STORE (static) ============ */}
      <section className="py-14 md:py-20" style={{ background: 'var(--color-surface)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
                Bhakti Store
              </h2>
              <p className="mt-2" style={{ color: 'var(--color-text-muted)' }}>
                Authentic puja samagri, idols, and spiritual essentials
              </p>
            </div>
            <a
              href="/store"
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors btn-hover"
              style={{ background: 'var(--color-text)' }}
            >
              Shop Essentials
            </a>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {storeHighlights.map((product) => (
              <a
                key={product.name}
                href="/store"
                data-reveal="up"
                className="group rounded-xl overflow-hidden card-hover"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
              >
                <div className="relative aspect-square flex items-center justify-center overflow-hidden" style={{ background: 'var(--color-surface-offset)' }}>
                  <img
                    src={
                      product.name.includes('Thali') ? getProductImage('brass-puja-thali') :
                      product.name.includes('Rudraksha') ? getProductImage('rudraksha-mala') :
                      product.name.includes('Incense') || product.name.includes('Sandalwood') ? getProductImage('incense-sticks') :
                      getProductImage('brass-ganesha-idol')
                    }
                    alt={product.name}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500"
                  />
                </div>
                <div className="p-5">
                  <h3 className="font-medium text-sm line-clamp-2 transition-colors" style={{ color: 'var(--color-text)' }}>
                    {product.name}
                  </h3>
                  <div className="flex items-center gap-1 mt-1.5">
                    <Star className="w-3.5 h-3.5 text-temple-gold fill-temple-gold" />
                    <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                      {product.rating}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
                      &#x20B9;{product.price.toLocaleString('en-IN')}
                    </span>
                    <span className="text-sm line-through" style={{ color: 'var(--color-text-faint)' }}>
                      &#x20B9;{product.originalPrice.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <button
                    className="mt-3 w-full py-2 text-sm font-medium rounded-lg transition-colors btn-press"
                    style={{ background: 'var(--color-surface-offset)', color: 'var(--color-primary)' }}
                  >
                    Add to Cart
                  </button>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ============ CTA / APP DOWNLOAD (static) ============ */}
      <section className="py-14 md:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className="relative overflow-hidden rounded-2xl p-10 md:p-16 text-center"
            style={{ background: 'var(--color-text)', color: 'var(--color-text-inverse)' }}
          >
            <div className="absolute inset-0 bg-[url('/images/pattern-mandala.svg')] opacity-5 bg-center bg-cover" />
            <div className="relative">
              <h2
                className="text-2xl sm:text-3xl font-semibold tracking-tight mb-4"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Your Spiritual Journey, Always with You
              </h2>
              <p className="text-base md:text-lg max-w-2xl mx-auto mb-10 leading-relaxed opacity-70">
                Download the Bhaktisetu app for a personalized devotional experience
                &mdash; daily panchang alerts, live darshan notifications, and
                exclusive puja offers.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <a
                  href="#"
                  className="inline-flex items-center gap-3 px-6 py-3.5 rounded-lg transition-colors border"
                  style={{ background: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.15)' }}
                >
                  <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current">
                    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                  </svg>
                  <div className="text-left">
                    <div className="text-[10px] uppercase tracking-wider opacity-60">
                      Download on the
                    </div>
                    <div className="text-sm font-semibold -mt-0.5">App Store</div>
                  </div>
                </a>
                <a
                  href="#"
                  className="inline-flex items-center gap-3 px-6 py-3.5 rounded-lg transition-colors border"
                  style={{ background: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.15)' }}
                >
                  <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current">
                    <path d="M3.18 23.08c-.44-.27-.68-.72-.68-1.33V2.25c0-.61.24-1.06.68-1.33l11.06 11.08L3.18 23.08zm1.42.62l12.24-6.88-2.86-2.86-9.38 9.74zm14.54-8.17L6.27.82l9.38 9.74 2.86-2.86-12.24-6.88L17.14 6.7l2.11-1.19c.8-.45 1.47-.07 1.47.85 0 .19-.04.4-.13.61l-.06.13-2.39 8.43z" />
                  </svg>
                  <div className="text-left">
                    <div className="text-[10px] uppercase tracking-wider opacity-60">
                      Get it on
                    </div>
                    <div className="text-sm font-semibold -mt-0.5">
                      Google Play
                    </div>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
