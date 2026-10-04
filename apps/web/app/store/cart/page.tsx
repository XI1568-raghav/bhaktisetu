'use client';

import Link from 'next/link';
import {
 ShoppingBag,
 ShoppingCart,
 Minus,
 Plus,
 Trash2,
 ArrowRight,
 ArrowLeft,
 Truck,
 Shield,
 LogIn,
} from 'lucide-react';
import { useCart } from '../../../components/CartContext';
import { useAuth } from '../../../lib/auth-context';
import { isOrderableProductId, BROWSE_ONLY_REASON } from '../../../lib/store-buyability';
import { buttonClass } from '../../../components/ui/button-recipe';
import { H1 } from '../../../components/ui/heading-recipe';

function formatPrice(amount: number): string {
 return new Intl.NumberFormat('en-IN', {
 style: 'currency',
 currency: 'INR',
 maximumFractionDigits: 0,
 }).format(amount);
}

export default function CartPage() {
 // P0 #S-07 (2026-07-09): surface auth state so a logged-out cart user sees a
 // "Login to checkout" CTA instead of being bounced silently at /store/checkout
 // (which is wrapped in AuthGuard). The checkout link is still shown, but the
 // label + a sign-in prompt set the right expectation.
 const { user } = useAuth();
 const {
 items,
 itemCount,
 subtotal,
 deliveryFee,
 total,
 removeItem,
 updateQuantity,
 clearCart,
 } = useCart();

 if (items.length === 0) {
 return (
 <div className="min-h-[100dvh] bg-saffron-50">
 <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
 <div className="bg-white rounded-xl border border-surface-100 p-12 text-center">
 <div className="w-24 h-24 bg-saffron-50 rounded-full flex items-center justify-center mx-auto mb-6">
 <ShoppingCart className="w-12 h-12 text-saffron-300" />
 </div>
 <h1 className={`${H1.portal} mb-2`}>Your Cart is Empty</h1>
 <p className="text-surface-500 mb-8 max-w-md mx-auto">
 Explore our collection of authentic puja essentials, handcrafted idols,
 and sacred items sourced from trusted artisans.
 </p>
 <Link
 href="/store"
 className={buttonClass('primary', 'md')}
 >
 <ShoppingBag className="w-5 h-5" />
 Continue Shopping
 </Link>
 </div>
 </div>
 </div>
 );
 }

 return (
 <div className="min-h-[100dvh] bg-saffron-50">
 <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
 {/* Header */}
 <div className="flex items-center justify-between mb-8">
 <div>
 <h1 className={H1.portal}>Shopping Cart</h1>
 <p className="text-surface-500 mt-1">{itemCount} item{itemCount !== 1 ? 's' : ''} in your cart</p>
 </div>
 <button
 onClick={clearCart}
 className="text-sm text-red-500 hover:text-red-600 font-medium"
 >
 Clear Cart
 </button>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
 {/* Cart Items */}
 <div className="lg:col-span-2 space-y-4">
 {items.map((item) => (
 <div
 key={item.id}
 className="bg-white rounded-xl border border-surface-100 p-5 hover:shadow-md transition-shadow"
 >
 <div className="flex gap-4">
 {/* Image placeholder */}
 <div className="w-28 h-28 bg-gradient-to-br from-surface-50 to-saffron-50 rounded-xl flex items-center justify-center shrink-0">
 <ShoppingBag className="w-10 h-10 text-saffron-200" />
 </div>

 <div className="flex-1 min-w-0">
 <div className="flex justify-between gap-2">
 <div>
 <Link
 href={`/store/${item.product.handle}`}
 className="text-base font-semibold text-surface-800 hover:text-saffron-600 transition-colors line-clamp-2"
 >
 {item.product.title}
 </Link>
 <p className="text-xs text-surface-400 mt-0.5">{item.product.category}</p>
 {/* COM-01: a basket saved to localStorage (poojly_cart) before the
     browse-only guard shipped can still hold a seed product that
     POST /store/orders refuses by uuid lookup. Name it here, where
     the Remove button is, rather than letting it fail at payment. */}
 {!isOrderableProductId(item.product.id) && (
 <p className="text-xs text-amber-700 mt-1" data-testid="cart-browse-only">
 {BROWSE_ONLY_REASON} Remove it to check out.
 </p>
 )}
 </div>
 <button
 onClick={() => removeItem(item.id)}
 className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-surface-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
 >
 <Trash2 className="w-4 h-4" />
 </button>
 </div>

 {/* Price — LEG-17: no struck-through `compareAtPrice`.
     Carts persist in localStorage under poojly_cart (never
     renamed), so a cart saved before this change still carries
     the fabricated reference price. Not rendering it here is
     what makes the fix retroactive; removing it at the source
     alone would leave existing carts showing it. */}
 <div className="flex items-baseline gap-2 mt-2">
 <span className="text-lg font-bold text-surface-800">
 {formatPrice(item.product.price)}
 </span>
 </div>

 {/* Quantity & subtotal */}
 <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
 <div className="flex items-center">
 <button
 onClick={() => updateQuantity(item.id, item.quantity - 1)}
 disabled={item.quantity <= 1}
 className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center disabled:opacity-40"
 >
 <span className="w-8 h-8 flex items-center justify-center rounded-lg border border-surface-200 bg-white text-surface-600 hover:bg-surface-50 transition-colors">
 <Minus className="w-3 h-3" />
 </span>
 </button>
 <span className="w-10 text-center text-sm font-semibold text-surface-800">
 {item.quantity}
 </span>
 <button
 onClick={() => updateQuantity(item.id, item.quantity + 1)}
 disabled={item.quantity >= 10}
 className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center disabled:opacity-40"
 >
 <span className="w-8 h-8 flex items-center justify-center rounded-lg border border-surface-200 bg-white text-surface-600 hover:bg-surface-50 transition-colors">
 <Plus className="w-3 h-3" />
 </span>
 </button>
 </div>

 <span className="text-lg font-bold text-surface-800">
 {formatPrice(item.product.price * item.quantity)}
 </span>
 </div>

 {item.product.freeDelivery && (
 <div className="flex items-center gap-1 text-xs text-tulsi-green font-medium mt-2">
 <Truck className="w-3 h-3" />
 Free Delivery
 </div>
 )}
 </div>
 </div>
 </div>
 ))}

 {/* Continue Shopping */}
 <Link
 href="/store"
 className="inline-flex items-center gap-2 text-sm text-saffron-600 hover:text-saffron-700 font-medium mt-2"
 >
 <ArrowLeft className="w-4 h-4" />
 Continue Shopping
 </Link>
 </div>

 {/* Order Summary */}
 <div className="lg:col-span-1">
 <div className="bg-white rounded-xl border border-surface-100 p-5 sticky top-24">
 <h2 className="font-semibold text-surface-800 text-lg mb-4">Order Summary</h2>

 {/* Free delivery notice */}
 {subtotal < 499 && (
 <div className="flex items-center gap-2 bg-saffron-50 text-saffron-700 text-xs font-medium px-3 py-2.5 rounded-lg mb-4">
 <Truck className="w-4 h-4 shrink-0" />
 Add {formatPrice(499 - subtotal)} more for free delivery
 </div>
 )}

 {subtotal >= 499 && (
 <div className="flex items-center gap-2 bg-tulsi-green-light/20 text-tulsi-green text-xs font-medium px-3 py-2.5 rounded-lg mb-4">
 <Truck className="w-4 h-4 shrink-0" />
 You qualify for free delivery!
 </div>
 )}

 {/* Price breakdown */}
 <div className="space-y-3 text-sm">
 <div className="flex justify-between">
 <span className="text-surface-500">Subtotal ({itemCount} items)</span>
 <span className="text-surface-800 font-medium">{formatPrice(subtotal)}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-surface-500">Delivery</span>
 <span className={deliveryFee === 0 ? 'text-tulsi-green font-semibold' : 'text-surface-800'}>
 {deliveryFee === 0 ? 'FREE' : formatPrice(deliveryFee)}
 </span>
 </div>

 <div className="border-t border-surface-100 pt-3 flex justify-between">
 <span className="font-bold text-surface-800 text-base">Total</span>
 <span className="font-bold text-surface-800 text-xl">{formatPrice(total)}</span>
 </div>

 {/* LEG-17: a "You are saving ₹X on this order!" banner used to sum
     `compareAtPrice - price` across the cart. Every rupee of that
     figure came from a fabricated reference price, so the banner
     quantified a saving that no buyer ever received. Restore it only
     when a dated prior-price record backs the comparison. */}
 </div>

 {/* Actions */}
 <div className="mt-6 space-y-3">
 <Link
 href="/store/checkout"
 className="w-full flex items-center justify-center gap-2 py-3.5 bg-saffron-600 text-white font-medium rounded-lg hover:bg-saffron-700 transition-colors"
 >
 {user ? 'Proceed to Checkout' : 'Login to Checkout'}
 {user ? <ArrowRight className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
 </Link>
 {!user && (
 <p className="text-xs text-center text-surface-500">
 You&apos;ll be asked to sign in to complete your order.
 </p>
 )}
 </div>

 {/* Trust */}
 <div className="mt-4 flex items-center gap-2 text-xs text-surface-400 justify-center">
 <Shield className="w-3.5 h-3.5" />
 Secure checkout with Razorpay
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
}
