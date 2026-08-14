/**
 * LC-14 (prod sweep 2026-08-12), remaining half — /blog could not render a post
 * even if one were approved, because the only transport was a request-time
 * fetch of the GitHub Contents API that answers 404 for this repo.
 *
 * The earlier wave made that failure audible (see blog-source-diagnostics)
 * without giving posts a way in. This pins the way in: an in-bundle published
 * set that needs no network, no token and no filesystem, so publishing is a
 * commit rather than an infrastructure change. Whether anything is published is
 * still an editorial call — `PUBLISHED_POSTS` ships empty on purpose, which is
 * why these tests inject their own.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

vi.mock('../content/blog/published', () => ({
  PUBLISHED_POSTS: [
    {
      slug: 'why-video-proof-matters',
      date: '2026-08-01',
      body: '# Why video proof matters\n\nEvery puja booked on Darshya returns a video.\n\nMore body text.',
    },
    {
      slug: 'panchang-for-modern-devotees',
      date: '2026-08-09',
      body: '# Panchang for modern devotees\n\nThe five limbs of the Hindu calendar, explained.',
    },
  ],
}));

let listBlogPosts: typeof import('../lib/blog-posts').listBlogPosts;
let getBlogPost: typeof import('../lib/blog-posts').getBlogPost;

beforeEach(async () => {
  ({ listBlogPosts, getBlogPost } = await import('../lib/blog-posts'));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('LC-14 — a published post reaches /blog without GitHub', () => {
  it('renders published posts even when the GitHub index is 404 (today\'s live state)', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Not Found', { status: 404 }) as unknown as Response,
    );

    const posts = await listBlogPosts();

    expect(posts.map((p) => p.slug)).toEqual([
      'panchang-for-modern-devotees',
      'why-video-proof-matters',
    ]);
  });

  it('derives the title and excerpt from the markdown, like a fetched post', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('network down'));

    const post = await getBlogPost('why-video-proof-matters');

    expect(post).not.toBeNull();
    expect(post!.title).toBe('Why video proof matters');
    expect(post!.excerpt).toBe('Every puja booked on Darshya returns a video.');
  });

  it('carries no GitHub source link — the post is not on GitHub', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('network down'));

    const post = await getBlogPost('panchang-for-modern-devotees');

    expect(post!.source).toBeNull();
  });

  it('a published post wins over a same-slug draft still sitting on GitHub', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(globalThis, 'fetch').mockImplementation((async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('api.github.com')) {
        return new Response(
          JSON.stringify([
            {
              name: '2026-07-01-why-video-proof-matters.md',
              path: 'x',
              type: 'file',
              download_url: 'https://raw.example/x.md',
            },
          ]),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      return new Response('# Stale draft\n\nAn unapproved earlier version.', { status: 200 });
    }) as unknown as typeof fetch);

    const posts = await listBlogPosts();

    expect(posts.filter((p) => p.slug === 'why-video-proof-matters')).toHaveLength(1);
    expect(posts.find((p) => p.slug === 'why-video-proof-matters')!.title).toBe(
      'Why video proof matters',
    );
  });

  it('the post page consumes the nullable source instead of emitting a hrefless link', () => {
    const src = readFileSync(
      path.join(__dirname, '..', 'app', 'blog', '[slug]', 'page.tsx'),
      'utf8',
    );
    // The anchor must sit behind a guard on post.source, not be rendered flat.
    const guard = src.indexOf('post.source ?');
    const anchor = src.indexOf('href={post.source}');
    expect(guard).toBeGreaterThan(-1);
    expect(anchor).toBeGreaterThan(guard);
  });
});
