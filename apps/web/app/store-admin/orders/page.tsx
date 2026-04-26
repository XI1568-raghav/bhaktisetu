'use client';

import { useState, useEffect } from 'react';
import {
 ShoppingCart,
 Clock,
 Truck,
 CheckCircle2,
 AlertCircle,
 RotateCcw,
 Search,
 Filter,
 Package,
 User,
 MapPin,
 Loader2,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────

type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'returned' | 'cancelled';

interface OrderItem {
 name: string;
 quantity: number;
 price: number;
}

interface Order {
 id: string;
 orderId: string;
 customer: string;
 phone: string;
 address: string;
 items: OrderItem[];
 total: number;
 status: OrderStatus;
 date: string;
 paymentMethod: string;
}

const STORAGE_KEY = 'poojly_store_orders';

const defaultOrders: Order[] = [
 {
 id: '1',
 orderId: 'ORD-20260416-001',
 customer: 'Priya Mehta',
 phone: '+91 98765 43210',
 address: 'B-42, Saket Nagar, Indore, MP 452001',
 items: [
 { name: 'Brass Diya Set (Pack of 6)', quantity: 2, price: 450 },
 { name: 'Premium Agarbatti Box', quantity: 1, price: 350 },
 ],
 total: 1250,
 status: 'pending',
 date: '2026-04-16T09:30:00Z',
 paymentMethod: 'Razorpay UPI',
 },
 {
 id: '2',
 orderId: 'ORD-20260415-042',
 customer: 'Rajesh Kumar',
 phone: '+91 87654 32109',
 address: '14/3, MG Road, Varanasi, UP 221001',
 items: [
 { name: '5 Mukhi Rudraksha Mala', quantity: 1, price: 1290 },
 { name: 'Complete Puja Thali Set', quantity: 1, price: 1850 },
 ],
 total: 3140,
 status: 'confirmed',
 date: '2026-04-15T14:15:00Z',
 paymentMethod: 'Razorpay Card',
 },
 {
 id: '3',
 orderId: 'ORD-20260414-089',
 customer: 'Anita Singh',
 phone: '+91 76543 21098',
 address: '8, Lajpat Nagar, New Delhi 110024',
 items: [
 { name: 'Camphor Tablets (Pack of 100)', quantity: 3, price: 199 },
 { name: 'Kumkum & Haldi Gift Set', quantity: 2, price: 280 },
 ],
 total: 1157,
 status: 'shipped',
 date: '2026-04-14T11:45:00Z',
 paymentMethod: 'Razorpay UPI',
 },
 {
 id: '4',
 orderId: 'ORD-20260413-112',
 customer: 'Deepak Verma',
 phone: '+91 65432 10987',
 address: '22, Gandhi Nagar, Nashik, MH 422001',
 items: [
 { name: 'Silver Plated Ganesh Idol', quantity: 1, price: 4500 },
 ],
 total: 4500,
 status: 'delivered',
 date: '2026-04-13T08:20:00Z',
 paymentMethod: 'Razorpay Card',
 },
 {
 id: '5',
 orderId: 'ORD-20260412-156',
 customer: 'Sunita Devi',
 phone: '+91 54321 09876',
 address: '9, Vikas Puri, Jaipur, RJ 302015',
 items: [
 { name: 'Complete Puja Thali Set', quantity: 1, price: 1850 },
 { name: 'Brass Diya Set (Pack of 6)', quantity: 1, price: 450 },
 ],
 total: 2300,
 status: 'delivered',
 date: '2026-04-12T16:00:00Z',
 paymentMethod: 'Razorpay UPI',
 },
 {
 id: '6',
 orderId: 'ORD-20260411-189',
 customer: 'Manoj Tiwari',
 phone: '+91 43210 98765',
 address: '17, Ashok Nagar, Lucknow, UP 226001',
 items: [
 { name: 'Premium Agarbatti Box', quantity: 5, price: 350 },
 ],
 total: 1750,
 status: 'delivered',
 date: '2026-04-11T10:30:00Z',
 paymentMethod: 'COD',
 },
 {
 id: '7',
 orderId: 'ORD-20260410-203',
 customer: 'Kavita Sharma',
 phone: '+91 32109 87654',
 address: '4/12, Sector 15, Chandigarh 160015',
 items: [
 { name: '5 Mukhi Rudraksha Mala', quantity: 2, price: 1290 },
 ],
 total: 2580,
 status: 'returned',
 date: '2026-04-10T13:45:00Z',
 paymentMethod: 'Razorpay Card',
 },
 {
 id: '8',
 orderId: 'ORD-20260416-005',
 customer: 'Amit Joshi',
 phone: '+91 21098 76543',
 address: '33, Camp Area, Pune, MH 411001',
 items: [
 { name: 'Camphor Tablets (Pack of 100)', quantity: 2, price: 199 },
 { name: 'Brass Diya Set (Pack of 6)', quantity: 1, price: 450 },
 ],
 total: 848,
 status: 'pending',
 date: '2026-04-16T11:00:00Z',
 paymentMethod: 'Razorpay UPI',
 },
];

// ─── Helpers ────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
 return new Intl.NumberFormat('en-IN', {
 style: 'currency',
 currency: 'INR',
 maximumFractionDigits: 0,
 }).format(amount);
}

