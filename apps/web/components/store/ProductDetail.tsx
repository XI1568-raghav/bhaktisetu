'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ShoppingCart,
  Zap,
  Truck,
  Shield,
  RotateCcw,
  BadgeCheck,
  Minus,
  Plus,
  Check,
  Heart,
  Share2,
  ChevronRight,
} from 'lucide-react';
import { useCart, type CartProduct } from '../CartContext';
import { PRODUCTS, type Product } from '../../lib/products';
import { getProductImage, remoteSrcSet, IMG_W } from '../../lib/images';
import { H1 } from '../../components/ui/heading-recipe';

/**
 * COM-10 (prod sweep 2026-08-12): the product detail body used to live inside
 * /store/view, a `use client` page that pulled the handle out of
 * `useSearchParams()` behind a Suspense boundary. Because the handle was only
 * knowable in the browser, the HTML Next streamed contained the fallback
 * ("Loading…") and nothing else — no title, price, description or availability
 * on any of the 24 product pages, while /store and /temples/<slug> were fully
 * server-rendered.
 *
 * The body is unchanged; the difference is that `product` now arrives as a
 * PROP, resolved on the server. A client component with its data already in
 * hand renders during SSR, so the same markup a devotee sees is the markup a
 * crawler gets. The interactivity (quantity, add-to-cart, buy-now) still needs
 * the client, which is why this stays an island rather than becoming a server
 * component.
 */

