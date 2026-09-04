import type { Metadata } from 'next';
// DU-05: the one h1 recipe per page archetype. Extras are layout-only.
import { H1 } from '../../../components/ui/heading-recipe';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { NAVA_GRAHAS, getNavaGraha, navaGrahaSlugs } from '../../../lib/nava-grahas';

export const revalidate = 86400;
export const dynamicParams = false;

const BASE_URL = 'https://darshya.online';

export function generateStaticParams() {
  return navaGrahaSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const g = getNavaGraha(slug);
  if (!g) return { title: 'Graha not found' };

  const title = `${g.sanskritName} (${g.english}) — Mantra, Gemstone, Remedies`;
  const description = `${g.sanskritName} graha profile: ${g.natureKaraka}. Beej mantra, ${g.gemstone.split(' ')[0]} gemstone, ${g.dayOfWeek} fasting, ${g.mahadashaYears}y mahadasha, remedies for weak ${g.english}.`;

  return {
    title,
    description,
    alternates: { canonical: `${BASE_URL}/nava-graha/${g.slug}` },
    openGraph: {
      title: `${g.sanskritName} (${g.english}) — Vedic Planet`,
      description,
      url: `${BASE_URL}/nava-graha/${g.slug}`,
      type: 'article',
      images: ['/og/default.png'],
    },
  };
}

function jsonLd(g: NonNullable<ReturnType<typeof getNavaGraha>>) {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
        { '@type': 'ListItem', position: 2, name: 'Nava-Graha', item: `${BASE_URL}/nava-graha` },
        { '@type': 'ListItem', position: 3, name: `${g.sanskritName} (${g.english})`, item: `${BASE_URL}/nava-graha/${g.slug}` },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: `${g.sanskritName} (${g.english}) — Vedic Planet Profile`,
      description: g.natureKaraka,
      author: { '@type': 'Organization', name: 'Darshya' },
      publisher: { '@type': 'Organization', name: 'Darshya' },
      datePublished: '2026-05-28',
      mainEntityOfPage: `${BASE_URL}/nava-graha/${g.slug}`,
    },
  ];
}

const dayColor: Record<string, string> = {
  Sunday: 'bg-rose-50 text-rose-800 border-rose-300',
  Monday: 'bg-sky-50 text-sky-800 border-sky-300',
  Tuesday: 'bg-red-50 text-red-800 border-red-300',
  Wednesday: 'bg-emerald-50 text-emerald-800 border-emerald-300',
  Thursday: 'bg-amber-50 text-amber-800 border-amber-300',
  Friday: 'bg-pink-50 text-pink-800 border-pink-300',
  Saturday: 'bg-slate-100 text-slate-900 border-slate-400',
};

