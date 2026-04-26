import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';

/**
 * Global search across temples, pujas, content (aartis/chalisas/mantras),
 * and yatras. Returns a single ranked list grouped by entity type so the
 * frontend can render section headers.
 */
export async function searchRoutes(server: FastifyInstance) {
  server.get('/', async (request, reply) => {
    const { q, limit } = (request.query ?? {}) as { q?: string; limit?: string };
    const trimmed = (q ?? '').trim();
    if (!trimmed || trimmed.length < 2) {
      return reply.send({
        query: trimmed,
        results: { temples: [], pujas: [], content: [], total: 0 },
      });
    }
    const cap = Math.min(parseInt(limit ?? '6', 10) || 6, 20);

    // Use case-insensitive contains across the most relevant fields per entity.
    // Results capped per category to keep responses small.
    const [temples, pujaTypes, contentItems] = await Promise.all([
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
    ]);

    const total = temples.length + pujaTypes.length + contentItems.length;

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
        total,
      },
    });
  });
}
