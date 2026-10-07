/**
 * Perf 2026-10-07: Latin pages must not download the Indic webfonts (~400 KB).
 * A unicode-range face downloads as soon as one matching glyph is painted, so
 * the first HTML of every page must carry no Indic-script characters, and the
 * rupee sign must not map to the Devanagari file.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { renderToString } from 'react-dom/server';
import { render, screen, fireEvent } from '@testing-library/react';

import { FooterLanguageLinks } from '../../components/FooterLanguageLinks';

const WEB = path.resolve(__dirname, '../..');
const INDIC = /[ऀ-ॿঀ-৿஀-௿ఀ-౿]/;

describe('Indic fonts load on demand', () => {
  it('the footer language links render no Indic glyph in the server HTML', () => {
    const html = renderToString(<FooterLanguageLinks />);
    // aria-label carries the native name for screen readers but is never painted.
    expect(INDIC.test(html.replace(/ aria-label="[^"]*"/g, ''))).toBe(false);
    for (const href of ['/hi', '/ta', '/te', '/bn', '/mr']) expect(html).toContain(`href="${href}"`);
    expect(html).toContain('hrefLang="hi"');
  });

  it('keeps every link accessible by name and swaps to native scripts on first hover', () => {
    render(<FooterLanguageLinks />);
    const hindi = screen.getByRole('link', { name: 'Hindi (हिन्दी)' });
    expect(INDIC.test(hindi.textContent ?? '')).toBe(false);
    fireEvent.pointerEnter(hindi);
    expect(screen.getByRole('link', { name: 'Hindi (हिन्दी)' }).textContent).toBe('हिन्दी');
    expect(screen.getByRole('link', { name: 'Tamil (தமிழ்)' }).textContent).toBe('தமிழ்');
    expect(screen.getByRole('link', { name: 'Telugu (తెలుగు)' }).textContent).toBe('తెలుగు');
    expect(screen.getByRole('link', { name: 'Bengali (বাংলা)' }).textContent).toBe('বাংলা');
    expect(screen.getByRole('link', { name: 'Hindi (हिन्दी)' }).getAttribute('lang')).toBe('hi');
  });

  it('app/layout.tsx source carries no Indic glyph outside comments', () => {
    const src = fs
      .readFileSync(path.join(WEB, 'app/layout.tsx'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*$/gm, '$1');
    expect(INDIC.test(src)).toBe(false);
  });

  it('the rupee sign is served by a tiny dedicated face, not the Devanagari file', () => {
    const layout = fs.readFileSync(path.join(WEB, 'app/layout.tsx'), 'utf8');
    const deva = /NotoSansDevanagari-var\.woff2[\s\S]*?unicode-range[\s\S]*?value:\s*"([^"]+)"/.exec(layout)![1]!;
    expect(deva.toUpperCase()).not.toContain('20B9');
    const css = fs.readFileSync(path.join(WEB, 'app/globals.css'), 'utf8');
    expect(css).toMatch(/font-family:\s*RupeeSign[\s\S]*?unicode-range:\s*U\+20B9/);
    const file = path.join(WEB, 'public/fonts/NotoSans-rupee.woff2');
    expect(fs.statSync(file).size).toBeLessThan(5000);
    expect((layout.match(/"RupeeSign"/g) ?? []).length).toBe(2);
  });
});
