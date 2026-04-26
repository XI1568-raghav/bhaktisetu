import { FastifyInstance } from 'fastify';
import { authenticateUser } from '../middlewares/auth.js';
import { randomBytes } from 'node:crypto';

/**
 * Live consultation rooms backed by Jitsi Meet's free public server
 * (meet.jit.si). Jitsi is open source, free to use, no per-minute cost,
 * no API key — we just generate a unique room name and return the URL.
 *
 * Tradeoffs vs Twilio/Agora/100ms:
 *   + Free, no rate limits, no card on file
 *   + Real WebRTC video + audio + screen share
 *   - Public server has uptime SLAs of "best effort"
 *   - Anyone with the room name can join (mitigated by random 32-char id)
 *   - No native recording (can self-host Jibri later if needed)
 */
export async function consultationRoutes(server: FastifyInstance) {
  /**
   * POST /api/v1/consultation/start
   * Body: { providerId?: string, providerName?: string, kind?: 'astrologer'|'priest'|'wellness' }
   *
   * Returns a Jitsi room URL the user can navigate to immediately. Both the
   * devotee and the provider join the same room name.
   */
  server.post('/start', { preHandler: [authenticateUser] }, async (request, reply) => {
    const body = (request.body ?? {}) as {
      providerId?: string;
      providerName?: string;
      kind?: 'astrologer' | 'priest' | 'wellness';
    };

    const kind = body.kind ?? 'astrologer';
    const providerSlug = (body.providerName ?? body.providerId ?? 'provider')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 32);

    // Random 16-byte hex → 32-char unguessable room id.
    const roomId = randomBytes(16).toString('hex');
    const roomName = `darshya-${kind}-${providerSlug}-${roomId}`;

    const userDisplayName = encodeURIComponent(
      request.currentUser?.fullName ?? 'Devotee',
    );

    return reply.send({
      roomName,
      jitsiUrl: `https://meet.jit.si/${roomName}#userInfo.displayName=%22${userDisplayName}%22`,
      embedUrl: `https://meet.jit.si/${roomName}`,
      provider: 'jitsi',
      kind,
      // Frontend can show this much; backend has not stored anything yet.
      // Persist in DB only if we want billing/history (not for this MVP).
      createdAt: new Date().toISOString(),
    });
  });
}
