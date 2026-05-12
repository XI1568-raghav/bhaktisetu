import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticateUser } from '../middlewares/auth.js';
import { aiService } from '../services/ai.service.js';
import { canSendMessage, recordMessage, getUsageSummary } from '../lib/ai-usage.js';

// AI chat hits Groq (paid). A logged-out attacker hammering this endpoint
// at the global 100/min would burn Groq quota fast. 20/min/IP allows a
// real user to ask several questions per minute while choking abuse.
const aiChatRateLimit = {
  config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
};

const chatBodySchema = z.object({
  message: z.string().trim().min(1, 'Message is required').max(2000, 'Message too long. Maximum 2000 characters.'),
  conversationId: z.string().optional(),
  language: z.string().min(2).max(10).optional(),
});

// /recommend-puja, /generate-sankalp, /translate previously cast request.body
// raw — no length caps, no type checks. Public endpoints → trivial DoS via
// 10MB JSON or wrong-typed fields blowing up Groq prompt assembly.
const recommendPujaSchema = z.object({
  lifeEvent: z.string().trim().max(200).optional(),
  rashi: z.string().trim().max(40).optional(),
  nakshatra: z.string().trim().max(40).optional(),
  language: z.string().trim().min(2).max(10).optional(),
});

const sankalpSchema = z.object({
  devoteeName: z.string().trim().min(1).max(120),
  gotra: z.string().trim().max(80).optional(),
  pujaName: z.string().trim().min(1).max(120),
  deity: z.string().trim().min(1).max(80),
  date: z.string().trim().max(40).optional(),
  city: z.string().trim().max(80).optional(),
  purpose: z.string().trim().max(500).optional(),
  additionalNames: z.array(z.string().trim().max(120)).max(20).optional(),
});

const translateSchema = z.object({
  text: z.string().trim().min(1).max(5000),
  sourceLanguage: z.string().trim().min(2).max(10),
  targetLanguage: z.string().trim().min(2).max(10),
});

