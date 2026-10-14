import { supabaseAdmin } from './supabase.js';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { videoMaxBytes } from './upload-limits.js';

/**
 * Object storage layer.
 *
 * Two backends are supported, picked at runtime in this order:
 *   1. Cloudflare R2 (preferred per CLAUDE.md — 10 GB free, zero egress)
 *      Activated when R2_ACCOUNT_ID + R2_ACCESS_KEY_ID + R2_SECRET_ACCESS_KEY
 *      are all set.
 *   2. Supabase Storage (graceful fallback)
 *      Used when R2 env vars are absent but SUPABASE_URL +
 *      SUPABASE_SERVICE_ROLE_KEY are present.
 *
 * Public-bucket access is the default. R2 requires a custom domain or
 * public r2.dev URL — set R2_PUBLIC_BASE to override the assumed
 * `https://<bucket>.<account>.r2.cloudflarestorage.com/` form.
 *
 * Env vars:
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY
 *   R2_BUCKET                 — defaults 'darshya-media'
 *   R2_PUBLIC_BASE            — optional, e.g. https://cdn.darshya.online
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  — fallback
 *   STORAGE_BUCKET            — Supabase bucket name; defaults 'darshya-media'
 *
 * The exported names (uploadToR2, presignR2Upload, etc.) are kept for
 * callsite stability across both backends.
 */

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.R2_BUCKET ?? 'darshya-media';
const R2_PUBLIC_BASE = process.env.R2_PUBLIC_BASE;

// Optional second R2 bucket for private objects (booking video proof). Without it
// proofs share R2_BUCKET and are exactly as private as that bucket is.
const R2_PRIVATE_BUCKET = process.env.R2_PRIVATE_BUCKET ?? R2_BUCKET;

const r2Enabled = Boolean(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY);

const supabaseBucket = process.env.STORAGE_BUCKET ?? 'darshya-media';
const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseEnabled = !!(supabaseUrl && process.env.SUPABASE_SERVICE_ROLE_KEY);

const enabled = r2Enabled || supabaseEnabled;

// Sensitive uploads (Aadhaar / certificates) never go in the public media
// bucket: on Supabase they use a separate non-public bucket (created on first
// use) and are only readable through short-lived signed URLs.
const supabasePrivateBucket = process.env.STORAGE_PRIVATE_BUCKET ?? 'darshya-private';

// A signed upload URL takes whatever bytes and Content-Type the holder sends; the
// type/size checks made when the URL is issued are advisory only. The bucket is
// the one place Supabase actually enforces them, so pin them there.
const PRIVATE_DOC_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
const MEDIA_MIME = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'audio/mpeg', 'audio/wav', 'audio/webm',
  'video/mp4', 'video/webm', 'video/quicktime',
  'application/pdf',
];
// Booking video proof: a separate PRIVATE bucket. Deliberately not named
// `booking-proofs`: the web used to write straight into a bucket of that name
// with the user's JWT (and getPublicUrl), so it may already exist as a public
// bucket whose URLs are stored on old bookings; flipping it private would break
// those, and leaving it public would defeat this. Override with
// STORAGE_PROOF_BUCKET.
const supabaseProofBucket = process.env.STORAGE_PROOF_BUCKET ?? 'booking-proofs-private';
const PROOF_MIME = ['video/mp4', 'video/webm', 'video/quicktime'];
let proofBucketReady: Promise<void> | null = null;
function ensureProofBucket(): Promise<void> {
  proofBucketReady ??= (async () => {
    const options = {
      public: false,
      fileSizeLimit: `${Math.floor(videoMaxBytes() / (1024 * 1024))}MB`,
      allowedMimeTypes: PROOF_MIME,
    };
    const { error } = await supabaseAdmin.storage.createBucket(supabaseProofBucket, options);
    if (error && !/already exists|duplicate/i.test(error.message)) {
      proofBucketReady = null;
      throw new Error(error.message);
    }
    // Always (re)apply: a bucket that exists must end up private with the shared limit.
    if (error) {
      const upd = await supabaseAdmin.storage.updateBucket(supabaseProofBucket, options);
      if (upd.error) {
        proofBucketReady = null;
        throw new Error(upd.error.message);
      }
    }
  })();
  return proofBucketReady;
}
let privateBucketReady: Promise<void> | null = null;
function ensurePrivateBucket(): Promise<void> {
  privateBucketReady ??= (async () => {
    const options = { public: false, fileSizeLimit: '10MB', allowedMimeTypes: PRIVATE_DOC_MIME };
    const { error } = await supabaseAdmin.storage.createBucket(supabasePrivateBucket, options);
    if (error && !/already exists|duplicate/i.test(error.message)) {
      privateBucketReady = null;
      throw new Error(error.message);
    }
    if (error) {
      // Created by an earlier release without limits: bring it up to policy.
      const upd = await supabaseAdmin.storage.updateBucket(supabasePrivateBucket, options);
      if (upd.error) console.warn('[storage] could not apply private-bucket policy:', upd.error.message);
    }
  })();
  return privateBucketReady;
}
let mediaBucketPolicy: Promise<void> | null = null;
function ensureMediaBucketPolicy(): Promise<void> {
  if (process.env.STORAGE_ENFORCE_MEDIA_POLICY === 'off') return Promise.resolve();
  mediaBucketPolicy ??= (async () => {
    try {
      const upd = await supabaseAdmin.storage.updateBucket(supabaseBucket, { public: true, allowedMimeTypes: MEDIA_MIME });
      if (upd.error) console.warn('[storage] could not apply media-bucket policy:', upd.error.message);
    } catch (err) {
      console.warn('[storage] media-bucket policy skipped:', err instanceof Error ? err.message : err);
    }
  })();
  return mediaBucketPolicy;
}

