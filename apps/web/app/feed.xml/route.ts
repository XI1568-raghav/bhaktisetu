// Public RSS 2.0 feed — blog posts + agent updates surfaced for syndication.
// Routes that publish externally (Feedly, Inoreader, NewsBlur etc.) discover
// via <link rel="alternate" type="application/rss+xml"> in app/layout.tsx.

import { listBlogPosts } from '../../lib/blog-posts';

export const runtime = 'edge';
export const revalidate = 1800; // 30 min — matches /updates cadence

const SITE = 'https://darshya.online';
const FEED_TITLE = "Darshya — India's Devotional Super App";
const FEED_DESC =
  'Live darshan, online puja booking, daily panchang, Vedic learning, gaushala seva, AI pandit — fresh content daily.';

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function rfc822(date: string): string {
  // YYYY-MM-DD → Sat, 27 May 2026 00:00:00 +0000
  try {
    return new Date(`${date}T00:00:00Z`).toUTCString();
  } catch {
    return new Date().toUTCString();
  }
}

export async function GET(): Promise<Response> {
  let posts: Awaited<ReturnType<typeof listBlogPosts>> = [];
  try {
    posts = await listBlogPosts();
  } catch {
    posts = [];
  }

  const items = posts
    .slice(0, 30)
    .map((p) => {
      const link = `${SITE}/blog/${p.slug}`;
      const excerpt = p.excerpt || p.body.slice(0, 400);
      return `    <item>
      <title>${esc(p.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${rfc822(p.date)}</pubDate>
      <description>${esc(excerpt)}</description>
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(FEED_TITLE)}</title>
    <link>${SITE}</link>
    <description>${esc(FEED_DESC)}</description>
    <language>en-in</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE}/feed.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'content-type': 'application/rss+xml; charset=utf-8',
      'cache-control': 'public, max-age=1800, s-maxage=1800',
    },
  });
}
