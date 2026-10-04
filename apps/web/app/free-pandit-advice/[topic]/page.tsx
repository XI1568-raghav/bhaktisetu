// Per-topic free pandit advice page — FAQPage JSON-LD eligible for Google rich snippets.
import type { Metadata } from 'next';
// DU-05: the one h1 recipe per page archetype. Extras are layout-only.
import { H1 } from '../../../components/ui/heading-recipe';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FREE_PANDIT_TOPICS, getTopicBySlug, topicSlugs } from '../../../lib/free-pandit-topics';
import { buttonClass } from '../../../components/ui/button-recipe';

export const dynamicParams = false;
export const revalidate = 86400;

const BASE_URL = 'https://darshya.online';

export async function generateStaticParams() {
 return topicSlugs().map((topic) => ({ topic }));
}

type PageProps = { params: Promise<{ topic: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
 const { topic } = await params;
 const t = getTopicBySlug(topic);
 if (!t) return { title: 'Free Pandit Advice' };
 const url = `${BASE_URL}/free-pandit-advice/${t.slug}`;
 return {
  title: `${t.title}`,
  description: t.metaDescription,
  alternates: { canonical: url },
  openGraph: { title: t.title, description: t.metaDescription, url, type: 'article', images: ['/images/golden-temple-og.jpg'] },
 };
}

export default async function FreePanditTopicPage({ params }: PageProps) {
 const { topic } = await params;
 const t = getTopicBySlug(topic);
 if (!t) notFound();

 const idx = FREE_PANDIT_TOPICS.findIndex((x) => x.slug === t.slug);
 const prev = idx > 0 ? FREE_PANDIT_TOPICS[idx - 1] : null;
 const next = idx < FREE_PANDIT_TOPICS.length - 1 ? FREE_PANDIT_TOPICS[idx + 1] : null;

 const faqPage = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: t.faqs.map((f) => ({
   '@type': 'Question',
   name: f.question,
   acceptedAnswer: { '@type': 'Answer', text: f.answer },
  })),
 };

 const breadcrumb = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
   { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
   { '@type': 'ListItem', position: 2, name: 'Free Pandit Advice', item: `${BASE_URL}/free-pandit-advice` },
   { '@type': 'ListItem', position: 3, name: t.title, item: `${BASE_URL}/free-pandit-advice/${t.slug}` },
  ],
 };

 const article = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: t.title,
  description: t.metaDescription,
  inLanguage: 'en-IN',
  isPartOf: { '@type': 'CollectionPage', '@id': `${BASE_URL}/free-pandit-advice` },
  publisher: { '@type': 'Organization', name: 'Darshya', url: BASE_URL },
 };

 return (
  <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
   <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([faqPage, breadcrumb, article]) }} />

   <nav className="mb-4 text-xs text-gray-500">
    <Link href="/" className="hover:text-gray-800">Home</Link>
    <span className="mx-1.5">›</span>
    <Link href="/free-pandit-advice" className="hover:text-gray-800">Free Pandit Advice</Link>
    <span className="mx-1.5">›</span>
    <span className="text-gray-800">{t.title.replace('Free Pandit Advice on ', '')}</span>
   </nav>

   <header className="mb-8">
    <p className="text-xs uppercase tracking-wider text-saffron-600">Free advice · pandits</p>
    <h1 className={`${H1.catalogue} mt-1`}>{t.title}</h1>
    <p className="mt-2 text-base text-saffron-700">{t.hindiTitle}</p>
   </header>

   <section className="mb-8 rounded-2xl border border-saffron-200 bg-saffron-50/40 p-5">
    <p className="text-sm leading-relaxed text-gray-800">{t.intro}</p>
   </section>

   <section className="mb-8">
    <h2 className="font-serif text-xl text-gray-900">Common problems we see</h2>
    <ul className="mt-3 space-y-2">
     {t.commonProblems.map((p, i) => (
      <li key={i} className="flex gap-2 text-sm text-gray-700">
       <span className="text-saffron-600">●</span>
       <span>{p}</span>
      </li>
     ))}
    </ul>
   </section>

   <section className="mb-8 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5">
    <h2 className="font-serif text-xl text-emerald-800">Free Vedic remedies you can start today</h2>
    <ul className="mt-3 space-y-2">
     {t.freeRemedies.map((r, i) => (
      <li key={i} className="flex gap-2 text-sm text-gray-800">
       <span className="text-emerald-600">✓</span>
       <span>{r}</span>
      </li>
     ))}
    </ul>
    <p className="mt-4 text-xs text-emerald-700">
     These are general Vedic prescriptions. They are safe to attempt without supervision.
     Consistency over 21–40 days is the key.
    </p>
   </section>

   <section className="mb-8 rounded-2xl border border-amber-200 bg-amber-50/40 p-5">
    <h2 className="font-serif text-lg text-amber-900">When to consult a paid pandit</h2>
    <p className="mt-2 text-sm text-amber-900">{t.whenToConsultPaid}</p>
   </section>

   <section className="mb-8">
    <h2 className="font-serif text-xl text-gray-900">Frequently asked questions</h2>
    <div className="mt-4 space-y-3">
     {t.faqs.map((f, i) => (
      <details key={i} className="rounded-xl border border-gray-200 bg-white p-4 open:shadow-sm">
       <summary className="cursor-pointer font-semibold text-gray-900">{f.question}</summary>
       <p className="mt-3 text-sm leading-relaxed text-gray-700">{f.answer}</p>
      </details>
     ))}
    </div>
   </section>

   <section className="mb-8 rounded-2xl border border-saffron-300 bg-gradient-to-br from-saffron-50 to-amber-50 p-6 text-center">
    <h2 className="font-serif text-xl text-gray-900">{t.cta}</h2>
    <p className="mt-2 text-sm text-gray-700">
     Go deeper than free advice. Generate your full chart or speak to a pandit
     who specialises in this area.
    </p>
    <div className="mt-4 flex flex-wrap justify-center gap-3">
     <Link href="/astrology/kundli" className={buttonClass('primary', 'md')}>
      Free Kundli Report
     </Link>
     <Link href="/ask-pandit" className="rounded-full border border-saffron-300 bg-white px-5 py-2 text-sm font-semibold text-saffron-700 hover:bg-saffron-50">
      Ask Pandit Live
     </Link>
    </div>
   </section>

   <nav className="mt-12 flex items-center justify-between border-t border-gray-200 pt-6 text-sm">
    {prev ? (
     <Link href={`/free-pandit-advice/${prev.slug}`} className="text-saffron-700 hover:underline">
      ← {prev.title.replace('Free Pandit Advice on ', '')}
     </Link>
    ) : (
     <span />
    )}
    {next ? (
     <Link href={`/free-pandit-advice/${next.slug}`} className="text-saffron-700 hover:underline">
      {next.title.replace('Free Pandit Advice on ', '')} →
     </Link>
    ) : (
     <span />
    )}
   </nav>
  </main>
 );
}
