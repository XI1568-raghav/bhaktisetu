import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticateUser } from '../middlewares/auth.js';
import { notifyUser } from './notifications.js';

/**
 * Human-to-human conversations between devotees and providers (priest,
 * astrologer, wellness instructor, temple manager, gaushala manager,
 * store owner). Backs the post-payment service-delivery flow.
 *
 *   GET    /                          list my conversations
 *   POST   /                          create-or-get conversation
 *   GET    /:id                       conversation details
 *   GET    /:id/messages?since=<iso>  poll messages
 *   POST   /:id/messages              send a message
 *   POST   /:id/read                  mark all unread as read for current side
 *   POST   /:id/start-call            create a Jitsi room, post call_link msg
 *   POST   /:id/end-call/:callId      mark call ended
 */

type Side = 'devotee' | 'provider';

function sideFor(conv: { devoteeId: string; providerId: string }, userId: string): Side | null {
  if (conv.devoteeId === userId) return 'devotee';
  if (conv.providerId === userId) return 'provider';
  return null;
}

const createSchema = z.object({
  providerId: z.string().uuid(),
  kind: z.enum(['puja_booking', 'astrology', 'wellness', 'temple', 'gaushala', 'store_order', 'support']),
  linkedBookingId: z.string().uuid().optional(),
  subject: z.string().max(200).optional(),
  initialMessage: z.string().max(2000).optional(),
});

const sendSchema = z.object({
  body: z.string().min(1).max(4000),
});

// Per-user, per-conversation send rate limit. 60 messages / minute is plenty
// for a fast typer; well below any realistic abuse threshold. Prevents an
// authed user from filling a conversation with millions of rows or driving
// up the recipient's push-notification budget.
const SEND_RATE_WINDOW_MS = 60 * 1000;
const SEND_RATE_MAX = 60;
const sendBuckets = new Map<string, { count: number; windowStart: number }>();
function sendRateOk(userId: string, convId: string): boolean {
  const key = `${userId}:${convId}`;
  const now = Date.now();
  const b = sendBuckets.get(key);
  if (!b || now - b.windowStart > SEND_RATE_WINDOW_MS) {
    sendBuckets.set(key, { count: 1, windowStart: now });
    return true;
  }
  if (b.count >= SEND_RATE_MAX) return false;
  b.count += 1;
  return true;
}

