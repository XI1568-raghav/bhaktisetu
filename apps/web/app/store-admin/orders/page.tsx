'use client';

import { useState, useEffect, useCallback } from 'react';
import {
 ShoppingCart,
 Clock,
 Truck,
 CheckCircle2,
 AlertCircle,
 RotateCcw,
 Search,
 Loader2,
 User,
 MapPin,
 ChevronDown,
 ChevronUp,
 History,
 X,
} from 'lucide-react';
import { addressText } from '../../../lib/address-text';
import { API_BASE_URL } from '../../../lib/api-config';
import { useAuth } from '../../../lib/auth-context';
import { UserFacingError, serverErrorMessage, serverErrorText, userFacingMessage } from '../../../lib/friendly-error';
import { filterOrders, statusTabCounts } from '../../../lib/store-admin-orders';
import { H1 } from '../../../components/ui/heading-recipe';

// ─── Types ──────────────────────────────────────────────────────

type OrderStatus =
 | 'PENDING'
 | 'CONFIRMED'
 | 'PROCESSING'
 | 'SHIPPED'
 | 'DELIVERED'
 | 'CANCELLED'
 | 'REFUNDED';

const ALL_STATUSES: OrderStatus[] = [
 'PENDING',
 'CONFIRMED',
 'PROCESSING',
 'SHIPPED',
 'DELIVERED',
 'CANCELLED',
 'REFUNDED',
];

interface OrderItem {
 name: string;
 quantity: number;
 price: number;
}

interface StatusHistoryEntry {
 status: OrderStatus;
 changedAt: string;
 changedBy?: string | null;
 note?: string | null;
}

interface Order {
 id: string;
 orderNumber: string;
 customerName: string;
 customerPhone: string;
 shippingAddress: string;
 items: OrderItem[];
 totalAmount: number;
 status: OrderStatus;
 createdAt: string;
 paymentMethod: string;
 statusHistory: StatusHistoryEntry[];
}

// ─── Helpers ────────────────────────────────────────────────────

// Forward order — used to detect "reverse" transitions that need confirm dialog.
const STATUS_RANK: Record<OrderStatus, number> = {
 PENDING: 0,
 CONFIRMED: 1,
 PROCESSING: 2,
 SHIPPED: 3,
 DELIVERED: 4,
 CANCELLED: 5,
 REFUNDED: 6,
};

function isReverseTransition(from: OrderStatus, to: OrderStatus): boolean {
 // Treat CANCELLED/REFUNDED as terminal — moving OUT of either is "reverse".
 if (from === 'CANCELLED' || from === 'REFUNDED') return true;
 // Going backwards through fulfillment chain is reverse.
 const fwd: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
 const fi = fwd.indexOf(from);
 const ti = fwd.indexOf(to);
 return fi >= 0 && ti >= 0 && ti < fi;
}

function formatCurrency(amount: number): string {
 return new Intl.NumberFormat('en-IN', {
   style: 'currency',
   currency: 'INR',
   maximumFractionDigits: 0,
 }).format(amount);
}

function formatDateTime(dateStr: string): string {
 const d = new Date(dateStr);
 if (isNaN(d.getTime())) return dateStr;
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
   PENDING: { label: 'Pending', cls: 'bg-amber-100 text-amber-700', icon: Clock },
   CONFIRMED: { label: 'Confirmed', cls: 'bg-blue-100 text-blue-700', icon: CheckCircle2 },
   PROCESSING: { label: 'Processing', cls: 'bg-indigo-100 text-indigo-700', icon: Clock },
   SHIPPED: { label: 'Shipped', cls: 'bg-purple-100 text-purple-700', icon: Truck },
   DELIVERED: { label: 'Delivered', cls: 'bg-green-100 text-green-700', icon: CheckCircle2 },
   CANCELLED: { label: 'Cancelled', cls: 'bg-red-100 text-red-700', icon: AlertCircle },
   REFUNDED: { label: 'Refunded', cls: 'bg-surface-100 text-surface-600', icon: RotateCcw },
 };
 return map[status];
}

