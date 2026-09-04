import type { Metadata } from 'next';
// DU-05: the one h1 recipe per page archetype. Extras are layout-only.
import { H1 } from '../../../components/ui/heading-recipe';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { UPANISHADS, upanishadSlugs, getUpanishad } from '../../../lib/upanishads';
// CI-05: every encyclopedia detail page ends somewhere a devotee can act.
import { detailCta } from '../../../lib/detail-route-cta';

export const revalidate = 86400;
export const dynamicParams = false;

const BASE_URL = 'https://darshya.online';

export function generateStaticParams() {
  return upanishadSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const u = getUpanishad(slug);
  if (!u) return { title: 'Not found' };
  return {
    title: `${u.name} (${u.sanskrit}) — Summary, Mahavakya, Key Verses`,
    description: `${u.name} from the ${u.veda} Veda. ${u.centralTheme}. ${u.summary.slice(0, 120)}`,
    alternates: { canonical: `${BASE_URL}/upanishads/${u.slug}` },
    openGraph: {
      images: ['/images/golden-temple-og.jpg'],
      title: `${u.name} — ${u.centralTheme}`,
      description: u.summary.slice(0, 160),
      url: `${BASE_URL}/upanishads/${u.slug}`,
      type: 'article',
    },
  };
}

export default async function UpanishadPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const u = getUpanishad(slug);
  if (!u) notFound();

  const idx = UPANISHADS.findIndex((x) => x.slug === u.slug);
  const prev = idx > 0 ? UPANISHADS[idx - 1] : undefined;
  const next = idx < UPANISHADS.length - 1 ? UPANISHADS[idx + 1] : undefined;

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${u.name} — Sanskrit, Summary, Mahavakya`,
    description: u.summary,
    author: { '@type': 'Organization', name: 'Darshya' },
    publisher: { '@type': 'Organization', name: 'Darshya' },
    datePublished: '2026-05-27',
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Upanishads', item: `${BASE_URL}/upanishads` },
      { '@type': 'ListItem', position: 3, name: u.name, item: `${BASE_URL}/upanishads/${u.slug}` },
    ],
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([ld, breadcrumb]) }} />

      <nav className="mb-6 text-xs text-gray-500">
        <Link href="/" className="hover:text-gray-800">Home</Link>
        <span className="mx-1.5">›</span>
        <Link href="/upanishads" className="hover:text-gray-800">Upanishads</Link>
        <span className="mx-1.5">›</span>
        <span className="text-gray-800">{u.name}</span>
      </nav>

      <header className="mb-8 rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-saffron-50 p-6">
        <p className="text-xs uppercase tracking-wider text-indigo-700">{u.veda} Veda · {u.vedaShakha}{u.mantraCount > 0 ? ` · ${u.mantraCount} mantras` : ''}</p>
        <h1 className={`${H1.catalogue} mt-2`}>{u.sanskrit}</h1>
        <p className="mt-1 text-2xl font-bold text-gray-900">{u.name}</p>
        <p className="mt-1 italic text-sm text-gray-600">{u.iast}</p>
        <p className="mt-3 text-sm text-gray-700"><span className="font-semibold">Central theme:</span> {u.centralTheme}</p>
      </header>

      {u.mahavakya && (
        <section className="mb-8 rounded-2xl border border-saffron-300 bg-saffron-50/70 p-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-saffron-800">Mahavakya</p>
          <p className="mt-3 font-serif text-3xl text-saffron-900">{u.mahavakya.sanskrit}</p>
          <p className="mt-2 italic text-sm text-saffron-800">{u.mahavakya.iast}</p>
          <p className="mt-3 text-base font-semibold text-gray-900">&ldquo;{u.mahavakya.translation}&rdquo;</p>
          <p className="mt-2 text-xs text-saffron-700">— {u.mahavakya.reference}</p>
        </section>
      )}

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-bold text-gray-900">Summary</h2>
        <p className="text-base leading-relaxed text-gray-700">{u.summary}</p>
      </section>

      <section className="mb-8 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-6">
        <h2 className="text-base font-semibold text-emerald-900">Key concepts</h2>
        <ul className="mt-3 space-y-1.5 text-sm text-emerald-900/90">
          {u.keyConcepts.map((c) => (
            <li key={c} className="flex gap-2">
              <span className="text-emerald-500">●</span>
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-bold text-gray-900">Famous verse</h2>
        <article className="rounded-2xl border border-gray-200 bg-white p-6">
          <p className="text-xs uppercase tracking-wider text-saffron-700">{u.famousVerse.reference}</p>
          <p className="mt-3 font-serif text-xl leading-relaxed text-gray-900">{u.famousVerse.sanskrit}</p>
          <p className="mt-3 italic text-sm text-gray-600">{u.famousVerse.iast}</p>
          <p className="mt-3 text-base text-gray-800">{u.famousVerse.translation}</p>
        </article>
      </section>

      <section className="mb-8 rounded-2xl border border-amber-200 bg-amber-50/40 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-amber-800">Takeaway</h2>
        <p className="mt-2 text-base italic text-amber-900">{u.takeaway}</p>
      </section>

      <nav className="mt-10 grid gap-3 sm:grid-cols-2">
        {prev ? (
          <Link href={`/upanishads/${prev.slug}`} className="rounded-xl border border-gray-200 bg-white p-4 hover:border-saffron-300 hover:bg-saffron-50">
            <div className="text-xs uppercase text-gray-500">← Previous</div>
            <div className="mt-0.5 text-sm font-semibold text-gray-900">{prev.name}</div>
            <div className="font-serif text-xs text-gray-600">{prev.sanskrit}</div>
          </Link>
        ) : <span />}
        {next ? (
          <Link href={`/upanishads/${next.slug}`} className="rounded-xl border border-gray-200 bg-white p-4 text-right hover:border-saffron-300 hover:bg-saffron-50">
            <div className="text-xs uppercase text-gray-500">Next →</div>
            <div className="mt-0.5 text-sm font-semibold text-gray-900">{next.name}</div>
            <div className="font-serif text-xs text-gray-600">{next.sanskrit}</div>
          </Link>
        ) : (
          <Link href="/upanishads" className="rounded-xl border border-saffron-200 bg-saffron-50 p-4 text-right hover:bg-saffron-100">
            <div className="text-xs uppercase text-saffron-700">← Back to index</div>
            <div className="mt-0.5 text-sm font-semibold text-saffron-900">All {UPANISHADS.length} Upanishads</div>
          </Link>
        )}
      </nav>

      <section className="mt-10 rounded-2xl border border-gray-200 bg-white p-6">
        {/* CI-14: this list renders every record, so it cannot be labelled
            "10 principal" — the ten are marked individually on the index. */}
        <h2 className="text-base font-semibold text-gray-900">All {UPANISHADS.length} Upanishads</h2>
        <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
          {UPANISHADS.map((uu) => (
            <Link
              key={uu.slug}
              href={`/upanishads/${uu.slug}`}
              className={`rounded-lg border px-2.5 py-1 font-medium ${
                uu.slug === u.slug
                  ? 'border-saffron-500 bg-saffron-100 text-saffron-900'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-saffron-300 hover:bg-saffron-50'
              }`}
            >
              {uu.name.replace(' Upanishad', '')}
            </Link>
          ))}
        </div>
      </section>
      {detailCta({
        routePrefix: 'upanishads',
        subject: u.name,
      })}
    </main>
  );
}
