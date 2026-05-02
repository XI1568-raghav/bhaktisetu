import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticateUser, requireRole } from '../middlewares/auth.js';
import {
  listDrafts,
  updateDraftStatus,
  saveDraft,
  generateRedditPost,
  generateQuoraAnswer,
} from '../services/content-draft.service.js';
import { runContentSeed } from '../jobs/content-seed.js';

// Admin routes for the Reddit/Quora content draft queue.
// All gated behind ADMIN role. Reads + writes go through the
// content-draft.service which falls back to raw SQL when Prisma model
// isn't migrated yet.

const updateBodySchema = z.object({
  status: z.enum(['APPROVED', 'POSTED', 'REJECTED']),
  postedUrl: z.string().url().optional(),
  rejectedReason: z.string().max(500).optional(),
  body: z.string().max(20_000).optional(),
  title: z.string().max(500).optional(),
});

const generateBodySchema = z.object({
  type: z.enum(['reddit', 'quora']),
  topic: z.string().min(5).max(500),
  target: z.string().min(2).max(120),
});

export async function adminContentQueueRoutes(server: FastifyInstance) {
  const adminPreHandlers = [authenticateUser, requireRole('admin')];

  // GET /admin/content-queue?status=DRAFT
  server.get<{ Querystring: { status?: string } }>(
    '/',
    { preHandler: adminPreHandlers },
    async (request) => {
      const status = request.query?.status;
      const drafts = await listDrafts(status);
      return { drafts };
    },
  );

  // POST /admin/content-queue/:id  — update status / edit body
  server.post<{ Params: { id: string } }>(
    '/:id',
    { preHandler: adminPreHandlers },
    async (request, reply) => {
      const parsed = updateBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() });
      }
      const ok = await updateDraftStatus(request.params.id, parsed.data.status, {
        postedUrl: parsed.data.postedUrl,
        rejectedReason: parsed.data.rejectedReason,
        body: parsed.data.body,
        title: parsed.data.title,
      });
      if (!ok) return reply.code(500).send({ error: 'Update failed' });
      return { ok: true };
    },
  );

  // POST /admin/content-queue/run — manually trigger one round of generation
  server.post('/run', { preHandler: adminPreHandlers }, async () => {
    const result = await runContentSeed(true);
    return result;
  });

  // POST /admin/content-queue/generate — single ad-hoc draft
  server.post('/generate', { preHandler: adminPreHandlers }, async (request, reply) => {
    const parsed = generateBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() });
    }
    if (parsed.data.type === 'reddit') {
      const draft = await generateRedditPost({
        subreddit: parsed.data.target,
        topic: parsed.data.topic,
      });
      if (!draft) return reply.code(503).send({ error: 'Generation failed (GROQ key?)' });
      await saveDraft({
        type: 'reddit',
        title: draft.title,
        body: `${draft.body}\n\n[suggested flair: ${draft.suggestedFlair}]`,
        target: draft.subreddit,
      });
      return { ok: true, draft };
    }
    const draft = await generateQuoraAnswer({
      question: parsed.data.topic,
      topic: parsed.data.target,
    });
    if (!draft) return reply.code(503).send({ error: 'Generation failed (GROQ key?)' });
    await saveDraft({
      type: 'quora',
      title: draft.title,
      body: draft.body,
      target: draft.topic,
    });
    return { ok: true, draft };
  });
}