// Tolerant normalizer — backend may return lowercase or different shapes.
function normalizeOrder(raw: any): Order {
 const status = String(raw.status || 'PENDING').toUpperCase() as OrderStatus;
 const itemsSrc = Array.isArray(raw.items) ? raw.items : [];
 const items: OrderItem[] = itemsSrc.map((it: any) => ({
   name: it.name || it.productName || 'Item',
   quantity: Number(it.quantity) || 1,
   price: Number(it.price) || Number(it.unitPrice) || Number(it.priceAtPurchase) || 0,
 }));
 const historySrc = Array.isArray(raw.statusHistory) ? raw.statusHistory : [];
 const statusHistory: StatusHistoryEntry[] = historySrc.map((h: any) => ({
   status: String(h.status || '').toUpperCase() as OrderStatus,
   changedAt: h.changedAt || h.at || h.timestamp || '',
   changedBy: h.changedBy || h.by || null,
   note: h.note || null,
 }));

 return {
   id: String(raw.id),
   orderNumber: raw.orderNumber || raw.orderId || raw.id,
   customerName: raw.customerName || raw.customer || 'Customer',
   customerPhone: raw.customerPhone || raw.phone || '',
   shippingAddress: addressText(raw.shippingAddress || raw.address),
   items,
   totalAmount: Number(raw.totalAmount ?? raw.total) || 0,
   status,
   createdAt: raw.createdAt || raw.date || new Date().toISOString(),
   paymentMethod: raw.paymentMethod || '—',
   statusHistory,
 };
}

// ─── Toast ─────────────────────────────────────────────────────

interface ToastMsg {
 id: number;
 kind: 'success' | 'error';
 text: string;
}

// ─── Component ──────────────────────────────────────────────────

