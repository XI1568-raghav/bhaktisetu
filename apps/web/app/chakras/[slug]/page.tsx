import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CHAKRAS, getChakra } from '../../../lib/chakras';
// CI-05: every encyclopedia detail page ends somewhere a devotee can act.
import { detailCta } from '../../../lib/detail-route-cta';
import { buttonClass } from '../../../components/ui/button-recipe';

export const revalidate = 86400;

const BASE_URL = 'https://darshya.online';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const c = getChakra(slug);
  if (!c) return { title: 'Chakra not found' };

  const title = `${c.english} (${c.iast}) — Bija Mantra ${c.bijaMantra}, ${c.presidingDeity.split(' (')[0]}`;
  const description = `${c.english}: ${c.location}. Element ${c.element}, ${c.petals} petals, bija ${c.bijaMantra}. Presiding deity ${c.presidingDeity}. Awakening practice, yoga, meditation, psychological themes.`;

  return {
    title,
    description,
    alternates: { canonical: `${BASE_URL}/chakras/${c.slug}` },
    openGraph: {
      title: `${c.english} (${c.iast}) — Chakra #${c.number}`,
      description,
      url: `${BASE_URL}/chakras/${c.slug}`,
      type: 'article',
      images: ['/og/default.png'],
    },
  };
}

function jsonLd(c: NonNullable<ReturnType<typeof getChakra>>) {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
        { '@type': 'ListItem', position: 2, name: 'Chakras', item: `${BASE_URL}/chakras` },
        { '@type': 'ListItem', position: 3, name: `${c.english} (${c.iast})`, item: `${BASE_URL}/chakras/${c.slug}` },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: `${c.english} (${c.iast}) — Chakra #${c.number} of 7`,
      description: c.governs,
      author: { '@type': 'Organization', name: 'Darshya' },
      publisher: { '@type': 'Organization', name: 'Darshya' },
      datePublished: '2026-06-04',
      mainEntityOfPage: `${BASE_URL}/chakras/${c.slug}`,
    },
  ];
}

const COLOR_STYLE: Record<string, { border: string; bg: string; text: string; chip: string; ring: string }> = {
  Red: { border: 'border-red-300', bg: 'bg-red-50', text: 'text-red-900', chip: 'bg-red-600 text-white', ring: 'ring-red-300' },
  Orange: { border: 'border-orange-300', bg: 'bg-orange-50', text: 'text-orange-900', chip: 'bg-orange-500 text-white', ring: 'ring-orange-300' },
  Yellow: { border: 'border-yellow-300', bg: 'bg-yellow-50', text: 'text-yellow-900', chip: 'bg-yellow-500 text-white', ring: 'ring-yellow-300' },
  Green: { border: 'border-emerald-300', bg: 'bg-emerald-50', text: 'text-emerald-900', chip: 'bg-emerald-700 text-white', ring: 'ring-emerald-300' },
  Blue: { border: 'border-sky-300', bg: 'bg-sky-50', text: 'text-sky-900', chip: 'bg-sky-600 text-white', ring: 'ring-sky-300' },
  Indigo: { border: 'border-indigo-300', bg: 'bg-indigo-50', text: 'text-indigo-900', chip: 'bg-indigo-600 text-white', ring: 'ring-indigo-300' },
  Violet: { border: 'border-violet-300', bg: 'bg-violet-50', text: 'text-violet-900', chip: 'bg-violet-600 text-white', ring: 'ring-violet-300' },
};

const FALLBACK_STYLE: { border: string; bg: string; text: string; chip: string; ring: string } = {
  border: 'border-violet-300',
  bg: 'bg-violet-50',
  text: 'text-violet-900',
  chip: 'bg-violet-600 text-white',
  ring: 'ring-violet-300',
};

