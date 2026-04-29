import { FastifyInstance } from 'fastify';
import crypto from 'node:crypto';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticateUser } from '../middlewares/auth.js';
import { generateInvoice } from '../lib/pdf-invoice.js';
import { sendEmail } from '../lib/email.js';

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

function serializeOrder(order: any) {
  return {
    ...order,
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
    const initialHistory = [
      {
        status: 'PENDING',
        changedAt: new Date().toISOString(),
        changedBy: userId,
        note: 'Order created',
      },
    ];
    const order = await prisma.storeOrder.create({
      data: {
        orderNumber: nextOrderNumber(),
        userId,
        items: parsed.data.items,
        totalAmountInr: parsed.data.totalAmountInr,
        shippingAddress: parsed.data.shippingAddress,
        paymentId: parsed.data.paymentId ?? null,
        statusHistory: initialHistory,
      },
    });
    return reply.code(201).send({ data: serializeOrder(order) });
  });

  // GET /orders — list own orders; admin sees all
  server.get('/orders', { preHandler: [authenticateUser] }, async (request, reply) => {
    const userId = request.currentUser!.id;
    const where = isAdmin(request) ? {} : { userId };
    const orders = await prisma.storeOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return reply.send({ data: orders.map(serializeOrder) });
  });

  // GET /orders/:id — owner or admin
  server.get('/orders/:id', { preHandler: [authenticateUser] }, async (request, reply) => {
    const params = orderIdParams.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: 'Invalid order id' });
    const order = await prisma.storeOrder.findUnique({ where: { id: params.data.id } });
    if (!order) return reply.code(404).send({ error: 'Order not found' });
    const userId = request.currentUser!.id;
    if (order.userId !== userId && !isAdmin(request)) {
      return reply.code(403).send({ error: 'Not authorized to view this order' });
    }
    return reply.send({ data: serializeOrder(order) });
  });

  // PATCH /orders/:id/status — admin-only status mutation; appends to statusHistory.
  // Reverse transitions (e.g. SHIPPED → PROCESSING) are intentionally allowed —
  // the statusHistory column is the authoritative audit trail.
  server.patch(
    '/orders/:id/status',
    { preHandler: [authenticateUser] },
    async (request, reply) => {
      if (!isAdmin(request)) {
        return reply.code(403).send({ error: 'Admin role required' });
      }
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
          statusHistory: [...existingHistory, historyEntry] as any,
        },
      });
      return reply.send({ data: serializeOrder(updated) });
    }
  );

  // POST /orders/:id/payment-confirm — flip PENDING → CONFIRMED and send invoice.
  // TODO: gate on a real Razorpay webhook signature once store-order checkout
  // is integrated end-to-end. Until then, this is admin-only so we can drive
  // the flow manually for QA and fulfilment ops.
  server.post(
    '/orders/:id/payment-confirm',
    { preHandler: [authenticateUser] },
    async (request, reply) => {
      if (!isAdmin(request)) {
        return reply.code(403).send({ error: 'Admin role required' });
      }
      const params = orderIdParams.safeParse(request.params);
      if (!params.success) return reply.code(400).send({ error: 'Invalid order id' });

      const order = await prisma.storeOrder.findUnique({
        where: { id: params.data.id },
        include: { user: { select: { fullName: true, email: true } } },
      });
      if (!order) return reply.code(404).send({ error: 'Order not found' });
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
          statusHistory: [...existingHistory, historyEntry] as any,
        },
      });

      // Best-effort invoice — never block status flip.
      void (async () => {
        try {
          if (!order.user.email) return;
          const items = Array.isArray(order.items) ? (order.items as any[]) : [];
          const lineItems = items.map((it) => ({
            name: typeof it.name === 'string' ? it.name : (it.productId ?? 'Item'),
            qty: Number(it.qty ?? 1),
            priceInr: Number(it.priceAtPurchase ?? 0),
          }));
          const addr = order.shippingAddress as any;
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
