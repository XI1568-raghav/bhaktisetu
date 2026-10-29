/**
 * astrologer.service.ts — astrologer-side commission + online presence +
 * notification helpers (astrologer revamp 2026-08-05).
 *
 * Research basis (2026-08-05 supply-side scan): AstroTalk takes a permanent
 * 50% cut, AstroSage 45%, AstroYogi ~45-55%. Darshya's flat 30% was already
 * supply-competitive; aligning to the priest take-rate (20%) makes the portal
 * the best major-platform split in the category — the supply-acquisition wedge
 * against the incumbent's 50% + rented-visibility + alleged work-starvation.
 */

import { prisma } from '../lib/prisma.js';
import { notifyUser } from '../routes/notifications.js';
import { notifyDevotee } from './booking-notify.service.js';
import { ensureConversationForBooking } from './conversation.service.js';

/** Platform's share of a consult fee. Astrologer keeps (1 - this) = 80%. */
export const ASTROLOGER_PLATFORM_RATE = 0.2;
/** Astrologer's share of a consult fee. */
export const ASTROLOGER_SHARE = 1 - ASTROLOGER_PLATFORM_RATE;

// ─── Online presence ─────────────────────────────────────────────────────────
// No isOnline column exists on AstrologerProfile (schema gap — adding one needs
// a migration; for now presence is tracked in-memory keyed by profile userId,
// mirroring the priest isOnDuty toggle semantics). The toggle route writes here
// AND bumps a heartbeat timestamp the booking flow can consult for "online now".

interface Presence {
  online: boolean;
  lastSeenAt: number;
  mode: { chat: boolean; call: boolean };
}

const presenceByUser = new Map<string, Presence>();
const ONLINE_FRESH_MS = 15 * 60 * 1000; // online if heartbeat within 15 min

export function setAstrologerOnline(
  userId: string,
  online: boolean,
  mode?: { chat?: boolean; call?: boolean },
): Presence {
  const prev = presenceByUser.get(userId);
  const next: Presence = {
    online,
    lastSeenAt: Date.now(),
    mode: {
      chat: mode?.chat ?? prev?.mode.chat ?? true,
      call: mode?.call ?? prev?.mode.call ?? true,
    },
  };
  presenceByUser.set(userId, next);
  return next;
}

export function getAstrologerPresence(userId: string): Presence {
  const p = presenceByUser.get(userId);
  if (!p) return { online: false, lastSeenAt: 0, mode: { chat: true, call: true } };
  // Decay to offline if the heartbeat is stale (astrologer closed the app).
  if (p.online && Date.now() - p.lastSeenAt > ONLINE_FRESH_MS) {
    return { ...p, online: false };
  }
  return p;
}

// ─── Commission computation ──────────────────────────────────────────────────

/** Compute platform commission + astrologer payout for a consult fee. */
export function computeAstrologerSplit(totalInr: number): {
  platformAmount: number;
  astrologerAmount: number;
  platformRate: number;
} {
  const platformAmount = Math.round(totalInr * ASTROLOGER_PLATFORM_RATE * 100) / 100;
  return {
    platformAmount,
    astrologerAmount: Math.round((totalInr - platformAmount) * 100) / 100,
    platformRate: ASTROLOGER_PLATFORM_RATE,
  };
}

// ─── Notifications ───────────────────────────────────────────────────────────

/** Resolve an astrologer (profile id / userId / displayName) to {userId, displayName, phone}. */
export async function astrologerContact(ref: string): Promise<{ userId: string; displayName: string; phone: string | null } | null> {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ref);
  const profile = isUuid
    ? await prisma.astrologerProfile.findFirst({
        where: { OR: [{ id: ref }, { userId: ref }] },
        select: { userId: true, displayName: true },
      })
    : await prisma.astrologerProfile.findFirst({
        where: { displayName: ref },
        select: { userId: true, displayName: true },
      });
  if (!profile) return null;
  // AstrologerProfile has no direct User relation — fetch phone separately.
  const user = await prisma.user.findUnique({
    where: { id: profile.userId },
    select: { phone: true },
  });
  return { userId: profile.userId, displayName: profile.displayName, phone: user?.phone ?? null };
}

/**
 * Notify the ASTROLOGER of a new paid consult. Fire-and-forget — never throws.
 * Previously there was NO astrologer ping on consult request (they only found
 * out by manually refreshing the portal list).
 */
export async function notifyAstrologerNewConsult(params: {
  astrologerRef: string; // profile id / userId / displayName
  devoteeName?: string | null;
  minutes: number;
  amountInr: number;
  consultationId: string;
}): Promise<void> {
  try {
    const contact = await astrologerContact(params.astrologerRef);
    if (!contact) return;
    await notifyUser(contact.userId, {
      title: 'New consultation booked',
      body: `${params.devoteeName ?? 'A devotee'} booked ${params.minutes} min with you (₹${params.amountInr}). Open your portal to join.`,
      url: '/astrologer-portal/consultations',
    }).catch(() => undefined);
  } catch (err) {
    console.warn('[astrologer.service] notifyAstrologerNewConsult failed:', err);
  }
}

/** Notify the DEVOTEE their consult is confirmed (reuse booking-notify infra). */
export async function notifyDevoteeConsultConfirmed(params: {
  devoteeUserId: string;
  astrologerName: string;
  minutes: number;
  consultationId: string;
}): Promise<void> {
  try {
    await notifyUser(params.devoteeUserId, {
      title: 'Consultation confirmed',
      body: `${params.astrologerName} will see you for ${params.minutes} min. Join from your consultations page.`,
      url: '/profile/consultations',
    }).catch(() => undefined);
  } catch (err) {
    console.warn('[astrologer.service] notifyDevoteeConsultConfirmed failed:', err);
  }
}

/**
 * Open the chat thread for a paid consultation. conversation.service documents
 * that "the astrology / wellness booking flows" call ensureConversationForBooking
 * when a booking is confirmed, but the astrology flow never did: the portal's
 * Messages page promised "When devotees book your services, threads will appear
 * here" and no thread was ever created, and the web has no control for a devotee
 * to start one. Idempotent (one open thread per devotee/astrologer/consultation);
 * best effort, never throws.
 */
export async function openConsultationThread(params: {
  astrologerRef: string; // profile id / userId
  devoteeUserId: string;
  astrologerName: string;
  minutes: number;
  reference: string;
  consultationId: string;
}): Promise<void> {
  try {
    const contact = await astrologerContact(params.astrologerRef);
    if (!contact || contact.userId === params.devoteeUserId) return;
    await ensureConversationForBooking({
      bookingId: params.consultationId,
      devoteeId: params.devoteeUserId,
      providerId: contact.userId,
      kind: 'astrology',
      systemMessage: `Namaste! I'm ${params.astrologerName}. Your ${params.minutes}-minute consultation (${params.reference}) is booked. Share your birth details or what you would like to ask here before we begin.`,
    });
  } catch (err) {
    console.warn('[astrologer.service] openConsultationThread failed:', err);
  }
}
