import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight, Store, Truck, Shield, RotateCcw } from 'lucide-react';
import { getLiveProduct } from '../../../../lib/store-live';
import AddToCartButton from '../../../../components/store/AddToCartButton';
import type { CartProduct } from '../../../../components/CartContext';
import { productJsonLd, SITE_URL } from '../../../../lib/jsonld';
import { H1 } from '../../../../components/ui/heading-recipe';

/**
 * COM-11: the detail page for a real seller's product.
 *
 * It lives on its own segment rather than under /store/[handle] because the two
 * catalogues have separate keyspaces — /store/[handle] prerenders the 24 seed
 * handles with `dynamicParams = false`, and StoreProduct has no handle column.
 * Merging them into one keyspace is COM-01 and is owner-gated; this route makes
 * the seller side reachable and orderable in the meantime.
 *
 * Everything here comes from the seller's own row. A product that is inactive,
 * out of stock or absent 404s — there is no fixture fallback, because a page
 * that filled in a seed product's photos, rating and description under a real
 * business's name would be attributing goods that business never listed.
 */

type Params = { id: string };

export const revalidate = 120;

function formatPrice(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { id } = await params;
  const product = await getLiveProduct(id);
  if (!product) return { title: 'Product not found' };
  const url = `${SITE_URL}/store/seller/${product.id}`;
  const description = `${product.title} — ${formatPrice(product.price)}${
    product.storeName ? `, sold by ${product.storeName}` : ''
  }. ${product.description}`.slice(0, 300);
  return {
    title: product.title,
    description,
    alternates: { canonical: url },
    openGraph: { title: `${product.title} | Darshya Store`, description, url, type: 'website', images: ['/images/golden-temple-og.jpg'] },
  };
}

export default async function SellerProductPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const product = await getLiveProduct(id);
  if (!product) notFound();

  const url = `${SITE_URL}/store/seller/${product.id}`;
  const jsonLd = productJsonLd({
    name: product.title,
    description: product.description,
    image: product.imageUrl ?? undefined,
    sku: product.sku,
    priceInr: product.price,
    url,
    inStock: product.stock > 0,
  });

  const cartProduct: CartProduct = {
    id: product.id,
    handle: product.handle,
    title: product.title,
    price: product.price,
    // LEG-17: was `product.compareAtPrice ?? product.price`. A seller who
    // listed no reference price got one MANUFACTURED equal to their price on
    // the way into the cart, and the cart then struck it through — "₹499
    // ~~₹499~~". getLiveProduct already returns null unless the seller's own
    // compareAtPrice is strictly greater than the price, so pass it through
    // and let null stay null.
    compareAtPrice: product.compareAtPrice,
    image: product.imageUrl ?? '',
    category: product.category,
    inStock: product.stock > 0,
    freeDelivery: false,
  };

  return (
    <div className="min-h-[100dvh] bg-saffron-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <nav className="flex items-center gap-2 text-sm text-surface-500 mb-6">
          <Link href="/store" className="hover:text-saffron-600">Store</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-surface-400">{product.category}</span>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-surface-700 font-medium truncate">{product.title}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl border border-surface-100 overflow-hidden">
            <div className="aspect-square bg-gradient-to-br from-surface-50 to-saffron-50 flex items-center justify-center">
              {product.imageUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={product.imageUrl}
                  width={960}
                  height={960}
                  loading="eager"
                  decoding="async"
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center px-6">
                  <Store className="w-12 h-12 text-surface-300 mx-auto mb-2" aria-hidden="true" />
                  <p className="text-xs text-surface-400">
                    The seller has not added a photo for this item yet.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <p className="text-sm text-saffron-600 font-medium mb-1">{product.category}</p>
              <h1 className={`${H1.catalogue} mb-2`}>
                {product.title}
              </h1>
              {product.storeName && (
                <p className="text-sm text-surface-600 inline-flex items-center gap-1.5">
                  <Store className="w-4 h-4 text-surface-400" aria-hidden="true" />
                  Sold by <span className="font-medium text-surface-800">{product.storeName}</span>
                </p>
              )}
            </div>

            <div className="flex items-baseline gap-3">
              <span className="text-2xl font-semibold text-surface-800">
                {formatPrice(product.price)}
              </span>
              {product.compareAtPrice && (
                <span className="text-lg text-surface-400 line-through">
                  {formatPrice(product.compareAtPrice)}
                </span>
              )}
            </div>
            <p className="text-sm text-surface-500">Inclusive of all taxes</p>

            {product.description && (
              <p className="text-surface-600 leading-relaxed">{product.description}</p>
            )}

            <p className="text-sm text-surface-600">
              {product.stock > 0
                ? `${product.stock} in stock`
                : 'Currently out of stock at this seller'}
            </p>

            <AddToCartButton
              product={cartProduct}
              className="w-full py-3.5 bg-saffron-600 text-white font-medium rounded-lg hover:bg-saffron-700 transition-colors flex items-center justify-center gap-2 disabled:bg-surface-100 disabled:text-surface-500"
            />

            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="flex items-center gap-2 bg-surface-50 rounded-lg px-3 py-2.5">
                <Truck className="w-4 h-4 text-blue-500" aria-hidden="true" />
                <span className="text-xs font-medium text-surface-600">Seller shipped</span>
              </div>
              <div className="flex items-center gap-2 bg-surface-50 rounded-lg px-3 py-2.5">
                <Shield className="w-4 h-4 text-saffron-500" aria-hidden="true" />
                <span className="text-xs font-medium text-surface-600">Secure Payment</span>
              </div>
              <div className="flex items-center gap-2 bg-surface-50 rounded-lg px-3 py-2.5">
                <RotateCcw className="w-4 h-4 text-purple-500" aria-hidden="true" />
                <span className="text-xs font-medium text-surface-600">Easy Returns</span>
              </div>
            </div>

            {product.sku && (
              <p className="text-xs text-surface-400 pt-2 border-t border-surface-100">
                SKU: {product.sku}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
