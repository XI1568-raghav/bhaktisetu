/**
 * PAR-21 — one stream, two endpoints, two different answers.
 *
 * Sweep (2026-08-12), same stream id 60a66677-2dd0-487c-a418-6ad91da483d1:
 *
 *   GET /darshan/live       -> status "live",
 *                              playbackUrl ".../kashi-vishwanath-varanasi/live.m3u8"
 *   GET /darshan/<id>/stream-> status "offline",
 *                              playbackUrl ".../kashi-vishwanath"
 *
 * Two separate causes, both in the DB branch of /:id/stream:
 *
 *  1. STATUS. /live derives liveness from the temple's aarti window
 *     (getLiveStatus(timingInfo)); /:id/stream returned the raw
 *     LiveDarshanStream.status column, which nothing keeps in step with the
 *     schedule. The listing therefore said LIVE and the detail said offline.
 *
 *  2. URL PRECEDENCE, exactly reversed. /live prefers the stream row's own
 *     playbackUrl and falls back to Temple.streamUrl; /:id/stream preferred
 *     Temple.streamUrl and fell back to the stream row. Whenever both columns
 *     are populated the two endpoints hand the player different manifests, and
 *     the one the detail page picks is the stale temple-level default.
 *
 * One derivation, used by both, so the listing and the player cannot disagree.
 */
import { describe, it, expect } from 'vitest';
import { __testing } from './darshan.js';

const { deriveStreamPlayback } = __testing;

// Temple.timingInfo shape, per lib/darshan-schedule.parseSchedule: an
// object of `{ regularHours: { <slotKey>: "HH:MM-HH:MM" } }`, where a key
// containing "aarti" (and friends) marks a streamed window.

/** An aarti window covering the whole day, so isLive is true whenever this runs. */
const ALWAYS_ON = { regularHours: { mangalaAarti: '00:00-23:59' } };
/** A one-minute window, pinned with an explicit `now` so it is never open. */
const NEVER_ON = { regularHours: { mangalaAarti: '03:00-03:01' } };
/** 12:00 IST — outside NEVER_ON, inside ALWAYS_ON, whatever the machine clock says. */
const MIDDAY_IST = new Date('2026-08-15T06:30:00.000Z');

describe('PAR-21 — /live and /:id/stream derive from one source', () => {
  it('prefers the stream row URL over the temple default, as /live does', () => {
    const view = deriveStreamPlayback({
      timingInfo: ALWAYS_ON,
      streamPlaybackUrl: 'https://stream.darshya.online/kashi-vishwanath-varanasi/live.m3u8',
      templeStreamUrl: 'https://stream.darshya.online/kashi-vishwanath',
      fallbackPlaybackUrl: null,
      now: MIDDAY_IST,
      storedStatus: 'offline',
    });
    // The detail endpoint used to answer the temple-level URL here.
    expect(view.playbackUrl).toBe(
      'https://stream.darshya.online/kashi-vishwanath-varanasi/live.m3u8',
    );
  });

  it('reports live when the aarti window is open, whatever the stale column says', () => {
    const view = deriveStreamPlayback({
      timingInfo: ALWAYS_ON,
      streamPlaybackUrl: 'https://stream.darshya.online/x/live.m3u8',
      templeStreamUrl: null,
      fallbackPlaybackUrl: null,
      now: MIDDAY_IST,
      storedStatus: 'offline',
    });
    expect(view.status).toBe('live');
  });

  it('does not claim live outside the window even when the column says live', () => {
    const view = deriveStreamPlayback({
      timingInfo: NEVER_ON,
      streamPlaybackUrl: 'https://stream.darshya.online/x/live.m3u8',
      templeStreamUrl: null,
      fallbackPlaybackUrl: null,
      now: MIDDAY_IST,
      storedStatus: 'live',
    });
    // /live would not have listed this stream, so the detail must not say LIVE.
    expect(view.status).toBe('offline');
  });

  it('is never live with nothing to play', () => {
    const view = deriveStreamPlayback({
      timingInfo: ALWAYS_ON,
      streamPlaybackUrl: null,
      templeStreamUrl: null,
      fallbackPlaybackUrl: null,
      now: MIDDAY_IST,
      storedStatus: 'live',
    });
    // /live gates on `status.isLive && playbackUrl`; a LIVE badge over a null
    // manifest is the next break in this same flow.
    expect(view.playbackUrl).toBeNull();
    expect(view.status).not.toBe('live');
  });

  it('falls through stream -> temple -> hardcoded, in that order', () => {
    expect(
      deriveStreamPlayback({
        timingInfo: NEVER_ON,
        streamPlaybackUrl: null,
        templeStreamUrl: 'https://temple.example/live',
        fallbackPlaybackUrl: 'https://fallback.example/live',
        now: MIDDAY_IST,
      storedStatus: 'offline',
      }).playbackUrl,
    ).toBe('https://temple.example/live');

    expect(
      deriveStreamPlayback({
        timingInfo: NEVER_ON,
        streamPlaybackUrl: null,
        templeStreamUrl: null,
        fallbackPlaybackUrl: 'https://fallback.example/live',
        now: MIDDAY_IST,
      storedStatus: 'offline',
      }).playbackUrl,
    ).toBe('https://fallback.example/live');
  });

  it('passes a non-live stored status through untouched', () => {
    // `scheduled` and `ended` are real states the schedule cannot contradict.
    for (const stored of ['scheduled', 'ended']) {
      expect(
        deriveStreamPlayback({
          timingInfo: NEVER_ON,
          streamPlaybackUrl: 'https://stream.example/live',
          templeStreamUrl: null,
          fallbackPlaybackUrl: null,
          now: MIDDAY_IST,
      storedStatus: stored,
        }).status,
        stored,
      ).toBe(stored);
    }
  });
});
