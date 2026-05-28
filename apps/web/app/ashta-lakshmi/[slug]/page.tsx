import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ASHTA_LAKSHMIS, ASHTA_LAKSHMI_SLUGS, getAshtaLakshmiBySlug } from '../../../lib/ashta-lakshmi';

export const revalidate = 86400;
export const dynamicParams = false;

const BASE_URL = 'https://darshya.online';

export function generateStaticParams() {
  return ASHTA_LAKSHMI_SLUGS.map((slug) => ({ slug }));
}

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const l = getAshtaLakshmiBySlug(slug);
  if (!l) return { title: 'Not found' };
  return {
    title: `${l.name} (${l.number} of 8) — Mantra, Vahana, Vrata, Best Day | Darshya`,
    description: `${l.name} (${l.sanskrit}) — ${l.number}th form of Ashta Lakshmi. Domain: ${l.domain}. Vahana: ${l.vahana}. Best day: ${l.bestDay}. Festival: ${l.signatureFestival.slice(0, 60)}. Includes beej mantra in Devanagari.`,
    alternates: { canonical: `${BASE_URL}/ashta-lakshmi/${l.slug}` },
    openGraph: {
      title: `${l.name} — ${l.number} of 8 Ashta Lakshmi`,
      description: l.benefit,
      url: `${BASE_URL}/ashta-lakshmi/${l.slug}`,
      type: 'article',
    },
  };
}

