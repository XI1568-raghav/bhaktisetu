import type { Metadata } from 'next';
// DU-05: the one h1 recipe per page archetype. Extras are layout-only.
import { H1 } from '../../../components/ui/heading-recipe';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DWADASHA_ADITYAS, DWADASHA_ADITYA_SLUGS, getDwadashaAdityaBySlug } from '../../../lib/dwadasha-aditya';

export const revalidate = 86400;
export const dynamicParams = false;

const BASE_URL = 'https://darshya.online';

export function generateStaticParams() {
  return DWADASHA_ADITYA_SLUGS.map((slug) => ({ slug }));
}

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const a = getDwadashaAdityaBySlug(slug);
  if (!a) return { title: 'Not found' };
  return {
    title: `${a.name} Aditya (${a.number} of 12) — Mantra, Month, Ratna, Vrata`,
    description: `${a.name} (${a.sanskrit}) — ${a.number}th Aditya, presides over ${a.presidingMonth}. Domain: ${a.domain.slice(0, 80)}. Includes beej mantra, ratna, vahana and signature vrata.`,
    alternates: { canonical: `${BASE_URL}/aditya/${a.slug}` },
    openGraph: {
      images: ['/images/golden-temple-og.jpg'],
      title: `${a.name} — ${a.number} of 12 Adityas`,
      description: a.benefit,
      url: `${BASE_URL}/aditya/${a.slug}`,
      type: 'article',
    },
  };
}

export default async function AdityaPage({ params }: Props) {
  const { slug } = await params;
  const a = getDwadashaAdityaBySlug(slug);
  if (!a) notFound();

  const idx = DWADASHA_ADITYAS.findIndex((x) => x.slug === slug);
  const prev = idx > 0 ? DWADASHA_ADITYAS[idx - 1] : undefined;
  const next = idx < DWADASHA_ADITYAS.length - 1 ? DWADASHA_ADITYAS[idx + 1] : undefined;

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Dwadasha Aditya', item: `${BASE_URL}/aditya` },
      { '@type': 'ListItem', position: 3, name: a.name, item: `${BASE_URL}/aditya/${a.slug}` },
    ],
  };
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${a.name} — ${a.number} of 12 Adityas`,
    description: a.benefit,
    author: { '@type': 'Organization', name: 'Darshya' },
    publisher: { '@type': 'Organization', name: 'Darshya' },
    mainEntityOfPage: `${BASE_URL}/aditya/${a.slug}`,
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([breadcrumb, article]) }} />

      <nav className="mb-4 text-xs text-gray-500">
        <Link href="/" className="hover:underline">Home</Link>
        <span className="px-1">›</span>
        <Link href="/aditya" className="hover:underline">Dwadasha Aditya</Link>
        <span className="px-1">›</span>
        <span className="text-gray-700">{a.name}</span>
      </nav>

      <header className="mb-8">
        <p className="text-xs uppercase tracking-wider text-amber-700">
          Aditya {a.number} of 12 · Presides over {a.presidingMonth}
        </p>
        <h1 className={`${H1.catalogue} mt-1`}>{a.name}</h1>
        <p className="mt-1 font-serif text-xl text-gray-700">{a.sanskrit}</p>
        <p className="mt-3 text-base text-gray-700">{a.domain}</p>
      </header>

      <section className="mb-8 rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-50 p-5">
        <h2 className="mb-3 text-lg font-semibold text-amber-900">Mantras</h2>
        <div className="mb-4">
          <div className="text-xs uppercase tracking-wide text-amber-700">Beej mantra</div>
          <div className="mt-1 font-serif text-lg text-gray-900">{a.beejaMantra}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-amber-700">Primary mantra</div>
          <div className="mt-1 font-serif text-lg text-gray-900">{a.primaryMantra}</div>
          <div className="mt-1 text-sm italic text-gray-700">{a.primaryMantraEnglish}</div>
        </div>
      </section>

      <section className="mb-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500">Quality of light</div>
          <div className="mt-1 text-sm font-semibold text-gray-900">{a.qualityOfLight}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500">Ratna (gem)</div>
          <div className="mt-1 text-sm font-semibold text-gray-900">{a.ratna}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500">Vahana</div>
          <div className="mt-1 text-sm font-semibold text-gray-900">{a.vahana}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500">Presiding month</div>
          <div className="mt-1 text-sm font-semibold text-gray-900">{a.presidingMonth}</div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-xl font-semibold text-gray-900">Benefit of worship</h2>
        <p className="text-base leading-relaxed text-gray-700">{a.benefit}</p>
      </section>

      <section className="mb-8 rounded-2xl border border-saffron-200 bg-saffron-50/40 p-5">
        <h2 className="mb-2 text-lg font-semibold text-saffron-900">Story / Origin</h2>
        <p className="text-sm leading-relaxed text-gray-800">{a.storyOrigin}</p>
      </section>

      <section className="mb-8 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5">
        <h2 className="mb-2 text-lg font-semibold text-emerald-900">Vrata practice</h2>
        <p className="text-sm leading-relaxed text-gray-800">{a.vrataPractice}</p>
      </section>

      <section className="mb-8 rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="mb-2 text-lg font-semibold text-gray-900">Associated temple</h2>
        <p className="text-sm text-gray-800">{a.associatedTemple}</p>
        <p className="mt-2 text-sm text-gray-700">
          See <Link href="/tirth" className="text-amber-700 underline">12 sacred tirthas</Link> and{' '}
          <Link href="/nava-graha" className="text-amber-700 underline">Nava Graha</Link> for full graha-grid.
        </p>
      </section>

      <section className="mb-8 rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="mb-2 text-lg font-semibold text-gray-900">Plan a Surya puja</h2>
        <p className="text-sm text-gray-700">
          Cannot travel? Book a <Link href="/pujas" className="text-amber-700 underline">remote {a.name} puja with video proof</Link>.
          For Ratha Saptami + Makar Sankranti dates see <Link href="/calendar" className="text-amber-700 underline">Hindu festival calendar 2026</Link>.
        </p>
      </section>

      <nav className="mt-12 grid grid-cols-2 gap-3 border-t border-gray-200 pt-6 text-sm">
        {prev ? (
          <Link href={`/aditya/${prev.slug}`} className="rounded-xl border border-gray-200 p-3 hover:bg-gray-50">
            <div className="text-xs text-gray-500">← Previous</div>
            <div className="font-semibold text-gray-900">{prev.number}. {prev.name}</div>
          </Link>
        ) : <div />}
        {next ? (
          <Link href={`/aditya/${next.slug}`} className="rounded-xl border border-gray-200 p-3 text-right hover:bg-gray-50">
            <div className="text-xs text-gray-500">Next →</div>
            <div className="font-semibold text-gray-900">{next.number}. {next.name}</div>
          </Link>
        ) : <div />}
      </nav>
    </main>
  );
}
