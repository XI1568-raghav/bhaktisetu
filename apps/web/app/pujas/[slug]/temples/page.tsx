// Programmatic-SEO mirror of /temples/[slug]/pujas — every puja gets a
// dedicated temples listing page. Targets long-tail "best temple for
// {puja}", "{puja} in {city}", "where to do {puja}" queries.
import type { Metadata } from 'next';
// DU-05: the one h1 recipe per page archetype. Extras are layout-only.
import { H1 } from '../../../../components/ui/heading-recipe';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { buttonClass } from '../../../../components/ui/button-recipe';
import {
  canPublishTrustScore,
  canPublishTrustScoreMethodology,
  formatTrustScoreOutOf,
} from '../../../../lib/trust-score';

export const revalidate = 3600;

// P0 #202 (cont.): this route used `process.env.API_URL || localhost:4000` —
// on prod (Render) API_URL is unset, so loadPuja hit localhost and every
// /pujas/[slug]/temples page 404'd. Use the same base the rest of SSR uses,
// adding /api/v1 only when the base doesn't already end with it.
const _pujaTemplesApiBase = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://api.darshya.online';
const API_BASE = _pujaTemplesApiBase.endsWith('/api/v1')
  ? _pujaTemplesApiBase
  : `${_pujaTemplesApiBase.replace(/\/$/, '')}/api/v1`;

interface PujaTempleOffering {
  id: string;
  templeName: string;
  templeSlug: string;
  templeCity: string;
  templeState: string;
  priceOverride: string | null;
  isActive: boolean;
  trustScore: number;
  isVerified: boolean;
}

interface PujaDetail {
  id: string;
  name: string;
  nameLocal: string | null;
  slug: string;
  description: string;
  category: string;
  deity: string;
  basePrice: string;
  temples: PujaTempleOffering[];
}

interface Params {
  params: Promise<{ slug: string }>;
}

function fmtINR(s: string): string {
  const n = parseFloat(s);
  return Number.isFinite(n) ? `₹${n.toLocaleString('en-IN')}` : s;
}

/**
 * What the devotee actually pays for this offering, used only to order the
 * list. An unparseable price sorts last rather than first, so a malformed row
 * can never take the top slot.
 *
 * The fallback is MAX_SAFE_INTEGER rather than Infinity on purpose: when every
 * row falls back (an unparseable `basePrice` with no overrides) `Infinity -
 * Infinity` is NaN, and a comparator returning NaN is undefined behaviour.
 * A finite sentinel subtracts to 0 and hands the decision to the name tiebreak.
 */
function offeringPrice(priceOverride: string | null, basePrice: string): number {
  const override = parseFloat(priceOverride ?? '');
  if (Number.isFinite(override)) return override;
  const base = parseFloat(basePrice);
  return Number.isFinite(base) ? base : Number.MAX_SAFE_INTEGER;
}

