import { supabaseAdmin } from './supabase.js';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

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

const r2Enabled = Boolean(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY);

const supabaseBucket = process.env.STORAGE_BUCKET ?? 'darshya-media';
const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseEnabled = !!(supabaseUrl && process.env.SUPABASE_SERVICE_ROLE_KEY);

const enabled = r2Enabled || supabaseEnabled;

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
export async function presignR2Url(key: string, expiresInSec = 3600): Promise<string | null> {
  if (r2Enabled && r2Client) {
    try {
      return await getSignedUrl(
        r2Client,
        new PutObjectCommand({ Bucket: R2_BUCKET, Key: key }),
        { expiresIn: expiresInSec }
      );
    } catch {
      return null;
    }
  }
  if (!supabaseEnabled) return null;
  const { data, error } = await supabaseAdmin.storage
    .from(supabaseBucket)
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
      return { uploadUrl, publicUrl: r2PublicUrl(params.key), backend: 'r2' };
    } catch {
      return null;
    }
  }
  if (!supabaseEnabled) return null;
  void expiresIn;
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
