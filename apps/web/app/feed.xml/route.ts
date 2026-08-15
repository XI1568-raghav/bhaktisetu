// Public RSS 2.0 feed — blog posts + the festival calendar, surfaced for
// syndication. Every page advertises this feed via
// <link rel="alternate" type="application/rss+xml"> in app/layout.tsx.
//
// SEO-08 (prod sweep 2026-08-12): this feed was advertised in every page head
// and served ZERO <item> elements. Its only source was listBlogPosts(), whose
// two transports are (a) content/blog/published.ts, deliberately empty because
// no draft has been editorially approved, and (b) the GitHub Contents API,
// which answers 404 because the repo is not publicly readable. So the feed was
// not "empty for now" — it was structurally incapable of ever having an item.
// An advertised empty feed is worse than no feed: readers that subscribe get a
// dead subscription and some drop the source permanently.
//
// The fix is to publish content that actually exists. The festival calendar in
// lib/festivals.ts is real, dated, in-bundle content with a live page per entry
// at /festival/<slug> — exactly what a devotional feed should carry. Blog posts
// still take part and will simply appear alongside once any is published.
//
// pubDate honesty: a festival item is dated with the festival's own date, and
// the feed prefers festivals that have already occurred so no item carries a
// future pubDate (readers sort by it, and several hide future-dated items).
// Upcoming festivals are used only to backfill when too few have occurred —
// which is what keeps the feed non-empty across a year boundary.

import { listBlogPosts } from '../../lib/blog-posts';
import { FESTIVALS } from '../../lib/festivals';

export const revalidate = 1800; // 30 min — matches /updates cadence

const SITE = 'https://darshya.online';
const FEED_TITLE = "Darshya — India's Devotional Super App";
const FEED_DESC =
  'Live darshan, online puja booking, daily panchang, Vedic learning, gaushala seva, AI pandit — fresh content daily.';

/** Hard cap on items in one response. */
const MAX_ITEMS = 30;
/**
 * Floor on how many already-occurred festivals must be available before the
 * feed stops backfilling from upcoming ones. Keeps the feed populated in
 * January, when almost nothing in the calendar year has happened yet.
 */
const MIN_PAST_ITEMS = 12;

interface FeedItem {
  title: string;
  link: string;
  /** RSS pubDate. Never fabricated — a real content or event date. */
  date: Date;
  description: string;
  category?: string;
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** 'YYYY-MM-DD' → Date at UTC midnight, or null when unparseable. */
function isoToDate(date: string): Date | null {
  const d = new Date(`${date}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function prettyDate(d: Date): string {
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

async function blogItems(): Promise<FeedItem[]> {
  let posts: Awaited<ReturnType<typeof listBlogPosts>> = [];
  try {
    posts = await listBlogPosts();
  } catch {
    return [];
  }
  return posts.flatMap((p) => {
    const date = isoToDate(p.date);
    if (!date) return [];
    return [
      {
        title: p.title,
        link: `${SITE}/blog/${p.slug}`,
        date,
        description: p.excerpt || p.body.slice(0, 400),
        category: 'Blog',
      },
    ];
  });
}

function festivalItems(now: Date): FeedItem[] {
  const all = FESTIVALS.flatMap((f) => {
    const date = isoToDate(f.date2026);
    if (!date) return [];
    return [
      {
        title: `${f.name} — ${prettyDate(date)}`,
        link: `${SITE}/festival/${f.slug}`,
        date,
        description:
          `${f.description}\n\n${f.significance}\n\n` +
          `Rituals: ${f.rituals.slice(0, 4).join(' · ')}.`,
        category: f.deity,
      },
    ];
  });

  const past = all.filter((i) => i.date.getTime() <= now.getTime())
    .sort((a, b) => b.date.getTime() - a.date.getTime());
  if (past.length >= MIN_PAST_ITEMS) return past.slice(0, MAX_ITEMS);

  // Not enough of the calendar has happened yet (early in a year, or the
  // calendar has rolled forward). Backfill with the soonest upcoming ones so
  // the advertised feed is never empty.
  const upcoming = all.filter((i) => i.date.getTime() > now.getTime())
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  return [...past, ...upcoming.slice(0, MIN_PAST_ITEMS - past.length)];
}

function renderItem(item: FeedItem): string {
  const category = item.category
    ? `\n      <category>${esc(item.category)}</category>`
    : '';
  return `    <item>
      <title>${esc(item.title)}</title>
      <link>${item.link}</link>
      <guid isPermaLink="true">${item.link}</guid>
      <pubDate>${item.date.toUTCString()}</pubDate>${category}
      <description>${esc(item.description)}</description>
    </item>`;
}

// Deliberately NOT exported. Next validates the export surface of a route file
// and rejects any named export that is not a handler or a route-segment config
// ("… is not a valid Route export field"), so the tests drive GET() and parse
// the XML instead of importing this.
async function buildFeedItems(): Promise<FeedItem[]> {
  const now = new Date();
  const [blog, festivals] = [await blogItems(), festivalItems(now)];

  const seen = new Set<string>();
  return [...blog, ...festivals]
    .filter((i) => (seen.has(i.link) ? false : (seen.add(i.link), true)))
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, MAX_ITEMS);
}

export async function GET(): Promise<Response> {
  const items = await buildFeedItems();

  // lastBuildDate is "when the channel content last changed" — the newest item,
  // not the moment this response was rendered. Stamping render time would make
  // every poll look like a change.
  const newest = items[0]?.date ?? new Date();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(FEED_TITLE)}</title>
    <link>${SITE}</link>
    <description>${esc(FEED_DESC)}</description>
    <language>en-in</language>
    <lastBuildDate>${newest.toUTCString()}</lastBuildDate>
    <atom:link href="${SITE}/feed.xml" rel="self" type="application/rss+xml" />
${items.map(renderItem).join('\n')}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'content-type': 'application/rss+xml; charset=utf-8',
      'cache-control': 'public, max-age=1800, s-maxage=1800',
    },
  });
}
