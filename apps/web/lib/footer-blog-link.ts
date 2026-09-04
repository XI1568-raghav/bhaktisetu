import { PUBLISHED_POSTS } from '../content/blog/published';

/**
 * HN-11 / LC-14 — whether any navigation surface may advertise /blog.
 *
 * `PUBLISHED_POSTS` is empty and stays empty until a draft is editorially
 * approved (see content/blog/published.ts). The site footer is rendered by the
 * ROOT layout, so the "Blog" entry it carried put a link to a section with zero
 * posts on every page of the site — the widest surface in the product, and the
 * one place a visitor is most likely to trust as a real destination.
 *
 * This is a GATE, not a deletion. `/blog` still resolves, still has an honest
 * empty state, and still works for anyone holding a direct link. The moment one
 * entry is appended to PUBLISHED_POSTS the link comes back everywhere on its
 * own — no second commit, nothing to remember.
 *
 * It lives in its own module for the same reason lib/footer-donate-link.ts
 * does: app/layout.tsx pulls next/font/google and the whole i18n table and
 * cannot be rendered under vitest, so an inline ternary could only be checked
 * by regex-scanning source — and a regex cannot tell which branch runs. Here
 * the rule is executable and __tests__/hn11-blog-nav-link.test.ts exercises
 * both states for real.
 */
export type BlogFooterLink = { href: '/blog'; t: 'footer'; key: 'blog' };

/** True when the blog has something to show. The one condition, in one place. */
export function blogHasPublishedPosts(
  publishedCount: number = PUBLISHED_POSTS.length,
): boolean {
  return publishedCount > 0;
}

/**
 * Spread into a footer column: `...blogFooterLinks(),`. Empty while the blog
 * is empty, so the column simply closes over the gap.
 */
export function blogFooterLinks(
  publishedCount: number = PUBLISHED_POSTS.length,
): BlogFooterLink[] {
  return blogHasPublishedPosts(publishedCount)
    ? [{ href: '/blog', t: 'footer', key: 'blog' }]
    : [];
}
