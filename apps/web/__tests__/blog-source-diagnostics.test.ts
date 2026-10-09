/**
 * LC-14 (prod sweep 2026-08-12) — /blog renders zero posts.
 *
 * Root cause found while verifying: the index is not "empty because nothing is
 * written". `lib/blog-posts.ts` reads the post list from
 * `https://api.github.com/repos/XI1568-raghav/bhaktisetu/contents/docs/agent-reports/blog-drafts`
 * at request time, unauthenticated. That endpoint answers **404** — the repo is
 * not publicly readable — so `if (!res.ok) return []` fires on every single
 * request and always will. 30 drafts are sitting on origin/main; none of them
 * can ever reach the page over this transport.
 *
 * Every failure path in this module returned `[]` with no signal whatsoever, so
 * a permanently dead data source and a genuinely empty backlog were
 * indistinguishable in the logs. That is what these tests pin: the empty result
 * stays honest (never a fabricated post), and the failure announces itself.
 *
 * Publishing posts is NOT fixed here and cannot be: it needs (a) a decision on
 * how the drafts reach the runtime (make the repo readable, add a token, or
 * bundle the files at build time) and (b) editorial approval — all 30 drafts
 * are `status: draft` or `status: ready-for-founder-review`.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';

// These tests exercise the GitHub-fed path with nothing published in-bundle.
vi.mock('../content/blog/published', () => ({ PUBLISHED_POSTS: [] }));
import { listBlogPosts } from '../lib/blog-posts';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('LC-14 — the blog source must not fail silently', () => {
  it('logs a diagnostic when the post index is unreachable, and returns no posts', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Not Found', { status: 404 }) as unknown as Response,
    );

    const posts = await listBlogPosts();

    expect(posts).toEqual([]);
    expect(warn).toHaveBeenCalled();
    const message = warn.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(message).toContain('blog');
    expect(message).toContain('404');
  });

  it('logs a diagnostic when the fetch throws outright', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('network down'));

    const posts = await listBlogPosts();

    expect(posts).toEqual([]);
    expect(warn).toHaveBeenCalled();
    expect(warn.mock.calls.map((c) => c.join(' ')).join('\n')).toContain('blog');
  });

  it('says so when the source is reachable but every file is unusable', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        // Real filenames from docs/agent-reports/blog-drafts: 28 of the 30
        // use a YYYY-MM-W# week stamp that parseFilename rejects outright.
        JSON.stringify([
          {
            name: '2026-02-W1-monday-shiva-cluster.md',
            path: 'x',
            type: 'file',
            download_url: 'https://raw.example/x.md',
          },
        ]),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ) as unknown as Response,
    );

    const posts = await listBlogPosts();

    expect(posts).toEqual([]);
    expect(warn.mock.calls.map((c) => c.join(' ')).join('\n')).toContain('blog');
  });

  it('never invents a post to fill an empty index', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('[]', {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }) as unknown as Response,
    );

    await expect(listBlogPosts()).resolves.toEqual([]);
  });
});
