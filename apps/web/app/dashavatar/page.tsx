import type { Metadata } from 'next';
import Link from 'next/link';
import { DASHAVATAR, YUGA_ORDER, YUGA_LABELS, type AvatarYuga } from '../../lib/dashavatar';
import { H1 } from '../../components/ui/heading-recipe';

export const revalidate = 86400;

const BASE_URL = 'https://darshya.online';

export const metadata: Metadata = {
  title: 'Dashavatar — 10 Avatars of Vishnu',
  description: 'The ten incarnations of Vishnu — Matsya, Kurma, Varaha, Narasimha, Vamana, Parashurama, Rama, Krishna, Buddha, Kalki. Yuga, purpose, demon slain, principal scripture.',
  alternates: { canonical: `${BASE_URL}/dashavatar` },
  openGraph: {
    images: ['/images/golden-temple-og.jpg'],
    title: 'Dashavatar — 10 Avatars of Vishnu',
    description: 'From the cosmic flood to the future-rider on a white horse — the ten Vishnu incarnations across the four yugas.',
    url: `${BASE_URL}/dashavatar`,
    type: 'website',
  },
};

const YUGA_COLOR: Record<AvatarYuga, { bg: string; border: string; text: string; accent: string }> = {
  satya: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-900', accent: 'text-amber-700' },
  treta: { bg: 'bg-saffron-50', border: 'border-saffron-200', text: 'text-saffron-900', accent: 'text-saffron-700' },
  dvapara: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-900', accent: 'text-indigo-700' },
  kali: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-900', accent: 'text-rose-700' },
  'future-kali': { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-900', accent: 'text-emerald-700' },
};

export default function DashavatarIndexPage() {
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Dashavatar — 10 Avatars of Vishnu',
    numberOfItems: DASHAVATAR.length,
    itemListElement: DASHAVATAR.map((a, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      item: {
        '@type': 'Article',
        name: a.name,
        url: `${BASE_URL}/dashavatar/${a.slug}`,
      },
    })),
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Dashavatar', item: `${BASE_URL}/dashavatar` },
    ],
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([ld, breadcrumb]) }} />

      <nav className="mb-4 text-sm text-gray-600">
        <Link href="/" className="hover:underline">Home</Link> <span className="mx-1">/</span> <span>Dashavatar</span>
      </nav>

      <header className="mb-8 rounded-xl bg-gradient-to-br from-saffron-50 via-amber-50 to-rose-50 p-6 ring-1 ring-saffron-200">
        <h1 className={H1.catalogue}>Dashavatar — दशावतार</h1>
        <p className="mt-2 text-lg text-amber-900">The ten incarnations of Vishnu</p>
        <p className="mt-3 max-w-3xl text-gray-800">
          Whenever dharma declines and adharma rises, Vishnu descends. The ten classical avataras — from the fish who saved the Vedas at the first deluge to the future rider who will end Kali Yuga — span the four yugas and trace the moral arc of cosmic history.
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <span className="rounded-full bg-white px-3 py-1 ring-1 ring-amber-300 text-amber-900">10 avataras</span>
          <span className="rounded-full bg-white px-3 py-1 ring-1 ring-saffron-300 text-saffron-900">4 yugas</span>
          <span className="rounded-full bg-white px-3 py-1 ring-1 ring-indigo-300 text-indigo-900">Bhagavata 1.3</span>
          <span className="rounded-full bg-white px-3 py-1 ring-1 ring-emerald-300 text-emerald-900">Vishnu Purana 5</span>
        </div>
      </header>

      <section className="mb-8 rounded-lg border border-indigo-200 bg-indigo-50 p-5">
        <h2 className="mb-2 text-lg font-semibold text-indigo-900">Why ten?</h2>
        <p className="text-sm text-gray-800">
          The dashavatar is a teaching of <em>cyclical protection</em>. Each avatara appears at a moment when a specific kind of adharma has overwhelmed dharma, and the form is chosen for the threat: a fish in a flood, a tortoise to bear a mountain, a man-lion against a pillar-bound boon, a sage against tyrant kings, a prince of duty, a teacher of bhakti, a reformer of cruelty, and a future rider against the demon-king of the present age.
        </p>
      </section>

      {YUGA_ORDER.map((yuga) => {
        const inYuga = DASHAVATAR.filter((a) => a.yuga === yuga);
        if (inYuga.length === 0) return null;
        const c = YUGA_COLOR[yuga];
        return (
          <section key={yuga} className="mb-8">
            <h2 className={`mb-3 text-xl font-bold ${c.text}`}>{YUGA_LABELS[yuga]}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {inYuga.map((a) => (
                <Link
                  key={a.slug}
                  href={`/dashavatar/${a.slug}`}
                  className={`group rounded-lg border ${c.border} ${c.bg} p-4 transition hover:shadow-md`}
                >
                  <div className="flex items-baseline justify-between">
                    <h3 className={`text-lg font-semibold ${c.text} group-hover:underline`}>
                      #{a.number} {a.name}
                    </h3>
                    <span className={`text-sm ${c.accent}`}>{a.sanskrit}</span>
                  </div>
                  <p className="mt-1 text-xs italic text-gray-600">{a.form}</p>
                  <p className="mt-2 text-sm text-gray-800">{a.bestKnownFor}</p>
                </Link>
              ))}
            </div>
          </section>
        );
      })}

      <section className="mt-10 rounded-lg border border-amber-200 bg-amber-50 p-5">
        <h2 className="mb-3 text-lg font-semibold text-amber-900">Related study</h2>
        <ul className="space-y-2 text-sm text-gray-800">
          <li>• <Link href="/gita" className="text-saffron-700 hover:underline">Bhagavad Gita</Link> — Krishna&apos;s direct teaching during the Mahabharata war</li>
          <li>• <Link href="/ramayana" className="text-saffron-700 hover:underline">Ramayana</Link> — the life of Rama, the 7th avatara</li>
          <li>• <Link href="/puranas/bhagavata-purana" className="text-saffron-700 hover:underline">Bhagavata Purana</Link> — primary source for the dashavatar narrative</li>
          <li>• <Link href="/vedas" className="text-saffron-700 hover:underline">4 Vedas</Link> — what Matsya rescued at the first deluge</li>
        </ul>
      </section>
    </main>
  );
}
