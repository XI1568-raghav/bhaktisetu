// Per-rashi horoscope hub — programmatic SEO for "aries horoscope today",
// "mesh rashifal", etc. Static daily prediction from lib/rashis.ts (updated
// by agent later); cross-links to relevant pujas per ruling planet.
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ChevronRight,
  Sparkles,
  Briefcase,
  Heart,
  Activity,
  Compass,
  Flame,
  Star,
  ArrowRight,
} from 'lucide-react';
import { RASHIS, getRashi, pujasForRashi } from '../../../../lib/rashis';
import { getDailyHoroscope, getPeriodHoroscope } from '../../../../lib/daily-horoscope';

export const dynamicParams = false;
export const revalidate = 3600;

export function generateStaticParams() {
  return RASHIS.map((r) => ({ rashi: r.rashi }));
}

interface Params {
  params: Promise<{ rashi: string }>;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { rashi } = await params;
  const r = getRashi(rashi);
  if (!r) return { title: 'Horoscope — Darshya' };
  return {
    title: `${r.rashiEnglish} Horoscope Today (${r.rashiHindi} Rashifal) — Darshya`,
    description: `Daily ${r.rashiEnglish} horoscope: ${r.prediction.slice(0, 130)}... Lucky number ${r.luckyNumber}, color ${r.luckyColor}. Ruling planet ${r.rulingPlanet}.`,
    alternates: { canonical: `https://darshya.online/astrology/horoscope/${r.rashi}` },
    openGraph: {
      title: `${r.rashiEnglish} (${r.rashiHindi}) — Today's Rashifal`,
      description: r.prediction.slice(0, 200),
      url: `https://darshya.online/astrology/horoscope/${r.rashi}`,
      type: 'article',
      images: ['/og/default'],
    },
  };
}

