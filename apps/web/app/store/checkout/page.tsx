'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
 ArrowLeft,
 MapPin,
 CreditCard,
 Truck,
 Shield,
 ShoppingBag,
 Check,
 Plus,
 ChevronRight,
 Loader2,
 IndianRupee,
 Banknote,
} from 'lucide-react';
import AuthGuard from '../../../components/AuthGuard';
import { useCart } from '../../../components/CartContext';
import { useAuth } from '../../../lib/auth-context';
import { API_BASE_URL } from '../../../lib/api-config';
import { friendlyApiError } from '../../../lib/friendly-error';
import { buttonClass } from '../../../components/ui/button-recipe';
import { H1 } from '../../../components/ui/heading-recipe';

function formatPrice(amount: number): string {
 return new Intl.NumberFormat('en-IN', {
 style: 'currency',
 currency: 'INR',
 maximumFractionDigits: 0,
 }).format(amount);
}

// Razorpay's checkout.js is small (~70KB) but we load it on demand only on
// the checkout page so the rest of the store stays light. Idempotent: a
// second call resolves immediately if the global is already there.
let razorpayScriptPromise: Promise<void> | null = null;
function loadRazorpayScript(): Promise<void> {
 if (typeof window === 'undefined') return Promise.resolve();
 if ((window as unknown as { Razorpay?: unknown }).Razorpay) return Promise.resolve();
 if (razorpayScriptPromise) return razorpayScriptPromise;
 razorpayScriptPromise = new Promise<void>((resolve, reject) => {
 const existing = document.querySelector<HTMLScriptElement>(
 'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
 );
 if (existing) {
 existing.addEventListener('load', () => resolve(), { once: true });
 existing.addEventListener('error', () => reject(new Error('razorpay script load failed')), { once: true });
 return;
 }
 const s = document.createElement('script');
 s.src = 'https://checkout.razorpay.com/v1/checkout.js';
 s.async = true;
 s.onload = () => resolve();
 s.onerror = () => {
 razorpayScriptPromise = null;
 reject(new Error('razorpay script load failed'));
 };
 document.body.appendChild(s);
 });
 return razorpayScriptPromise;
}

