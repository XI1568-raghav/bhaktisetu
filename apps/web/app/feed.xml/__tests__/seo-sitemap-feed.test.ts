/**
 * SEO-07 (sitemap: 49 duplicate <loc>, one build-time lastmod on ~1,600 URLs)
 * and SEO-08 (/feed.xml advertised in every page head, zero <item>).
 *
 * Location note: this file sits under app/feed.xml/__tests__/ rather than
 * apps/web/__tests__/ because the sitemap/feed/robots lane owns
 * `app/feed.xml/**`. vitest.config.ts includes `app/**\/__tests__/**`, tsconfig
 * excludes `**\/__tests__/**`, and Next ignores non-route files colocated in
 * app/, so the placement is inert for both the build and tsc.
 */
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  listBlogPosts: vi.fn(),
  getTemples: vi.fn(),
  getPujaTypes: vi.fn(),
}));

vi.mock('../../../lib/blog-posts', () => ({
  listBlogPosts: mocks.listBlogPosts,
}));

// The sitemap fetches temples/pujas at render time. Stub it so the suite is
// offline and deterministic; the module falls back to its curated slug lists.
vi.mock('../../../lib/api', () => ({
  getTemples: mocks.getTemples,
  getPujaTypes: mocks.getPujaTypes,
}));

const SITE = 'https://darshya.online';

function items(xml: string): string[] {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]!);
}

