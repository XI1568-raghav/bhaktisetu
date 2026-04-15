'use client';

import { ShoppingBag } from 'lucide-react';
import { useCart } from './CartContext';

export default function NavCartButton() {
  const { itemCount, toggleCart } = useCart();

  return (
    <button
      onClick={toggleCart}
      aria-label={`Cart (${itemCount} items)`}
      className="relative p-2 text-stone-500 hover:text-saffron-600 hover:bg-saffron-50 rounded-lg transition-colors"
    >
      <ShoppingBag className="w-5 h-5" />
      {itemCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-saffron-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
          {itemCount > 99 ? '99+' : itemCount}
        </span>
      )}
    </button>
  );
}
