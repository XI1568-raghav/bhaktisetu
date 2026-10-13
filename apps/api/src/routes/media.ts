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

// P1-5 (2026-07-17): the previous handler accepted ANY contentType (defaulting
// to application/octet-stream) and used `kind` unsanitized in the R2 key path.
// A caller could presign an upload for an arbitrary type, and a `kind` like
// `../x` escaped the intended key prefix. Mirror the priest.ts video-upload
// pattern: a fixed type allowlist, a fixed kind enum, a per-type size cap, and
// a sanitized kind segment so the R2 key can never leave its prefix.
const ALLOWED_KINDS = new Set(['puja-proof', 'profile-photo', 'temple-image', 'audio', 'kyc-document']);

const TYPE_POLICY = {
  'image/jpeg': { ext: 'jpg', maxSizeMb: 10 },
  'image/png': { ext: 'png', maxSizeMb: 10 },
  'image/webp': { ext: 'webp', maxSizeMb: 10 },
  'image/gif': { ext: 'gif', maxSizeMb: 10 },
  'audio/mpeg': { ext: 'mp3', maxSizeMb: 25 },
  'audio/wav': { ext: 'wav', maxSizeMb: 25 },
  'audio/webm': { ext: 'weba', maxSizeMb: 25 },
  'video/mp4': { ext: 'mp4', maxSizeMb: 200 },
  'video/webm': { ext: 'webm', maxSizeMb: 200 },
  'application/pdf': { ext: 'pdf', maxSizeMb: 10 },
} as const;

type AllowedContentType = keyof typeof TYPE_POLICY;

export async function mediaRoutes(server: FastifyInstance) {
  server.post('/upload-url', { preHandler: [authenticateUser] }, async (request, reply) => {
    const body = (request.body ?? {}) as {
      kind?: 'puja-proof' | 'profile-photo' | 'temple-image' | 'audio' | 'kyc-document';
      contentType?: string;
      ext?: string;
    };
    const kind = body.kind ?? 'profile-photo';
    if (!ALLOWED_KINDS.has(kind)) {
      return reply.code(400).send({
        error: `Unsupported kind. Allowed: ${[...ALLOWED_KINDS].join(', ')}.`,
      });
    }
    // Sanitize the kind segment so it can never contain path separators / `..`.
    // ALLOWED_KINDS already restricts it to the enum above; this is belt-and-braces.
    const safeKind = kind.replace(/[^a-z0-9-]/gi, '');

    const contentType = (body.contentType ?? '').toLowerCase();
    const policy = TYPE_POLICY[contentType as AllowedContentType];
    if (!policy) {
      return reply.code(400).send({
        error: `Unsupported contentType. Allowed: ${Object.keys(TYPE_POLICY).join(', ')}.`,
      });
    }
    // Derive the extension from the type policy (trusted), but allow a client
    // override as long as it sanitizes to a short alphanumeric token.
    const ext = (body.ext ?? policy.ext).replace(/[^a-z0-9]/gi, '').slice(0, 6) || policy.ext;

    if (!r2.enabled) {
      return reply.code(503).send({
        error: 'Media uploads not configured',
        message: 'SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required (storage backed by Supabase).',
      });
    }

    const userId = request.currentUser!.id;
    const safeUserId = userId.replace(/[^a-z0-9-]/gi, '');
    const id = randomBytes(8).toString('hex');
    const key = `${safeKind}/${safeUserId}/${Date.now()}-${id}.${ext}`;

    // Identity documents: images or PDF only, stored privately, no public URL.
    const isPrivate = kind === 'kyc-document';
    if (isPrivate && !contentType.startsWith('image/') && contentType !== 'application/pdf') {
      return reply.code(400).send({ error: 'Documents must be an image (PNG, JPG, WebP) or a PDF.' });
    }

    const result = await presignR2Upload({ key, contentType, expiresInSec: 600, private: isPrivate });
    if (!result) {
      return reply.code(500).send({ error: 'Failed to generate upload URL' });
    }

    return reply.send({
      uploadUrl: result.uploadUrl,
      key,
      publicUrl: isPrivate ? null : result.publicUrl ?? publicUrlFor(key),
      backend: result.backend,
      expiresIn: 600,
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      maxSizeMb: policy.maxSizeMb,
    });
  });
}
