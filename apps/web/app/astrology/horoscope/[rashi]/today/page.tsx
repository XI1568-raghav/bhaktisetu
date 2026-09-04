// Today's per-rashi horoscope — SSG fan-out for 12 rashis.
// WHY this page: programmatic SEO for "{rashi} horoscope today YYYY-MM-DD"
// long-tail. Revalidates intra-day so the IST date and panchang stay current
// without forcing a full rebuild.
import type { Metadata } from 'next';
// DU-05: the one h1 recipe per page archetype. Extras are layout-only.
import { H1 } from '../../../../../components/ui/heading-recipe';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Briefcase,
  Heart,
  Activity,
  Sparkles,
  ArrowRight,
  Compass,
  Star,
  Sun,
  Moon,
} from 'lucide-react';
import { RASHIS, getRashi } from '../../../../../lib/rashis';
import { getDailyHoroscope } from '../../../../../lib/daily-horoscope';
import {
  elementOfRashi,
  dayOfYearIST,
  istDateParts,
  pickArea,
  buildGeneralPrediction,
  luckyColorOfDay,
  luckyNumberOfDay,
} from '../../../../../lib/horoscope-templates';

// No `runtime = 'edge'` — forbidden under @opennextjs/cloudflare (Node runtime
// only, via nodejs_compat). This route uses SSR-per-request (no generateStaticParams)
// so the IST date in "today's horoscope" stays current on each request.
// getRashi() validates the slug and calls notFound() on miss — equivalent guard
// to a dynamicParams=false config. 12 rashis, pure JS compute, no DB hit.

interface Params {
  params: Promise<{ rashi: string }>;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { rashi } = await params;
  const r = getRashi(rashi);
  if (!r) return { title: 'Horoscope Today' };
  const { iso, prettyDate } = istDateParts(new Date());
  const title = `${r.rashiEnglish} Horoscope Today ${iso} | Lucky Color, Number, Predictions`;
  const description = `${r.rashiEnglish} (${r.rashiHindi}) horoscope for ${prettyDate}. Today's tithi, nakshatra, lucky color, lucky number, and Vedic predictions for career, love, finance, and health.`;
  return {
    title,
    description,
    alternates: { canonical: `https://darshya.online/astrology/horoscope/${r.rashi}/today` },
    openGraph: {
      title,
      description,
      url: `https://darshya.online/astrology/horoscope/${r.rashi}/today`,
      type: 'article',
      images: ['/og/default.png'],
    },
  };
}

