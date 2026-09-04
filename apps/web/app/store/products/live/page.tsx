import type { Metadata } from 'next';
import Link from 'next/link';
import { Store, PackageSearch } from 'lucide-react';
import { getLiveProducts } from '../../../../lib/store-live';
import { H1 } from '../../../../components/ui/heading-recipe';

/**
 * PM-11 (prod sweep 2026-08-12) — this route did not exist.
 *
 * PR #235 was recorded as "merged, deployed and live-verified" with two live
 * directories. Neither web page was ever created: /astrology/astrologers/live
 * (rebuilt as AW-03) and this one both answered 404 with a real Chrome UA while
 * their APIs answered 200. There was no apps/web/app/store/products/ directory
 * at all — same root-cause family as the #202 temple sitemap 404s: a healthy
 * endpoint with no page.tsx in front of it.
 *
 * GET /api/v1/store/products/live is the only endpoint that serves real
 * `store_products` rows — the inventory of sellers who onboarded, passed KYC
 * and listed goods (COM-11). This page is their price-ordered shelf.
 *
 * Sorted by price ascending: the finding's point is price discovery, and the
 * cheapest real offer is the answer a devotee comparing shops actually wants.
 *
 * NO FIXTURE FALLBACK. When the list is empty the page says so. The 24
 * hardcoded catalogue SKUs are a different keyspace (`prod_015` handles vs
 * StoreProduct UUIDs) and are not orderable through POST /store/orders;
 * unifying the two catalogues is COM-01 and is owner-gated. Showing them here
 * would attribute someone else's goods to real, named businesses and hand the
 * shopper a checkout that cannot complete.
 */

export const metadata: Metadata = {
  title: 'Live Store Products — Listed by Verified Darshya Sellers',
  description:
    'Every product on this page is listed by an approved seller on Darshya, priced by them and shipped by them. Sorted by price, lowest first.',
  alternates: { canonical: 'https://darshya.online/store/products/live' },
};

// Seller inventory and stock change without a deploy; 120s matches the seller
// shelf on /store and the seller product page so the three never disagree.
export const revalidate = 120;

function formatPrice(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

export default async function LiveStoreProductsPage() {
  const products = await getLiveProducts(200);
  const byPrice = [...products].sort((a, b) => a.price - b.price);

  return (
    <div className="min-h-[100dvh] bg-surface-50">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-8">
          <h1 className={H1.catalogue}>
            Live products from Darshya sellers
          </h1>
          <p className="mt-2 max-w-2xl prose-body text-surface-500">
            Listed directly by approved sellers on Darshya, lowest price first. Each item
            is sold and shipped by the business named on the card.
          </p>
        </header>

        {byPrice.length === 0 ? (
          <div className="rounded-xl border border-surface-100 bg-white px-6 py-12 text-center">
            <PackageSearch className="mx-auto mb-3 h-10 w-10 text-surface-300" aria-hidden="true" />
            <p className="text-sm font-medium text-surface-700">
              No seller has listed a product yet.
            </p>
            <p className="mx-auto mt-2 max-w-md prose-meta text-surface-500">
              This directory shows only real inventory from approved Darshya sellers. As soon
              as the first seller publishes an item it appears here.
            </p>
            <Link
              href="/store"
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-saffron-600 hover:text-saffron-700"
            >
              Browse the Darshya store
            </Link>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {byPrice.map((p) => (
              <li
                key={p.id}
                className="flex flex-col rounded-xl border border-surface-100 bg-white p-4"
              >
                <Link href={`/store/seller/${p.id}`} className="flex flex-col gap-2">
                  <span className="text-xs font-medium text-saffron-600">{p.category}</span>
                  <span className="text-sm font-semibold text-surface-800">{p.title}</span>
                </Link>
                {p.storeName && (
                  <span className="mt-1 inline-flex items-center gap-1.5 text-xs text-surface-500">
                    <Store className="h-3.5 w-3.5 text-surface-400" aria-hidden="true" />
                    Sold by {p.storeName}
                  </span>
                )}
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-lg font-bold text-surface-800">{formatPrice(p.price)}</span>
                  {p.compareAtPrice && (
                    <span className="text-sm text-surface-400 line-through">
                      {formatPrice(p.compareAtPrice)}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-surface-400">
                  {p.stock > 0 ? `${p.stock} in stock` : 'Out of stock at this seller'}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