export default async function AshtaLakshmiPage({ params }: Props) {
  const { slug } = await params;
  const l = getAshtaLakshmiBySlug(slug);
  if (!l) notFound();

  const idx = ASHTA_LAKSHMIS.findIndex((x) => x.slug === slug);
  const prev = idx > 0 ? ASHTA_LAKSHMIS[idx - 1] : undefined;
  const next = idx < ASHTA_LAKSHMIS.length - 1 ? ASHTA_LAKSHMIS[idx + 1] : undefined;

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Ashta Lakshmi', item: `${BASE_URL}/ashta-lakshmi` },
      { '@type': 'ListItem', position: 3, name: l.name, item: `${BASE_URL}/ashta-lakshmi/${l.slug}` },
    ],
  };
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${l.name} — ${l.number} of 8 Ashta Lakshmi`,
    description: l.benefit,
    author: { '@type': 'Organization', name: 'Darshya' },
    publisher: { '@type': 'Organization', name: 'Darshya' },
    mainEntityOfPage: `${BASE_URL}/ashta-lakshmi/${l.slug}`,
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([breadcrumb, article]) }} />

      <nav className="mb-4 text-xs text-gray-500">
        <Link href="/" className="hover:underline">Home</Link>
        <span className="px-1">›</span>
        <Link href="/ashta-lakshmi" className="hover:underline">Ashta Lakshmi</Link>
        <span className="px-1">›</span>
        <span className="text-gray-700">{l.name}</span>
      </nav>

      <header className="mb-8">
        <p className="text-xs uppercase tracking-wider text-pink-700">
          Form {l.number} of 8 · {l.color}
        </p>
        <h1 className="mt-1 text-3xl font-bold text-gray-900 sm:text-4xl">{l.name}</h1>
        <p className="mt-1 font-serif text-xl text-gray-700">{l.sanskrit}</p>
        <p className="mt-3 text-base text-gray-700">{l.domain}</p>
      </header>

      <section className="mb-8 rounded-2xl border-2 border-pink-300 bg-gradient-to-br from-pink-50 to-amber-50 p-5">
        <h2 className="mb-3 text-lg font-semibold text-pink-900">Mantras</h2>
        <div className="mb-4">
          <div className="text-xs uppercase tracking-wide text-pink-700">Beej mantra</div>
          <div className="mt-1 font-serif text-lg text-gray-900">{l.beejaMantra}</div>
        </div>
        <div className="mb-2">
          <div className="text-xs uppercase tracking-wide text-pink-700">Primary mantra</div>
          <div className="mt-1 font-serif text-lg text-gray-900">{l.primaryMantra}</div>
          <div className="mt-1 text-sm italic text-gray-700">{l.primaryMantraEnglish}</div>
        </div>
      </section>

      <section className="mb-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500">Vahana (mount)</div>
          <div className="mt-1 text-sm font-semibold text-gray-900">{l.vahana}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500">Best day</div>
          <div className="mt-1 text-sm font-semibold text-gray-900">{l.bestDay}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500">Number of hands</div>
          <div className="mt-1 text-sm font-semibold text-gray-900">{l.numberOfHands}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500">Color</div>
          <div className="mt-1 text-sm font-semibold text-gray-900">{l.color}</div>
        </div>
      </section>

      <section className="mb-8 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5">
        <h2 className="mb-2 text-lg font-semibold text-emerald-900">Iconography</h2>
        <p className="text-sm leading-relaxed text-gray-800">{l.iconography}</p>
        <div className="mt-3">
          <div className="text-xs uppercase tracking-wide text-emerald-700">Attributes held</div>
          <ul className="mt-1 list-disc pl-6 text-sm text-gray-800">
            {l.attributes.map((a) => <li key={a}>{a}</li>)}
          </ul>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-xl font-semibold text-gray-900">Benefit of worship</h2>
        <p className="text-base leading-relaxed text-gray-700">{l.benefit}</p>
      </section>

      <section className="mb-8 rounded-2xl border border-saffron-200 bg-saffron-50/40 p-5">
        <h2 className="mb-2 text-lg font-semibold text-saffron-900">Story / Origin</h2>
        <p className="text-sm leading-relaxed text-gray-800">{l.storyOrigin}</p>
      </section>

      <section className="mb-8 rounded-2xl border border-amber-200 bg-amber-50/40 p-5">
        <h2 className="mb-2 text-lg font-semibold text-amber-900">Signature festival</h2>
        <p className="text-sm leading-relaxed text-gray-800">{l.signatureFestival}</p>
      </section>

      <section className="mb-8 rounded-2xl border border-indigo-200 bg-indigo-50/40 p-5">
        <h2 className="mb-2 text-lg font-semibold text-indigo-900">Vrata practice</h2>
        <p className="text-sm leading-relaxed text-gray-800">{l.vrataPractice}</p>
      </section>

      <section className="mb-8 rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="mb-2 text-lg font-semibold text-gray-900">Associated temple</h2>
        <p className="text-sm text-gray-800">{l.associatedTemple}</p>
        <p className="mt-2 text-sm text-gray-700">
          See <Link href="/tirth" className="text-pink-700 underline">12 sacred tirthas</Link> and{' '}
          <Link href="/shakti-peeth" className="text-pink-700 underline">51 Shakti Peeth</Link> for full devi pilgrim grids.
        </p>
      </section>

      <section className="mb-8 rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="mb-2 text-lg font-semibold text-gray-900">Plan a remote Lakshmi puja</h2>
        <p className="text-sm text-gray-700">
          Cannot travel? Book a <Link href="/pujas" className="text-pink-700 underline">remote {l.name} puja with video proof</Link>.
          For festival timing see <Link href="/calendar" className="text-pink-700 underline">Hindu festival calendar 2026</Link>.
        </p>
      </section>

      <nav className="mt-12 grid grid-cols-2 gap-3 border-t border-gray-200 pt-6 text-sm">
        {prev ? (
          <Link href={`/ashta-lakshmi/${prev.slug}`} className="rounded-xl border border-gray-200 p-3 hover:bg-gray-50">
            <div className="text-xs text-gray-500">← Previous</div>
            <div className="font-semibold text-gray-900">{prev.number}. {prev.name}</div>
          </Link>
        ) : <div />}
        {next ? (
          <Link href={`/ashta-lakshmi/${next.slug}`} className="rounded-xl border border-gray-200 p-3 text-right hover:bg-gray-50">
            <div className="text-xs text-gray-500">Next →</div>
            <div className="font-semibold text-gray-900">{next.number}. {next.name}</div>
          </Link>
        ) : <div />}
      </nav>
    </main>
  );
}
