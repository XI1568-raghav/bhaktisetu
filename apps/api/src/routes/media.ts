import { FastifyInstance } from 'fastify';
import { authenticateUser } from '../middlewares/auth.js';
import { presignR2Upload, publicUrlFor, r2 } from '../lib/r2.js';
import { randomBytes } from 'node:crypto';

/**
 * Media upload endpoints backed by Cloudflare R2.
 *
 *   POST /api/v1/media/upload-url   { kind, contentType, ext } → presigned PUT url
 *
 * The browser then PUTs the file body directly to R2 — no large bodies
 * pass through Render. Public read URLs (when R2_PUBLIC_BASE_URL is set)
 * are returned for use in the UI; private content uses presignR2Url
 * generated on demand.
 */
export async function mediaRoutes(server: FastifyInstance) {
  server.post('/upload-url', { preHandler: [authenticateUser] }, async (request, reply) => {
    const body = (request.body ?? {}) as {
      kind?: 'puja-proof' | 'profile-photo' | 'temple-image' | 'audio';
      contentType?: string;
      ext?: string;
    };
    const kind = body.kind ?? 'profile-photo';
    const contentType = body.contentType ?? 'application/octet-stream';
    const ext = (body.ext ?? '').replace(/[^a-z0-9]/gi, '').slice(0, 6);

    if (!r2.enabled) {
      return reply.code(503).send({
        error: 'Media uploads not configured',
        message: 'SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required (storage backed by Supabase).',
      });
    }

    const userId = request.currentUser!.id;
    const safeUserId = userId.replace(/[^a-z0-9-]/gi, '');
    const id = randomBytes(8).toString('hex');
    const key = `${kind}/${safeUserId}/${Date.now()}-${id}${ext ? `.${ext}` : ''}`;

    const url = await presignR2Upload({ key, contentType, expiresInSec: 600 });
    if (!url) {
      return reply.code(500).send({ error: 'Failed to generate upload URL' });
    }

    const publicUrl = publicUrlFor(key);

    return reply.send({
      uploadUrl: url,
      key,
      publicUrl,
      expiresIn: 600,
      method: 'PUT',
      headers: { 'Content-Type': contentType },
    });
  });
}
