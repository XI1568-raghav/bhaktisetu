/**
 * The published blog: posts that ship inside the app bundle.
 *
 * LC-14 (prod sweep 2026-08-12): /blog rendered zero posts, and the reason was
 * transport, not an empty backlog. `lib/blog-posts.ts` fetched the index from
 * the GitHub Contents API at request time; that endpoint answers 404 because
 * the repo is not publicly readable, so `if (!res.ok) return []` fired on every
 * request and always would. 30 drafts sat on main that no reader could ever
 * see.
 *
 * Three ways out were possible — make the repo publicly readable, provision a
 * GitHub token for the web service, or bundle the posts. Only the third is a
 * code decision, so it is the one taken here: a post in this array is compiled
 * into the server bundle, needs no network, no token, no rate limit (the
 * unauthenticated GitHub API allows 60 requests/hour for the whole service) and
 * no filesystem. Notably it also survives the Render standalone Docker image,
 * which copies `.next/standalone`, `.next/static` and `public/` and nothing
 * else — a runtime `fs` read of `content/` would resolve during `next build`
 * and then come back empty on every ISR revalidation in the container.
 *
 * Publishing is now one commit: append an entry below. `date` is the published
 * date (YYYY-MM-DD, used for ordering and the <time> line), `slug` is the URL
 * segment (/blog/<slug>), and `body` is markdown — the first `# heading`
 * becomes the title and the first paragraph becomes the excerpt, exactly as for
 * a post fetched from GitHub.
 *
 * The array is deliberately empty. What Darshya publishes under its own name is
 * an editorial decision and all 30 existing drafts are `status: draft` or
 * `status: ready-for-founder-review`; none has been approved. Until one is, the
 * index keeps its honest "no posts yet" state rather than inventing content.
 */

export interface PublishedPost {
  /** URL segment: /blog/<slug>. Lowercase, dash-separated. */
  slug: string;
  /** Published date, YYYY-MM-DD. Sorted newest first. */
  date: string;
  /** Markdown. First `# heading` is the title; first paragraph the excerpt. */
  body: string;
}

export const PUBLISHED_POSTS: PublishedPost[] = [];
