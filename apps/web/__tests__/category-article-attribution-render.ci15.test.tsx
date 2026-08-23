import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';
import CategoryArticle from '../components/CategoryArticle';
import { getArticle } from '../lib/content';
import {
  WIKIPEDIA_TEXT_LICENSE,
  requiresShareAlikeNotice,
  wikipediaAttribution,
} from '../lib/encyclopedia-attribution';

/**
 * CI-15 (rendering half) — encyclopedia-wikipedia-attribution.ci15.test.ts
 * locks down lib/encyclopedia-attribution.ts, which turns a `sources` array
 * into the exact attribution CC BY-SA 4.0 §3(a)(1) requires. Nothing rendered
 * it: components/CategoryArticle.tsx printed each source as an inert bullet of
 * plain text, so all 63 Wikipedia-sourced articles shipped with no licence
 * named, no hyperlink back to the article, and no share-alike statement.
 *
 * One component renders every /ved, /sanatan and /sanskrit article, so this is
 * the single site where the obligation is discharged.
 */

const COMPONENT = path.resolve(__dirname, '../components/CategoryArticle.tsx');

/** A guard that matches a COMMENT passes on a file where the fix was reverted. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

function sourcesAside(container: HTMLElement): HTMLElement {
  const headings = Array.from(container.querySelectorAll('h3'));
  const h = headings.find((el) => /sources/i.test(el.textContent ?? ''))!;
  expect(h, 'the Sources aside must exist').toBeDefined();
  return h.closest('aside') as HTMLElement;
}

describe('CI-15 — an article that cites Wikipedia renders its CC BY-SA attribution', () => {
  it('the "Wikipedia: <Title>" form links the article and the licence', () => {
    const article = getArticle('ved', 'katha-upanishad')!;
    expect(requiresShareAlikeNotice(article.frontmatter.sources)).toBe(true);
    const attrib = wikipediaAttribution(article.frontmatter.sources)!;

    const { container } = render(
      <CategoryArticle category="ved" slug="katha-upanishad" categoryLabel="Vedas" />,
    );
    const aside = within(sourcesAside(container));

    expect(aside.getByText(attrib.notice)).toBeInTheDocument();

    const wiki = aside.getByRole('link', { name: 'Katha Upanishad' });
    expect(wiki).toHaveAttribute('href', 'https://en.wikipedia.org/wiki/Katha_Upanishad');
    expect(wiki.getAttribute('rel') ?? '').toContain('noopener');

    const licence = aside.getByRole('link', { name: WIKIPEDIA_TEXT_LICENSE.name });
    expect(licence).toHaveAttribute('href', WIKIPEDIA_TEXT_LICENSE.url);
  });

  it('the bare-URL form used by /sanatan links the same way', () => {
    const article = getArticle('sanatan', 'bhakti-yoga-path')!;
    const attrib = wikipediaAttribution(article.frontmatter.sources)!;

    const { container } = render(
      <CategoryArticle category="sanatan" slug="bhakti-yoga-path" categoryLabel="Sanatan Dharma" />,
    );
    const aside = within(sourcesAside(container));

    expect(aside.getByText(attrib.notice)).toBeInTheDocument();
    const wiki = aside.getByRole('link', { name: 'Bhakti yoga' });
    expect(wiki).toHaveAttribute('href', 'https://en.wikipedia.org/wiki/Bhakti_yoga');
    expect(aside.getByRole('link', { name: WIKIPEDIA_TEXT_LICENSE.name })).toHaveAttribute(
      'href',
      WIKIPEDIA_TEXT_LICENSE.url,
    );
  });

  it('an article that cites no Wikipedia carries no licence claim', () => {
    const article = getArticle('ved', 'soma-rigveda')!;
    expect(article.frontmatter.sources!.length).toBeGreaterThan(0);
    expect(requiresShareAlikeNotice(article.frontmatter.sources)).toBe(false);

    const { container } = render(
      <CategoryArticle category="ved" slug="soma-rigveda" categoryLabel="Vedas" />,
    );
    const aside = sourcesAside(container);
    expect(aside.textContent).not.toContain(WIKIPEDIA_TEXT_LICENSE.name);
    expect(within(aside).queryByRole('link', { name: WIKIPEDIA_TEXT_LICENSE.name })).toBeNull();
    // The plain bibliography is still printed.
    expect(aside.textContent).toContain('Jamison & Brereton 2014');
  });

  it('the raw citation string is still shown — the notice supplements it', () => {
    const { container } = render(
      <CategoryArticle category="ved" slug="katha-upanishad" categoryLabel="Vedas" />,
    );
    const aside = sourcesAside(container);
    expect(aside.textContent).toContain('Olivelle — Early Upanishads 1998');
  });

  it('the component derives the notice from the helper, not hand-written prose', () => {
    const src = stripComments(fs.readFileSync(COMPONENT, 'utf8'));
    expect(src).toMatch(/wikipediaAttribution/);
    // A hardcoded licence URL here would drift from the helper.
    expect(src).not.toMatch(/creativecommons\.org/);
  });
});
