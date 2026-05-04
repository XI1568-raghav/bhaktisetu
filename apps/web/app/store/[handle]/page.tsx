'use client';
export const runtime = 'edge';

import { useState } from 'react';
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
import { PRODUCTS, getProductByHandle } from '../../../lib/products';
import { getProductImage } from '../../../lib/images';

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

 // Synchronous lookup against the in-memory product list — no useEffect
 // round-trip. A `null` result here means the slug genuinely doesn't exist
 // (so the "Not Found" UI is correct), instead of just "we haven't loaded
 // yet" which used to show "Not Found" for a flash on every successful page.
 const product = getProductByHandle(handle) ?? null;

 function handleAddToCart() {
 if (!product) return;
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

 if (!product) {
 return (
 <div className="min-h-screen bg-saffron-50 flex items-center justify-center">
 <div className="text-center">
 <ShoppingBag className="w-16 h-16 text-surface-300 mx-auto mb-4" />
 <h2 className="text-xl font-bold text-surface-700 mb-2">Product Not Found</h2>
 <p className="text-surface-500 mb-4">The product you are looking for does not exist.</p>
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

 const productImageUrl = getProductImage(product.imageKey);

 // Related products (same collection, different product)
 const relatedProducts = PRODUCTS.filter(
 (p) => p.collection === product.collection && p.id !== product.id
 ).slice(0, 4);

 return (
 <div className="min-h-screen bg-saffron-50">
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
 alt={product.title}
 className="w-full h-full object-cover"
 />

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
 <Heart className="w-5 h-5 text-surface-400" />
 </button>
 <button className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-md hover:bg-white transition-colors">
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
 src={productImageUrl}
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
 <h1 className="text-2xl lg:text-3xl font-bold text-surface-800 mb-3">
 {product.title}
 </h1>

 {/* Rating */}
 <div className="flex items-center gap-3">
 <div className="flex items-center gap-1 bg-tulsi-green/10 px-2.5 py-1 rounded-lg">
 <Star className="w-4 h-4 text-tulsi-green fill-tulsi-green" />
 <span className="text-sm font-bold text-tulsi-green">{product.rating}</span>
 </div>
 <span className="text-sm text-surface-500">
 {product.reviewCount.toLocaleString('en-IN')} reviews
 </span>
 </div>
 </div>

 {/* Price */}
 <div className="flex items-baseline gap-3">
 <span className="text-lg font-semibold text-surface-800">
 {formatPrice(product.price)}
 </span>
 {product.compareAtPrice && (
 <>
 <span className="text-lg text-surface-400 line-through">
 {formatPrice(product.compareAtPrice)}
 </span>
 <span className="text-sm font-semibold text-tulsi-green bg-tulsi-green-light/20 px-2 py-0.5 rounded">
 Save {formatPrice(product.compareAtPrice - product.price)}
 </span>
 </>
 )}
 </div>

 <p className="text-sm text-surface-500 leading-relaxed">Inclusive of all taxes</p>

 {/* Description */}
 <div>
 <p className="text-surface-600 leading-relaxed">{product.description}</p>
 </div>

 {/* Features */}
 {product.features && product.features.length > 0 && (
 <div>
 <h3 className="font-semibold text-surface-800 mb-2">Key Features</h3>
 <ul className="space-y-1.5">
 {product.features.map((feature, idx) => (
 <li key={idx} className="flex items-start gap-2 text-sm text-surface-600">
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
 <div className="flex items-center gap-2.5 bg-surface-50 rounded-lg px-3 py-2.5">
 <BadgeCheck className="w-5 h-5 text-tulsi-green" />
 <span className="text-xs font-medium text-surface-600">Authentic & Certified</span>
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
 src={getProductImage(rp.imageKey)}
 alt={rp.title}
 className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
 />
 {rp.tag && (
 <span className="absolute top-3 left-3 bg-saffron-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">
 {rp.tag}
 </span>
 )}
 </div>
 <div className="p-4">
 <h3 className="text-sm font-medium text-surface-800 line-clamp-2 group-hover:text-saffron-600 transition-colors">
 {rp.title}
 </h3>
 <div className="flex items-center gap-1 mt-2">
 <div className="flex items-center gap-0.5 bg-tulsi-green/10 px-1.5 py-0.5 rounded">
 <Star className="w-3 h-3 text-tulsi-green fill-tulsi-green" />
 <span className="text-xs font-bold text-tulsi-green">{rp.rating}</span>
 </div>
 <span className="text-xs text-surface-400">({rp.reviewCount})</span>
 </div>
 <div className="mt-2 flex items-baseline gap-2">
 <span className="text-lg font-bold text-surface-800">{formatPrice(rp.price)}</span>
 {rp.compareAtPrice && (
 <span className="text-sm text-surface-400 line-through">
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