const r2Client = r2Enabled
  ? new S3Client({
      region: 'auto',
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID!,
        secretAccessKey: R2_SECRET_ACCESS_KEY!,
      },
    })
  : null;

interface UploadResult {
  ok: boolean;
  skipped?: boolean;
  url?: string;
  key?: string;
  error?: string;
}

function r2PublicUrl(key: string): string {
  if (R2_PUBLIC_BASE) return `${R2_PUBLIC_BASE.replace(/\/$/, '')}/${key}`;
  return `https://${R2_BUCKET}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${key}`;
}

export async function uploadToR2(params: {
  key: string;
  body: Buffer | Uint8Array | string;
  contentType: string;
  metadata?: Record<string, string>;
}): Promise<UploadResult> {
  if (r2Enabled && r2Client) {
    try {
      const body =
        typeof params.body === 'string' ? Buffer.from(params.body) : (params.body as Buffer | Uint8Array);
      await r2Client.send(
        new PutObjectCommand({
          Bucket: R2_BUCKET,
          Key: params.key,
          Body: body,
          ContentType: params.contentType,
          Metadata: params.metadata,
        })
      );
      return { ok: true, key: params.key, url: r2PublicUrl(params.key) };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }
  if (!supabaseEnabled) return { ok: false, skipped: true };
  try {
    const { error } = await supabaseAdmin.storage
      .from(supabaseBucket)
      .upload(params.key, params.body, {
        contentType: params.contentType,
        upsert: true,
      });
    if (error) return { ok: false, error: error.message };
    const { data } = supabaseAdmin.storage.from(supabaseBucket).getPublicUrl(params.key);
    return { ok: true, key: params.key, url: data.publicUrl };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Generate a signed URL for reading a private object.
 */
export async function presignR2Url(
  key: string,
  expiresInSec = 3600,
  opts: { private?: boolean } = {},
): Promise<string | null> {
  if (r2Enabled && r2Client) {
    try {
      return await getSignedUrl(
        r2Client,
        opts.private
          ? new GetObjectCommand({ Bucket: R2_BUCKET, Key: key })
          : new PutObjectCommand({ Bucket: R2_BUCKET, Key: key }),
        { expiresIn: expiresInSec }
      );
    } catch {
      return null;
    }
  }
  if (!supabaseEnabled) return null;
  const { data, error } = await supabaseAdmin.storage
    .from(opts.private ? supabasePrivateBucket : supabaseBucket)
    .createSignedUrl(key, expiresInSec);
  if (error || !data) return null;
  return data.signedUrl;
}

/**
 * Generate a signed PUT URL — browser uploads directly without proxying.
 *
 * R2 path: standard S3 PUT, content-type enforced, configurable expiry.
 * Supabase path: createSignedUploadUrl (PUT method, ~2h fixed expiry).
 *
 * Returns both the URL and the resolved public URL the caller will store.
 */
export async function presignR2Upload(params: {
  key: string;
  contentType: string;
  expiresInSec?: number;
  private?: boolean;
}): Promise<{ uploadUrl: string; publicUrl: string; backend: 'r2' | 'supabase' } | null> {
  const expiresIn = params.expiresInSec ?? 300;
  if (r2Enabled && r2Client) {
    try {
      const uploadUrl = await getSignedUrl(
        r2Client,
        new PutObjectCommand({
          Bucket: R2_BUCKET,
          Key: params.key,
          ContentType: params.contentType,
        }),
        { expiresIn }
      );
      return { uploadUrl, publicUrl: params.private ? '' : r2PublicUrl(params.key), backend: 'r2' };
    } catch {
      return null;
    }
  }
  if (!supabaseEnabled) return null;
  void expiresIn;
  if (params.private) {
    try {
      await ensurePrivateBucket();
    } catch {
      return null;
    }
    const { data, error } = await supabaseAdmin.storage
      .from(supabasePrivateBucket)
      .createSignedUploadUrl(params.key);
    if (error || !data) return null;
    return { uploadUrl: data.signedUrl, publicUrl: '', backend: 'supabase' };
  }
  await ensureMediaBucketPolicy();
  const { data, error } = await supabaseAdmin.storage
    .from(supabaseBucket)
    .createSignedUploadUrl(params.key);
  if (error || !data) return null;
  const { data: pub } = supabaseAdmin.storage
    .from(supabaseBucket)
    .getPublicUrl(params.key);
  return { uploadUrl: data.signedUrl, publicUrl: pub.publicUrl, backend: 'supabase' };
}

export async function deleteFromR2(key: string): Promise<boolean> {
  if (r2Enabled && r2Client) {
    try {
      await r2Client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }));
      return true;
    } catch {
      return false;
    }
  }
  if (!supabaseEnabled) return false;
  const { error } = await supabaseAdmin.storage.from(supabaseBucket).remove([key]);
  return !error;
}

