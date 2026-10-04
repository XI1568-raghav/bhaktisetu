'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ShoppingCart } from 'lucide-react';
import { useCart, type CartProduct } from '../CartContext';
import { isOrderableProductId, BROWSE_ONLY_REASON } from '../../lib/store-buyability';

/**
 * A11Y-11: /store rendered "Add to Cart" as a bare <button> with no onClick,
 * nested inside the card's <a>. Clicking it navigated to the PDP, so users
 * believed they had added an item when they had not, and keyboard users paid
 * a tab stop for a control that did nothing.
 *
 * This is the real control: it lives OUTSIDE the card link and only reports
 * success after the cart has actually changed.
 */
export default function AddToCartButton({
  product,
  className,
}: {
  product: CartProduct;
  className?: string;
}) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  /**
   * COM-01: the browse-only guard lives HERE, in the shared control, rather
   * than at each call site — /store's grid and the seller shelf both render
   * this component, and a guard that has to be remembered per grid is a guard
   * that gets forgotten on the next one. `POST /store/orders` resolves items by
   * StoreProduct uuid, so a `prod_015` seed row can be added to a basket but
   * can never be ordered; offering the control was the false promise.
   *
   * Checked BEFORE `inStock`, on purpose. "Out of stock" is the wrong reason
   * and a misleading one: it implies the item exists and will return. It does
   * not exist — no seller lists it — and the copy says which.
   */
  if (!isOrderableProductId(product.id)) {
    return (
      <div className="mt-3">
        <button
          type="button"
          disabled
          aria-describedby={`browse-only-${product.id}`}
          // Deliberately NOT `className ?? …`: a caller's class list is written
          // for a live control (the seller PDP passes a solid saffron fill), and
          // a disabled button wearing it reads as pressable. A refusal has to
          // look like one.
          className="w-full py-2.5 bg-surface-100 text-surface-500 font-medium text-sm rounded-lg border border-surface-200 flex items-center justify-center gap-1.5 cursor-not-allowed"
        >
          Not available to order
        </button>
        <p id={`browse-only-${product.id}`} className="mt-1.5 text-xs text-surface-500">
          {BROWSE_ONLY_REASON}
        </p>
      </div>
    );
  }

  if (!product.inStock) {
    return (
      <button
        type="button"
        disabled
        className={
          className ??
          'mt-3 w-full py-2.5 bg-surface-100 text-surface-500 font-medium text-sm rounded-lg border border-surface-200 flex items-center justify-center gap-1.5 cursor-not-allowed'
        }
      >
        Out of stock
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        addItem(product, 1);
        setAdded(true);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setAdded(false), 2000);
      }}
      className={
        className ??
        'relative z-10 mt-3 w-full py-2.5 bg-saffron-50 text-saffron-700 font-medium text-sm rounded-lg border border-saffron-200 hover:bg-saffron-100 transition-colors flex items-center justify-center gap-1.5 group-hover:bg-saffron-600 group-hover:text-white group-hover:border-saffron-600'
      }
    >
      {added ? (
        <>
          <Check className="w-4 h-4" aria-hidden="true" />
          Added to cart
        </>
      ) : (
        <>
          <ShoppingCart className="w-4 h-4" aria-hidden="true" />
          Add to Cart
        </>
      )}
    </button>
  );
}
