import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DASHAVATAR, avatarSlugs, getAvatar, YUGA_LABELS } from '../../../lib/dashavatar';

export const revalidate = 86400;
export const dynamicParams = false;

const BASE_URL = 'https://darshya.online';

export function generateStaticParams() {
  return avatarSlugs().map((slug) => ({ slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const a = getAvatar(slug);
  if (!a) return { title: 'Not found' };
  return {
    title: `${a.name} (${a.sanskrit}) — Avatar #${a.number} of Vishnu`,
    description: `${a.name}, the ${a.number}${a.number === 1 ? 'st' : a.number === 2 ? 'nd' : a.number === 3 ? 'rd' : 'th'} avatara of Vishnu in ${YUGA_LABELS[a.yuga]}. ${a.bestKnownFor}.`,
    alternates: { canonical: `${BASE_URL}/dashavatar/${a.slug}` },
    openGraph: {
      images: ['/images/golden-temple-og.jpg'],
      title: `${a.name} — ${a.bestKnownFor}`,
      description: a.purpose.slice(0, 180),
      url: `${BASE_URL}/dashavatar/${a.slug}`,
      type: 'article',
    },
  };
}

export default async function AvatarDetailPage({ params }: Props) {
  const { slug } = await params;
  const a = getAvatar(slug);
  if (!a) notFound();

  const idx = DASHAVATAR.findIndex((x) => x.slug === a.slug);
  const prev = idx > 0 ? DASHAVATAR[idx - 1] : null;
  const next = idx < DASHAVATAR.length - 1 ? DASHAVATAR[idx + 1] : null;

  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${a.name} — Avatar #${a.number} of Vishnu`,
    description: a.bestKnownFor,
    author: { '@type': 'Organization', name: 'Darshya' },
    publisher: { '@type': 'Organization', name: 'Darshya' },
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Dashavatar', item: `${BASE_URL}/dashavatar` },
      { '@type': 'ListItem', position: 3, name: a.name, item: `${BASE_URL}/dashavatar/${a.slug}` },
    ],
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([article, breadcrumb]) }} />

      <nav className="mb-4 text-sm text-gray-600">
        <Link href="/" className="hover:underline">Home</Link> <span className="mx-1">/</span>
        <Link href="/dashavatar" className="hover:underline">Dashavatar</Link> <span className="mx-1">/</span>
        <span>{a.name}</span>
      </nav>

      <header className="mb-8 rounded-xl bg-gradient-to-br from-saffron-50 via-amber-50 to-rose-50 p-6 ring-1 ring-saffron-200">
        <div className="mb-2 flex flex-wrap items-baseline gap-3">
          <span className="rounded-full bg-saffron-600 px-3 py-1 text-sm font-semibold text-white">#{a.number} of 10</span>
          <span className="rounded-full bg-white px-3 py-1 text-sm text-amber-900 ring-1 ring-amber-300">{YUGA_LABELS[a.yuga]}</span>
        </div>
        <h1 className="text-3xl font-bold text-saffron-900 sm:text-4xl">{a.name}</h1>
        <p className="mt-1 text-2xl text-amber-900" lang="sa">{a.sanskrit}</p>
        <p className="mt-1 text-sm italic text-gray-600">{a.iast}</p>
        <p className="mt-3 text-gray-800"><strong>Form:</strong> {a.form}</p>
      </header>

      <section className="mb-8 rounded-lg border border-indigo-200 bg-indigo-50 p-5">
        <h2 className="mb-2 text-lg font-semibold text-indigo-900">Purpose</h2>
        <p className="text-gray-800">{a.purpose}</p>
      </section>

      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <section className="rounded-lg border border-rose-200 bg-rose-50 p-4">
          <h3 className="mb-1 text-sm font-semibold uppercase text-rose-900">Demon / threat</h3>
          <p className="text-sm text-gray-800">{a.demonOrThreat}</p>
        </section>
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <h3 className="mb-1 text-sm font-semibold uppercase text-amber-900">Weapons</h3>
          <ul className="text-sm text-gray-800">
            {a.weapons.map((w) => <li key={w}>• {w}</li>)}
          </ul>
        </section>
        {a.consort ? (
          <section className="rounded-lg border border-saffron-200 bg-saffron-50 p-4">
            <h3 className="mb-1 text-sm font-semibold uppercase text-saffron-900">Consort</h3>
            <p className="text-sm text-gray-800">{a.consort}</p>
          </section>
        ) : null}
        <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <h3 className="mb-1 text-sm font-semibold uppercase text-emerald-900">Associated tirthas</h3>
          <ul className="text-sm text-gray-800">
            {a.associatedTirthas.map((t) => <li key={t}>• {t}</li>)}
          </ul>
        </section>
      </div>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold text-saffron-900">Story</h2>
        <p className="text-gray-800 leading-relaxed">{a.storySummary}</p>
      </section>

      <section className="mb-8 rounded-lg border border-emerald-300 bg-emerald-50 p-5">
        <h2 className="mb-2 text-lg font-semibold text-emerald-900">Key teaching</h2>
        <p className="text-gray-800">{a.keyTeaching}</p>
      </section>

      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <section className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h3 className="mb-1 text-sm font-semibold uppercase text-gray-700">Principal scripture</h3>
          <p className="text-sm text-gray-800">{a.principalScripture}</p>
        </section>
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <h3 className="mb-1 text-sm font-semibold uppercase text-amber-900">Modern relevance</h3>
          <p className="text-sm text-gray-800">{a.modernRelevance}</p>
        </section>
      </div>

      <nav className="mt-10 flex justify-between gap-3 border-t border-gray-200 pt-5 text-sm">
        {prev ? (
          <Link href={`/dashavatar/${prev.slug}`} className="text-saffron-700 hover:underline">
            ← #{prev.number} {prev.name}
          </Link>
        ) : <span />}
        {next ? (
          <Link href={`/dashavatar/${next.slug}`} className="text-saffron-700 hover:underline text-right">
            #{next.number} {next.name} →
          </Link>
        ) : <span />}
      </nav>

      <section className="mt-8 rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="mb-2 text-sm font-semibold text-gray-700">Jump to any avatara</h3>
        <div className="flex flex-wrap gap-2 text-sm">
          {DASHAVATAR.map((x) => (
            <Link
              key={x.slug}
              href={`/dashavatar/${x.slug}`}
              className={`rounded-full px-3 py-1 ring-1 ${x.slug === a.slug ? 'bg-saffron-600 text-white ring-saffron-700' : 'bg-saffron-50 text-saffron-800 ring-saffron-200 hover:bg-saffron-100'}`}
            >
              #{x.number} {x.name}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
