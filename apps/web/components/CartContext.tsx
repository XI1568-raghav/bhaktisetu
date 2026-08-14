'use client';

import {
 createContext,
 useContext,
 useEffect,
 useState,
 useCallback,
 type ReactNode,
} from 'react';
import { computeStoreOrderTotals } from '../lib/store-pricing';

// ─── Types ──────────────────────────────────────────────────────

export interface CartProduct {
 id: string;
 handle: string;
 title: string;
 price: number;
 compareAtPrice: number | null;
 image: string | null;
 category: string;
 inStock: boolean;
 freeDelivery: boolean;
}

export interface CartItem {
 id: string;
 product: CartProduct;
 quantity: number;
}

interface CartContextValue {
 items: CartItem[];
 itemCount: number;
 subtotal: number;
 deliveryFee: number;
 total: number;
 addItem: (product: CartProduct, quantity?: number) => void;
 removeItem: (itemId: string) => void;
 updateQuantity: (itemId: string, quantity: number) => void;
 clearCart: () => void;
 isOpen: boolean;
 openCart: () => void;
 closeCart: () => void;
 toggleCart: () => void;
}

// ─── Storage key ────────────────────────────────────────────────

const CART_STORAGE_KEY = 'poojly_cart';

// ─── Context ────────────────────────────────────────────────────

const CartContext = createContext<CartContextValue | null>(null);

// ─── Provider ───────────────────────────────────────────────────

export function CartProvider({ children }: { children: ReactNode }) {
 const [items, setItems] = useState<CartItem[]>([]);
 const [isOpen, setIsOpen] = useState(false);
 const [hydrated, setHydrated] = useState(false);

 // Load from localStorage on mount
 useEffect(() => {
 try {
 const stored = localStorage.getItem(CART_STORAGE_KEY);
 if (stored) {
 setItems(JSON.parse(stored));
 }
 } catch {
 // localStorage unavailable
 }
 setHydrated(true);
 }, []);

 // Persist to localStorage on change (after hydration)
 useEffect(() => {
 if (!hydrated) return;
 try {
 localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
 } catch {
 // localStorage unavailable
 }
 }, [items, hydrated]);

 const addItem = useCallback((product: CartProduct, quantity: number = 1) => {
 setItems((prev) => {
 const existing = prev.find((item) => item.product.id === product.id);
 if (existing) {
 return prev.map((item) =>
 item.product.id === product.id
 ? { ...item, quantity: Math.min(item.quantity + quantity, 10) }
 : item
 );
 }
 return [
 ...prev,
 {
 id: `cart_${product.id}_${Date.now()}`,
 product,
 quantity: Math.min(quantity, 10),
 },
 ];
 });
 setIsOpen(true);
 }, []);

 const removeItem = useCallback((itemId: string) => {
 setItems((prev) => prev.filter((item) => item.id !== itemId));
 }, []);

 const updateQuantity = useCallback((itemId: string, quantity: number) => {
 if (quantity < 1) return;
 setItems((prev) =>
 prev.map((item) =>
 item.id === itemId ? { ...item, quantity: Math.min(quantity, 10) } : item
 )
 );
 }, []);

 const clearCart = useCallback(() => {
 setItems([]);
 setIsOpen(false);
 }, []);

 const openCart = useCallback(() => setIsOpen(true), []);
 const closeCart = useCallback(() => setIsOpen(false), []);
 const toggleCart = useCallback(() => setIsOpen((prev) => !prev), []);

 // Computed values
 const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
 // COM-06 / S-09: totals come from lib/store-pricing, which the API mirrors
 // exactly (apps/api/src/lib/store-pricing.ts) and enforces — POST /store/orders
 // now 409s when the client total disagrees with the server's. This used to add
 // a flat 5% tax line the API never charged and the business — which has no tax
 // registration — never remitted, so the "Place Order - ₹733" button sat on top
 // of a ₹698 charge.
 const { subtotalInr: subtotal, deliveryFeeInr: deliveryFee, totalInr: total } =
 computeStoreOrderTotals(
 items.map((item) => ({ qty: item.quantity, unitPriceInr: item.product.price })),
 );

 const value: CartContextValue = {
 items,
 itemCount,
 subtotal,
 deliveryFee,
 total,
 addItem,
 removeItem,
 updateQuantity,
 clearCart,
 isOpen,
 openCart,
 closeCart,
 toggleCart,
 };

 return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

// ─── Hook ───────────────────────────────────────────────────────

export function useCart(): CartContextValue {
 const context = useContext(CartContext);
 if (!context) {
 throw new Error('useCart must be used within a CartProvider');
 }
 return context;
}
