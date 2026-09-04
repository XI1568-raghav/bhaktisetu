import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { render, screen } from '@testing-library/react';
import { blogFooterLinks, blogHasPublishedPosts } from '../lib/footer-blog-link';
import { PUBLISHED_POSTS } from '../content/blog/published';
import { listBlogPosts } from '../lib/blog-posts';

/**
 * HN-11 / LC-14 — /blog was an empty shell linked from the GLOBAL FOOTER.
 *
 * `content/blog/published.ts` exports an empty array and stays empty until a
 * draft is editorially approved, so every one of the ~1,785 pages the root
 * layout renders carried a "Blog" link to a section with zero posts. `/today`
 * carried a second one under the heading "More to read today", and
 * `app/sitemap.ts` listed `/blog` as a static entry, submitting the empty index
 * to Search Console.
 *
 * What is asserted here is the RULE, not today's emptiness: an ungated link to
 * /blog is forbidden while nothing is published, and permitted the moment
 * something is. So the day a post is appended to PUBLISHED_POSTS nothing here
 * goes spuriously red — the gate simply starts emitting the link again.
 *
 * Confirmed RED before the fix — every scan below was run against the pre-fix
 * sources and reported the offending literal:
 *   app/layout.tsx      `{ href: "/blog", t: "footer", key: "blog" }` (line 347)
 *   app/today/page.tsx  `<Link href="/blog" …>Blog</Link>`            (line 281)
 *   app/sitemap.ts      `{ path: '/blog', priority: 0.7 }`            (line 189)
 * `stripComments` is exercised in both directions below so that the prose in
 * this file, and in the fixed sources, cannot satisfy or defeat a scan.
 */

const WEB = path.resolve(__dirname, '..');

/** Strip block and `//` comments, preserving line structure. `[^:]` before `//` keeps `https://` intact. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function source(rel: string): string {
  return stripComments(fs.readFileSync(path.join(WEB, rel), 'utf8'));
}

/** A literal link to the blog index: JSX `href="/blog"` or an object `href: "/blog"`. */
function hasBlogIndexLink(src: string): boolean {
  return /href[=:]\s*["'`]\/blog["'`]/.test(src);
}

/** Does the file route its /blog decision through lib/footer-blog-link? */
function goesThroughGate(src: string): boolean {
  return /blogHasPublishedPosts|blogFooterLinks/.test(src);
}

/**
 * Every surface that navigates users to the blog. The footer is listed first
 * because it is the one the finding named and the widest one in the product.
 */
const NAV_SURFACES = ['app/layout.tsx', 'app/today/page.tsx'];

describe('HN-11 — no navigation surface advertises an empty blog', () => {
  it('the comment stripper works in both directions', () => {
    expect(stripComments('// href="/blog"\n')).not.toMatch(/\/blog/);
    expect(stripComments('/* href="/blog" */')).not.toMatch(/\/blog/);
    expect(stripComments('<Link href="/blog">')).toMatch(/\/blog/);
    expect(stripComments("const u = 'https://x.test/a';")).toMatch(/https:\/\/x\.test\/a/);
  });

  it('the detectors fire on the exact pre-fix literals (non-vacuity)', () => {
    // If these ever stop matching, every guard below silently becomes a no-op.
    expect(hasBlogIndexLink('{ href: "/blog", t: "footer", key: "blog" },')).toBe(true);
    expect(hasBlogIndexLink('<Link href="/blog" className="x">Blog</Link>')).toBe(true);
    expect(goesThroughGate('{ href: "/blog", t: "footer", key: "blog" },')).toBe(false);
    // A post link is not an index link — the guard must not over-fire on these.
    expect(hasBlogIndexLink('href={`/blog/${p.slug}`}')).toBe(false);
  });

  describe('the rule itself, in both states', () => {
    it('emits nothing while the blog is empty', () => {
      expect(blogHasPublishedPosts(0)).toBe(false);
      expect(blogFooterLinks(0)).toEqual([]);
    });

    it('emits the footer link once a post exists', () => {
      expect(blogHasPublishedPosts(1)).toBe(true);
      expect(blogFooterLinks(3)).toEqual([{ href: '/blog', t: 'footer', key: 'blog' }]);
    });

    it('defaults to the real published set', () => {
      expect(blogHasPublishedPosts()).toBe(PUBLISHED_POSTS.length > 0);
      expect(blogFooterLinks()).toHaveLength(PUBLISHED_POSTS.length > 0 ? 1 : 0);
    });
  });

  it('the global footer carries no /blog link of its own', () => {
    // The root layout cannot be rendered under vitest (next/font/google + the
    // whole i18n table), the constraint lib/footer-donate-link.ts records for
    // the same file. So the strongest available statement is that the layout
    // holds no blog link literal at all — its only route to one is the gate.
    const layout = source('app/layout.tsx');
    expect(hasBlogIndexLink(layout)).toBe(false);
    expect(goesThroughGate(layout)).toBe(true);
  });

  it.each(NAV_SURFACES)('%s links to /blog only through the gate', (rel) => {
    const src = source(rel);
    if (PUBLISHED_POSTS.length > 0) {
      // Posts exist: linking to /blog is legitimate, gated or not.
      return;
    }
    const ungated = hasBlogIndexLink(src) && !goesThroughGate(src);
    expect(ungated).toBe(false);
  });

  it('the sitemap does not submit the empty index to search engines', () => {
    const sitemap = source('app/sitemap.ts');
    // No unconditional static entry...
    expect(sitemap).not.toMatch(/\{\s*path:\s*['"]\/blog['"]/);
    // ...and the conditional one is tied to there being posts to index.
    expect(sitemap).toMatch(/blogEntries\.length\s*>\s*0/);
  });
});

describe('HN-11 — /blog itself is gated out of navigation, not removed', () => {
  it('the route files still exist', () => {
    expect(fs.existsSync(path.join(WEB, 'app/blog/page.tsx'))).toBe(true);
    expect(fs.existsSync(path.join(WEB, 'app/blog/[slug]/page.tsx'))).toBe(true);
  });

  it('listBlogPosts resolves rather than throwing when there is nothing to list', async () => {
    await expect(listBlogPosts()).resolves.toBeInstanceOf(Array);
  });

  it('renders an honest empty state for a direct visitor', async () => {
    const { default: BlogPage } = await import('../app/blog/page');
    const ui = await BlogPage();
    render(ui);
    // The deliberate empty state, not a heading above a bare grid.
    expect(screen.getByText(/First essays loading/i)).toBeTruthy();
    expect(screen.getAllByText(/Join the waitlist/i).length).toBeGreaterThan(0);
    // Not a bare grid with nothing in it: the state explains itself and offers
    // somewhere to go.
    expect(screen.getAllByText(/Email me when live/i).length).toBeGreaterThan(0);
  });
});
