'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Star,
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
  ShoppingBag,
  ChevronRight,
} from 'lucide-react';
import { useCart, type CartProduct } from '../../../components/CartContext';

// ─── Fallback product data ──────────────────────────────────────

const PRODUCTS = [
  {
    id: 'prod_001',
    handle: 'premium-brass-puja-thali-set',
    title: 'Premium Brass Puja Thali Set (7 Piece)',
    description: 'A beautifully crafted 7-piece brass puja thali set including thali, diya, incense holder, bell, kumkum container, water vessel, and flower plate. Perfect for daily worship and special occasions. Hand-polished to a golden finish.',
    features: ['Pure brass construction', 'Hand-polished golden finish', '7 essential puja items', 'Gift-ready packaging', 'Durable and tarnish-resistant'],
    price: 1299,
    compareAtPrice: 1899,
    discount: 32,
    currency: 'INR',
    category: 'Puja Thali Sets',
    collection: 'puja-essentials',
    tag: 'Bestseller',
    inStock: true,
    freeDelivery: true,
    rating: 4.7,
    reviewCount: 342,
    weight: '1.2 kg',
    sku: 'BS-PT-001',
  },
  {
    id: 'prod_002',
    handle: '5-mukhi-rudraksha-mala',
    title: '5 Mukhi Natural Rudraksha Mala (108+1 beads)',
    description: 'Authentic 5 Mukhi Rudraksha mala with 108+1 beads, hand-knotted on silk thread. Each bead is naturally formed and certified. Wearing this mala brings peace of mind, lowers blood pressure, and is believed to please Lord Shiva.',
    features: ['Certified natural Rudraksha', '108+1 beads', 'Hand-knotted on silk thread', 'Lab-tested authenticity', 'Comes with certificate'],
    price: 599,
    compareAtPrice: 999,
    discount: 40,
    currency: 'INR',
    category: 'Rudraksha & Malas',
    collection: 'rudraksha-malas',
    tag: 'Certified',
    inStock: true,
    freeDelivery: true,
    rating: 4.8,
    reviewCount: 567,
    weight: '50g',
    sku: 'BS-RM-001',
  },
  {
    id: 'prod_003',
    handle: 'pure-sandalwood-incense-sticks',
    title: 'Pure Sandalwood Incense Sticks (100 pack)',
    description: 'Premium sandalwood agarbatti made from pure chandan powder. Burns evenly for 45 minutes with a rich, calming fragrance. No charcoal or chemical additives. Ideal for daily puja, meditation, and creating a sacred atmosphere.',
    features: ['100% pure sandalwood', '45-minute burn time', 'No charcoal fillers', 'Chemical-free', '100 sticks per pack'],
    price: 249,
    compareAtPrice: 399,
    discount: 38,
    currency: 'INR',
    category: 'Incense & Dhoop',
    collection: 'puja-essentials',
    tag: 'Top Rated',
    inStock: true,
    freeDelivery: false,
    rating: 4.6,
    reviewCount: 891,
    weight: '200g',
    sku: 'BS-IS-001',
  },
  {
    id: 'prod_004',
    handle: 'white-marble-ganesh-murti',
    title: 'Hand-carved White Marble Ganesh Murti (8 inch)',
    description: 'Exquisite hand-carved Lord Ganesh murti in pure white Makrana marble. Each piece is unique, crafted by skilled artisans from Rajasthan. The idol features intricate detailing on the crown, trunk, and modak. A centerpiece for your home temple.',
    features: ['Pure Makrana marble', 'Hand-carved by artisans', '8 inch height', 'Intricate detailing', 'Each piece is unique'],
    price: 2499,
    compareAtPrice: 3499,
    discount: 29,
    currency: 'INR',
    category: 'Idols & Murtis',
    collection: 'idols-murtis',
    tag: 'Premium',
    inStock: true,
    freeDelivery: true,
    rating: 4.9,
    reviewCount: 234,
    weight: '2.5 kg',
    sku: 'BS-IM-001',
  },
  {
    id: 'prod_005',
    handle: 'complete-navratri-puja-kit',
    title: 'Complete Navratri Puja Kit',
    description: 'Everything you need for a complete Navratri puja. Includes kalash, coconut, red cloth, mala, kumkum, haldi, chandan, rice, flowers, diya, incense sticks, camphor, and a step-by-step guide booklet.',
    features: ['Complete 9-day puja items', 'Step-by-step guide included', 'Premium quality samagri', 'Eco-friendly packaging', 'Suitable for home puja'],
    price: 899,
    compareAtPrice: 1499,
    discount: 40,
    currency: 'INR',
    category: 'Puja Samagri',
    collection: 'festival-specials',
    tag: 'Festival Special',
    inStock: true,
    freeDelivery: true,
    rating: 4.7,
    reviewCount: 156,
    weight: '1.8 kg',
    sku: 'BS-PS-001',
  },
  {
    id: 'prod_006',
    handle: 'brass-krishna-playing-flute',
    title: 'Pure Brass Krishna Playing Flute (12 inch)',
    description: 'A stunning 12-inch brass idol of Lord Krishna in the iconic flute-playing pose. Cast using traditional lost-wax method and hand-finished with antique polish.',
    features: ['Pure brass, hand-cast', 'Lost-wax method', '12 inch height', 'Antique finish', 'Traditional craftsmanship'],
    price: 3299,
    compareAtPrice: 4599,
    discount: 28,
    currency: 'INR',
    category: 'Idols & Murtis',
    collection: 'idols-murtis',
    tag: 'Handcrafted',
    inStock: true,
    freeDelivery: true,
    rating: 4.9,
    reviewCount: 189,
    weight: '3.2 kg',
    sku: 'BS-IM-002',
  },
];

