// Per-deity hub page: overview + mantra + pujas the user can book for this
// deity right now. Programmatic-SEO play for long-tail "{deity} puja online"
// queries. One file fans out to N deities via [slug] segment.
import type { Metadata } from 'next';
// DU-05: the one h1 recipe per page archetype. Extras are layout-only.
import { H1 } from '../../../components/ui/heading-recipe';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { getDeity, DEITIES } from '../../../lib/deities';
// CI-06: 30 encyclopedia links point at a /deity/<slug> that does not exist,
// and this route is dynamicParams=false so every one is a HARD 404. Seven of
// them are spelling drift onto a deity that does have a page (murugan →
// kartikeya, venkateswara → venkateshwara, bhairav → bhairava, …). Serving
// those aliases here and 308ing them onto the canonical URL repairs the call
// sites — including lib/festivals.ts and lib/cities.ts — without a second
// copy of the mapping in every dataset. Same shape as SEO-06 on /temples.
import { CONTENT_DEITY_SLUG_ALIASES } from '../../../lib/content-deity-link';
import { getPujaTypes } from '../../../lib/api';
// CM-10: the chip below is `uppercase tracking-wider`, so the raw enum used to
// render as 'SPECIAL_OCCASION'.
import { pujaCategoryLabel } from '../../../lib/puja-labels';
import { getMantrasForDeity } from '../../../lib/deity-mantras';
import { buttonClass } from '../../../components/ui/button-recipe';
import { withEightyG } from '../../../lib/eighty-g';

export const revalidate = 3600;
export const dynamicParams = false;

export async function generateStaticParams() {
  return [
    ...DEITIES.map((d) => ({ slug: d.slug })),
    // The alias slugs render only to 308 (see below). They are deliberately
    // NOT in app/sitemap.ts — one temple/deity, one advertised URL.
    ...Object.keys(CONTENT_DEITY_SLUG_ALIASES).map((slug) => ({ slug })),
  ];
}

interface Params {
  params: Promise<{ slug: string }>;
}

function fmtINR(s: string): string {
  const n = parseFloat(s);
  return Number.isFinite(n) ? `₹${n.toLocaleString('en-IN')}` : s;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  // CI-06: an alias slug only ever 308s; it must not advertise itself.
  if (CONTENT_DEITY_SLUG_ALIASES[slug]) {
    return { title: 'Deity', robots: { index: false, follow: true } };
  }
  const d = getDeity(slug);
  if (!d) return { title: 'Deity' };
  return {
    // TC-08: "verified pandits" named a vetting step that does not run.
    // Priest.isVerified / .verificationStatus / .aadhaarVerified have no
    // writer outside prisma/seed.ts, and aadhaarVerified is read in one place
    // (payment.service.ts) as a payout gate. Video proof is the part that is
    // real, so it is the part the title sells.
    title: `${d.name} pujas online — video proof on every booking`,
    description: `Book ${d.name} pujas online at a temple you choose. ${d.popularPujas.join(', ')}. Mantra: ${d.mantra}. Video proof on every booking.${withEightyG(' 80G receipts.')}`,
    alternates: { canonical: `https://darshya.online/deity/${d.slug}` },
    openGraph: {
      title: `${d.name} — pujas, mantras, festivals`,
      description: `Verified ${d.name} pujas. Festival: ${d.festival}.`,
      url: `https://darshya.online/deity/${d.slug}`,
      type: 'website',
      images: ['/og/default.png'],
    },
  };
}

