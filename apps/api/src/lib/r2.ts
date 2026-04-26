import { supabaseAdmin } from './supabase.js';

/**
 * Object storage backed by Supabase Storage.
 *
 * Originally this module wrapped Cloudflare R2 (S3 SDK), but R2 requires
 * a card on file. We swapped to Supabase Storage which is included in the
 * existing Supabase project — no new account, no card. Free tier is 1 GB
 * storage / 5 GB egress per month, plenty for early-stage usage.
 *
 * Env vars (already set on Render from Day 1):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY  — service-role key bypasses RLS for uploads
 *   STORAGE_BUCKET             — defaults to 'darshya-media' if unset
 *
 * Bucket setup (one-time, in Supabase Dashboard → Storage):
 *   1. Create bucket named 'darshya-media'
 *   2. Public: ON  (so getPublicUrl works without signing)
 *   3. File size limit: 25 MB (raise later if puja-proof video needs more)
 *
 * The exported names (uploadToR2, presignR2Upload, etc.) are kept for
 * callsite stability — `r2` is now a misnomer but renaming would touch
 * every callsite. Treat the name as a historical accident.
 */

const bucket = process.env.STORAGE_BUCKET ?? 'darshya-media';
const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const enabled = !!(supabaseUrl && process.env.SUPABASE_SERVICE_ROLE_KEY);

interface UploadResult {
  ok: boolean;
  skipped?: boolean;
  url?: string;
  key?: string;
  error?: string;
}

export async function uploadToR2(params: {
  key: string;
  body: Buffer | Uint8Array | string;
  contentType: string;
  metadata?: Record<string, string>;
}): Promise<UploadResult> {
  if (!enabled) return { ok: false, skipped: true };
  try {
    const { error } = await supabaseAdmin.storage.from(bucket).upload(params.key, params.body, {
      contentType: params.contentType,
      upsert: true,
    });
    if (error) return { ok: false, error: error.message };
    const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(params.key);
    return { ok: true, key: params.key, url: data.publicUrl };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Generate a signed URL for reading a private object. With public buckets
 * (current default), getPublicUrl is enough — but we keep this helper so
 * future private-bucket use (e.g. premium audio) doesn't need a refactor.
 */
export async function presignR2Url(key: string, expiresInSec = 3600): Promise<string | null> {
  if (!enabled) return null;
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUrl(key, expiresInSec);
  if (error || !data) return null;
  return data.signedUrl;
}

/**
 * Generate a signed UPLOAD URL — lets the browser PUT directly to Supabase
 * Storage without proxying through the API. Caller passes the desired key;
 * the returned URL accepts a single PUT and expires quickly.
 *
 * Note: Supabase's signed-upload URLs are PUT-method only. The route
 * passes back the same shape callers used with the R2 implementation, so
 * client code does not need to change.
 */
export async function presignR2Upload(params: {
  key: string;
  contentType: string;
  expiresInSec?: number;
}): Promise<string | null> {
  if (!enabled) return null;
  // createSignedUploadUrl ignores expiresInSec (Supabase enforces ~2h fixed)
  // but we still accept the param to match the legacy R2 signature.
  void params.expiresInSec;
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUploadUrl(params.key);
  if (error || !data) return null;
  return data.signedUrl;
}

export async function deleteFromR2(key: string): Promise<boolean> {
  if (!enabled) return false;
  const { error } = await supabaseAdmin.storage.from(bucket).remove([key]);
  return !error;
}

/**
 * Resolve the public URL for a stored key, without making a network call.
 * Equivalent to the old `r2.publicBaseUrl` join — exposed so other modules
 * can build URLs directly when they already know the key.
 */
export function publicUrlFor(key: string): string | null {
  if (!enabled) return null;
  const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(key);
  return data.publicUrl ?? null;
}

export const r2 = {
  enabled,
  bucket,
  // Exposed for compatibility with old callsites that read this; with
  // Supabase Storage public URLs are derived per-key, so a single base
  // URL isn't quite right — callers should prefer publicUrlFor(key).
  publicBaseUrl: enabled ? `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/${bucket}` : null,
};
