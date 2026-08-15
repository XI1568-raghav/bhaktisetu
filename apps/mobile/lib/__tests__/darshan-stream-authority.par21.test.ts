import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { resolveStreamPlayback } from '../stream-authority';
import { selectStreamDetail, type StreamDetailVM } from '../api-contracts';

/**
 * PAR-21, the app half — the player must read the authoritative endpoint.
 *
 * The server half landed already (one `deriveStreamPlayback` behind both
 * /darshan/live and /darshan/:id/stream — apps/api/src/routes/darshan.ts:234,
 * pinned by darshan.stream-consistency.par21.test.ts). What the app did was
 * read NEITHER: it preferred the `url` route parameter the list screen captured
 * at push time, and inferred LIVE from the mere presence of that string.
 *
 * The old expression, verbatim from app/(devotee)/darshan-player.tsx at HEAD:
 *
 *     const liveUrl = passedUrl ?? data?.playbackUrl ?? data?.recentVideoUrl;
 *     const isLive  = data ? data.isLive : !!passedUrl;
 *
 * Case 1 below is the one that pins the change: with BOTH a stale parameter and
 * a fresh detail response present, the old code answered the parameter. Run
 * against that expression these assertions read 'https://list.example/stale' and
 * fail.
 */

function detailOf(over: Partial<StreamDetailVM> = {}): StreamDetailVM {
  return {
    streamId: '60a66677-2dd0-487c-a418-6ad91da483d1',
    templeName: 'Kashi Vishwanath',
    status: 'live',
    isLive: true,
    viewerCount: 412,
    endsInMin: null,
    ...over,
  };
}

describe('PAR-21 — GET /darshan/:id/stream is the authority, not the nav param', () => {
  it('prefers the detail URL over the URL the list screen handed over', () => {
    const view = resolveStreamPlayback({
      detail: detailOf({ playbackUrl: 'https://stream.darshya.online/kashi/live.m3u8' }),
      passedUrl: 'https://list.example/stale',
      detailPending: false,
    });
    expect(view.playbackUrl).toBe('https://stream.darshya.online/kashi/live.m3u8');
    expect(view.source).toBe('detail');
  });

  it('follows the detail when it says the stream went offline mid-watch', () => {
    // The parameter still holds the manifest that was live when the card was
    // tapped. The 15s refetch is the only thing that can notice the aarti ended.
    const view = resolveStreamPlayback({
      detail: detailOf({ status: 'offline', isLive: false, playbackUrl: undefined }),
      passedUrl: 'https://list.example/was-live.m3u8',
      detailPending: false,
    });
    expect(view.isLive).toBe(false);
    expect(view.badge).toBe('OFFLINE');
    expect(view.playbackUrl).toBeUndefined();
  });

  it('never claims LIVE from a route parameter alone', () => {
    const view = resolveStreamPlayback({
      detail: null,
      passedUrl: 'https://list.example/live.m3u8',
      detailPending: true,
    });
    // A URL is a string, not a broadcast. `isLive: !!passedUrl` said otherwise.
    expect(view.isLive).toBe(false);
    expect(view.badge).toBe('CHECKING');
    // …but it may still warm-start the player.
    expect(view.playbackUrl).toBe('https://list.example/live.m3u8');
    expect(view.source).toBe('list-hint');
  });

  it('plays the detail-only VOD fallback the list row never carries', () => {
    // recentVideoUrl exists ONLY on /:id/stream. Preferring the parameter meant
    // a dark channel showed "no stream" while a recording was available.
    const view = resolveStreamPlayback({
      detail: detailOf({
        status: 'offline',
        isLive: false,
        playbackUrl: undefined,
        recentVideoUrl: 'https://youtube.com/embed/abc123',
      }),
      passedUrl: undefined,
      detailPending: false,
    });
    expect(view.playbackUrl).toBe('https://youtube.com/embed/abc123');
    expect(view.source).toBe('detail-vod');
    // A recording is not a broadcast.
    expect(view.isLive).toBe(false);
  });

  it('marks the stream unavailable when the authority 404s and there is no hint', () => {
    const view = resolveStreamPlayback({ detail: null, passedUrl: undefined, detailPending: false });
    expect(view.unavailable).toBe(true);
    expect(view.badge).toBe('OFFLINE');
  });

  it('reads the aarti window the endpoint publishes instead of asserting 24x7', () => {
    const view = resolveStreamPlayback({
      detail: detailOf({ playbackUrl: 'https://s/live.m3u8', currentSlot: 'Mangala Aarti', endsInMin: 12 }),
      detailPending: false,
    });
    expect(view.slotLabel).toBe('Mangala Aarti · ends in 12 min');
  });

  it('says nothing about the window when the endpoint publishes none', () => {
    const view = resolveStreamPlayback({
      detail: detailOf({ playbackUrl: 'https://s/live.m3u8', currentSlot: undefined }),
      detailPending: false,
    });
    expect(view.slotLabel).toBeNull();
  });
});

describe('PAR-21 — selectStreamDetail reads the two fields the route added', () => {
  // Verbatim reply shape of the DB branch of GET /darshan/:id/stream,
  // apps/api/src/routes/darshan.ts:489-503.
  const body = {
    streamId: '60a66677-2dd0-487c-a418-6ad91da483d1',
    templeId: 'b3f1c2d4-0000-4000-8000-000000000001',
    templeName: 'Kashi Vishwanath',
    status: 'live',
    playbackUrl: 'https://stream.darshya.online/kashi-vishwanath-varanasi/live.m3u8',
    currentSlot: 'Mangala Aarti',
    endsInMin: 12,
    thumbnailUrl: null,
    viewerCount: 412,
    startedAt: '2026-08-15T00:30:00.000Z',
  };

  it('carries currentSlot and endsInMin through to the view model', () => {
    const vm = selectStreamDetail(body);
    expect(vm).not.toBeNull();
    expect(vm!.currentSlot).toBe('Mangala Aarti');
    expect(vm!.endsInMin).toBe(12);
  });

  it('yields null endsInMin rather than a confident 0 when absent', () => {
    const vm = selectStreamDetail({ ...body, currentSlot: null, endsInMin: null });
    expect(vm!.endsInMin).toBeNull();
    expect(vm!.currentSlot).toBeUndefined();
  });
});

/**
 * Source guard. COMMENTS ARE STRIPPED FIRST — the prose above names the very
 * expression it bans, and a guard that matches its own documentation passes
 * while the defect is live.
 */
const PLAYER = path.resolve(__dirname, '../../app/(devotee)/darshan-player.tsx');
function code(): string {
  return readFileSync(PLAYER, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

describe('PAR-21 — the player screen routes through the resolver', () => {
  it('does not rebuild the precedence inline with the param first', () => {
    expect(code()).not.toMatch(/passedUrl\s*\?\?\s*data\?\./);
  });

  it('does not derive liveness from the presence of a route parameter', () => {
    expect(code()).not.toMatch(/isLive\s*=\s*data\s*\?\s*data\.isLive\s*:\s*!!passedUrl/);
  });

  it('uses the shared resolver', () => {
    expect(code()).toMatch(/resolveStreamPlayback\(/);
  });

  it('no longer hardcodes a 24x7 broadcast claim', () => {
    expect(code()).not.toMatch(/24x7 darshan/);
  });
});