export default async function DeityPage({ params }: Params) {
  const { slug } = await params;
  // CI-06: an alias slug is served only to redirect. Never rendered, never
  // self-canonical — the canonical page owns the link equity.
  const canonical = CONTENT_DEITY_SLUG_ALIASES[slug];
  if (canonical) permanentRedirect(`/deity/${canonical}`);
  const d = getDeity(slug);
  if (!d) notFound();

  // API filter on deity field — list active pujas for this deity. Tolerant of
  // empty / errored API; static deity overview is still useful for SEO + intro.
  const pujasRes = await getPujaTypes({ deity: d.deityKey, limit: 24 }).catch(
    () => null,
  );
  const pujas = pujasRes?.data.filter((p) => p.isActive) || [];

  const mantraCount = getMantrasForDeity(d.slug).length;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: d.name,
    alternateName: d.sanskrit,
    description: d.description,
    url: `https://darshya.online/deity/${d.slug}`,
  };

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav className="text-sm text-surface-600 mb-4">
        <Link href="/" className="hover:text-saffron-700">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/deity" className="hover:text-saffron-700">Deities</Link>
        <span className="mx-2">/</span>
        <span className="text-surface-900">{d.name}</span>
      </nav>

      <header className="mb-10">
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <span className="inline-block px-2.5 py-0.5 text-xs font-semibold text-saffron-700 bg-saffron-100 rounded-full">
            🕉️ Devata
          </span>
          <span className="text-xs text-surface-500">Festival: {d.festival}</span>
        </div>
        <h1 className={`${H1.catalogue} mb-2`}>
          {d.name} <span className="text-2xl font-serif text-surface-500 ml-2">{d.sanskrit}</span>
        </h1>
        {d.consort ? (
          <p className="text-sm text-surface-600 mb-3">Consort: {d.consort}</p>
        ) : null}
        <p className="text-surface-700 text-base leading-relaxed max-w-3xl">
          {d.description}
        </p>
      </header>

      <section className="mb-10 rounded-xl border border-saffron-200 bg-saffron-50 p-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-saffron-700 mb-2">
          Sacred mantra
        </h2>
        <p className="text-2xl font-serif text-surface-900 leading-relaxed">
          {d.mantra}
        </p>
        <p className="text-xs text-surface-600 mt-2">
          Recite 108 times for maximum benefit.
          {mantraCount > 0 ? (
            <>
              {' '}See{' '}
              <Link
                href={`/deity/${d.slug}/mantras`}
                className="text-saffron-700 hover:underline font-semibold"
              >
                all {mantraCount} {d.name} mantras →
              </Link>
            </>
          ) : (
            <>
              {' '}Use{' '}
              <Link href="/shlokas" className="text-saffron-700 hover:underline">our shloka library</Link>
              {' '}for more.
            </>
          )}
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold text-surface-900 mb-4">
          Book {d.name} pujas online
        </h2>
        {pujas.length === 0 ? (
          <div className="rounded-lg border border-surface-200 bg-surface-50 p-6">
            <p className="text-surface-700 mb-3">
              Popular {d.name} pujas: {d.popularPujas.join(', ')}.
            </p>
            <p className="text-sm text-surface-600 mb-4">
              Catalogue is being onboarded. Browse all pujas while we add {d.name} listings.
            </p>
            <Link
              href="/pujas"
              className={buttonClass('primary', 'md')}
            >
              Browse all pujas →
            </Link>
          </div>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {pujas.map((p) => (
              <li
                key={p.id}
                className="rounded-xl border border-surface-200 bg-white p-5 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center justify-between mb-2 gap-3">
                  {pujaCategoryLabel(p.category) && (
                    <span className="text-xs uppercase tracking-wider text-saffron-700 font-semibold">
                      {pujaCategoryLabel(p.category)}
                    </span>
                  )}
                  <span className="text-xs text-surface-500">{p.durationMinutes} min</span>
                </div>
                <h3 className="text-lg font-semibold text-surface-900 mb-1">{p.name}</h3>
                {p.nameLocal ? (
                  <p className="text-xs text-surface-500 font-serif mb-2">{p.nameLocal}</p>
                ) : null}
                <p className="text-sm text-surface-700 mb-4 line-clamp-3">{p.description}</p>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-lg font-bold text-surface-900">{fmtINR(p.basePrice)}</span>
                  <Link
                    href={`/pujas/${p.slug}`}
                    className="text-sm font-semibold text-saffron-700 hover:underline"
                  >
                    Book now →
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold text-surface-900 mb-4">Other deities</h2>
        <div className="flex flex-wrap gap-2">
          {DEITIES.filter((x) => x.slug !== d.slug).map((x) => (
            <Link
              key={x.slug}
              href={`/deity/${x.slug}`}
              className="inline-block px-3 py-1.5 rounded-full border border-surface-200 bg-white text-xs text-surface-700 hover:border-saffron-300 hover:text-saffron-700"
            >
              {x.name}
            </Link>
          ))}
        </div>
      </section>

      <footer className="border-t border-surface-200 pt-6 text-sm text-surface-600">
        <p className="mb-2">
          <strong>Why Darshya?</strong> Every {d.name} puja booking includes mandatory video proof of the ceremony{withEightyG(', an 80G donation receipt where the donee is registered,')} and a pandit whose payout is gated on Aadhaar-based KYC — a payout gate, not an independent credential check.
        </p>
        <Link href="/deity" className="text-saffron-700 hover:underline">
          ← All deities
        </Link>
      </footer>
    </main>
  );
}
