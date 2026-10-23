import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { httpUrl } from '../lib/http-url.js';
import { prisma } from '../lib/prisma.js';
import { authenticateUser } from '../middlewares/auth.js';
import { goLive } from '../lib/go-live.js';

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
  imageUrl: httpUrl('imageUrl', 1000).optional(),
  category: z.string().max(80).optional(),
  stock: z.number().int().min(0).max(1_000_000).optional(),
  sku: z.string().max(120).optional(),
  isActive: z.boolean().optional(),
});
const productUpdateSchema = productCreateSchema.partial();

// S-07: store-owner self-setup. There was no endpoint anywhere that could
// create a StoreProfile, so an owner whose signup didn't happen to run the
// onboarding upsert was permanently unable to list anything — POST /products
// answered `400 {"error":"No StoreProfile for this user"}` forever. The store
// name is required and comes from the owner; we never invent a business name.
const storeProfileSchema = z.object({
  storeName: z.string().trim().min(2).max(150),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  gstNumber: z.string().max(20).optional(),
  categories: z.array(z.string().max(80)).max(20).optional(),
});

export const __testing = { productCreateSchema, productUpdateSchema, storeProfileSchema };

/**
 * The `:id` lookup both write verbs share.
 *
 * `store_products.id` is `@db.Uuid`, so an id that is not uuid-shaped reaches
 * Prisma, raises P2023 ("Error creating UUID"), and 500s the request — measured
 * on prod 2026-09-08, DELETE and PATCH /store-admin/products/not-a-uuid both
 * answered `500 INTERNAL_ERROR` while the absent-but-valid
 * 00000000-0000-0000-0000-000000000000 correctly 404'd. An id that cannot be a
 * uuid cannot match a uuid column, so this is a lookup that MISSES, and the
 * handlers' existing `!existing → 404` line is the right answer.
 *
 * routes/store-orders.ts fixed the same class the same way and reaches the same
 * outcome; it filters ids through a UUID_RE up front because it looks up a
 * whole basket at once and has to keep the good ids. With a single id there is
 * nothing to partition, so the verdict is taken from the column itself rather
 * than from a second copy of the uuid grammar. P2023 only — any other Prisma
 * error still propagates to the 5xx redactor (lib/error-redaction.ts).
 */
async function findProductById(id: string) {
  try {
    return await prisma.storeProduct.findUnique({ where: { id } });
  } catch (err) {
    if ((err as { code?: unknown } | null)?.code === 'P2023') return null;
    throw err;
  }
}

// Resolve the StoreProfile that belongs to the authenticated user. Returns
// null when the user has no profile — caller maps that to 400.
async function resolveStoreProfileId(userId: string): Promise<string | null> {
  const profile = await prisma.storeProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  return profile?.id ?? null;
}

/**
 * SCAL-04: the merchant catalogue page. The default is generous because the
 * store-admin page renders the full list client-side; the cap is what stops the
 * response being sized by the catalogue.
 */