async function loadPuja(slug: string): Promise<PujaDetail | null> {
  try {
    const res = await fetch(`${API_BASE}/pujas/types/${slug}`, {
      next: { revalidate: 600, tags: [`puja-${slug}`] },
    });
    if (!res.ok) return null;
    return (await res.json()) as PujaDetail;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const puja = await loadPuja(slug);
  if (!puja) return { title: 'Puja temples' };
  const count = puja.temples?.filter((t) => t.isActive).length || 0;
  return {
    title: `${puja.name} temples — book online${count > 0 ? ` (${count} options)` : ''}`,
    description: `Top temples for ${puja.name}. Verified pandits, video proof, 80G receipts. Compare prices across ${count} active temples.`,
    alternates: { canonical: `https://darshya.online/pujas/${slug}/temples` },
    openGraph: {
      title: `${puja.name} temples — book online`,
      description: `${count} verified temples. Video proof, 80G, certified pandits.`,
      url: `https://darshya.online/pujas/${slug}/temples`,
      type: 'website',
      images: [`/og/puja/${slug}`],
    },
  };
}

export default async function PujaTemplesPage({ params }: Params) {
  const { slug } = await params;
  const puja = await loadPuja(slug);
  if (!puja) notFound();

  // TC-07 — this used to rank the list `(b.trustScore || 0) - (a.trustScore || 0)`
  // under the comment "sorted by trustScore desc so best temple first".
  //
  // `Temple.trustScore` has NO WRITER anywhere in the codebase (lib/trust-score.ts
  // carries the full trace): every non-zero value is one of twenty literals typed
  // into apps/api/prisma/seed.ts before the platform had taken a single booking.
  // Unlike /temples, this route does receive the value — puja.service.ts maps
  // `trustScore: o.temple.trustScore` onto every offering — so a hand-typed seed
  // literal was deciding which temple a devotee sends money to first.
  //
  // Ordered on the one attribute here that is real, checkable, and the reason a
  // comparison page exists: price, cheapest first, name-tiebroken so the order is
  // stable (findBySlug has no orderBy, so API order is arbitrary). No claim of
  // "best" is made, because the platform has no measurement that would support one.
  const offerings = (puja.temples || [])
    .filter((o) => o.isActive)
    .sort((a, b) => {
      const byPrice =
        offeringPrice(a.priceOverride, puja.basePrice) -
        offeringPrice(b.priceOverride, puja.basePrice);
      if (byPrice !== 0) return byPrice;
      if (a.templeName === b.templeName) return 0;
      return a.templeName < b.templeName ? -1 : 1;
    });

  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Temples offering ${puja.name}`,
    numberOfItems: offerings.length,
    itemListElement: offerings.slice(0, 20).map((o, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: o.templeName,
      url: `https://darshya.online/temples/${o.templeSlug}`,
    })),
  };

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }}
      />
      <nav className="text-sm text-surface-600 mb-4">
        <Link href="/" className="hover:text-saffron-700">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/pujas" className="hover:text-saffron-700">Pujas</Link>
        <span className="mx-2">/</span>
        <Link href={`/pujas/${slug}`} className="hover:text-saffron-700">{puja.name}</Link>
        <span className="mx-2">/</span>
        <span className="text-surface-900">Temples</span>
      </nav>

      <header className="mb-8">
        <h1 className={`${H1.catalogue} mb-2`}>
          Where to book {puja.name} online
        </h1>
        {puja.nameLocal ? (
          <p className="text-base font-serif text-surface-500 mb-3">{puja.nameLocal}</p>
        ) : null}
        <p className="text-surface-700 text-base leading-relaxed max-w-3xl">
          {offerings.length > 0
            ? `${offerings.length} verified temple${offerings.length === 1 ? '' : 's'} offer ${puja.name}. Compare prices and locations, lowest price first. Every booking ships with video proof and an 80G receipt where applicable.`
            : `${puja.name} catalogue is being onboarded at more temples. Book at any of our verified partners while we expand.`}
        </p>
      </header>

      {offerings.length === 0 ? (
        <div className="rounded-lg border border-surface-200 bg-surface-50 p-6 text-center">
          <p className="text-surface-700 mb-4">No verified temples for this puja yet.</p>
          <Link
            href={`/pujas/${slug}`}
            className={buttonClass('primary', 'md')}
          >
            View puja page →
          </Link>
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {offerings.map((o) => (
            <li
              key={o.id}
              className="rounded-xl border border-surface-200 bg-white p-5 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-center justify-between mb-2 gap-3">
                <span className="text-xs uppercase tracking-wider text-saffron-700 font-semibold">
                  {o.templeCity}, {o.templeState}
                </span>
                {o.isVerified ? (
                  <span className="text-xs text-emerald-700 font-semibold">✓ Verified</span>
                ) : null}
              </div>
              <h2 className="text-lg font-semibold text-surface-900 mb-1">{o.templeName}</h2>
              {/* TC-07 — gated on `canPublishTrustScore` (does the number mean
                  anything) rather than `hasMeaningfulTrustScore` (is the number
                  thick enough). Nothing computes the score today, so the gate is
                  closed and this renders nothing; it opens by itself in the same
                  change that adds the writer and flips TRUST_SCORE_IS_COMPUTED.
                  Kept rather than deleted because the value here is live from the
                  API — unlike the dead `trustScore: 90` fallback on
                  /temples/[slug], which manufactured its own number and was
                  deleted outright. */}
              {canPublishTrustScore(o.trustScore) ? (
                <p className="text-xs text-surface-500 mb-3">Trust score: {formatTrustScoreOutOf(o.trustScore)}</p>
              ) : null}
              <div className="flex items-center justify-between gap-3">
                <span className="text-lg font-bold text-surface-900">
                  {fmtINR(o.priceOverride || puja.basePrice)}
                </span>
                <Link
                  href={`/temples/${o.templeSlug}`}
                  className="text-sm font-semibold text-saffron-700 hover:underline"
                >
                  View temple →
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}

      <footer className="mt-10 border-t border-surface-200 pt-6 text-sm text-surface-600">
        {/* TC-07 — this paragraph published a four-factor methodology
            ("combines temple verification, devotee reviews, on-time delivery and
            video-proof completion. Higher = safer.") for a number computed from
            none of them. `canPublishTrustScoreMethodology()` is false while
            nothing computes the score, so the claim cannot render; the honest
            alternative below says what the ordering actually is. */}
        {canPublishTrustScoreMethodology() ? (
          <p className="mb-3">
            <strong>Not sure which temple?</strong> Trust score combines temple verification, devotee reviews, on-time delivery and video-proof completion. Higher = safer.
          </p>
        ) : (
          <p className="mb-3">
            <strong>Not sure which temple?</strong> These temples are listed lowest price first, not ranked — we do not score or rank temples. Open a temple page to read its details, then choose the one closest to your family or your tradition.
          </p>
        )}
        <Link href={`/pujas/${slug}`} className="text-saffron-700 hover:underline">
          ← Back to {puja.name}
        </Link>
      </footer>
    </main>
  );
}
