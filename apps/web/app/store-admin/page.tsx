'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import MyProviderProfileCard from '../../components/MyProviderProfileCard';
import { API_BASE_URL } from '../../lib/api-config';
import { useAuth } from '../../lib/auth-context';
import { userFacingMessage } from '../../lib/friendly-error';
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
 Loader2,
} from 'lucide-react';
import { H1 } from '../../components/ui/heading-recipe';

// ─── Types ─────────────────────────────────────────────────────

type StoreOrderStatus =
 | 'PENDING'
 | 'CONFIRMED'
 | 'PROCESSING'
 | 'SHIPPED'
 | 'DELIVERED'
 | 'CANCELLED'
 | 'REFUNDED';

interface StoreOrderApi {
 id: string;
 orderNumber?: string;
 customerName?: string;
 customerPhone?: string;
 itemsSummary?: string;
 totalAmount: number;
 status: StoreOrderStatus;
 createdAt: string;
}

interface DashboardData {
 revenue: { total: number; thisMonth: number; pending: number; onlineYear?: number; codYear?: number };
 products: { total: number; active: number; outOfStock: number };
 orders: {
   total: number;
   pending: number;
   shipped: number;
   delivered: number;
 };
 recentOrders: Array<{
   id: string;
   customer: string;
   items: string;
   total: number;
   status: string;
   date: string;
 }>;
 topProducts: Array<{ name: string; sold: number; revenue: number; rating: number }>;
}

// ─── Fallback (used only if API call errors) ──────────────────

const fallbackData: DashboardData = {
 revenue: { total: 0, thisMonth: 0, pending: 0 },
 products: { total: 0, active: 0, outOfStock: 0 },
 orders: { total: 0, pending: 0, shipped: 0, delivered: 0 },
 recentOrders: [],
 topProducts: [],
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
 const key = status.toLowerCase();
 const map: Record<string, { label: string; cls: string; icon: typeof Clock }> = {
   pending: { label: 'Pending', cls: 'bg-amber-100 text-amber-700', icon: Clock },
   confirmed: { label: 'Confirmed', cls: 'bg-blue-100 text-blue-700', icon: CheckCircle2 },
   processing: { label: 'Processing', cls: 'bg-indigo-100 text-indigo-700', icon: Clock },
   shipped: { label: 'Shipped', cls: 'bg-purple-100 text-purple-700', icon: TrendingUp },
   delivered: { label: 'Delivered', cls: 'bg-green-100 text-green-700', icon: CheckCircle2 },
   cancelled: { label: 'Cancelled', cls: 'bg-red-100 text-red-700', icon: AlertCircle },
   refunded: { label: 'Refunded', cls: 'bg-surface-100 text-surface-600', icon: AlertCircle },
 };
 return map[key] || { label: status, cls: 'bg-surface-100 text-surface-600', icon: Clock };
}

function thisMonthStart(): Date {
 const d = new Date();
 return new Date(d.getFullYear(), d.getMonth(), 1);
}

// Compute aggregated dashboard data from a flat list of orders.
// Used because no dedicated `/admin/revenue?source=store` endpoint exists yet —
// we fetch the order list and reduce client-side. Top-products + product
// counts come from the products endpoint.
function aggregateFromOrders(orders: StoreOrderApi[]): DashboardData['revenue'] & {
 orders: DashboardData['orders'];
 recent: DashboardData['recentOrders'];
} {
 let total = 0;
 let thisMonth = 0;
 let pending = 0;
 let pendingCount = 0;
 let shippedCount = 0;
 let deliveredCount = 0;
 const monthStart = thisMonthStart();

 for (const o of orders) {
   const amt = Number(o.totalAmount) || 0;
   if (o.status === 'DELIVERED') {
     total += amt;
     if (new Date(o.createdAt) >= monthStart) thisMonth += amt;
   }
   // "Pending payout" — money for orders received but not yet delivered
   if (
     o.status === 'PENDING' ||
     o.status === 'CONFIRMED' ||
     o.status === 'PROCESSING' ||
     o.status === 'SHIPPED'
   ) {
     pending += amt;
   }
   if (o.status === 'PENDING') pendingCount += 1;
   if (o.status === 'SHIPPED') shippedCount += 1;
   if (o.status === 'DELIVERED') deliveredCount += 1;
 }

 const recent = [...orders]
   .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
   .slice(0, 5)
   .map((o) => ({
     id: o.orderNumber || o.id,
     customer: o.customerName || 'Customer',
     items: o.itemsSummary || '—',
     total: Number(o.totalAmount) || 0,
     status: o.status.toLowerCase(),
     date: new Date(o.createdAt).toISOString().slice(0, 10),
   }));

 return {
   total,
   thisMonth,
   pending,
   orders: {
     total: orders.length,
     pending: pendingCount,
     shipped: shippedCount,
     delivered: deliveredCount,
   },
   recent,
 };
}

