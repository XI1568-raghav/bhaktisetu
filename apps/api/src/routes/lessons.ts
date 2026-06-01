import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticateUser } from '../middlewares/auth.js';

function isSyntheticUserId(id: string): boolean {
  return id.startsWith('demo-') || id.startsWith('anon-');
}
function dbDisabled(): boolean { return !process.env.DATABASE_URL; }

const completeSchema = z.object({
  lessonId: z.string().min(1).max(64),
  score: z.number().int().min(0).max(100),
});

const BADGE_RULES: { key: string; predicate: (ctx: BadgeCtx) => boolean }[] = [
  { key: 'first-lesson',     predicate: (c) => c.lessonCount >= 1 },
  { key: 'lessons-10',       predicate: (c) => c.lessonCount >= 10 },
  { key: 'lessons-25',       predicate: (c) => c.lessonCount >= 25 },
  { key: 'lessons-50',       predicate: (c) => c.lessonCount >= 50 },
  { key: 'perfect-score',    predicate: (c) => c.score === 100 },
  { key: 'streak-3',         predicate: (c) => c.streakDays >= 3 },
  { key: 'streak-7',         predicate: (c) => c.streakDays >= 7 },
  { key: 'streak-30',        predicate: (c) => c.streakDays >= 30 },
];

interface BadgeCtx { lessonCount: number; score: number; streakDays: number; }

function todayUTC(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export async function lessonsRoutes(server: FastifyInstance) {
  server.addHook('preHandler', authenticateUser);

  server.get('/', async (request, reply) => {
    const userId = request.currentUser!.id;
    if (dbDisabled() || isSyntheticUserId(userId)) {
      return reply.send({ success: true, progress: [], streak: null, badges: [] });
    }
    const [progress, streak, badges] = await Promise.all([
      prisma.userLessonProgress.findMany({ where: { userId }, orderBy: { completedAt: 'desc' } }),
      prisma.userStreak.findUnique({ where: { userId } }),
      prisma.userBadge.findMany({ where: { userId }, orderBy: { earnedAt: 'desc' } }),
    ]);
    return reply.send({
      success: true,
      progress: progress.map((p) => ({ lessonId: p.lessonId, score: p.score, completedAt: p.completedAt.toISOString() })),
      streak: streak ? { currentDays: streak.currentDays, longestDays: streak.longestDays, lastActiveDay: streak.lastActiveDay.toISOString() } : null,
      badges: badges.map((b) => ({ key: b.badgeKey, earnedAt: b.earnedAt.toISOString() })),
    });
  });

  server.post('/complete', async (request, reply) => {
    const userId = request.currentUser!.id;
    const parse = completeSchema.safeParse(request.body);
    if (!parse.success) return reply.code(400).send({ error: 'Bad Request', details: parse.error.flatten() });

    if (dbDisabled() || isSyntheticUserId(userId)) {
      return reply.send({ success: true, skipped: true, newBadges: [], streak: { currentDays: 1, longestDays: 1, lastActiveDay: todayUTC().toISOString() } });
    }

    const { lessonId, score } = parse.data;
    const now = new Date();
    const today = todayUTC();

    await prisma.userLessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      create: { userId, lessonId, score, completedAt: now },
      update: { score: Math.max(score, 0), completedAt: now },
    });

    const existingStreak = await prisma.userStreak.findUnique({ where: { userId } });
    let currentDays = 1;
    let longestDays = 1;
    if (existingStreak) {
      const diff = daysBetween(new Date(Date.UTC(existingStreak.lastActiveDay.getUTCFullYear(), existingStreak.lastActiveDay.getUTCMonth(), existingStreak.lastActiveDay.getUTCDate())), today);
      if (diff === 0) {
        currentDays = existingStreak.currentDays;
        longestDays = existingStreak.longestDays;
      } else if (diff === 1) {
        currentDays = existingStreak.currentDays + 1;
        longestDays = Math.max(existingStreak.longestDays, currentDays);
      } else {
        currentDays = 1;
        longestDays = existingStreak.longestDays;
      }
    }
    const streak = await prisma.userStreak.upsert({
      where: { userId },
      create: { userId, currentDays, longestDays, lastActiveDay: today },
      update: { currentDays, longestDays, lastActiveDay: today },
    });

    const [lessonCount, existingBadges] = await Promise.all([
      prisma.userLessonProgress.count({ where: { userId } }),
      prisma.userBadge.findMany({ where: { userId }, select: { badgeKey: true } }),
    ]);
    const earned = new Set(existingBadges.map((b) => b.badgeKey));
    const ctx: BadgeCtx = { lessonCount, score, streakDays: currentDays };
    const newBadges = BADGE_RULES
      .filter((rule) => !earned.has(rule.key) && rule.predicate(ctx))
      .map((rule) => rule.key);
    if (newBadges.length > 0) {
      await prisma.userBadge.createMany({
        data: newBadges.map((badgeKey) => ({ userId, badgeKey })),
        skipDuplicates: true,
      }).catch(() => null);
    }

    return reply.send({
      success: true,
      newBadges,
      streak: { currentDays: streak.currentDays, longestDays: streak.longestDays, lastActiveDay: streak.lastActiveDay.toISOString() },
    });
  });
}

export const __testing = { BADGE_RULES, daysBetween, todayUTC };
