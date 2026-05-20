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
}
