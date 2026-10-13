import { FastifyInstance } from 'fastify';
import crypto from 'node:crypto';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { authenticateUser } from '../middlewares/auth.js';
import { generateInvoice } from '../lib/pdf-invoice.js';
import { sendEmail } from '../lib/email.js';
import { esc } from '../lib/html-escape.js';
import { writeStoreOrderCommission } from '../services/store-commission.service.js';
import { computeStoreOrderTotals } from '../lib/store-pricing.js';
import {
  customerCancelStoreOrder,
  refundStoreOrder,
  rejectStoreOrderRefund,
  listPendingStoreRefunds,
  releaseOrderHolds,
} from '../services/store-order-refund.service.js';

/**
 * Persisted store order endpoints. The product/SKU catalogue still lives
 * in /store (mock today), but every successful checkout writes a real
 * StoreOrder row so we can ship, refund, and audit. Status mutations are
 * NOT gated on a forward-only state machine — corrections happen often
 * (warehouse marks SHIPPED then realises the parcel never left), and the
 * statusHistory JSON column is the source of truth for what happened.
 */

const orderItemSchema = z.object({
  productId: z.string().min(1),
  qty: z.number().int().positive(),
  priceAtPurchase: z.number().nonnegative(),
});

const shippingAddressSchema = z.object({
  fullName: z.string().min(1),
  line1: z.string().min(1),
  // `.optional()` accepts undefined but REJECTS null — and saved addresses
  // store line2/phone as SQL NULL, which serialises to null. So every checkout
  // using a saved address 400'd with
  // {"shippingAddress":["Expected string, received null"]} before any product
  // was even looked at. `.nullish()` accepts both.
  line2: z.string().nullish(),
  city: z.string().min(1),
  state: z.string().min(1),
  // QA 2026-10-13: Indian PIN = exactly 6 digits (the shipping rule is India-only, enforced below).
  pincode: z.string().trim().regex(/^\d{6}$/, 'Enter a valid 6-digit Indian pincode.'),
  country: z.string().default('India'),
  phone: z.string().nullish(),
}).refine((a) => ['', 'IN', 'INDIA'].includes(a.country.trim().toUpperCase()), {
  // Role pass 2026-10-07: the copy (support FAQ, /nri-pujas) promises store
  // orders ship within India only, but the API charged an order for a US address.
  path: ['country'],
  message: 'Store orders are delivered within India only. Use an Indian delivery address.',
});

const createOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1, 'At least one item is required'),
  totalAmountInr: z.number().positive(),
  shippingAddress: shippingAddressSchema,
  paymentId: z.string().uuid().optional(),
  // P0 #S-08: client-generated idempotency key. On a duplicate POST with the
  // same key, the existing order is returned instead of creating a new one.
  idempotencyKey: z.string().min(8).max(128).optional(),
});

const updateStatusSchema = z.object({
  status: z.enum([
    'PENDING',
    'CONFIRMED',
    'PROCESSING',
    'SHIPPED',
    'DELIVERED',
    'CANCELLED',
    'REFUNDED',
  ]),
  trackingNumber: z.string().optional(),
  note: z.string().max(500).optional(),
});

const orderIdParams = z.object({ id: z.string().uuid() });

class OutOfStockError extends Error {
  constructor(readonly productId: string) {
    super(`Insufficient stock for ${productId}`);
  }
}

function nextOrderNumber(): string {
  const d = new Date();
  const ymd = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
  const rand = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `ORD-${ymd}-${rand}`;
}

function isAdmin(req: any): boolean {
  return Array.isArray(req.currentUser?.roles) && req.currentUser.roles.includes('ADMIN');
}

function isStoreOwner(req: any): boolean {
  return Array.isArray(req.currentUser?.roles) && req.currentUser.roles.includes('STORE_OWNER');
}

