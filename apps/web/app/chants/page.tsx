import type { Metadata } from 'next';
// DU-05: the one h1 recipe per page archetype. Extras are layout-only.
import { H1 } from '../../components/ui/heading-recipe';
import Link from 'next/link';
import { CHANTS, chantsByCategory } from '../../lib/chants';
import { buttonClass } from '../../components/ui/button-recipe';

export const revalidate = 86400;

const BASE_URL = 'https://darshya.online';

export const metadata: Metadata = {
  title: '12 Famous Hindu Chants — Gayatri, Mahamrityunjaya, Hare Krishna, Hanuman Chalisa',
  description:
    'Most powerful Hindu mantras and chants with sanskrit lyrics, transliteration, meaning, benefits and how-to-chant guide. Gayatri, Mahamrityunjaya, Shanti, Ganesh, Lakshmi, Saraswati, Hanuman, Krishna, Durga mantras.',
  alternates: { canonical: `${BASE_URL}/chants` },
  openGraph: {
    title: '12 Famous Hindu Chants — Lyrics, Meaning, Benefits',
    description: 'Sanskrit text + transliteration + how-to-chant for the most powerful Hindu mantras.',
    url: `${BASE_URL}/chants`,
    type: 'website',
    images: ['/og/default.png'],
  },
};

function itemListJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Famous Hindu Chants',
    numberOfItems: CHANTS.length,
    itemListElement: CHANTS.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${BASE_URL}/chants/${c.slug}`,
      name: c.name,
    })),
  };
}

const sections = [
  { key: 'protection' as const, title: 'Protection & Healing', desc: 'Mantras invoking divine shield against illness, accidents, negative energy.' },
  { key: 'wisdom' as const, title: 'Wisdom & Learning', desc: 'Awaken the intellect, sharpen memory, gain clarity in decisions.' },
  { key: 'wealth' as const, title: 'Wealth & Prosperity', desc: 'Invoke Lakshmi-tattva — both material and spiritual abundance.' },
  { key: 'peace' as const, title: 'Inner Peace', desc: 'Calm restless mind, dispel fear, settle anxiety.' },
  { key: 'devotional' as const, title: 'Devotional (Bhakti)', desc: 'Pure name-chanting cultivating love for the divine.' },
  { key: 'invocation' as const, title: 'Invocation (Opening)', desc: 'Chanted at the start of every new venture, study, or ceremony.' },
];

const catColor: Record<string, string> = {
  protection: 'border-blue-300 bg-blue-50',
  wisdom: 'border-amber-300 bg-amber-50',
  wealth: 'border-yellow-300 bg-yellow-50',
  peace: 'border-emerald-300 bg-emerald-50',
  devotional: 'border-pink-300 bg-pink-50',
  invocation: 'border-saffron-300 bg-saffron-50',
};

const diffLabel: Record<string, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

/* PERF-04 — line-clamp IS A PAINT INSTRUCTION, NOT A TRANSFER INSTRUCTION.
 *
 * Measured on production 2026-09-08 (status asserted 200 before the body was
 * read — OPS-12/F451): /chants was 419,824 B of HTML and, unusually, the
 * WORST-compressing page on the site at 66,955 B gzip against /aarti's 43,758 B
 * from a document half again as large. /aarti is heavy with 300 identical
 * icons, which compress to nearly nothing. This page is heavy with unique
 * prose, which does not compress, so its weight lands on the wire in full.
 *
 * Where it came from: the card summary below is `line-clamp-2`, which paints
 * two lines and ships all of them. Measured over lib/chants.ts: `meaning` is
 * n=96, avg 364 chars, max 735, 34,985 B in total — and, because 59.1% of this
 * document is `self.__next_f.push` flight payload re-encoding the same tree,
 * every one of those characters is paid for twice.
 *
 * Two lines of text-sm in this card is ~110 characters at any viewport, so
 * everything past the bound below was transferred, parsed, hydrated, and never
 * shown to one reader.
 *
 * This is a genuine data reduction, not a content deletion: the untruncated
 * `meaning` is the body copy of /chants/[slug], which is the URL that should
 * be ranking for it. An index page that repeats the full text of 96 detail
 * pages is competing with its own children, not helping them.
 *
 * 180 is deliberately generous — comfortably more than any viewport paints —
 * so this bounds the waste without policing anybody's copy.
 * Locked by __tests__/catalogue-index-payload-weight.perf04.test.tsx.
 */
const CARD_SUMMARY_MAX = 180;

function cardSummary(text: string): string {
  if (text.length <= CARD_SUMMARY_MAX) return text;
  const cut = text.slice(0, CARD_SUMMARY_MAX);
  const lastSpace = cut.lastIndexOf(' ');
  // Never cut mid-word, but never hand back a stub either if the "word" is
  // pathologically long (Devanagari compounds do run long).
  return `${(lastSpace > CARD_SUMMARY_MAX * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

export default function ChantsIndex() {
  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd()) }}
      />

      <header className="text-center mb-10">
        <div className="inline-block px-3 py-1 mb-3 text-xs font-semibold text-saffron-700 bg-saffron-100 rounded-full">
          Sacred Mantras · Mantra Yoga
        </div>
        <h1 className={`${H1.marketing} mb-3`}>
          Famous Hindu Chants
        </h1>
        <p className="prose-lead text-surface-700 leading-relaxed max-w-3xl mx-auto">
          The most powerful standalone mantras of Sanatan Dharma — each with full sanskrit,
          transliteration, meaning, benefits, and instructions for daily practice. Mantra is sound
          made conscious; chanted with shraddha and proper count, it shapes karma and consciousness.
        </p>
      </header>

      <section className="mb-8 rounded-xl border border-saffron-200 bg-saffron-50 p-5 text-center">
        <h2 className="text-lg font-bold text-surface-900 mb-2">Want per-deity mantra collections?</h2>
        <p className="text-surface-700 text-sm mb-3">
          For deity-grouped mantras (all Shiva mantras, all Lakshmi mantras), browse the deity pages.
        </p>
        <Link
          href="/deity"
          className={buttonClass('primary', 'md')}
        >
          Browse all deities →
        </Link>
      </section>

      {sections.map((sec, i) => {
        const items = chantsByCategory(sec.key);
        if (items.length === 0) return null;
        return (
          <section
            key={sec.key}
            className="mb-10"
            /* CWV-01 — the same trade the homepage already makes in four
               places (`.defer-paint`, app/globals.css): these sections are
               below the fold and text-only, so skipping their layout and paint
               until they approach the viewport costs nothing visible and
               removes the largest share of this page's main-thread work. The
               markup stays in the HTML for crawlers, in-page search and
               hydration — this is a paint saving, NOT a byte saving.
               `auto` on contain-intrinsic-size lets the browser remember each
               section's real height after first render, so the scrollbar stays
               honest and no jump-link lands short. Section 0 is excluded
               because it is above the fold, which is the one case where
               content-visibility is a regression. */
            style={i === 0 ? undefined : { contentVisibility: 'auto', containIntrinsicSize: 'auto 900px' }}
          >
            <h2 className="text-2xl font-bold text-surface-900 mb-1">{sec.title}</h2>
            <p className="text-sm text-surface-600 mb-4">{sec.desc}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {items.map((c) => (
                <Link
                  key={c.slug}
                  href={`/chants/${c.slug}`}
                  className={`group rounded-xl border p-5 hover:shadow-md transition ${catColor[c.category]}`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <h3 className="text-lg font-bold text-surface-900 group-hover:text-saffron-700 truncate">
                        {c.name}
                      </h3>
                      <div className="text-sm text-surface-600 truncate">{c.sanskritName}</div>
                    </div>
                    <span className="shrink-0 text-xs font-semibold uppercase tracking-wider px-2 py-0.5 bg-white border border-surface-300 text-surface-700 rounded-full">
                      {diffLabel[c.difficulty]}
                    </span>
                  </div>
                  <p className="text-sm text-surface-700 leading-snug mb-3 line-clamp-2">
                    {cardSummary(c.meaning)}
                  </p>
                  <div className="text-xs text-surface-600">
                    <strong className="text-surface-800">Deity:</strong> {c.deity}
                    <span className="mx-2">·</span>
                    <strong className="text-surface-800">Count:</strong> {c.recommendedCount}x
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );
      })}

      <section className="mt-12 rounded-xl border border-saffron-200 bg-saffron-50 p-6 text-center">
        <h2 className="text-xl font-bold text-surface-900 mb-2">Need a pandit to chant for you?</h2>
        <p className="text-surface-700 text-sm mb-4">
          For major sankalp (vow) — like 1.25 lakh Mahamrityunjaya jaap or full Vishnu Sahasranama
          recitation — pandits can perform on your behalf with video proof.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            href="/ask-pandit"
            className={buttonClass('primary', 'md')}
          >
            Book a pandit →
          </Link>
          <Link
            href="/aarti"
            className="px-5 py-2 border border-saffron-600 text-saffron-700 rounded-md text-sm font-semibold hover:bg-saffron-50"
          >
            Browse aartis
          </Link>
        </div>
      </section>
    </main>
  );
}
