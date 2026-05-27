// Per-deity mantra collection sub-page. Long-tail: "shiva mantras", "lakshmi beej mantra".
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight, Repeat, Sparkles, BookOpen } from 'lucide-react';
import { getDeity, DEITIES } from '../../../../lib/deities';
import { getMantrasForDeity, deitiesWithMantras } from '../../../../lib/deity-mantras';

export const runtime = 'edge';
export const revalidate = 86400;
export const dynamicParams = false;

export async function generateStaticParams() {
  return deitiesWithMantras().map((slug) => ({ slug }));
}

interface Params {
  params: { slug: string };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const d = getDeity(params.slug);
  const mantras = getMantrasForDeity(params.slug);
  if (!d || mantras.length === 0) return { title: 'Mantras — Darshya' };
  return {
    title: `${d.name} Mantras — Sanskrit, Meaning, Benefits — Darshya`,
    description: `${mantras.length} sacred mantras for ${d.name} (${d.sanskrit}) — Panchakshari, Gayatri, Beej and more with Sanskrit, transliteration, meaning, and benefits.`,
    alternates: { canonical: `https://darshya.online/deity/${d.slug}/mantras` },
    openGraph: {
      title: `${d.name} Mantras Collection`,
      description: `Recitation guide for ${mantras.length} ${d.name} mantras with meanings.`,
      url: `https://darshya.online/deity/${d.slug}/mantras`,
      type: 'article',
      images: ['/og/default'],
    },
  };
}

const TYPE_LABELS: Record<string, string> = {
  beej: 'Beej Mantra',
  gayatri: 'Gayatri',
  moola: 'Moola Mantra',
  panchakshari: 'Panchakshari',
  ashtakshari: 'Ashtakshari',
  invocation: 'Invocation',
  sahasranama: 'Sahasranama',
  praise: 'Praise / Stotra',
};

export default function DeityMantrasPage({ params }: Params) {
  const d = getDeity(params.slug);
  const mantras = getMantrasForDeity(params.slug);
  if (!d || mantras.length === 0) notFound();

  const otherDeities = DEITIES.filter(
    (x) => x.slug !== d.slug && deitiesWithMantras().includes(x.slug),
  );

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${d.name} Mantras Collection`,
    author: { '@type': 'Organization', name: 'Darshya' },
    publisher: { '@type': 'Organization', name: 'Darshya' },
    description: `${mantras.length} sacred mantras for ${d.name} with Sanskrit, transliteration, meaning, and benefits.`,
    mainEntityOfPage: `https://darshya.online/deity/${d.slug}/mantras`,
    about: { '@type': 'Thing', name: d.name },
  };

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav className="text-sm text-surface-600 mb-4">
        <Link href="/" className="hover:text-saffron-700">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/deity" className="hover:text-saffron-700">Deities</Link>
        <span className="mx-2">/</span>
        <Link href={`/deity/${d.slug}`} className="hover:text-saffron-700">{d.name}</Link>
        <span className="mx-2">/</span>
        <span className="text-surface-900">Mantras</span>
      </nav>

      <header className="mb-8 text-center">
        <div className="inline-flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-saffron-600" />
          <span className="text-xs font-semibold uppercase tracking-wider text-saffron-700">
            Sacred Mantras
          </span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-surface-900 mb-2">
          {d.name} Mantras
        </h1>
        <p className="text-3xl font-serif text-saffron-700 mb-4">{d.sanskrit}</p>
        <p className="text-base text-surface-700 max-w-2xl mx-auto">
          {mantras.length} authoritative mantras for {d.name} — chanted for centuries by sadhakas. Each with Sanskrit, transliteration, meaning and recitation guide.
        </p>
      </header>

      <section className="mb-8 rounded-2xl bg-saffron-50 border border-saffron-200 p-5 text-sm text-surface-800">
        <h2 className="font-semibold text-surface-900 mb-2">How to recite</h2>
        <ul className="space-y-1 list-disc pl-5">
          <li>Sit facing east or north; spine straight; eyes closed or soft-focused.</li>
          <li>Count repetitions on a 108-bead mala (one round = 108).</li>
          <li>Morning brahma muhurta (4-6 AM) is most potent. Daily consistency &gt; intensity.</li>
          <li>Beej mantras require initiation (diksha) from a guru for full effect.</li>
        </ul>
      </section>

      <div className="space-y-6 mb-10">
        {mantras.map((m, i) => (
          <article
            key={i}
            className="rounded-2xl border border-surface-200 bg-white p-6 sm:p-8"
          >
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="inline-block px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-amber-800 bg-amber-100 rounded-full">
                {TYPE_LABELS[m.type] || m.type}
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-surface-500">
                <Repeat className="w-3 h-3" /> {m.recommendedRepetitions}x
              </span>
            </div>

            <div className="rounded-xl bg-gradient-to-br from-amber-50 via-saffron-50 to-amber-50 border border-saffron-200 p-5 mb-4">
              <p className="text-xl sm:text-2xl font-serif text-saffron-900 leading-relaxed whitespace-pre-line text-center">
                {m.sanskrit}
              </p>
            </div>

            <p className="text-sm italic text-surface-700 text-center mb-4">
              {m.transliteration}
            </p>

            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-surface-500 mb-1">Meaning</h3>
                <p className="text-surface-800 leading-relaxed">{m.meaning}</p>
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-surface-500 mb-1">Benefit</h3>
                <p className="text-surface-800 leading-relaxed">{m.benefit}</p>
              </div>
            </div>
          </article>
        ))}
      </div>

      <section className="mb-8 rounded-2xl bg-gradient-to-r from-saffron-50 to-amber-50 border border-saffron-200 p-6 text-center">
        <h2 className="text-lg font-bold text-surface-900 mb-2">
          Book a {d.name} puja with a verified pandit
        </h2>
        <p className="text-sm text-surface-700 mb-4">
          Trained pandits chant these mantras on your behalf with mandatory video proof.
        </p>
        <Link
          href={`/deity/${d.slug}`}
          className="inline-flex items-center gap-1.5 px-5 py-2 bg-saffron-600 text-white rounded-md text-sm font-semibold hover:bg-saffron-700"
        >
          {d.name} pujas <ChevronRight className="w-4 h-4" />
        </Link>
      </section>

      <section className="mb-8 rounded-2xl bg-surface-50 border border-surface-200 p-6 text-center">
        <div className="inline-flex items-center gap-2 mb-2">
          <BookOpen className="w-4 h-4 text-saffron-600" />
          <h2 className="text-base font-semibold text-surface-900">Looking for chalisas and aartis?</h2>
        </div>
        <div className="inline-flex flex-wrap items-center justify-center gap-3 text-sm">
          <Link href="/chalisa" className="text-saffron-700 hover:underline font-semibold">
            All chalisas →
          </Link>
          <Link href="/aarti" className="text-saffron-700 hover:underline font-semibold">
            All aartis →
          </Link>
          <Link href="/shlokas" className="text-saffron-700 hover:underline font-semibold">
            Shloka library →
          </Link>
        </div>
      </section>

      {otherDeities.length > 0 ? (
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-surface-900 mb-4">Mantras for other deities</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {otherDeities.map((x) => (
              <Link
                key={x.slug}
                href={`/deity/${x.slug}/mantras`}
                className="flex flex-col rounded-lg border border-surface-200 bg-white p-3 hover:border-saffron-300 hover:bg-saffron-50 transition"
              >
                <span className="text-sm font-semibold text-surface-900 truncate">{x.name}</span>
                <span className="text-xs text-surface-500 truncate">{x.sanskrit}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
