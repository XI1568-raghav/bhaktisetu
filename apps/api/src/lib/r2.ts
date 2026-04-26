import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * Cloudflare R2 storage. R2 is S3-compatible, so we use the AWS S3 SDK
 * pointed at the R2 endpoint. Free tier: 10 GB storage, ZERO egress,
 * 1M Class-A operations / 10M Class-B operations per month — plenty for
 * audio + image hosting at our scale.
 *
 * Env vars (set on Render):
 *   R2_ACCOUNT_ID
 *   R2_ACCESS_KEY_ID
 *   R2_SECRET_ACCESS_KEY
 *   R2_BUCKET           — the bucket name we write to (e.g. "darshya-media")
 *   R2_PUBLIC_BASE_URL  — public URL prefix; either the R2 dev subdomain
 *                         (https://pub-xxxx.r2.dev) or your own domain
 *                         (https://media.darshya.online) once configured.
 *
 * If env vars are absent, this module is inert — callers get { skipped: true }
 * and the rest of the app works without R2.
 */

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucket = process.env.R2_BUCKET ?? 'darshya-media';
const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL;

const enabled = !!(accountId && accessKeyId && secretAccessKey);

const client = enabled
  ? new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: accessKeyId!,
        secretAccessKey: secretAccessKey!,
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

/**
 * Upload a Buffer to R2. Returns the public URL if R2_PUBLIC_BASE_URL is
 * set, otherwise returns the bucket key only (caller can sign on demand).
 */
export async function uploadToR2(params: {
  key: string;
  body: Buffer | Uint8Array | string;
  contentType: string;
  metadata?: Record<string, string>;
}): Promise<UploadResult> {
  if (!client) return { ok: false, skipped: true };
  try {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: params.key,
        Body: params.body,
        ContentType: params.contentType,
        Metadata: params.metadata,
      }),
    );
    const url = publicBaseUrl ? `${publicBaseUrl.replace(/\/$/, '')}/${params.key}` : undefined;
    return { ok: true, key: params.key, url };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Generate a presigned URL for a private object — useful for paywalled
 * audio (Bhakti Pass premium tier).
 */
export async function presignR2Url(key: string, expiresInSec = 3600): Promise<string | null> {
  if (!client) return null;
  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn: expiresInSec },
  );
}

/**
 * Generate a presigned UPLOAD URL — lets the browser PUT directly to R2
 * without proxying through the API. Caller passes the desired key and
 * content-type; client must use exactly the same content-type in the PUT.
 */
export async function presignR2Upload(params: {
  key: string;
  contentType: string;
  expiresInSec?: number;
}): Promise<string | null> {
  if (!client) return null;
  return getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: bucket,
      Key: params.key,
      ContentType: params.contentType,
    }),
    { expiresIn: params.expiresInSec ?? 600 },
  );
}

export async function deleteFromR2(key: string): Promise<boolean> {
  if (!client) return false;
  try {
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}

export const r2 = { enabled, bucket, publicBaseUrl };
