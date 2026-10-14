/**
 * One video size limit for the whole API: what the signed-upload response
 * advertises, what the storage bucket enforces and what the post-upload check
 * rejects are all this number.
 *
 * Supabase's free tier caps every object at 50 MB no matter what the API says,
 * so the default is 50. Raise it with VIDEO_MAX_MB only after raising the
 * Supabase global limit (or moving to R2); the bucket policy is derived from it.
 */
const DEFAULT_VIDEO_MAX_MB = 50;

export function videoMaxMb(): number {
  const n = Number(process.env.VIDEO_MAX_MB);
  return Number.isFinite(n) && n >= 1 && n <= 5000 ? Math.floor(n) : DEFAULT_VIDEO_MAX_MB;
}

export function videoMaxBytes(): number {
  return videoMaxMb() * 1024 * 1024;
}

/** Body of the 413 returned when a stored video is over the limit. */
export function videoTooLargeMessage(): string {
  return `That video is larger than ${videoMaxMb()} MB. Please trim it or record at a lower quality (a few minutes at 720p is well under the limit) and upload it again.`;
}
