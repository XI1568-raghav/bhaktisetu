import { prisma } from '../lib/prisma.js';
import { notifyUser } from '../routes/notifications.js';

/**
 * Auto-create a conversation when a booking transitions to a state where
 * the provider is now responsible for delivering the service. Called from
 * booking.service.ts when status moves to priest_assigned, and from the
 * astrology / wellness booking flows when those bookings get confirmed.
 *
 * Idempotent: returns the existing open conversation if one already exists
 * for the (devotee, provider, booking) tuple.
 */
export async function ensureConversationForBooking(opts: {
  bookingId: string;
  devoteeId: string;
  providerId: string;
  kind: 'puja_booking' | 'astrology' | 'wellness' | 'temple' | 'gaushala' | 'store_order';
  systemMessage: string;
}) {
  const existing = await prisma.chatConversation.findFirst({
    where: {
      devoteeId: opts.devoteeId,
      providerId: opts.providerId,
      linkedBookingId: opts.bookingId,
      status: 'open',
    },
  });
  if (existing) return existing;

  const conv = await prisma.chatConversation.create({
    data: {
      devoteeId: opts.devoteeId,
      providerId: opts.providerId,
      kind: opts.kind,
      linkedBookingId: opts.bookingId,
    },
  });

  await prisma.chatMessage.create({
    data: {
      conversationId: conv.id,
      senderId: opts.providerId, // system message attributed to provider so it shows on the right side
      kind: 'system',
      body: opts.systemMessage,
      metadata: { bookingId: opts.bookingId },
    },
  });

  await prisma.chatConversation.update({
    where: { id: conv.id },
    data: { lastMessageAt: new Date(), devoteeUnread: { increment: 1 } },
  });

  void notifyUser(opts.devoteeId, {
    title: 'Your provider is ready',
    body: opts.systemMessage,
    url: `/messages/${conv.id}`,
  }).catch(() => undefined);

  return conv;
}
