import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SHLOKAS, getShloka, shlokaOgUrl } from '../../../lib/shlokas';
import { articleJsonLd, breadcrumbJsonLd } from '../../../lib/jsonld';
// CI-05: every encyclopedia detail page ends somewhere a devotee can act.
import { detailCta } from '../../../lib/detail-route-cta';
import { H1 } from '../../../components/ui/heading-recipe';

export const revalidate = 86400;
export const dynamicParams = false;

export async function generateStaticParams() {
  return SHLOKAS.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const s = getShloka(slug);
  if (!s) return { title: 'Shloka not found' };
  const url = `https://darshya.online/shlokas/${slug}`;
  const og = shlokaOgUrl(slug);
  const title = `${s.source} — Sanskrit Shloka with Meaning`;
  const desc =
    s.meaning.length > 160 ? s.meaning.slice(0, 157) + '...' : s.meaning;
  return {
    title,
    description: desc,
    alternates: { canonical: url },
    openGraph: {
      title,
      description: desc,
      url,
      type: 'article',
      images: [{ url: og, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: desc,
      images: [og],
    },
  };
}

export default async function ShlokaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const s = getShloka(slug);
  if (!s) notFound();

  const url = `https://darshya.online/shlokas/${slug}`;
  const og = shlokaOgUrl(slug);

  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            articleJsonLd({
              title: `${s.source} — ${s.meaning.slice(0, 60)}`,
              description: s.meaning,
              url,
              image: og,
            }),
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: 'Darshya', url: 'https://darshya.online' },
              { name: 'Shlokas', url: 'https://darshya.online/shlokas' },
              { name: s.source, url },
            ]),
          ),
        }}
      />

      <nav className="text-sm text-surface-600 mb-6">
        <Link href="/" className="hover:text-saffron-700">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/shlokas" className="hover:text-saffron-700">Shlokas</Link>
        <span className="mx-2">/</span>
        <span className="text-surface-900">{s.source}</span>
      </nav>

      <p className="text-saffron-700 text-sm font-medium mb-3 uppercase tracking-wider">
        {s.source}
      </p>

      <h1
        className={`${H1.catalogue} mb-6 whitespace-pre-line`}
        style={{ fontFamily: 'var(--font-noto-devanagari)' }}
      >
        {s.text}
      </h1>

      {s.translit ? (
        <p className="italic text-saffron-800 text-lg mb-6 whitespace-pre-line">
          {s.translit}
        </p>
      ) : null}

      <section className="prose prose-lg max-w-none mb-10">
        <h2 className="text-xl font-semibold text-surface-900 mb-3">Meaning</h2>
        <p className="text-surface-800 leading-relaxed">{s.meaning}</p>
      </section>

      <section className="border-t border-surface-200 pt-6 mb-10">
        <h2 className="text-sm uppercase tracking-wider text-surface-600 font-semibold mb-4">
          Share this shloka
        </h2>
        <div className="flex flex-wrap gap-3">
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
              s.meaning + ' — ' + s.source,
            )}&url=${encodeURIComponent(url)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-surface-900 text-white rounded-md text-sm font-medium hover:opacity-90"
          >
            Share on X
          </a>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(
              s.meaning + ' — ' + s.source + ' ' + url,
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:opacity-90"
          >
            Share on WhatsApp
          </a>
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:opacity-90"
          >
            Share on Facebook
          </a>
          <a
            href={og}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 border border-surface-300 text-surface-900 rounded-md text-sm font-medium hover:bg-surface-50"
          >
            Download card
          </a>
        </div>
      </section>

      <section className="border-t border-surface-200 pt-6">
        <h2 className="text-sm uppercase tracking-wider text-surface-600 font-semibold mb-4">
          Related
        </h2>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SHLOKAS.filter((x) => x.slug !== s.slug)
            .slice(0, 4)
            .map((x) => (
              <li key={x.slug}>
                <Link
                  href={`/shlokas/${x.slug}`}
                  className="block border border-surface-200 rounded-lg p-3 hover:shadow-sm"
                >
                  <p className="text-saffron-700 text-xs font-medium mb-1">
                    {x.source}
                  </p>
                  <p className="text-surface-700 text-sm line-clamp-2">
                    {x.meaning}
                  </p>
                </Link>
              </li>
            ))}
        </ul>
      </section>
      {detailCta({
        routePrefix: 'shlokas',
        subject: s.source,
      })}
    </main>
  );
}
