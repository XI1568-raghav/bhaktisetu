import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { authenticateUser } from '../middlewares/auth.js';
import {
  readingProgressUpsertSchema,
  readingProgressQuerySchema,
} from '@poojly/shared';

// Synthetic auth ids (demo-*, anon-*) cannot key Postgres uuid PK rows.
// Treat them as in-memory only — the API responds OK but persists nothing.
function isSyntheticUserId(id: string): boolean {
  return id.startsWith('demo-') || id.startsWith('anon-');
}

function dbDisabled(): boolean {
  return !process.env.DATABASE_URL;
}

export async function readingProgressRoutes(server: FastifyInstance) {
  server.addHook('preHandler', authenticateUser);

  /**
   * GET /api/v1/me/reading-progress
   * Returns all reading progress rows for the current user.
   * Returns [] when DATABASE_URL absent or user is synthetic.
   */
  server.get('/', async (request, reply) => {
    const userId = request.currentUser!.id;

    if (dbDisabled() || isSyntheticUserId(userId)) {
      return reply.code(200).send({ success: true, progress: [] });
    }

    const rows = await prisma.readingProgress.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });

    return reply.code(200).send({
      success: true,
      progress: rows.map((r) => ({
        bookSlug: r.bookSlug,
        chapterSlug: r.chapterSlug,
        chapterNumber: r.chapterNumber,
        scrollPercent: r.scrollPercent,
        lastVerse: r.lastVerse ?? undefined,
        updatedAt: r.updatedAt.toISOString(),
      })),
    });
  });

  /**
   * GET /api/v1/me/reading-progress/:bookSlug
   * Returns the progress row for one book (or null).
   */
  server.get<{ Params: { bookSlug: string } }>('/:bookSlug', async (request, reply) => {
    const userId = request.currentUser!.id;

    const parse = readingProgressQuerySchema.safeParse(request.params);
    if (!parse.success) {
      return reply.code(400).send({
        error: 'Bad Request',
        message: 'Invalid bookSlug',
        details: parse.error.flatten(),
      });
    }

    if (dbDisabled() || isSyntheticUserId(userId)) {
      return reply.code(200).send({ success: true, progress: null });
    }

    const row = await prisma.readingProgress.findUnique({
      where: { userId_bookSlug: { userId, bookSlug: parse.data.bookSlug } },
    });

    if (!row) {
      return reply.code(200).send({ success: true, progress: null });
    }

    return reply.code(200).send({
      success: true,
      progress: {
        bookSlug: row.bookSlug,
        chapterSlug: row.chapterSlug,
        chapterNumber: row.chapterNumber,
        scrollPercent: row.scrollPercent,
        lastVerse: row.lastVerse ?? undefined,
        updatedAt: row.updatedAt.toISOString(),
      },
    });
  });

  /**
   * PUT /api/v1/me/reading-progress
   * Upsert reading progress for the current user + bookSlug.
   */
  server.put('/', async (request, reply) => {
    const userId = request.currentUser!.id;

    const parse = readingProgressUpsertSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.code(400).send({
        error: 'Bad Request',
        message: 'Invalid reading progress payload',
        details: parse.error.flatten(),
      });
    }

    const data = parse.data;

    if (dbDisabled() || isSyntheticUserId(userId)) {
      return reply.code(200).send({
        success: true,
        skipped: true,
        progress: {
          ...data,
          updatedAt: new Date().toISOString(),
        },
      });
    }

    const row = await prisma.readingProgress.upsert({
      where: { userId_bookSlug: { userId, bookSlug: data.bookSlug } },
      create: {
        userId,
        bookSlug: data.bookSlug,
        chapterSlug: data.chapterSlug,
        chapterNumber: data.chapterNumber,
        scrollPercent: data.scrollPercent,
        lastVerse: data.lastVerse ?? null,
      },
      update: {
        chapterSlug: data.chapterSlug,
        chapterNumber: data.chapterNumber,
        scrollPercent: data.scrollPercent,
        lastVerse: data.lastVerse ?? null,
      },
    });

    return reply.code(200).send({
      success: true,
      progress: {
        bookSlug: row.bookSlug,
        chapterSlug: row.chapterSlug,
        chapterNumber: row.chapterNumber,
        scrollPercent: row.scrollPercent,
        lastVerse: row.lastVerse ?? undefined,
        updatedAt: row.updatedAt.toISOString(),
      },
    });
  });

  /**
   * DELETE /api/v1/me/reading-progress/:bookSlug
   * Removes a reading progress row.
   */
  server.delete<{ Params: { bookSlug: string } }>('/:bookSlug', async (request, reply) => {
    const userId = request.currentUser!.id;

    const parse = readingProgressQuerySchema.safeParse(request.params);
    if (!parse.success) {
      return reply.code(400).send({
        error: 'Bad Request',
        message: 'Invalid bookSlug',
        details: parse.error.flatten(),
      });
    }

    if (dbDisabled() || isSyntheticUserId(userId)) {
      return reply.code(200).send({ success: true, skipped: true });
    }

    await prisma.readingProgress
      .delete({ where: { userId_bookSlug: { userId, bookSlug: parse.data.bookSlug } } })
      .catch(() => null);

    return reply.code(200).send({ success: true });
  });
}

export const __testing = {
  isSyntheticUserId,
  dbDisabled,
};
