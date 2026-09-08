import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * [HOME-SCROLL] The sankalp thread's CSS contract.
 *
 * WHY A SOURCE TEST AND NOT A VISUAL ONE. The rail is driven by
 * `animation-timeline: scroll(root block)`, and scroll-driven animation cannot be
 * exercised in either environment available to CI or to an agent here: jsdom has
 * no layout or compositor, and the embedded preview browser reports
 * `document.visibilityState === "hidden"`, where rAF never fires and even a
 * JS-constructed `ScrollTimeline` stays pinned at 0% while the page scrolls
 * 0->100%. So the animation itself is verified by eye, once, by a human.
 *
 * What IS mechanically checkable is the contract — and the contract is where the
 * bug actually was. Every assertion below encodes a specific failure that
 * happened during development and produced NO visible error:
 *
 *   1. The `animation` shorthand sets animation-duration to 0s. A scroll-driven
 *      animation needs `auto`. With 0s the animation is complete before it
 *      starts and the element freezes on one keyframe while the page scrolls
 *      past it — while `animation-timeline` still computes to `scroll(root)`,
 *      `CSS.supports()` still returns true, and `playState` still reads
 *      "running". Nothing anywhere says it is broken.
 *
 *   2. An `animation-timeline` declaration that lands in an engine without
 *      support does not simply no-op — it can reset `animation` to a time-based
 *      default and run the keyframes on a TIMER, filling the thread in 0.3s
 *      while nobody scrolls. Hence @supports must WRAP the declarations, with
 *      the reduced-motion media query nested INSIDE it, not beside it.
 *
 *   3. transform and opacity are the only two properties a compositor can
 *      animate without paint. Animating height, background-color or
 *      stroke-dashoffset here would put paint on every scroll frame and forfeit
 *      the entire reason to use a scroll timeline — on the 4G Android this
 *      audience actually uses, that is the difference between free and janky.
 */

const css = readFileSync(
  path.resolve(__dirname, '..', 'app', 'globals.css'),
  'utf8',
);

/** The sankalp block only — so a match elsewhere in 1,700 lines cannot pass this. */
function sankalpBlock(): string {
  const start = css.indexOf('data-sankalp-fill');
  expect(start, 'the sankalp thread CSS is gone from globals.css').toBeGreaterThan(-1);
  const end = css.indexOf('@keyframes sankalp-tie');
  expect(end, 'the sankalp-tie keyframes are gone').toBeGreaterThan(start);
  return css.slice(start, end + 400);
}

describe('[HOME-SCROLL] the sankalp thread is driven by a scroll timeline, correctly', () => {
  it('binds both the fill and the knots to the scroll timeline', () => {
    const block = sankalpBlock();
    const bindings = block.match(/animation-timeline:\s*scroll\(root block\)/g) ?? [];
    expect(
      bindings.length,
      'expected the fill AND the knots each bound to scroll(root block)',
    ).toBeGreaterThanOrEqual(2);
  });

  it('uses animation LONGHANDS — the shorthand zeroes the duration', () => {
    const block = sankalpBlock();
    // `animation:` as a property, not `animation-name:`/`animation-timeline:` etc.
    const shorthand = block.match(/(^|[\s;{])animation:\s/g) ?? [];
    expect(
      shorthand.length,
      'the `animation` shorthand is back. It sets animation-duration to 0s, so the ' +
        'scroll-driven animation completes before it starts and freezes on one ' +
        'keyframe — while animation-timeline still computes to scroll(root) and ' +
        'CSS.supports() still returns true. Use the longhands.',
    ).toBe(0);
  });

  it('declares animation-duration: auto, which is what a scroll timeline requires', () => {
    const block = sankalpBlock();
    const autos = block.match(/animation-duration:\s*auto/g) ?? [];
    expect(autos.length, 'every scroll-driven rule needs duration auto').toBeGreaterThanOrEqual(2);
  });

  it('nests prefers-reduced-motion INSIDE @supports, not beside it', () => {
    const supportsAt = css.indexOf('@supports (animation-timeline: scroll())');
    expect(supportsAt, 'the @supports guard is gone').toBeGreaterThan(-1);
    const after = css.slice(supportsAt, supportsAt + 400);
    expect(
      after,
      'prefers-reduced-motion must be nested inside the @supports block — an ' +
        'animation-timeline declaration reaching an unsupporting engine can run the ' +
        'keyframes on a timer instead of no-opping',
    ).toMatch(/@media\s*\(prefers-reduced-motion:\s*no-preference\)/);
  });

  it('animates only compositor-only properties', () => {
    const kf = css.slice(css.indexOf('@keyframes sankalp-grow'));
    const grow = kf.slice(0, kf.indexOf('}', kf.indexOf('}') + 1) + 1);
    expect(grow).toMatch(/transform:\s*scaleY/);
    for (const paintProp of ['height:', 'width:', 'background-color:', 'stroke-dashoffset:', 'top:', 'margin']) {
      expect(
        grow,
        `${paintProp} in the thread keyframes forces paint on every scroll frame`,
      ).not.toContain(paintProp);
    }
  });

  it('has a resting state OUTSIDE @supports, so an unsupporting engine gets a deliberate rail', () => {
    const supportsAt = css.indexOf('@supports (animation-timeline: scroll())');
    const before = css.slice(css.indexOf('data-sankalp-fill'), supportsAt);
    // The fallback must set the fill to scaleY(0) and dim the dots, so the rail
    // reads as a hairline with dots rather than a half-drawn broken thread.
    expect(before, 'no fallback transform for the fill').toMatch(/transform:\s*scaleY\(0\)/);
    expect(before, 'no fallback opacity for the knots').toMatch(/opacity:\s*0?\.\d+/);
  });

  it('scroll-padding-top clears the fixed header, or every knot lands under it', () => {
    // The header is `fixed ... h-16` (64px) in app/layout.tsx. Verified live:
    // jumping to #lanes puts the section top at exactly 80px.
    expect(css).toMatch(/scroll-padding-top:\s*5rem/);
  });
});