function formatPrice(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * The seed `Product` and lib/medusa's `MedusaProduct` are the two shapes the
 * catalogue can hand back, and they differ only in fields this component never
 * reads (`currency`, Medusa's raw thumbnail/price columns). Typing the prop as
 * the fields actually rendered lets one PDP serve both without a cast.
 */
export type DetailProduct = Omit<Product, 'currency'> & { currency?: string };

export default function ProductDetail({ product }: { product: DetailProduct }) {
  const router = useRouter();
  const { addItem } = useCart();

  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  function handleAddToCart() {
    const cartProduct: CartProduct = {
      id: product.id,
      handle: product.handle,
      title: product.title,
      price: product.price,
      compareAtPrice: product.compareAtPrice,
      image: getProductImage(product.imageKey),
      category: product.category,
      inStock: product.inStock,
      freeDelivery: product.freeDelivery,
    };
    addItem(cartProduct, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  function handleBuyNow() {
    handleAddToCart();
    setTimeout(() => router.push('/store/checkout'), 200);
  }

  const productImageUrl = getProductImage(product.imageKey, IMG_W.WIDE);
  const productImageSrcSet = remoteSrcSet(productImageUrl, [IMG_W.CARD, IMG_W.WIDE]);
  const productThumbUrl = getProductImage(product.imageKey, IMG_W.THUMB);

  // Related products (same collection, different product)
  const relatedProducts = PRODUCTS.filter(
    (p) => p.collection === product.collection && p.id !== product.id,
  ).slice(0, 4);

  return (
    <div className="min-h-[100dvh] bg-saffron-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-surface-500 mb-6">
          <Link href="/store" className="hover:text-saffron-600">Store</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-surface-400">{product.category}</span>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-surface-700 font-medium truncate">{product.title}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Product Image */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-surface-100 overflow-hidden">
              <div className="aspect-square bg-gradient-to-br from-surface-50 to-saffron-50 flex items-center justify-center relative overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={productImageUrl}
                  srcSet={productImageSrcSet}
                  sizes="(max-width: 1024px) 100vw, 560px"
                  width={960}
                  height={960}
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                  alt={product.title}
                  className="w-full h-full object-cover"
                />

                {product.tag && (
                  <div className="absolute top-4 left-4">
                    <span data-product-tag className="bg-saffron-600 text-white text-xs font-bold px-3 py-1.5 rounded-full">
                      {product.tag}
                    </span>
                  </div>
                )}

                {/* LEG-17: a "-32%" corner badge rendered `product.discount`
                    here. That field was `(compareAtPrice - price) /
                    compareAtPrice` over a reference price no product was ever
                    sold at, so the percentage measured a saving nobody
                    received. `discount` has been removed from the seed shape
                    outright — it had no independent source to be restored
                    from. Guarded by
                    __tests__/leg17-pdp-cart-fabricated-price.test.tsx. */}

                {/* Action buttons */}
                <div className="absolute bottom-4 right-4 flex gap-2">
                  <button
                    type="button"
                    aria-label="Save to wishlist"
                    className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-md hover:bg-white transition-colors"
                  >
                    <Heart className="w-5 h-5 text-surface-400" />
                  </button>
                  <button
                    type="button"
                    aria-label="Share this product"
                    className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-md hover:bg-white transition-colors"
                  >
                    <Share2 className="w-5 h-5 text-surface-400" />
                  </button>
                </div>
              </div>
            </div>

            {/* Thumbnail placeholders */}
            <div className="flex gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={`w-20 h-20 rounded-lg border-2 overflow-hidden ${
                    i === 1 ? 'border-saffron-500' : 'border-surface-200'
                  } bg-gradient-to-br from-surface-50 to-saffron-50 cursor-pointer hover:border-saffron-300 transition-colors`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={productThumbUrl}
                    width={80}
                    height={80}
                    loading="lazy"
                    decoding="async"
                    alt={`${product.title} view ${i}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Right: Product Info */}
          <div className="space-y-6">
            <div>
              <p className="text-sm text-saffron-600 font-medium mb-1">{product.category}</p>
              <h1 className={`${H1.catalogue} mb-3`}>
                {product.title}
              </h1>

              {/* LEG-17: a star badge (`{product.rating}`) and an "N reviews"
                  tally rendered here. Both were fabricated on BOTH data paths,
                  so no input made them true: the 24 seed rows hardcoded
                  ratings 4.4-4.9 and counts of 145-2,100 (12,366 reviews for a
                  catalogue that has never taken an order), and lib/medusa gave
                  every real product `rating: 4.5, reviewCount: 0` — a 4.5-star
                  average from zero reviews. Both fields are now nullable and
                  null. A `Review` model and GET /store/reviews exist in
                  apps/api, so restore this badge when the PDP is joined to
                  that table and only for products that actually have reviews:
                  a star average is the strongest purchase signal on the page,
                  which makes an invented one the same consumer-protection
                  defect as an invented price, not a lesser one. */}
            </div>

            {/* Price — LEG-17: the struck-through `compareAtPrice` and the
                "Save ₹600" chip beside it are gone. The chip was the worst of
                the set: it did not merely imply a saving, it quantified one,
                on the surface with the highest purchase intent. See the note
                on the removed corner badge above for why the underlying field
                could never be true. */}
            <div className="flex items-baseline gap-3">
              <span className="text-lg font-semibold text-surface-800">
                {formatPrice(product.price)}
              </span>
            </div>

            <p className="text-sm text-surface-500 leading-relaxed">Inclusive of all taxes</p>

            {/* Description */}
            <div>
              <p className="text-surface-600 leading-relaxed">{product.description}</p>
            </div>

            {/* Features */}
            {product.features && product.features.length > 0 && (
              <div>
                <h2 className="font-semibold text-surface-800 mb-2">Key Features</h2>
                <ul className="space-y-1.5">
                  {product.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-surface-600">
                      <Check className="w-4 h-4 text-tulsi-green shrink-0 mt-0.5" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Quantity & Actions */}
            <div className="space-y-4 pt-2">
              {/* Quantity */}
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-surface-600">Quantity:</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                    className="w-10 h-10 flex items-center justify-center rounded-lg border border-surface-200 bg-white text-surface-600 hover:bg-surface-50 disabled:opacity-40 transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-12 text-center text-lg font-semibold text-surface-800">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    onClick={() => setQuantity(Math.min(10, quantity + 1))}
                    disabled={quantity >= 10}
                    className="w-10 h-10 flex items-center justify-center rounded-lg border border-surface-200 bg-white text-surface-600 hover:bg-surface-50 disabled:opacity-40 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={added}
                  className={`flex-1 flex items-center justify-center gap-2 py-3.5 font-semibold rounded-xl transition-all ${
                    added
                      ? 'bg-tulsi-green-dark text-white'
                      : 'bg-saffron-50 text-saffron-700 border-2 border-saffron-200 hover:bg-saffron-100'
                  } rounded-lg`}
                >
                  {added ? (
                    <>
                      <Check className="w-5 h-5" />
                      Added!
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-5 h-5" />
                      Add to Cart
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleBuyNow}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-saffron-600 text-white font-medium rounded-lg hover:bg-saffron-700 transition-colors"
                >
                  <Zap className="w-5 h-5" />
                  Buy Now
                </button>
              </div>
            </div>

            {/* Trust badges */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="flex items-center gap-2.5 bg-surface-50 rounded-lg px-3 py-2.5">
                <BadgeCheck className="w-5 h-5 text-tulsi-green" />
                <span className="text-xs font-medium text-surface-600">Authentic &amp; Certified</span>
              </div>
              <div className="flex items-center gap-2.5 bg-surface-50 rounded-lg px-3 py-2.5">
                <Truck className="w-5 h-5 text-blue-500" />
                <span className="text-xs font-medium text-surface-600">
                  {product.freeDelivery ? 'Free Delivery' : 'Delivery: ₹49'}
                </span>
              </div>
              <div className="flex items-center gap-2.5 bg-surface-50 rounded-lg px-3 py-2.5">
                <Shield className="w-5 h-5 text-saffron-500" />
                <span className="text-xs font-medium text-surface-600">Secure Payment</span>
              </div>
              <div className="flex items-center gap-2.5 bg-surface-50 rounded-lg px-3 py-2.5">
                <RotateCcw className="w-5 h-5 text-purple-500" />
                <span className="text-xs font-medium text-surface-600">Easy Returns</span>
              </div>
            </div>

            {/* Additional info */}
            <div className="text-xs text-surface-400 space-y-1 pt-2 border-t border-surface-100">
              <p>SKU: {product.sku}</p>
              {product.weight && <p>Weight: {product.weight}</p>}
            </div>
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-semibold tracking-tight text-surface-800 mb-6">Related Products</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {relatedProducts.map((rp) => (
                <Link
                  key={rp.id}
                  href={`/store/${rp.handle}`}
                  className="group bg-white rounded-xl overflow-hidden border border-surface-100 card-hover transition-all"
                >
                  <div className="relative aspect-square bg-gradient-to-br from-surface-50 to-saffron-50 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getProductImage(rp.imageKey, IMG_W.CARD)}
                      sizes="(max-width: 768px) 50vw, 280px"
                      width={500}
                      height={500}
                      loading="lazy"
                      decoding="async"
                      alt={rp.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {rp.tag && (
                      <span data-product-tag className="absolute top-3 left-3 bg-saffron-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                        {rp.tag}
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm font-medium text-surface-800 line-clamp-2 group-hover:text-saffron-600 transition-colors">
                      {rp.title}
                    </h3>
                    {/* LEG-17: the related rail carried the same fabricated
                        star badge, "(342)" review tally and struck-through
                        reference price as the main product above. Removed for
                        the same reason — see the notes on the price block. */}
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-lg font-bold text-surface-800">{formatPrice(rp.price)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
