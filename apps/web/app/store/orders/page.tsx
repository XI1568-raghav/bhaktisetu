'use client';

/**
 * COM-09 (prod sweep 2026-08-12): store buyers had nowhere to see their orders.
 * GET /api/v1/store/orders was called from exactly two places in the web app,
 * both under /store-admin (the SELLER's view). The checkout success screen's
 * "View My Orders" CTA pointed at /bookings, which has no store orders; and
 * /store/orders itself fell into the /store/[handle] catch-all and rendered
 * "The product you are looking for does not exist". After paying, a customer
 * could never look their order up again — no status, no tracking number, no
 * invoice — while the seller side had a full status machine and a tracking
 * field whose output the buyer could not see.
 *
 * This page is a static route segment, so it wins over the sibling
 * `[handle]` dynamic segment and no longer redirects into the product shim.
 *
 * Nothing is fabricated here: no fixture orders, no invented order numbers.
 * Empty means empty and a failed fetch says so.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  Package,
  Truck,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  ShoppingBag,
  AlertCircle,
} from 'lucide-react';
import AuthGuard from '../../../components/AuthGuard';
import { useAuth } from '../../../lib/auth-context';
import { API_BASE_URL } from '../../../lib/api-config';
import { friendlyApiError } from '../../../lib/friendly-error';
import ReauthPrompt from '../../../components/ReauthPrompt';
import { buttonClass } from '../../../components/ui/button-recipe';
import { H1 } from '../../../components/ui/heading-recipe';
import {
  canCancelStoreOrder,
  courierFromHistory,
  describeStoreCancelError,
  describeStoreCancelled,
  storeCancelBlockedReason,
  storeCancelConfirmText,
  storeRefundState,
  type OrderHistoryEntry,
} from '../../../lib/store-order-cancel';

interface OrderItem {
  productId: string;
  name?: string;
  quantity?: number;
  qty?: number;
  priceAtPurchase?: number;
}

interface StoreOrder {
  id: string;
  orderNumber: string | null;
  status: string;
  createdAt: string;
  totalAmount: number;
  subtotalInr?: number;
  deliveryFeeInr?: number;
  trackingNumber?: string | null;
  paymentId?: string | null;
  statusHistory?: OrderHistoryEntry[];
  items: OrderItem[];
}

const STATUS_META: Record<
  string,
  { label: string; icon: typeof Package; className: string }
> = {
  PENDING: { label: 'Payment pending', icon: Clock, className: 'bg-amber-50 text-amber-700' },
  CONFIRMED: { label: 'Confirmed', icon: CheckCircle2, className: 'bg-blue-50 text-blue-700' },
  PROCESSING: { label: 'Packing', icon: Package, className: 'bg-blue-50 text-blue-700' },
  SHIPPED: { label: 'Shipped', icon: Truck, className: 'bg-indigo-50 text-indigo-700' },
  DELIVERED: { label: 'Delivered', icon: CheckCircle2, className: 'bg-green-50 text-green-700' },
  CANCELLED: { label: 'Cancelled', icon: XCircle, className: 'bg-red-50 text-red-700' },
  REFUNDED: { label: 'Refunded', icon: RotateCcw, className: 'bg-surface-100 text-surface-600' },
};

function formatPrice(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function StoreOrdersPage() {
  return (
    <AuthGuard>
      <StoreOrdersInner />
    </AuthGuard>
  );
}

function StoreOrdersInner() {
  const { session } = useAuth();
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // AUTH-06: the flag `friendlyApiError` has returned since P1 #208 and that
  // no page read. A 401 here is a dead session, and the sentence it produces
  // instructs the buyer to sign in again — so something has to let them.
  const [reauth, setReauth] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelNotice, setCancelNotice] = useState<{ id: string; text: string } | null>(null);

  async function cancelOrder(orderId: string) {
    setCancelBusy(true);
    setCancelError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/store/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(session?.accessToken ? { authorization: `Bearer ${session.accessToken}` } : {}),
        },
        credentials: 'include',
        body: '{}',
      });
      const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
      if (!res.ok) {
        setCancelError(describeStoreCancelError(res.status, body as { error?: string; code?: string } | null));
        return;
      }
      setCancelNotice({ id: orderId, text: describeStoreCancelled((body ?? {}) as Parameters<typeof describeStoreCancelled>[0]) });
      setConfirmId(null);
      setReloadTick((n) => n + 1);
    } catch {
      setCancelError('We could not cancel this order just now. Please try again.');
    } finally {
      setCancelBusy(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      setReauth(false);
      try {
        const headers: Record<string, string> = { 'content-type': 'application/json' };
        if (session?.accessToken) headers.authorization = `Bearer ${session.accessToken}`;
        const res = await fetch(`${API_BASE_URL}/store/orders`, {
          headers,
          credentials: 'include',
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as { data?: StoreOrder[] };
        if (cancelled) return;
        setOrders(Array.isArray(json.data) ? json.data : []);
      } catch (err) {
        if (cancelled) return;
        // Never fall back to sample orders — an unreadable list must read as
        // unreadable, not as "you have no orders".
        // AUTH-06: and when the reason is a dead session, say so with a link
        // that can fix it — this page reads the flag now instead of dropping it.
        const { message, reauth: needsReauth } = friendlyApiError(err);
        setError(message);
        setReauth(needsReauth);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [session?.accessToken, reloadTick]);

  return (
    <div className="min-h-[100dvh] bg-surface-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href="/store"
          className="inline-flex items-center gap-1.5 text-sm text-surface-500 hover:text-saffron-600 mb-6"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to store
        </Link>

        <h1 className={`${H1.portal} mb-1`}>My Orders</h1>
        <p className="text-surface-500 text-sm mb-8">
          Every order you have placed in the Darshya store, with its current status.
        </p>

        {loading && (
          <div className="space-y-3" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-28 rounded-xl border border-surface-100 bg-white animate-pulse"
              />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-red-800">We could not load your orders</p>
            {reauth ? (
              <ReauthPrompt message={error} className="mt-2 flex flex-col items-center gap-3" />
            ) : (
              <p className="text-sm text-red-700 mt-1">{error}</p>
            )}
          </div>
        )}

        {!loading && !error && orders.length === 0 && (
          <div className="rounded-xl border border-dashed border-surface-200 bg-white p-10 text-center">
            <ShoppingBag className="w-10 h-10 text-surface-300 mx-auto mb-3" />
            <p className="font-medium text-surface-700">No orders yet</p>
            <p className="text-sm text-surface-500 mt-1 mb-5">
              When you place an order it will appear here with its status and tracking number.
            </p>
            <Link
              href="/store"
              className={buttonClass('primary', 'md')}
            >
              Browse the store
            </Link>
          </div>
        )}

        {!loading && !error && orders.length > 0 && (
          <div className="space-y-4">
            {orders.map((order) => {
              const meta = STATUS_META[order.status] ?? {
                label: order.status,
                icon: Package,
                className: 'bg-surface-100 text-surface-600',
              };
              const StatusIcon = meta.icon;
              return (
                <div
                  key={order.id}
                  className="rounded-xl border border-surface-100 bg-white p-5 shadow-warm-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                    <div>
                      <p className="font-semibold text-surface-800">
                        {order.orderNumber ?? 'Order number pending'}
                      </p>
                      <p className="text-xs text-surface-500 mt-0.5">
                        Placed {formatDate(order.createdAt)}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${meta.className}`}
                    >
                      <StatusIcon className="w-3.5 h-3.5" />
                      {meta.label}
                    </span>
                  </div>

                  <ul className="space-y-1.5 mb-4">
                    {order.items.map((item, i) => (
                      <li
                        key={`${order.id}-${item.productId}-${i}`}
                        className="flex justify-between text-sm"
                      >
                        <span className="text-surface-700">
                          {item.name ?? 'Item'}
                          <span className="text-surface-400"> × {item.quantity ?? item.qty ?? 1}</span>
                        </span>
                        <span className="text-surface-600">
                          {formatPrice((item.priceAtPurchase ?? 0) * (item.quantity ?? item.qty ?? 1))}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="border-t border-surface-100 pt-3 space-y-1 text-sm">
                    {typeof order.subtotalInr === 'number' && (
                      <div className="flex justify-between text-surface-500">
                        <span>Subtotal</span>
                        <span>{formatPrice(order.subtotalInr)}</span>
                      </div>
                    )}
                    {typeof order.deliveryFeeInr === 'number' && (
                      <div className="flex justify-between text-surface-500">
                        <span>Delivery</span>
                        <span>
                          {order.deliveryFeeInr === 0 ? 'FREE' : formatPrice(order.deliveryFeeInr)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold text-surface-800 pt-1">
                      <span>Total paid</span>
                      <span>{formatPrice(order.totalAmount)}</span>
                    </div>
                  </div>

                  {order.trackingNumber ? (
                    <p className="mt-3 text-sm text-surface-600" data-testid="order-tracking">
                      <Truck className="w-4 h-4 inline-block mr-1.5 -mt-0.5 text-surface-400" />
                      Tracking number:{' '}
                      <span className="font-medium text-surface-800">{order.trackingNumber}</span>
                      {courierFromHistory(order) ? (
                        <span className="text-surface-500"> via {courierFromHistory(order)}</span>
                      ) : null}
                    </p>
                  ) : (
                    order.status === 'SHIPPED' && (
                      <p className="mt-3 text-sm text-surface-500">
                        Tracking number will appear here as soon as the courier assigns one.
                      </p>
                    )
                  )}

                  {(() => {
                    const refund = storeRefundState(order);
                    const blocked = storeCancelBlockedReason(order.status);
                    return (
                      <>
                        {refund.kind !== 'none' ? (
                          <p
                            data-testid="order-refund-state"
                            className={`mt-3 text-sm ${refund.kind === 'declined' ? 'text-red-700' : 'text-surface-700'}`}
                          >
                            {refund.text}
                          </p>
                        ) : null}
                        {cancelNotice?.id === order.id ? (
                          <p role="status" data-testid="order-cancel-notice" className="mt-3 text-sm text-emerald-800">
                            {cancelNotice.text}
                          </p>
                        ) : null}
                        {canCancelStoreOrder(order.status) ? (
                          confirmId === order.id ? (
                            <div
                              role="alertdialog"
                              aria-label="Confirm order cancellation"
                              className="mt-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900"
                            >
                              <p className="font-medium">Cancel order {order.orderNumber}?</p>
                              <p className="mt-1" data-testid="order-cancel-preview">{storeCancelConfirmText(order)}</p>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  data-testid="order-cancel-confirm"
                                  disabled={cancelBusy}
                                  onClick={() => void cancelOrder(order.id)}
                                  className="h-10 px-4 rounded-lg bg-red-700 text-white text-sm font-medium hover:bg-red-800 disabled:opacity-60"
                                >
                                  {cancelBusy ? 'Cancelling…' : 'Yes, cancel order'}
                                </button>
                                <button
                                  type="button"
                                  disabled={cancelBusy}
                                  onClick={() => setConfirmId(null)}
                                  className="h-10 px-4 rounded-lg border border-red-200 bg-white text-sm font-medium text-red-800 hover:bg-red-100"
                                >
                                  Keep order
                                </button>
                              </div>
                              {cancelError ? (
                                <p role="alert" data-testid="order-cancel-error" className="mt-2 text-red-700">{cancelError}</p>
                              ) : null}
                            </div>
                          ) : (
                            <button
                              type="button"
                              data-testid={`order-cancel-open-${order.id}`}
                              onClick={() => {
                                setConfirmId(order.id);
                                setCancelError(null);
                                setCancelNotice(null);
                              }}
                              className="mt-3 text-sm font-medium text-red-700 underline underline-offset-2 hover:text-red-800"
                            >
                              Cancel order
                            </button>
                          )
                        ) : blocked ? (
                          <p className="mt-3 text-xs text-surface-500" data-testid="order-cancel-blocked">{blocked}</p>
                        ) : null}
                      </>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
