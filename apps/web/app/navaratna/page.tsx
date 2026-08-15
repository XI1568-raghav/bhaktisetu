import type { Metadata } from 'next';
import Link from 'next/link';
import { NAVARATNA } from '../../lib/navaratna';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: '9 Navaratna Gems — Vedic Gemology for Nava-Graha',
  description:
    'The nine sacred gems of Vedic astrology — Ruby, Pearl, Red Coral, Emerald, Yellow Sapphire, Diamond, Blue Sapphire, Hessonite, Cat\'s Eye. Each paired with its ruling planet, with finger, metal, weight, day, mantra, benefits, side-effects, quality indicators, price guidance, and substitutes.',
  alternates: { canonical: 'https://darshya.online/navaratna' },
};

const PLANET_COLOR: Record<string, string> = {
  surya: 'bg-amber-100 text-amber-900 border-amber-300',
  chandra: 'bg-slate-100 text-slate-900 border-slate-300',
  mangal: 'bg-red-100 text-red-900 border-red-300',
  budha: 'bg-emerald-100 text-emerald-900 border-emerald-300',
  brihaspati: 'bg-yellow-100 text-yellow-900 border-yellow-300',
  shukra: 'bg-pink-100 text-pink-900 border-pink-300',
  shani: 'bg-indigo-100 text-indigo-900 border-indigo-300',
  rahu: 'bg-orange-100 text-orange-900 border-orange-300',
  ketu: 'bg-stone-100 text-stone-900 border-stone-300',
};

export default function NavaratnaIndexPage() {
  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Navaratna — 9 Sacred Gems of Vedic Astrology',
    itemListElement: NAVARATNA.map((n, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `https://darshya.online/navaratna/${n.slug}`,
      name: `${n.englishName} (${n.hindiName}) — ${n.planet}`,
    })),
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://darshya.online' },
      { '@type': 'ListItem', position: 2, name: 'Navaratna', item: 'https://darshya.online/navaratna' },
    ],
  };

  return (
    <main className="min-h-[100dvh] bg-gradient-to-b from-saffron-50 via-white to-amber-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <section className="mx-auto max-w-6xl px-4 py-12">
        <nav className="text-sm text-gray-600 mb-4">
          <Link href="/" className="hover:text-saffron-600">Home</Link> / <span className="text-gray-900">Navaratna</span>
        </nav>
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3">9 Navaratna — Sacred Gems of Vedic Astrology</h1>
        <p className="text-lg text-gray-700 max-w-3xl mb-3">
          The nine gems of Vedic gemology, one for each of the Nava-Graha. Worn correctly, a gem amplifies the favorable
          effects of its ruling planet and softens its malefic results. Worn wrong, it can cause the very afflictions it
          was meant to cure — which is why proper consultation, trial period, and quality verification matter.
        </p>
        <p className="text-base text-gray-600 max-w-3xl">
          For each gem below: ruling planet, finger, metal, weight, day to wear, mantra, benefits, who-should-not-wear,
          side-effects if wrong, quality indicators, price range, substitutes, and trial duration.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {NAVARATNA.map((n) => {
            const color = PLANET_COLOR[n.planetSlug] || 'bg-slate-100 text-slate-900 border-slate-300';
            return (
              <Link
                key={n.slug}
                href={`/navaratna/${n.slug}`}
                className="block rounded-xl border border-saffron-200 bg-white p-5 hover:border-saffron-400 hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-xl font-bold text-saffron-900">{n.englishName}</div>
                    <div className="text-base text-gray-700">{n.hindiName} · {n.sanskritName}</div>
                  </div>
                  <span className="text-xs text-saffron-600 font-semibold">#{n.number}</span>
                </div>
                <div className={`inline-block text-xs px-2 py-1 rounded border ${color} mb-3`}>
                  {n.planet}
                </div>
                <div className="text-xs text-gray-600 mb-1"><span className="font-medium">Day:</span> {n.dayToWear}</div>
                <div className="text-xs text-gray-600 mb-1"><span className="font-medium">Finger:</span> {n.finger.split(' of ')[0]}</div>
                <div className="text-xs text-gray-600"><span className="font-medium">Metal:</span> {n.metal.split(',')[0]}</div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-16">
        <div className="rounded-2xl bg-amber-50 border-2 border-amber-300 p-6 md:p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Important guidance before buying any gem</h2>
          <ul className="text-gray-800 space-y-2 list-disc pl-5">
            <li><strong>Get jyotish consultation first.</strong> A wrong gem can amplify the very problem you wanted to remove. Particularly Blue Sapphire and Hessonite — never wear without trial.</li>
            <li><strong>Quality matters more than carat.</strong> A 2-carat genuine pure gem outperforms a 10-carat treated or synthetic one. Synthetic / lab-grown gems carry no jyotish effect per traditional acharyas.</li>
            <li><strong>Trial period is mandatory</strong> for Saturn (Blue Sapphire) and Rahu/Ketu (Hessonite/Cat\'s Eye) — 3 days minimum. Sleep with stone under pillow. Watch dreams, sleep quality, sudden incidents.</li>
            <li><strong>Energise (pran-pratishtha) the gem</strong> on its planet&apos;s day at sunrise with 108 repetitions of the beej mantra, milk + ganga jal + tulsi-water bath, then wear immediately.</li>
            <li><strong>Never combine enemy-planet gems</strong> — Ruby + Blue Sapphire (Sun-Saturn), Pearl + Hessonite (Moon-Rahu), Emerald + Cat&apos;s Eye (Mercury-Ketu), Diamond + Yellow Sapphire (Venus-Jupiter).</li>
          </ul>
          <div className="flex flex-wrap gap-3 mt-6">
            <Link href="/nava-graha" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm">
              9 Nava-Graha
            </Link>
            <Link href="/astrology" className="px-4 py-2 bg-saffron-600 text-white rounded-lg hover:bg-saffron-700 text-sm">
              Book astrology consult
            </Link>
            <Link href="/rashi" className="px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 text-sm">
              12 Rashi
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