export default function StoreAdminOrdersPage() {
 const { session } = useAuth();
 const [orders, setOrders] = useState<Order[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [search, setSearch] = useState('');
 const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
 const [actionLoading, setActionLoading] = useState<string | null>(null);
 const [expanded, setExpanded] = useState<Record<string, boolean>>({});
 const [toasts, setToasts] = useState<ToastMsg[]>([]);

 // Reverse-transition confirmation modal state.
 const [confirmState, setConfirmState] = useState<{
   order: Order;
   nextStatus: OrderStatus;
   note: string;
   typed: string;
 } | null>(null);

 // Note prompt for forward transitions. Tracking number captured when marking
 // SHIPPED (backend trackingNumber field existed but the UI never collected it,
 // so customers never got a tracking ref).
 const [notePromptState, setNotePromptState] = useState<{
   order: Order;
   nextStatus: OrderStatus;
   note: string;
   trackingNumber?: string;
 } | null>(null);

 const pushToast = useCallback((kind: ToastMsg['kind'], text: string) => {
   const id = Date.now() + Math.random();
   setToasts((t) => [...t, { id, kind, text }]);
   setTimeout(() => {
     setToasts((t) => t.filter((x) => x.id !== id));
   }, 3500);
 }, []);

 const fetchOrders = useCallback(async () => {
   if (!session?.accessToken) return;
   setLoading(true);
   setError(null);
   try {
     const res = await fetch(`${API_BASE_URL}/store/orders`, {
       headers: { Authorization: `Bearer ${session.accessToken}` },
     });
     // RES-09: `Failed to fetch orders (502)` was rendered to the seller.
     if (!res.ok) {
      throw new UserFacingError(
       serverErrorText(await res.text().catch(() => ''), 'We could not load your orders.'),
       res.status,
      );
     }
     const json = await res.json();
     // S-03 (2026-07-09): the store-orders API returns { data: [...] }, not
     // { orders: [...] }. The old parse read json.orders -> always empty.
     const list: any[] = Array.isArray(json)
       ? json
       : Array.isArray(json?.data)
         ? json.data
         : Array.isArray(json?.orders)
           ? json.orders
           : [];
     setOrders(list.map(normalizeOrder));
   } catch (err) {
     setError(userFacingMessage(err, 'We could not load your orders. Please try again.'));
   } finally {
     setLoading(false);
   }
 }, [session?.accessToken]);

 useEffect(() => {
   fetchOrders();
 }, [fetchOrders]);

 async function commitStatusChange(order: Order, nextStatus: OrderStatus, note: string, trackingNumber?: string) {
   if (!session?.accessToken) return;
   setActionLoading(order.id);
   try {
     const res = await fetch(`${API_BASE_URL}/store/orders/${order.id}/status`, {
       method: 'PATCH',
       headers: {
         'Content-Type': 'application/json',
         Authorization: `Bearer ${session.accessToken}`,
       },
       body: JSON.stringify({
         status: nextStatus,
         note: note || undefined,
         ...(trackingNumber ? { trackingNumber } : {}),
       }),
     });
     if (!res.ok) {
       const err = await res.json().catch(() => ({}));
       throw new UserFacingError(
        serverErrorMessage(err, 'We could not update that order.'),
        res.status,
       );
     }
     const updated = normalizeOrder(await res.json());
     setOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)));
     pushToast(
       'success',
       `Order ${order.orderNumber}: ${getStatusConfig(order.status).label} → ${getStatusConfig(nextStatus).label}`,
     );
   } catch (err) {
     pushToast('error', userFacingMessage(err, 'We could not update that order. Please try again.'));
   } finally {
     setActionLoading(null);
   }
 }

 function requestStatusChange(order: Order, nextStatus: OrderStatus) {
   if (nextStatus === order.status) return;
   if (isReverseTransition(order.status, nextStatus)) {
     setConfirmState({ order, nextStatus, note: '', typed: '' });
   } else {
     setNotePromptState({ order, nextStatus, note: '' });
   }
 }

 // LC-16: the rows and the tab badges are derived from ONE search predicate.
 // They used to be two — the rows applied the search box, the badges did not —
 // so with a search active a tab could read 5 and render 2.
 const filtered = filterOrders(orders, search, statusFilter);
 const tabCounts = statusTabCounts(orders, search, ALL_STATUSES);

 const statusTabs: { key: OrderStatus | 'all'; label: string; count: number }[] = [
   { key: 'all', label: 'All', count: tabCounts.all ?? 0 },
   ...ALL_STATUSES.map((s) => ({
     key: s,
     label: getStatusConfig(s).label,
     count: tabCounts[s] ?? 0,
   })),
 ];

 return (
   <div className="space-y-6 max-w-6xl">
     {/* Header */}
     <div>
       <h1 className={H1.portal}>Orders</h1>
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
               ? 'bg-emerald-700 text-white shadow-sm'
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
         placeholder="Search by customer name or order number..."
       />
     </div>

     {loading ? (
       <div className="flex items-center justify-center py-20">
         <Loader2 className="w-8 h-8 animate-spin text-saffron-500" />
         <span className="ml-3 text-surface-500">Loading orders...</span>
       </div>
     ) : error ? (
       <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 flex items-center justify-between">
         <span>{error}</span>
         <button
           onClick={fetchOrders}
           className="px-3 py-1 rounded-md bg-red-600 text-white text-xs font-medium hover:bg-red-700"
         >
           Retry
         </button>
       </div>
     ) : filtered.length === 0 ? (
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
           const isExpanded = !!expanded[order.id];

           return (
             <div
               key={order.id}
               className="bg-white rounded-xl border border-surface-100 p-5 hover:border-emerald-200 transition-all"
             >
               <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                 {/* Order Info */}
                 <div className="flex-1 min-w-0">
                   <div className="flex flex-wrap items-center gap-2 mb-2">
                     <span className="text-sm font-mono font-semibold text-surface-800">{order.orderNumber}</span>
                     <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full ${statusCfg.cls}`}>
                       <StatusIcon className="w-3 h-3" />
                       {statusCfg.label}
                     </span>
                   </div>

                   <div className="flex items-center gap-4 text-sm text-surface-500 mb-3">
                     <span className="flex items-center gap-1">
                       <User className="w-3.5 h-3.5" />
                       {order.customerName}
                     </span>
                     {order.customerPhone && (
                       <span className="text-xs text-surface-400">{order.customerPhone}</span>
                     )}
                   </div>

                   {order.shippingAddress && (
                     <div className="flex items-start gap-1 text-xs text-surface-400 mb-3">
                       <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                       {order.shippingAddress}
                     </div>
                   )}

                   {/* Items */}
                   {order.items.length > 0 && (
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
                         <span className="font-bold text-surface-800">{formatCurrency(order.totalAmount)}</span>
                       </div>
                     </div>
                   )}

                   <div className="flex items-center gap-4 mt-3 text-xs text-surface-400">
                     <span>{formatDateTime(order.createdAt)}</span>
                     {order.paymentMethod && <span>{order.paymentMethod}</span>}
                   </div>

                   {/* Status history toggle */}
                   <button
                     type="button"
                     onClick={() =>
                       setExpanded((e) => ({ ...e, [order.id]: !e[order.id] }))
                     }
                     className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-surface-600 hover:text-emerald-700"
                   >
                     <History className="w-3.5 h-3.5" />
                     Status history ({order.statusHistory.length})
                     {isExpanded ? (
                       <ChevronUp className="w-3.5 h-3.5" />
                     ) : (
                       <ChevronDown className="w-3.5 h-3.5" />
                     )}
                   </button>

                   {isExpanded && (
                     <ol className="mt-3 border-l-2 border-emerald-100 ml-1.5 space-y-3">
                       {order.statusHistory.length === 0 ? (
                         <li className="text-xs text-surface-400 pl-4">
                           No history recorded yet.
                         </li>
                       ) : (
                         [...order.statusHistory]
                           .sort(
                             (a, b) =>
                               new Date(a.changedAt).getTime() -
                               new Date(b.changedAt).getTime(),
                           )
                           .map((h, idx) => {
                             const cfg = getStatusConfig(h.status);
                             return (
                               <li key={idx} className="pl-4 relative">
                                 <span className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
                                 <div className="flex items-center gap-2">
                                   <span
                                     className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.cls}`}
                                   >
                                     {cfg.label}
                                   </span>
                                   <span className="text-xs text-surface-400">
                                     {formatDateTime(h.changedAt)}
                                   </span>
                                 </div>
                                 {h.changedBy && (
                                   <div className="text-xs text-surface-500 mt-0.5">
                                     by {h.changedBy}
                                   </div>
                                 )}
                                 {h.note && (
                                   <div className="text-xs text-surface-600 mt-0.5 italic">
                                     “{h.note}”
                                   </div>
                                 )}
                               </li>
                             );
                           })
                       )}
                     </ol>
                   )}
                 </div>

                 {/* Actions: any-status dropdown */}
                 <div className="flex flex-col items-stretch gap-2 shrink-0 lg:w-56">
                   <label className="text-xs font-medium text-surface-500">
                     Change status
                   </label>
                   <select
                     value={order.status}
                     disabled={actionLoading === order.id}
                     onChange={(e) =>
                       requestStatusChange(order, e.target.value as OrderStatus)
                     }
                     className="px-3 py-2 bg-white border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-saffron-200 focus:border-saffron-300 disabled:opacity-50"
                   >
                     {ALL_STATUSES.map((s) => (
                       <option key={s} value={s}>
                         {getStatusConfig(s).label}
                       </option>
                     ))}
                   </select>
                   {actionLoading === order.id && (
                     <span className="inline-flex items-center gap-1.5 text-xs text-surface-500">
                       <Loader2 className="w-3.5 h-3.5 animate-spin" />
                       Updating…
                     </span>
                   )}
                 </div>
               </div>
             </div>
           );
         })}
       </div>
     )}

     {/* Note prompt (forward transitions) */}
     {notePromptState && (
       <Modal
         title={`Update to ${getStatusConfig(notePromptState.nextStatus).label}`}
         onClose={() => setNotePromptState(null)}
       >
         <p className="text-sm text-surface-600 mb-3">
           Order <span className="font-mono">{notePromptState.order.orderNumber}</span>:
           <span className="ml-1">
             {getStatusConfig(notePromptState.order.status).label} →{' '}
             {getStatusConfig(notePromptState.nextStatus).label}
           </span>
         </p>
         <label className="text-xs font-medium text-surface-500">
           Reason / note (optional)
         </label>
         <textarea
           value={notePromptState.note}
           onChange={(e) =>
             setNotePromptState({ ...notePromptState, note: e.target.value })
           }
           rows={3}
           className="w-full mt-1 px-3 py-2 bg-white border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-saffron-200 focus:border-saffron-300"
           placeholder="e.g. Packed and handed to courier"
         />
         {notePromptState.nextStatus === 'SHIPPED' && (
           <>
             <label className="text-xs font-medium text-surface-500 mt-3 block">
               Tracking number (courier AWB)
             </label>
             <input
               type="text"
               value={notePromptState.trackingNumber ?? ''}
               onChange={(e) =>
                 setNotePromptState({ ...notePromptState, trackingNumber: e.target.value })
               }
               className="w-full mt-1 px-3 py-2 bg-white border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-saffron-200 focus:border-saffron-300"
               placeholder="e.g. SR123456789IN"
             />
           </>
         )}
         <div className="flex justify-end gap-2 mt-4">
           <button
             type="button"
             onClick={() => setNotePromptState(null)}
             className="px-4 py-2 rounded-lg text-sm font-medium text-surface-600 hover:bg-surface-50"
           >
             Cancel
           </button>
           <button
             type="button"
             onClick={() => {
               const s = notePromptState;
               setNotePromptState(null);
               commitStatusChange(s.order, s.nextStatus, s.note, s.trackingNumber);
             }}
             className="px-4 py-2 rounded-lg text-sm font-medium bg-saffron-600 text-white hover:bg-saffron-700"
           >
             Confirm
           </button>
         </div>
       </Modal>
     )}

     {/* Reverse-transition confirm with order-number guard */}
     {confirmState && (
       <Modal
         title="Confirm reverse status change"
         onClose={() => setConfirmState(null)}
       >
         <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700 mb-3">
           You are reversing a status. This is recorded in history. Type the order
           number to confirm.
         </div>
         <p className="text-sm text-surface-600 mb-3">
           <span className="font-mono">{confirmState.order.orderNumber}</span>:
           <span className="ml-1 font-medium">
             {getStatusConfig(confirmState.order.status).label} →{' '}
             {getStatusConfig(confirmState.nextStatus).label}
           </span>
         </p>
         <label className="text-xs font-medium text-surface-500">
           Reason (required)
         </label>
         <textarea
           value={confirmState.note}
           onChange={(e) => setConfirmState({ ...confirmState, note: e.target.value })}
           rows={3}
           className="w-full mt-1 mb-3 px-3 py-2 bg-white border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-saffron-200 focus:border-saffron-300"
           placeholder="Why is this being reverted?"
         />
         <label className="text-xs font-medium text-surface-500">
           Type{' '}
           <span className="font-mono text-surface-700">
             {confirmState.order.orderNumber}
           </span>{' '}
           to confirm
         </label>
         <input
           type="text"
           value={confirmState.typed}
           onChange={(e) => setConfirmState({ ...confirmState, typed: e.target.value })}
           className="w-full mt-1 px-3 py-2 bg-white border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300 font-mono"
           placeholder={confirmState.order.orderNumber}
         />
         <div className="flex justify-end gap-2 mt-4">
           <button
             type="button"
             onClick={() => setConfirmState(null)}
             className="px-4 py-2 rounded-lg text-sm font-medium text-surface-600 hover:bg-surface-50"
           >
             Cancel
           </button>
           <button
             type="button"
             disabled={
               confirmState.typed.trim() !== confirmState.order.orderNumber ||
               !confirmState.note.trim()
             }
             onClick={() => {
               const s = confirmState;
               setConfirmState(null);
               commitStatusChange(s.order, s.nextStatus, s.note);
             }}
             className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
           >
             Revert status
           </button>
         </div>
       </Modal>
     )}

     {/* Toasts */}
     <div className="fixed bottom-6 right-6 z-50 space-y-2">
       {toasts.map((t) => (
         <div
           key={t.id}
           className={`px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
             t.kind === 'success'
               ? 'bg-emerald-700 text-white'
               : 'bg-red-600 text-white'
           }`}
         >
           {t.text}
         </div>
       ))}
     </div>
   </div>
 );
}

// ─── Modal ──────────────────────────────────────────────────────

function Modal({
 title,
 onClose,
 children,
}: {
 title: string;
 onClose: () => void;
 children: React.ReactNode;
}) {
 return (
   <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
     <div className="bg-white rounded-xl border border-surface-100 w-full max-w-md p-5 shadow-xl">
       <div className="flex items-center justify-between mb-3">
         <h3 className="font-semibold text-surface-800">{title}</h3>
         <button
           type="button"
           onClick={onClose}
           className="text-surface-400 hover:text-surface-600"
         >
           <X className="w-4 h-4" />
         </button>
       </div>
       {children}
     </div>
   </div>
 );
}