export async function conversationRoutes(server: FastifyInstance) {
  server.addHook('preHandler', authenticateUser);

  // ── List my conversations ─────────────────────────────────────────
  server.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.currentUser!.id;
    const role = (request.query as { role?: string }).role ?? 'auto';

    const where = role === 'devotee'
      ? { devoteeId: userId }
      : role === 'provider'
      ? { providerId: userId }
      : { OR: [{ devoteeId: userId }, { providerId: userId }] };

    const rows = await prisma.chatConversation.findMany({
      where,
      orderBy: { lastMessageAt: 'desc' },
      take: 100,
      include: {
        devotee:  { select: { id: true, fullName: true, avatarUrl: true } },
        provider: { select: { id: true, fullName: true, avatarUrl: true } },
        messages: { take: 1, orderBy: { createdAt: 'desc' }, select: { body: true, kind: true, createdAt: true } },
      },
    });

    const conversations = rows.map((c) => {
      const side = sideFor(c, userId);
      const counterparty = side === 'devotee' ? c.provider : c.devotee;
      const unread = side === 'devotee' ? c.devoteeUnread : c.providerUnread;
      return {
        id: c.id,
        kind: c.kind,
        status: c.status,
        side,
        counterparty,
        linkedBookingId: c.linkedBookingId,
        subject: c.subject,
        unread,
        lastMessage: c.messages[0] ?? null,
        lastMessageAt: c.lastMessageAt,
        createdAt: c.createdAt,
      };
    });

    return reply.send({ conversations });
  });

  // ── Create-or-get conversation ────────────────────────────────────
  server.post('/', async (request, reply) => {
    const userId = request.currentUser!.id;
    const parsed = createSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ error: 'BadRequest', issues: parsed.error.issues });
    }
    const { providerId, kind, linkedBookingId, subject, initialMessage } = parsed.data;

    if (providerId === userId) {
      return reply.code(400).send({ error: 'BadRequest', message: 'Cannot chat with yourself.' });
    }

    // Devotee starts the chat — userId is the devotee, providerId is the other side.
    // (Provider-initiated chats are auto-created by the booking lifecycle hook.)
    const provider = await prisma.user.findUnique({ where: { id: providerId } });
    if (!provider) {
      return reply.code(404).send({ error: 'NotFound', message: 'Provider not found.' });
    }

    const existing = await prisma.chatConversation.findFirst({
      where: {
        devoteeId: userId,
        providerId,
        kind,
        ...(linkedBookingId ? { linkedBookingId } : {}),
        status: 'open',
      },
    });

    let conv = existing;
    if (!conv) {
      conv = await prisma.chatConversation.create({
        data: {
          devoteeId: userId,
          providerId,
          kind,
          linkedBookingId: linkedBookingId ?? null,
          subject: subject ?? null,
        },
      });
    }

    if (initialMessage) {
      await prisma.chatMessage.create({
        data: {
          conversationId: conv.id,
          senderId: userId,
          kind: 'text',
          body: initialMessage,
        },
      });
      await prisma.chatConversation.update({
        where: { id: conv.id },
        data: {
          lastMessageAt: new Date(),
          providerUnread: { increment: 1 },
        },
      });
      void notifyUser(providerId, {
        title: 'New message',
        body: initialMessage.slice(0, 120),
        url: `/messages/${conv.id}`,
      }).catch(() => undefined);
    }

    return reply.send({ conversationId: conv.id, created: !existing });
  });

  // ── Conversation details ──────────────────────────────────────────
  server.get('/:id', async (request, reply) => {
    const userId = request.currentUser!.id;
    const { id } = request.params as { id: string };
    const conv = await prisma.chatConversation.findUnique({
      where: { id },
      include: {
        devotee:  { select: { id: true, fullName: true, avatarUrl: true } },
        provider: { select: { id: true, fullName: true, avatarUrl: true } },
        calls:    { orderBy: { startedAt: 'desc' }, take: 5 },
      },
    });
    if (!conv) return reply.code(404).send({ error: 'NotFound' });
    const side = sideFor(conv, userId);
    if (!side) return reply.code(403).send({ error: 'Forbidden' });

    return reply.send({
      id: conv.id,
      kind: conv.kind,
      status: conv.status,
      side,
      counterparty: side === 'devotee' ? conv.provider : conv.devotee,
      linkedBookingId: conv.linkedBookingId,
      subject: conv.subject,
      unread: side === 'devotee' ? conv.devoteeUnread : conv.providerUnread,
      activeCall: conv.calls.find((c) => c.endedAt === null) ?? null,
      recentCalls: conv.calls,
      createdAt: conv.createdAt,
      lastMessageAt: conv.lastMessageAt,
    });
  });

  // ── Messages (poll) ───────────────────────────────────────────────
  server.get('/:id/messages', async (request, reply) => {
    const userId = request.currentUser!.id;
    const { id } = request.params as { id: string };
    const { since, limit = '50' } = (request.query ?? {}) as { since?: string; limit?: string };

    const conv = await prisma.chatConversation.findUnique({ where: { id } });
    if (!conv) return reply.code(404).send({ error: 'NotFound' });
    const side = sideFor(conv, userId);
    if (!side) return reply.code(403).send({ error: 'Forbidden' });

    const lim = Math.max(1, Math.min(200, Number(limit) || 50));
    const sinceDate = since ? new Date(since) : null;

    const msgs = await prisma.chatMessage.findMany({
      where: {
        conversationId: id,
        ...(sinceDate ? { createdAt: { gt: sinceDate } } : {}),
      },
      orderBy: { createdAt: 'asc' },
      take: lim,
      include: { sender: { select: { id: true, fullName: true, avatarUrl: true } } },
    });

    return reply.send({
      messages: msgs.map((m) => ({
        id: m.id,
        senderId: m.senderId,
        sender: m.sender,
        mine: m.senderId === userId,
        kind: m.kind,
        body: m.body,
        metadata: m.metadata,
        createdAt: m.createdAt,
      })),
      serverTime: new Date().toISOString(),
    });
  });

  // ── Send a message ────────────────────────────────────────────────
  server.post('/:id/messages', async (request, reply) => {
    const userId = request.currentUser!.id;
    const { id } = request.params as { id: string };
    const parsed = sendSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ error: 'BadRequest', issues: parsed.error.issues });
    }

    if (!sendRateOk(userId, id)) {
      return reply.code(429).send({
        error: 'TooManyRequests',
        message: 'Slow down — too many messages in a short window.',
      });
    }

    const conv = await prisma.chatConversation.findUnique({ where: { id } });
    if (!conv) return reply.code(404).send({ error: 'NotFound' });
    const side = sideFor(conv, userId);
    if (!side) return reply.code(403).send({ error: 'Forbidden' });
    if (conv.status === 'closed') {
      return reply.code(400).send({ error: 'BadRequest', message: 'Conversation is closed.' });
    }

    const msg = await prisma.chatMessage.create({
      data: {
        conversationId: id,
        senderId: userId,
        kind: 'text',
        body: parsed.data.body,
      },
    });

    // Increment the OTHER side's unread.
    await prisma.chatConversation.update({
      where: { id },
      data: {
        lastMessageAt: msg.createdAt,
        ...(side === 'devotee'
          ? { providerUnread: { increment: 1 } }
          : { devoteeUnread:  { increment: 1 } }),
      },
    });

    const otherUserId = side === 'devotee' ? conv.providerId : conv.devoteeId;
    void notifyUser(otherUserId, {
      title: `New message from ${request.currentUser!.fullName}`,
      body: parsed.data.body.slice(0, 120),
      url: `/messages/${id}`,
    }).catch(() => undefined);

    return reply.send({
      id: msg.id,
      kind: msg.kind,
      body: msg.body,
      createdAt: msg.createdAt,
    });
  });

  // ── Mark read ─────────────────────────────────────────────────────
  server.post('/:id/read', async (request, reply) => {
    const userId = request.currentUser!.id;
    const { id } = request.params as { id: string };
    const conv = await prisma.chatConversation.findUnique({ where: { id } });
    if (!conv) return reply.code(404).send({ error: 'NotFound' });
    const side = sideFor(conv, userId);
    if (!side) return reply.code(403).send({ error: 'Forbidden' });

    await prisma.chatConversation.update({
      where: { id },
      data: side === 'devotee' ? { devoteeUnread: 0 } : { providerUnread: 0 },
    });
    return reply.send({ ok: true });
  });

  // ── Start a call (Jitsi room) ────────────────────────────────────
  server.post('/:id/start-call', async (request, reply) => {
    const userId = request.currentUser!.id;
    const { id } = request.params as { id: string };
    const conv = await prisma.chatConversation.findUnique({ where: { id } });
    if (!conv) return reply.code(404).send({ error: 'NotFound' });
    const side = sideFor(conv, userId);
    if (!side) return reply.code(403).send({ error: 'Forbidden' });

    // Reuse an existing not-yet-ended call if one exists in the last 30 min.
    const recent = await prisma.chatCallSession.findFirst({
      where: {
        conversationId: id,
        endedAt: null,
        startedAt: { gte: new Date(Date.now() - 30 * 60 * 1000) },
      },
      orderBy: { startedAt: 'desc' },
    });
    if (recent) {
      return reply.send({ callId: recent.id, jitsiUrl: recent.jitsiUrl, roomName: recent.roomName, reused: true });
    }

    const roomName = `darshya-${conv.kind}-${randomBytes(16).toString('hex')}`;
    const jitsiUrl = `https://meet.jit.si/${roomName}`;

    const call = await prisma.chatCallSession.create({
      data: { conversationId: id, roomName, jitsiUrl, startedById: userId },
    });

    // Post a system message with the call link so the other side sees it
    // in the thread and gets a push.
    await prisma.chatMessage.create({
      data: {
        conversationId: id,
        senderId: userId,
        kind: 'call_link',
        body: `${request.currentUser!.fullName} started a video call`,
        metadata: { jitsiUrl, roomName, callSessionId: call.id },
      },
    });

    await prisma.chatConversation.update({
      where: { id },
      data: {
        lastMessageAt: new Date(),
        ...(side === 'devotee'
          ? { providerUnread: { increment: 1 } }
          : { devoteeUnread: { increment: 1 } }),
      },
    });

    const otherUserId = side === 'devotee' ? conv.providerId : conv.devoteeId;
    void notifyUser(otherUserId, {
      title: 'Incoming video call',
      body: `${request.currentUser!.fullName} is calling you`,
      url: `/messages/${id}?call=${call.id}`,
    }).catch(() => undefined);

    return reply.send({ callId: call.id, jitsiUrl, roomName, reused: false });
  });

  // ── End a call ────────────────────────────────────────────────────
  server.post('/:id/end-call/:callId', async (request, reply) => {
    const userId = request.currentUser!.id;
    const { id, callId } = request.params as { id: string; callId: string };
    const conv = await prisma.chatConversation.findUnique({ where: { id } });
    if (!conv) return reply.code(404).send({ error: 'NotFound' });
    if (!sideFor(conv, userId)) return reply.code(403).send({ error: 'Forbidden' });

    const call = await prisma.chatCallSession.findUnique({ where: { id: callId } });
    if (!call || call.conversationId !== id) return reply.code(404).send({ error: 'NotFound' });
    if (call.endedAt) return reply.send({ ok: true, alreadyEnded: true });

    const endedAt = new Date();
    const durationSeconds = Math.round((endedAt.getTime() - call.startedAt.getTime()) / 1000);

    const updated = await prisma.chatCallSession.update({
      where: { id: callId },
      data: { endedAt, durationSeconds },
    });

    await prisma.chatMessage.create({
      data: {
        conversationId: id,
        senderId: userId,
        kind: 'system',
        body: `Call ended (${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s)`,
        metadata: { callSessionId: callId, durationSeconds },
      },
    });

    return reply.send({ callId: updated.id, durationSeconds, endedAt: updated.endedAt });
  });
}
