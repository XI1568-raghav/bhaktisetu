import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { CartProvider, useCart, type CartProduct } from '../components/CartContext';

const product: CartProduct = {
  id: 'p1',
  handle: 'thali',
  title: 'Brass Thali',
  price: 100,
  compareAtPrice: 150,
  image: null,
  category: 'puja',
  inStock: true,
  freeDelivery: false,
};

const product2: CartProduct = { ...product, id: 'p2', handle: 'diya', title: 'Diya', price: 250 };

function wrapper({ children }: { children: ReactNode }) {
  return <CartProvider>{children}</CartProvider>;
}

beforeEach(() => {
  localStorage.clear();
});

describe('CartContext', () => {
  it('starts empty', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    expect(result.current.items).toEqual([]);
    expect(result.current.itemCount).toBe(0);
    expect(result.current.subtotal).toBe(0);
  });

  it('adds an item and computes totals', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addItem(product, 2));
    expect(result.current.itemCount).toBe(2);
    expect(result.current.subtotal).toBe(200);
    expect(result.current.deliveryFee).toBe(49);
    expect(result.current.tax).toBe(10);
    expect(result.current.total).toBe(259);
  });

  it('caps quantity at 10 per product', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addItem(product, 99));
    expect(result.current.items[0]!.quantity).toBe(10);
  });

  it('merges duplicate adds for the same product id', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addItem(product, 3));
    act(() => result.current.addItem(product, 4));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0]!.quantity).toBe(7);
  });

  it('waives delivery fee at the free-delivery threshold', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addItem(product2, 2)); // 500
    expect(result.current.subtotal).toBe(500);
    expect(result.current.deliveryFee).toBe(0);
  });

  it('removes an item', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addItem(product, 1));
    const id = result.current.items[0]!.id;
    act(() => result.current.removeItem(id));
    expect(result.current.items).toHaveLength(0);
  });

  it('updateQuantity ignores values < 1', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addItem(product, 2));
    const id = result.current.items[0]!.id;
    act(() => result.current.updateQuantity(id, 0));
    expect(result.current.items[0]!.quantity).toBe(2);
  });

  it('clearCart empties items and closes drawer', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addItem(product, 1));
    act(() => result.current.clearCart());
    expect(result.current.items).toEqual([]);
    expect(result.current.isOpen).toBe(false);
  });

  it('toggleCart flips the drawer state', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    expect(result.current.isOpen).toBe(false);
    act(() => result.current.toggleCart());
    expect(result.current.isOpen).toBe(true);
    act(() => result.current.toggleCart());
    expect(result.current.isOpen).toBe(false);
  });
});
