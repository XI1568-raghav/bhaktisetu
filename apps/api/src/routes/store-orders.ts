import { FastifyInstance } from 'fastify';
import crypto from 'node:crypto';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { authenticateUser } from '../middlewares/auth.js';
import { generateInvoice } from '../lib/pdf-invoice.js';
import { sendEmail } from '../lib/email.js';
import { writeStoreOrderCommission } from '../services/store-commission.service.js';

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
  line2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  pincode: z.string().min(1),
  country: z.string().default('India'),
  phone: z.string().optional(),
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
// store owner / no profile). StoreOrder has no storeProfileId FK, so order-to-
// store attribution is via items[].productId → StoreProduct.storeProfileId.
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
  return {
    ...order,
    items,
    customerName,
    totalAmount,
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
    const products = await prisma.storeProduct.findMany({
      where: { id: { in: productIds } },
      select: { id: true, price: true, stock: true, isActive: true, storeProfileId: true },
    });
    const productById = new Map(products.map((p) => [p.id, p]));
    const serverItems: { productId: string; qty: number; priceAtPurchase: number; name?: string }[] = [];
    let serverTotal = 0;
    // P0 #S-11 (2026-07-09): capture the owning store for the order. A cart
    // must be single-store (mixed-store carts are unsupported) — reject if
    // items belong to different stores.
    let orderStoreProfileId: string | null = null;
    for (const it of requestedItems) {
      const product = productById.get(it.productId);
      if (!product) {
        return reply.code(400).send({ error: `Unknown product: ${it.productId}` });
      }
      if (!product.isActive) {
        return reply.code(409).send({ error: `Product no longer available: ${it.productId}` });
      }
      if (product.stock < it.qty) {
        return reply.code(409).send({ error: `Insufficient stock for ${it.productId} (have ${product.stock}, want ${it.qty})` });
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
      for (const it of serverItems) {
        await tx.storeProduct.update({
          where: { id: it.productId },
          data: { stock: { decrement: it.qty } },
        });
      }
      return created;
    });
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
        CONFIRMED: ['PROCESSING', 'SHIPPED', 'CANCELLED'],
        PROCESSING: ['SHIPPED', 'CANCELLED'],
        SHIPPED: ['DELIVERED'],
        DELIVERED: [],
        CANCELLED: [],
        REFUNDED: [],
      };
      const allowed = ALLOWED_TRANSITIONS[order.status] ?? [];
      if (!allowed.includes(body.data.status)) {
        return reply
          .code(409)
          .send({ error: `Cannot transition order from ${order.status} to ${body.data.status}.` });
      }

      const adminId = request.currentUser!.id;
      const historyEntry = {
        status: body.data.status,
        changedAt: new Date().toISOString(),
        changedBy: adminId,
        note: body.data.note ?? null,
      };
      const existingHistory = Array.isArray(order.statusHistory) ? order.statusHistory : [];
      const updated = await prisma.storeOrder.update({
        where: { id: order.id },
        data: {
          status: body.data.status,
          trackingNumber: body.data.trackingNumber ?? order.trackingNumber,
          statusHistory: [...existingHistory, historyEntry] as Prisma.InputJsonValue[],
        },
      });
      // Store-owner revamp: write the Commission row when a COD/manual order is
      // confirmed (the Razorpay-verify path wrote it; COD/manual leaked).
      // Fire-and-forget + idempotent — never blocks the status flip.
      if (body.data.status === 'CONFIRMED') {
        void writeStoreOrderCommission(order.id).catch((err) =>
          request.log.warn({ err }, '[store-orders] commission write failed'),
        );
      }
      return reply.send({ data: serializeOrder(updated) });
    }
  );

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
            subject: `Darshya tax invoice — ${order.orderNumber}`,
            html: `<p>Namaste ${order.user.fullName},</p><p>Your tax invoice for order <strong>${order.orderNumber}</strong> is attached.</p>`,
            text: `Tax invoice for order ${order.orderNumber} attached.`,
            attachments: [
              { filename: `invoice-${order.orderNumber}.pdf`, content: pdf },
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
