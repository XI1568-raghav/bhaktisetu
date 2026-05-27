// Per-chalisa page — significance + benefits + opening verses + meaning.
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BookOpen, Clock, ChevronRight, ArrowRight, CheckCircle2, ExternalLink } from 'lucide-react';
import { CHALISAS, getChalisa } from '../../../lib/chalisas';

export const runtime = 'edge';
export const revalidate = 86400;

interface Params {
  params: { slug: string };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const c = getChalisa(params.slug);
  if (!c) return { title: 'Chalisa — Darshya' };
  return {
    title: `${c.name} — Lyrics, Meaning, Benefits — Darshya`,
    description: `${c.name} (${c.sanskrit}) by ${c.composer}. Full significance, benefits, opening verses with meaning. Recited ${c.whenRecited.toLowerCase()}.`,
    alternates: { canonical: `https://darshya.online/chalisa/${c.slug}` },
    openGraph: {
      title: `${c.name} — ${c.sanskrit}`,
      description: c.description,
      url: `https://darshya.online/chalisa/${c.slug}`,
      type: 'article',
      images: ['/og/default'],
    },
  };
}

export default function ChalisaPage({ params }: Params) {
  const c = getChalisa(params.slug);
  if (!c) notFound();

  const otherChalisas = CHALISAS.filter((x) => x.slug !== c.slug);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${c.name} — Lyrics with Meaning and Benefits`,
    author: { '@type': 'Person', name: c.composer },
    publisher: { '@type': 'Organization', name: 'Darshya' },
    description: c.description,
    mainEntityOfPage: `https://darshya.online/chalisa/${c.slug}`,
    about: { '@type': 'Thing', name: c.deity },
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
        <Link href="/chalisa" className="hover:text-saffron-700">Chalisa</Link>
        <span className="mx-2">/</span>
        <span className="text-surface-900">{c.name}</span>
      </nav>

      <header className="mb-8 text-center">
        <div className="inline-flex items-center gap-2 mb-3">
          <BookOpen className="w-5 h-5 text-saffron-600" />
          <span className="text-xs font-semibold uppercase tracking-wider text-saffron-700">
            Chalisa to {c.deity}
          </span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-surface-900 mb-2">{c.name}</h1>
        <p className="text-3xl font-serif text-saffron-700 mb-4">{c.sanskrit}</p>
        <p className="text-base text-surface-700 max-w-2xl mx-auto mb-4">{c.description}</p>
        <div className="inline-flex flex-wrap items-center justify-center gap-4 text-xs text-surface-500">
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3 h-3" /> {c.durationMinutes} min
          </span>
          <span>By {c.composer}</span>
          <span>{c.composedIn}</span>
        </div>
      </header>

      <section className="mb-8 rounded-2xl bg-surface-50 border border-surface-200 p-6">
        <h2 className="text-xl font-bold text-surface-900 mb-3">Significance</h2>
        <p className="text-base text-surface-800 leading-relaxed mb-4">{c.significance}</p>
        <p className="text-sm text-surface-600">
          <strong className="text-surface-900">When recited:</strong> {c.whenRecited}
        </p>
      </section>

      <section className="mb-8 rounded-2xl bg-white border border-surface-200 p-6">
        <h2 className="text-xl font-bold text-surface-900 mb-4">Benefits</h2>
        <ul className="space-y-2">
          {c.benefits.map((b, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-surface-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-8 rounded-2xl bg-gradient-to-br from-amber-50 via-saffron-50 to-amber-50 border border-saffron-200 p-6 sm:p-8">
        <h2 className="text-xl font-bold text-surface-900 mb-2">Opening verses</h2>
        <p className="text-xs text-surface-500 mb-4 italic">
          First {c.excerpt.length} verses of the {c.name} — the most-recited opening section.
        </p>
        <div className="space-y-3">
          {c.excerpt.map((line, i) => (
            <p key={i} className="text-lg sm:text-xl font-serif text-saffron-900 leading-relaxed text-center">
              {line}
            </p>
          ))}
        </div>
      </section>

      <section className="mb-8 rounded-2xl bg-white border border-surface-200 p-6 sm:p-8">
        <h2 className="text-xl font-bold text-surface-900 mb-3">Meaning</h2>
        <p className="text-base text-surface-800 leading-relaxed">{c.excerptMeaning}</p>
      </section>

      {c.externalSources.length > 0 ? (
        <section className="mb-8 rounded-2xl bg-amber-50/50 border border-amber-200 p-6">
          <h2 className="text-base font-semibold text-surface-900 mb-2">
            For complete authoritative text
          </h2>
          <p className="text-sm text-surface-700 mb-3">
            Refer to printed editions from these sources for the full 40-verse chalisa with traditional pronunciation guides:
          </p>
          <div className="space-y-1">
            {c.externalSources.map((s, i) => (
              <a
                key={i}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-saffron-700 hover:underline"
              >
                {s.label} <ExternalLink className="w-3 h-3" />
              </a>
            ))}
          </div>
        </section>
      ) : null}

      {c.relatedPujas.length > 0 ? (
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-surface-900 mb-4">Related pujas you can book</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {c.relatedPujas.map((slug) => (
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

      {c.deitySlug ? (
        <section className="mb-8 rounded-2xl bg-gradient-to-r from-saffron-50 to-amber-50 border border-saffron-200 p-6 text-center">
          <h2 className="text-lg font-bold text-surface-900 mb-2">
            Learn more about {c.deity}
          </h2>
          <Link
            href={`/deity/${c.deitySlug}`}
            className="inline-flex items-center gap-1.5 text-saffron-700 font-semibold hover:underline"
          >
            {c.deity} pujas, mantras, and festivals <ChevronRight className="w-4 h-4" />
          </Link>
        </section>
      ) : null}

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-surface-900 mb-4">More chalisas</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {otherChalisas.map((x) => (
            <Link
              key={x.slug}
              href={`/chalisa/${x.slug}`}
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
