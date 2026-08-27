// Daily devotional hub — single page user opens each morning.
// Aggregates: day-of-week deity, today's tithi, upcoming festival countdown,
// suggested mantra + puja for the day. Targets "what to do today hindu",
// "today panchang", "today's mantra".
import type { Metadata } from 'next';
import Link from 'next/link';
import { Calendar, Sunrise, Sparkles, Music, BookOpen, ChevronRight, Clock } from 'lucide-react';
import { getTodayPanchang } from '../../lib/api';
import { FESTIVALS, nextFestival } from '../../lib/festivals';
import { getCatalogueSlugs } from '../../lib/puja-catalogue';
import { BROWSE_PUJAS_HREF, pujaLinkLabel, resolveContentPujas } from '../../lib/puja-link';
import { DEITY_MANTRAS } from '../../lib/deity-mantras';
import { getDeity } from '../../lib/deities';
import { buttonClass } from '../../components/ui/button-recipe';
import { H1 } from '../../components/ui/heading-recipe';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Today — Tithi, Mantra, Deity of the Day, Upcoming Festival',
  description: 'Today\'s panchang (tithi + nakshatra + auspicious muhurat), day-of-week deity, suggested mantra, and countdown to the next major festival.',
  alternates: { canonical: 'https://darshya.online/today' },
  openGraph: {
    title: 'Today on Darshya — Daily Devotional Hub',
    description: 'Your daily one-glance devotional dashboard.',
    url: 'https://darshya.online/today',
    type: 'website',
    images: ['/og/default.png'],
  },
};

// Vedic day-of-week deity assignments (vaar devata)
const DAY_DEITY: Record<number, { name: string; slug: string; reason: string; suggestedPuja: string }> = {
  0: { name: 'Surya', slug: 'vishnu', reason: 'Sunday is ruled by the Sun — for vitality, leadership, and royal favour.', suggestedPuja: 'surya-namaskar' },
  1: { name: 'Shiva', slug: 'shiva', reason: 'Monday is ruled by the Moon and dedicated to Shiva — for peace and chandra-dosh remedy.', suggestedPuja: 'rudrabhishek' },
  2: { name: 'Hanuman', slug: 'hanuman', reason: 'Tuesday belongs to Hanuman and Mangal — for protection, strength, and mangal-dosh remedy.', suggestedPuja: 'sundarkand-path' },
  3: { name: 'Ganesha', slug: 'ganesha', reason: 'Wednesday belongs to Budh and Ganesha — for intellect, communication, and removing obstacles.', suggestedPuja: 'ganesh-puja' },
  4: { name: 'Vishnu / Brihaspati', slug: 'vishnu', reason: 'Thursday belongs to Guru Brihaspati — for wisdom, dharma, and Vishnu darshan.', suggestedPuja: 'satyanarayan-puja' },
  5: { name: 'Lakshmi / Devi', slug: 'lakshmi', reason: 'Friday is ruled by Shukra and Lakshmi — for wealth, beauty, and feminine energy.', suggestedPuja: 'lakshmi-puja' },
  6: { name: 'Shani / Hanuman', slug: 'hanuman', reason: 'Saturday belongs to Shani Dev — Hanuman puja shields from shani-dosh.', suggestedPuja: 'sundarkand-path' },
};

