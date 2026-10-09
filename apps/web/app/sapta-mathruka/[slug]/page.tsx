import type { Metadata } from 'next';
// DU-05: the one h1 recipe per page archetype. Extras are layout-only.
import { H1 } from '../../../components/ui/heading-recipe';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SAPTA_MATHRUKA, SAPTA_MATHRUKA_SLUGS, getSaptaMathrukaBySlug } from '../../../lib/sapta-mathruka';
import { EnrichedAbout } from '../../../components/seo/EnrichedAbout';
import { ENRICHMENT } from '../../../lib/enrich';

export const revalidate = 86400;
export const dynamicParams = false;

const BASE_URL = 'https://darshya.online';

export function generateStaticParams() {
  return SAPTA_MATHRUKA_SLUGS.map((slug) => ({ slug }));
}

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const m = getSaptaMathrukaBySlug(slug);
  if (!m) return { title: 'Not found' };
  return {
    title: `${m.name} — Matrika ${m.number} of 7, Shakti of ${m.consortDeity}`,
    description: `${m.name} (${m.sanskrit}) — ${m.number}th Matrika. Vahana: ${m.vahana}. Weapons: ${m.weapons.slice(0, 2).join(', ')}. Includes beej mantra, story, vrata and associated temple.`,
    alternates: { canonical: `${BASE_URL}/sapta-mathruka/${m.slug}` },
    openGraph: {
      images: ['/images/golden-temple-og.jpg'],
      title: `${m.name} — ${m.number} of 7 Matrikas`,
      description: m.benefit,
      url: `${BASE_URL}/sapta-mathruka/${m.slug}`,
      type: 'article',
    },
  };
}

export default async function MathrukaPage({ params }: Props) {
  const { slug } = await params;
  const m = getSaptaMathrukaBySlug(slug);
  if (!m) notFound();

  const idx = SAPTA_MATHRUKA.findIndex((x) => x.slug === slug);
  const prev = idx > 0 ? SAPTA_MATHRUKA[idx - 1] : undefined;
  const next = idx < SAPTA_MATHRUKA.length - 1 ? SAPTA_MATHRUKA[idx + 1] : undefined;

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Sapta Matrika', item: `${BASE_URL}/sapta-mathruka` },
      { '@type': 'ListItem', position: 3, name: m.name, item: `${BASE_URL}/sapta-mathruka/${m.slug}` },
    ],
  };
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${m.name} — Matrika ${m.number} of 7, Shakti of ${m.consortDeity}`,
    description: m.benefit,
    author: { '@type': 'Organization', name: 'Darshya' },
    publisher: { '@type': 'Organization', name: 'Darshya' },
    mainEntityOfPage: `${BASE_URL}/sapta-mathruka/${m.slug}`,
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([breadcrumb, article]) }} />

      <nav className="mb-4 text-xs text-gray-500">
        <Link href="/" className="hover:underline">Home</Link>
        <span className="px-1">›</span>
        <Link href="/sapta-mathruka" className="hover:underline">Sapta Matrika</Link>
        <span className="px-1">›</span>
        <span className="text-gray-700">{m.name}</span>
      </nav>

      <header className="mb-8">
        <p className="text-xs uppercase tracking-wider text-rose-700">
          Matrika {m.number} of 7 · Shakti of {m.consortDeity}
        </p>
        <h1 className={`${H1.catalogue} mt-1`}>{m.name}</h1>
        <p className="mt-1 font-serif text-xl text-gray-700">{m.sanskrit}</p>
        <p className="mt-3 text-base text-gray-700">{m.emergedFrom}</p>
      </header>

      <section className="mb-8 rounded-2xl border-2 border-rose-300 bg-gradient-to-br from-rose-50 to-pink-50 p-5">
        <h2 className="mb-3 text-lg font-semibold text-rose-900">Mantras</h2>
        <div className="mb-4">
          <div className="text-xs uppercase tracking-wide text-rose-700">Beej mantra</div>
          <div className="mt-1 font-serif text-lg text-gray-900">{m.beejaMantra}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-rose-700">Primary mantra</div>
          <div className="mt-1 font-serif text-lg text-gray-900">{m.primaryMantra}</div>
          <div className="mt-1 text-sm italic text-gray-700">{m.primaryMantraEnglish}</div>
        </div>
      </section>

      <section className="mb-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500">Vahana</div>
          <div className="mt-1 text-sm font-semibold text-gray-900">{m.vahana}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500">Number of hands</div>
          <div className="mt-1 text-sm font-semibold text-gray-900">{m.numberOfHands}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500">Color</div>
          <div className="mt-1 text-sm font-semibold text-gray-900">{m.color}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500">Direction</div>
          <div className="mt-1 text-sm font-semibold text-gray-900">{m.direction}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 sm:col-span-2">
          <div className="text-xs uppercase tracking-wide text-gray-500">Weapons / attributes</div>
          <ul className="mt-1 list-disc pl-5 text-sm text-gray-900">
            {m.weapons.map((w) => (<li key={w}>{w}</li>))}
          </ul>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-xl font-semibold text-gray-900">Benefit of worship</h2>
        <p className="text-base leading-relaxed text-gray-700">{m.benefit}</p>
      </section>

      <section className="mb-8 rounded-2xl border border-saffron-200 bg-saffron-50/40 p-5">
        <h2 className="mb-2 text-lg font-semibold text-saffron-900">Story / Origin</h2>
        <p className="text-sm leading-relaxed text-gray-800">{m.storyOrigin}</p>
      </section>

      <section className="mb-8 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5">
        <h2 className="mb-2 text-lg font-semibold text-emerald-900">Vrata practice · best day: {m.bestDay}</h2>
        <p className="text-sm leading-relaxed text-gray-800">{m.vrataPractice}</p>
      </section>

      <section className="mb-8 rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="mb-2 text-lg font-semibold text-gray-900">Associated temple</h2>
        <p className="text-sm text-gray-800">{m.associatedTemple}</p>
        <p className="mt-2 text-sm text-gray-700">
          See <Link href="/shakti-peeth" className="text-rose-700 underline">51 Shakti Peeth</Link> and{' '}
          <Link href="/ashta-lakshmi" className="text-rose-700 underline">8 Ashta Lakshmi</Link>.
        </p>
      </section>

      <section className="mb-8 rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="mb-2 text-lg font-semibold text-gray-900">Plan a {m.name} puja</h2>
        <p className="text-sm text-gray-700">
          Cannot travel? Book a <Link href="/pujas" className="text-rose-700 underline">remote {m.name} puja with video proof</Link>.
          For Navratri 2026 dates see <Link href="/calendar" className="text-rose-700 underline">Hindu festival calendar 2026</Link>.
        </p>
      </section>

<EnrichedAbout name={m.name} data={ENRICHMENT.matruka[m.slug]} />
      <nav className="mt-12 grid grid-cols-2 gap-3 border-t border-gray-200 pt-6 text-sm">
        {prev ? (
          <Link href={`/sapta-mathruka/${prev.slug}`} className="rounded-xl border border-gray-200 p-3 hover:bg-gray-50">
            <div className="text-xs text-gray-500">← Previous</div>
            <div className="font-semibold text-gray-900">{prev.number}. {prev.name}</div>
          </Link>
        ) : <div />}
        {next ? (
          <Link href={`/sapta-mathruka/${next.slug}`} className="rounded-xl border border-gray-200 p-3 text-right hover:bg-gray-50">
            <div className="text-xs text-gray-500">Next →</div>
            <div className="font-semibold text-gray-900">{next.number}. {next.name}</div>
          </Link>
        ) : <div />}
      </nav>
    </main>
  );
}