// P0 #S-02 (2026-07-09): resolve the caller's StoreProfile id (null if not a
// store owner / no profile). S-11 has since given StoreOrder its own
// storeProfileId FK, written at creation below — order-to-store attribution
// reads that. The items[].productId → StoreProduct walk survives only where a
// per-LINE answer is needed (which of this store's products an order contains),
// and as the legacy path for orders predating the FK.
async function resolveStoreProfileId(userId: string): Promise<string | null> {
  const profile = await prisma.storeProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  return profile?.id ?? null;
}

// P0 #S-01 (2026-07-09): a STORE_OWNER may manage orders that contain at least
// one product belonging to their store. Falls back to admin check. Returns the
// set of the order's productIds so callers can reuse them for stock attribution.
async function canManageOrder(
  req: any,
  order: { items?: any[] } | null,
): Promise<boolean> {
  if (!order) return false;
  if (isAdmin(req)) return true;
  if (!isStoreOwner(req)) return false;
  const storeProfileId = await resolveStoreProfileId(req.currentUser!.id);
  if (!storeProfileId) return false;
  const productIds = Array.isArray(order.items)
    ? order.items.map((it: any) => it.productId).filter(Boolean)
    : [];
  if (productIds.length === 0) return false;
  const owned = await prisma.storeProduct.findMany({
    where: { id: { in: productIds }, storeProfileId },
    select: { id: true },
  });
  return owned.length > 0;
}

// S-03 (2026-07-09): emit consumer-facing aliases the web orders page reads.
// The raw StoreOrder has totalAmountInr (Decimal->string), items as a Json
// array of { productId, qty, priceAtPurchase } with NO product name, and no
// customerName. Enrich with: totalAmount (number), customerName (from the
// joined buyer's fullName or the shipping address), and items[].name when a
// productNameMap (productId -> name) is supplied by the list/detail handlers.
function serializeOrder(order: any, productNameMap?: Map<string, string>) {
  const rawItems = Array.isArray(order.items) ? order.items : [];
  const items = rawItems.map((it: any) => ({
    ...it,
    name:
      it.name ||
      it.productName ||
      productNameMap?.get(it.productId) ||
      'Item',
    quantity: it.qty ?? it.quantity ?? 1,
  }));
  const customerName =
    order.user?.fullName ||
    order.customerName ||
    order.customer ||
    (order.shippingAddress as any)?.fullName ||
    'Customer';
  const totalAmount = Number(order.totalAmountInr ?? order.totalAmount ?? 0) || 0;
  // COM-06: expose the breakdown the checkout screen and the order-history page
  // render, so neither has to recompute (and drift from) the charged total.
  // Derived rather than stored — StoreOrder has no fee columns, and
  // total − subtotal IS the fee for both new and legacy rows.
  const subtotalInr = items.reduce(
    (sum: number, it: any) => sum + Number(it.priceAtPurchase ?? 0) * Number(it.quantity ?? 0),
    0,
  );
  return {
    ...order,
    items,
    customerName,
    totalAmount,
    subtotalInr,
    deliveryFeeInr: Math.max(0, Math.round((totalAmount - subtotalInr) * 100) / 100),
    totalAmountInr: order.totalAmountInr?.toString?.() ?? order.totalAmountInr,
  };
}

