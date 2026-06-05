import type { Metadata } from 'next';
import Link from 'next/link';
import { RAMAYANA_KANDAS, TOTAL_SARGAS } from '../../lib/ramayana-kandas';

export const revalidate = 86400;

const BASE_URL = 'https://darshya.online';

export const metadata: Metadata = {
  title: `Valmiki Ramayana, All 7 Kandas: Bala, Ayodhya, Aranya, Kishkindha, Sundara, Yuddha, Uttara | Darshya`,
  description: `Complete kanda-by-kanda guide to the Valmiki Ramayana, all 7 books across ${TOTAL_SARGAS} sargas. Episodes, central characters, key teachings of the story of Rama, Sita and Hanuman.`,
  alternates: { canonical: `${BASE_URL}/ramayana` },
  openGraph: {
    title: 'Valmiki Ramayana, 7 kandas complete guide',
    description: `From Rama's birth to his return, every kanda's story, key episodes, and central teaching.`,
    url: `${BASE_URL}/ramayana`,
    type: 'website',
  },
};

export default function RamayanaIndexPage() {
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Valmiki Ramayana Kandas',
    numberOfItems: RAMAYANA_KANDAS.length,
    itemListElement: RAMAYANA_KANDAS.map((k) => ({
      '@type': 'ListItem',
      position: k.number,
      item: {
        '@type': 'Chapter',
        name: `Kanda ${k.number}: ${k.english}`,
        url: `${BASE_URL}/ramayana/${k.slug}`,
        position: k.number,
      },
    })),
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Ramayana', item: `${BASE_URL}/ramayana` },
    ],
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([ld, breadcrumb]) }} />

      <header className="mb-10">
        <p className="text-xs uppercase tracking-wider text-indigo-600">7 kandas · {TOTAL_SARGAS} sargas · ~24,000 shlokas</p>
        <h1 className="mt-1 font-serif text-3xl text-gray-900 sm:text-4xl">वाल्मीकि रामायण</h1>
        <p className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">The Valmiki Ramayana, All 7 Kandas</p>
        <p className="mt-3 max-w-3xl text-base text-gray-700">
          The story of Rama, prince of Ayodhya, composed by sage Valmiki in Sanskrit,
          the Ramayana is the older of India&apos;s two great epics. From Rama&apos;s birth and
          marriage to Sita through fourteen years of exile, the abduction by Ravana, the
          alliance with Hanuman and the vanaras, the war at Lanka, and the return to
          Ayodhya, each kanda is a distinct stage of the great journey.
        </p>
      </header>

      <section className="mb-10 rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-amber-50 p-6">
        <h2 className="text-base font-semibold text-indigo-900">Reading order &amp; tip</h2>
        <p className="mt-2 text-sm text-indigo-900/80">
          Read in order if first-time. <strong>Sundara Kanda</strong> (Book 5, Hanuman&apos;s
          deeds) is traditionally recited on Tuesdays and Saturdays for wish-fulfillment
          and is often read standalone. Bala Kanda gives the back-story; Uttara Kanda is
          the epilogue often debated as a later addition.
        </p>
      </section>

      <div className="space-y-4">
        {RAMAYANA_KANDAS.map((k) => (
          <Link
            key={k.slug}
            href={`/ramayana/${k.slug}`}
            className="group block rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-indigo-300 hover:shadow-md"
          >
            <div className="flex items-baseline justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-sm font-bold text-indigo-900">{k.number}</span>
                <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-700">{k.english}</h3>
              </div>
              <span className="text-xs text-gray-500">{k.sargaCount} sargas</span>
            </div>
            <p className="mt-1 font-serif text-base text-gray-700">{k.sanskrit} <span className="ml-2 text-xs italic text-gray-500">({k.iast})</span></p>
            <p className="mt-2 text-xs uppercase tracking-wider text-gray-500">Setting: {k.setting}</p>
            <p className="mt-2 text-sm text-gray-700 line-clamp-3">{k.summary}</p>
            <p className="mt-3 text-xs font-semibold text-indigo-700">Central figure: <span className="font-normal text-gray-700">{k.centralCharacter}</span></p>
          </Link>
        ))}
      </div>

      <section className="mt-12 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Related study</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Link href="/deity/rama" className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 hover:bg-indigo-100">
            <div className="text-sm font-semibold text-indigo-900">About Lord Rama</div>
            <div className="text-xs text-indigo-700">The protagonist of the epic</div>
          </Link>
          <Link href="/deity/hanuman" className="rounded-xl border border-rose-200 bg-rose-50/40 p-4 hover:bg-rose-100">
            <div className="text-sm font-semibold text-rose-900">About Hanuman</div>
            <div className="text-xs text-rose-700">The ideal devotee</div>
          </Link>
          <Link href="/tirth/ayodhya-ram-mandir" className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 hover:bg-amber-100">
            <div className="text-sm font-semibold text-amber-900">Ayodhya Ram Mandir</div>
            <div className="text-xs text-amber-700">Visit Rama&apos;s birthplace</div>
          </Link>
          <Link href="/chalisa/hanuman-chalisa" className="rounded-xl border border-orange-200 bg-orange-50/40 p-4 hover:bg-orange-100">
            <div className="text-sm font-semibold text-orange-900">Hanuman Chalisa</div>
            <div className="text-xs text-orange-700">40 verses for Tuesday recitation</div>
          </Link>
          <Link href="/gita" className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 hover:bg-indigo-100">
            <div className="text-sm font-semibold text-indigo-900">Bhagavad Gita</div>
            <div className="text-xs text-indigo-700">India&apos;s other great epic teaching</div>
          </Link>
          <Link href="/festival/ram-navami" className="rounded-xl border border-yellow-200 bg-yellow-50/40 p-4 hover:bg-yellow-100">
            <div className="text-sm font-semibold text-yellow-900">Ram Navami</div>
            <div className="text-xs text-yellow-700">Birth of Rama festival</div>
          </Link>
        </div>
      </section>
    </main>
  );
}