export default async function GrahaDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const g = getNavaGraha(slug);
  if (!g) notFound();

  const idx = NAVA_GRAHAS.findIndex((x) => x.slug === g.slug);
  const prev = idx > 0 ? NAVA_GRAHAS[idx - 1] : null;
  const next = idx < NAVA_GRAHAS.length - 1 ? NAVA_GRAHAS[idx + 1] : null;
  const dayKey = g.dayOfWeek.split(' ')[0];

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(g)) }}
      />

      <nav className="text-xs text-surface-600 mb-4">
        <Link href="/" className="hover:text-saffron-700">Home</Link>
        <span className="mx-1.5">/</span>
        <Link href="/nava-graha" className="hover:text-saffron-700">Nava-Graha</Link>
        <span className="mx-1.5">/</span>
        <span className="text-surface-900">{g.sanskritName}</span>
      </nav>

      <header className="mb-8">
        <div className="flex items-center gap-2 mb-2 text-xs text-surface-600 font-mono">
          <span>Graha #{idx + 1} of 9</span>
        </div>
        <h1 className={`${H1.marketing} mb-2`}>
          {g.sanskritName}
          <span className="text-surface-500 text-xl sm:text-2xl font-normal ml-3">
            {g.english}
          </span>
        </h1>
        <p className="text-surface-700 text-base sm:text-lg italic">
          <span className="font-mono">{g.sanskritDevanagari}</span> · Presiding deity: {g.presidingDeity}
        </p>
      </header>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <div className={`rounded-lg border p-3 ${dayColor[dayKey ?? ''] || 'border-surface-200 bg-surface-50'}`}>
          <div className="text-xs mb-0.5 opacity-80">Day</div>
          <div className="font-bold">{dayKey}</div>
        </div>
        <div className="rounded-lg border border-surface-200 bg-surface-50 p-3">
          <div className="text-xs text-surface-600 mb-0.5">Mahadasha</div>
          <div className="font-bold text-surface-900">{g.mahadashaYears} years</div>
        </div>
        <div className="rounded-lg border border-surface-200 bg-surface-50 p-3">
          <div className="text-xs text-surface-600 mb-0.5">Direction</div>
          <div className="font-bold text-surface-900">{g.direction}</div>
        </div>
        <div className="rounded-lg border border-surface-200 bg-surface-50 p-3">
          <div className="text-xs text-surface-600 mb-0.5">Metal</div>
          <div className="font-bold text-surface-900 text-sm">{g.metal}</div>
        </div>
      </section>

      <section className="mb-8 rounded-xl border border-surface-200 bg-white p-5">
        <h2 className="text-lg font-bold text-surface-900 mb-3">Jyotish Karaka (What This Planet Signifies)</h2>
        <p className="text-surface-700 text-sm leading-relaxed">{g.natureKaraka}</p>
      </section>

      <section className="mb-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-lg border border-surface-200 bg-surface-50 p-4">
          <div className="text-xs text-surface-600 mb-1">Rules Rashi</div>
          <div className="text-surface-900 font-semibold capitalize">
            {g.rulingRashis.length ? g.rulingRashis.map((r) => (
              <Link key={r} href={`/rashi/${r}`} className="text-saffron-700 hover:underline mr-2">{r}</Link>
            )) : <span className="text-surface-500 text-sm">Shadow node — no own sign</span>}
          </div>
          <div className="text-xs text-surface-500 mt-1">{g.ownHouses}</div>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-xs text-emerald-700 mb-1">Exaltation (Ucha)</div>
          <Link href={`/rashi/${g.exaltationRashi}`} className="text-emerald-900 font-semibold capitalize hover:underline">{g.exaltationRashi}</Link>
        </div>
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
          <div className="text-xs text-rose-700 mb-1">Debilitation (Neecha)</div>
          <Link href={`/rashi/${g.debilitationRashi}`} className="text-rose-900 font-semibold capitalize hover:underline">{g.debilitationRashi}</Link>
        </div>
        <div className="rounded-lg border border-surface-200 bg-surface-50 p-4">
          <div className="text-xs text-surface-600 mb-1">Body Part / Health Sphere</div>
          <div className="text-surface-900 text-sm">{g.bodyPart}</div>
        </div>
      </section>

      <section className="mb-8 rounded-xl border border-saffron-200 bg-saffron-50 p-5">
        <h2 className="text-lg font-bold text-surface-900 mb-3">Mantras</h2>

        <div className="bg-white border border-saffron-300 rounded-md p-3 mb-3">
          <div className="text-xs text-saffron-700 font-semibold mb-1">Beej Mantra (108x daily)</div>
          <div className="font-mono text-sm text-surface-900">{g.beejMantra}</div>
          <div className="font-mono text-xs text-surface-600 mt-1">{g.beejMantraDevanagari}</div>
        </div>

        <div className="bg-white border border-saffron-300 rounded-md p-3 mb-3">
          <div className="text-xs text-saffron-700 font-semibold mb-1">Vedic Stotra</div>
          <div className="text-sm text-surface-800 leading-relaxed">{g.vedicMantra}</div>
        </div>

        <div className="bg-white border border-saffron-300 rounded-md p-3">
          <div className="text-xs text-saffron-700 font-semibold mb-1">Gayatri Mantra</div>
          <div className="text-sm text-surface-800 leading-relaxed">{g.gayatriMantraSnippet}</div>
        </div>
      </section>

      <section className="mb-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
          <div className="text-xs text-indigo-700 mb-1 font-semibold">Gemstone (Ratna)</div>
          <div className="text-surface-900 text-sm">{g.gemstone}</div>
          <div className="text-xs text-indigo-700 mt-2 italic">Only wear after chart confirmation — wrong stone harms.</div>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="text-xs text-amber-700 mb-1 font-semibold">Yantra</div>
          <div className="text-surface-900 text-sm">{g.yantra}</div>
          <div className="text-xs text-amber-700 mt-2 italic">Energize on the planet&apos;s sacred day.</div>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-xs text-emerald-700 mb-1 font-semibold">Fasting Day</div>
          <div className="text-surface-900 text-sm">{g.fastingDay}</div>
        </div>
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
          <div className="text-xs text-rose-700 mb-1 font-semibold">Charity (Daan)</div>
          <div className="text-surface-900 text-sm">{g.charityItems}</div>
        </div>
      </section>

      <section className="mb-8 rounded-xl border border-surface-200 bg-white p-5">
        <h2 className="text-lg font-bold text-surface-900 mb-3">Friendship (Mitra Chakra)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div>
            <div className="text-xs text-emerald-700 font-semibold mb-1">Friends</div>
            <div className="flex flex-wrap gap-1">
              {g.friends.length ? g.friends.map((f) => (
                <Link key={f} href={`/nava-graha/${f}`} className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-xs hover:bg-emerald-200 capitalize">{f}</Link>
              )) : <span className="text-surface-500 text-xs">None</span>}
            </div>
          </div>
          <div>
            <div className="text-xs text-rose-700 font-semibold mb-1">Enemies</div>
            <div className="flex flex-wrap gap-1">
              {g.enemies.length ? g.enemies.map((e) => (
                <Link key={e} href={`/nava-graha/${e}`} className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded text-xs hover:bg-rose-200 capitalize">{e}</Link>
              )) : <span className="text-surface-500 text-xs">None</span>}
            </div>
          </div>
          <div>
            <div className="text-xs text-surface-700 font-semibold mb-1">Neutrals</div>
            <div className="flex flex-wrap gap-1">
              {g.neutrals.length ? g.neutrals.map((n) => (
                <Link key={n} href={`/nava-graha/${n}`} className="px-2 py-0.5 bg-surface-100 text-surface-800 rounded text-xs hover:bg-surface-200 capitalize">{n}</Link>
              )) : <span className="text-surface-500 text-xs">None</span>}
            </div>
          </div>
        </div>
      </section>

      <section className="mb-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <h3 className="text-base font-bold text-emerald-900 mb-2">When Strong</h3>
          <p className="text-surface-700 text-sm leading-relaxed mb-3">{g.whenStrong}</p>
          <div className="flex flex-wrap gap-1.5">
            {g.positiveTraits.map((t) => (
              <span key={t} className="px-2 py-0.5 bg-white text-emerald-800 border border-emerald-300 rounded text-xs">{t}</span>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-5">
          <h3 className="text-base font-bold text-rose-900 mb-2">When Weak</h3>
          <p className="text-surface-700 text-sm leading-relaxed mb-3">{g.whenWeak}</p>
          <div className="flex flex-wrap gap-1.5">
            {g.negativeIndications.map((n) => (
              <span key={n} className="px-2 py-0.5 bg-white text-rose-800 border border-rose-300 rounded text-xs">{n}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="mb-8 rounded-xl border border-saffron-300 bg-white p-5">
        <h2 className="text-lg font-bold text-surface-900 mb-3">Remedies (Upaya)</h2>
        <ol className="list-decimal list-inside space-y-2 text-sm text-surface-700">
          {g.remedies.map((r, i) => (
            <li key={i} className="leading-relaxed">{r}</li>
          ))}
        </ol>
      </section>

      <section className="mb-8 rounded-xl border border-indigo-200 bg-indigo-50 p-5">
        <h2 className="text-lg font-bold text-surface-900 mb-2">Significant Period</h2>
        <p className="text-surface-700 text-sm leading-relaxed">{g.significantPeriod}</p>
      </section>

      <section className="mb-10 rounded-xl border border-amber-200 bg-amber-50 p-5">
        <h2 className="text-lg font-bold text-surface-900 mb-2">Temple Associations</h2>
        <p className="text-surface-700 text-sm leading-relaxed">{g.templeAssociation}</p>
        <div className="mt-3">
          <Link href="/temples" className="text-sm text-amber-800 font-semibold hover:underline">Browse temples →</Link>
        </div>
      </section>

      <nav className="flex items-center justify-between gap-3 pt-6 border-t border-surface-200">
        {prev ? (
          <Link
            href={`/nava-graha/${prev.slug}`}
            className="text-sm text-saffron-700 hover:underline"
          >
            ← {prev.sanskritName}
          </Link>
        ) : (
          <span />
        )}
        <Link href="/nava-graha" className="text-sm text-surface-600 hover:text-saffron-700">
          All 9 grahas
        </Link>
        {next ? (
          <Link
            href={`/nava-graha/${next.slug}`}
            className="text-sm text-saffron-700 hover:underline"
          >
            {next.sanskritName} →
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </main>
  );
}
