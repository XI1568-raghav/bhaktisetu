import { FastifyInstance } from 'fastify';
import { notHiddenReviewWhere } from '../lib/review-moderation.js';
import { authenticateUser } from '../middlewares/auth.js';
import {
  storeService,
  presentLiveProduct,
  STORE_PRODUCT_ID_RE,
  type Product,
} from '../services/store.service.js';
import { prisma } from '../lib/prisma.js';

/**
 * The real, orderable catalogue: `store_products` rows a seller has listed,
 * mapped into the same card shape the fixtures use.
 *
 * COM-01: this is the ONLY source of a product id that POST /store/orders can
 * resolve, which is why the public list below merges it in rather than leaving
 * it on a separate endpoint nothing but /store/products/live called. The
 * filters match /products/live exactly (active, in stock) so the two cannot
 * disagree about what is for sale.
 *
 * NEVER throws. The public catalogue must not 500 because the database blinked
 * — it degrades to fixtures, which are browse-only and say so, so a degraded
 * response is honest rather than merely non-empty.
 */
async function loadLiveCatalogue(limit = 200): Promise<Product[]> {
  try {
    const rows = await prisma.storeProduct.findMany({
      where: { isActive: true, stock: { gt: 0 }, storeProfile: { approved: true } },
      include: { storeProfile: { select: { storeName: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.map(presentLiveProduct);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[store] live catalogue lookup failed; serving fixtures only', err);
    return [];
  }
}

/**
 * One seller product by its `StoreProduct` id, or undefined.
 *
 * Applies the SAME availability filter as the list (`isActive`, `stock > 0`),
 * so a deactivated or sold-out listing cannot be added to a basket that the
 * order route would then refuse — the catalogue, the basket and the order path
 * agreeing is the whole point of COM-01.
 */
async function loadLiveProductById(id: string): Promise<Product | undefined> {
  try {
    const row = await prisma.storeProduct.findFirst({
      where: { id, isActive: true, stock: { gt: 0 }, storeProfile: { approved: true } },
      include: { storeProfile: { select: { storeName: true } } },
    });
    return row ? presentLiveProduct(row) : undefined;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[store] seller product lookup failed', err);
    return undefined;
  }
}

export async function storeRoutes(server: FastifyInstance) {
  // ─── GET /products/live ─── REAL store-owner products (cross-cutting P2) ───
  // The seller-only shelf, in the shape apps/web/lib/store-live.ts normalises
  // (flat `imageUrl` + `storeName`, which the merged /products shape does not
  // carry). Kept as its own endpoint for /store/products/live and the seller
  // pages.
  //
  // COM-01 update: its header used to read "store-owner products never surface
  // publicly … Phase 2 of full unification is in the plan." They do now —
  // GET /products merges these rows in, marked `buyable: true`, alongside the
  // fixtures marked `buyable: false`. That was the unification: not making the
  // fixtures orderable (nobody stocks them), but making the ONE catalogue state
  // which of its entries the order route can actually resolve.
  server.get('/products/live', async (request, reply) => {
    const { category, q, limit } = request.query as {
      category?: string;
      q?: string;
      limit?: string;
    };
    const rows = await prisma.storeProduct.findMany({
      where: {
        isActive: true,
        stock: { gt: 0 },
        // Role pass 2026-10-07: a self-created store stays unapproved until a
        // human reviews it (store-admin PUT /profile), so its products are not
        // on the public shelf and cannot be bought yet.
        storeProfile: { approved: true },
        ...(category ? { category: { equals: category, mode: 'insensitive' as const } } : {}),
        ...(q ? { name: { contains: q, mode: 'insensitive' as const } } : {}),
      },
      include: { storeProfile: { select: { storeName: true } } },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Number(limit) || 100, 200),
    });
    const products = rows.map((p) => ({
      id: p.id,
      handle: p.id, // PDP by id until a slug/handle column is added
      title: p.name,
      description: p.description,
      price: Number(p.price),
      compareAtPrice: null, // owner products have no compare-at price yet
      category: p.category ?? 'General',
      imageUrl: p.imageUrl,
      stock: p.stock,
      sku: p.sku,
      storeName: p.storeProfile.storeName,
      source: 'live',
      // COM-01: the same two fields every entry on GET /products now carries.
      // These rows are the ONLY ones POST /store/orders can resolve, so on this
      // endpoint they are constant — stated rather than implied, so no client
      // has to infer buyability from the shape of an id.
      buyable: true,
      unavailableReason: null,
    }));
    reply.header('Cache-Control', 'public, max-age=30, s-maxage=120, stale-while-revalidate=120');
    return { products, total: products.length, source: 'live' };
  });

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

    // COM-01: the public catalogue is fixtures AND real seller rows, in one
    // list, with `source`/`buyable`/`unavailableReason` on every entry. Before
    // this, /products served only the fixtures — 24 items with `prod_NNN` ids
    // that POST /store/orders answers `400 Unknown product` for — so every
    // product a shopper could see was unorderable, on web and mobile alike,
    // while the only orderable rows sat behind /products/live which no
    // shopper-facing page except one directory ever called.
    const live = await loadLiveCatalogue();
    const result = storeService.getProducts(
      {
        collection,
        category,
        sort,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        q,
      },
      live,
    );

    // P2 #221: edge-cache the public product catalog list (was DYNAMIC → origin hit).
    // Seller stock moves without a deploy, so this list is now only as fresh as
    // its shortest cache — 60s matches /products/live's own budget closely
    // enough that the grid and the seller shelf do not visibly disagree.
    reply.header('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=300');
    return {
      ...result,
      // Counts a client can act on without re-deriving them from the page it
      // happens to be looking at.
      buyableTotal: live.length,
      browseOnlyTotal: result.total - live.length,
    };
  });

  // ─── GET /products/:handle ──────────────────────────────────────────────────

  server.get('/products/:handle', async (request, reply) => {
    const { handle } = request.params as { handle: string };
    // COM-01: resolve BOTH keyspaces here, so the detail page can never
    // disagree with the grid about whether an item exists or can be bought.
    // A seller row's handle is its StoreProduct uuid (no slug column yet).
    const product = storeService.getProductByHandle(handle, await loadLiveCatalogue());

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

      // COM-01: resolve a uuid-shaped id against store_products before handing
      // it to the (prisma-free) service, so the basket can hold real seller
      // inventory and not only the hand-written fixtures. Uuid-shaped but
      // absent → `resolved` stays undefined and the service answers the same
      // "Product not found." it always did.
      const resolved = STORE_PRODUCT_ID_RE.test(productId)
        ? await loadLiveProductById(productId)
        : undefined;
      const cart = storeService.createCartItem(userId, productId, quantity ?? 1, resolved);
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
        ...(await notHiddenReviewWhere()),
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
