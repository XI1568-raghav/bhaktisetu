import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Customer test 2026-10-04, step 1.
 *
 * The home page tells visitors the truth: "the recording reaches you after the
 * ceremony, not while it runs." The puja pages said the opposite — "Live Video
 * Proof: Watch your puja live", "Watch Live: Stream the puja on your device",
 * a "Live Stream" badge on every card and a "Live Streaming" chip — and nothing
 * in the product streams a booked puja (components/home/TrustStrip.tsx says so:
 * live streaming is temple aarti, a separate feature that needs no booking).
 * A devotee who paid for a puja expecting to watch it live got a recording
 * later. The page must say what happens.
 *
 * Temple LIVE DARSHAN is real and is not touched here.
 */
const root = join(__dirname, '..');
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const src = (rel: string) => strip(readFileSync(join(root, rel), 'utf8'));

const PROMISE = /watch your puja live|stream the puja|live video proof|watch live'|'live stream'|>\s*live stream\s*<|hasLiveStream|live streaming/i;

describe('puja pages do not promise a live stream of the puja', () => {
  for (const rel of ['app/pujas/[slug]/page.tsx', 'app/pujas/(index)/page.tsx']) {
    it(`${rel} has no live-stream promise`, () => {
      const hit = src(rel).split('\n').filter((l) => PROMISE.test(l));
      expect(hit, `${rel} still promises live streaming`).toEqual([]);
    });
  }

  it('the English puja strings do not promise live streaming', () => {
    const pujas = JSON.parse(readFileSync(join(root, 'lib/i18n/en.json'), 'utf8')).pujas as Record<string, string>;
    const bad = Object.entries(pujas).filter(([, v]) => typeof v === 'string' && /live stream/i.test(v));
    expect(bad).toEqual([]);
  });

  it('says plainly that the recording arrives after the ceremony', () => {
    expect(src('app/pujas/[slug]/page.tsx')).toMatch(/after the ceremony/i);
  });

  it('prasad is described as optional, matching the booking page', () => {
    expect(src('app/pujas/[slug]/page.tsx')).toMatch(/Prasad Delivery \(optional\)/);
    expect(src('app/pujas/(index)/page.tsx')).toMatch(/Optional prasad/);
  });
});
