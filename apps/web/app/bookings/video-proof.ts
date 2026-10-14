/**
 * DB-09 — a "Video Ready" badge over a video that cannot play.
 *
 * Sweep (2026-08-12), four rows in video_uploaded/delivered on the devotee's
 * own list:
 *
 *   BS-20260812-QX6DC  video_uploaded  videoProofUrl ""            (empty)
 *   BS-20260812-IACI5  delivered       videoProofUrl "not a url at all"
 *   BS-20260812-683BK  delivered       videoProofUrl "https://drive.google.com/CORRECT-LINK"
 *   BS-20260812-STNEO  video_uploaded  videoProofUrl "https://cdn.example.com/c1.mp4"
 *
 * /bookings rendered QX6DC as "Video Ready" with no button (an empty string is
 * falsy) and IACI5 as "Delivered … Watch Video" pointing at something that is
 * not a URL. An `<a href="not a url at all">` is resolved RELATIVE to the
 * current page, so the devotee lands on a 404 inside the site rather than on
 * their puja recording.
 *
 * The write side is already closed — POST /priest/bookings/:id/video and the
 * PATCH proof field both run `z.string().url()`, and checkVideoProofGate
 * refuses the transition to video_uploaded/delivered without one. But rows
 * written before those guards are still in the table, and the UI trusts the
 * column on sight. Video proof is the headline promise of the product; a
 * devotee told their video is ready and handed a dead link has been failed on
 * the one thing they paid extra trust for.
 *
 * So the UI decides playability from the value, not from truthiness.
 */

/**
 * True only for a value a browser can actually navigate to as a video.
 *
 * http/https only: a relative path, a `javascript:` URI, a bare word or an
 * empty string are all things the old truthiness check would have let through
 * (or, for the empty string, silently swallowed into a badge with no button).
 */
export function isPlayableVideoUrl(url: string | null | undefined): boolean {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed.length === 0) return false;
  // A private proof key: opened through a signed URL the API mints on demand.
  if (/^booking-proofs\//.test(trimmed)) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/** The statuses whose label promises the devotee a recording exists. */
const VIDEO_PROMISED_STATUSES = new Set(['video_uploaded', 'delivered']);

/**
 * What the booking detail page should render in the video slot.
 *
 *   'player'   — a real, playable URL.
 *   'pending'  — the status promises a video but the stored URL is missing or
 *                unusable. The devotee is told, and told what to do about it.
 *   'none'     — the booking has not reached a video state; render nothing.
 */
export function videoProofState(
  status: string | null | undefined,
  url: string | null | undefined,
): 'player' | 'pending' | 'none' {
  if (isPlayableVideoUrl(url)) return 'player';
  return VIDEO_PROMISED_STATUSES.has(status ?? '') ? 'pending' : 'none';
}
