// Hub for free pandit kundli astrology advice — 13 long-tail SEO topic pages.
// Targets primary query: "free pandit kundli astrology advice" + variants.
import type { Metadata } from 'next';
// DU-05: the one h1 recipe per page archetype. Extras are layout-only.
import { H1 } from '../../components/ui/heading-recipe';
import Link from 'next/link';
import { FREE_PANDIT_TOPICS } from '../../lib/free-pandit-topics';

export const revalidate = 86400;

const BASE_URL = 'https://darshya.online';
const TOTAL = FREE_PANDIT_TOPICS.length;

export const metadata: Metadata = {
 title: `Free Pandit Kundli Astrology Advice — ${TOTAL} Topics Answered by Verified Pandits`,
 description: `Free pandit kundli astrology advice across ${TOTAL} life areas — marriage, career, health, finance, education, manglik dosh, kundli milan and more. Authentic Vedic guidance, no credit card required.`,
 alternates: { canonical: `${BASE_URL}/free-pandit-advice` },
 openGraph: {
  images: ['/images/golden-temple-og.jpg'],
  title: 'Free Pandit Kundli Astrology Advice — Darshya',
  description: `${TOTAL} curated free advice topics from verified Vedic pandits — marriage, career, health, dosh remedies and more.`,
  url: `${BASE_URL}/free-pandit-advice`,
  type: 'website',
 },
};

export default function FreePanditAdviceHub() {
 const itemList = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'Free Pandit Kundli Astrology Advice Topics',
  numberOfItems: TOTAL,
  itemListElement: FREE_PANDIT_TOPICS.map((t, i) => ({
   '@type': 'ListItem',
   position: i + 1,
   name: t.title,
   url: `${BASE_URL}/free-pandit-advice/${t.slug}`,
  })),
 };

 const breadcrumb = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
   { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
   { '@type': 'ListItem', position: 2, name: 'Free Pandit Advice', item: `${BASE_URL}/free-pandit-advice` },
  ],
 };

 const collectionPage = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: 'Free Pandit Kundli Astrology Advice',
  description: `Index of ${TOTAL} free advice topics from verified Vedic pandits — covering marriage, career, health, finance, education, dosh remedies and more.`,
  url: `${BASE_URL}/free-pandit-advice`,
 };

 return (
  <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
   <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([itemList, breadcrumb, collectionPage]) }} />

   <nav className="mb-4 text-xs text-gray-500">
    <Link href="/" className="hover:text-gray-800">Home</Link>
    <span className="mx-1.5">›</span>
    <span className="text-gray-800">Free Pandit Advice</span>
   </nav>

   <header className="mb-10 max-w-3xl">
    <p className="text-xs uppercase tracking-wider text-saffron-600">{TOTAL} topics · 100% free · verified pandits</p>
    <h1 className={`${H1.catalogue} mt-1`}>Free Pandit Kundli Astrology Advice</h1>
    <p className="mt-3 text-base text-gray-700">
     Authentic Vedic guidance from verified pandits — no credit card, no signup wall.
     Each topic below answers the most common questions Indians ask before paying for a
     consultation. Read first; book a live session only if you need a tailored remedy.
    </p>
    <div className="mt-5 flex flex-wrap gap-3">
     <Link href="/ask-pandit" className="rounded-full bg-saffron-600 px-5 py-2 text-sm font-semibold text-white hover:bg-saffron-700">
      Ask a Pandit Live →
     </Link>
     <Link href="/astrology/kundli" className="rounded-full border border-saffron-300 bg-white px-5 py-2 text-sm font-semibold text-saffron-700 hover:bg-saffron-50">
      Generate Free Kundli
     </Link>
    </div>
   </header>

   <nav className="mb-10 flex flex-wrap gap-2 text-sm">
    {FREE_PANDIT_TOPICS.map((t) => (
     <a
      key={t.slug}
      href={`#${t.slug}`}
      className="rounded-full border border-saffron-200 bg-saffron-50 px-3 py-1 font-semibold text-saffron-800"
     >
      {t.title.replace('Free Pandit Advice on ', '')}
     </a>
    ))}
   </nav>

   <section className="mb-12">
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
     {FREE_PANDIT_TOPICS.map((t) => (
      <Link
       key={t.slug}
       id={t.slug}
       href={`/free-pandit-advice/${t.slug}`}
       className="group block scroll-mt-20 rounded-2xl border border-saffron-200 bg-saffron-50/30 p-5 transition hover:shadow-md"
      >
       <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-base font-bold text-gray-900 group-hover:underline">
         {t.title.replace('Free Pandit Advice on ', '')}
        </h2>
        <span className="shrink-0 rounded-full bg-saffron-100 px-2 py-0.5 text-xs font-semibold text-saffron-800">
         {t.faqs.length} Qs
        </span>
       </div>
       <p className="mt-1 text-xs text-saffron-700">{t.hindiTitle}</p>
       <p className="mt-2 text-sm leading-relaxed text-gray-700 line-clamp-4">
        {t.intro.slice(0, 220)}…
       </p>
       <p className="mt-3 text-xs font-semibold text-saffron-600 group-hover:underline">
        Read free advice →
       </p>
      </Link>
     ))}
    </div>
   </section>

   <section className="mt-12 rounded-2xl border border-gray-200 bg-white p-6">
    <h2 className="text-lg font-semibold text-gray-900">Why this is genuinely free</h2>
    <p className="mt-2 text-sm text-gray-700">
     Vedic shastra is open knowledge — Parashara, Varahamihira and Jaimini wrote
     thousands of years ago so any sincere seeker could understand. Darshya keeps the
     basic chart-reading free because that is dharma. We charge only when you need a
     live pandit to compare your specific chart, run a homa, or fix a muhurat. Browse
     freely; pay only when paid value is clear.
    </p>
   </section>
  </main>
 );
}