function colorStyle(color: string): { border: string; bg: string; text: string; chip: string; ring: string } {
  const first = color.split(/[\s(/]/)[0];
  const matched = first ? COLOR_STYLE[first] : undefined;
  return matched ?? FALLBACK_STYLE;
}

export default async function ChakraDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const c = getChakra(slug);
  if (!c) notFound();

  const style = colorStyle(c.color);

  // Mod-7 prev/next navigation (wrap both ends so user can cycle Muladhara ↔ Sahasrara).
  // idx is always >= 0 here because we `notFound()` above if `c` (found via getChakra)
  // is missing, and getChakra matches a CHAKRAS entry — so the modular index always
  // resolves. The `?? c` fallback only satisfies TS under noUncheckedIndexedAccess.
  const idx = CHAKRAS.findIndex((x) => x.slug === c.slug);
  const prev = CHAKRAS[(idx - 1 + CHAKRAS.length) % CHAKRAS.length] ?? c;
  const next = CHAKRAS[(idx + 1) % CHAKRAS.length] ?? c;

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(c)) }}
      />

      <nav className="text-xs text-surface-600 mb-4">
        <Link href="/" className="hover:text-saffron-700">Home</Link>
        <span className="mx-1.5">/</span>
        <Link href="/chakras" className="hover:text-saffron-700">Chakras</Link>
        <span className="mx-1.5">/</span>
        <span className="text-surface-900">{c.english}</span>
      </nav>

      <header className={`mb-8 rounded-xl border ${style.border} ${style.bg} p-6`}>
        <div className="flex items-center gap-2 mb-2 text-xs text-surface-700 font-mono">
          <span>Chakra #{c.number} of 7</span>
        </div>
        <h1 className={`text-3xl sm:text-5xl font-bold ${style.text} mb-2 leading-tight`}>
          {c.english}
          <span className="text-surface-600 text-xl sm:text-2xl font-normal ml-3">
            {c.sanskrit} · {c.iast}
          </span>
        </h1>
        <p className="text-surface-700 text-base sm:text-lg italic mb-3">
          Location: {c.location}
        </p>
        <div className="flex flex-wrap gap-2">
          <span className={`text-xs font-bold px-3 py-1 rounded-full ${style.chip}`}>
            Bija: {c.bijaMantra}
          </span>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white border border-surface-300 text-surface-800">
            {c.petals} petals
          </span>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white border border-surface-300 text-surface-800">
            {c.element}
          </span>
        </div>
      </header>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <div className="rounded-lg border border-surface-200 bg-surface-50 p-3">
          <div className="text-xs text-surface-600 mb-0.5">Presiding Deity</div>
          <div className="font-bold text-surface-900 text-sm">{c.presidingDeity}</div>
        </div>
        <div className="rounded-lg border border-surface-200 bg-surface-50 p-3">
          <div className="text-xs text-surface-600 mb-0.5">Shakti Aspect</div>
          <div className="font-bold text-surface-900 text-sm">{c.shaktiAspect}</div>
        </div>
        <div className="rounded-lg border border-surface-200 bg-surface-50 p-3">
          <div className="text-xs text-surface-600 mb-0.5">Color</div>
          <div className="font-bold text-surface-900 text-sm">{c.color}</div>
        </div>
        <div className="rounded-lg border border-surface-200 bg-surface-50 p-3">
          <div className="text-xs text-surface-600 mb-0.5">Bija Mantra</div>
          <div className={`font-bold text-base ${style.text}`}>{c.bijaMantra}</div>
        </div>
      </section>

      <section className="mb-8 rounded-xl border border-surface-200 bg-white p-5">
        <h2 className="text-lg font-bold text-surface-900 mb-2">What This Chakra Governs</h2>
        <p className="text-surface-700 text-sm leading-relaxed">{c.governs}</p>
      </section>

      <section className="mb-8 rounded-xl border border-surface-200 bg-white p-5">
        <h2 className="text-lg font-bold text-surface-900 mb-3">Tantric Summary</h2>
        <p className="text-surface-700 text-sm sm:text-base leading-relaxed">{c.summary}</p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-5">
          <h2 className="text-base font-bold text-rose-900 mb-2">Imbalance Signs</h2>
          <ul className="text-sm text-surface-800 space-y-1.5 list-disc list-inside">
            {c.imbalanceSigns.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <h2 className="text-base font-bold text-emerald-900 mb-2">Balanced Signs</h2>
          <ul className="text-sm text-surface-800 space-y-1.5 list-disc list-inside">
            {c.balancedSigns.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mb-8 rounded-xl border border-indigo-200 bg-indigo-50 p-5">
        <h2 className="text-lg font-bold text-indigo-900 mb-3">Yoga Practices</h2>
        <div className="flex flex-wrap gap-2">
          {c.yogaPractices.map((y) => (
            <span
              key={y}
              className="px-3 py-1 text-sm bg-white border border-indigo-300 text-indigo-800 rounded-full"
            >
              {y}
            </span>
          ))}
        </div>
      </section>

      <section className={`mb-8 rounded-xl border ${style.border} ${style.bg} p-5`}>
        <h2 className={`text-lg font-bold ${style.text} mb-2`}>Meditation Focus</h2>
        <p className="text-surface-700 text-sm leading-relaxed">{c.meditationFocus}</p>
      </section>

      <section className="mb-8 rounded-xl border border-amber-200 bg-amber-50 p-5">
        <h2 className="text-base font-bold text-amber-900 mb-2">Associated Food</h2>
        <p className="text-surface-700 text-sm leading-relaxed">{c.associatedFood}</p>
      </section>

      <section className="mb-10 rounded-xl border border-saffron-200 bg-saffron-50 p-5">
        <h2 className="text-lg font-bold text-saffron-900 mb-2">Awakening Path</h2>
        <p className="text-surface-700 text-sm leading-relaxed">{c.awakeningPath}</p>
      </section>

      <section className="mb-10 rounded-xl border border-saffron-200 bg-saffron-50 p-6 text-center">
        <h2 className="text-xl font-bold text-surface-900 mb-2">
          Deepen {c.english.toLowerCase()} practice
        </h2>
        <p className="text-surface-700 text-sm mb-4">
          Pair the {c.bijaMantra} bija with a sacred mantra recitation or yoga sutra study.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            href="/chants"
            className={buttonClass('primary', 'md')}
          >
            Sacred mantras →
          </Link>
          <Link
            href="/yoga-sutras"
            className="inline-block px-5 py-2 border border-saffron-600 text-saffron-700 rounded-md text-sm font-semibold hover:bg-saffron-50"
          >
            Yoga Sutras
          </Link>
        </div>
      </section>

      <nav className="flex items-center justify-between gap-3 pt-6 border-t border-surface-200">
        <Link
          href={`/chakras/${prev.slug}`}
          className="text-sm text-saffron-700 hover:underline"
        >
          ← {prev.english} ({prev.iast})
        </Link>
        <Link href="/chakras" className="text-sm text-surface-600 hover:text-saffron-700">
          All 7 chakras
        </Link>
        <Link
          href={`/chakras/${next.slug}`}
          className="text-sm text-saffron-700 hover:underline"
        >
          {next.english} ({next.iast}) →
        </Link>
      </nav>
      {detailCta({
        routePrefix: 'chakras',
        subject: c.english,
      })}
    </main>
  );
}
