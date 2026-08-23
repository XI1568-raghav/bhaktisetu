'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import {
 X,
 ShoppingBag,
 Minus,
 Plus,
 Trash2,
 ArrowRight,
 ShoppingCart,
 Truck,
} from 'lucide-react';
import { useCart } from './CartContext';
import { buttonClass } from '../components/ui/button-recipe';

function formatPrice(amount: number): string {
 return new Intl.NumberFormat('en-IN', {
 style: 'currency',
 currency: 'INR',
 maximumFractionDigits: 0,
 }).format(amount);
}

export default function CartDrawer() {
 const {
 items,
 itemCount,
 subtotal,
 deliveryFee,
 total,
 removeItem,
 updateQuantity,
 clearCart,
 isOpen,
 closeCart,
 } = useCart();

 const drawerRef = useRef<HTMLDivElement>(null);

 // Close on ESC
 useEffect(() => {
 function handleEsc(e: KeyboardEvent) {
 if (e.key === 'Escape') closeCart();
 }
 if (isOpen) {
 document.addEventListener('keydown', handleEsc);
 document.body.style.overflow = 'hidden';
 }
 return () => {
 document.removeEventListener('keydown', handleEsc);
 document.body.style.overflow = '';
 };
 }, [isOpen, closeCart]);

 if (!isOpen) return null;

 return (
 <>
 {/* Backdrop */}
 <div
 className="fixed inset-0 bg-black/40 z-[60] transition-opacity"
 onClick={closeCart}
 />

 {/* Drawer */}
 <div
 ref={drawerRef}
 className="fixed top-0 right-0 h-full w-full max-w-md bg-white z-[70] shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
 >
 {/* Header */}
 <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
 <div className="flex items-center gap-2">
 <ShoppingBag className="w-5 h-5 text-saffron-600" />
 <h2 className="font-bold text-surface-900">Cart ({itemCount})</h2>
 </div>
 <button
 onClick={closeCart}
 className="p-2 text-surface-400 hover:text-surface-600 rounded-lg hover:bg-surface-50 transition-colors"
 >
 <X className="w-5 h-5" />
 </button>
 </div>

 {/* Empty state */}
 {items.length === 0 ? (
 <div className="flex-1 flex flex-col items-center justify-center px-5">
 <div className="w-20 h-20 bg-saffron-50 rounded-full flex items-center justify-center mb-4">
 <ShoppingCart className="w-10 h-10 text-saffron-300" />
 </div>
 <h3 className="text-lg font-semibold text-surface-800 mb-2">Your cart is empty</h3>
 <p className="text-sm text-surface-500 text-center mb-6">
 Explore our collection of puja essentials, idols, and sacred items.
 </p>
 <Link
 href="/store"
 onClick={closeCart}
 className={buttonClass('primary', 'md')}
 >
 Browse Store
 <ArrowRight className="w-4 h-4" />
 </Link>
 </div>
 ) : (
 <>
 {/* Items list */}
 <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
 {items.map((item) => (
 <div
 key={item.id}
 className="flex gap-3 bg-surface-50 rounded-xl p-3"
 >
 {/* Image placeholder */}
 <div className="w-20 h-20 bg-gradient-to-br from-surface-100 to-saffron-50 rounded-lg flex items-center justify-center shrink-0">
 <ShoppingBag className="w-8 h-8 text-saffron-200" />
 </div>

 <div className="flex-1 min-w-0">
 <h3 className="text-sm font-medium text-surface-900 line-clamp-2">
 {item.product.title}
 </h3>

 <div className="flex items-baseline gap-2 mt-1">
 <span className="text-sm font-bold text-surface-900">
 {formatPrice(item.product.price)}
 </span>
 {item.product.compareAtPrice && (
 <span className="text-xs text-surface-400 line-through">
 {formatPrice(item.product.compareAtPrice)}
 </span>
 )}
 </div>

 {/* Quantity controls */}
 <div className="flex items-center justify-between mt-2">
 <div className="flex items-center gap-1">
 <button
 onClick={() => updateQuantity(item.id, item.quantity - 1)}
 disabled={item.quantity <= 1}
 className="w-7 h-7 flex items-center justify-center rounded-md border border-surface-200 bg-white text-surface-600 hover:bg-surface-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
 >
 <Minus className="w-3 h-3" />
 </button>
 <span className="w-8 text-center text-sm font-semibold text-surface-900">
 {item.quantity}
 </span>
 <button
 onClick={() => updateQuantity(item.id, item.quantity + 1)}
 disabled={item.quantity >= 10}
 className="w-7 h-7 flex items-center justify-center rounded-md border border-surface-200 bg-white text-surface-600 hover:bg-surface-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
 >
 <Plus className="w-3 h-3" />
 </button>
 </div>

 <div className="flex items-center gap-2">
 <span className="text-sm font-semibold text-surface-900">
 {formatPrice(item.product.price * item.quantity)}
 </span>
 <button
 onClick={() => removeItem(item.id)}
 className="p-1 text-surface-400 hover:text-red-500 transition-colors"
 >
 <Trash2 className="w-4 h-4" />
 </button>
 </div>
 </div>
 </div>
 </div>
 ))}
 </div>

 {/* Footer with totals */}
 <div className="border-t border-surface-100 px-5 py-4 space-y-3">
 {/* Free delivery notice */}
 {subtotal < 499 && (
 <div className="flex items-center gap-2 bg-saffron-50 text-saffron-700 text-xs font-medium px-3 py-2 rounded-lg">
 <Truck className="w-4 h-4 shrink-0" />
 Add {formatPrice(499 - subtotal)} more for free delivery
 </div>
 )}

 {/* Price breakdown */}
 <div className="space-y-1.5 text-sm">
 <div className="flex justify-between text-surface-500">
 <span>Subtotal ({itemCount} items)</span>
 <span>{formatPrice(subtotal)}</span>
 </div>
 <div className="flex justify-between text-surface-500">
 <span>Delivery</span>
 <span className={deliveryFee === 0 ? 'text-tulsi-green font-medium' : ''}>
 {deliveryFee === 0 ? 'FREE' : formatPrice(deliveryFee)}
 </span>
 </div>
 <div className="flex justify-between text-surface-900 font-bold text-base pt-1.5 border-t border-surface-100">
 <span>Total</span>
 <span>{formatPrice(total)}</span>
 </div>
 </div>

 {/* Action buttons */}
 <div className="space-y-2">
 <Link
 href="/store/checkout"
 onClick={closeCart}
 className="w-full flex items-center justify-center gap-2 py-3 bg-saffron-600 text-white font-semibold rounded-xl hover:bg-saffron-700 transition-colors"
 >
 Proceed to Checkout
 <ArrowRight className="w-4 h-4" />
 </Link>
 <Link
 href="/store/cart"
 onClick={closeCart}
 className="w-full flex items-center justify-center gap-2 py-2.5 bg-surface-100 text-surface-700 font-medium text-sm rounded-xl hover:bg-surface-200 transition-colors"
 >
 View Full Cart
 </Link>
 </div>
 </div>
 </>
 )}
 </div>
 </>
 );
}
