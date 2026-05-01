import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

/**
 * Open + click tracking for outreach emails.
 *
 *   GET /api/v1/outreach/click?id=<outreachLogId>&u=<base64url(url)>
 *     → log click (set OutreachLog.clickedAt + increment clickCount, flip
 *       Lead.status from EMAILED → REPLIED), 302 redirect to decoded URL.
 *
 *   GET /api/v1/outreach/pixel.gif?id=<outreachLogId>
 *     → log open (set OutreachLog.openedAt + increment openCount), serve a
 *       1×1 transparent GIF. Always 200 + image/gif so MUAs don't retry.
 *
 * Tracking links are public — id is a UUID, hard to enumerate, and the only
 * mutation is a counter increment + status flip on a lead the recipient
 * already controls. Open redirect is prevented by allowlisting hosts.
 */

const ALLOWED_REDIRECT_HOSTS = new Set([
  'darshya.online',
  'www.darshya.online',
  'api.darshya.online',
  'app.darshya.online',
  'admin.darshya.online',
]);

// Add OUTREACH_TRACKING_ALLOWED_HOSTS=foo.com,bar.com to extend at runtime.
const extraAllowed = (process.env.OUTREACH_TRACKING_ALLOWED_HOSTS ?? '')
  .split(',')
  .map((h) => h.trim().toLowerCase())
  .filter(Boolean);
for (const h of extraAllowed) ALLOWED_REDIRECT_HOSTS.add(h);

// 1×1 transparent GIF (43 bytes).
const TRANSPARENT_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64',
);

const clickQuery = z.object({
  id: z.string().uuid(),
  u: z.string().min(1).max(2048),
});

const pixelQuery = z.object({
  id: z.string().uuid(),
});

function decodeBase64Url(value: string): string | null {
  try {
    return Buffer.from(value, 'base64url').toString('utf-8');
  } catch {
    return null;
  }
}

function isAllowedRedirect(target: string): URL | null {
  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
  const host = parsed.hostname.toLowerCase();
  if (!ALLOWED_REDIRECT_HOSTS.has(host)) return null;
  return parsed;
}

export async function outreachTrackingRoutes(server: FastifyInstance) {
  server.get('/click', async (request, reply) => {
    const parsed = clickQuery.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid tracking link' });
    }
    const decoded = decodeBase64Url(parsed.data.u);
    if (!decoded) {
      return reply.code(400).send({ error: 'Invalid url encoding' });
    }
    const target = isAllowedRedirect(decoded);
    if (!target) {
      return reply.code(400).send({ error: 'Disallowed redirect target' });
    }

    // Best-effort tracking — never block the redirect on DB hiccups.
    try {
      const log = await prisma.outreachLog.findUnique({
        where: { id: parsed.data.id },
        select: { id: true, leadId: true },
      });
      if (log) {
        await prisma.outreachLog.update({
          where: { id: log.id },
          data: {
            clickedAt: new Date(),
            clickCount: { increment: 1 },
          },
        });
        // A click is the strongest in-email engagement signal we have →
        // promote the lead from EMAILED to REPLIED. Don't downgrade
        // converted/unsubscribed/bounced leads.
        await prisma.lead.updateMany({
          where: { id: log.leadId, status: 'EMAILED' },
          data: { status: 'REPLIED' },
        });
      }
    } catch (err) {
      request.log.error({ err, logId: parsed.data.id }, 'click tracking failed');
    }

    return reply.redirect(target.toString(), 302);
  });

  server.get('/pixel.gif', async (request, reply) => {
    const parsed = pixelQuery.safeParse(request.query);
    if (parsed.success) {
      try {
        const log = await prisma.outreachLog.findUnique({
          where: { id: parsed.data.id },
          select: { id: true },
        });
        if (log) {
          await prisma.outreachLog.update({
            where: { id: log.id },
            data: {
              openedAt: new Date(),
              openCount: { increment: 1 },
            },
          });
        }
      } catch (err) {
        request.log.error({ err, logId: parsed.data.id }, 'open tracking failed');
      }
    }
    // Always return a valid 1×1 GIF — never let tracking failures cause
    // broken-image icons in the recipient's inbox.
    reply
      .header('Content-Type', 'image/gif')
      .header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
      .header('Pragma', 'no-cache')
      .header('Content-Length', String(TRANSPARENT_GIF.length));
    return reply.code(200).send(TRANSPARENT_GIF);
  });
}
