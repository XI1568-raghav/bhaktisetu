'use client';

import { ShoppingBag } from 'lucide-react';
import { useCart } from './CartContext';

export default function NavCartButton() {
 const { itemCount, toggleCart } = useCart();

 return (
 <button
 onClick={toggleCart}
 aria-label={`Cart (${itemCount} items)`}
 // HN-12: p-2 around a 20px glyph measured 36x36 on a phone, under the 44px
 // floor in WCAG 2.5.5. The box grows; the glyph does not.
 className="relative inline-flex items-center justify-center min-h-[44px] min-w-[44px] p-2 text-surface-500 hover:text-saffron-600 hover:bg-saffron-50 rounded-lg transition-colors"
 >
 <ShoppingBag className="w-5 h-5" />
 {itemCount > 0 && (
 <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-saffron-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
 {itemCount > 99 ? '99+' : itemCount}
 </span>
 )}
 </button>
 );
}
