'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
 IndianRupee,
 TrendingUp,
 Package,
 ShoppingCart,
 ArrowRight,
 Clock,
 CheckCircle2,
 AlertCircle,
 Star,
 Eye,
} from 'lucide-react';

// ─── Mock Data ─────────────────────────────────────────────────

const dashboardData = {
 revenue: {
 total: 342500,
 thisMonth: 48200,
 pending: 12600,
 },
 products: {
 total: 45,
 active: 38,
 outOfStock: 7,
 },
 orders: {
 total: 312,
 pending: 8,
 shipped: 15,
 delivered: 289,
 },
 recentOrders: [
 {
 id: 'ORD-20260415-001',
 customer: 'Priya Mehta',
 items: 'Brass Diya Set (x2), Agarbatti Box',
 total: 1450,
 status: 'pending',
 date: '2026-04-15',
 },
 {
 id: 'ORD-20260414-042',
 customer: 'Rajesh Kumar',
 items: 'Rudraksha Mala, Puja Thali Set',
 total: 2890,
 status: 'shipped',
 date: '2026-04-14',
 },
 {
 id: 'ORD-20260413-089',
 customer: 'Anita Singh',
 items: 'Kumkum & Haldi Set, Camphor Pack',
 total: 580,
 status: 'delivered',
 date: '2026-04-13',
 },
 {
 id: 'ORD-20260412-112',
 customer: 'Deepak Verma',
 items: 'Silver Ganesh Idol',
 total: 4500,
 status: 'delivered',
 date: '2026-04-12',
 },
 {
 id: 'ORD-20260411-156',
 customer: 'Sunita Devi',
 items: 'Chandan Paste, Flowers Pack, Coconut',
 total: 750,
 status: 'delivered',
 date: '2026-04-11',
 },
 ],
 topProducts: [
 { name: 'Brass Diya Set', sold: 156, revenue: 23400, rating: 4.8 },
 { name: 'Rudraksha Mala', sold: 89, revenue: 44500, rating: 4.9 },
 { name: 'Puja Thali Complete Set', sold: 67, revenue: 33500, rating: 4.7 },
 { name: 'Premium Agarbatti Box', sold: 234, revenue: 11700, rating: 4.5 },
 ],
};

// ─── Helpers ───────────────────────────────────────────────────

function formatCurrency(amount: number): string {
 return new Intl.NumberFormat('en-IN', {
 style: 'currency',
 currency: 'INR',
 maximumFractionDigits: 0,
 }).format(amount);
}

function getOrderStatusBadge(status: string) {
 const map: Record<string, { label: string; cls: string; icon: typeof Clock }> = {
 pending: { label: 'Pending', cls: 'bg-amber-100 text-amber-700', icon: Clock },
 shipped: { label: 'Shipped', cls: 'bg-blue-100 text-blue-700', icon: TrendingUp },
 delivered: { label: 'Delivered', cls: 'bg-green-100 text-green-700', icon: CheckCircle2 },
 cancelled: { label: 'Cancelled', cls: 'bg-red-100 text-red-700', icon: AlertCircle },
 };
 return map[status] || { label: status, cls: 'bg-surface-100 text-surface-600', icon: Clock };
}

// ─── Component ─────────────────────────────────────────────────

