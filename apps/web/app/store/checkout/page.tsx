'use client';
export const runtime = 'edge';

import { useState } from 'react';
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

function formatPrice(amount: number): string {
 return new Intl.NumberFormat('en-IN', {
 style: 'currency',
 currency: 'INR',
 maximumFractionDigits: 0,
 }).format(amount);
}

// Saved addresses placeholder
const SAVED_ADDRESSES = [
 {
 id: 'addr_1',
 label: 'Home',
 line1: '42, Lotus Garden Apartments',
 line2: 'MG Road, Koramangala',
 city: 'Bengaluru',
 state: 'Karnataka',
 pincode: '560095',
 isDefault: true,
 },
 {
 id: 'addr_2',
 label: 'Office',
 line1: '5th Floor, Tech Park Tower B',
 line2: 'Whitefield',
 city: 'Bengaluru',
 state: 'Karnataka',
 pincode: '560066',
 isDefault: false,
 },
];

type PaymentMethod = 'razorpay' | 'cod';

function CheckoutContent() {
 const router = useRouter();
 const { user } = useAuth();
 const { items, itemCount, subtotal, deliveryFee, tax, total, clearCart } = useCart();

 const [selectedAddress, setSelectedAddress] = useState(
 SAVED_ADDRESSES.find((a) => a.isDefault)?.id ?? SAVED_ADDRESSES[0]?.id ?? ''
 );
 const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('razorpay');
 const [placing, setPlacing] = useState(false);
 const [orderPlaced, setOrderPlaced] = useState(false);
 const [orderNumber, setOrderNumber] = useState<string | null>(null);
 const [placeError, setPlaceError] = useState<string | null>(null);

 if (items.length === 0 && !orderPlaced) {
 return (
 <div className="min-h-screen bg-saffron-50 flex items-center justify-center px-4">
 <div className="text-center">
 <ShoppingBag className="w-16 h-16 text-surface-300 mx-auto mb-4" />
 <h2 className="text-xl font-bold text-surface-700 mb-2">No items to checkout</h2>
 <p className="text-surface-500 mb-6">Add some items to your cart first.</p>
 <Link
 href="/store"
 className="inline-flex items-center gap-2 px-6 py-3 bg-saffron-600 text-white font-medium rounded-lg hover:bg-saffron-700"
 >
 Browse Store
 </Link>
 </div>
 </div>
 );
 }

 if (orderPlaced) {
 return (
 <div className="min-h-screen bg-saffron-50 flex items-center justify-center px-4">
 <div className="bg-white rounded-xl border border-surface-100 p-10 text-center max-w-md">
 <div className="w-20 h-20 bg-tulsi-green-light/30 rounded-full flex items-center justify-center mx-auto mb-6">
 <Check className="w-10 h-10 text-tulsi-green" />
 </div>
 <h2 className="text-2xl font-bold text-surface-800 mb-2">Order Placed!</h2>
 <p className="text-surface-500 mb-6">
 Thank you for your order. You will receive a confirmation soon.
 </p>
 <p className="text-sm text-surface-400 mb-6">
 Order ID: {orderNumber ?? `ORD-${Date.now().toString().slice(-8)}`}
 </p>
 <div className="space-y-3">
 <Link
 href="/store"
 className="w-full flex items-center justify-center gap-2 py-3 bg-saffron-600 text-white font-medium rounded-lg hover:bg-saffron-700"
 >
 Continue Shopping
 </Link>
 <Link
 href="/bookings"
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
 try {
 const addr = SAVED_ADDRESSES.find((a) => a.id === selectedAddress);
 if (!addr) throw new Error('Select a delivery address');
 const token =
 typeof window !== 'undefined'
 ? localStorage.getItem('poojly_session_token') ?? localStorage.getItem('darshya_session_token')
 : null;
 const res = await fetch(`${API_BASE_URL}/store/orders`, {
 method: 'POST',
 headers: {
 'content-type': 'application/json',
 ...(token ? { authorization: `Bearer ${token}` } : {}),
 },
 body: JSON.stringify({
 items: items.map((it) => ({
 productId: it.product.id,
 qty: it.quantity,
 priceAtPurchase: it.product.price,
 })),
 totalAmountInr: total,
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
 const txt = await res.text().catch(() => '');
 throw new Error(`Order failed (${res.status}) ${txt.slice(0, 120)}`);
 }
 const json = (await res.json()) as { data?: { orderNumber?: string } };
 setOrderNumber(json.data?.orderNumber ?? null);
 // TODO: launch Razorpay checkout when paymentMethod === 'razorpay' once
 // /api/v1/payments/razorpay-store-order endpoint lands. COD goes straight
 // to PENDING which fulfilment confirms manually.
 clearCart();
 setOrderPlaced(true);
 } catch (err) {
 const msg = err instanceof Error ? err.message : 'Could not place order';
 setPlaceError(msg);
 } finally {
 setPlacing(false);
 }
 }

 return (
 <div className="min-h-screen bg-saffron-50">
 <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
 {/* Back */}
 <Link
 href="/store/cart"
 className="inline-flex items-center gap-2 text-sm text-surface-500 hover:text-saffron-600 mb-6"
 >
 <ArrowLeft className="w-4 h-4" />
 Back to Cart
 </Link>

 <h1 className="text-2xl font-bold text-surface-800 mb-8">Checkout</h1>

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
 {SAVED_ADDRESSES.map((addr) => (
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
 ))}

 <button className="flex items-center gap-2 text-sm text-saffron-600 hover:text-saffron-700 font-medium pt-1">
 <Plus className="w-4 h-4" />
 Add New Address
 </button>
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
 <div className="flex justify-between text-surface-500">
 <span>GST (est.)</span>
 <span>{formatPrice(tax)}</span>
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