export async function storeOrderRoutes(server: FastifyInstance) {
  // POST /orders — create a new store order
  server.post('/orders', { preHandler: [authenticateUser] }, async (request, reply) => {
    const parsed = createOrderSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ error: 'Invalid request body', details: parsed.error.flatten() });
    }
    const userId = request.currentUser!.id;

    // P0 #S-08 (2026-07-09): idempotency. If the client re-POSTs with the same
    // idempotencyKey (network retry, double-click), return the existing order
    // instead of creating a duplicate. Key is unique per user.
    if (parsed.data.idempotencyKey) {
      const existing = await prisma.storeOrder.findFirst({
        where: { userId, idempotencyKey: parsed.data.idempotencyKey },
      });
      if (existing) {
        return reply.code(200).send({ data: serializeOrder(existing) });
      }
    }

    // P0 #PBO (2026-07-09): server-authoritative pricing + stock. The old
    // handler trusted client-sent totalAmountInr + items[].priceAtPurchase
    // (₹499 product could be ordered for ₹1) and never checked/decremented
    // stock (overselling). Now we look up each product, enforce the catalog
    // price, validate stock ≥ qty, recompute the total, and decrement stock
    // atomically. The client-sent price/total are ignored.
    const requestedItems = parsed.data.items;
    const productIds = requestedItems.map((it) => it.productId);
    // StoreProduct.id is a uuid column, but the shopper-facing catalogue serves
    // static handles like `prod_015`. Passing one into a uuid `in` filter makes
    // Prisma throw P2023 ("Error creating UUID") and the request 500s with a
    // raw error blob rendered mid-word at the highest-intent moment in the
    // funnel. The per-item loop below ALREADY answers a clean
    // `400 Unknown product: <id>` — it just never got the chance to run.
    // Filtering to uuid-shaped ids lets that intended path handle them.
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const lookupIds = productIds.filter((id) => UUID_RE.test(id));
    const products = lookupIds.length
      ? await prisma.storeProduct.findMany({
          where: { id: { in: lookupIds }, storeProfile: { approved: true } },
          select: { id: true, price: true, stock: true, isActive: true, storeProfileId: true },
        })
      : [];
    const productById = new Map(products.map((p) => [p.id, p]));
    const serverItems: { productId: string; qty: number; priceAtPurchase: number; name?: string }[] = [];
    let serverTotal = 0;
    // The same product can appear on several lines. Stock must be checked
    // against the SUM of those lines, not each line alone — two lines of 3
    // against a stock of 5 each passed `stock < qty` and drove stock to -1.
    const wantedByProduct = new Map<string, number>();
    // P0 #S-11 (2026-07-09): capture the owning store for the order. A cart
    // must be single-store (mixed-store carts are unsupported) — reject if
    // items belong to different stores.
    let orderStoreProfileId: string | null = null;
    for (const it of requestedItems) {
      const product = productById.get(it.productId);
      if (!product) {
        // COM-01. Two different situations reach this line and a shopper is
        // owed different words for them:
        //
        //   - a `prod_NNN` id from the hand-written catalogue, which has no
        //     seller, no stock record and no fulfilment behind it. It is not
        //     "unknown", it was never for sale, and saying so is the honest
        //     answer. GET /store/products now marks these `buyable: false` up
        //     front, so reaching here means a stale basket or a client that
        //     ignored the flag.
        //   - a uuid that genuinely is not in store_products — deleted,
        //     mistyped, or from another environment.
        //
        // `error` keeps the exact `Unknown product: <id>` prefix on purpose:
        // apps/mobile matches it ((devotee)/checkout.tsx) to render its own
        // sentence, and changing the string would silently downgrade that to a
        // bare status code. `code` + `message` are the additive, structured
        // form for clients that would rather not string-match.
        const isCatalogueFixture = !UUID_RE.test(it.productId);
        return reply.code(400).send({
          error: `Unknown product: ${it.productId}`,
          code: isCatalogueFixture ? 'product_not_orderable' : 'product_not_found',
          message: isCatalogueFixture
            ? 'One item in your basket is a catalogue preview — no seller stocks it yet, so it cannot be ordered. Remove it and the rest of your order can go through.'
            : 'One item in your basket is no longer listed. Remove it and the rest of your order can go through.',
          productId: it.productId,
        });
      }
      if (!product.isActive) {
        return reply.code(409).send({ error: `Product no longer available: ${it.productId}` });
      }
      const wanted = (wantedByProduct.get(it.productId) ?? 0) + it.qty;
      wantedByProduct.set(it.productId, wanted);
      if (product.stock < wanted) {
        return reply.code(409).send({ error: `Insufficient stock for ${it.productId} (have ${product.stock}, want ${wanted})` });
      }
      if (product.storeProfileId) {
        if (orderStoreProfileId && orderStoreProfileId !== product.storeProfileId) {
          return reply.code(400).send({ error: 'Mixed-store carts are not supported. Place a separate order per store.' });
        }
        orderStoreProfileId = product.storeProfileId;
      }
      const unitPrice = Number(product.price);
      serverItems.push({ productId: it.productId, qty: it.qty, priceAtPurchase: unitPrice });
      serverTotal += unitPrice * it.qty;
    }

    // COM-06 / S-09: the delivery fee is part of the order, not a browser-only
    // decoration. Compute it here so `totalAmountInr` — which is what Razorpay
    // is charged (payment.service.ts) and what the invoice prints — is the same
    // number the checkout screen promised.
    const totals = computeStoreOrderTotals(
      serverItems.map((it) => ({ qty: it.qty, unitPriceInr: it.priceAtPurchase })),
    );
    serverTotal = totals.totalInr;

    // Both sides of the contract. The server used to silently ignore the
    // client's `totalAmountInr`, which is exactly how a ₹733 button could sit
    // on top of a ₹698 charge for months without anyone noticing. If the page
    // showed a different number, refuse — do not charge a third one.
    if (parsed.data.totalAmountInr !== totals.totalInr) {
      return reply.code(409).send({
        error: 'price_mismatch',
        message:
          'Prices changed while you were checking out. Please review your cart total and try again.',
        serverTotalInr: totals.totalInr,
        subtotalInr: totals.subtotalInr,
        deliveryFeeInr: totals.deliveryFeeInr,
      });
    }

    const initialHistory = [
      {
        status: 'PENDING',
        changedAt: new Date().toISOString(),
        changedBy: userId,
        note: 'Order created',
      },
    ];

    // Create the order + decrement stock atomically so a concurrent order
    // can't oversell the same last unit.
    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.storeOrder.create({
        data: {
          orderNumber: nextOrderNumber(),
          userId,
          // P0 #S-11: attribute the order to its store (resolved from the
          // cart's products above). Nullable for legacy/edge rows.
          storeProfileId: orderStoreProfileId,
          // P0 #S-08: persist the idempotency key so a later duplicate POST
          // returns this order (see the dedupe check above).
          idempotencyKey: parsed.data.idempotencyKey ?? null,
          items: serverItems,
          totalAmountInr: serverTotal,
          shippingAddress: parsed.data.shippingAddress,
          paymentId: parsed.data.paymentId ?? null,
          statusHistory: initialHistory,
        },
      });
      for (const [productId, qty] of wantedByProduct) {
        // Conditional decrement: the stock read above is outside this
        // transaction, so a concurrent order can have taken the last unit.
        const dec = await tx.storeProduct.updateMany({
          where: { id: productId, stock: { gte: qty } },
          data: { stock: { decrement: qty } },
        });
        if (dec.count !== 1) throw new OutOfStockError(productId);
      }
      return created;
    }).catch((err) => {
      if (err instanceof OutOfStockError) return err;
      throw err;
    });
    if (order instanceof OutOfStockError) {
      return reply.code(409).send({ error: `Insufficient stock for ${order.productId}` });
    }
    return reply.code(201).send({ data: serializeOrder(order) });
  });

  // GET /orders — list orders.
  // S-02/S-03 (2026-07-09): scope by role. A STORE_OWNER sees SALES of their
  // store's products (not their personal purchases — the old {userId} filter
  // returned the owner's own buys). A regular user sees their own purchases.
  // Admin sees all. Items are enriched with product names + the buyer's name
  // so the web orders page (which reads json.data + totalAmount + customerName
  // + items[].name) actually renders.
  server.get('/orders', { preHandler: [authenticateUser] }, async (request, reply) => {
    const userId = request.currentUser!.id;
    let orders: any[];
    if (isStoreOwner(request)) {
      const storeProfileId = await resolveStoreProfileId(userId);
      if (!storeProfileId) {
        return reply.send({ data: [] });
      }
      // Load this store's product ids, then return orders containing any of them.
      const products = await prisma.storeProduct.findMany({
        where: { storeProfileId },
        select: { id: true, name: true },
      });
      const productNameMap = new Map(products.map((p) => [p.id, p.name]));
      const productIds = products.map((p) => p.id);
      if (productIds.length === 0) return reply.send({ data: [] });
      const all = await prisma.storeOrder.findMany({
        orderBy: { createdAt: 'desc' },
        take: 200,
        include: { user: { select: { fullName: true } } },
      });
      orders = all.filter((o) =>
        Array.isArray(o.items) &&
        o.items.some((it: any) => productIds.includes(it.productId)),
      );
      return reply.send({ data: orders.map((o) => serializeOrder(o, productNameMap)) });
    }
    const where = isAdmin(request) ? {} : { userId };
    orders = await prisma.storeOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { user: { select: { fullName: true } } },
    });
    // Build a product-name map for the items in this result set.
    const productIds = new Set<string>();
    orders.forEach((o) => {
      if (Array.isArray(o.items)) o.items.forEach((it: any) => productIds.add(it.productId));
    });
    let productNameMap = new Map<string, string>();
    if (productIds.size > 0) {
      const named = await prisma.storeProduct.findMany({
        where: { id: { in: Array.from(productIds) } },
        select: { id: true, name: true },
      });
      productNameMap = new Map(named.map((p) => [p.id, p.name]));
    }
    return reply.send({ data: orders.map((o) => serializeOrder(o, productNameMap)) });
  });

  // GET /orders/:id — owner, store-owner (whose products are in it), or admin
  server.get('/orders/:id', { preHandler: [authenticateUser] }, async (request, reply) => {
    const params = orderIdParams.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: 'Invalid order id' });
    const order = await prisma.storeOrder.findUnique({
      where: { id: params.data.id },
      include: { user: { select: { fullName: true } } },
    });
    if (!order) return reply.code(404).send({ error: 'Order not found' });
    const userId = request.currentUser!.id;
    const ownerOk = order.userId === userId;
    const manageOk = ownerOk || isAdmin(request) || (await canManageOrder(request, order as any));
    if (!manageOk) {
      return reply.code(403).send({ error: 'Not authorized to view this order' });
    }
    // S-03: enrich items with product names.
    const productIds = Array.isArray(order.items)
      ? order.items.map((it: any) => it.productId).filter(Boolean)
      : [];
    let productNameMap = new Map<string, string>();
    if (productIds.length > 0) {
      const named = await prisma.storeProduct.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true },
      });
      productNameMap = new Map(named.map((p) => [p.id, p.name]));
    }
    return reply.send({ data: serializeOrder(order, productNameMap) });
  });

  // PATCH /orders/:id/status — admin-only status mutation; appends to statusHistory.
  // Reverse transitions (e.g. SHIPPED → PROCESSING) are intentionally allowed —
  // the statusHistory column is the authoritative audit trail.
  server.patch(
    '/orders/:id/status',
    { preHandler: [authenticateUser] },
    async (request, reply) => {
      const params = orderIdParams.safeParse(request.params);
      if (!params.success) return reply.code(400).send({ error: 'Invalid order id' });
      const body = updateStatusSchema.safeParse(request.body ?? {});
      if (!body.success) {
        return reply
          .code(400)
          .send({ error: 'Invalid request body', details: body.error.flatten() });
      }
      const order = await prisma.storeOrder.findUnique({ where: { id: params.data.id } });
      if (!order) return reply.code(404).send({ error: 'Order not found' });
      // P0 #S-01 (2026-07-09): allow STORE_OWNER for their own store's orders.
      if (!isAdmin(request) && !(await canManageOrder(request, order as any))) {
        return reply.code(403).send({ error: 'Admin or store-owner role required' });
      }

      // P0 #S-10 (2026-07-09): validate the transition. The old handler accepted
      // any status, so a CANCELLED/REFUNDED order could be flipped back to
      // DELIVERED (appending a misleading history entry). Terminal states
      // (CANCELLED, REFUNDED, DELIVERED) cannot leave; forward moves follow the
      // fulfilment chain. Admins can still correct via the explicit
      // payment-confirm override, not this generic endpoint.
      const ALLOWED_TRANSITIONS: Record<string, string[]> = {
        PENDING: ['CONFIRMED', 'CANCELLED'],
        CONFIRMED: ['PROCESSING', 'SHIPPED', 'CANCELLED', 'REFUNDED'],
        PROCESSING: ['SHIPPED', 'CANCELLED', 'REFUNDED'],
        SHIPPED: ['DELIVERED', 'REFUNDED'],
        DELIVERED: ['REFUNDED'],
        CANCELLED: [],
        REFUNDED: [],
      };
      const allowed = ALLOWED_TRANSITIONS[order.status] ?? [];
      if (!allowed.includes(body.data.status)) {
        return reply
          .code(409)
          .send({ error: `Cannot transition order from ${order.status} to ${body.data.status}.` });
      }

      // QA 2026-10-13: marking a paid online order REFUNDED here moved no money and then
      // made the refund endpoint report "already refunded". The refund has to go through
      // POST /orders/:id/refund (admin), which executes it.
      if (body.data.status === 'REFUNDED' && order.paymentId) {
        const pay = await prisma.payment.findUnique({
          where: { id: order.paymentId },
          select: { status: true },
        });
        if (pay && (pay.status === 'captured' || pay.status === 'partially_refunded')) {
          return reply.code(409).send({
            error: 'This order was paid online. Use the refund action (POST /orders/:id/refund) so the money is actually returned.',
            code: 'use_refund_endpoint',
          });
        }
      }

      const adminId = request.currentUser!.id;
      const historyEntry = {
        status: body.data.status,
        changedAt: new Date().toISOString(),
        changedBy: adminId,
        note: body.data.note ?? null,
      };
      const existingHistory = Array.isArray(order.statusHistory) ? order.statusHistory : [];
      const toStatus = body.data.status;
      const updated = await prisma.$transaction(async (tx) => {
        const row = await tx.storeOrder.update({
          where: { id: order.id },
          data: {
            status: toStatus,
            trackingNumber: body.data.trackingNumber ?? order.trackingNumber,
            statusHistory: [...existingHistory, historyEntry] as Prisma.InputJsonValue[],
          },
        });
        if (toStatus === 'CANCELLED' || toStatus === 'REFUNDED') {
          // The owner's earning on an order that will not be fulfilled must not
          // stay withdrawable; a cancelled order's units go back on the shelf.
          await releaseOrderHolds(tx, order, toStatus);
        }
        return row;
      });
      // Store-owner revamp: write the Commission row when a COD/manual order is
      // confirmed (the Razorpay-verify path wrote it; COD/manual leaked).
      // Fire-and-forget + idempotent — never blocks the status flip.
      if (body.data.status === 'CONFIRMED') {
        void writeStoreOrderCommission(order.id, undefined, { requirePayment: true }).catch((err) =>
          request.log.warn({ err }, '[store-orders] commission write failed'),
        );
      }
      return reply.send({ data: serializeOrder(updated) });
    }
  );

  // POST /orders/:id/cancel - the customer cancels their own order before it ships.
  // Restocks, reverses the owner's pending commission and, for an order paid online,
  // queues a refund for admin approval. Idempotent.
  server.post('/orders/:id/cancel', { preHandler: [authenticateUser] }, async (request, reply) => {
    const params = orderIdParams.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: 'Invalid order id' });
    const body = z.object({ reason: z.string().trim().max(200).optional() }).safeParse(request.body ?? {});
    if (!body.success) return reply.code(400).send({ error: 'Invalid request body' });
    const order = await prisma.storeOrder.findUnique({
      where: { id: params.data.id },
      select: { id: true, userId: true },
    });
    if (!order) return reply.code(404).send({ error: 'Order not found' });
    if (order.userId !== request.currentUser!.id) {
      return reply.code(403).send({ error: 'Not authorized to cancel this order' });
    }
    const result = await customerCancelStoreOrder({
      orderId: order.id,
      userId: request.currentUser!.id,
      reason: body.data.reason,
    });
    if (!result) return reply.code(404).send({ error: 'Order not found' });
    if (result.outcome === 'blocked') {
      return reply.code(409).send({ error: result.blockedReason, code: 'order_not_cancellable', status: result.status });
    }
    return reply.send({
      cancelled: true,
      alreadyCancelled: result.outcome === 'already',
      status: result.status,
      refundOwedInr: result.refundOwedInr,
      refundStatus: result.paid && result.outcome === 'cancelled' ? 'pending_admin_approval' : 'none',
      commissionReversed: result.commissionReversed,
      note: result.paid && result.outcome === 'cancelled'
        ? 'Order cancelled. Your refund will be processed within 5-7 business days.'
        : 'Order cancelled.',
    });
  });

  // GET /orders/refunds/pending - admin queue: cancelled orders paid online, not yet refunded.
  server.get('/orders/refunds/pending', { preHandler: [authenticateUser] }, async (request, reply) => {
    if (!isAdmin(request)) return reply.code(403).send({ error: 'Admin role required' });
    const orders = await listPendingStoreRefunds();
    // Name the line items so the admin sees what is being refunded, not "Item".
    const ids = new Set<string>();
    orders.forEach((o) => {
      if (Array.isArray(o.items)) (o.items as any[]).forEach((it) => it?.productId && ids.add(it.productId));
    });
    const named = ids.size
      ? await prisma.storeProduct.findMany({ where: { id: { in: Array.from(ids) } }, select: { id: true, name: true } })
      : [];
    const nameMap = new Map(named.map((p) => [p.id, p.name]));
    return reply.send({ data: orders.map((o) => serializeOrder(o, nameMap)) });
  });

  // POST /orders/:id/refund - admin approves a refund for a PAID store order.
  // refundType 'policy' (default): full refund only for an order cancelled before
  // shipping; 'full' refunds any state explicitly. Partial refunds are not offered.
  server.post('/orders/:id/refund', { preHandler: [authenticateUser] }, async (request, reply) => {
    if (!isAdmin(request)) return reply.code(403).send({ error: 'Admin role required' });
    const params = orderIdParams.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: 'Invalid order id' });
    const body = z
      .object({
        reason: z.string().trim().max(500).optional(),
        refundType: z.enum(['policy', 'full']).optional(),
      })
      .strict()
      .safeParse(request.body ?? {});
    if (!body.success) {
      return reply.code(400).send({ error: 'Invalid request body', details: body.error.flatten() });
    }
    const result = await refundStoreOrder({
      orderId: params.data.id,
      adminId: request.currentUser!.id,
      mode: body.data.refundType ?? 'policy',
      reason: body.data.reason,
    });
    if (!result) return reply.code(404).send({ error: 'Order not found' });
    if (!result.ok) {
      return reply.code(result.httpStatus).send({ error: result.error, code: result.code });
    }
    return reply.send({ ok: true, refund: result });
  });

  // POST /orders/:id/refund/reject - admin declines a refund request, with a reason.
  server.post('/orders/:id/refund/reject', { preHandler: [authenticateUser] }, async (request, reply) => {
    if (!isAdmin(request)) return reply.code(403).send({ error: 'Admin role required' });
    const params = orderIdParams.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: 'Invalid order id' });
    const body = z.object({ reason: z.string().trim().min(3).max(500) }).safeParse(request.body ?? {});
    if (!body.success) {
      return reply.code(400).send({ error: 'A reason is required to reject a refund.' });
    }
    const result = await rejectStoreOrderRefund({
      orderId: params.data.id,
      adminId: request.currentUser!.id,
      reason: body.data.reason,
    });
    if (!result) return reply.code(404).send({ error: 'Order not found' });
    if (result.httpStatus !== 200) {
      return reply.code(result.httpStatus).send({ error: result.error, code: result.code });
    }
    return reply.send({ ok: true });
  });

  // POST /orders/:id/payment-confirm — flip PENDING → CONFIRMED and send invoice.
  // Admin-only manual override for QA / fulfilment ops. In production this
  // is hard-gated behind ALLOW_DEMO_PAYMENTS=true so a misclick by support
  // can't bypass the real Razorpay verify path on store-orders/verify-payment.
  // The proper flow is /store-orders/verify-payment with a real Razorpay sig.
  server.post(
    '/orders/:id/payment-confirm',
    { preHandler: [authenticateUser] },
    async (request, reply) => {
      if (
        process.env.NODE_ENV === 'production' &&
        process.env.ALLOW_DEMO_PAYMENTS !== 'true'
      ) {
        return reply.code(403).send({
          error: 'Manual payment-confirm disabled in production. Use /verify-payment with a real Razorpay signature.',
        });
      }
      const params = orderIdParams.safeParse(request.params);
      if (!params.success) return reply.code(400).send({ error: 'Invalid order id' });

      const order = await prisma.storeOrder.findUnique({
        where: { id: params.data.id },
        include: { user: { select: { fullName: true, email: true } } },
      });
      if (!order) return reply.code(404).send({ error: 'Order not found' });
      // P0 #S-01 (2026-07-09): allow STORE_OWNER for their own store's orders.
      if (!isAdmin(request) && !(await canManageOrder(request, order as any))) {
        return reply.code(403).send({ error: 'Admin or store-owner role required' });
      }
      if (order.status !== 'PENDING') {
        return reply.code(409).send({ error: `Order is already ${order.status}` });
      }

      const adminId = request.currentUser!.id;
      const historyEntry = {
        status: 'CONFIRMED',
        changedAt: new Date().toISOString(),
        changedBy: adminId,
        note: 'Payment confirmed',
      };
      const existingHistory = Array.isArray(order.statusHistory) ? order.statusHistory : [];
      const updated = await prisma.storeOrder.update({
        where: { id: order.id },
        data: {
          status: 'CONFIRMED',
          statusHistory: [...existingHistory, historyEntry] as Prisma.InputJsonValue[],
        },
      });

      // Best-effort invoice — never block status flip.
      void (async () => {
        try {
          if (!order.user.email) return;
          // items + shippingAddress are stored as Json; narrow to the shapes
          // we wrote in the checkout flow (validated by *Schema above).
          type StoreOrderItem = { productId?: string; qty?: number; priceAtPurchase?: number; name?: string };
          type StoreOrderAddr = {
            fullName?: string; line1?: string; line2?: string; city?: string;
            state?: string; pincode?: string; country?: string;
          };
          const items: StoreOrderItem[] = Array.isArray(order.items)
            ? (order.items as unknown as StoreOrderItem[])
            : [];
          const lineItems = items.map((it) => ({
            name: typeof it.name === 'string' ? it.name : (it.productId ?? 'Item'),
            qty: Number(it.qty ?? 1),
            priceInr: Number(it.priceAtPurchase ?? 0),
          }));
          const addr = order.shippingAddress as unknown as StoreOrderAddr;
          const addrStr = [
            addr?.fullName, addr?.line1, addr?.line2, addr?.city,
            addr?.state, addr?.pincode, addr?.country,
          ].filter(Boolean).join(', ');
          const pdf = await generateInvoice({
            type: 'store_order',
            orderNumber: order.orderNumber,
            customerName: order.user.fullName,
            items: lineItems,
            shippingAddress: addrStr,
            totalInr: Number(order.totalAmountInr),
            createdAt: order.createdAt.toISOString().slice(0, 10),
          });
          await sendEmail({
            to: order.user.email,
            subject: `Darshya payment receipt — ${order.orderNumber}`,
            html: `<p>Namaste ${esc(order.user.fullName)},</p><p>Your payment receipt for order <strong>${esc(order.orderNumber)}</strong> is attached.</p>`,
            text: `Payment receipt for order ${order.orderNumber} attached.`,
            attachments: [
              { filename: `receipt-${order.orderNumber}.pdf`, content: pdf },
            ],
          });
        } catch (err) {
          console.warn('[store-orders] invoice send failed:', err);
        }
      })();

      return reply.send({ data: serializeOrder(updated) });
    }
  );
}

export const __testing = { shippingAddressSchema };