export default function StoreAdminDashboard() {
 const data = dashboardData;

 const revenueCards = [
 {
 label: 'Total Revenue',
 value: formatCurrency(data.revenue.total),
 icon: IndianRupee,
 color: 'text-emerald-600',
 bg: 'bg-emerald-50',
 },
 {
 label: 'This Month',
 value: formatCurrency(data.revenue.thisMonth),
 icon: TrendingUp,
 color: 'text-saffron-600',
 bg: 'bg-saffron-50',
 },
 {
 label: 'Pending Payout',
 value: formatCurrency(data.revenue.pending),
 icon: Clock,
 color: 'text-amber-600',
 bg: 'bg-amber-50',
 },
 ];

 const statCards = [
 { label: 'Total Products', value: data.products.total, sub: `${data.products.active} active`, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
 { label: 'Total Orders', value: data.orders.total, sub: `${data.orders.pending} pending`, icon: ShoppingCart, color: 'text-emerald-600', bg: 'bg-emerald-50' },
 { label: 'Out of Stock', value: data.products.outOfStock, sub: 'items', icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50' },
 { label: 'Shipped', value: data.orders.shipped, sub: 'in transit', icon: TrendingUp, color: 'text-saffron-600', bg: 'bg-saffron-50' },
 ];

 return (
 <div className="space-y-6 max-w-5xl">
 {/* Welcome */}
 <div>
 <h1 className="text-2xl font-semibold tracking-tight text-surface-800">
 Store Dashboard
 </h1>
 <p className="text-surface-500 mt-1">
 Manage your products, orders, and revenue.
 </p>
 </div>

 {/* Revenue Cards */}
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
 {revenueCards.map((card) => {
 const Icon = card.icon;
 return (
 <div
 key={card.label}
 className="bg-white rounded-xl border border-surface-100 p-5 hover:shadow-md transition-shadow"
 >
 <div className="flex items-center gap-3 mb-3">
 <div className={`w-10 h-10 ${card.bg} rounded-lg flex items-center justify-center`}>
 <Icon className={`w-5 h-5 ${card.color}`} />
 </div>
 <span className="text-sm text-surface-500">{card.label}</span>
 </div>
 <p className="text-lg font-semibold text-surface-800">{card.value}</p>
 </div>
 );
 })}
 </div>

 {/* Quick Stats */}
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
 {statCards.map((card) => {
 const Icon = card.icon;
 return (
 <div
 key={card.label}
 className="bg-white rounded-xl border border-surface-100 p-4 text-center"
 >
 <div className={`w-10 h-10 ${card.bg} rounded-lg flex items-center justify-center mx-auto mb-2`}>
 <Icon className={`w-5 h-5 ${card.color}`} />
 </div>
 <p className="text-xl font-bold text-surface-800">{card.value}</p>
 <p className="text-xs text-surface-500 mt-0.5">{card.label}</p>
 <p className="text-[10px] text-surface-400">{card.sub}</p>
 </div>
 );
 })}
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 {/* Recent Orders */}
 <div className="lg:col-span-2 bg-white rounded-xl border border-surface-100">
 <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
 <h2 className="font-semibold text-surface-800">Recent Orders</h2>
 <Link
 href="/store-admin/orders"
 className="text-sm text-emerald-600 hover:text-emerald-700 font-medium inline-flex items-center gap-1"
 >
 View All <ArrowRight className="w-3.5 h-3.5" />
 </Link>
 </div>

 <div className="divide-y divide-surface-50">
 {data.recentOrders.map((order) => {
 const badge = getOrderStatusBadge(order.status);
 return (
 <Link
 key={order.id}
 href="/store-admin/orders"
 className="flex items-center gap-4 px-5 py-4 hover:bg-surface-50 transition-colors"
 >
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 mb-0.5">
 <h3 className="text-sm font-semibold text-surface-800 truncate">
 {order.customer}
 </h3>
 <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.cls}`}>
 {badge.label}
 </span>
 </div>
 <p className="text-xs text-surface-500 truncate">{order.items}</p>
 <p className="text-xs text-surface-400 mt-0.5">{order.id} &middot; {order.date}</p>
 </div>
 <div className="text-right shrink-0">
 <p className="text-sm font-bold text-surface-800">
 {formatCurrency(order.total)}
 </p>
 </div>
 </Link>
 );
 })}
 </div>
 </div>

 {/* Top Products */}
 <div className="bg-white rounded-xl border border-surface-100">
 <div className="px-5 py-4 border-b border-surface-100">
 <h2 className="font-semibold text-surface-800">Top Products</h2>
 </div>
 <div className="divide-y divide-surface-50">
 {data.topProducts.map((product) => (
 <div key={product.name} className="px-5 py-3">
 <div className="flex items-center justify-between mb-1">
 <h3 className="text-sm font-medium text-surface-800">{product.name}</h3>
 <div className="flex items-center gap-0.5 text-xs text-amber-600">
 <Star className="w-3 h-3 fill-current" />
 {product.rating}
 </div>
 </div>
 <div className="flex items-center justify-between text-xs text-surface-500">
 <span>{product.sold} sold</span>
 <span className="font-medium text-surface-700">{formatCurrency(product.revenue)}</span>
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>

 {/* Quick Actions */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <Link
 href="/store-admin/products"
 className="flex items-center gap-4 bg-white rounded-xl border border-surface-100 p-5 hover:shadow-md transition-shadow group"
 >
 <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
 <Package className="w-6 h-6 text-emerald-600" />
 </div>
 <div>
 <h3 className="font-semibold text-surface-800">Manage Products</h3>
 <p className="text-sm text-surface-500">Add, edit, or remove products</p>
 </div>
 <ArrowRight className="w-5 h-5 text-surface-300 ml-auto" />
 </Link>

 <Link
 href="/store-admin/orders"
 className="flex items-center gap-4 bg-white rounded-xl border border-surface-100 p-5 hover:shadow-md transition-shadow group"
 >
 <div className="w-12 h-12 bg-saffron-50 rounded-xl flex items-center justify-center group-hover:bg-saffron-100 transition-colors">
 <ShoppingCart className="w-6 h-6 text-saffron-600" />
 </div>
 <div>
 <h3 className="font-semibold text-surface-800">Process Orders</h3>
 <p className="text-sm text-surface-500">View and fulfill pending orders</p>
 </div>
 <ArrowRight className="w-5 h-5 text-surface-300 ml-auto" />
 </Link>
 </div>
 </div>
 );
}