// Store-owner revamp (2026-08-05): saved addresses were hardcoded fake rows —
// every checkout shipped to a fake address. Now loaded from
// GET /users/me/addresses; empty state links to /profile to add one. Shape
// matches the AddressManager model.
interface SavedAddress {
  id: string;
  label: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

type PaymentMethod = 'razorpay' | 'cod';

function CheckoutContent() {
 const router = useRouter();
 const { user, session } = useAuth();
 const { items, itemCount, subtotal, deliveryFee, total, clearCart } = useCart();

 const [addresses, setAddresses] = useState<SavedAddress[]>([]);
 const [addressesLoading, setAddressesLoading] = useState(true);
 const [selectedAddress, setSelectedAddress] = useState('');
 const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('razorpay');
 const [placing, setPlacing] = useState(false);
 const [orderPlaced, setOrderPlaced] = useState(false);
 const [orderNumber, setOrderNumber] = useState<string | null>(null);
 const [placeError, setPlaceError] = useState<string | null>(null);
 // P0 #S-08 (2026-07-09): idempotency key for the create-order POST. Held in a
 // ref so retries within one checkout attempt share a key (server dedupes),
 // and regenerated for each fresh attempt. crypto.randomUUID is available in
 // all evergreen browsers + secure contexts.
 const idempotencyKeyRef = useRef<string | null>(null);

 // Load the devotee's real saved addresses (was hardcoded fake rows).
 useEffect(() => {
 if (!session?.accessToken) { setAddressesLoading(false); return; }
 let cancelled = false;
 fetch(`${API_BASE_URL}/users/me/addresses`, {
 headers: { Authorization: `Bearer ${session.accessToken}` },
 })
 .then((r) => (r.ok ? r.json() : { addresses: [] }))
 .then((j) => {
 if (cancelled) return;
 const list = (j.addresses ?? []) as SavedAddress[];
 setAddresses(list);
 const def = list.find((a) => a.isDefault) ?? list[0];
 if (def) setSelectedAddress(def.id);
 })
 .catch(() => undefined)
 .finally(() => { if (!cancelled) setAddressesLoading(false); });
 return () => { cancelled = true; };
 }, [session?.accessToken]);

 if (items.length === 0 && !orderPlaced) {
 return (
 <div className="min-h-[100dvh] bg-saffron-50 flex items-center justify-center px-4">
 <div className="text-center">
 <ShoppingBag className="w-16 h-16 text-surface-300 mx-auto mb-4" />
 <h2 className="text-xl font-bold text-surface-700 mb-2">No items to checkout</h2>
 <p className="text-surface-500 mb-6">Add some items to your cart first.</p>
 <Link
 href="/store"
 className={buttonClass('primary', 'md')}
 >
 Browse Store
 </Link>
 </div>
 </div>
 );
 }

 if (orderPlaced) {
 return (
 <div className="min-h-[100dvh] bg-saffron-50 flex items-center justify-center px-4">
 <div className="bg-white rounded-xl border border-surface-100 p-10 text-center max-w-md">
 <div className="w-20 h-20 bg-tulsi-green-light/30 rounded-full flex items-center justify-center mx-auto mb-6">
 <Check className="w-10 h-10 text-tulsi-green" />
 </div>
 <h2 className="text-2xl font-bold text-surface-800 mb-2">Order Placed!</h2>
 <p className="text-surface-500 mb-6">
 Thank you for your order. You will receive a confirmation soon.
 </p>
 {/* S-11: this used to fall back to an order number built from the
 browser clock — a reference
 invented from the browser clock that matches nothing in the system, so
 support could never find the order the customer quoted. Show the real
 number or say plainly that it is pending. */}
 <p className="text-sm text-surface-400 mb-6">
 {orderNumber
 ? `Order ID: ${orderNumber}`
 : 'Your confirmation is on its way by email with the order number.'}
 </p>
 <div className="space-y-3">
 <Link
 href="/store"
 className="w-full flex items-center justify-center gap-2 py-3 bg-saffron-600 text-white font-medium rounded-lg hover:bg-saffron-700"
 >
 Continue Shopping
 </Link>
 {/* COM-09: /bookings has no store orders — the buyer had no way to look
 an order up after paying. Point at the real order history. */}
 <Link
 href="/store/orders"
 className="w-full flex items-center justify-center gap-2 py-2.5 text-saffron-600 font-medium text-sm"
 >
 View My Orders
 <ChevronRight className="w-4 h-4" />
 </Link>
 </div>
 </div>
 </div>
 );
 }

 async function handlePlaceOrder() {
 setPlacing(true);
 setPlaceError(null);
 // P0 #S-08: (re)generate an idempotency key for this attempt. If a key is
 // already set (e.g. this is a retry of the same attempt after a network
 // error), reuse it so the server returns the existing order. Clearing it
 // only on a fresh successful placement is handled below.
 if (!idempotencyKeyRef.current) {
 idempotencyKeyRef.current =
 typeof crypto !== 'undefined' && 'randomUUID' in crypto
 ? crypto.randomUUID()
 : `ck-${Date.now()}-${Math.random().toString(36).slice(2)}`;
 }
 try {
 const addr = addresses.find((a) => a.id === selectedAddress);
 if (!addr) throw new Error('Select a delivery address');
 // P1#4: HttpOnly cookie `darshya_session` is canonical. Bearer header
 // retained as additive transition fallback (in-memory session — no
 // localStorage read). All fetches below pass `credentials: 'include'`
 // for cross-origin cookie send (darshya.online → api.darshya.online).
 const accessToken = session?.accessToken;
 const authHeaders: Record<string, string> = {
 'content-type': 'application/json',
 ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
 };
 const res = await fetch(`${API_BASE_URL}/store/orders`, {
 method: 'POST',
 headers: authHeaders,
 credentials: 'include',
 body: JSON.stringify({
 items: items.map((it) => ({
 productId: it.product.id,
 qty: it.quantity,
 priceAtPurchase: it.product.price,
 })),
 totalAmountInr: total,
 idempotencyKey: idempotencyKeyRef.current ?? undefined,
 shippingAddress: {
 fullName: user?.fullName ?? addr.label,
 line1: addr.line1,
 line2: addr.line2,
 city: addr.city,
 state: addr.state,
 pincode: addr.pincode,
 country: 'India',
 },
 }),
 });
 if (!res.ok) {
 // S-10: the raw response body used to be rendered to the customer,
 // truncated mid-word at 120 chars, at the highest-intent moment in the
 // funnel. Log it, show human copy.
 const txt = await res.text().catch(() => '');
 console.error('[checkout] POST /store/orders failed', res.status, txt);
 if (res.status === 409) {
 // COM-06: the API refuses when our displayed total disagrees with its
 // own. Tell the customer to re-check rather than silently charging a
 // different number.
 throw new Error(
 'PRICE_CHANGED: Prices in your cart have changed. Please review your order total and try again.',
 );
 }
 throw new Error(`Order failed (${res.status})`);
 }
 const json = (await res.json()) as { data?: { id?: string; orderNumber?: string } };
 const storeOrderId = json.data?.id ?? null;
 const storeOrderNumber = json.data?.orderNumber ?? null;
 setOrderNumber(storeOrderNumber);
 // P0 #S-08: the order is created — clear the idempotency key so any future
 // checkout attempt gets a fresh key (this attempt's retries already
 // completed above).
 idempotencyKeyRef.current = null;

 // COD path: order sits in PENDING; fulfilment confirms manually.
 if (paymentMethod === 'cod') {
 clearCart();
 setOrderPlaced(true);
 return;
 }

 // Razorpay path. The StoreOrder row already exists in PENDING — we
 // now create a matching Razorpay order, launch checkout, and only
 // mark the cart cleared after the verify call confirms capture.
 if (!storeOrderId) {
 throw new Error('Order created but id missing — cannot start payment');
 }
 const rzpRes = await fetch(
 `${API_BASE_URL}/payments/store-orders/${storeOrderId}/razorpay`,
 { method: 'POST', headers: authHeaders, credentials: 'include' },
 );
 if (!rzpRes.ok) {
 const txt = await rzpRes.text().catch(() => '');
 console.error('[checkout] razorpay order failed', rzpRes.status, txt);
 throw new Error(`Could not start payment (${rzpRes.status})`);
 }
 const rzpOrder = (await rzpRes.json()) as {
 orderId: string;
 amount: number;
 currency: string;
 paymentId: string;
 razorpayKeyId: string;
 };

 await loadRazorpayScript();
 // Demo path: backend hands back synthetic ids and skips signature
 // check. We still call /verify so the StoreOrder flips to CONFIRMED
 // and the invoice fires — synthesising plausible handler args.
 const isDemoOrder = rzpOrder.orderId.startsWith('order_demo_');
 if (isDemoOrder) {
 await verifyStoreOrderPayment({
 storeOrderId,
 razorpayOrderId: rzpOrder.orderId,
 razorpayPaymentId: `pay_demo_${Date.now()}`,
 razorpaySignature: 'demo',
 authHeaders,
 });
 clearCart();
 setOrderPlaced(true);
 return;
 }

 await new Promise<void>((resolve, reject) => {
 const Razorpay = (window as unknown as { Razorpay?: new (opts: Record<string, unknown>) => { open: () => void } }).Razorpay;
 if (!Razorpay) {
 reject(new Error('Razorpay checkout failed to load'));
 return;
 }
 const rzp = new Razorpay({
 key: rzpOrder.razorpayKeyId,
 amount: rzpOrder.amount,
 currency: rzpOrder.currency,
 name: 'Darshya',
 description: `Order ${storeOrderNumber ?? storeOrderId}`,
 order_id: rzpOrder.orderId,
 prefill: {
 name: user?.fullName ?? '',
 email: user?.email ?? '',
 },
 theme: { color: '#9e6229' },
 modal: {
 ondismiss: () => reject(new Error('Payment cancelled')),
 },
 handler: async (response: {
 razorpay_order_id: string;
 razorpay_payment_id: string;
 razorpay_signature: string;
 }) => {
 try {
 await verifyStoreOrderPayment({
 storeOrderId,
 razorpayOrderId: response.razorpay_order_id,
 razorpayPaymentId: response.razorpay_payment_id,
 razorpaySignature: response.razorpay_signature,
 authHeaders,
 });
 clearCart();
 setOrderPlaced(true);
 resolve();
 } catch (verifyErr) {
 reject(verifyErr);
 }
 },
 });
 rzp.open();
 });
 } catch (err) {
 // S-10: map to human copy. Two messages are ours and already
 // customer-ready — the price-change notice and an explicit cancellation —
 // everything else goes through the shared friendly-error mapper so no
 // status code or backend string ever reaches the screen.
 const raw = err instanceof Error ? err.message : '';
 if (raw.startsWith('PRICE_CHANGED: ')) {
 setPlaceError(raw.slice('PRICE_CHANGED: '.length));
 } else if (/payment cancelled/i.test(raw)) {
 setPlaceError('Payment was cancelled. Your cart is still saved.');
 } else {
 setPlaceError(friendlyApiError(err).message);
 }
 } finally {
 setPlacing(false);
 }
 }

 async function verifyStoreOrderPayment(args: {
 storeOrderId: string;
 razorpayOrderId: string;
 razorpayPaymentId: string;
 razorpaySignature: string;
 authHeaders: Record<string, string>;
 }) {
 const verifyRes = await fetch(
 `${API_BASE_URL}/payments/store-orders/${args.storeOrderId}/verify`,
 {
 method: 'POST',
 headers: args.authHeaders,
 credentials: 'include',
 body: JSON.stringify({
 razorpayOrderId: args.razorpayOrderId,
 razorpayPaymentId: args.razorpayPaymentId,
 razorpaySignature: args.razorpaySignature,
 }),
 },
 );
 if (!verifyRes.ok) {
 const txt = await verifyRes.text().catch(() => '');
 console.error('[checkout] payment verify failed', verifyRes.status, txt);
 throw new Error(`Payment verification failed (${verifyRes.status})`);
 }
 }

 return (
 <div className="min-h-[100dvh] bg-saffron-50">
 <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
 {/* Back */}
 <Link
 href="/store/cart"
 className="inline-flex items-center gap-2 text-sm text-surface-500 hover:text-saffron-600 mb-6"
 >
 <ArrowLeft className="w-4 h-4" />
 Back to Cart
 </Link>

 <h1 className={`${H1.portal} mb-8`}>Checkout</h1>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
 {/* Left: Form */}
 <div className="lg:col-span-2 space-y-6">
 {/* Delivery Address */}
 <div className="bg-white rounded-xl border border-surface-100 p-5">
 <h2 className="font-bold text-surface-800 flex items-center gap-2 mb-4">
 <MapPin className="w-5 h-5 text-saffron-500" />
 Delivery Address
 </h2>

 <div className="space-y-3">
 {addressesLoading ? (
 <p className="text-sm text-surface-500">Loading your addresses…</p>
 ) : addresses.length === 0 ? (
 <div className="rounded-xl border border-surface-200 bg-surface-50 p-4 text-sm text-surface-600">
 <p className="mb-2">You have no saved delivery address.</p>
 <Link href="/profile" className="inline-flex items-center gap-1 text-saffron-600 font-medium hover:text-saffron-700">
 <Plus className="w-4 h-4" /> Add one in your profile
 </Link>
 </div>
 ) : (
 addresses.map((addr) => (
 <label
 key={addr.id}
 className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
 selectedAddress === addr.id
 ? 'border-saffron-500 bg-saffron-50/50'
 : 'border-surface-200 hover:border-surface-300'
 }`}
 >
 <input
 type="radio"
 name="address"
 value={addr.id}
 checked={selectedAddress === addr.id}
 onChange={() => setSelectedAddress(addr.id)}
 className="mt-1 accent-saffron-600"
 />
 <div>
 <div className="flex items-center gap-2">
 <span className="text-sm font-semibold text-surface-800">{addr.label}</span>
 {addr.isDefault && (
 <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-saffron-100 text-saffron-700">
 Default
 </span>
 )}
 </div>
 <p className="text-sm text-surface-600 mt-0.5">
 {addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}
 </p>
 <p className="text-sm text-surface-500">
 {addr.city}, {addr.state} - {addr.pincode}
 </p>
 </div>
 </label>
 ))
 )}

 {addresses.length > 0 && (
 <Link href="/profile" className="flex items-center gap-2 text-sm text-saffron-600 hover:text-saffron-700 font-medium pt-1">
 <Plus className="w-4 h-4" />
 Add New Address
 </Link>
 )}
 </div>
 </div>

 {/* Payment Method */}
 <div className="bg-white rounded-xl border border-surface-100 p-5">
 <h2 className="font-bold text-surface-800 flex items-center gap-2 mb-4">
 <CreditCard className="w-5 h-5 text-saffron-500" />
 Payment Method
 </h2>

 <div className="space-y-3">
 <label
 className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
 paymentMethod === 'razorpay'
 ? 'border-saffron-500 bg-saffron-50/50'
 : 'border-surface-200 hover:border-surface-300'
 }`}
 >
 <input
 type="radio"
 name="payment"
 value="razorpay"
 checked={paymentMethod === 'razorpay'}
 onChange={() => setPaymentMethod('razorpay')}
 className="accent-saffron-600"
 />
 <div className="flex-1">
 <div className="flex items-center gap-2">
 <IndianRupee className="w-4 h-4 text-blue-600" />
 <span className="text-sm font-semibold text-surface-800">Pay Online (Razorpay)</span>
 </div>
 <p className="text-xs text-surface-500 mt-0.5">
 UPI, Credit/Debit Card, Net Banking, Wallets
 </p>
 </div>
 <Shield className="w-5 h-5 text-surface-300" />
 </label>

 <label
 className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
 paymentMethod === 'cod'
 ? 'border-saffron-500 bg-saffron-50/50'
 : 'border-surface-200 hover:border-surface-300'
 }`}
 >
 <input
 type="radio"
 name="payment"
 value="cod"
 checked={paymentMethod === 'cod'}
 onChange={() => setPaymentMethod('cod')}
 className="accent-saffron-600"
 />
 <div className="flex-1">
 <div className="flex items-center gap-2">
 <Banknote className="w-4 h-4 text-tulsi-green" />
 <span className="text-sm font-semibold text-surface-800">Cash on Delivery</span>
 </div>
 <p className="text-xs text-surface-500 mt-0.5">
 Pay when you receive your order
 </p>
 </div>
 </label>
 </div>
 </div>
 </div>

 {/* Right: Order Summary */}
 <div className="lg:col-span-1">
 <div className="bg-white rounded-xl border border-surface-100 p-5 sticky top-24">
 <h2 className="font-bold text-surface-800 text-lg mb-4">Order Summary</h2>

 {/* Items preview */}
 <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
 {items.map((item) => (
 <div key={item.id} className="flex gap-3">
 <div className="w-14 h-14 bg-gradient-to-br from-surface-50 to-saffron-50 rounded-lg flex items-center justify-center shrink-0">
 <ShoppingBag className="w-5 h-5 text-saffron-200" />
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-sm font-medium text-surface-800 line-clamp-1">
 {item.product.title}
 </p>
 <p className="text-xs text-surface-500">
 Qty: {item.quantity} x {formatPrice(item.product.price)}
 </p>
 </div>
 <span className="text-sm font-semibold text-surface-800 shrink-0">
 {formatPrice(item.product.price * item.quantity)}
 </span>
 </div>
 ))}
 </div>

 {/* Totals */}
 <div className="border-t border-surface-100 pt-4 space-y-2 text-sm">
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
 <div className="border-t border-surface-100 pt-2 flex justify-between">
 <span className="font-bold text-surface-800 text-base">Total</span>
 <span className="font-bold text-surface-800 text-xl">{formatPrice(total)}</span>
 </div>
 </div>

 {/* Place Order */}
 <button
 onClick={handlePlaceOrder}
 disabled={placing || !selectedAddress}
 className="w-full flex items-center justify-center gap-2 py-3.5 bg-saffron-600 text-white font-medium rounded-lg hover:bg-saffron-700 transition-colors mt-6 disabled:opacity-50"
 >
 {placing ? (
 <>
 <Loader2 className="w-5 h-5 animate-spin" />
 Placing Order...
 </>
 ) : (
 <>
 <Shield className="w-5 h-5" />
 Place Order - {formatPrice(total)}
 </>
 )}
 </button>

 {placeError && (
 <p className="text-xs text-red-600 text-center mt-3">{placeError}</p>
 )}
 <p className="text-xs text-surface-400 text-center mt-3">
 By placing this order, you agree to our Terms of Service.
 </p>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
}

export default function CheckoutPage() {
 return (
 <AuthGuard>
 <CheckoutContent />
 </AuthGuard>
 );
}