// ─── Helpers ────────────────────────────────────────────────────

function formatPrice(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

// ─── Component ──────────────────────────────────────────────────

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { addItem } = useCart();
  const handle = params.handle as string;

  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [product, setProduct] = useState<(typeof PRODUCTS)[number] | null>(null);

  useEffect(() => {
    // Try API first, fall back to hardcoded data
    const found = PRODUCTS.find((p) => p.handle === handle);
    setProduct(found ?? null);
  }, [handle]);

  function handleAddToCart() {
    if (!product) return;
    const cartProduct: CartProduct = {
      id: product.id,
      handle: product.handle,
      title: product.title,
      price: product.price,
      compareAtPrice: product.compareAtPrice,
      image: null,
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

  if (!product) {
    return (
      <div className="min-h-screen bg-saffron-50 flex items-center justify-center">
        <div className="text-center">
          <ShoppingBag className="w-16 h-16 text-stone-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-stone-800 mb-2">Product Not Found</h2>
          <p className="text-stone-500 mb-4">The product you are looking for does not exist.</p>
          <Link
            href="/store"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-saffron-600 text-white font-medium rounded-lg hover:bg-saffron-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Store
          </Link>
        </div>
      </div>
    );
  }

  // Related products (same category, different product)
  const relatedProducts = PRODUCTS.filter(
    (p) => p.category === product.category && p.id !== product.id
  ).slice(0, 4);

  return (
    <div className="min-h-screen bg-saffron-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-stone-500 mb-6">
          <Link href="/store" className="hover:text-saffron-600">Store</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-stone-400">{product.category}</span>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-stone-800 font-medium truncate">{product.title}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Product Image */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-stone-100 overflow-hidden">
              <div className="aspect-square bg-gradient-to-br from-stone-50 to-saffron-50 flex items-center justify-center relative">
                <ShoppingBag className="w-24 h-24 text-saffron-200" />

                {product.tag && (
                  <div className="absolute top-4 left-4">
                    <span className="bg-saffron-600 text-white text-xs font-bold px-3 py-1.5 rounded-full">
                      {product.tag}
                    </span>
                  </div>
                )}

                {product.discount > 0 && (
                  <div className="absolute top-4 right-4">
                    <span className="bg-tulsi-green text-white text-sm font-bold px-3 py-1.5 rounded-full">
                      -{product.discount}%
                    </span>
                  </div>
                )}

                {/* Action buttons */}
                <div className="absolute bottom-4 right-4 flex gap-2">
                  <button className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-md hover:bg-white transition-colors">
                    <Heart className="w-5 h-5 text-stone-400" />
                  </button>
                  <button className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-md hover:bg-white transition-colors">
                    <Share2 className="w-5 h-5 text-stone-400" />
                  </button>
                </div>
              </div>
            </div>

            {/* Thumbnail placeholders */}
            <div className="flex gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={`w-20 h-20 rounded-lg border-2 ${
                    i === 1 ? 'border-saffron-500' : 'border-stone-200'
                  } bg-gradient-to-br from-stone-50 to-saffron-50 flex items-center justify-center cursor-pointer hover:border-saffron-300 transition-colors`}
                >
                  <ShoppingBag className="w-6 h-6 text-saffron-200" />
                </div>
              ))}
            </div>
          </div>

          {/* Right: Product Info */}
          <div className="space-y-6">
            <div>
              <p className="text-sm text-saffron-600 font-medium mb-1">{product.category}</p>
              <h1 className="text-2xl lg:text-3xl font-bold text-stone-900 mb-3">
                {product.title}
              </h1>

              {/* Rating */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 bg-tulsi-green/10 px-2.5 py-1 rounded-lg">
                  <Star className="w-4 h-4 text-tulsi-green fill-tulsi-green" />
                  <span className="text-sm font-bold text-tulsi-green">{product.rating}</span>
                </div>
                <span className="text-sm text-stone-500">
                  {product.reviewCount.toLocaleString('en-IN')} reviews
                </span>
              </div>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-stone-900">
                {formatPrice(product.price)}
              </span>
              {product.compareAtPrice && (
                <>
                  <span className="text-lg text-stone-400 line-through">
                    {formatPrice(product.compareAtPrice)}
                  </span>
                  <span className="text-sm font-semibold text-tulsi-green bg-tulsi-green-light/20 px-2 py-0.5 rounded">
                    Save {formatPrice(product.compareAtPrice - product.price)}
                  </span>
                </>
              )}
            </div>

            <p className="text-sm text-stone-500 leading-relaxed">Inclusive of all taxes</p>

            {/* Description */}
            <div>
              <p className="text-stone-700 leading-relaxed">{product.description}</p>
            </div>

            {/* Features */}
            {product.features && product.features.length > 0 && (
              <div>
                <h3 className="font-semibold text-stone-900 mb-2">Key Features</h3>
                <ul className="space-y-1.5">
                  {product.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-stone-600">
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
                <span className="text-sm font-medium text-stone-700">Quantity:</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                    className="w-10 h-10 flex items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 disabled:opacity-40 transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-12 text-center text-lg font-semibold text-stone-900">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(Math.min(10, quantity + 1))}
                    disabled={quantity >= 10}
                    className="w-10 h-10 flex items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 disabled:opacity-40 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleAddToCart}
                  disabled={added}
                  className={`flex-1 flex items-center justify-center gap-2 py-3.5 font-semibold rounded-xl transition-all ${
                    added
                      ? 'bg-tulsi-green text-white'
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
              <div className="flex items-center gap-2.5 bg-stone-50 rounded-lg px-3 py-2.5">
                <BadgeCheck className="w-5 h-5 text-tulsi-green" />
                <span className="text-xs font-medium text-stone-600">Authentic & Certified</span>
              </div>
              <div className="flex items-center gap-2.5 bg-stone-50 rounded-lg px-3 py-2.5">
                <Truck className="w-5 h-5 text-blue-500" />
                <span className="text-xs font-medium text-stone-600">
                  {product.freeDelivery ? 'Free Delivery' : 'Delivery: ₹49'}
                </span>
              </div>
              <div className="flex items-center gap-2.5 bg-stone-50 rounded-lg px-3 py-2.5">
                <Shield className="w-5 h-5 text-saffron-500" />
                <span className="text-xs font-medium text-stone-600">Secure Payment</span>
              </div>
              <div className="flex items-center gap-2.5 bg-stone-50 rounded-lg px-3 py-2.5">
                <RotateCcw className="w-5 h-5 text-purple-500" />
                <span className="text-xs font-medium text-stone-600">Easy Returns</span>
              </div>
            </div>

            {/* Additional info */}
            <div className="text-xs text-stone-400 space-y-1 pt-2 border-t border-stone-100">
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
                  className="group bg-white rounded-xl overflow-hidden border border-stone-100 card-hover transition-all"
                >
                  <div className="relative aspect-square bg-gradient-to-br from-stone-50 to-saffron-50 flex items-center justify-center">
                    <ShoppingBag className="w-12 h-12 text-saffron-200" />
                    {rp.tag && (
                      <span className="absolute top-3 left-3 bg-saffron-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                        {rp.tag}
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm font-medium text-stone-900 line-clamp-2 group-hover:text-saffron-600 transition-colors">
                      {rp.title}
                    </h3>
                    <div className="flex items-center gap-1 mt-2">
                      <div className="flex items-center gap-0.5 bg-tulsi-green/10 px-1.5 py-0.5 rounded">
                        <Star className="w-3 h-3 text-tulsi-green fill-tulsi-green" />
                        <span className="text-xs font-bold text-tulsi-green">{rp.rating}</span>
                      </div>
                      <span className="text-xs text-stone-400">({rp.reviewCount})</span>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-lg font-bold text-stone-900">{formatPrice(rp.price)}</span>
                      {rp.compareAtPrice && (
                        <span className="text-sm text-stone-400 line-through">
                          {formatPrice(rp.compareAtPrice)}
                        </span>
                      )}
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
