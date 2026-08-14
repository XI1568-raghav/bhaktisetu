import { Prisma, ContentType, Language } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { clampLimit, clampPage } from '../lib/pagination.js';

export interface ContentListParams {
  type?: string;
  deity?: string;
  language?: string;
  isPremium?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export class ContentService {
  /**
   * Paginated list of content items with filters.
   */
  async findAll(params: ContentListParams) {
    const {
      type,
      deity,
      language,
      isPremium,
      search,
      page = 1,
      limit = 20,
    } = params;

    const where: Prisma.ContentItemWhereInput = {
      status: 'published',
    };

    if (type) {
      where.type = type as ContentType;
    }
    if (deity) {
      where.deity = { contains: deity, mode: 'insensitive' };
    }
    if (language) {
      where.language = language as Language;
    }
    if (isPremium !== undefined) {
      where.isPremium = isPremium;
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { body: { contains: search, mode: 'insensitive' } },
        { tags: { has: search.toLowerCase() } },
      ];
    }

    // RES-12: `?page=-1` used to reach Prisma as a negative OFFSET and return
    // HTTP 500 "Failed to fetch content". A page is an ordinal — clamp it.
    const safePage = clampPage(page);
    const safeLimit = clampLimit(limit);
    const skip = (safePage - 1) * safeLimit;

    const [content, total] = await Promise.all([
      prisma.contentItem.findMany({
        where,
        select: {
          id: true,
          type: true,
          title: true,
          titleLocal: true,
          slug: true,
          body: true,
          deity: true,
          language: true,
          durationSeconds: true,
          tags: true,
          isPremium: true,
          viewCount: true,
          likeCount: true,
          imageUrl: true,
          audioUrl: true,
          videoUrl: true,
          status: true,
          publishedAt: true,
        },
        orderBy: [{ sortOrder: 'asc' }, { viewCount: 'desc' }],
        skip,
        take: safeLimit,
      }),
      prisma.contentItem.count({ where }),
    ]);

    return {
      data: content,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  /**
   * Get a content item by slug and increment its view count.
   */
  async findBySlug(slug: string) {
    const item = await prisma.contentItem.findUnique({
      where: { slug },
    });

    if (!item || item.status !== 'published') {
      return null;
    }

    // Increment view count (fire and forget)
    prisma.contentItem
      .update({
        where: { id: item.id },
        data: { viewCount: { increment: 1 } },
      })
      .catch(() => {
        // Silently ignore view count increment errors
      });

    return {
      ...item,
      viewCount: item.viewCount + 1, // Return the incremented count
    };
  }

  /**
   * Get curated daily content picks based on the current date.
   * Returns one item of each major type (aarti, mantra, chalisa, article).
   */
  async getDailyContent(language?: string) {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];

    // Use the day-of-year as a seed to rotate daily picks deterministically
    const dayOfYear = Math.floor(
      (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) /
        (1000 * 60 * 60 * 24)
    );

    const langFilter: Prisma.ContentItemWhereInput = language
      ? { language: language as Language }
      : {};

    // Fetch one of each type, using sortOrder offset by day to rotate
    const [aarti, mantra, chalisa, article] = await Promise.all([
      prisma.contentItem.findFirst({
        where: { type: 'aarti', status: 'published', ...langFilter },
        orderBy: { sortOrder: 'asc' },
        skip: dayOfYear % (await prisma.contentItem.count({
          where: { type: 'aarti', status: 'published', ...langFilter },
        }) || 1),
      }),
      prisma.contentItem.findFirst({
        where: { type: 'mantra', status: 'published', ...langFilter },
        orderBy: { sortOrder: 'asc' },
        skip: dayOfYear % (await prisma.contentItem.count({
          where: { type: 'mantra', status: 'published', ...langFilter },
        }) || 1),
      }),
      prisma.contentItem.findFirst({
        where: { type: 'chalisa', status: 'published', ...langFilter },
        orderBy: { sortOrder: 'asc' },
        skip: dayOfYear % (await prisma.contentItem.count({
          where: { type: 'chalisa', status: 'published', ...langFilter },
        }) || 1),
      }),
      prisma.contentItem.findFirst({
        where: { type: 'article', status: 'published', ...langFilter },
        orderBy: { sortOrder: 'asc' },
        skip: dayOfYear % (await prisma.contentItem.count({
          where: { type: 'article', status: 'published', ...langFilter },
        }) || 1),
      }),
    ]);

    return {
      date: dateStr,
      language: language || 'hi',
      aarti,
      mantra,
      chalisa,
      article,
    };
  }

  /**
   * Full-text search across content title, body, and tags.
   */
  async search(
    query: string,
    params: { type?: string; language?: string; page?: number; limit?: number } = {}
  ) {
    const { type, language, page = 1, limit = 20 } = params;
    // RES-12: /content/search?page=-1 returned HTTP 500 before this clamp.
    const safePage = clampPage(page);
    const safeLimit = clampLimit(limit);

    if (!query || query.trim().length === 0) {
      return { results: [], total: 0, query, page: safePage, limit: safeLimit };
    }

    const where: Prisma.ContentItemWhereInput = {
      status: 'published',
      AND: [
        {
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { body: { contains: query, mode: 'insensitive' } },
            { tags: { has: query.toLowerCase() } },
            { deity: { contains: query, mode: 'insensitive' } },
          ],
        },
      ],
    };

    if (type) {
      where.type = type as ContentType;
    }
    if (language) {
      where.language = language as Language;
    }

    const skip = (safePage - 1) * safeLimit;

    const [results, total] = await Promise.all([
      prisma.contentItem.findMany({
        where,
        select: {
          id: true,
          type: true,
          title: true,
          titleLocal: true,
          slug: true,
          deity: true,
          language: true,
          durationSeconds: true,
          tags: true,
          isPremium: true,
          viewCount: true,
          likeCount: true,
          imageUrl: true,
          audioUrl: true,
          publishedAt: true,
        },
        orderBy: [{ viewCount: 'desc' }, { sortOrder: 'asc' }],
        skip,
        take: safeLimit,
      }),
      prisma.contentItem.count({ where }),
    ]);

    return {
      results,
      total,
      query,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  /**
   * Get all distinct content types that have published items.
   */
  async getCategories() {
    const categories = await prisma.contentItem.groupBy({
      by: ['type'],
      where: { status: 'published' },
      _count: { id: true },
      orderBy: { type: 'asc' },
    });

    return categories.map((c) => ({
      type: c.type,
      count: c._count.id,
    }));
  }
}

export const contentService = new ContentService();
