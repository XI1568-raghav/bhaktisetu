import type { Metadata } from 'next';
import Link from 'next/link';
import { MAHABHARATA_PARVAS } from '../../lib/mahabharata-parvas';

export const revalidate = 86400;

const BASE_URL = 'https://darshya.online';
const TOTAL_ADHYAYAS = MAHABHARATA_PARVAS.reduce((sum, p) => sum + p.adhyayaCount, 0);

export const metadata: Metadata = {
  title: `Mahabharata — All 18 Parvas: Adi, Sabha, Vana, Virata, Udyoga, Bhishma, Drona, Karna, Shalya, Sauptika, Stri, Shanti, Anushasana, Ashvamedhika, Ashramavasika, Mausala, Mahaprasthanika, Svargarohana | Darshya`,
  description: `Complete parva-by-parva guide to Vyasa's Mahabharata — all 18 books across ${TOTAL_ADHYAYAS.toLocaleString()} adhyayas, ~100,000 shlokas. Episodes, key characters, central teachings of the world's longest epic.`,
  alternates: { canonical: `${BASE_URL}/mahabharata` },
  openGraph: {
    title: 'Mahabharata — 18 parvas complete guide',
    description: `From the lacquer house to Svargarohana — every parva's story, key episodes, and central teaching.`,
    url: `${BASE_URL}/mahabharata`,
    type: 'website',
  },
};

export default function MahabharataIndexPage() {
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Mahabharata Parvas',
    numberOfItems: MAHABHARATA_PARVAS.length,
    itemListElement: MAHABHARATA_PARVAS.map((p) => ({
      '@type': 'ListItem',
      position: p.number,
      item: {
        '@type': 'Chapter',
        name: `Parva ${p.number}: ${p.english}`,
        url: `${BASE_URL}/mahabharata/${p.slug}`,
        position: p.number,
      },
    })),
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Mahabharata', item: `${BASE_URL}/mahabharata` },
    ],
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([ld, breadcrumb]) }} />

      <header className="mb-10">
        <p className="text-xs uppercase tracking-wider text-saffron-600">18 parvas · {TOTAL_ADHYAYAS.toLocaleString()} adhyayas · ~100,000 shlokas</p>
        <h1 className="mt-1 font-serif text-3xl text-gray-900 sm:text-4xl">महाभारत</h1>
        <p className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">The Mahabharata — All 18 Parvas</p>
        <p className="mt-3 max-w-3xl text-base text-gray-700">
          The longest epic ever composed — Vyasa&apos;s account of the Kuru dynasty&apos;s
          self-destruction, the eighteen-day Kurukshetra war, and the Pandavas&apos; final
          ascent. Eight times the length of the Iliad and Odyssey combined. Every parva
          contains within it the whole — dharma in collision with itself, kingship in
          collision with kinship, and Krishna&apos;s teaching at the heart.
        </p>
      </header>

      <section className="mb-10 rounded-2xl border border-saffron-200 bg-gradient-to-br from-saffron-50 to-amber-50 p-6">
        <h2 className="text-base font-semibold text-saffron-900">Reading order &amp; tip</h2>
        <p className="mt-2 text-sm text-saffron-900/80">
          Most readers begin with Adi, Sabha, Vana, Virata, Udyoga (the lead-up) and
          then the war parvas. <strong>Bhishma Parva</strong> (Book 6) contains the
          <strong> Bhagavad Gita</strong> (chapters 25-42 of the parva) — Krishna&apos;s
          counsel to Arjuna on the eve of war. Shanti and Anushasana are Bhishma&apos;s
          deathbed dharma-instruction; the closing four parvas are short and devastating.
        </p>
      </section>

      <div className="space-y-4">
        {MAHABHARATA_PARVAS.map((p) => (
          <Link
            key={p.slug}
            href={`/mahabharata/${p.slug}`}
            className="group block rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-saffron-300 hover:shadow-md"
          >
            <div className="flex items-baseline justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-saffron-100 px-2.5 py-1 text-sm font-bold text-saffron-900">{p.number}</span>
                <h3 className="text-lg font-bold text-gray-900 group-hover:text-saffron-700">{p.english}</h3>
              </div>
              <span className="text-xs text-gray-500">{p.adhyayaCount} adhyayas</span>
            </div>
            <p className="mt-1 font-serif text-base text-gray-700">{p.sanskrit} <span className="ml-2 text-xs italic text-gray-500">({p.iast})</span></p>
            <p className="mt-2 text-xs uppercase tracking-wider text-gray-500">Setting: {p.setting}</p>
            <p className="mt-2 text-sm text-gray-700 line-clamp-3">{p.summary}</p>
            <p className="mt-3 text-xs font-semibold text-saffron-700">Central figure: <span className="font-normal text-gray-700">{p.centralCharacter}</span></p>
          </Link>
        ))}
      </div>

      <section className="mt-12 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Related study</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Link href="/gita" className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 hover:bg-indigo-100">
            <div className="text-sm font-semibold text-indigo-900">Bhagavad Gita</div>
            <div className="text-xs text-indigo-700">Krishna&apos;s teaching inside Bhishma Parva</div>
          </Link>
          <Link href="/deity/krishna" className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 hover:bg-blue-100">
            <div className="text-sm font-semibold text-blue-900">About Lord Krishna</div>
            <div className="text-xs text-blue-700">Charioteer, counselor, divine</div>
          </Link>
          <Link href="/ramayana" className="rounded-xl border border-saffron-200 bg-saffron-50/40 p-4 hover:bg-saffron-100">
            <div className="text-sm font-semibold text-saffron-900">Valmiki Ramayana</div>
            <div className="text-xs text-saffron-700">India&apos;s other great epic</div>
          </Link>
          <Link href="/dashavatar/krishna" className="rounded-xl border border-purple-200 bg-purple-50/40 p-4 hover:bg-purple-100">
            <div className="text-sm font-semibold text-purple-900">Krishna avatar</div>
            <div className="text-xs text-purple-700">Eighth avatar of Vishnu</div>
          </Link>
          <Link href="/puranas/bhagavata-purana" className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 hover:bg-emerald-100">
            <div className="text-sm font-semibold text-emerald-900">Bhagavata Purana</div>
            <div className="text-xs text-emerald-700">Krishna&apos;s life in detail</div>
          </Link>
          <Link href="/festival/krishna-janmashtami" className="rounded-xl border border-yellow-200 bg-yellow-50/40 p-4 hover:bg-yellow-100">
            <div className="text-sm font-semibold text-yellow-900">Janmashtami</div>
            <div className="text-xs text-yellow-700">Krishna&apos;s birth festival</div>
          </Link>
        </div>
      </section>
    </main>
  );
}
