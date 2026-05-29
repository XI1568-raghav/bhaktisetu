import type { Metadata } from 'next';
import Link from 'next/link';
import { PANCHA_BHOOTA } from '../../lib/pancha-bhoota';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: '5 Pancha Bhoota Stalam — Five Element Shiva Temples | Darshya',
  description:
    'The five Tamil Nadu Shiva temples mapped to the five great elements — Earth (Ekambareshwarar Kanchipuram), Water (Jambukeshwarar Thiruvanaikaval), Fire (Arunachala Thiruvannamalai), Air (Srikalahasti), Ether (Nataraja Chidambaram). Element-proof, sthala vriksha, signature ritual, mantra at each.',
  alternates: { canonical: 'https://darshya.online/pancha-bhoota' },
};

const ELEMENT_THEME: Record<string, { bg: string; ring: string; text: string; chip: string }> = {
  'Earth (Prithvi)': {
    bg: 'bg-gradient-to-br from-amber-50 to-yellow-100',
    ring: 'border-amber-300',
    text: 'text-amber-900',
    chip: 'bg-amber-200 text-amber-900 border-amber-400',
  },
  'Water (Apas / Jala)': {
    bg: 'bg-gradient-to-br from-cyan-50 to-sky-100',
    ring: 'border-cyan-300',
    text: 'text-cyan-900',
    chip: 'bg-cyan-200 text-cyan-900 border-cyan-400',
  },
  'Fire (Agni / Tejas)': {
    bg: 'bg-gradient-to-br from-orange-50 to-red-100',
    ring: 'border-orange-300',
    text: 'text-orange-900',
    chip: 'bg-orange-200 text-orange-900 border-orange-400',
  },
  'Air (Vayu)': {
    bg: 'bg-gradient-to-br from-sky-50 to-blue-100',
    ring: 'border-sky-300',
    text: 'text-sky-900',
    chip: 'bg-sky-200 text-sky-900 border-sky-400',
  },
  'Ether / Space (Akasha)': {
    bg: 'bg-gradient-to-br from-violet-50 to-indigo-100',
    ring: 'border-violet-300',
    text: 'text-violet-900',
    chip: 'bg-violet-200 text-violet-900 border-violet-400',
  },
};

export default function PanchaBhootaIndexPage() {
  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Pancha Bhoota Stalam — Five Element Shiva Temples',
    itemListElement: PANCHA_BHOOTA.map((t, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `https://darshya.online/pancha-bhoota/${t.slug}`,
      name: `${t.templeName} (${t.element})`,
    })),
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://darshya.online' },
      { '@type': 'ListItem', position: 2, name: 'Pancha Bhoota Stalam', item: 'https://darshya.online/pancha-bhoota' },
    ],
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-saffron-50 via-white to-amber-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <section className="mx-auto max-w-6xl px-4 py-12">
        <nav className="text-sm text-gray-600 mb-4">
          <Link href="/" className="hover:text-saffron-600">Home</Link> / <span className="text-gray-900">Pancha Bhoota Stalam</span>
        </nav>
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3">5 Pancha Bhoota Stalam</h1>
        <p className="text-lg text-gray-700 max-w-3xl mb-3">
          Five Tamil Nadu Shiva temples, each manifesting one of the pancha bhoota (five great elements) of the cosmos —
          earth, water, fire, air, and ether. Visiting all five in sequence is considered one of the most powerful Shaiva
          pilgrimages in South India.
        </p>
        <p className="text-base text-gray-600 max-w-3xl">
          At each temple, the element is not symbolic — it is physically demonstrated. Sand at Kanchipuram, an underground
          spring at Thiruvanaikaval, the hill itself at Thiruvannamalai, a flickering flame in a closed sanctum at Srikalahasti,
          and pure empty space at Chidambaram.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {PANCHA_BHOOTA.map((t) => {
            const theme = ELEMENT_THEME[t.element] || ELEMENT_THEME['Earth (Prithvi)'];
            return (
              <Link
                key={t.slug}
                href={`/pancha-bhoota/${t.slug}`}
                className={`block rounded-2xl border-2 ${theme.ring} ${theme.bg} p-6 hover:shadow-xl transition-all`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className={`text-2xl font-bold ${theme.text}`}>{t.templeName}</div>
                    <div className="text-base text-gray-700">{t.templeSanskrit}</div>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded border ${theme.chip}`}>#{t.number}</span>
                </div>
                <div className={`inline-block text-sm font-semibold px-3 py-1 rounded-full border ${theme.chip} mb-3`}>
                  {t.element} <span className="font-normal opacity-80">({t.elementSanskrit})</span>
                </div>
                <div className="text-sm text-gray-700 mb-2">
                  <span className="font-medium">{t.city}, {t.state}</span>
                </div>
                <div className="text-sm text-gray-700 mb-3 line-clamp-2">
                  <span className="font-medium">Lingam:</span> {t.lingaForm.split('—')[0].trim()}
                </div>
                <div className="text-xs text-gray-600 italic">Sthala Vriksha: {t.sthalaVriksha.split('—')[0].trim()}</div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-16">
        <div className="rounded-2xl bg-white border border-saffron-200 p-6 md:p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Why these five?</h2>
          <p className="text-gray-700 mb-3">
            The Samkhya and Vaisheshika darshanas teach that all material reality is constructed from five mahabhutas —
            prithvi (earth), apas (water), tejas (fire), vayu (air), and akasha (ether). The Pancha Bhoota Stalas are the
            five physical places where Shiva is said to be present *as* each element, not merely worshipped through it.
            Together they form a complete cosmological map.
          </p>
          <p className="text-gray-700 mb-4">
            Pilgrims traditionally visit all five in a single trip — usually in the order Earth → Water → Fire → Air → Ether,
            mirroring the cosmological evolution of the elements from gross to subtle.
          </p>
          <div className="flex flex-wrap gap-3 mt-4">
            <Link href="/jyotirlinga" className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm">
              12 Jyotirlingas
            </Link>
            <Link href="/tirth" className="px-4 py-2 bg-saffron-600 text-white rounded-lg hover:bg-saffron-700 text-sm">
              Tirth destinations
            </Link>
            <Link href="/pilgrimage" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm">
              Pilgrimage circuits
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