// ─── Component ─────────────────────────────────────────────────

export default function StoreAdminDashboard() {
 const { session } = useAuth();
 const [data, setData] = useState<DashboardData>(fallbackData);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);

 useEffect(() => {
   if (!session?.accessToken) return;

   const headers = { Authorization: `Bearer ${session.accessToken}` };
   let cancelled = false;

   async function load() {
     setLoading(true);
     setError(null);
     try {
       // Phase B Store P0-3 fix (2026-06-08): prefer server-aggregated
       // /store-admin/revenue (scales past 100 orders) over client reduce.
       // Falls back to /admin/revenue then client aggregation if both miss.
       // Latency: the three reads do not depend on each other, so all three go out
       // now (they used to run one after another, ~3 round trips of waiting on top
       // of each one's own work). Each is still handled exactly as before below.
       const revenueFetch = fetch(`${API_BASE_URL}/store-admin/revenue`, { headers });
       const ordersFetch = fetch(`${API_BASE_URL}/store/orders`, { headers });
       const productsFetch = fetch(`${API_BASE_URL}/store-admin/products`, { headers });
       revenueFetch.catch(() => undefined);
       ordersFetch.catch(() => undefined);
       productsFetch.catch(() => undefined);
       let revenue: DashboardData['revenue'] | null = null;
       let serverTopProducts: DashboardData['topProducts'] | null = null;
       try {
         const rev = await revenueFetch;
         if (rev.ok) {
           const j = await rev.json();
           if (j?.totals) {
             revenue = {
               total: Number(j.totals.yearInr) || 0,
               thisMonth: Number(j.totals.monthInr) || 0,
               pending: 0,
               onlineYear: j.onlinePaid ? Number(j.onlinePaid.yearInr) || 0 : undefined,
               codYear: j.cashOnDelivery ? Number(j.cashOnDelivery.yearInr) || 0 : undefined,
             };
           }
           if (Array.isArray(j?.topProducts)) {
             serverTopProducts = j.topProducts.map((p: { name: string; sold?: number; revenueInr?: number; rating?: number }) => ({
               name: p.name,
               sold: Number(p.sold) || 0,
               revenue: Number(p.revenueInr) || 0,
               rating: Number(p.rating) || 0,
             }));
           }
         }
       } catch {
         /* fall through to legacy /admin/revenue */
       }
       if (!revenue) {
         try {
           const rev = await fetch(`${API_BASE_URL}/admin/revenue?source=store`, { headers });
           if (rev.ok) {
             const j = await rev.json();
             revenue = {
               total: Number(j.total) || 0,
               thisMonth: Number(j.thisMonth) || 0,
               pending: Number(j.pending) || 0,
             };
           }
         } catch {
           /* fall through to client aggregate */
         }
       }

       const ordersRes = await ordersFetch;
       if (!ordersRes.ok) throw new Error(`Orders ${ordersRes.status}`);
       const ordersJson = await ordersRes.json();
       // GET /store/orders answers { data: [...] } with totalAmountInr / UPPERCASE status;
       // this used to read only a bare array or `.orders`, so the dashboard showed 0 orders.
       const rawOrders: any[] = Array.isArray(ordersJson)
         ? ordersJson
         : Array.isArray(ordersJson?.data)
           ? ordersJson.data
           : Array.isArray(ordersJson?.orders)
             ? ordersJson.orders
             : [];
       const orders: StoreOrderApi[] = rawOrders.map((o) => ({
         ...o,
         totalAmount: Number(o.totalAmount ?? o.totalAmountInr) || 0,
         status: String(o.status ?? 'PENDING').toUpperCase() as StoreOrderStatus,
         customerName: o.customerName ?? o.shippingAddress?.fullName,
         itemsSummary:
           o.itemsSummary ??
           (Array.isArray(o.items)
             ? o.items.map((i: any) => `${i.name ?? 'Item'} x${i.quantity ?? i.qty ?? 1}`).join(', ')
             : undefined),
       }));

       const agg = aggregateFromOrders(orders);

       // Products summary — best-effort. If unavailable, leave zeros.
       let productsSummary = { total: 0, active: 0, outOfStock: 0 };
       let topProducts: DashboardData['topProducts'] = [];
       try {
         // P0 #S-06 (2026-07-09): pull from the owner-scoped /store-admin/products
         // endpoint (the owner's own inventory), NOT the public /store/products
         // catalog — the old call reported catalog totals, not the owner's
         // stock, so Total/Active/Out-of-stock were wrong for multi-vendor.
         const pRes = await productsFetch;
         if (pRes.ok) {
           const pJson = await pRes.json();
           const list: Array<{
             name: string;
             stock?: number;
             isActive?: boolean;
             soldCount?: number;
             revenue?: number;
             rating?: number;
           }> = Array.isArray(pJson)
             ? pJson
             : Array.isArray(pJson?.products)
               ? pJson.products
               : [];
           productsSummary = {
             total: list.length,
             active: list.filter((p) => p.isActive !== false).length,
             outOfStock: list.filter((p) => (p.stock ?? 0) <= 0).length,
           };
           // Only fall back to client product-list aggregation if server endpoint did not return topProducts.
           if (!serverTopProducts || serverTopProducts.length === 0) {
             topProducts = list
               .filter((p) => (p.soldCount ?? 0) > 0)
               .sort((a, b) => (b.soldCount ?? 0) - (a.soldCount ?? 0))
               .slice(0, 4)
               .map((p) => ({
                 name: p.name,
                 sold: p.soldCount ?? 0,
                 revenue: p.revenue ?? 0,
                 rating: p.rating ?? 0,
               }));
           } else {
             topProducts = serverTopProducts;
           }
         }
       } catch {
         /* skip products section */
       }

       if (cancelled) return;

       setData({
         revenue: revenue ?? { total: agg.total, thisMonth: agg.thisMonth, pending: agg.pending },
         products: productsSummary,
         orders: agg.orders,
         recentOrders: agg.recent,
         topProducts,
       });
     } catch (err) {
       if (cancelled) return;
       setError(userFacingMessage(err, 'We could not load your dashboard. Please try again.'));
       setData(fallbackData);
     } finally {
       if (!cancelled) setLoading(false);
     }
   }

   load();
   return () => {
     cancelled = true;
   };
 }, [session?.accessToken]);

 if (loading) {
   // Same outer shape (and the profile card in the same slot) as the loaded view
   // below, so the card mounts now and fetches while the figures load, instead of
   // starting its own request only after everything else has finished.
   return (
     <div className="space-y-6 max-w-5xl">
       <div>
         <h1 className={H1.portal}>
           Store Dashboard
         </h1>
         <p className="text-surface-500 mt-1">
           Manage your products, orders, and revenue.
         </p>
       </div>

       {null}

       <MyProviderProfileCard role="STORE_OWNER" onboardingSlug="store_owner" publicListingType={null} />

       <div className="flex items-center justify-center py-20">
         <Loader2 className="w-8 h-8 animate-spin text-saffron-500" />
         <span className="ml-3 text-surface-500">Loading dashboard...</span>
       </div>
     </div>
   );
 }

 const revenueCards = [
   {
     label: 'Total Sales (this year)',
     sub:
       data.revenue.onlineYear !== undefined && data.revenue.codYear !== undefined
         ? `Online-paid ${formatCurrency(data.revenue.onlineYear)} · Cash on delivery (collected by you) ${formatCurrency(data.revenue.codYear)}`
         : undefined,
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
       <h1 className={H1.portal}>
         Store Dashboard
       </h1>
       <p className="text-surface-500 mt-1">
         Manage your products, orders, and revenue.
       </p>
     </div>

     {error && (
       <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
         Couldn’t load live dashboard data ({error}). Showing zeros — refresh to retry.
       </div>
     )}

     <MyProviderProfileCard role="STORE_OWNER" onboardingSlug="store_owner" publicListingType={null} />

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
             {'sub' in card && card.sub && <p className="text-xs text-surface-500 mt-1">{card.sub}</p>}
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
             <p className="text-xs text-surface-400">{card.sub}</p>
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
           {data.recentOrders.length === 0 ? (
             <div className="px-5 py-10 text-center text-sm text-surface-400">
               No orders yet.
             </div>
           ) : (
             data.recentOrders.map((order) => {
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
             })
           )}
         </div>
       </div>

       {/* Top Products */}
       <div className="bg-white rounded-xl border border-surface-100">
         <div className="px-5 py-4 border-b border-surface-100">
           <h2 className="font-semibold text-surface-800">Top Products</h2>
         </div>
         <div className="divide-y divide-surface-50">
           {data.topProducts.length === 0 ? (
             <div className="px-5 py-10 text-center text-sm text-surface-400">
               No sales data yet.
             </div>
           ) : (
             data.topProducts.map((product) => (
               <div key={product.name} className="px-5 py-3">
                 <div className="flex items-center justify-between mb-1">
                   <h3 className="text-sm font-medium text-surface-800">{product.name}</h3>
                   {product.rating > 0 && (
                     <div className="flex items-center gap-0.5 text-xs text-amber-600">
                       <Star className="w-3 h-3 fill-current" />
                       {product.rating}
                     </div>
                   )}
                 </div>
                 <div className="flex items-center justify-between text-xs text-surface-500">
                   <span>{product.sold} sold</span>
                   <span className="font-medium text-surface-700">{formatCurrency(product.revenue)}</span>
                 </div>
               </div>
             ))
           )}
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