export default async function RashiTodayPage({ params }: Params) {
  const { rashi } = await params;
  const r = getRashi(rashi);
  if (!r) notFound();

  const now = new Date();
  const { iso, dayName, prettyDate, dow } = istDateParts(now);
  const doy = dayOfYearIST(now);
  const element = elementOfRashi(r.element);

  const daily = getDailyHoroscope(r.rashi, now);
  const luckyColor = luckyColorOfDay(r.luckyColor, doy);
  const luckyNumber = luckyNumberOfDay(r.luckyNumber, doy);

  const general = buildGeneralPrediction({
    rashiEnglish: r.rashiEnglish,
    element,
    tithi: daily.tithi,
    dow,
    rulingPlanet: r.rulingPlanet,
  });

  const career = pickArea(element, 'career', doy);
  const love = pickArea(element, 'love', doy);
  const finance = pickArea(element, 'finance', doy);
  const health = pickArea(element, 'health', doy);

  const otherRashis = RASHIS.filter((x) => x.rashi !== r.rashi);

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://darshya.online/' },
        { '@type': 'ListItem', position: 2, name: 'Astrology', item: 'https://darshya.online/astrology' },
        { '@type': 'ListItem', position: 3, name: 'Horoscope', item: 'https://darshya.online/astrology/horoscope' },
        { '@type': 'ListItem', position: 4, name: r.rashiEnglish, item: `https://darshya.online/astrology/horoscope/${r.rashi}` },
        { '@type': 'ListItem', position: 5, name: 'Today', item: `https://darshya.online/astrology/horoscope/${r.rashi}/today` },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: `${r.rashiEnglish} Horoscope Today — ${prettyDate}`,
      datePublished: iso,
      dateModified: iso,
      author: { '@type': 'Organization', name: 'Darshya Astrology' },
      publisher: {
        '@type': 'Organization',
        name: 'Darshya',
        logo: { '@type': 'ImageObject', url: 'https://darshya.online/logo.png' },
      },
      description: general,
      mainEntityOfPage: `https://darshya.online/astrology/horoscope/${r.rashi}/today`,
    },
  ];

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav className="text-sm text-surface-600 mb-4">
        <Link href="/" className="hover:text-saffron-700">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/astrology" className="hover:text-saffron-700">Astrology</Link>
        <span className="mx-2">/</span>
        <Link href="/astrology/horoscope" className="hover:text-saffron-700">Horoscope</Link>
        <span className="mx-2">/</span>
        <Link href={`/astrology/horoscope/${r.rashi}`} className="hover:text-saffron-700">{r.rashiEnglish}</Link>
        <span className="mx-2">/</span>
        <span className="text-surface-900">Today</span>
      </nav>

      <header className="mb-8">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="inline-block px-2.5 py-0.5 text-xs font-semibold text-saffron-700 bg-saffron-100 rounded-full">
            {r.element}
          </span>
          <span className="inline-block px-2.5 py-0.5 text-xs font-semibold text-purple-700 bg-purple-100 rounded-full">
            Ruler: {r.rulingPlanet}
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
            {Array.from({ length: daily.rating }).map((_, i) => (
              <Star key={i} className="w-3 h-3 fill-amber-500 text-amber-500" />
            ))}
            <span className="ml-1 text-surface-500 text-xs">{daily.rating}/5 today</span>
          </span>
        </div>
        <h1 className={`${H1.catalogue} mb-2`}>
          {r.rashiEnglish} ({r.rashiHindi}) — Today, {dayName}, {prettyDate}
        </h1>
        <p className="text-base text-surface-600">
          Daily Vedic horoscope for {r.rashiEnglish} natives based on today&apos;s tithi, nakshatra, vaara lord, and planetary transits relative to your natal sign.
        </p>
      </header>

      <section className="rounded-2xl border border-saffron-200 bg-gradient-to-br from-saffron-50 to-amber-50 p-5 mb-8">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-saffron-700 mb-3 flex items-center gap-1.5">
          <Sun className="w-3.5 h-3.5" /> Today&apos;s Panchang
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div>
            <p className="text-xs uppercase text-surface-500 tracking-wide">Tithi</p>
            <p className="font-semibold text-surface-900">{daily.tithi}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-surface-500 tracking-wide">Nakshatra</p>
            <p className="font-semibold text-surface-900 flex items-center gap-1">
              <Moon className="w-3.5 h-3.5 text-indigo-600" /> {daily.nakshatra}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase text-surface-500 tracking-wide">Vaara</p>
            <p className="font-semibold text-surface-900">{dayName}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-surface-500 tracking-wide">Date (IST)</p>
            <p className="font-semibold text-surface-900">{iso}</p>
          </div>
        </div>
      </section>

      <section className="grid sm:grid-cols-2 gap-4 mb-8">
        <div className="rounded-2xl border border-amber-200 bg-white p-5">
          <p className="text-xs uppercase tracking-wide text-amber-700 font-semibold mb-1">Lucky Color of the Day</p>
          <p className="text-2xl font-bold text-surface-900">{luckyColor}</p>
          <p className="text-xs text-surface-500 mt-1">Wear or carry a small token of this colour for the day.</p>
        </div>
        <div className="rounded-2xl border border-saffron-200 bg-white p-5">
          <p className="text-xs uppercase tracking-wide text-saffron-700 font-semibold mb-1">Lucky Number</p>
          <p className="text-2xl font-bold text-surface-900">{luckyNumber}</p>
          <p className="text-xs text-surface-500 mt-1 flex items-center gap-1">
            <Compass className="w-3 h-3" /> Direction: {r.luckyDirection}
          </p>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold text-surface-900 mb-3 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-saffron-600" /> General Prediction
        </h2>
        <p className="text-base text-surface-800 leading-relaxed">{general}</p>
      </section>

      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <div className="rounded-xl border border-saffron-200 bg-saffron-50 p-4">
          <div className="flex items-center gap-2 text-saffron-700 mb-2">
            <Briefcase className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">Career</span>
          </div>
          <p className="text-sm text-surface-800 leading-relaxed">{career}</p>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <div className="flex items-center gap-2 text-rose-700 mb-2">
            <Heart className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">Love</span>
          </div>
          <p className="text-sm text-surface-800 leading-relaxed">{love}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center gap-2 text-emerald-700 mb-2">
            <Sparkles className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">Finance</span>
          </div>
          <p className="text-sm text-surface-800 leading-relaxed">{finance}</p>
        </div>
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
          <div className="flex items-center gap-2 text-indigo-700 mb-2">
            <Activity className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">Health</span>
          </div>
          <p className="text-sm text-surface-800 leading-relaxed">{health}</p>
        </div>
      </section>

      <section className="grid sm:grid-cols-2 gap-3 mb-10">
        <Link
          href={`/rashi/${r.rashi}`}
          className="flex items-center justify-between gap-3 rounded-xl border border-surface-200 bg-white p-4 hover:border-saffron-300 hover:bg-saffron-50 transition"
        >
          <div>
            <p className="font-semibold text-surface-900">Full {r.rashiEnglish} profile</p>
            <p className="text-xs text-surface-500">Traits, compatibility, career fit, gem & mantra</p>
          </div>
          <ArrowRight className="w-4 h-4 text-saffron-600 flex-shrink-0" />
        </Link>
        <Link
          href="/astrology/kundli"
          className="flex items-center justify-between gap-3 rounded-xl border border-surface-200 bg-white p-4 hover:border-saffron-300 hover:bg-saffron-50 transition"
        >
          <div>
            <p className="font-semibold text-surface-900">Generate Free Kundli</p>
            <p className="text-xs text-surface-500">Birth chart with dasha, yogas, doshas</p>
          </div>
          <ArrowRight className="w-4 h-4 text-saffron-600 flex-shrink-0" />
        </Link>
        <Link
          href="/astrology/chat"
          className="flex items-center justify-between gap-3 rounded-xl border border-surface-200 bg-white p-4 hover:border-saffron-300 hover:bg-saffron-50 transition"
        >
          <div>
            <p className="font-semibold text-surface-900">Ask AI Astrologer</p>
            <p className="text-xs text-surface-500">Instant Vedic answers, 24×7</p>
          </div>
          <ArrowRight className="w-4 h-4 text-saffron-600 flex-shrink-0" />
        </Link>
        <Link
          href="/free-pandit-advice"
          className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 hover:border-emerald-300 transition"
        >
          <div>
            <p className="font-semibold text-emerald-900">Free Pandit Advice</p>
            <p className="text-xs text-emerald-700">Verified Vedic pandit, no cost</p>
          </div>
          <ArrowRight className="w-4 h-4 text-emerald-700 flex-shrink-0" />
        </Link>
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-bold text-surface-900 mb-3">Today&apos;s horoscope for other rashis</h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          {otherRashis.map((x) => (
            <Link
              key={x.rashi}
              href={`/astrology/horoscope/${x.rashi}/today`}
              className="flex flex-col items-center text-center rounded-lg border border-surface-200 bg-white p-3 hover:border-saffron-300 hover:bg-saffron-50 transition"
            >
              <span className="text-sm font-semibold text-surface-900">{x.rashiEnglish}</span>
              <span className="text-xs font-serif text-saffron-700">{x.rashiHindi}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-surface-50 border border-surface-200 p-6 text-center">
        <p className="text-xs text-surface-500">
          Predictions are based on traditional Vedic gochar and panchang calculations. They are for guidance and reflection,
          not a substitute for professional medical, legal, or financial advice.
        </p>
      </section>
    </main>
  );
}
