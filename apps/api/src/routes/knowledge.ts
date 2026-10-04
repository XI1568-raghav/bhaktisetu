import { FastifyInstance } from 'fastify';
import fs from 'node:fs';
import path from 'node:path';

/**
 * The knowledge rail: MDX on disk, served to web and mobile from one place.
 *
 * WHY THE CATEGORY UNION IS GONE
 * ------------------------------
 * This file used to declare
 *
 *     type Category = 'sanskrit' | 'ved' | 'sanatan';
 *
 * and a matching `isCategory()` that 400'd everything else. The same closed
 * three-member union was ALSO hardcoded in app/(devotee)/knowledge.tsx (the
 * card list) and app/(devotee)/knowledge-category.tsx (the label map), so
 * dropping a fourth directory into apps/web/content required edits in three
 * files across two apps, and getting any one of them wrong produced a 400 that
 * looked like a missing article.
 *
 * The union was never the source of truth — the FILESYSTEM was. `listSlugs`
 * already read the directory; only the gate in front of it was frozen. So the
 * gate now reads the same directory: a category is any immediate subdirectory
 * of CONTENT_ROOT that contains at least one `.mdx` file. Adding
 * `apps/web/content/<name>/*.mdx` now publishes that category to web and
 * mobile with ZERO code change here or in the app.
 *
 * `apps/web/content/blog` is why the ".mdx file" half of that rule matters: it
 * holds `published.ts`, not MDX, and would otherwise surface as an empty
 * category.
 *
 * WHAT THIS DOES NOT DO
 * ---------------------
 * It does not invent content. As of this change the only MDX directories that
 * exist are sanskrit (40), ved (47) and sanatan (33) — 120 articles. Widening
 * the gate unlocks the NEXT directory, whenever real material is written for
 * it; it does not conjure puranas or chalisa MDX that nobody has authored.
 *
 * SLUG TRAVERSAL — fixed here
 * ---------------------------
 * `readArticle` built `path.join(categoryDir(c), `${slug}.mdx`)` from an
 * unvalidated route param, so `GET /knowledge/ved/..%2f..%2fsomething` resolved
 * OUTSIDE the content root and served any `.mdx` on the API disk. The closed
 * union never protected the slug — only the category. Both are now validated
 * against what the directory listing actually contains.
 */

const CONTENT_ROOT = path.resolve(
  process.env.KNOWLEDGE_CONTENT_DIR ?? path.join(process.cwd(), '..', 'web', 'content'),
);
const CONTENT_AVAILABLE = fs.existsSync(CONTENT_ROOT);

/** A category or slug is one path segment of lowercase word characters. */
const SEGMENT = /^[a-z0-9][a-z0-9-]*$/;

interface Frontmatter {
  title: string;
  slug: string;
  category: string;
  subTopic?: string;
  summary: string;
  related?: string[];
  glossaryTerms?: string[];
  readingMinutes?: number;
  sources?: string[];
  publishedAt?: string;
}

/**
 * Display titles for the categories that exist today.
 *
 * Presentation metadata only — never article content. A category absent from
 * this map is title-cased from its directory name rather than hidden, because
 * a readable-but-imperfect heading is a smaller failure than an article set
 * that silently does not appear.
 */
const CATEGORY_TITLES: Readonly<Record<string, string>> = Object.freeze({
  sanskrit: 'Sanskrit',
  ved: 'Vedas',
  sanatan: 'Sanatan Dharma',
});