export default async function RashiPage({ params }: Params) {
  const { rashi } = await params;
  const r = getRashi(rashi);
  if (!r) notFound();

  const recommendedPujas = pujasForRashi(r);
  const otherRashis = RASHIS.filter((x) => x.rashi !== r.rashi).slice(0, 11);

  const todayDate = new Date();
  const today = todayDate.toISOString().slice(0, 10);
  const daily = getDailyHoroscope(r.rashi, todayDate);
  const weekly = getPeriodHoroscope(r.rashi, todayDate, 'week');
  const monthly = getPeriodHoroscope(r.rashi, todayDate, 'month');
  const liveRating = daily.rating;
  const liveLuckyNumber = daily.luckyNumber;
  const liveLuckyColor = daily.luckyColor;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${r.rashiEnglish} Horoscope Today — ${r.rashiHindi} Rashifal`,
    datePublished: today,
    dateModified: today,
    author: { '@type': 'Organization', name: 'Darshya Astrology' },
    publisher: { '@type': 'Organization', name: 'Darshya', logo: { '@type': 'ImageObject', url: 'https://darshya.online/logo.png' } },
    description: daily.prediction,
    mainEntityOfPage: `https://darshya.online/astrology/horoscope/${r.rashi}`,
  };

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
        <span className="text-surface-900">{r.rashiEnglish}</span>
      </nav>

      <header className="mb-10">
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <span className="inline-block px-2.5 py-0.5 text-xs font-semibold text-saffron-700 bg-saffron-100 rounded-full">
            {r.element}
          </span>
          <span className="inline-block px-2.5 py-0.5 text-xs font-semibold text-purple-700 bg-purple-100 rounded-full">
            Ruler: {r.rulingPlanet}
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
            {Array.from({ length: liveRating }).map((_, i) => (
              <Star key={i} className="w-3 h-3 fill-amber-500 text-amber-500" />
            ))}
            <span className="ml-1 text-surface-500 text-[10px]">{liveRating}/5 today</span>
          </span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-surface-900 mb-2">
          {r.rashiEnglish} Horoscope Today
        </h1>
        <p className="text-2xl font-serif text-saffron-700 mb-3">
          {r.rashiHindi} Rashifal · {new Date(today).toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
        <Link
          href={`/astrology/horoscope/${r.rashi}/today`}
          className="inline-flex items-center gap-1.5 mb-4 px-4 py-2 rounded-lg bg-saffron-600 text-white text-sm font-semibold hover:bg-saffron-700 transition"
        >
          Today&apos;s reading <ArrowRight className="w-4 h-4" />
        </Link>
        <p className="text-lg text-surface-700 leading-relaxed">
          {daily.prediction}
        </p>
        <p className="mt-3 text-xs text-surface-500">
          Today: Moon in house {daily.transits.moonHouse}, Sun in house {daily.transits.sunHouse}, Jupiter in house {daily.transits.jupiterHouse}, Saturn in house {daily.transits.saturnHouse} relative to your natal {r.rashiEnglish}. Tithi: {daily.tithi}. Moon nakshatra: {daily.nakshatra}.
        </p>
      </header>

      <section className="grid sm:grid-cols-3 gap-4 mb-10">
        <div className="rounded-xl border border-saffron-200 bg-saffron-50 p-4">
          <div className="flex items-center gap-2 text-saffron-700 mb-2">
            <Briefcase className="w-4 h-4" /> <span className="text-xs font-semibold uppercase tracking-wide">Career</span>
          </div>
          <p className="text-sm text-surface-800">{daily.career}</p>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <div className="flex items-center gap-2 text-rose-700 mb-2">
            <Heart className="w-4 h-4" /> <span className="text-xs font-semibold uppercase tracking-wide">Love</span>
          </div>
          <p className="text-sm text-surface-800">{daily.love}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center gap-2 text-emerald-700 mb-2">
            <Activity className="w-4 h-4" /> <span className="text-xs font-semibold uppercase tracking-wide">Health</span>
          </div>
          <p className="text-sm text-surface-800">{daily.health}</p>
        </div>
      </section>

      <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 mb-10">
        <div className="flex items-center gap-2 text-amber-800 mb-2">
          <Sparkles className="w-4 h-4" /> <span className="text-xs font-semibold uppercase tracking-wide">Finance today</span>
        </div>
        <p className="text-sm text-surface-800">{daily.finance}</p>
      </section>

      <section className="grid sm:grid-cols-2 gap-4 mb-10">
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5">
          <h3 className="text-sm font-bold text-indigo-700 uppercase tracking-wide mb-2">This Week (avg {weekly.rating}/5)</h3>
          <p className="text-sm text-surface-800 leading-relaxed">{weekly.prediction}</p>
        </div>
        <div className="rounded-2xl border border-purple-200 bg-purple-50 p-5">
          <h3 className="text-sm font-bold text-purple-700 uppercase tracking-wide mb-2">This Month (avg {monthly.rating}/5)</h3>
          <p className="text-sm text-surface-800 leading-relaxed">{monthly.prediction}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-surface-200 bg-white p-6 mb-10">
        <h2 className="text-xl font-bold text-surface-900 mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-saffron-600" /> Lucky factors
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-xs text-surface-500 uppercase tracking-wide mb-1">Number today</p>
            <p className="text-2xl font-bold text-saffron-700">{liveLuckyNumber}</p>
          </div>
          <div>
            <p className="text-xs text-surface-500 uppercase tracking-wide mb-1">Color today</p>
            <p className="text-lg font-semibold text-surface-900">{liveLuckyColor}</p>
          </div>
          <div>
            <p className="text-xs text-surface-500 uppercase tracking-wide mb-1">Direction</p>
            <p className="text-lg font-semibold text-surface-900 flex items-center gap-1">
              <Compass className="w-4 h-4" /> {r.luckyDirection}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-gradient-to-br from-saffron-50 to-amber-50 border border-saffron-200 p-6 mb-10">
        <h2 className="text-xl font-bold text-surface-900 mb-3 flex items-center gap-2">
          <Flame className="w-5 h-5 text-saffron-600" /> Daily mantra
        </h2>
        <p className="font-serif text-2xl text-saffron-800 mb-1">{r.mantraHindi}</p>
        <p className="text-sm italic text-surface-700">{r.mantra}</p>
        <p className="text-xs text-surface-500 mt-2">Recite 108 times for best results.</p>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold text-surface-900 mb-4">
          Recommended pujas for {r.rashiEnglish}
        </h2>
        <p className="text-sm text-surface-600 mb-4">
          Based on your ruling planet ({r.rulingPlanet}), these pujas help balance and strengthen your chart.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          {recommendedPujas.map((slug) => (
            <Link
              key={slug}
              href={`/pujas/${slug}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-surface-200 bg-white p-4 hover:border-saffron-300 hover:bg-saffron-50 transition"
            >
              <div>
                <p className="font-semibold text-surface-900 capitalize">{slug.replace(/-/g, ' ')}</p>
                <p className="text-xs text-surface-500">Book online · video proof included</p>
              </div>
              <ArrowRight className="w-4 h-4 text-saffron-600 flex-shrink-0" />
            </Link>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold text-surface-900 mb-4">All 12 rashis</h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          {otherRashis.map((x) => (
            <Link
              key={x.rashi}
              href={`/astrology/horoscope/${x.rashi}`}
              className="flex flex-col items-center text-center rounded-lg border border-surface-200 bg-white p-3 hover:border-saffron-300 hover:bg-saffron-50 transition"
            >
              <span className="text-sm font-semibold text-surface-900">{x.rashiEnglish}</span>
              <span className="text-xs font-serif text-saffron-700">{x.rashiHindi}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-surface-50 border border-surface-200 p-6 text-center">
        <h2 className="text-xl font-bold text-surface-900 mb-2">
          Want a detailed personal reading?
        </h2>
        <p className="text-sm text-surface-700 mb-4">
          Connect with verified Vedic astrologers for kundli analysis, dosh remedies, and personalized guidance.
        </p>
        <Link
          href="/astrology"
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-saffron-600 text-white font-semibold hover:bg-saffron-700"
        >
          Talk to an astrologer <ChevronRight className="w-4 h-4" />
        </Link>
      </section>
    </main>
  );
}