function formatDateTime(dateStr: string): string {
 const d = new Date(dateStr);
 return d.toLocaleDateString('en-IN', {
 day: 'numeric',
 month: 'short',
 year: 'numeric',
 hour: '2-digit',
 minute: '2-digit',
 });
}

function getStatusConfig(status: OrderStatus) {
 const map: Record<OrderStatus, { label: string; cls: string; icon: typeof Clock }> = {
 pending: { label: 'Pending', cls: 'bg-amber-100 text-amber-700', icon: Clock },
 confirmed: { label: 'Confirmed', cls: 'bg-blue-100 text-blue-700', icon: CheckCircle2 },
 shipped: { label: 'Shipped', cls: 'bg-purple-100 text-purple-700', icon: Truck },
 delivered: { label: 'Delivered', cls: 'bg-green-100 text-green-700', icon: CheckCircle2 },
 returned: { label: 'Returned', cls: 'bg-red-100 text-red-700', icon: RotateCcw },
 cancelled: { label: 'Cancelled', cls: 'bg-surface-100 text-surface-600', icon: AlertCircle },
 };
 return map[status];
}

const STATUS_FLOW: Record<string, OrderStatus> = {
 pending: 'confirmed',
 confirmed: 'shipped',
 shipped: 'delivered',
};

const STATUS_ACTION_LABELS: Record<string, string> = {
 pending: 'Confirm Order',
 confirmed: 'Mark Shipped',
 shipped: 'Mark Delivered',
};

// ─── Component ──────────────────────────────────────────────────

