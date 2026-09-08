// Devotional aarti index — links to per-aarti lyrics pages.
// Targets "hindu aarti lyrics", "aarti collection", "devotional songs".
import type { Metadata } from 'next';
import Link from 'next/link';
import { AARTIS } from '../../lib/aartis';
import { buttonClass } from '../../components/ui/button-recipe';
import { H1 } from '../../components/ui/heading-recipe';

export const revalidate = 86400;

/* PERF-04 — WHY THIS PAGE DRAWS ITS ICONS FROM A SPRITE INSTEAD OF lucide-react.
 *
 * Measured on production 2026-09-08 (status asserted 200; the origin serves
 * Cloudflare block pages under a concurrent burst, so an unpaced probe measures
 * the wrong document — OPS-12/F451): /aarti was 616,628 B of HTML, the heaviest
 * document on the site, carrying 326 inline <svg> elements.
 *
 * Three of those are the page. The other ~300 were <Music/>, <Clock/> and
 * <ArrowRight/> rendered INSIDE the map over AARTIS — three pictures repeated
 * once per aarti, for 100 aartis. That measured 117,569 B of literal <svg> in
 * the markup (19.1% of the document), and it is charged twice: 60.5% of this
 * page is `self.__next_f.push` flight payload, where the same icon reappears as
 * triple-escaped JSON — a single <Music/> costs 369 B of HTML plus ~600 B of
 * flight, because every quote in [\"$\",\"svg\",null,{...}] is escaped to four
 * bytes. ~970 B x 300 = ~290 KB of a 617 KB page to draw three shapes.
 *
 * A <symbol> sprite emitted once plus a <use> per row is the standard fix and
 * the geometry below is copied verbatim from what lucide-react was already
 * emitting, so the rendering is identical. The icons stay in the DOM and stay
 * aria-hidden; only the duplication goes.
 *
 * NOTE ON COMPRESSION, because the raw number is not the whole story: 300
 * identical icons compress extremely well, so /aarti's *wire* cost was already
 * modest (25,423 B brotli). What this removes is parse work, DOM nodes and
 * flight-payload deserialisation on the phone — the CWV-01 cost, not the
 * bandwidth cost. Do not "restore readability" by putting the components back.
 *
 * The sprite must NOT be display:none — that breaks <use> resolution in some
 * engines. Zero-sized and absolutely positioned is the safe way to hide it.
 */
const ICON = {
  music: 'aarti-i-music',
  clock: 'aarti-i-clock',
  arrowRight: 'aarti-i-arrow-right',
} as const;

function IconSprite() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="0"
      height="0"
      aria-hidden="true"
      focusable="false"
      style={{ position: 'absolute' }}
    >
      <symbol
        id={ICON.music}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </symbol>
      <symbol
        id={ICON.clock}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </symbol>
      <symbol
        id={ICON.arrowRight}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 12h14" />
        <path d="m12 5 7 7-7 7" />
      </symbol>
    </svg>
  );
}

/** One <use> reference. Decorative by definition — every call site is an icon. */
function Icon({ id, className }: { id: string; className?: string }) {
  return (
    <svg className={className} aria-hidden="true" focusable="false">
      <use href={`#${id}`} />
    </svg>
  );
}

export const metadata: Metadata = {
  title: 'Hindu Aarti Lyrics — Shiv, Ganesh, Lakshmi, Durga, Hanuman, Sai',
  description: `Complete lyrics in Hindi and English transliteration for ${AARTIS.length} most-sung Hindu aartis with meaning. Sing along during daily puja, Diwali, Navaratri.`,
  alternates: { canonical: 'https://darshya.online/aarti' },
};

export default function AartiIndex() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Hindu Aarti Lyrics Collection',
    numberOfItems: AARTIS.length,
    itemListElement: AARTIS.map((a, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `https://darshya.online/aarti/${a.slug}`,
      name: a.name,
    })),
  };

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <IconSprite />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="mb-10 text-center">
        <h1 className={`${H1.marketing} mb-3`}>
          Hindu Aarti Lyrics
        </h1>
        <p className="prose-lead text-surface-700 max-w-2xl mx-auto">
          Sacred devotional songs sung at the conclusion of every puja. Full lyrics in Devanagari + transliteration + meaning in English.
        </p>
      </header>

      <div className="grid sm:grid-cols-2 gap-4">
        {AARTIS.map((a) => (
          <Link
            key={a.slug}
            href={`/aarti/${a.slug}`}
            className="group block rounded-2xl border border-surface-200 bg-white p-6 hover:border-saffron-300 hover:shadow-md transition"
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-saffron-100 flex items-center justify-center">
                <Icon id={ICON.music} className="w-5 h-5 text-saffron-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-surface-900 group-hover:text-saffron-700">
                  {a.name}
                </h2>
                <p className="text-xs font-serif text-saffron-700 mb-1">{a.sanskrit}</p>
                <p className="text-sm text-surface-600 mb-3">{a.deity}</p>
                <div className="flex items-center gap-3 text-xs text-surface-500">
                  <span className="inline-flex items-center gap-1">
                    <Icon id={ICON.clock} className="w-3 h-3" /> {a.durationMinutes} min
                  </span>
                  <span className="truncate">{a.whenSung.split(',')[0]}</span>
                </div>
              </div>
              <Icon id={ICON.arrowRight} className="w-4 h-4 text-surface-400 group-hover:text-saffron-600 flex-shrink-0 mt-1" />
            </div>
          </Link>
        ))}
      </div>

      <section className="mt-12 rounded-2xl bg-gradient-to-br from-saffron-50 to-amber-50 border border-saffron-200 p-6 text-center">
        <h2 className="text-xl font-bold text-surface-900 mb-2">
          Book a puja with traditional aarti
        </h2>
        <p className="text-sm text-surface-700 mb-4">
          Every Darshya puja concludes with the appropriate aarti, recorded as video proof.
        </p>
        <Link
          href="/pujas"
          className={buttonClass('primary', 'md')}
        >
          Browse all pujas <Icon id={ICON.arrowRight} className="w-4 h-4" />
        </Link>
      </section>
    </main>
  );
}
