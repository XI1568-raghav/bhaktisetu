/**
 * PAR-21 — which of the two darshan endpoints does the player believe?
 *
 * THE FINDING
 * -----------
 * The same stream reported a different status and a different playback URL from
 * two endpoints. Sweep 2026-08-12, stream 60a66677-2dd0-487c-a418-6ad91da483d1:
 *
 *   GET /darshan/live        -> "live",    .../kashi-vishwanath-varanasi/live.m3u8
 *   GET /darshan/<id>/stream -> "offline", .../kashi-vishwanath
 *
 * THE SERVER HALF IS ALREADY FIXED, AND IT PICKED A WINNER
 * -------------------------------------------------------
 * apps/api/src/routes/darshan.ts now runs ONE derivation, `deriveStreamPlayback`
 * (darshan.ts:234), for both routes: same URL precedence (stream row → temple
 * default → hardcoded fallback) and the same schedule-driven liveness, never
 * `live` with nothing to play. Pinned by darshan.stream-consistency.par21.test.ts.
 *
 * So the two endpoints no longer disagree about a stream. What is left is the
 * APP's half of the same defect, and it is the mirror image: the player did not
 * read either endpoint — it read a NAVIGATION PARAMETER.
 *
 *   const liveUrl = passedUrl ?? data?.playbackUrl ?? data?.recentVideoUrl;
 *   const isLive  = data ? data.isLive : !!passedUrl;
 *
 * `passedUrl` is a value the LIST screen captured when the card was rendered
 * and handed over via router.push. Three consequences:
 *
 *   1. It wins over the detail response permanently. The detail query refetches
 *      every 15s (useDarshanStream); the parameter never changes for the life
 *      of the screen. An aarti that ends, or a temple that swaps its manifest,
 *      is invisible — the player keeps pulling the URL from the moment the user
 *      tapped, which is exactly the stale-source bug PAR-21 describes.
 *   2. It is strictly less informed. Only /:id/stream carries `recentVideoUrl`
 *      (the VOD fallback for a dark channel) and the hardcoded-temple YouTube
 *      resolution; the list row has neither.
 *   3. `isLive: !!passedUrl` states LIVE from the presence of a string. A URL
 *      is not a broadcast. A red LIVE pill over a dead manifest is the same
 *      class of claim the server fix removed.
 *
 * AUTHORITATIVE = the detail endpoint, GET /darshan/:id/stream, for one stream.
 * It answers about the stream being watched, it is re-asked while the screen is
 * open, and it is a superset of the listing row. The navigation parameter is
 * demoted to what it honestly is: a warm-start hint, used only while the detail
 * has not answered yet, and never a basis for claiming the stream is live.
 *
 * Pure and dependency-free so it is testable in Node without a RN renderer.
 */

import type { StreamDetailVM } from './api-contracts';

export interface StreamAuthorityInput {
  /** GET /darshan/:id/stream, already run through selectStreamDetail. */
  detail: StreamDetailVM | null;
  /** `url` route param, captured by the list screen at push time. */
  passedUrl?: string;
  /** The detail query has not resolved yet (no data, no error). */
  detailPending: boolean;
}

export interface StreamAuthorityView {
  /** What to hand the player, or undefined when there is nothing to play. */
  playbackUrl?: string;
  /** Where that URL came from. `list-hint` means "not confirmed by the API". */
  source: 'detail' | 'detail-vod' | 'list-hint' | 'none';
  /** True ONLY when the authoritative endpoint says live AND has a live URL. */
  isLive: boolean;
  /** Badge text. `CHECKING` while the authority has not answered. */
  badge: 'LIVE' | 'OFFLINE' | 'CHECKING';
  /**
   * The aarti window the server reports, e.g. "Mangala Aarti · ends in 12 min".
   * Null when the endpoint publishes no slot — the player must not substitute a
   * standing claim like "24x7 darshan" for it.
   */
  slotLabel: string | null;
  /** Detail answered and there is no stream row for this id. */
  unavailable: boolean;
}

export function resolveStreamPlayback(input: StreamAuthorityInput): StreamAuthorityView {
  const { detail, passedUrl, detailPending } = input;

  if (detail) {
    // The authority answered. Its URL wins over the navigation parameter even
    // when the two differ — especially when they differ, which is the finding.
    if (detail.playbackUrl) {
      const isLive = detail.isLive;
      return {
        playbackUrl: detail.playbackUrl,
        source: 'detail',
        isLive,
        badge: isLive ? 'LIVE' : 'OFFLINE',
        slotLabel: slotLabel(detail),
        unavailable: false,
      };
    }
    // A recent-video URL is a recording. It is playable; it is not a broadcast,
    // so it can never raise the LIVE badge.
    if (detail.recentVideoUrl) {
      return {
        playbackUrl: detail.recentVideoUrl,
        source: 'detail-vod',
        isLive: false,
        badge: 'OFFLINE',
        slotLabel: slotLabel(detail),
        unavailable: false,
      };
    }
    return {
      playbackUrl: undefined,
      source: 'none',
      isLive: false,
      badge: 'OFFLINE',
      slotLabel: slotLabel(detail),
      unavailable: false,
    };
  }

  // No authoritative answer yet. The list hint gets the player started, but it
  // is not evidence of liveness and it does not get a LIVE badge.
  if (passedUrl) {
    return {
      playbackUrl: passedUrl,
      source: 'list-hint',
      isLive: false,
      badge: detailPending ? 'CHECKING' : 'OFFLINE',
      slotLabel: null,
      unavailable: !detailPending,
    };
  }

  return {
    playbackUrl: undefined,
    source: 'none',
    isLive: false,
    badge: detailPending ? 'CHECKING' : 'OFFLINE',
    slotLabel: null,
    unavailable: !detailPending,
  };
}

function slotLabel(detail: StreamDetailVM): string | null {
  if (!detail.currentSlot) return null;
  if (detail.endsInMin === null) return detail.currentSlot;
  return `${detail.currentSlot} · ends in ${detail.endsInMin} min`;
}