export async function aiRoutes(server: FastifyInstance) {
  // ─── POST /chat — Streaming SSE chat response ──────────────────────────────
  // Auth is optional. Logged-in users get conversation history persisted;
  // anonymous users (Ask Pandit on the public site) still get full streaming
  // answers — they just don't accumulate a history.

  server.post('/chat', aiChatRateLimit, async (request, reply) => {
    // Best-effort auth: if a Bearer token is present, populate currentUser
    // so demo / real users get history. If absent or invalid, fall through
    // and treat as anonymous (synthetic id `anon-<random>` so DB writes are
    // bypassed by the demo-/anon- guard in ai.service.ts).
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        await authenticateUser(request, reply);
      } catch {
        // ignore — user remains anonymous
      }
    }

    const parsed = chatBodySchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Invalid request body',
        details: parsed.error.flatten(),
      });
    }
    const { message, conversationId, language } = parsed.data;

    const userId = request.currentUser?.id ?? `anon-${Date.now().toString(36)}`;

    // ─── M3 paywall — usage gate ──────────────────────────────────────────
    // Logged-in users hit the per-tier counter. Anonymous users fall through
    // (canSendMessage short-circuits on the `anon-` prefix) so the public
    // Ask Pandit demo keeps working.
    const decision = await canSendMessage(userId);
    if (!decision.allowed) {
      return reply.status(402).send({
        error: 'limit_reached',
        plan: decision.plan,
        used: decision.used,
        limit: decision.limit,
        upgradeUrl: '/upgrade',
        message:
          decision.plan === 'free'
            ? `You've used all ${decision.limit} free messages this month. Upgrade for more.`
            : `You've used all ${decision.limit} messages in this session. Upgrade for unlimited.`,
      });
    }

    try {
      const { stream, conversationId: convId, citations, saveConversation } = await aiService.chat({
        userId,
        conversationId,
        message,
        language,
      });

      // SSE: write headers directly to the raw Node response
      // reply.header() doesn't flush for SSE since reply.send() is never called
      reply.hijack();
      const raw = reply.raw;
      raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
        'Access-Control-Allow-Origin': request.headers.origin || '*',
        'Access-Control-Allow-Credentials': 'true',
        'X-Conversation-Id': convId,
      });

      // Track client disconnect
      let clientDisconnected = false;
      request.raw.on('close', () => {
        clientDisconnected = true;
      });

      // Send initial metadata event
      raw.write(`data: ${JSON.stringify({ type: 'metadata', conversationId: convId, citations })}\n\n`);

      // Record this message against the user's usage counter. Fire-and-forget;
      // a counter write must never break the stream. Anonymous IDs no-op.
      recordMessage(userId).catch((err) => {
        server.log.warn({ err }, 'recordMessage failed');
      });

      // Stream the response
      let fullResponse = '';

      try {
        for await (const event of stream) {
          if (clientDisconnected) break;

          if (event.type === 'content_block_delta' && event.delta && 'text' in event.delta) {
            const text = event.delta.text;
            fullResponse += text;
            raw.write(`data: ${JSON.stringify({ type: 'text', content: text })}\n\n`);
          }
        }
      } catch (streamError) {
        server.log.error(streamError, 'Stream error');
        if (!clientDisconnected) {
          raw.write(`data: ${JSON.stringify({ type: 'error', message: 'Stream interrupted' })}\n\n`);
        }
      }

      // Send completion event
      if (!clientDisconnected) {
        raw.write(`data: ${JSON.stringify({ type: 'done', fullContent: fullResponse })}\n\n`);
        raw.end();
      }

      // Save conversation in background
      saveConversation(fullResponse).catch((err) => {
        server.log.error(err, 'Failed to save conversation');
      });

      // Return reply to prevent Fastify from auto-sending a response
      return reply;
    } catch (error: any) {
      server.log.error(error, 'Chat error');

      if (error.message === 'Conversation not found') {
        return reply.status(404).send({ error: 'Conversation not found' });
      }

      return reply.status(500).send({ error: 'Failed to process chat message' });
    }
  });

  // ─── GET /usage — Current message-quota state for logged-in user ───────────
  // Drives the in-chat indicator ("3 of 5 free messages this month").
  // Auth required — anonymous users have no quota to report.

  server.get('/usage', { preHandler: [authenticateUser] }, async (request) => {
    const userId = request.currentUser!.id;
    const summary = await getUsageSummary(userId);
    return summary;
  });

  // ─── GET /conversations — List user conversations ───────────────────────────

  server.get('/conversations', {
    preHandler: [authenticateUser],
  }, async (request, reply) => {
    const { page, limit } = request.query as { page?: string; limit?: string };
    const userId = request.currentUser!.id;

    try {
      const result = await aiService.listConversations(
        userId,
        Number(page) || 1,
        Math.min(Number(limit) || 20, 50),
      );

      return result;
    } catch (error) {
      server.log.error(error, 'Failed to list conversations');
      return reply.status(500).send({ error: 'Failed to list conversations' });
    }
  });

  // ─── GET /conversations/:id — Get a conversation ────────────────────────────

  server.get('/conversations/:id', {
    preHandler: [authenticateUser],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.currentUser!.id;

    try {
      const conversation = await aiService.getConversation(id, userId);

      if (!conversation) {
        return reply.status(404).send({ error: 'Conversation not found' });
      }

      return { conversation };
    } catch (error) {
      server.log.error(error, 'Failed to get conversation');
      return reply.status(500).send({ error: 'Failed to get conversation' });
    }
  });

  // ─── DELETE /conversations/:id — Delete a conversation ──────────────────────

  server.delete('/conversations/:id', {
    preHandler: [authenticateUser],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.currentUser!.id;

    try {
      const deleted = await aiService.deleteConversation(id, userId);

      if (!deleted) {
        return reply.status(404).send({ error: 'Conversation not found' });
      }

      return { success: true, message: 'Conversation deleted' };
    } catch (error) {
      server.log.error(error, 'Failed to delete conversation');
      return reply.status(500).send({ error: 'Failed to delete conversation' });
    }
  });

  // ─── POST /recommend-puja — Puja recommendations ───────────────────────────

  server.post('/recommend-puja', async (request, reply) => {
    const parsed = recommendPujaSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.status(400).send({ error: 'ValidationError', issues: parsed.error.flatten() });
    }
    const { lifeEvent, rashi, nakshatra, language } = parsed.data;

    try {
      const userId = request.currentUser?.id;

      const result = await aiService.recommendPujas({
        userId,
        lifeEvent,
        rashi,
        nakshatra,
        language,
      });

      return result;
    } catch (error) {
      server.log.error(error, 'Failed to recommend pujas');
      return reply.status(500).send({ error: 'Failed to generate puja recommendations' });
    }
  });

  // ─── POST /generate-sankalp — Sankalp generation ───────────────────────────
  // No auth required — sankalp is stateless content generation, available to
  // anonymous visitors during the booking flow.

  server.post('/generate-sankalp', async (request, reply) => {
    const parsed = sankalpSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.status(400).send({ error: 'ValidationError', issues: parsed.error.flatten() });
    }

    try {
      const result = await aiService.generateSankalp(parsed.data);
      return result;
    } catch (error) {
      server.log.error(error, 'Failed to generate sankalp');
      return reply.status(500).send({ error: 'Failed to generate sankalp' });
    }
  });

  // ─── GET /personalize-content — Personalized content ───────────────────────

  server.get('/personalize-content', async (request, reply) => {
    const { timeOfDay, date } = request.query as {
      timeOfDay?: string;
      date?: string;
    };

    try {
      const userId = request.currentUser?.id;

      const result = await aiService.personalizeContent({
        userId,
        timeOfDay,
        currentDate: date,
      });

      return result;
    } catch (error) {
      server.log.error(error, 'Failed to personalize content');
      return reply.status(500).send({ error: 'Failed to personalize content' });
    }
  });

  // ─── POST /translate — Translation ─────────────────────────────────────────

  server.post('/translate', async (request, reply) => {
    const parsed = translateSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.status(400).send({ error: 'ValidationError', issues: parsed.error.flatten() });
    }
    const { text, sourceLanguage, targetLanguage } = parsed.data;

    try {
      const translatedText = await aiService.translate({ text, sourceLanguage, targetLanguage });
      return { translatedText, sourceLanguage, targetLanguage };
    } catch (error) {
      server.log.error(error, 'Failed to translate');
      return reply.status(500).send({ error: 'Failed to translate text' });
    }
  });
}
