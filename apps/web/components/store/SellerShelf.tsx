import Link from 'next/link';
import { Store } from 'lucide-react';
import type { LiveProduct } from '../../lib/store-live';
import AddToCartButton from './AddToCartButton';
import type { CartProduct } from '../CartContext';

/**
 * COM-11: the shelf for real, onboarded sellers' inventory.
 *
 * It renders NOTHING when the list is empty. That is load-bearing, not an
 * optimisation: today GET /store/products/live returns zero rows, and a
 * section headed "From verified Darshya sellers" sitting above an empty grid —
 * or worse, above the seed fixtures — would claim supply the marketplace does
 * not have. When a seller lists their first product it appears here, with their
 * business named on the card, and it is orderable because the card carries the
 * StoreProduct UUID that POST /store/orders resolves.
 */

function formatPrice(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

function toCartProduct(p: LiveProduct): CartProduct {
  return {
    id: p.id,
    handle: p.handle,
    title: p.title,
    price: p.price,
    // LEG-17: this was `p.compareAtPrice ?? p.price`. lib/store-live already
    // nulls a reference price that is not strictly above the price, so the
    // fallback fired precisely when a real seller had NOT set one — and
    // manufactured one equal to the price on the way into the cart, where the
    // drawer then struck the item's own price through. A missing prior price
    // stays missing.
    compareAtPrice: p.compareAtPrice ?? null,
    image: p.imageUrl ?? '',
    category: p.category,
    inStock: p.stock > 0,
    freeDelivery: false,
  };
}

export default function SellerShelf({ products }: { products: LiveProduct[] }) {
  if (products.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-surface-800">From Darshya sellers</h2>
        <p className="text-sm text-surface-500 mt-1">
          Listed directly by approved sellers on Darshya. Sold and shipped by the
          seller named on each item.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {products.map((p) => (
          <div
            key={p.id}
            className="group bg-white rounded-xl overflow-hidden border border-surface-100 flex flex-col"
          >
            <Link href={`/store/seller/${p.id}`} className="block">
              <div className="relative aspect-square bg-gradient-to-br from-surface-50 to-saffron-50 overflow-hidden flex items-center justify-center">
                {p.imageUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={p.imageUrl}
                    width={500}
                    height={500}
                    loading="lazy"
                    decoding="async"
                    alt={p.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  // No photo yet. A neutral placeholder, never another
                  // product's image — the card names a real business.
                  <Store className="w-10 h-10 text-surface-300" aria-hidden="true" />
                )}
              </div>
            </Link>

            <div className="p-4 flex flex-col flex-1">
              <Link href={`/store/seller/${p.id}`} className="block">
                <h3 className="text-sm font-medium text-surface-800 line-clamp-2 group-hover:text-saffron-600 transition-colors">
                  {p.title}
                </h3>
              </Link>
              {p.storeName && (
                <p className="text-xs text-surface-500 mt-1 truncate">Sold by {p.storeName}</p>
              )}
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-lg font-bold text-surface-800">{formatPrice(p.price)}</span>
                {p.compareAtPrice && (
                  <span className="text-sm text-surface-400 line-through">
                    {formatPrice(p.compareAtPrice)}
                  </span>
                )}
              </div>
              <p className="text-xs text-surface-400 mt-1">
                {p.stock > 0 ? `${p.stock} in stock` : 'Out of stock'}
              </p>
              <div className="mt-auto">
                <AddToCartButton product={toCartProduct(p)} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