function humanize(key: string): string {
  return key
    .split('-')
    .map((w) => (w.length > 0 ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(' ');
}

function categoryTitle(key: string): string {
  return CATEGORY_TITLES[key] ?? humanize(key);
}

function stripQ(s: string): string { return s.replace(/^['"](.*)['"]$/, '$1'); }

function parseFrontmatter(raw: string): { frontmatter: Record<string, unknown>; body: string } {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) return { frontmatter: {}, body: raw };
  const fm: Record<string, unknown> = {};
  let pendingKey: string | null = null;
  let pendingArr: string[] | null = null;
  for (const line of m[1]!.split(/\r?\n/)) {
    if (!line.trim()) continue;
    if (pendingArr) {
      const item = line.match(/^\s*-\s+(.*)$/);
      if (item) { pendingArr.push(stripQ(item[1]!.trim())); continue; }
      if (pendingKey) fm[pendingKey] = pendingArr;
      pendingArr = null; pendingKey = null;
    }
    const kv = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.*)$/);
    if (!kv) continue;
    const v = kv[2]!.trim();
    if (!v) { pendingKey = kv[1]!; pendingArr = []; continue; }
    fm[kv[1]!] = stripQ(v);
  }
  if (pendingArr && pendingKey) fm[pendingKey] = pendingArr;
  return { frontmatter: fm, body: m[2]! };
}

function categoryDir(c: string): string { return path.join(CONTENT_ROOT, c); }

function listSlugs(c: string): string[] {
  const dir = categoryDir(c);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith('.mdx')).map((f) => f.replace(/\.mdx$/, ''));
}

/**
 * Immediate subdirectories of CONTENT_ROOT holding at least one `.mdx`.
 *
 * Cached for 60s rather than forever: the content is immutable within a
 * deploy, so a per-request `readdir` is pure waste on a free-tier dyno, but a
 * short TTL keeps `next dev` and the test suite from needing a restart when a
 * directory is added.
 */
let categoryCache: { at: number; value: string[] } | null = null;
const CATEGORY_TTL_MS = 60_000;

function discoverCategories(): string[] {
  if (!CONTENT_AVAILABLE) return [];
  const now = Date.now();
  if (categoryCache && now - categoryCache.at < CATEGORY_TTL_MS) return categoryCache.value;
  let value: string[] = [];
  try {
    value = fs
      .readdirSync(CONTENT_ROOT, { withFileTypes: true })
      .filter((e) => e.isDirectory() && SEGMENT.test(e.name))
      .map((e) => e.name)
      .filter((name) => listSlugs(name).length > 0)
      .sort();
  } catch {
    value = [];
  }
  categoryCache = { at: now, value };
  return value;
}

function isCategory(s: string): boolean {
  return SEGMENT.test(s) && discoverCategories().includes(s);
}

function readArticle(c: string, slug: string): { frontmatter: Frontmatter; body: string } | null {
  // Validated against the directory listing, not just pattern-matched: this is
  // what keeps a crafted slug inside CONTENT_ROOT.
  if (!SEGMENT.test(slug) || !listSlugs(c).includes(slug)) return null;
  const file = path.join(categoryDir(c), `${slug}.mdx`);
  if (!fs.existsSync(file)) return null;
  const raw = fs.readFileSync(file, 'utf8');
  const { frontmatter, body } = parseFrontmatter(raw);
  return { frontmatter: frontmatter as unknown as Frontmatter, body };
}

export async function knowledgeRoutes(server: FastifyInstance) {
  /**
   * GET / — the category index.
   *
   * The clients used to hardcode this list. They now ask for it, which is the
   * whole point of removing the union: one deploy of new MDX changes what the
   * app offers without shipping a new binary.
   */
  server.get('/', async (_request, reply) => {
    const categories = discoverCategories().map((key) => ({
      key,
      title: categoryTitle(key),
      count: listSlugs(key).length,
    }));
    return reply.send({ categories });
  });

  server.get<{ Params: { category: string } }>('/:category', async (request, reply) => {
    const { category } = request.params;
    if (!isCategory(category)) return reply.code(400).send({ error: 'Invalid category' });
    if (!CONTENT_AVAILABLE) return reply.send({ category, title: categoryTitle(category), articles: [] });
    const slugs = listSlugs(category);
    const items = slugs.map((slug) => {
      const a = readArticle(category, slug);
      if (!a) return null;
      return {
        slug: a.frontmatter.slug, title: a.frontmatter.title,
        summary: a.frontmatter.summary, subTopic: a.frontmatter.subTopic,
        readingMinutes: a.frontmatter.readingMinutes,
      };
    }).filter(Boolean);
    // `title` is additive — `category` and `articles` keep their old names and
    // shapes, so the shipped app build keeps working against this response.
    return reply.send({ category, title: categoryTitle(category), articles: items });
  });

  server.get<{ Params: { category: string; slug: string } }>('/:category/:slug', async (request, reply) => {
    const { category, slug } = request.params;
    if (!isCategory(category)) return reply.code(400).send({ error: 'Invalid category' });
    if (!CONTENT_AVAILABLE) return reply.code(404).send({ error: 'Knowledge content not deployed to this API instance' });
    const a = readArticle(category, slug);
    if (!a) return reply.code(404).send({ error: 'Article not found' });
    return reply.send({ frontmatter: a.frontmatter, body: a.body });
  });
}
