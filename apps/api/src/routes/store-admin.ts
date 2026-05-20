import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticateUser } from '../middlewares/auth.js';

/**
 * Store-owner self-service routes. Distinct from the public `storeRoutes`
 * (apps/api/src/routes/store.ts) which serves the curated catalog —
 * everything here is per-store CRUD against the new `store_products`
 * table introduced in 20260520010000_admin_p0_p1_bundle.
 */

const productCreateSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().max(5000).optional(),
  price: z.number().nonnegative(),
  imageUrl: z.string().url().max(1000).optional(),
  category: z.string().max(80).optional(),
  stock: z.number().int().min(0).max(1_000_000).optional(),
  sku: z.string().max(120).optional(),
  isActive: z.boolean().optional(),
});
const productUpdateSchema = productCreateSchema.partial();

export const __testing = { productCreateSchema, productUpdateSchema };

// Resolve the StoreProfile that belongs to the authenticated user. Returns
// null when the user has no profile — caller maps that to 400.
async function resolveStoreProfileId(userId: string): Promise<string | null> {
  const profile = await prisma.storeProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  return profile?.id ?? null;
}

function serializeProduct(p: {
  id: string;
  storeProfileId: string;
  name: string;
  description: string | null;
  price: { toString(): string };
  imageUrl: string | null;
  category: string | null;
  stock: number;
  sku: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: p.id,
    storeProfileId: p.storeProfileId,
    name: p.name,
    description: p.description,
    price: p.price.toString(),
    imageUrl: p.imageUrl,
    category: p.category,
    stock: p.stock,
    sku: p.sku,
    isActive: p.isActive,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

export async function storeAdminRoutes(server: FastifyInstance) {
  // ─── GET /products ──────────────────────────────────────────────────────────

  server.get('/products', { preHandler: [authenticateUser] }, async (request, reply) => {
    const roles = request.currentUser!.roles ?? [];
    if (!roles.includes('STORE_OWNER')) {
      return reply.code(403).send({ error: 'STORE_OWNER role required' });
    }
    const storeProfileId = await resolveStoreProfileId(request.currentUser!.id);
    if (!storeProfileId) return reply.send({ products: [] });
    const products = await prisma.storeProduct.findMany({
      where: { storeProfileId },
      orderBy: { createdAt: 'desc' },
    });
    return reply.send({ products: products.map(serializeProduct) });
  });

  // ─── POST /products ─────────────────────────────────────────────────────────

  server.post('/products', { preHandler: [authenticateUser] }, async (request, reply) => {
    const roles = request.currentUser!.roles ?? [];
    if (!roles.includes('STORE_OWNER')) {
      return reply.code(403).send({ error: 'STORE_OWNER role required' });
    }
    const storeProfileId = await resolveStoreProfileId(request.currentUser!.id);
    if (!storeProfileId) {
      return reply.code(400).send({ error: 'No StoreProfile for this user' });
    }
    const parsed = productCreateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid input', details: parsed.error.flatten() });
    }
    const product = await prisma.storeProduct.create({
      data: {
        storeProfileId,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        price: parsed.data.price,
        imageUrl: parsed.data.imageUrl ?? null,
        category: parsed.data.category ?? null,
        stock: parsed.data.stock ?? 0,
        sku: parsed.data.sku ?? null,
        isActive: parsed.data.isActive ?? true,
      },
    });
    return reply.code(201).send({ product: serializeProduct(product) });
  });

  // ─── PATCH /products/:id ────────────────────────────────────────────────────

  server.patch('/products/:id', { preHandler: [authenticateUser] }, async (request, reply) => {
    const roles = request.currentUser!.roles ?? [];
    if (!roles.includes('STORE_OWNER')) {
      return reply.code(403).send({ error: 'STORE_OWNER role required' });
    }
    const storeProfileId = await resolveStoreProfileId(request.currentUser!.id);
    if (!storeProfileId) return reply.code(400).send({ error: 'No StoreProfile for this user' });
    const { id } = request.params as { id: string };
    const parsed = productUpdateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid input', details: parsed.error.flatten() });
    }
    const existing = await prisma.storeProduct.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send({ error: 'Product not found' });
    if (existing.storeProfileId !== storeProfileId) {
      return reply.code(403).send({ error: 'You do not own this product.' });
    }
    const data: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) data.name = parsed.data.name;
    if (parsed.data.description !== undefined) data.description = parsed.data.description;
    if (parsed.data.price !== undefined) data.price = parsed.data.price;
    if (parsed.data.imageUrl !== undefined) data.imageUrl = parsed.data.imageUrl;
    if (parsed.data.category !== undefined) data.category = parsed.data.category;
    if (parsed.data.stock !== undefined) data.stock = parsed.data.stock;
    if (parsed.data.sku !== undefined) data.sku = parsed.data.sku;
    if (parsed.data.isActive !== undefined) data.isActive = parsed.data.isActive;
    const product = await prisma.storeProduct.update({ where: { id }, data });
    return reply.send({ product: serializeProduct(product) });
  });

  // ─── DELETE /products/:id ───────────────────────────────────────────────────

  server.delete('/products/:id', { preHandler: [authenticateUser] }, async (request, reply) => {
    const roles = request.currentUser!.roles ?? [];
    if (!roles.includes('STORE_OWNER')) {
      return reply.code(403).send({ error: 'STORE_OWNER role required' });
    }
    const storeProfileId = await resolveStoreProfileId(request.currentUser!.id);
    if (!storeProfileId) return reply.code(400).send({ error: 'No StoreProfile for this user' });
    const { id } = request.params as { id: string };
    const existing = await prisma.storeProduct.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send({ error: 'Product not found' });
    if (existing.storeProfileId !== storeProfileId) {
      return reply.code(403).send({ error: 'You do not own this product.' });
    }
    await prisma.storeProduct.delete({ where: { id } });
    return reply.send({ ok: true });
  });

  // StoreOrder.items is Json [{ productId, qty, priceAtPurchase }]. There's no
  // direct FK from order → store, so dashboard/revenue iterate orders in JS and
  // attribute lines whose productId belongs to this store. Fine for early scale;
  // revisit when order volume justifies a denormalized store_order_lines table.

  function attributeOrderToStore(
    items: unknown,
    productIds: Set<string>,
  ): { revenue: number; lines: Array<{ productId: string; qty: number; lineInr: number }> } {
    if (!Array.isArray(items)) return { revenue: 0, lines: [] };
    let revenue = 0;
    const lines: Array<{ productId: string; qty: number; lineInr: number }> = [];
    for (const raw of items) {
      const item = raw as { productId?: string; qty?: number; priceAtPurchase?: number | string } | null;
      if (!item || typeof item.productId !== 'string' || !productIds.has(item.productId)) continue;
      const qty = Number(item.qty ?? 0);
      const price = Number(item.priceAtPurchase ?? 0);
      const lineInr = qty * price;
      revenue += lineInr;
      lines.push({ productId: item.productId, qty, lineInr });
    }
    return { revenue, lines };
  }

  // ─── GET /dashboard ─────────────────────────────────────────────────────────

  server.get('/dashboard', { preHandler: [authenticateUser] }, async (request, reply) => {
    const roles = request.currentUser!.roles ?? [];
    if (!roles.includes('STORE_OWNER')) {
      return reply.code(403).send({ error: 'STORE_OWNER role required' });
    }
    const storeProfileId = await resolveStoreProfileId(request.currentUser!.id);
    if (!storeProfileId) {
      return reply.send({
        stats: { todaySales: 0, todayOrders: 0, monthSales: 0, lowStock: 0, pendingShipments: 0 },
        recentOrders: [],
      });
    }
    const products = await prisma.storeProduct.findMany({
      where: { storeProfileId },
      select: { id: true, stock: true },
    });
    const productIds = new Set(products.map((p) => p.id));
    const lowStock = products.filter((p) => p.stock <= 5).length;

    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Only PAID-ish orders (not PENDING/CANCELLED/REFUNDED) count toward sales.
    const orders = await prisma.storeOrder.findMany({
      where: {
        status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] },
        createdAt: { gte: monthStart },
      },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { fullName: true } } },
    });

    let todaySales = 0;
    let todayOrders = 0;
    let monthSales = 0;
    let pendingShipments = 0;
    const recentOrders: Array<{
      id: string;
      customer: string;
      amount: number;
      status: string;
      createdAt: Date;
    }> = [];

    for (const o of orders) {
      const { revenue } = attributeOrderToStore(o.items, productIds);
      if (revenue === 0) continue;
      monthSales += revenue;
      if (o.createdAt >= dayStart) {
        todaySales += revenue;
        todayOrders += 1;
      }
      if (o.status === 'CONFIRMED' || o.status === 'PROCESSING') pendingShipments += 1;
      if (recentOrders.length < 10) {
        recentOrders.push({
          id: o.orderNumber,
          customer: o.user?.fullName ?? 'Customer',
          amount: revenue,
          status: o.status,
          createdAt: o.createdAt,
        });
      }
    }

    return reply.send({
      stats: {
        todaySales: Math.round(todaySales),
        todayOrders,
        monthSales: Math.round(monthSales),
        lowStock,
        pendingShipments,
      },
      recentOrders,
    });
  });

  // ─── GET /reviews ───────────────────────────────────────────────────────────

  server.get('/reviews', { preHandler: [authenticateUser] }, async (request, reply) => {
    const roles = request.currentUser!.roles ?? [];
    if (!roles.includes('STORE_OWNER')) {
      return reply.code(403).send({ error: 'STORE_OWNER role required' });
    }
    const storeProfileId = await resolveStoreProfileId(request.currentUser!.id);
    if (!storeProfileId) return reply.send({ reviews: [] });
    const products = await prisma.storeProduct.findMany({
      where: { storeProfileId },
      select: { id: true, name: true },
    });
    const productMap = new Map(products.map((p) => [p.id, p.name]));
    const reviews = await prisma.review.findMany({
      where: {
        providerType: 'STORE',
        OR: [
          { productId: { in: products.map((p) => p.id) } },
          { providerId: request.currentUser!.id },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    // Fetch usernames in one query rather than per-review.
    const userIds = Array.from(new Set(reviews.map((r) => r.userId)));
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, fullName: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u.fullName]));
    return reply.send({
      reviews: reviews.map((r) => ({
        id: r.id,
        productName: r.productId ? productMap.get(r.productId) ?? null : null,
        customer: userMap.get(r.userId) ?? 'Customer',
        rating: r.rating,
        comment: r.comment ?? null,
        createdAt: r.createdAt,
        status: 'published',
      })),
    });
  });

  // ─── GET /revenue ───────────────────────────────────────────────────────────

  server.get('/revenue', { preHandler: [authenticateUser] }, async (request, reply) => {
    const roles = request.currentUser!.roles ?? [];
    if (!roles.includes('STORE_OWNER')) {
      return reply.code(403).send({ error: 'STORE_OWNER role required' });
    }
    const storeProfileId = await resolveStoreProfileId(request.currentUser!.id);
    if (!storeProfileId) {
      return reply.send({ topProducts: [], totals: { todayInr: 0, monthInr: 0, yearInr: 0 } });
    }
    const products = await prisma.storeProduct.findMany({
      where: { storeProfileId },
      select: { id: true, name: true },
    });
    const productIds = new Set(products.map((p) => p.id));
    const productNameMap = new Map(products.map((p) => [p.id, p.name]));

    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const orders = await prisma.storeOrder.findMany({
      where: {
        status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] },
        createdAt: { gte: yearStart },
      },
      select: { items: true, createdAt: true },
    });

    let todayInr = 0;
    let monthInr = 0;
    let yearInr = 0;
    const perProduct = new Map<string, { sold: number; revenueInr: number }>();

    for (const o of orders) {
      const { revenue, lines } = attributeOrderToStore(o.items, productIds);
      if (revenue === 0) continue;
      yearInr += revenue;
      if (o.createdAt >= monthStart) monthInr += revenue;
      if (o.createdAt >= dayStart) todayInr += revenue;
      for (const line of lines) {
        const acc = perProduct.get(line.productId) ?? { sold: 0, revenueInr: 0 };
        acc.sold += line.qty;
        acc.revenueInr += line.lineInr;
        perProduct.set(line.productId, acc);
      }
    }

    const topProducts = Array.from(perProduct.entries())
      .map(([id, v]) => ({
        id,
        name: productNameMap.get(id) ?? 'Product',
        sold: v.sold,
        revenueInr: Math.round(v.revenueInr),
      }))
      .sort((a, b) => b.revenueInr - a.revenueInr)
      .slice(0, 10);

    return reply.send({
      topProducts,
      totals: {
        todayInr: Math.round(todayInr),
        monthInr: Math.round(monthInr),
        yearInr: Math.round(yearInr),
      },
    });
  });
}
