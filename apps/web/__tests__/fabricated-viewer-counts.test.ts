/**
 * DF-10 continued (2026-08-24) — "12,450 viewers" was deleted from the homepage
 * on 2026-05-02 as fabricated (docs/content-audit-2026-05-02.md:31) and then
 * survived on five other surfaces seeded from the same invented figure:
 * /darshan, /darshan/[id], and the three /mobile screens.
 *
 * Nothing behind those numbers ever counted anything. The web app measures no
 * audience (no analytics client is mounted, PostHog was never keyed), the
 * YouTube embed exposes no viewer API to us — the real count is visible inside
 * the player itself, where a reader can watch it disagree with ours — and the
 * API's own /darshan fallbacks carry the identical literals
 * (apps/api/src/routes/darshan.ts:20-124, out of this lane). The figure is
 * invented, and it was invented CONSISTENTLY across six files, which is exactly
 * what made it survive three content audits looking like real telemetry.
 *
 * The rule enforced here is the one written at lib/platform-stats.ts:5-24: a
 * number reaches a page only if something counted it, and when the count is
 * unavailable the copy must lose its digits rather than fall back to a literal.
 * A "LIVE" pill with no headcount is that digit-free claim. "0 watching" is
 * NOT — it is equally unverified and it is discouraging — which is why the
 * assertions below tolerate a 0 in the DATA (`DarshanStream.viewerCount` is a
 * required `number`, lib/api.ts:370, and 0 is how this lane says "not counted")
 * but never tolerate one reaching rendered output.
 *
 * Scanning source instead of rendering is deliberate. These are five different
 * page shapes, two of them async server components, and the failure being
 * guarded is REINTRODUCTION anywhere in the lane — a new fallback array pasted
 * from an old one. A regex over the files catches that; a render test of one
 * page catches only the page it renders.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/** Every surface in this lane that has ever carried a live-viewer figure. */
const LANE_FILES = [
  'app/darshan/page.tsx',
  'app/darshan/[id]/page.tsx',
  'app/mobile/page.tsx',
  'app/mobile/darshan/page.tsx',
  'app/mobile/temples/page.tsx',
] as const;

const read = (rel: string) => readFileSync(path.resolve(__dirname, '..', rel), 'utf8');

const LANE = LANE_FILES.map((rel) => ({ rel, src: read(rel) }));

/** Every field name this lane has used to carry an audience size. */
const AUDIENCE_FIELD = 'viewerCount|peakViewers|viewers';

/** `field: 12450` / `field={12450}` — the literal itself. */
const AUDIENCE_LITERAL = new RegExp(`\\b(${AUDIENCE_FIELD})\\s*[:=]\\s*\\{?\\s*(\\d[\\d_]*)`, 'g');

/**
 * A braced expression that reads an audience field. Matches both a JSX
 * interpolation (`{(s.viewers / 1000).toFixed(1)}`) and an object literal that
 * carries the value onward into a rendered list (`{ viewers: s.viewerCount }`),
 * because both put an uncounted number one step from the screen. `[^{}]*`
 * keeps each match inside a single brace pair so a whole component body can't
 * be swallowed as one match.
 */
const AUDIENCE_IN_BRACES = new RegExp(`\\{([^{}]*\\b(?:${AUDIENCE_FIELD})\\b[^{}]*)\\}`, 'g');

describe('DF-10 — no fabricated live-viewer count survives in the darshan/mobile lane', () => {
  it.each(LANE)('$rel assigns no non-zero audience literal', ({ rel, src }) => {
    const offenders = [...src.matchAll(AUDIENCE_LITERAL)]
      .filter((m) => Number(m[2].replace(/_/g, '')) !== 0)
      .map((m) => m[0]);

    expect(
      offenders,
      `${rel} hardcodes an audience size. Nothing on this surface counts viewers, ` +
        `so the number is invented — remove it and let the LIVE indicator carry the ` +
        `claim without digits (see lib/platform-stats.ts:5-24).`,
    ).toEqual([]);
  });

  it.each(LANE)('$rel declares no bare `viewers` data key', ({ rel, src }) => {
    // `viewerCount`/`peakViewers` are forced on this lane by the DarshanStream
    // contract (lib/api.ts:370-371) and are pinned to 0 above. A bare `viewers`
    // key is this lane's own invention every time it has appeared, so it may
    // not exist at all — that is what stops `viewers: someUncountedThing` from
    // slipping past the numeric-literal check.
    const offenders = [...src.matchAll(/^[ \t]*viewers\s*:.*$/gm)].map((m) => m[0].trim());

    expect(
      offenders,
      `${rel} reintroduces a \`viewers\` field. There is no viewer-counting ` +
        `infrastructure to populate it.`,
    ).toEqual([]);
  });

  it.each(LANE)('$rel flows no audience number into rendered output', ({ rel, src }) => {
    const offenders = [...src.matchAll(AUDIENCE_IN_BRACES)]
      .map((m) => m[1].trim())
      // `viewerCount={0}` is the sanctioned "not counted" pass-through:
      // DarshanPlayer renders its counter only when the value is positive
      // (components/DarshanPlayer.tsx:225), so 0 hides the badge rather than
      // printing "0 watching".
      .filter((inner) => inner !== '0');

    expect(
      offenders,
      `${rel} puts an audience field on screen. Only \`viewerCount={0}\` — which ` +
        `suppresses the badge — may reach a component.`,
    ).toEqual([]);
  });

  it.each(LANE)('$rel formats no audience field as a "K" headcount', ({ rel, src }) => {
    // The three mobile screens each rendered `{(s.viewers / 1000).toFixed(1)}K`.
    // Rounding an invented number does not make it less invented; it makes it
    // look measured.
    const offenders = [...src.matchAll(new RegExp(`\\b(?:${AUDIENCE_FIELD})\\s*\\/\\s*1000`, 'g'))].map(
      (m) => m[0],
    );

    expect(offenders, `${rel} still renders a K-formatted headcount.`).toEqual([]);
  });

  it('the 12,450 figure deleted from the homepage on 2026-05-02 is gone lane-wide', () => {
    const offenders = LANE.filter(({ src }) => /12[,_]?450/.test(src)).map(({ rel }) => rel);

    expect(
      offenders,
      'The exact figure the 2026-05-02 content audit deleted is still shipping ' +
        '(docs/content-audit-2026-05-02.md:31).',
    ).toEqual([]);
  });

  it.each(LANE)('$rel still states liveness without a headcount', ({ rel, src }) => {
    // The positive half of the doctrine: removing the number must not remove
    // the claim. Every one of these surfaces keeps a digit-free LIVE state.
    expect(/\bLIVE\b|'live'|\("live"\)/i.test(src), `${rel} lost its live-state indicator`).toBe(
      true,
    );
  });
});
