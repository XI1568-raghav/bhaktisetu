import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticateUser } from '../middlewares/auth.js';
import { ensureConversationForBooking } from '../services/conversation.service.js';

/**
 * Demo-pay bypass — skips Razorpay entirely and runs the full
 * post-payment flow so the chat/call demo works without payment KYC.
 *
 *   POST /api/v1/demo-pay/puja
 *   Body: { templeId?, pujaTypeId?, scheduledDate?, scheduledTimeSlot? }
 *
 * If body is omitted, picks the first active TemplePujaOffering and the
 * first available slot in 7 days. Auto-assigns the seeded demo priest
 * (pandit@demo.com). Auto-creates the conversation. Returns conversation id
 * + booking id so the frontend can deep-link straight into the inbox thread.
 *
 * Locked behind authenticateUser; safe to expose because it doesn't touch
 * money. Demo-only — guarded by NODE_ENV !== 'production' OR
 * ENABLE_DEMO_PAY=true so it doesn't accidentally bypass real billing.
 */

const bodySchema = z.object({
  templeId: z.string().uuid().optional(),
  pujaTypeId: z.string().uuid().optional(),
  scheduledDate: z.string().optional(),
  scheduledTimeSlot: z.string().optional(),
}).optional();

// Demo flow is gated on (a) the env flag — must be explicitly opted in, and
// (b) every demo-pay endpoint shares a tight per-user rate limit so the
// "free booking" cannot be turned into a DoS or DB-fill attack.
function demoEnabled(): boolean {
  if (process.env.NODE_ENV !== 'production') return true;
  return process.env.ENABLE_DEMO_PAY === 'true';
}

// In-memory token bucket — per user. Keeps the demo flow available for
// genuine smoke testing while preventing scripted abuse. 10 demo actions
// per user per 10 minutes is plenty for a real demo, way too low for any
// automated attack to be worthwhile.
const DEMO_RATE_WINDOW_MS = 10 * 60 * 1000;
const DEMO_RATE_MAX = 10;
const demoBuckets = new Map<string, { count: number; windowStart: number }>();
function rateLimitOk(userId: string): boolean {
  const now = Date.now();
  const b = demoBuckets.get(userId);
  if (!b || now - b.windowStart > DEMO_RATE_WINDOW_MS) {
    demoBuckets.set(userId, { count: 1, windowStart: now });
    return true;
  }
  if (b.count >= DEMO_RATE_MAX) return false;
  b.count += 1;
  return true;
}