function field(block: string, tag: string): string | undefined {
  return new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`).exec(block)?.[1];
}

async function feedXml(): Promise<string> {
  const { GET } = await import('../route');
  const res = await GET();
  return res.text();
}

beforeEach(() => {
  mocks.listBlogPosts.mockResolvedValue([]);
  mocks.getTemples.mockResolvedValue({ data: [] });
  mocks.getPujaTypes.mockResolvedValue({ data: [] });
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date('2026-08-15T10:22:07Z'));
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// SEO-08 — the advertised feed must carry real items
// ---------------------------------------------------------------------------
describe('/feed.xml (SEO-08)', () => {
  it('serves items — the feed advertised in every page head is not empty', async () => {
    const xml = await feedXml();
    expect(items(xml).length).toBeGreaterThan(0);
  });

  it('gives every item a title, link, permalink guid and pubDate', async () => {
    const xml = await feedXml();
    for (const block of items(xml)) {
      expect(field(block, 'title')?.trim()).toBeTruthy();
      expect(field(block, 'link')).toMatch(/^https:\/\/darshya\.online\/\S+$/);
      expect(field(block, 'guid')).toBe(field(block, 'link'));
      const pub = field(block, 'pubDate')!;
      expect(Number.isNaN(new Date(pub).getTime())).toBe(false);
    }
  });

  it('links only to pages that actually exist', async () => {
    const { festivalSlugs } = await import('../../../lib/festivals');
    const real = new Set(festivalSlugs());
    const links = items(await feedXml()).map((b) => field(b, 'link')!);
    const festivalLinks = links.filter((l) => l.startsWith(`${SITE}/festival/`));
    expect(festivalLinks.length).toBeGreaterThan(0);
    for (const link of festivalLinks) {
      expect(real.has(link.slice(`${SITE}/festival/`.length))).toBe(true);
    }
  });

  it('never repeats a guid', async () => {
    const guids = items(await feedXml()).map((b) => field(b, 'guid')!);
    expect(new Set(guids).size).toBe(guids.length);
  });

  it('does not publish future-dated items when enough real content has occurred', async () => {
    const now = Date.now();
    for (const block of items(await feedXml())) {
      expect(new Date(field(block, 'pubDate')!).getTime()).toBeLessThanOrEqual(now);
    }
  });

  it('sorts newest first and caps the response', async () => {
    const dates = items(await feedXml()).map((b) =>
      new Date(field(b, 'pubDate')!).getTime(),
    );
    expect(dates.length).toBeLessThanOrEqual(30);
    expect([...dates].sort((a, b) => b - a)).toEqual(dates);
  });

  it('merges published blog posts in alongside the calendar', async () => {
    mocks.listBlogPosts.mockResolvedValue([
      {
        slug: 'why-video-proof-matters',
        date: '2026-08-14',
        title: 'Why video proof matters',
        excerpt: 'Every puja we book ships a recording.',
        body: '# Why video proof matters\n\nEvery puja we book ships a recording.',
        source: null,
      },
    ]);
    const blocks = items(await feedXml());
    const links = blocks.map((b) => field(b, 'link')!);
    const idx = links.indexOf(`${SITE}/blog/why-video-proof-matters`);
    expect(idx).toBeGreaterThanOrEqual(0);
    // Ordering is by date across both sources — everything after the post is
    // older, and the calendar items are still there.
    expect(links.some((l) => l.startsWith(`${SITE}/festival/`))).toBe(true);
    expect(new Date(field(blocks[idx + 1]!, 'pubDate')!).getTime()).toBeLessThanOrEqual(
      new Date('2026-08-14T00:00:00Z').getTime(),
    );
  });

  it('stays non-empty before any of the calendar year has occurred', async () => {
    vi.setSystemTime(new Date('2025-06-01T00:00:00Z'));
    expect(items(await feedXml()).length).toBeGreaterThan(0);
  });

  it('stays non-empty after the whole calendar has passed', async () => {
    vi.setSystemTime(new Date('2027-06-01T00:00:00Z'));
    expect(items(await feedXml()).length).toBeGreaterThan(0);
  });

  it('emits well-formed XML — no unescaped markup leaks from content', async () => {
    const xml = await feedXml();
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    for (const block of items(xml)) {
      const text = [field(block, 'title'), field(block, 'description')].join(' ');
      expect(text).not.toMatch(/&(?!(amp|lt|gt|quot|apos|#\d+);)/);
      expect(text).not.toMatch(/[<>]/);
    }
  });

  it('dates lastBuildDate from the newest item, not the render instant', async () => {
    const xml = await feedXml();
    const built = new Date(/<lastBuildDate>(.*?)<\/lastBuildDate>/.exec(xml)![1]!);
    const newest = new Date(field(items(xml)[0]!, 'pubDate')!);
    expect(built.getTime()).toBe(newest.getTime());
  });

  it('is served as RSS', async () => {
    const { GET } = await import('../route');
    const res = await GET();
    expect(res.headers.get('content-type')).toContain('application/rss+xml');
  });
});

// ---------------------------------------------------------------------------
// SEO-07 — sitemap dedupe + honest lastmod
// ---------------------------------------------------------------------------
describe('sitemap.xml (SEO-07)', () => {
  async function entries() {
    const sitemap = (await import('../../sitemap')).default;
    return sitemap();
  }

  it('emits every <loc> exactly once', async () => {
    const urls = (await entries()).map((e) => e.url);
    const seen = new Map<string, number>();
    for (const u of urls) seen.set(u, (seen.get(u) ?? 0) + 1);
    const dupes = [...seen.entries()].filter(([, n]) => n > 1).map(([u]) => u);
    expect(dupes).toEqual([]);
    expect(new Set(urls).size).toBe(urls.length);
  }, 30_000);

  it('does not stamp the render instant on anything', async () => {
    // The old sitemap set `lastModified: new Date()` on every entry, so the
    // whole file claimed the site was rewritten at the second the server
    // rendered it. Any surviving lastmod must be a real date at UTC midnight.
    for (const e of await entries()) {
      if (e.lastModified === undefined) continue;
      const d = new Date(e.lastModified);
      expect(d.getUTCHours()).toBe(0);
      expect(d.getUTCMinutes()).toBe(0);
      expect(d.getUTCSeconds()).toBe(0);
      expect(d.getUTCMilliseconds()).toBe(0);
    }
  }, 30_000);

  it('omits lastmod for pages whose modification date is unknown', async () => {
    const all = await entries();
    const withLastmod = all.filter((e) => e.lastModified !== undefined);
    // A blanket stamp is the defect. Some entries carry a real date; the vast
    // majority (static reference content) honestly carry none.
    expect(withLastmod.length).toBeGreaterThan(0);
    expect(withLastmod.length).toBeLessThan(all.length / 2);

    const byUrl = new Map(all.map((e) => [e.url, e]));
    expect(byUrl.get(`${SITE}/gita`)?.lastModified).toBeUndefined();
    expect(byUrl.get(`${SITE}/aarti/ganesh-aarti`)?.lastModified).toBeUndefined();
  }, 30_000);

  it('dates date-derived pages with today, at UTC midnight', async () => {
    const byUrl = new Map((await entries()).map((e) => [e.url, e]));
    const today = new Date('2026-08-15T00:00:00Z').getTime();
    for (const url of [
      `${SITE}/today`,
      `${SITE}/panchang`,
      `${SITE}/astrology/choghadiya`,
      `${SITE}/astrology/horoscope/aries`,
      `${SITE}/astrology/horoscope/aries/today`,
    ]) {
      const entry = byUrl.get(url);
      expect(entry, `${url} missing from sitemap`).toBeDefined();
      expect(new Date(entry!.lastModified!).getTime(), url).toBe(today);
    }
    // A static reference page under the same /panchang prefix must NOT be
    // swept up by the daily rule.
    expect(byUrl.get(`${SITE}/panchang/yoga`)?.lastModified).toBeUndefined();
  }, 30_000);

  it('carries the real published date for a blog post', async () => {
    mocks.listBlogPosts.mockResolvedValue([
      {
        slug: 'why-video-proof-matters',
        date: '2026-03-09',
        title: 'Why video proof matters',
        excerpt: 'x',
        body: '# Why video proof matters\n\nx',
        source: null,
      },
    ]);
    const byUrl = new Map((await entries()).map((e) => [e.url, e]));
    const post = byUrl.get(`${SITE}/blog/why-video-proof-matters`);
    expect(post).toBeDefined();
    expect(new Date(post!.lastModified!).toISOString()).toBe('2026-03-09T00:00:00.000Z');
  }, 30_000);
});
