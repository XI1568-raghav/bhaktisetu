/**
 * [CWV-01 residual 3] /gaushala was the last route emitting zero `srcset`.
 *
 * The triage's residual list (docs/audit/triage-2026-08-15.md, "What is
 * genuinely still binding") named two routes that emitted no `srcset` at all
 * across 26 `<img>` tags while /pujas and /store emitted it on every one. The
 * homepage half closed in the 2026-08-23 pass. This is the other half.
 *
 * MEASURED against Commons on 2026-09-01, per unique file behind the eight
 * cards (the strip renders eight cows drawn from four distinct photographs):
 *
 *   Gir_cow.jpg                     500px  85,574 B   330px  39,267 B
 *   Tharparkar_01.JPG               500px  68,454 B   330px  32,743 B
 *   Sahiwala_01.JPG                 500px  75,914 B   330px  35,097 B
 *   Red_Sindhi_Cow_at_Pakistan.jpg  500px  54,087 B   330px  25,539 B
 *   unique total                          284,029 B         132,646 B
 *
 * i.e. -151,383 B (-53.3%) on a 1x viewport. A 2x device still needs ~520 CSS
 * px of pixels for the 260px card and still picks the 500px candidate, so this
 * is not a quality trade — it stops 1x devices paying for pixels they cannot
 * display.
 *
 * WHY A RENDER TEST AND NOT A SOURCE SCAN. `remoteSrcSet` returns `undefined`
 * for any host it cannot resize, and React then omits the attribute entirely
 * while leaving `sizes` in place — so a source scan can see the prop written
 * and the DOM can still have no srcset. The assertions below read the rendered
 * markup. (`sizes` alone is inert: with nothing to choose between, the browser
 * ignores it and every device downloads `src`.)
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';

vi.mock('../components/ApprovedProvidersStrip', () => ({
  ApprovedProvidersStrip: () => <div data-testid="providers-strip" />,
}));

afterEach(cleanup);

/** Parse a `srcset` value into [url, widthDescriptor] pairs. */
function candidates(srcset: string): Array<{ url: string; w: number }> {
  return srcset
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const [url, w] = s.split(/\s+/);
      return { url: url ?? '', w: Number.parseInt(w ?? '0', 10) };
    });
}

async function cowImages(): Promise<HTMLImageElement[]> {
  const { default: Page } = await import('../app/gaushala/page');
  const { container } = render(<Page />);
  expect((container.textContent ?? '').length, 'the page did not render').toBeGreaterThan(500);
  /* The eight adoption cards are the only <img> on this route that link into
   * /gaushala/<cow id>. Anchoring on the link keeps this test measuring the
   * strip the finding is about even if the page gains other imagery. */
  return Array.from(container.querySelectorAll('a[href^="/gaushala/cow_"] img'));
}

describe('[CWV-01] /gaushala cow cards offer a phone-sized candidate', () => {
  it('the scan finds the cards at all (an empty selector cannot pass this file)', async () => {
    const imgs = await cowImages();
    expect(imgs.length, 'no cow card <img> found — the selector or the strip moved').toBe(8);
  });

  it('the candidate parser distinguishes a real srcset from an absent one', () => {
    /* Non-vacuity: before the fix these tags carried `src` and nothing else,
     * and `getAttribute('srcset')` returned null. Asserted so a regression that
     * removes the attribute cannot read as "no candidates to check". */
    expect(candidates('https://x/330px-a.jpg 330w, https://x/500px-a.jpg 500w')).toEqual([
      { url: 'https://x/330px-a.jpg', w: 330 },
      { url: 'https://x/500px-a.jpg', w: 500 },
    ]);
    expect(candidates('')).toEqual([]);
  });

  it('every card emits a srcset that reached the DOM', async () => {
    for (const img of await cowImages()) {
      const srcset = img.getAttribute('srcset');
      expect(
        srcset,
        `no srcset on "${img.getAttribute('alt')}" — every device downloads src ` +
          '(remoteSrcSet returns undefined for hosts it cannot resize, and React ' +
          'then drops the attribute silently)',
      ).toBeTruthy();
      // TD-09: self-hosted photos offer 250/500 (330 snaps up to 500 and dedupes).
      expect(candidates(srcset!).length, 'the candidate list collapsed to one entry').toBeGreaterThanOrEqual(2);
    }
  });

  it('the candidates are 250 and 500 and each URL matches its own descriptor', async () => {
    for (const img of await cowImages()) {
      const cands = candidates(img.getAttribute('srcset')!);
      expect(cands.map((c) => c.w)).toEqual([250, 500]);
      for (const c of cands) {
        /* The descriptor must be the width Commons actually serves, not the
         * width that was asked for, or the browser picks the wrong candidate. */
        expect(c.url, `${c.w}w descriptor points at a different file`).toMatch(
          new RegExp(`(-${c.w}\\.webp|/${c.w}px-)`),
        );
      }
    }
  });

  it('a 1x phone can pick something strictly smaller than src', async () => {
    /* The whole point. If the smallest candidate were the same URL as `src`
     * the srcset would be decoration. */
    for (const img of await cowImages()) {
      const cands = candidates(img.getAttribute('srcset')!);
      const smallest = cands[0]!;
      expect(smallest.url).not.toBe(img.getAttribute('src'));
      expect(smallest.w).toBeLessThan(500);
    }
  });

  it('sizes states the fixed card width, not a viewport fraction', async () => {
    /* The strip is a horizontal snap-scroller: the card is min-w-[260px]
     * sm:min-w-[280px], so its width is fixed by the card and not by the
     * viewport. A `100vw` here would make a 390px phone ask for the 500px
     * candidate again and undo the fix. */
    for (const img of await cowImages()) {
      const sizes = img.getAttribute('sizes');
      expect(sizes, 'no sizes: the browser falls back to 100vw').toBeTruthy();
      expect(sizes!, 'sizes describes the viewport, not the card').not.toMatch(/\d+vw/);
      expect(sizes!).toMatch(/260px/);
      expect(sizes!).toMatch(/280px/);
    }
  });

  it('the cards still declare intrinsic dimensions (PERF-04 must not regress)', async () => {
    for (const img of await cowImages()) {
      expect(img.getAttribute('width'), 'no width — CLS').toBeTruthy();
      expect(img.getAttribute('height'), 'no height — CLS').toBeTruthy();
    }
  });
});
