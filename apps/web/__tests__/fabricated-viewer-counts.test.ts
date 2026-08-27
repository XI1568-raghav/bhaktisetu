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
 * what let it read as real telemetry for three months.
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
 * Companion to __tests__/darshan-viewer-honesty.test.ts, which closed the same
 * defect from the other end: it forbids the RENDERED strings on /darshan/[id]
 * ("watching", "Peak Viewers", "HD 1080p"). That left the DATA in place, so the
 * literals kept shipping in the bundle one edit away from the screen — and
 * three /mobile surfaces it never covered kept printing them outright. These
 * tests delete the source of the number; that one guards the sentence.
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

/**
 * Comments are stripped before every scan.
 *
 * This repo documents a deletion by quoting what was deleted — lib/platform-stats.ts:11-19
 * lists the exact fabricated strings it replaced, and the fixes these tests
 * guard do the same with "12450" and `{viewerCount} watching`. That record is
 * the most useful thing in those files: it is what stops the next person from
 * "restoring" the number. A scanner that cannot tell shipped code from the note
 * explaining why the code is gone would punish the documentation and reward
 * silent deletion, so it has to read past comments.
 *
 * The `[^:]` guard keeps `https://` inside string literals from being mistaken
 * for a line comment — this lane is full of YouTube embed URLs.
 */
const stripComments = (src: string): string =>
  src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

/** Every field name this lane has used to carry an audience size. */
const AUDIENCE_FIELD = 'viewerCount|peakViewers|viewers';

/**
 * `field: 12450` / `field={12450}` — an audience size written as a literal.
 * 0 is permitted: DarshanStream requires `viewerCount`/`peakViewers` as
 * `number` (lib/api.ts:370-371) and 0 is this codebase's "not counted".
 */
function nonZeroAudienceLiterals(src: string): string[] {
  const re = new RegExp(`\\b(?:${AUDIENCE_FIELD})\\s*[:=]\\s*\\{?\\s*(\\d[\\d_]*)`, 'g');
  return [...stripComments(src).matchAll(re)]
    .filter((m) => Number(m[1].replace(/_/g, '')) !== 0)
    .map((m) => m[0]);
}

/**
 * A bare `viewers:` key. `viewerCount`/`peakViewers` are forced on this lane by
 * the DarshanStream contract; a `viewers` field has been this lane's own
 * invention every single time it appeared, so it may not exist at all. This is
 * what stops `viewers: somethingUncounted` — no digits, so invisible to the
 * literal scan — from slipping back in.
 */
function bareViewersKeys(src: string): string[] {
  return [...stripComments(src).matchAll(/^[ \t]*viewers\s*:.*$/gm)].map((m) => m[0].trim());
}

/**
 * A braced expression that reads an audience field. Catches both a JSX
 * interpolation (`{(s.viewers / 1000).toFixed(1)}`) and an object literal that
 * carries the value onward into a rendered list (`{ viewers: s.viewerCount }`),
 * because both put an uncounted number one step from the screen. `[^{}]*` keeps
 * each match inside a single brace pair so a whole component body cannot be
 * swallowed as one match.
 *
 * `viewerCount={0}` is the one sanctioned pass-through: DarshanPlayer renders
 * its counter only when the value is positive (components/DarshanPlayer.tsx:225),
 * so 0 suppresses the badge rather than printing "0 watching".
 */
function audienceInBraces(src: string): string[] {
  const re = new RegExp(`\\{([^{}]*\\b(?:${AUDIENCE_FIELD})\\b[^{}]*)\\}`, 'g');
  return [...stripComments(src).matchAll(re)]
    .map((m) => m[1].trim())
    .filter((inner) => inner !== '0');
}

/**
 * `viewers / 1000` — the "12.5K" badge the three mobile screens rendered.
 * Rounding an invented number does not make it less invented; it makes it look
 * measured.
 */
function kFormattedAudience(src: string): string[] {
  const re = new RegExp(`\\b(?:${AUDIENCE_FIELD})\\s*\\/\\s*1000`, 'g');
  return [...stripComments(src).matchAll(re)].map((m) => m[0]);
}

const LANE = LANE_FILES.map((rel) => ({ rel, src: read(rel) }));