export async function demoPayRoutes(server: FastifyInstance) {
  server.addHook('preHandler', authenticateUser);
  server.addHook('preHandler', async (request, reply) => {
    if (!demoEnabled()) {
      return reply.code(403).send({
        error: 'Forbidden',
        message: 'Demo flow is disabled.',
      });
    }
    const userId = request.currentUser?.id;
    if (userId && !rateLimitOk(userId)) {
      return reply.code(429).send({
        error: 'TooManyRequests',
        message: 'Demo rate limit reached. Try again in a few minutes.',
      });
    }
  });

  server.post('/puja', async (request, reply) => {
    const userId = request.currentUser!.id;
    const parsed = bodySchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ error: 'BadRequest', issues: parsed.error.issues });
    }

    // Pick a TemplePujaOffering. If body specifies temple+puja, find that;
    // otherwise pick the first active one. Use findFirst in both branches
    // so the resulting type uniformly includes temple+pujaType.
    const { templeId, pujaTypeId } = parsed.data ?? {};
    const offering = await prisma.templePujaOffering.findFirst({
      where: templeId && pujaTypeId
        ? { templeId, pujaTypeId }
        : { isActive: true },
      include: { temple: true, pujaType: true },
    });
    if (!offering) {
      return reply.code(404).send({ error: 'NotFound', message: 'No puja offering available. Seed temple data first.' });
    }

    // Pick a slot.
    const slots = (offering.availableSlots as string[]) ?? [];
    const slot = parsed.data?.scheduledTimeSlot ?? slots[0];
    if (!slot) {
      return reply.code(400).send({ error: 'BadRequest', message: 'No available slots configured for this offering.' });
    }
    const date = parsed.data?.scheduledDate ?? new Date(Date.now() + 7 * 86400_000).toISOString().slice(0, 10);

    // Always assign the seeded demo pandit so the demo flow stays deterministic
    // (devotee can sign in as pandit@demo.com to see the same conversation).
    // Fall back to any active priest if the demo seed hasn't run yet.
    const demoPanditUser = await prisma.user.findUnique({ where: { email: 'pandit@demo.com' } });
    let priest = demoPanditUser
      ? await prisma.priest.findUnique({ where: { userId: demoPanditUser.id } })
      : null;
    if (!priest) {
      priest = await prisma.priest.findFirst({ where: { status: 'active' } });
    }
    if (!priest) {
      return reply.code(404).send({ error: 'NotFound', message: 'No active priest available. Run seed-demo-users.ts.' });
    }

    // Generate booking number.
    const yyyy = new Date().getFullYear();
    const mm = String(new Date().getMonth() + 1).padStart(2, '0');
    const dd = String(new Date().getDate()).padStart(2, '0');
    const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
    const bookingNumber = `BS-${yyyy}${mm}${dd}-${rand}`;

    const priceAmount = offering.priceOverride ?? offering.pujaType.basePrice;
    const platformCommission = new (await import('@prisma/client')).Prisma.Decimal(priceAmount.toString()).mul('0.30');
    const priestPayout = new (await import('@prisma/client')).Prisma.Decimal(priceAmount.toString()).mul('0.70');

    // Create booking, jump straight to priest_assigned.
    const booking = await prisma.pujaBooking.create({
      data: {
        bookingNumber,
        userId,
        templeId: offering.templeId,
        pujaTypeId: offering.pujaTypeId,
        templePujaOfferingId: offering.id,
        scheduledDate: new Date(date),
        scheduledTimeSlot: slot,
        devoteeNames: [{ name: request.currentUser!.fullName }],
        sankalpDetails: 'Demo booking — created via /demo-pay/puja',
        priceAmount,
        currency: 'INR',
        platformCommission,
        priestPayout,
        status: 'priest_assigned',
        priestId: priest.id,
        prasadDeliveryRequested: false,
      },
    });

    // Auto-create the conversation (bypassing the BookingService transition
    // helper because we wrote 'priest_assigned' directly).
    const priestUser = await prisma.priest.findUnique({
      where: { id: priest.id },
      select: { userId: true, displayName: true },
    });
    let conversationId: string | null = null;
    if (priestUser) {
      const conv = await ensureConversationForBooking({
        bookingId: booking.id,
        devoteeId: userId,
        providerId: priestUser.userId,
        kind: 'puja_booking',
        systemMessage: `Namaste! I'm ${priestUser.displayName}. I'll be performing your ${offering.pujaType.name} at ${offering.temple.name}. Share any sankalp details here.`,
      });
      conversationId = conv.id;
    }

    return reply.send({
      ok: true,
      bookingId: booking.id,
      bookingNumber: booking.bookingNumber,
      conversationId,
      message: 'Demo payment successful. Conversation created with assigned priest.',
    });
  });

  // Generic provider-only demo: open a conversation with any provider role
  // (useful for astrology / wellness / temple / gaushala / store demos).
  server.post('/start-chat', async (request, reply) => {
    const userId = request.currentUser!.id;
    const body = (request.body ?? {}) as { providerEmail?: string; kind?: string };
    if (!body.providerEmail) {
      return reply.code(400).send({ error: 'BadRequest', message: 'providerEmail required' });
    }
    const provider = await prisma.user.findUnique({ where: { email: body.providerEmail } });
    if (!provider) return reply.code(404).send({ error: 'NotFound', message: 'Provider not found.' });

    const kind = (body.kind ?? 'support') as 'astrology' | 'wellness' | 'temple' | 'gaushala' | 'store_order' | 'support';
    const existing = await prisma.chatConversation.findFirst({
      where: { devoteeId: userId, providerId: provider.id, kind, status: 'open' },
    });
    if (existing) {
      return reply.send({ ok: true, conversationId: existing.id, reused: true });
    }
    const conv = await prisma.chatConversation.create({
      data: { devoteeId: userId, providerId: provider.id, kind },
    });
    return reply.send({ ok: true, conversationId: conv.id, reused: false });
  });
}