export function publicUrlFor(key: string): string | null {
  if (r2Enabled) return r2PublicUrl(key);
  if (!supabaseEnabled) return null;
  const { data } = supabaseAdmin.storage.from(supabaseBucket).getPublicUrl(key);
  return data.publicUrl ?? null;
}

export const r2 = {
  enabled,
  backend: r2Enabled ? ('r2' as const) : supabaseEnabled ? ('supabase' as const) : ('none' as const),
  bucket: r2Enabled ? R2_BUCKET : supabaseBucket,
  publicBaseUrl: r2Enabled
    ? R2_PUBLIC_BASE ?? `https://${R2_BUCKET}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
    : supabaseEnabled
    ? `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/${supabaseBucket}`
    : null,
};

/**
 * Is the object behind a URL we minted a real recording?
 *
 * A signed upload URL accepts ANY bytes with ANY Content-Type (the type and size
 * checked at presign time are advisory), so a zero-byte file or an HTML page can
 * be PUT and then submitted as "video proof" — the proof that releases the
 * pandit's earnings. For URLs that point at our own public storage, HEAD the
 * object and require a non-trivial video. External links (Drive, YouTube) are
 * not ours to inspect and pass through.
 */
export async function inspectOwnVideoUrl(
  url: string,
): Promise<{ ok: true } | { ok: false; reason: 'missing' | 'empty' | 'not_video' | 'unreachable' }> {
  const base = r2.publicBaseUrl;
  if (!base || !url.startsWith(base.replace(/\/$/, '') + '/')) return { ok: true };
  try {
    const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
    if (!res.ok) return { ok: false, reason: res.status >= 500 ? 'unreachable' : 'missing' };
    const len = Number(res.headers.get('content-length') ?? '0');
    if (!Number.isFinite(len) || len < MIN_VIDEO_BYTES) return { ok: false, reason: 'empty' };
    if (!(res.headers.get('content-type') ?? '').toLowerCase().startsWith('video/')) return { ok: false, reason: 'not_video' };
    return { ok: true };
  } catch {
    return { ok: false, reason: 'unreachable' };
  }
}
const MIN_VIDEO_BYTES = 1024;


// ─── Private booking video proof ────────────────────────────────────────────
// Objects are addressed by KEY (`booking-proofs/<bookingId>/<ts>-<rand>.<ext>`)
// and are only ever reachable through short-lived signed URLs minted for a
// viewer the API has authorised (lib/booking-proof.ts).

/** Signed PUT URL for a proof object in the private proof bucket. null = storage unavailable. */
export async function presignProofUpload(params: {
  key: string;
  contentType: string;
  expiresInSec?: number;
}): Promise<{ uploadUrl: string; backend: 'r2' | 'supabase' } | null> {
  const expiresIn = params.expiresInSec ?? 300;
  if (r2Enabled && r2Client) {
    try {
      const uploadUrl = await getSignedUrl(
        r2Client,
        new PutObjectCommand({ Bucket: R2_PRIVATE_BUCKET, Key: params.key, ContentType: params.contentType }),
        { expiresIn },
      );
      return { uploadUrl, backend: 'r2' };
    } catch {
      return null;
    }
  }
  if (!supabaseEnabled) return null;
  try {
    await ensureProofBucket();
    const { data, error } = await supabaseAdmin.storage.from(supabaseProofBucket).createSignedUploadUrl(params.key);
    if (error || !data) return null;
    return { uploadUrl: data.signedUrl, backend: 'supabase' };
  } catch {
    return null;
  }
}

/** Short-lived signed GET URL for a proof object, or null when storage cannot sign it. */
export async function signProofRead(key: string, expiresInSec = 300): Promise<string | null> {
  if (r2Enabled && r2Client) {
    try {
      return await getSignedUrl(r2Client, new GetObjectCommand({ Bucket: R2_PRIVATE_BUCKET, Key: key }), {
        expiresIn: expiresInSec,
      });
    } catch {
      return null;
    }
  }
  if (!supabaseEnabled) return null;
  try {
    const { data, error } = await supabaseAdmin.storage.from(supabaseProofBucket).createSignedUrl(key, expiresInSec);
    if (error || !data) return null;
    return data.signedUrl;
  } catch {
    return null;
  }
}

export type ProofInspection =
  | { ok: true; bytes: number }
  | { ok: false; reason: 'missing' | 'empty' | 'not_video' | 'too_large' | 'unreachable' };

/**
 * Is there a real, in-limit video behind this proof key? A signed upload URL
 * takes any bytes, so the size/type promised at presign time is re-checked on
 * the stored object before the key is accepted as proof.
 */
export async function inspectProofObject(key: string): Promise<ProofInspection> {
  const url = await signProofRead(key, 60);
  if (!url) {
    // Could not sign: either storage is down, or the object does not exist (Supabase
    // refuses to sign a missing object). Tell them apart with a second, cheap call.
    return { ok: false, reason: r2Enabled ? 'unreachable' : (await proofObjectMissing(key)) ? 'missing' : 'unreachable' };
  }
  try {
    const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
    if (!res.ok) return { ok: false, reason: res.status >= 500 ? 'unreachable' : 'missing' };
    const len = Number(res.headers.get('content-length') ?? '0');
    if (!Number.isFinite(len) || len < MIN_VIDEO_BYTES) return { ok: false, reason: 'empty' };
    if (len > videoMaxBytes()) return { ok: false, reason: 'too_large' };
    if (!(res.headers.get('content-type') ?? '').toLowerCase().startsWith('video/')) return { ok: false, reason: 'not_video' };
    return { ok: true, bytes: len };
  } catch {
    return { ok: false, reason: 'unreachable' };
  }
}

async function proofObjectMissing(key: string): Promise<boolean> {
  try {
    const slash = key.lastIndexOf('/');
    const { data, error } = await supabaseAdmin.storage
      .from(supabaseProofBucket)
      .list(key.slice(0, slash), { search: key.slice(slash + 1), limit: 1 });
    if (error) return false;
    return !data?.some((o) => o.name === key.slice(slash + 1));
  } catch {
    return false;
  }
}

/** Best-effort removal (e.g. a proof the admin flagged invalid). */
export async function deleteProofObject(key: string): Promise<boolean> {
  if (r2Enabled && r2Client) {
    try {
      await r2Client.send(new DeleteObjectCommand({ Bucket: R2_PRIVATE_BUCKET, Key: key }));
      return true;
    } catch {
      return false;
    }
  }
  if (!supabaseEnabled) return false;
  try {
    const { error } = await supabaseAdmin.storage.from(supabaseProofBucket).remove([key]);
    return !error;
  } catch {
    return false;
  }
}