const STORE_PRODUCTS_PAGE_SIZE = 200;
const STORE_PRODUCTS_MAX_LIMIT = 200;

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
  // ─── GET /profile ───────────────────────────────────────────────────────────
  // S-07: `null` means "you have not set your store up yet" — an honest state
  // the UI can act on, not a stub profile pretending one exists.

  server.get('/profile', { preHandler: [authenticateUser] }, async (request, reply) => {
    const roles = request.currentUser!.roles ?? [];
    if (!roles.includes('STORE_OWNER')) {
      return reply.code(403).send({ error: 'STORE_OWNER role required' });
    }
    const profile = await prisma.storeProfile.findUnique({
      where: { userId: request.currentUser!.id },
    });
    return reply.send({ profile: profile ?? null });
  });

  // ─── PUT /profile ───────────────────────────────────────────────────────────
  // Create-or-update. `approved` is not written here; goLive() activates the store
  // through onboardingService.activateOnSubmit, which is a no-op when
  // REQUIRE_PROVIDER_APPROVAL is set (a self-created store then waits for an admin).

  server.put('/profile', { preHandler: [authenticateUser] }, async (request, reply) => {
    const roles = request.currentUser!.roles ?? [];
    if (!roles.includes('STORE_OWNER')) {
      return reply.code(403).send({ error: 'STORE_OWNER role required' });
    }
    const parsed = storeProfileSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid input', details: parsed.error.flatten() });
    }
    const userId = request.currentUser!.id;
    const existing = await prisma.storeProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    const profile = existing
      ? await prisma.storeProfile.update({ where: { userId }, data: parsed.data })
      : await prisma.storeProfile.create({
          data: { userId, ...parsed.data, categories: parsed.data.categories ?? [] },
        });
    return reply.send({ profile: await goLive(userId, 'STORE_OWNER', profile, () => prisma.storeProfile.findUnique({ where: { userId } })) });
  });

  // ─── GET /products ──────────────────────────────────────────────────────────

  server.get('/products', { preHandler: [authenticateUser] }, async (request, reply) => {
    const roles = request.currentUser!.roles ?? [];
    if (!roles.includes('STORE_OWNER')) {
      return reply.code(403).send({ error: 'STORE_OWNER role required' });
    }
    const storeProfileId = await resolveStoreProfileId(request.currentUser!.id);
    // S-07: distinguish "no store set up" from "store set up, no products yet".
    // The page previously showed the same "Add your first product" empty state
    // for both, then failed the add with an internal string.
    if (!storeProfileId) return reply.send({ products: [], storeProfileMissing: true });
    // SCAL-04 (2026-08-19): no `select` and no `take` — one merchant's ENTIRE
    // catalogue, every column including the free-text `description`. Bounded by
    // one merchant, but unbounded in that merchant's success: the response grows
    // with the catalogue and nothing stops it. Now an explicit column list (the
    // exact set serializeProduct reads, nothing wider) and an explicit page.
    const pageSize = Math.min(
      Number((request.query as Record<string, unknown> | undefined)?.limit) ||
        STORE_PRODUCTS_PAGE_SIZE,
      STORE_PRODUCTS_MAX_LIMIT,
    );
    const pageNum = Math.max(
      1,
      Number((request.query as Record<string, unknown> | undefined)?.page) || 1,
    );
    const [products, total] = await Promise.all([
      prisma.storeProduct.findMany({
        // `deletedAt: null` and NOT `isActive: true` — isActive is the owner's
        // own listing toggle, so filtering on it would strand a deliberately
        // deactivated product where the owner can never switch it back on.
        where: { storeProfileId, deletedAt: null },
        select: {
          id: true,
          storeProfileId: true,
          name: true,
          description: true,
          price: true,
          imageUrl: true,
          category: true,
          stock: true,
          sku: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * pageSize,
        take: pageSize,
      }),
      // Same filter as the page above. A count without it is SCAL-09's lying
      // number again: `total` would promise rows the page can never show.
      prisma.storeProduct.count({ where: { storeProfileId, deletedAt: null } }),
    ]);
    // `products` stays the first key so the existing merchant page keeps
    // working; total/page/limit are additive. `total` is the paired COUNT, never
    // the page length (SCAL-09's lying number).
    return reply.send({
      products: products.map(serializeProduct),
      total,
      page: pageNum,
      limit: pageSize,
    });
  });

  // ─── POST /products ─────────────────────────────────────────────────────────

  server.post('/products', { preHandler: [authenticateUser] }, async (request, reply) => {
    const roles = request.currentUser!.roles ?? [];
    if (!roles.includes('STORE_OWNER')) {
      return reply.code(403).send({ error: 'STORE_OWNER role required' });
    }
    const storeProfileId = await resolveStoreProfileId(request.currentUser!.id);
    if (!storeProfileId) {
      // S-07: was `400 {"error":"No StoreProfile for this user"}`, rendered
      // verbatim to the owner by setError(err.message). Machine-readable code
      // + copy a human can act on; PUT /store-admin/profile is the way out.
      return reply.code(409).send({
        code: 'store_profile_required',
        error: 'Store setup incomplete',
        message:
          'Finish setting up your store — add your store name — before listing products.',
      });
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
    const existing = await findProductById(id);
    if (!existing) return reply.code(404).send({ error: 'Product not found' });
    if (existing.storeProfileId !== storeProfileId) {
      return reply.code(403).send({ error: 'You do not own this product.' });
    }
    // A deleted product is not editable. This lookup used to read the row with
    // findUnique and never consult `deletedAt`, so the same owner could PATCH a
    // deleted product back to `isActive:true, stock:5, price:1` — measured on
    // prod 2026-09-08, it returned 200 and the product reappeared on the PUBLIC
    // shelf (GET /store/products/live) at the new price while staying absent
    // from GET /store-admin/products, which does filter deletedAt. Buyable by
    // devotees, with no row in the owner's own catalogue to take it down again.
    // No attacker needed: two tabs on /store-admin/products, delete in one,
    // save an edit in the other. A row the reads cannot show, the writes must
    // not resurrect — hence 404, matching what a read already answers.
    if (existing.deletedAt) return reply.code(404).send({ error: 'Product not found' });
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
    const existing = await findProductById(id);
    if (!existing) return reply.code(404).send({ error: 'Product not found' });
    if (existing.storeProfileId !== storeProfileId) {
      return reply.code(403).send({ error: 'You do not own this product.' });
    }
    // Deliberately NOT short-circuited on an already-set `deletedAt`: re-running
    // the write is what re-unlists a row that the PATCH bug above already
    // resurrected (deletedAt set, isActive back to true), and prod rows in that
    // state predate the guard. A second DELETE stays `{ ok: true }` either way.
    //
    // Soft delete. `reviews.product_id` is ON DELETE CASCADE, so the previous
    // `storeProduct.delete()` destroyed every review BUYERS wrote about this
    // product — other devotees' content, deleted by the merchant.
    // account-deletion.service.ts already refuses to do that to this table.
    //
    // isActive:false + stock:0 is what makes it behave like a deletion
    // everywhere else without a second flag to check: routes/store.ts filters
    // the public catalogue on isActive, and routes/store-orders.ts rejects an
    // inactive product at checkout, so a deleted product cannot be seen or
    // bought. `deletedAt` is what hides it from the OWNER's catalogue — isActive
    // cannot, because the owner controls that one and must be able to unlist a
    // product and switch it back on.
    //
    // Keeping the row also stops historical revenue moving: the dashboard and
    // /revenue attribute order lines against products that still exist.
    await prisma.storeProduct.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false, stock: 0 },
    });
    return reply.send({ ok: true });
  });

  // Which ORDERS belong to this store is answered by the S-11 FK — the queries
  // below filter on `storeProfileId` directly. This walk answers the narrower
  // question the FK cannot: how much of an order's money is THIS store's, given
  // StoreOrder.items is Json [{ productId, qty, priceAtPurchase }] with no
  // per-line store column. Fine for early scale; revisit when order volume
  // justifies a denormalized store_order_lines table.
  //
  // Caveat, deliberately not papered over: it matches lines against products
  // that still EXIST, so a hard-deleted product's revenue silently leaves these
  // totals. Commission no longer depends on that (see store-commission.service),
  // but the dashboard figures still do.

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

  /**
   * SCAL-04 (2026-08-13): walk a store's orders in pages instead of one read.
   *
   * /dashboard loaded every order of the current month and /revenue a full
   * YEAR of them — `items` JSON included, and /dashboard also joined the buyer
   * row for every one — only to produce five scalars and a ten-row strip. The
   * totals cannot move into SQL: per-store revenue is attributed by walking the
   * `items` JSON against this store's product ids (attributeOrderToStore), so
   * the rows genuinely have to be read. What they must not do is all be
   * resident at once in a 512 MB container. Paging keeps peak memory at one
   * page for a store of any size while every order is still visited, so the
   * numbers are unchanged.
   *
   * `id` breaks ties in the sort so the cursor is stable when two orders share
   * a createdAt.
   */
  const ORDER_PAGE_SIZE = 200;

  async function walkStoreOrders<T extends { id: string }>(
    fetchPage: (cursor: string | undefined, take: number) => Promise<T[]>,
    visit: (order: T) => void,
  ): Promise<void> {
    let cursor: string | undefined;
    for (;;) {
      const page = await fetchPage(cursor, ORDER_PAGE_SIZE);
      if (page.length === 0) return;
      for (const order of page) visit(order);
      if (page.length < ORDER_PAGE_SIZE) return;
      cursor = page[page.length - 1]!.id;
    }
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
        stats: {
          todaySales: 0,
          todayOrders: 0,
          monthSales: 0,
          todayOnlineSales: 0,
          todayCodSales: 0,
          monthOnlineSales: 0,
          monthCodSales: 0,
          lowStock: 0,
          pendingShipments: 0,
        },
        recentOrders: [],
      });
    }
    const products = await prisma.storeProduct.findMany({
      where: { storeProfileId },
      select: { id: true, stock: true, deletedAt: true },
    });
    // The `where` stays unfiltered on purpose. `productIds` is what attributes
    // historical order lines to this store (attributeOrderToStore), so dropping
    // deleted rows here would move a deleted product's past revenue out of
    // todaySales/monthSales — the exact loss soft delete exists to prevent.
    // Only lowStock describes the CURRENT catalogue, so only lowStock filters.
    const productIds = new Set(products.map((p) => p.id));
    // Soft delete forces stock to 0, so an unfiltered count charges every
    // deletion to this number permanently and it only ever grows: measured on
    // prod 2026-09-08, an owner whose catalogue read `{"products":[],"total":0}`
    // was told `lowStock: 3` — a restock prompt for three products that no
    // longer exist.
    const lowStock = products.filter((p) => !p.deletedAt && p.stock <= 5).length;

    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Only PAID-ish orders (not PENDING/CANCELLED/REFUNDED) count toward sales.
    // P0 #S-15 (2026-07-09): scope to THIS store's orders. The old query had no
    // storeProfileId filter, so a store owner's dashboard aggregated every
    // store's sales on the platform (cross-vendor leak + wrong revenue).
    let todaySales = 0;
    let todayOrders = 0;
    let monthSales = 0;
    // An order with a captured payment is paid online and earns a commission
    // row; one without is cash-on-delivery, collected by the owner, with no
    // platform payout. Same signal writeStoreOrderCommission(requirePayment) uses.
    let todayOnlineSales = 0;
    let todayCodSales = 0;
    let monthOnlineSales = 0;
    let monthCodSales = 0;
    let pendingShipments = 0;
    const recentOrders: Array<{
      id: string;
      customer: string;
      amount: number;
      status: string;
      createdAt: Date;
      userId: string;
    }> = [];

    await walkStoreOrders(
      (cursor, take) =>
        prisma.storeOrder.findMany({
          where: {
            storeProfileId,
            status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] },
            createdAt: { gte: monthStart },
          },
          // The buyer's name is only needed for the ten rows that survive into
          // `recentOrders`; joining it for every order of the month was a row
          // of user data per order for nothing.
          select: {
            id: true,
            orderNumber: true,
            items: true,
            status: true,
            createdAt: true,
            userId: true,
            paymentId: true,
          },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        }),
      (o) => {
        const { revenue } = attributeOrderToStore(o.items, productIds);
        if (revenue === 0) return;
        const online = Boolean(o.paymentId);
        monthSales += revenue;
        if (online) monthOnlineSales += revenue;
        else monthCodSales += revenue;
        if (o.createdAt >= dayStart) {
          todaySales += revenue;
          todayOrders += 1;
          if (online) todayOnlineSales += revenue;
          else todayCodSales += revenue;
        }
        if (o.status === 'CONFIRMED' || o.status === 'PROCESSING') pendingShipments += 1;
        if (recentOrders.length < 10) {
          recentOrders.push({
            id: o.orderNumber,
            customer: 'Customer',
            amount: revenue,
            status: o.status,
            createdAt: o.createdAt,
            userId: o.userId,
          });
        }
      },
    );

    // One lookup for the at-most-ten buyers actually shown.
    if (recentOrders.length > 0) {
      const buyers = await prisma.user.findMany({
        where: { id: { in: Array.from(new Set(recentOrders.map((o) => o.userId))) } },
        select: { id: true, fullName: true },
      });
      const nameById = new Map(buyers.map((b) => [b.id, b.fullName] as const));
      for (const o of recentOrders) o.customer = nameById.get(o.userId) ?? 'Customer';
    }

    return reply.send({
      stats: {
        todaySales: Math.round(todaySales),
        todayOrders,
        monthSales: Math.round(monthSales),
        // Additive split: todaySales/monthSales above stay the combined figure.
        todayOnlineSales: Math.round(todayOnlineSales),
        todayCodSales: Math.round(todayCodSales),
        monthOnlineSales: Math.round(monthOnlineSales),
        monthCodSales: Math.round(monthCodSales),
        lowStock,
        pendingShipments,
      },
      // `userId` is a join key, not part of the contract — the payload shape
      // stays exactly what the store dashboard already consumes.
      recentOrders: recentOrders.map(({ userId: _userId, ...row }) => row),
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
      return reply.send({
        topProducts: [],
        totals: { todayInr: 0, monthInr: 0, yearInr: 0 },
        onlinePaid: { todayInr: 0, monthInr: 0, yearInr: 0 },
        cashOnDelivery: { todayInr: 0, monthInr: 0, yearInr: 0 },
      });
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

    let todayInr = 0;
    let monthInr = 0;
    let yearInr = 0;
    const online = { todayInr: 0, monthInr: 0, yearInr: 0 };
    const cod = { todayInr: 0, monthInr: 0, yearInr: 0 };
    const perProduct = new Map<string, { sold: number; revenueInr: number }>();

    // SCAL-04: a full year of orders, paged — see walkStoreOrders.
    await walkStoreOrders(
      (cursor, take) =>
        prisma.storeOrder.findMany({
          where: {
            // P0 #S-15: scope to this store (see dashboard orders query above).
            storeProfileId,
            status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] },
            createdAt: { gte: yearStart },
          },
          select: { id: true, items: true, createdAt: true, paymentId: true },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        }),
      (o) => {
        const { revenue, lines } = attributeOrderToStore(o.items, productIds);
        if (revenue === 0) return;
        yearInr += revenue;
        const bucket = o.paymentId ? online : cod;
        bucket.yearInr += revenue;
        if (o.createdAt >= monthStart) {
          monthInr += revenue;
          bucket.monthInr += revenue;
        }
        if (o.createdAt >= dayStart) {
          todayInr += revenue;
          bucket.todayInr += revenue;
        }
        for (const line of lines) {
          const acc = perProduct.get(line.productId) ?? { sold: 0, revenueInr: 0 };
          acc.sold += line.qty;
          acc.revenueInr += line.lineInr;
          perProduct.set(line.productId, acc);
        }
      },
    );

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
      // Additive split of `totals`. Online-paid sales earn a commission row and
      // are payable by the platform; cash-on-delivery sales were collected by the
      // owner directly and never appear in payouts.
      onlinePaid: {
        todayInr: Math.round(online.todayInr),
        monthInr: Math.round(online.monthInr),
        yearInr: Math.round(online.yearInr),
      },
      cashOnDelivery: {
        todayInr: Math.round(cod.todayInr),
        monthInr: Math.round(cod.monthInr),
        yearInr: Math.round(cod.yearInr),
      },
    });
  });
}
