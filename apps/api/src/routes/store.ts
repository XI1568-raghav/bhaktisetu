import { FastifyInstance } from 'fastify';
import { authenticateUser } from '../middlewares/auth.js';
import { storeService } from '../services/store.service.js';
import { prisma } from '../lib/prisma.js';

export async function storeRoutes(server: FastifyInstance) {
  // ─── GET /products ──────────────────────────────────────────────────────────

  server.get('/products', async (request, reply) => {
    const { collection, category, sort, page, limit, q } = request.query as {
      collection?: string;
      category?: string;
      sort?: string;
      page?: string;
      limit?: string;
      q?: string;
    };

    const result = storeService.getProducts({
      collection,
      category,
      sort,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      q,
    });

    // P2 #221: edge-cache the public product catalog list (was DYNAMIC → origin hit).
    reply.header('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=300');
    return result;
  });

  // ─── GET /products/:handle ──────────────────────────────────────────────────

  server.get('/products/:handle', async (request, reply) => {
    const { handle } = request.params as { handle: string };
    const product = storeService.getProductByHandle(handle);

    if (!product) {
      return reply.code(404).send({ error: 'Product not found.' });
    }

    return { product };
  });

  // ─── GET /collections ───────────────────────────────────────────────────────

  server.get('/collections', async (request, reply) => {
    const collections = storeService.getCollections();
    return { collections };
  });

  // ─── POST /cart ─────────────────────────────────────────────────────────────

  server.post('/cart', { preHandler: [authenticateUser] }, async (request, reply) => {
    const userId = request.currentUser!.id;
    const cart = storeService.getCart(userId);
    return { cart };
  });

  // ─── POST /cart/items ───────────────────────────────────────────────────────

  server.post('/cart/items', { preHandler: [authenticateUser] }, async (request, reply) => {
    try {
      const userId = request.currentUser!.id;
      const { productId, quantity } = request.body as {
        productId: string;
        quantity: number;
      };

      if (!productId) {
        return reply.code(400).send({ error: 'productId is required.' });
      }

      const cart = storeService.createCartItem(userId, productId, quantity ?? 1);
      return { message: 'Item added to cart.', cart };
    } catch (err: any) {
      reply.code(400).send({ error: err.message });
    }
  });

  // ─── PATCH /cart/items/:id ──────────────────────────────────────────────────

  server.patch('/cart/items/:id', { preHandler: [authenticateUser] }, async (request, reply) => {
    try {
      const userId = request.currentUser!.id;
      const { id } = request.params as { id: string };
      const { quantity } = request.body as { quantity: number };

      const cart = storeService.updateCartItem(userId, id, quantity);
      return { message: 'Cart item updated.', cart };
    } catch (err: any) {
      reply.code(400).send({ error: err.message });
    }
  });

  // ─── DELETE /cart/items/:id ─────────────────────────────────────────────────

  server.delete('/cart/items/:id', { preHandler: [authenticateUser] }, async (request, reply) => {
    try {
      const userId = request.currentUser!.id;
      const { id } = request.params as { id: string };

      const cart = storeService.removeCartItem(userId, id);
      return { message: 'Item removed from cart.', cart };
    } catch (err: any) {
      reply.code(400).send({ error: err.message });
    }
  });

  // ─── GET /cart ──────────────────────────────────────────────────────────────

  server.get('/cart', { preHandler: [authenticateUser] }, async (request, reply) => {
    const userId = request.currentUser!.id;
    const cart = storeService.getCart(userId);
    return { cart };
  });

  // ─── GET /reviews ───────────────────────────────────────────────────────────
  // Per-SKU reviews scoped to the authenticated store owner. Now joins on
  // Review.productId (migration 20260520020000) against store_products
  // owned by this owner's StoreProfile. Provider-level (STORE-typed)
  // reviews remain readable via the same query — a per-store review row
  // with productId=null still surfaces because the OR matches.
  server.get('/reviews', { preHandler: [authenticateUser] }, async (request, reply) => {
    const userId = request.currentUser!.id;
    const roles = request.currentUser!.roles ?? [];
    if (!roles.includes('STORE_OWNER')) {
      return reply.code(403).send({ error: 'STORE_OWNER role required' });
    }
    const storeProfile = await prisma.storeProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    // Pull SKU ids upfront so the main query stays a single roundtrip
    // with a simple IN filter (Prisma can't express "join then filter on
    // parent column" in one go without raw SQL).
    const productIds = storeProfile
      ? (await prisma.storeProduct.findMany({
          where: { storeProfileId: storeProfile.id },
          select: { id: true },
        })).map((p) => p.id)
      : [];
    const reviews = await prisma.review.findMany({
      where: {
        OR: [
          { providerId: userId, providerType: 'STORE' },
          ...(productIds.length > 0 ? [{ productId: { in: productIds } }] : []),
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        product: { select: { id: true, name: true } },
      },
    });
    return reply.send({
      reviews: reviews.map((r) => ({
        id: r.id,
        userId: r.userId,
        providerId: r.providerId,
        providerType: r.providerType,
        productId: r.productId,
        productName: r.product?.name ?? null,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt.toISOString(),
      })),
      total: reviews.length,
    });
  });

  // ─── POST /cart/checkout ────────────────────────────────────────────────────

  server.post('/cart/checkout', { preHandler: [authenticateUser] }, async (request, reply) => {
    const userId = request.currentUser!.id;
    const body = request.body as {
      addressId: string;
      paymentMethod: string;
    };

    const cart = storeService.getCart(userId);

    if (cart.itemCount === 0) {
      return reply.code(400).send({ error: 'Cart is empty.' });
    }

    // MVP: return a checkout summary (actual payment integration later)
    return {
      order: {
        id: `ORD-${Date.now()}`,
        status: 'pending_payment',
        items: cart.items.map((i) => ({
          productId: i.productId,
          title: i.product.title,
          quantity: i.quantity,
          price: i.product.price,
          subtotal: i.subtotal,
        })),
        subtotal: cart.subtotal,
        deliveryFee: cart.deliveryFee,
        tax: cart.tax,
        total: cart.total,
        currency: cart.currency,
        addressId: body.addressId,
        paymentMethod: body.paymentMethod,
      },
    };
  });

}
