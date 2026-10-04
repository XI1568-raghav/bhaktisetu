/**
 * [CM-08] The credits PAGE renders the attribution register.
 *
 * lib/image-credits.ts (70 rows, provenance read from the Commons
 * imageinfo/extmetadata API) and its 16-test guard were written and then never
 * wired to anything: `grep -rn "COMMONS_CREDITS" apps/web` outside the lib
 * returned only the test file. app/credits/page.tsx kept its own hardcoded
 * 57-row array, so 14 register rows — 11 of them attribution-required, incl.
 * Rudraksha_mala.jpg, the file CM-08 was measuring — were displayed with no
 * credit anywhere a user can see. The existing tests all passed the whole time
 * because they join the register to lib/images.ts and never look at the page.
 *
 * So this file asserts on the RENDERED OUTPUT of the page, not on source text:
 * a source grep for `COMMONS_CREDITS` would be satisfied by an unused import.
 */

import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import CreditsPage from '../app/credits/page';
import { COMMONS_CREDITS, commonsSourcePage } from '../lib/image-credits';

const html = renderToStaticMarkup(React.createElement(CreditsPage as () => React.ReactElement));

describe('[CM-08] every attribution-required Commons file is credited on /credits', () => {
  it('the register is non-trivial (this guard is measuring something)', () => {
    expect(COMMONS_CREDITS.length).toBeGreaterThan(50);
    expect(COMMONS_CREDITS.filter((c) => c.attributionRequired).length).toBeGreaterThan(30);
  });

  it('names every attribution-required author in the rendered page', () => {
    const missing = COMMONS_CREDITS.filter((c) => c.attributionRequired).filter(
      (c) => !html.includes(c.author),
    );
    expect(
      missing.map((c) => `${c.file} (${c.author}, ${c.license})`),
      'these files are displayed on the site under a licence that REQUIRES ' +
        'attribution, and their author appears nowhere on the credits page.\n' +
        missing.map((c) => `${c.file} — ${c.author}`).join('\n'),
    ).toEqual([]);
  });

  it('links every credited file to its Commons source page', () => {
    const missing = COMMONS_CREDITS.filter(
      (c) => c.attributionRequired && !html.includes(commonsSourcePage(c.file)),
    );
    expect(missing.map((c) => c.file), 'no link back to the source page').toEqual([]);
  });

  it('does not keep a second, divergent list hardcoded in the page', () => {
    const src = readFileSync(path.resolve(__dirname, '../app/credits/page.tsx'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
    expect(
      src,
      'the page still declares its own credit rows. Two lists is how the rendered ' +
        'page drifted 14 rows behind the register in the first place.',
    ).not.toMatch(/filename:\s*["']/);
    expect(src, 'the page must read the register').toMatch(/COMMONS_CREDITS/);
  });

  it('does not claim store product photography is Unsplash', () => {
    // 13 IMAGES.store entries are Wikimedia Commons, 10 of them
    // attribution-required. Saying otherwise on the credits page is a false
    // licensing statement on the paid storefront's own attribution page.
    const unsplashSentence = /store products[^<]*(?:<[^>]*>)*[^<]*Unsplash/i.test(html);
    expect(
      unsplashSentence,
      'the page tells the reader store product photography comes from Unsplash. ' +
        'IMAGES.store hotlinks 13 Wikimedia Commons files.',
    ).toBe(false);
  });
});

/**
 * CM-08, resilience half — the catalogue image degrades instead of holing.
 *
 * Every catalogue image is hotlinked from upload.wikimedia.org and Wikimedia
 * rate-limits a concurrent burst, which is exactly what a page load is:
 * measured 2026-08-19, 7 of the 10 puja images 429'd when their HEADs went out
 * in parallel and all 10 returned 200 when re-run serially. With no onError
 * those cards paint a blank 382x239 box over the saffron gradient.
 */
describe('[CM-08] a rate-limited image does not leave a hole in the grid', () => {
  const cardSrc = readFileSync(path.resolve(__dirname, '../app/pujas/(index)/page.tsx'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');

  it('the /pujas card image has an error path', () => {
    expect(
      cardSrc,
      'the card image is a bare <img> with no onError — a 429 paints an empty box',
    ).toMatch(/<RemoteImage/);
  });

  it('RemoteImage actually removes itself on error rather than logging', async () => {
    const { default: RemoteImage } = await import('../components/RemoteImage');
    const { render, fireEvent } = await import('@testing-library/react');
    const { container } = render(
      React.createElement(RemoteImage, { src: 'https://upload.wikimedia.org/x.jpg', alt: 'x' }),
    );
    const img = container.querySelector('img');
    expect(img, 'nothing rendered for a good src').not.toBeNull();
    fireEvent.error(img!);
    expect(
      container.querySelector('img'),
      'the element must be removed so the wrapper gradient shows through',
    ).toBeNull();
  });

  it('renders nothing at all for an empty src', async () => {
    const { default: RemoteImage } = await import('../components/RemoteImage');
    const { render } = await import('@testing-library/react');
    const { container } = render(React.createElement(RemoteImage, { src: '', alt: 'x' }));
    expect(container.querySelector('img')).toBeNull();
  });
});
