import { FastifyInstance } from 'fastify';
import { contentService } from '../services/content.service.js';

export async function contentRoutes(server: FastifyInstance) {
  // GET / - List content with filters (articles, mantras, stories, aarti, chalisa, etc.)
  server.get('/', async (request, reply) => {
    const { type, deity, language, isPremium, page, limit } = request.query as {
      type?: string;
      deity?: string;
      language?: string;
      isPremium?: string;
      page?: string;
      limit?: string;
    };

    try {
      const result = await contentService.findAll({
        type,
        deity,
        language,
        isPremium: isPremium !== undefined ? isPremium === 'true' : undefined,
        page: Number(page) || 1,
        limit: Math.min(Number(limit) || 20, 100),
      });

      return result;
    } catch (error) {
      server.log.error(error, 'Failed to list content');
      return reply.status(500).send({ error: 'Failed to fetch content' });
    }
  });

  // GET /daily - Get daily content (aarti, mantra, shloka of the day)
  server.get('/daily', async (request, reply) => {
    const { language } = request.query as { language?: string };

    try {
      const daily = await contentService.getDailyContent(language);
      return daily;
    } catch (error) {
      server.log.error(error, 'Failed to fetch daily content');
      return reply.status(500).send({ error: 'Failed to fetch daily content' });
    }
  });

  // GET /search - Search content
  server.get('/search', async (request, reply) => {
    const { q, type, language, page, limit } = request.query as {
      q?: string;
      type?: string;
      language?: string;
      page?: string;
      limit?: string;
    };

    try {
      const result = await contentService.search(q || '', {
        type,
        language,
        page: Number(page) || 1,
        limit: Math.min(Number(limit) || 20, 100),
      });

      return result;
    } catch (error) {
      server.log.error(error, 'Failed to search content');
      return reply.status(500).send({ error: 'Failed to search content' });
    }
  });

  // GET /categories - List content categories
  server.get('/categories', async (request, reply) => {
    try {
      const categories = await contentService.getCategories();
      return { categories };
    } catch (error) {
      server.log.error(error, 'Failed to fetch categories');
      return reply.status(500).send({ error: 'Failed to fetch categories' });
    }
  });

  // GET /:slug - Get content item by slug
  server.get('/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string };

    try {
      const content = await contentService.findBySlug(slug);

      if (!content) {
        return reply.status(404).send({ error: 'Content not found' });
      }

      return { content };
    } catch (error) {
      server.log.error(error, 'Failed to fetch content item');
      return reply.status(500).send({ error: 'Failed to fetch content item' });
    }
  });

  // POST /:id/like - Like/unlike a content item
  server.post('/:id/like', async (request, reply) => {
    const { id } = request.params as { id: string };
    // TODO: toggle like for current user on content item (requires auth)
    // For now, just increment the like count
    try {
      const { prisma } = await import('../lib/prisma.js');
      const item = await prisma.contentItem.update({
        where: { id },
        data: { likeCount: { increment: 1 } },
        select: { id: true, likeCount: true },
      });

      return {
        contentId: item.id,
        liked: true,
        totalLikes: item.likeCount,
      };
    } catch (error) {
      server.log.error(error, 'Failed to like content');
      return reply.status(500).send({ error: 'Failed to like content' });
    }
  });
}