function daysUntil(dateIso: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateIso);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export default async function TodayPage() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];
  const todayInfo = DAY_DEITY[dayOfWeek] ?? { name: 'Ganesha', slug: 'ganesha', reason: 'A neutral daily devotion for removing obstacles and inviting auspiciousness.', suggestedPuja: 'ganesh-puja' };

  // Tolerant fetch — panchang API may be cold/down.
  const panchang = await getTodayPanchang().catch(() => null);

  // DF-02/CI-01 rule applied to the "Suggested puja" tile.
  //
  // `DAY_DEITY[*].suggestedPuja` is a hand-written editorial slug and it was
  // interpolated straight into `/pujas/<slug>`. That route sets
  // `dynamicParams = false` (app/pujas/[slug]/page.tsx), so any slug the
  // catalogue does not sell is a hard 404, not a soft empty state. Four of the
  // seven weekdays shipped one: Sunday's `surya-namaskar` is not sold at all,
  // and Tuesday/Thursday/Saturday named `sundarkand-path`/`satyanarayan-puja`,
  // whose real catalogue spellings are `sunderkand-path`/`satyanarayan-katha`.
  //
  // Routing through resolveContentPujas both applies those spelling aliases and
  // refuses to emit a link the live catalogue has not confirmed — an unreadable
  // catalogue yields an empty result, and the tile degrades to /pujas rather
  // than guessing.
  const catalogue = await getCatalogueSlugs();
  const suggestedPujaSlug = resolveContentPujas([todayInfo.suggestedPuja], catalogue)[0] ?? null;

  const upcoming = nextFestival(now);
  const daysToFest = upcoming ? daysUntil(upcoming.date2026) : null;

  // First mantra for today's deity (if available).
  const deityMantras = DEITY_MANTRAS[todayInfo.slug] || [];
  const todayMantra = deityMantras[0];

  const dateLong = now.toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const deityFull = getDeity(todayInfo.slug);

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <header className="mb-10 text-center">
        <div className="inline-flex items-center gap-2 mb-3">
          <Sunrise className="w-5 h-5 text-saffron-600" />
          <span className="text-xs font-semibold uppercase tracking-wider text-saffron-700">
            Today on Darshya
          </span>
        </div>
        <h1 className={`${H1.marketing} mb-3`}>
          {dayName}, {now.toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}
        </h1>
        <p className="text-base text-surface-600">{dateLong}</p>
      </header>

      <section className="mb-8 rounded-2xl bg-gradient-to-br from-saffron-50 via-amber-50 to-saffron-50 border border-saffron-200 p-6 sm:p-8">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-saffron-600" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-saffron-700">
            Today's Deity ({dayName})
          </h2>
        </div>
        <h3 className="text-3xl sm:text-4xl font-bold text-surface-900 mb-2">{todayInfo.name}</h3>
        {deityFull ? (
          <p className="text-2xl font-serif text-saffron-700 mb-3">{deityFull.sanskrit}</p>
        ) : null}
        <p className="text-base text-surface-700 leading-relaxed mb-4">{todayInfo.reason}</p>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/deity/${todayInfo.slug}`}
            className={buttonClass('primary', 'md')}
          >
            {todayInfo.name} pujas <ChevronRight className="w-4 h-4" />
          </Link>
          <Link
            href={`/deity/${todayInfo.slug}/mantras`}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-saffron-300 text-saffron-700 rounded-md text-sm font-semibold hover:bg-saffron-50"
          >
            Mantras <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {todayMantra ? (
        <section className="mb-8 rounded-2xl bg-white border border-surface-200 p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-4">
            <Music className="w-5 h-5 text-saffron-600" />
            <h2 className="text-xl font-bold text-surface-900">Today's mantra to recite</h2>
          </div>
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-5 mb-4">
            <p className="text-xl sm:text-2xl font-serif text-saffron-900 leading-relaxed whitespace-pre-line text-center">
              {todayMantra.sanskrit}
            </p>
          </div>
          <p className="text-sm italic text-surface-700 text-center mb-3">{todayMantra.transliteration}</p>
          <p className="text-sm text-surface-700 leading-relaxed">{todayMantra.benefit}</p>
          <p className="text-xs text-surface-500 mt-2">
            Recommended: {todayMantra.recommendedRepetitions}x repetitions on a mala.
          </p>
        </section>
      ) : null}

      {panchang ? (
        <section className="mb-8 rounded-2xl bg-surface-50 border border-surface-200 p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-saffron-600" />
            <h2 className="text-xl font-bold text-surface-900">Today's Panchang</h2>
          </div>
          <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div className="flex justify-between border-b border-surface-200 pb-1">
              <dt className="text-surface-600">Tithi</dt>
              <dd className="font-semibold text-surface-900">{panchang.tithi}</dd>
            </div>
            <div className="flex justify-between border-b border-surface-200 pb-1">
              <dt className="text-surface-600">Nakshatra</dt>
              <dd className="font-semibold text-surface-900">{panchang.nakshatra}</dd>
            </div>
            <div className="flex justify-between border-b border-surface-200 pb-1">
              <dt className="text-surface-600">Yoga</dt>
              <dd className="font-semibold text-surface-900">{panchang.yoga}</dd>
            </div>
            <div className="flex justify-between border-b border-surface-200 pb-1">
              <dt className="text-surface-600">Karana</dt>
              <dd className="font-semibold text-surface-900">{panchang.karana}</dd>
            </div>
            <div className="flex justify-between border-b border-surface-200 pb-1">
              <dt className="text-surface-600">Sunrise</dt>
              <dd className="font-semibold text-surface-900">{panchang.sunrise}</dd>
            </div>
            <div className="flex justify-between border-b border-surface-200 pb-1">
              <dt className="text-surface-600">Sunset</dt>
              <dd className="font-semibold text-surface-900">{panchang.sunset}</dd>
            </div>
            <div className="flex justify-between border-b border-surface-200 pb-1 sm:col-span-2">
              <dt className="text-surface-600">Rahu Kaal (avoid)</dt>
              <dd className="font-semibold text-rose-700">{panchang.rahuKaal}</dd>
            </div>
          </dl>
          {panchang.shubhMuhurat.length > 0 ? (
            <div className="mt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-surface-500 mb-2">Shubh muhurat</h3>
              <ul className="space-y-1">
                {panchang.shubhMuhurat.slice(0, 4).map((m, i) => (
                  <li key={i} className="flex justify-between text-sm">
                    <span className="text-surface-700">{m.name}</span>
                    <span className="font-mono text-surface-900">{m.start} – {m.end}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="mt-4">
            <Link href="/panchang" className="text-sm text-saffron-700 hover:underline font-semibold">
              Full panchang →
            </Link>
          </div>
        </section>
      ) : (
        <section className="mb-8 rounded-2xl bg-surface-50 border border-surface-200 p-6 text-center">
          <p className="text-sm text-surface-600">Panchang temporarily unavailable. <Link href="/panchang" className="text-saffron-700 hover:underline">Refresh →</Link></p>
        </section>
      )}

      {upcoming && daysToFest !== null && daysToFest >= 0 ? (
        <section className="mb-8 rounded-2xl bg-gradient-to-r from-amber-100 via-saffron-100 to-amber-100 border border-saffron-300 p-6 sm:p-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Clock className="w-5 h-5 text-saffron-700" />
            <span className="text-xs font-semibold uppercase tracking-wider text-saffron-700">
              Next major festival
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-surface-900 mb-2">{upcoming.name}</h2>
          <p className="text-2xl font-serif text-saffron-800 mb-3">{upcoming.sanskrit}</p>
          <div className="inline-block px-4 py-1.5 bg-white rounded-full text-sm font-semibold text-saffron-700 mb-4">
            {daysToFest === 0 ? 'Today!' : daysToFest === 1 ? 'Tomorrow' : `In ${daysToFest} days`}
          </div>
          <p className="text-sm text-surface-700 max-w-xl mx-auto mb-4 line-clamp-2">{upcoming.description}</p>
          <Link
            href={`/festival/${upcoming.slug}`}
            className={buttonClass('primary', 'md')}
          >
            Prepare for {upcoming.name} <ChevronRight className="w-4 h-4" />
          </Link>
        </section>
      ) : null}

      <section className="mb-8 grid sm:grid-cols-3 gap-3">
        {/* When nothing resolves the copy loses the ritual name as well as the
            deep link — naming a puja the catalogue has not confirmed is the
            same promise-with-nothing-behind-it the href fix removes. */}
        <Link
          href={suggestedPujaSlug ? `/pujas/${suggestedPujaSlug}` : BROWSE_PUJAS_HREF}
          className="block rounded-xl border border-surface-200 bg-white p-5 hover:border-saffron-300 hover:bg-saffron-50 transition"
        >
          <span className="text-xs font-semibold uppercase tracking-wider text-saffron-700 mb-1 block">Suggested puja</span>
          <span className={`text-lg font-bold text-surface-900${suggestedPujaSlug ? ' capitalize' : ''}`}>
            {suggestedPujaSlug ? pujaLinkLabel(suggestedPujaSlug) : 'Browse all pujas'}
          </span>
          <span className="block text-sm text-surface-600 mt-1">
            {suggestedPujaSlug
              ? `Most-recommended ritual for ${dayName}`
              : `Find the right ritual for ${dayName} with a verified pandit`}
          </span>
        </Link>
        <Link
          href="/astrology/horoscope"
          className="block rounded-xl border border-surface-200 bg-white p-5 hover:border-saffron-300 hover:bg-saffron-50 transition"
        >
          <span className="text-xs font-semibold uppercase tracking-wider text-saffron-700 mb-1 block">Daily Horoscope</span>
          <span className="text-lg font-bold text-surface-900">Read your rashi today</span>
          <span className="block text-sm text-surface-600 mt-1">All 12 rashis updated daily</span>
        </Link>
        <Link
          href="/darshan"
          className="block rounded-xl border border-surface-200 bg-white p-5 hover:border-saffron-300 hover:bg-saffron-50 transition"
        >
          <span className="text-xs font-semibold uppercase tracking-wider text-saffron-700 mb-1 block">Live Darshan</span>
          <span className="text-lg font-bold text-surface-900">Open temples streaming now</span>
          <span className="block text-sm text-surface-600 mt-1">Real-time devotion from your phone</span>
        </Link>
      </section>

      <section className="mb-8 rounded-2xl bg-surface-50 border border-surface-200 p-6 text-center">
        <div className="inline-flex items-center gap-2 mb-2">
          <BookOpen className="w-4 h-4 text-saffron-600" />
          <h2 className="text-base font-semibold text-surface-900">More to read today</h2>
        </div>
        <div className="inline-flex flex-wrap items-center justify-center gap-3 text-sm">
          <Link href="/aarti" className="text-saffron-700 hover:underline font-semibold">Aartis</Link>
          <Link href="/chalisa" className="text-saffron-700 hover:underline font-semibold">Chalisas</Link>
          <Link href="/shlokas" className="text-saffron-700 hover:underline font-semibold">Shlokas</Link>
          <Link href="/blog" className="text-saffron-700 hover:underline font-semibold">Blog</Link>
        </div>
      </section>

      <section className="mb-4">
        <h2 className="text-xl font-bold text-surface-900 mb-3">All upcoming festivals (30 days)</h2>
        <ul className="space-y-2">
          {FESTIVALS
            .map((f) => ({ ...f, days: daysUntil(f.date2026) }))
            .filter((f) => f.days >= 0 && f.days <= 60)
            .sort((a, b) => a.days - b.days)
            .slice(0, 8)
            .map((f) => (
              <li key={f.slug}>
                <Link
                  href={`/festival/${f.slug}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-surface-200 bg-white p-3 hover:border-saffron-300 hover:bg-saffron-50 transition"
                >
                  <div>
                    <div className="font-semibold text-surface-900">{f.name}</div>
                    <div className="text-xs text-surface-500">{f.deity}</div>
                  </div>
                  <span className="text-xs font-semibold text-saffron-700 whitespace-nowrap">
                    {f.days === 0 ? 'Today' : f.days === 1 ? 'Tomorrow' : `${f.days} days`}
                  </span>
                </Link>
              </li>
            ))}
        </ul>
      </section>
    </main>
  );
}
