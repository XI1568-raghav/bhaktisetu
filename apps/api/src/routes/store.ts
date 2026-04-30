import { FastifyInstance } from 'fastify';
import { authenticateUser } from '../middlewares/auth.js';
import { storeService } from '../services/store.service.js';

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
