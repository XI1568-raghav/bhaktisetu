import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';

/**
 * Global search across temples, pujas, content (aartis/chalisas/mantras) and
 * store products. Returns results grouped by entity type so the frontend can
 * render section headers.
 *
 * CM-12: this used to say "and yatras". There is no yatra query here and no
 * Yatra model in the schema, so that was a promise the endpoint could not keep
 * — while the STORE half the finding explicitly asked for was genuinely
 * missing, leaving saleable products unreachable from the only search box on
 * the site. Guarded by src/routes/__tests__/search.test.ts.
 */
export async function searchRoutes(server: FastifyInstance) {
  server.get('/', async (request, reply) => {
    const { q, limit } = (request.query ?? {}) as { q?: string; limit?: string };
    const trimmed = (q ?? '').trim();
    if (!trimmed || trimmed.length < 2) {
      return reply.send({
        query: trimmed,
        results: { temples: [], pujas: [], content: [], products: [], total: 0 },
      });
    }
    const cap = Math.min(parseInt(limit ?? '6', 10) || 6, 20);

    // Use case-insensitive contains across the most relevant fields per entity.
    // Results capped per category to keep responses small.
    const [temples, pujaTypes, contentItems, products] = await Promise.all([
      prisma.temple.findMany({
        where: {
          OR: [
            { name: { contains: trimmed, mode: 'insensitive' } },
            { nameLocal: { contains: trimmed, mode: 'insensitive' } },
            { city: { contains: trimmed, mode: 'insensitive' } },
            { state: { contains: trimmed, mode: 'insensitive' } },
            { deityPrimary: { contains: trimmed, mode: 'insensitive' } },
          ],
          status: 'active',
        },
        take: cap,
        select: {
          id: true,
          slug: true,
          name: true,
          city: true,
          state: true,
          deityPrimary: true,
          images: true,
        },
      }),
      prisma.pujaType.findMany({
        where: {
          OR: [
            { name: { contains: trimmed, mode: 'insensitive' } },
            { nameLocal: { contains: trimmed, mode: 'insensitive' } },
            { description: { contains: trimmed, mode: 'insensitive' } },
            { deity: { contains: trimmed, mode: 'insensitive' } },
          ],
        },
        take: cap,
        select: {
          id: true,
          slug: true,
          name: true,
          deity: true,
          category: true,
          description: true,
        },
      }),
      prisma.contentItem.findMany({
        where: {
          OR: [
            { title: { contains: trimmed, mode: 'insensitive' } },
            { titleLocal: { contains: trimmed, mode: 'insensitive' } },
            { deity: { contains: trimmed, mode: 'insensitive' } },
            { tags: { has: trimmed.toLowerCase() } },
          ],
          status: 'published',
        },
        take: cap,
        select: {
          id: true,
          slug: true,
          title: true,
          titleLocal: true,
          type: true,
          deity: true,
        },
      }),
      // CM-12: the store bucket. Only active rows — a delisted product that
      // still answers a search is a dead end with a price on it.
      prisma.storeProduct.findMany({
        where: {
          OR: [
            { name: { contains: trimmed, mode: 'insensitive' } },
            { description: { contains: trimmed, mode: 'insensitive' } },
            { category: { contains: trimmed, mode: 'insensitive' } },
          ],
          isActive: true,
        },
        take: cap,
        select: {
          id: true,
          name: true,
          category: true,
          price: true,
          imageUrl: true,
        },
      }),
    ]);

    const total =
      temples.length + pujaTypes.length + contentItems.length + products.length;

    return reply.send({
      query: trimmed,
      results: {
        temples: temples.map((t) => ({
          id: t.id,
          slug: t.slug,
          name: t.name,
          subtitle: [t.city, t.state].filter(Boolean).join(', '),
          deity: t.deityPrimary,
          href: `/temples/${t.slug}`,
        })),
        pujas: pujaTypes.map((p) => ({
          id: p.id,
          slug: p.slug,
          name: p.name,
          subtitle: p.deity ?? p.category ?? '',
          href: `/pujas/${p.slug}`,
        })),
        content: contentItems.map((c) => ({
          id: c.id,
          slug: c.slug,
          name: c.title,
          subtitle: `${c.type}${c.deity ? ` · ${c.deity}` : ''}`,
          href: `/content/${c.slug}`,
        })),
        // StoreProduct has no slug. /store/<handle> is the STATIC catalogue in
        // apps/web/lib/products.ts and has no route for a DB row;
        // /store/seller/<id> is the page that renders one, so that is the only
        // href that resolves.
        products: products.map((p) => ({
          id: p.id,
          slug: p.id,
          name: p.name,
          subtitle: p.category ?? '',
          price: p.price != null ? Number(p.price) : null,
          imageUrl: p.imageUrl ?? null,
          href: `/store/seller/${p.id}`,
        })),
        total,
      },
    });
  });
}