describe('DF-10 — no fabricated live-viewer count survives in the darshan/mobile lane', () => {
  it.each(LANE)('$rel assigns no non-zero audience literal', ({ rel, src }) => {
    expect(
      nonZeroAudienceLiterals(src),
      `${rel} hardcodes an audience size. Nothing on this surface counts viewers, ` +
        `so the number is invented — remove it and let the LIVE indicator carry the ` +
        `claim without digits (see lib/platform-stats.ts:5-24).`,
    ).toEqual([]);
  });

  it.each(LANE)('$rel declares no bare `viewers` data key', ({ rel, src }) => {
    expect(
      bareViewersKeys(src),
      `${rel} reintroduces a \`viewers\` field. There is no viewer-counting ` +
        `infrastructure to populate it.`,
    ).toEqual([]);
  });

  it.each(LANE)('$rel flows no audience number into rendered output', ({ rel, src }) => {
    expect(
      audienceInBraces(src),
      `${rel} puts an audience field on screen. Only \`viewerCount={0}\` — which ` +
        `suppresses the badge — may reach a component.`,
    ).toEqual([]);
  });

  it.each(LANE)('$rel formats no audience field as a "K" headcount', ({ rel, src }) => {
    expect(kFormattedAudience(src), `${rel} still renders a K-formatted headcount.`).toEqual([]);
  });

  it('the 12,450 figure deleted from the homepage on 2026-05-02 is gone from lane code', () => {
    const offenders = LANE.filter(({ src }) => /12[,_]?450/.test(stripComments(src))).map(
      ({ rel }) => rel,
    );

    expect(
      offenders,
      'The exact figure the 2026-05-02 content audit deleted is still shipping ' +
        '(docs/content-audit-2026-05-02.md:31).',
    ).toEqual([]);
  });

  it.each(LANE)('$rel still states liveness without a headcount', ({ rel, src }) => {
    // The positive half of the doctrine: removing the number must not remove
    // the claim. Every one of these surfaces keeps a digit-free live state.
    expect(/\bLIVE\b|'live'/i.test(src), `${rel} lost its live-state indicator`).toBe(true);
  });
});

/**
 * The scanners above are only worth having if they can go red. Each fixture is
 * a verbatim snippet of the code deleted on 2026-08-24, so a future refactor of
 * the regexes that quietly stops matching gets caught here rather than by
 * shipping a fabricated number to devotees.
 */
describe('DF-10 — the scanners detect the exact code that was removed', () => {
  const preFixFallbackStream = `
 {
 id: 'live-1',
 status: 'live',
 viewerCount: 12450,
 peakViewers: 18200,
 },`;

  const preFixMobileRow = `
 { name: 'Kashi Vishwanath', city: 'Varanasi', deity: 'Lord Shiva', viewers: 12450, img: hero },`;

  const preFixMobileBadge = `
 <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1">
 <Users className="w-2.5 h-2.5" />
 {(s.viewers / 1000).toFixed(1)}K
 </div>`;

  const preFixRelatedTempleRow = `
 {
 name: 'Mahakaleshwar Temple',
 isLive: true,
 viewers: 9800,
 },`;

  it('flags the fallback stream literals', () => {
    expect(nonZeroAudienceLiterals(preFixFallbackStream)).toEqual([
      'viewerCount: 12450',
      'peakViewers: 18200',
    ]);
  });

  it('flags an inline mobile row', () => {
    expect(nonZeroAudienceLiterals(preFixMobileRow)).toEqual(['viewers: 12450']);
  });

  it('flags the K-formatted badge, both as a render and as a division', () => {
    expect(audienceInBraces(preFixMobileBadge)).toEqual(['(s.viewers / 1000).toFixed(1)']);
    expect(kFormattedAudience(preFixMobileBadge)).toEqual(['viewers / 1000']);
  });

  it('flags a bare `viewers` key on its own line', () => {
    expect(bareViewersKeys(preFixRelatedTempleRow)).toEqual(['viewers: 9800,']);
  });

  it('accepts the sanctioned zero pass-through', () => {
    expect(nonZeroAudienceLiterals('viewerCount={0}')).toEqual([]);
    expect(audienceInBraces('<DarshanPlayer viewerCount={0} />')).toEqual([]);
  });

  it('reads past a comment that quotes the deleted number', () => {
    // Guards the stripComments contract directly: the fix comments in this lane
    // cite "12450" and `{viewerCount} watching` on purpose.
    const documented = `// was viewerCount: 12450 — see docs/content-audit-2026-05-02.md:31
 /* printed "{viewerCount} watching" */
 viewerCount: 0,`;
    expect(nonZeroAudienceLiterals(documented)).toEqual([]);
    expect(audienceInBraces(documented)).toEqual([]);
    expect(/12[,_]?450/.test(stripComments(documented))).toBe(false);
  });

  it('does not mistake an embed URL for a comment', () => {
    // stripComments must not eat the rest of a line at `https://`; if it did,
    // a literal after a URL on the same line would become invisible.
    const url = `{ playbackUrl: 'https://www.youtube.com/embed/x', viewerCount: 12450 },`;
    expect(nonZeroAudienceLiterals(url)).toEqual(['viewerCount: 12450']);
  });
});
