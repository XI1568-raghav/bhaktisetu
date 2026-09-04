import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import CreditsPage, { metadata } from '../app/credits/page';
import { getAllArticlesAcrossCategories } from '../lib/content';
import {
  WIKIPEDIA_TEXT_LICENSE,
  parseWikipediaSources,
  requiresShareAlikeNotice,
} from '../lib/encyclopedia-attribution';

// CI-15 — the register half.
//
// components/CategoryArticle.tsx already discharges the per-article obligation
// (an article that cites Wikipedia carries the notice, the linked source and
// the named licence). What was still missing is the site-level statement:
// /credits is the only page on Darshya that discusses licensing, it covered
// Wikimedia Commons IMAGES only, and its own <title> said "Image Credits".
//
// CC BY-SA 4.0 §3(a) wants the notice "in any reasonable manner based on the
// medium". For a site that reuses Wikipedia prose across 60-odd articles, that
// means the credits page has to say so and has to say the derived text is
// shared alike — otherwise the only place a reader could learn the licence is
// by opening each article one at a time.
//
// These assertions read the RENDERED page and the RUNTIME corpus, so the count
// tracks the content directory rather than a number typed into a test.

const OBLIGATED = getAllArticlesAcrossCategories().filter((a) =>
  requiresShareAlikeNotice(a.frontmatter.sources),
);

/** Every distinct Wikipedia article the whole corpus draws on. */
const DISTINCT_SOURCES = new Map(
  OBLIGATED.flatMap((a) => parseWikipediaSources(a.frontmatter.sources)).map((s) => [s.url, s]),
);

describe('CI-15 — there is a register to publish', () => {
  it('the corpus really does reuse Wikipedia text', () => {
    expect(OBLIGATED.length).toBeGreaterThan(40);
    // 45 of them are the /ved encyclopedia, which is what the finding counted.
    expect(OBLIGATED.filter((a) => a.frontmatter.category === 'ved').length).toBe(45);
  });

  it('and every obligated article resolves to at least one linkable source', () => {
    for (const a of OBLIGATED) {
      expect(parseWikipediaSources(a.frontmatter.sources).length, a.frontmatter.slug)
        .toBeGreaterThan(0);
    }
  });
});

describe('CI-15 — /credits states the CC BY-SA obligation for text', () => {
  it('has a text-sources section, not only image sections', () => {
    render(<CreditsPage />);
    expect(screen.getByRole('heading', { name: /text sources/i })).toBeTruthy();
  });

  it('names the licence and links to it', () => {
    render(<CreditsPage />);
    const section = screen.getByTestId('text-sources');

    expect(section.textContent).toContain(WIKIPEDIA_TEXT_LICENSE.name);
    const licence = within(section).getAllByRole('link', {
      name: new RegExp(WIKIPEDIA_TEXT_LICENSE.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
    });
    expect(licence.length).toBeGreaterThan(0);
    expect(licence[0]).toHaveAttribute('href', WIKIPEDIA_TEXT_LICENSE.url);
  });

  it('states share-alike — that Darshya’s derived text carries the same licence', () => {
    render(<CreditsPage />);
    const section = screen.getByTestId('text-sources');
    expect(section.textContent).toMatch(/same licence|share-alike|shared under/i);
  });

  it('states how many articles the obligation covers, off the real corpus', () => {
    render(<CreditsPage />);
    const section = screen.getByTestId('text-sources');
    expect(section.textContent).toContain(String(OBLIGATED.length));
  });

  it('enumerates every obligated article, each linked to the page it is published at', () => {
    render(<CreditsPage />);
    const section = screen.getByTestId('text-sources');

    for (const a of OBLIGATED) {
      const href = `/${a.frontmatter.category}/${a.frontmatter.slug}`;
      const link = section.querySelector(`a[href="${href}"]`);
      expect(link, `${href} is not listed on /credits`).not.toBeNull();
    }
  });

  it('links back to each cited Wikipedia article — the hyperlink the licence asks for', () => {
    render(<CreditsPage />);
    const section = screen.getByTestId('text-sources');

    expect(DISTINCT_SOURCES.size).toBeGreaterThan(10);
    for (const [url] of DISTINCT_SOURCES) {
      const link = section.querySelector(`a[href="${url}"]`);
      expect(link, `${url} has no link back`).not.toBeNull();
    }
  });

  it('keeps both image sections — this is an addition, not a replacement', () => {
    render(<CreditsPage />);
    expect(screen.getByRole('heading', { name: /wikimedia commons sources/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /other image sources/i })).toBeTruthy();
  });
});

describe('CI-15 — the page no longer describes itself as images only', () => {
  it('the title covers text as well', () => {
    expect(String(metadata.title)).not.toBe('Image Credits');
    expect(String(metadata.title)).toMatch(/credit|attribution/i);
  });

  it('the description mentions the text licence, not only photographs', () => {
    expect(String(metadata.description)).toMatch(/text|article/i);
  });
});
