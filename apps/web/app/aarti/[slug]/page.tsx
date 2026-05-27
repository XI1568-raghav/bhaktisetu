// Per-aarti page — full lyrics + meaning + cross-links to related pujas.
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Music, Clock, ChevronRight, ArrowRight, Flame } from 'lucide-react';
import { AARTIS, getAarti } from '../../../lib/aartis';

export const runtime = 'edge';
export const revalidate = 86400;

interface Params {
  params: { slug: string };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const a = getAarti(params.slug);
  if (!a) return { title: 'Aarti — Darshya' };
  return {
    title: `${a.name} Lyrics — Hindi + English + Meaning — Darshya`,
    description: `Full lyrics of ${a.name} in Devanagari and English transliteration with meaning. Sung ${a.whenSung.toLowerCase()}.`,
    alternates: { canonical: `https://darshya.online/aarti/${a.slug}` },
    openGraph: {
      title: `${a.name} — ${a.sanskrit}`,
      description: a.description,
      url: `https://darshya.online/aarti/${a.slug}`,
      type: 'article',
      images: ['/og/default'],
    },
  };
}

export default function AartiPage({ params }: Params) {
  const a = getAarti(params.slug);
  if (!a) notFound();

  const otherAartis = AARTIS.filter((x) => x.slug !== a.slug).slice(0, 6);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${a.name} Lyrics with Meaning`,
    author: { '@type': 'Organization', name: 'Darshya' },
    publisher: { '@type': 'Organization', name: 'Darshya' },
    description: a.description,
    mainEntityOfPage: `https://darshya.online/aarti/${a.slug}`,
    about: { '@type': 'Thing', name: a.deity },
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
        <Link href="/aarti" className="hover:text-saffron-700">Aarti</Link>
        <span className="mx-2">/</span>
        <span className="text-surface-900">{a.name}</span>
      </nav>

      <header className="mb-8 text-center">
        <div className="inline-flex items-center gap-2 mb-3">
          <Music className="w-5 h-5 text-saffron-600" />
          <span className="text-xs font-semibold uppercase tracking-wider text-saffron-700">
            Aarti to {a.deity}
          </span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-surface-900 mb-2">{a.name}</h1>
        <p className="text-3xl font-serif text-saffron-700 mb-4">{a.sanskrit}</p>
        <p className="text-base text-surface-700 max-w-2xl mx-auto mb-4">{a.description}</p>
        <div className="inline-flex items-center gap-4 text-xs text-surface-500">
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3 h-3" /> {a.durationMinutes} min
          </span>
          <span>{a.whenSung}</span>
        </div>
      </header>

      <section className="mb-8 rounded-2xl bg-gradient-to-br from-amber-50 via-saffron-50 to-amber-50 border border-saffron-200 p-6 sm:p-8">
        <h2 className="text-xl font-bold text-surface-900 mb-4 flex items-center gap-2">
          <Flame className="w-5 h-5 text-saffron-600" /> Lyrics (Devanagari)
        </h2>
        <div className="space-y-3">
          {a.lyricsHindi.map((line, i) => (
            <p key={i} className="text-xl sm:text-2xl font-serif text-saffron-900 leading-relaxed text-center">
              {line}
            </p>
          ))}
        </div>
      </section>

      <section className="mb-8 rounded-2xl bg-white border border-surface-200 p-6 sm:p-8">
        <h2 className="text-xl font-bold text-surface-900 mb-4">English Transliteration</h2>
        <div className="space-y-2">
          {a.lyricsTransliteration.map((line, i) => (
            <p key={i} className="text-base text-surface-800 italic leading-relaxed text-center">
              {line}
            </p>
          ))}
        </div>
      </section>

      <section className="mb-8 rounded-2xl bg-surface-50 border border-surface-200 p-6 sm:p-8">
        <h2 className="text-xl font-bold text-surface-900 mb-3">Meaning</h2>
        <p className="text-base text-surface-800 leading-relaxed">{a.meaning}</p>
      </section>

      {a.relatedPujas.length > 0 ? (
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-surface-900 mb-4">Book a related puja</h2>
          <p className="text-sm text-surface-600 mb-4">
            Pujas where this aarti is traditionally sung.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {a.relatedPujas.map((slug) => (
              <Link
                key={slug}
                href={`/pujas/${slug}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-surface-200 bg-white p-4 hover:border-saffron-300 hover:bg-saffron-50 transition"
              >
                <span className="font-semibold text-surface-900 capitalize">
                  {slug.replace(/-/g, ' ')}
                </span>
                <ArrowRight className="w-4 h-4 text-saffron-600 flex-shrink-0" />
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {a.deitySlug ? (
        <section className="mb-8 rounded-2xl bg-gradient-to-r from-saffron-50 to-amber-50 border border-saffron-200 p-6 text-center">
          <h2 className="text-lg font-bold text-surface-900 mb-2">
            Learn more about {a.deity}
          </h2>
          <Link
            href={`/deity/${a.deitySlug}`}
            className="inline-flex items-center gap-1.5 text-saffron-700 font-semibold hover:underline"
          >
            {a.deity} pujas, mantras, and festivals <ChevronRight className="w-4 h-4" />
          </Link>
        </section>
      ) : null}

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-surface-900 mb-4">More aartis</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {otherAartis.map((x) => (
            <Link
              key={x.slug}
              href={`/aarti/${x.slug}`}
              className="flex flex-col rounded-lg border border-surface-200 bg-white p-3 hover:border-saffron-300 hover:bg-saffron-50 transition"
            >
              <span className="text-sm font-semibold text-surface-900 truncate">{x.name}</span>
              <span className="text-xs text-surface-500 truncate">{x.deity}</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
