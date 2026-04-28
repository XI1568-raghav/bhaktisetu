import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticateUser } from '../middlewares/auth.js';
import { aiService } from '../services/ai.service.js';

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
    const { lifeEvent, rashi, nakshatra, language } = request.body as {
      lifeEvent?: string;
      rashi?: string;
      nakshatra?: string;
      language?: string;
    };

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
    const {
      devoteeName,
      gotra,
      pujaName,
      deity,
      date,
      city,
      purpose,
      additionalNames,
    } = request.body as {
      devoteeName?: string;
      gotra?: string;
      pujaName?: string;
      deity?: string;
      date?: string;
      city?: string;
      purpose?: string;
      additionalNames?: string[];
    };

    if (!devoteeName || !pujaName || !deity) {
      return reply.status(400).send({
        error: 'devoteeName, pujaName, and deity are required',
      });
    }

    try {
      const result = await aiService.generateSankalp({
        devoteeName,
        gotra,
        pujaName,
        deity,
        date,
        city,
        purpose,
        additionalNames,
      });

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
    const { text, sourceLanguage, targetLanguage } = request.body as {
      text?: string;
      sourceLanguage?: string;
      targetLanguage?: string;
    };

    if (!text || !sourceLanguage || !targetLanguage) {
      return reply.status(400).send({
        error: 'text, sourceLanguage, and targetLanguage are required',
      });
    }

    if (text.length > 5000) {
      return reply.status(400).send({ error: 'Text too long. Maximum 5000 characters.' });
    }

    try {
      const translatedText = await aiService.translate({
        text,
        sourceLanguage,
        targetLanguage,
      });

      return {
        translatedText,
        sourceLanguage,
        targetLanguage,
      };
    } catch (error) {
      server.log.error(error, 'Failed to translate');
      return reply.status(500).send({ error: 'Failed to translate text' });
    }
  });
}
