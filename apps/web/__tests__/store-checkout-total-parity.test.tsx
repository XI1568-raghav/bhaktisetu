import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { CartProvider, useCart, type CartProduct } from '../components/CartContext';
import { computeStoreOrderTotals, DELIVERY_FEE_INR } from '../lib/store-pricing';

// COM-06 / S-09 (prod sweep 2026-08-12). The cart added a 5% "GST (est.)" line
// the API never charged and never remitted (no GSTIN), and the ₹49 delivery fee
// on sub-₹499 baskets was displayed but also never charged. So
//   button said ₹733  →  StoreOrder recorded ₹698  →  Razorpay took ₹698.
// The API now computes subtotal + delivery itself and REFUSES an order whose
// client total disagrees, so the cart must produce exactly that number.

const product: CartProduct = {
  id: 'p1',
  handle: 'gita',
  title: 'Bhagavad Gita',
  price: 349,
  compareAtPrice: 499,
  image: null,
  category: 'books',
  inStock: true,
  freeDelivery: false,
};

const cheap: CartProduct = { ...product, id: 'p2', handle: 'camphor', title: 'Camphor', price: 199 };

function wrapper({ children }: { children: ReactNode }) {
  return <CartProvider>{children}</CartProvider>;
}

beforeEach(() => {
  localStorage.clear();
});

describe('cart total == the amount the API will charge', () => {
  it('is subtotal + delivery, with no GST line, on a sub-₹499 basket', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addItem(cheap, 1));
    expect(result.current.subtotal).toBe(199);
    expect(result.current.deliveryFee).toBe(DELIVERY_FEE_INR);
    expect(result.current.total).toBe(248);
    expect(result.current.total).toBe(
      computeStoreOrderTotals([{ qty: 1, unitPriceInr: 199 }]).totalInr,
    );
  });

  it('is exactly the subtotal once free delivery applies (the ₹733 vs ₹698 case)', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addItem(product, 2));
    expect(result.current.subtotal).toBe(698);
    expect(result.current.deliveryFee).toBe(0);
    expect(result.current.total).toBe(698);
  });

  it('exposes no `tax` on the cart context at all', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addItem(product, 2));
    expect('tax' in (result.current as Record<string, unknown>)).toBe(false);
  });
});

describe('checkout + cart surfaces no longer show an uncharged GST line', () => {
  const files = [
    'app/store/checkout/page.tsx',
    'app/store/cart/page.tsx',
    'components/CartDrawer.tsx',
    'components/CartContext.tsx',
  ];

  for (const rel of files) {
    it(`${rel} renders no GST line`, () => {
      const src = readFileSync(resolve(__dirname, '..', rel), 'utf8');
      expect(src).not.toMatch(/GST/);
      expect(src).not.toMatch(/subtotal\s*\*\s*0\.05/);
    });
  }
});
