import { FastifyInstance } from 'fastify';
import fs from 'node:fs';
import path from 'node:path';

type Category = 'sanskrit' | 'ved' | 'sanatan';

interface Frontmatter {
  title: string;
  slug: string;
  category: Category;
  subTopic?: string;
  summary: string;
  related?: string[];
  glossaryTerms?: string[];
  readingMinutes?: number;
  sources?: string[];
  publishedAt?: string;
}

const CONTENT_ROOT = path.resolve(
  process.env.KNOWLEDGE_CONTENT_DIR ?? path.join(process.cwd(), '..', 'web', 'content'),
);
const CONTENT_AVAILABLE = fs.existsSync(CONTENT_ROOT);

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

function categoryDir(c: Category): string { return path.join(CONTENT_ROOT, c); }

function listSlugs(c: Category): string[] {
  const dir = categoryDir(c);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith('.mdx')).map((f) => f.replace(/\.mdx$/, ''));
}

function readArticle(c: Category, slug: string): { frontmatter: Frontmatter; body: string } | null {
  const file = path.join(categoryDir(c), `${slug}.mdx`);
  if (!fs.existsSync(file)) return null;
  const raw = fs.readFileSync(file, 'utf8');
  const { frontmatter, body } = parseFrontmatter(raw);
  return { frontmatter: frontmatter as unknown as Frontmatter, body };
}

function isCategory(s: string): s is Category {
  return s === 'sanskrit' || s === 'ved' || s === 'sanatan';
}

export async function knowledgeRoutes(server: FastifyInstance) {
  server.get<{ Params: { category: string } }>('/:category', async (request, reply) => {
    const { category } = request.params;
    if (!isCategory(category)) return reply.code(400).send({ error: 'Invalid category' });
    if (!CONTENT_AVAILABLE) return reply.send({ category, articles: [] });
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
    return reply.send({ category, articles: items });
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
