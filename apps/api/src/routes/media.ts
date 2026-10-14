import { FastifyInstance } from 'fastify';
import { authenticateUser } from '../middlewares/auth.js';
import { presignR2Upload, publicUrlFor, r2 } from '../lib/r2.js';
import { randomBytes } from 'node:crypto';
import { videoMaxMb } from '../lib/upload-limits.js';
import { deleteFromR2, deletePrivateObject } from '../lib/r2.js';
import { prisma } from '../lib/prisma.js';

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
  // maxSizeMb for video comes from lib/upload-limits (one shared constant).
  'video/mp4': { ext: 'mp4', maxSizeMb: 0 },
  'video/webm': { ext: 'webm', maxSizeMb: 0 },
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
    // The extension comes from the type policy only. A client-supplied `ext`
    // used to be honoured, which let an `image/png` upload be keyed `.html`.
    const ext = policy.ext;

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

    // Booking video proof is private and bound to a booking: it goes through
    // POST /priest/bookings/:id/video-proof/signed-url, never this generic route.
    if (kind === 'puja-proof' && contentType.startsWith('video/')) {
      return reply.code(400).send({
        error: 'Video proof is uploaded from the booking page (it is stored privately and tied to the booking).',
      });
    }

    // Identity documents: images or PDF only, stored privately, no public URL.
    const isPrivate = kind === 'kyc-document';
    if (isPrivate && !contentType.startsWith('image/') && contentType !== 'application/pdf') {
      return reply.code(400).send({ error: 'Documents must be an image (PNG, JPG, WebP) or a PDF.' });
    }

    const result = await presignR2Upload({ key, contentType, expiresInSec: 600, private: isPrivate });
    if (!result) {
      return reply.code(503).send({ error: 'File storage is temporarily unavailable. Please try again in a moment.' });
    }

    return reply.send({
      uploadUrl: result.uploadUrl,
      key,
      publicUrl: isPrivate ? null : result.publicUrl ?? publicUrlFor(key),
      backend: result.backend,
      expiresIn: 600,
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      maxSizeMb: contentType.startsWith('video/') ? videoMaxMb() : policy.maxSizeMb,
    });
  });
  // Owner-only removal of an uploaded KYC document or profile photo. Once a
  // provider profile has been approved the file is part of the verification
  // record, so only an admin may remove it then.
  server.delete('/object', { preHandler: [authenticateUser] }, async (request, reply) => {
    const key = String((request.query as { key?: string } | undefined)?.key ?? '');
    const m = /^(kyc-document|profile-photo)\/([a-z0-9-]+)\/[A-Za-z0-9._-]+$/i.exec(key);
    if (!m || key.includes('..')) {
      return reply.code(400).send({ error: 'Only an uploaded ID document or profile photo can be deleted.' });
    }
    const [, kind, ownerId] = m;
    const me = request.currentUser!;
    const isAdmin = (me.roles ?? []).includes('ADMIN' as never);
    if (ownerId !== me.id.replace(/[^a-z0-9-]/gi, '') && !isAdmin) {
      return reply.code(403).send({ error: 'You can only delete your own uploads.' });
    }
    if (!isAdmin) {
      const where = { userId: me.id, approved: true };
      const counts = await Promise.all([
        prisma.panditProfile.count({ where }),
        prisma.storeProfile.count({ where }),
        prisma.astrologerProfile.count({ where }),
        prisma.wellnessProfile.count({ where }),
        prisma.gaushalaProfile.count({ where }),
        prisma.templeProfile.count({ where }),
      ]);
      if (counts.some((c) => c > 0)) {
        return reply.code(403).send({ error: 'Your profile is approved. Contact support to change verified documents.' });
      }
    }
    const ok = kind === 'kyc-document' ? await deletePrivateObject(key) : await deleteFromR2(key);
    if (!ok) return reply.code(503).send({ error: 'Could not delete the file right now. Please try again.' });
    return reply.send({ deleted: true });
  });
}