export default function StoreAdminOrdersPage() {
 const [orders, setOrders] = useState<Order[]>([]);
 const [search, setSearch] = useState('');
 const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
 const [actionLoading, setActionLoading] = useState<string | null>(null);

 useEffect(() => {
 const stored = localStorage.getItem(STORAGE_KEY);
 if (stored) {
 setOrders(JSON.parse(stored));
 } else {
 setOrders(defaultOrders);
 localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultOrders));
 }
 }, []);

 function persist(updated: Order[]) {
 setOrders(updated);
 localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
 }

 function updateStatus(orderId: string) {
 const order = orders.find((o) => o.id === orderId);
 if (!order) return;

 const nextStatus = STATUS_FLOW[order.status];
 if (!nextStatus) return;

 setActionLoading(orderId);
 setTimeout(() => {
 const updated = orders.map((o) =>
 o.id === orderId ? { ...o, status: nextStatus } : o
 );
 persist(updated);
 setActionLoading(null);
 }, 400);
 }

 function markReturned(orderId: string) {
 setActionLoading(orderId);
 setTimeout(() => {
 const updated = orders.map((o) =>
 o.id === orderId ? { ...o, status: 'returned' as OrderStatus } : o
 );
 persist(updated);
 setActionLoading(null);
 }, 400);
 }

 const filtered = orders.filter((o) => {
 const matchSearch =
 !search ||
 o.customer.toLowerCase().includes(search.toLowerCase()) ||
 o.orderId.toLowerCase().includes(search.toLowerCase());
 const matchStatus = statusFilter === 'all' || o.status === statusFilter;
 return matchSearch && matchStatus;
 });

 const statusTabs: { key: OrderStatus | 'all'; label: string; count: number }[] = [
 { key: 'all', label: 'All', count: orders.length },
 { key: 'pending', label: 'Pending', count: orders.filter((o) => o.status === 'pending').length },
 { key: 'confirmed', label: 'Confirmed', count: orders.filter((o) => o.status === 'confirmed').length },
 { key: 'shipped', label: 'Shipped', count: orders.filter((o) => o.status === 'shipped').length },
 { key: 'delivered', label: 'Delivered', count: orders.filter((o) => o.status === 'delivered').length },
 { key: 'returned', label: 'Returned', count: orders.filter((o) => o.status === 'returned').length },
 ];

 return (
 <div className="space-y-6 max-w-6xl">
 {/* Header */}
 <div>
 <h1 className="text-2xl font-bold text-surface-800">Orders</h1>
 <p className="text-surface-500 mt-1">Manage and fulfill customer orders</p>
 </div>

 {/* Status Tabs */}
 <div className="flex gap-1 overflow-x-auto rounded-xl bg-white p-1 border border-surface-100">
 {statusTabs.map((tab) => (
 <button
 key={tab.key}
 onClick={() => setStatusFilter(tab.key)}
 className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
 statusFilter === tab.key
 ? 'bg-emerald-600 text-white shadow-sm'
 : 'text-surface-600 hover:bg-surface-50'
 }`}
 >
 {tab.label}
 <span
 className={`rounded-full px-2 py-0.5 text-xs font-bold ${
 statusFilter === tab.key ? 'bg-white/20 text-white' : 'bg-surface-100 text-surface-500'
 }`}
 >
 {tab.count}
 </span>
 </button>
 ))}
 </div>

 {/* Search */}
 <div className="relative">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
 <input
 type="text"
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="w-full pl-9 pr-3 py-2.5 bg-white border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300"
 placeholder="Search by customer name or order ID..."
 />
 </div>

 {/* Orders */}
 {filtered.length === 0 ? (
 <div className="flex flex-col items-center justify-center rounded-xl border border-surface-100 bg-white py-16">
 <ShoppingCart className="w-12 h-12 text-surface-300 mb-4" />
 <h3 className="text-lg font-semibold text-surface-700">No orders found</h3>
 <p className="text-sm text-surface-500 mt-1">
 {search || statusFilter !== 'all'
 ? 'Try adjusting your search or filter.'
 : 'No orders received yet.'}
 </p>
 </div>
 ) : (
 <div className="space-y-4">
 {filtered.map((order) => {
 const statusCfg = getStatusConfig(order.status);
 const StatusIcon = statusCfg.icon;
 const nextAction = STATUS_ACTION_LABELS[order.status];

 return (
 <div
 key={order.id}
 className="bg-white rounded-xl border border-surface-100 p-5 hover:border-emerald-200 transition-all"
 >
 <div className="flex flex-col lg:flex-row lg:items-start gap-4">
 {/* Order Info */}
 <div className="flex-1 min-w-0">
 <div className="flex flex-wrap items-center gap-2 mb-2">
 <span className="text-sm font-mono font-semibold text-surface-800">{order.orderId}</span>
 <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full ${statusCfg.cls}`}>
 <StatusIcon className="w-3 h-3" />
 {statusCfg.label}
 </span>
 </div>

 <div className="flex items-center gap-4 text-sm text-surface-500 mb-3">
 <span className="flex items-center gap-1">
 <User className="w-3.5 h-3.5" />
 {order.customer}
 </span>
 <span className="text-xs text-surface-400">{order.phone}</span>
 </div>

 <div className="flex items-start gap-1 text-xs text-surface-400 mb-3">
 <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
 {order.address}
 </div>

 {/* Items */}
 <div className="bg-surface-50 rounded-lg p-3 space-y-1.5">
 {order.items.map((item, idx) => (
 <div key={idx} className="flex items-center justify-between text-sm">
 <span className="text-surface-600">
 {item.name} <span className="text-surface-400">x{item.quantity}</span>
 </span>
 <span className="font-medium text-surface-700">{formatCurrency(item.price * item.quantity)}</span>
 </div>
 ))}
 <div className="flex items-center justify-between text-sm pt-1.5 border-t border-surface-200">
 <span className="font-semibold text-surface-700">Total</span>
 <span className="font-bold text-surface-800">{formatCurrency(order.total)}</span>
 </div>
 </div>

 <div className="flex items-center gap-4 mt-3 text-xs text-surface-400">
 <span>{formatDateTime(order.date)}</span>
 <span>{order.paymentMethod}</span>
 </div>
 </div>

 {/* Actions */}
 <div className="flex flex-row lg:flex-col items-center lg:items-end gap-2 shrink-0">
 {nextAction && (
 <button
 onClick={() => updateStatus(order.id)}
 disabled={!!actionLoading}
 className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
 >
 {actionLoading === order.id ? (
 <Loader2 className="w-3.5 h-3.5 animate-spin" />
 ) : (
 <CheckCircle2 className="w-3.5 h-3.5" />
 )}
 {nextAction}
 </button>
 )}
 {order.status === 'delivered' && (
 <button
 onClick={() => markReturned(order.id)}
 disabled={!!actionLoading}
 className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-600 text-xs font-medium rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
 >
 {actionLoading === order.id ? (
 <Loader2 className="w-3.5 h-3.5 animate-spin" />
 ) : (
 <RotateCcw className="w-3.5 h-3.5" />
 )}
 Mark Returned
 </button>
 )}
 </div>
 </div>
 </div>
 );
 })}
 </div>
 )}
 </div>
 );
}
